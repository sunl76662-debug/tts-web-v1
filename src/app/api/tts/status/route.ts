import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { queryTaskStatus } from '@/lib/minimax';

export const runtime = 'nodejs';

const NO_CACHE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('job_id');

    if (!taskId) {
      return NextResponse.json(
        { error: '缺少 job_id 参数' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const result = await queryTaskStatus(taskId);

    if (result.status === 'success') {
      if (!result.fileId) {
        return NextResponse.json(
          { status: 'failed', error: '任务成功但未返回音频文件' },
          { headers: NO_CACHE_HEADERS }
        );
      }

      const filename = `${taskId}.mp3`;

      return NextResponse.json(
        {
          status: 'success',
          audio_url: `/api/audio/${encodeURIComponent(result.fileId)}`,
          audio_filename: filename,
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (result.status === 'failed' || result.status === 'expired') {
      return NextResponse.json(
        {
          status: 'failed',
          error: result.status === 'expired'
            ? '生成结果已过期，请重新生成'
            : '语音生成失败',
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { status: 'processing' },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('查询 MiniMax 状态错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询任务状态失败' },
      { status: 502, headers: NO_CACHE_HEADERS }
    );
  }
}
