import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { createTtsTask } from '@/lib/minimax';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { text, voice_id } = body;

    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: '请输入或上传文稿内容' },
        { status: 400 }
      );
    }

    const normalizedText = text.trim();

    if (normalizedText.length > 50000) {
      return NextResponse.json(
        { error: '文稿已超过 50000 字限制，请拆分后分别生成' },
        { status: 400 }
      );
    }

    if (!voice_id || typeof voice_id !== 'string') {
      return NextResponse.json({ error: '请选择音色' }, { status: 400 });
    }

    const result = await createTtsTask({
      text: normalizedText,
      voiceId: voice_id,
      speed: 1,
    });

    return NextResponse.json({
      status: 'processing',
      job_id: result.taskId,
    });
  } catch (error) {
    console.error('创建 TTS 任务错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '语音生成服务暂时不可用' },
      { status: 502 }
    );
  }
}
