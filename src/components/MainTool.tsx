'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Voice, TaskStatus } from '@/types';
import TextInput from './TextInput';
import FileUpload from './FileUpload';
import WordCounter from './WordCounter';
import VoiceSelector from './VoiceSelector';
import GenerateButton from './GenerateButton';
import TaskStatusComponent from './TaskStatus';
import AudioResult from './AudioResult';

const MAX_POLL_FAILURES = 5;
const MAX_POLL_DURATION_MS = 15 * 60 * 1000; // 15 分钟

export default function MainTool() {
  // 文稿状态
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');

  // 音色
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');

  // 任务状态
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioFilename, setAudioFilename] = useState('');
  const [audioSize, setAudioSize] = useState<number | undefined>();

  // 轮询相关
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const failCountRef = useRef(0);
  const startRef = useRef(0);
  const activeIdRef = useRef<string | null>(null);
  const pollFunctionRef = useRef<((id: string) => Promise<void>) | null>(null);

  // 加载音色列表
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const response = await fetch('/api/voices');
        const data = await response.json();
        if (data.voices && data.voices.length > 0) {
          setVoices(data.voices);
          setSelectedVoiceId(data.voices[0].voice_id);
        }
      } catch (err) {
        console.error('加载音色列表失败:', err);
      }
    };

    loadVoices();
  }, []);

  // 清除轮询
  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    failCountRef.current = 0;
    startRef.current = 0;
    activeIdRef.current = null;
  }, []);

  // 组件卸载时清除轮询
  useEffect(() => {
    return () => clearPolling();
  }, [clearPolling]);

  // 调度下一次轮询（通过 ref 调用，打破循环依赖）
  const scheduleNext = useCallback((id: string) => {
    if (activeIdRef.current !== id) return;
    pollRef.current = setTimeout(() => {
      void pollFunctionRef.current?.(id);
    }, 3000);
  }, []);

  // 轮询任务状态
  const pollTaskStatus = useCallback(async (id: string) => {
    // 检查是否已切换到新任务（防止旧回调污染新任务状态）
    if (activeIdRef.current !== id) return;

    // 检查超时（15 分钟）
    if (startRef.current > 0 && Date.now() - startRef.current > MAX_POLL_DURATION_MS) {
      clearPolling();
      setTaskStatus('failed');
      setError('语音生成超时（已等待15分钟），请重试');
      return;
    }

    try {
      const response = await fetch(`/api/tts/status?job_id=${id}`, { cache: 'no-store' });
      const data = await response.json();

      // fetch 完成后再次检查，防止旧请求覆盖新任务状态
      if (activeIdRef.current !== id) return;

      if (!response.ok) {
        throw new Error(data.error || '查询状态失败');
      }

      // 成功时重置失败计数
      failCountRef.current = 0;

      if (data.status === 'success') {
        clearPolling();
        setTaskStatus('success');
        setAudioUrl(data.audio_url || '');
        setAudioFilename(data.audio_filename || '');
        setAudioSize(data.size);
        return;
      } else if (data.status === 'failed') {
        clearPolling();
        setTaskStatus('failed');
        setError(data.error || '语音生成失败');
        return;
      }

      // processing：调度下一次轮询
      scheduleNext(id);
    } catch (err) {
      // fetch 失败后也检查是否已切换任务
      if (activeIdRef.current !== id) return;
      // 累计连续失败次数，超过阈值则停止轮询
      failCountRef.current += 1;
      console.error(`轮询状态错误 (第${failCountRef.current}次):`, err);
      if (failCountRef.current >= MAX_POLL_FAILURES) {
        clearPolling();
        setTaskStatus('failed');
        setError('网络请求失败次数过多，请检查网络后重试');
      } else {
        // 未达阈值，调度下一次重试
        scheduleNext(id);
      }
    }
  }, [clearPolling, scheduleNext]);

  // 将 pollTaskStatus 同步到 ref，供 scheduleNext 调用
  useEffect(() => {
    pollFunctionRef.current = pollTaskStatus;
    return () => {
      pollFunctionRef.current = null;
    };
  }, [pollTaskStatus]);

  // 启动轮询
  const startPolling = useCallback((id: string) => {
    clearPolling();
    // 设置活跃任务 ID、开始时间、失败计数
    activeIdRef.current = id;
    startRef.current = Date.now();
    failCountRef.current = 0;
    // 立即查询一次（后续由 pollTaskStatus → scheduleNext 链式调度）
    void pollFunctionRef.current?.(id);
  }, [clearPolling]);

  // 生成语音（MiniMax 异步模式）
  const handleGenerate = async () => {
    if (!text.trim() || text.length > 50000 || !selectedVoiceId) return;

    clearPolling();
    setError('');
    setTaskStatus('pending');
    setAudioUrl('');
    setAudioFilename('');
    setAudioSize(undefined);

    try {
      const response = await fetch('/api/tts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          text: text.trim(),
          voice_id: selectedVoiceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '语音生成失败');
      }

      if (data.status === 'processing' && data.job_id) {
        // 异步模式：进入轮询
        setTaskStatus('processing');
        startPolling(data.job_id);
      } else if (data.status === 'success') {
        // 兼容同步返回（理论上不会发生）
        setTaskStatus('success');
        setAudioUrl(data.audio_url || '');
        setAudioFilename(data.audio_filename || '');
        setAudioSize(data.size);
      }
    } catch (err) {
      setTaskStatus('failed');
      setError(err instanceof Error ? err.message : '语音生成失败');
    }
  };

  // 重试
  const handleRetry = () => {
    clearPolling();
    setTaskStatus(null);
    setError('');
    setAudioUrl('');
  };

  // 是否可以生成
  const canGenerate = text.trim().length > 0 && text.length <= 50000 && selectedVoiceId && !taskStatus;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">文稿转语音</h1>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 标题输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            任务标题（可选）
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="为本次生成添加标题..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            disabled={!!taskStatus}
          />
        </div>

        {/* 文稿输入区域 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            文稿内容
          </label>
          <TextInput
            value={text}
            onChange={setText}
            disabled={!!taskStatus}
          />
          <div className="mt-2 flex justify-between items-center">
            <WordCounter text={text} />
            <span className="text-xs text-gray-500">或上传文件 ↓</span>
          </div>
        </div>

        {/* 文件上传 */}
        <FileUpload
          onTextExtracted={(extractedText) => setText(extractedText)}
          disabled={!!taskStatus}
        />

        {/* 音色选择 */}
        <VoiceSelector
          voices={voices}
          selectedVoiceId={selectedVoiceId}
          onChange={setSelectedVoiceId}
          disabled={!!taskStatus}
        />

        {/* 生成按钮 */}
        <GenerateButton
          disabled={!canGenerate}
          loading={taskStatus === 'pending' || taskStatus === 'processing'}
          onClick={handleGenerate}
        />

        {/* 任务状态 */}
        {taskStatus && taskStatus !== 'success' && (
          <TaskStatusComponent
            status={taskStatus}
            error={error}
            onRetry={handleRetry}
          />
        )}

        {/* 音频结果 */}
        {taskStatus === 'success' && audioUrl && (
          <AudioResult
            audioUrl={audioUrl}
            filename={audioFilename || 'audio.mp3'}
            textLength={text.length}
            size={audioSize}
          />
        )}

        {/* 生成成功后的新任务按钮 */}
        {taskStatus === 'success' && (
          <button
            onClick={handleRetry}
            className="w-full py-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            继续生成新语音
          </button>
        )}
      </main>
    </div>
  );
}
