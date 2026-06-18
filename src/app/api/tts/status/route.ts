import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getTask, updateTask, tryLockForDownload, getDb } from '@/lib/store';
import { queryTaskStatus, downloadAudio } from '@/lib/minimax';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

// 无缓存响应头
const NO_CACHE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  try {
    // 验证认证
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // 解析 job_id 参数
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    if (!jobId) {
      return NextResponse.json(
        { error: '缺少 job_id 参数' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // 查询本地任务
    const task = getTask(jobId);
    if (!task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // 如果本地已成功或已失败，直接返回缓存结果
    if (task.status === 'success') {
      return NextResponse.json({
        status: 'success',
        audio_url: `/audio/${task.audio_filename}`,
        audio_filename: task.audio_filename,
        size: task.audio_size,
      }, { headers: NO_CACHE_HEADERS });
    }

    if (task.status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        error: task.error_message || '语音生成失败',
      }, { headers: NO_CACHE_HEADERS });
    }

    // 如果没有 MiniMax task_id，说明任务创建失败
    if (!task.task_id) {
      return NextResponse.json({
        status: 'failed',
        error: '任务未正确创建',
      }, { headers: NO_CACHE_HEADERS });
    }

    // 处理 downloading 状态：检查是否为过期锁
    if (task.status === 'downloading') {
      const updatedAt = new Date(task.updated_at).getTime();
      const stale = Date.now() - updatedAt > 2 * 60 * 1000; // 2 分钟

      if (stale) {
        // 过期锁：检查最终 MP3 是否已存在
        const audioDir = path.join(process.cwd(), 'public', 'audio');
        const audioFilename = `${jobId}.mp3`;
        const finalPath = path.join(audioDir, audioFilename);

        if (fs.existsSync(finalPath)) {
          const stat = fs.statSync(finalPath);
          updateTask(jobId, {
            status: 'success',
            audio_filename: audioFilename,
            audio_size: stat.size,
          });
          return NextResponse.json({
            status: 'success',
            audio_url: `/audio/${audioFilename}`,
            audio_filename: audioFilename,
            size: stat.size,
          }, { headers: NO_CACHE_HEADERS });
        }

        // 原子恢复为 processing，允许重新获取下载锁
        const db = getDb();
        db.prepare(
          `UPDATE tasks SET status = 'processing', updated_at = ? WHERE id = ? AND status = 'downloading'`
        ).run(new Date().toISOString(), jobId);
        // 继续走下面的 processing 流程
      } else {
        // 未过期，告诉前端继续等待
        return NextResponse.json({ status: 'processing' }, { headers: NO_CACHE_HEADERS });
      }
    }

    // 查询 MiniMax 任务状态
    try {
      const result = await queryTaskStatus(task.task_id);

      if (result.status === 'success') {
        // 下载音频文件（带锁）
        if (!result.fileId) {
          updateTask(jobId, {
            status: 'failed',
            error_message: '任务成功但未返回 file_id',
          });
          return NextResponse.json({
            status: 'failed',
            error: '任务成功但未返回 file_id',
          }, { headers: NO_CACHE_HEADERS });
        }

        // 原子获取下载锁：只有 status=processing 才能转为 downloading
        if (!tryLockForDownload(jobId)) {
          // 其他请求正在下载，返回 processing
          return NextResponse.json({ status: 'processing' }, { headers: NO_CACHE_HEADERS });
        }

        const audioDir = path.join(process.cwd(), 'public', 'audio');
        if (!fs.existsSync(audioDir)) {
          fs.mkdirSync(audioDir, { recursive: true });
        }

        const audioFilename = `${jobId}.mp3`;
        const partPath = path.join(audioDir, `${jobId}.part`);
        const finalPath = path.join(audioDir, audioFilename);

        try {
          // 如果最终文件已存在，直接复用
          if (fs.existsSync(finalPath)) {
            const stat = fs.statSync(finalPath);
            updateTask(jobId, {
              status: 'success',
              audio_filename: audioFilename,
              audio_size: stat.size,
            });
            return NextResponse.json({
              status: 'success',
              audio_url: `/audio/${audioFilename}`,
              audio_filename: audioFilename,
              size: stat.size,
            }, { headers: NO_CACHE_HEADERS });
          }

          // 下载并保存
          const audioBuffer = await downloadAudio(result.fileId!);
          fs.writeFileSync(partPath, audioBuffer);
          fs.renameSync(partPath, finalPath);

          // 更新任务状态为成功
          updateTask(jobId, {
            status: 'success',
            audio_filename: audioFilename,
            audio_size: audioBuffer.length,
          });

          return NextResponse.json({
            status: 'success',
            audio_url: `/audio/${audioFilename}`,
            audio_filename: audioFilename,
            size: audioBuffer.length,
          }, { headers: NO_CACHE_HEADERS });
        } catch (downloadError) {
          // 下载失败，清理 .part 文件
          try {
            if (fs.existsSync(partPath)) {
              fs.unlinkSync(partPath);
            }
          } catch {
            // 忽略清理错误
          }

          // 恢复状态为 processing，允许重试
          updateTask(jobId, { status: 'processing' });

          console.error('下载音频失败:', downloadError);
          return NextResponse.json({ status: 'processing' }, { headers: NO_CACHE_HEADERS });
        }
      }

      if (result.status === 'failed' || result.status === 'expired') {
        const errorMsg = result.status === 'expired'
          ? '生成结果已过期，请重新生成'
          : '语音生成失败';

        updateTask(jobId, {
          status: 'failed',
          error_message: errorMsg,
        });

        return NextResponse.json({
          status: 'failed',
          error: errorMsg,
        }, { headers: NO_CACHE_HEADERS });
      }

      // 仍在处理中
      return NextResponse.json({ status: 'processing' }, { headers: NO_CACHE_HEADERS });
    } catch (error) {
      // 查询 MiniMax 出错，返回 processing（前端可继续重试）
      console.error('查询 MiniMax 状态错误:', error);
      return NextResponse.json({ status: 'processing' }, { headers: NO_CACHE_HEADERS });
    }
  } catch (error) {
    console.error('TTS 状态查询错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
