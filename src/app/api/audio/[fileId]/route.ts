import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { downloadAudio } from '@/lib/minimax';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未授权访问' }, { status: 401 });
  }

  const { fileId } = await context.params;

  if (!/^[A-Za-z0-9_-]+$/.test(fileId)) {
    return NextResponse.json({ error: '音频文件 ID 无效' }, { status: 400 });
  }

  try {
    const audio = await downloadAudio(fileId);
    const body = new Uint8Array(audio.length);
    body.set(audio);

    return new Response(body.buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audio.length),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('读取 MiniMax 音频错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '读取音频失败' },
      { status: 502 }
    );
  }
}
