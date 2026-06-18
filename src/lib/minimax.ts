import type { Voice, MinimaxCreateResponse, MinimaxQueryResponse } from '@/types';

// 国内版基础地址
const BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com';

// 导出模型配置，供路由层使用
export const MODEL = process.env.MINIMAX_TTS_MODEL || 'speech-2.8-turbo';

// 国内版系统音色列表
const VOICES: Voice[] = [
  { voice_id: 'male-qn-qingse', voice_name: '青涩青年音色' },
  { voice_id: 'male-qn-jingying', voice_name: '精英青年音色' },
  { voice_id: 'female-shaonv', voice_name: '少女音色' },
  { voice_id: 'female-yujie', voice_name: '御姐音色' },
  { voice_id: 'female-chengshu', voice_name: '成熟女性音色' },
  { voice_id: 'female-tianmei', voice_name: '甜美女性音色' },
  { voice_id: 'Chinese (Mandarin)_News_Anchor', voice_name: '新闻女声' },
  { voice_id: 'Chinese (Mandarin)_Male_Announcer', voice_name: '播报男声' },
  { voice_id: 'Chinese (Mandarin)_Radio_Host', voice_name: '电台男主播' },
];

// 获取 API Key
function getApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) {
    throw new Error('MINIMAX_API_KEY 未配置');
  }
  return key;
}

// 通用请求头（Bearer 认证）
function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

// 错误映射
function mapError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('401') || message.includes('unauthorized') || message.includes('api key')) {
      return '服务配置异常，请联系管理员';
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return '请求过于频繁，请稍后重试';
    }
    if (message.includes('400') || message.includes('bad request')) {
      return '参数错误，请检查文本内容';
    }
    if (message.includes('500') || message.includes('internal server')) {
      return '语音生成服务暂时不可用';
    }
  }
  return '语音生成失败，请重新尝试';
}

// 获取音色列表
export function getVoices(): Voice[] {
  return VOICES;
}

// 安全转换 id 为 string
function toStringId(value: string | number | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  return String(value);
}

// 创建异步 TTS 任务
export async function createTtsTask(params: {
  text: string;
  voiceId: string;
  speed?: number;
}): Promise<{ taskId: string }> {
  try {
    const requestBody = {
      model: MODEL,
      text: params.text,
      language_boost: 'Chinese',
      voice_setting: {
        voice_id: params.voiceId,
        speed: params.speed ?? 1,
        vol: 1,
        pitch: 0,
      },
      audio_setting: {
        audio_sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1,
      },
    };

    const response = await fetch(`${BASE_URL}/v1/t2a_async_v2`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.base_resp?.status_msg || `请求失败: ${response.status}`);
    }

    const data: MinimaxCreateResponse = await response.json();

    if (!data.base_resp || data.base_resp.status_code !== 0) {
      throw new Error(data.base_resp?.status_msg || '创建任务失败');
    }

    const taskId = toStringId(data.task_id);
    if (!taskId) {
      throw new Error('响应中未找到 task_id');
    }

    return { taskId };
  } catch (error) {
    console.error('MiniMax 创建任务错误:', error);
    throw new Error(mapError(error));
  }
}

// 查询任务状态
export async function queryTaskStatus(taskId: string): Promise<{
  status: string; // processing | success | failed | expired
  fileId?: string;
}> {
  try {
    const response = await fetch(
      `${BASE_URL}/v1/query/t2a_async_query_v2?task_id=${encodeURIComponent(taskId)}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.base_resp?.status_msg || `查询失败: ${response.status}`);
    }

    const data: MinimaxQueryResponse = await response.json();

    if (!data.base_resp || data.base_resp.status_code !== 0) {
      throw new Error(data.base_resp?.status_msg || '查询任务状态失败');
    }

    // 统一转小写判断
    const status = (data.status || '').toLowerCase();
    const fileId = toStringId(data.file_id) || undefined;

    return { status, fileId };
  } catch (error) {
    console.error('MiniMax 查询状态错误:', error);
    throw new Error(mapError(error));
  }
}

// 下载音频文件（二进制）
export async function downloadAudio(fileId: string): Promise<Buffer> {
  try {
    const response = await fetch(
      `${BASE_URL}/v1/files/retrieve_content?file_id=${encodeURIComponent(fileId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`下载音频失败: ${response.status}`);
    }

    // 按二进制读取，不调用 response.json()
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('MiniMax 下载音频错误:', error);
    throw new Error(mapError(error));
  }
}
