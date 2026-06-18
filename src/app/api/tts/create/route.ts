import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { createTask, updateTask } from '@/lib/store';
import { createTtsTask, MODEL } from '@/lib/minimax';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // 验证认证
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { title, text, voice_id } = body;

    // 参数校验（先规范化再检查长度）
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: '请输入或上传文稿内容' },
        { status: 400 }
      );
    }

    const normalizedText = text.trim();

    if (!normalizedText) {
      return NextResponse.json(
        { error: '请输入或上传文稿内容' },
        { status: 400 }
      );
    }

    if (normalizedText.length > 50000) {
      return NextResponse.json(
        { error: '文稿已超过 50000 字限制，请拆分后分别生成' },
        { status: 400 }
      );
    }

    if (!voice_id || typeof voice_id !== 'string') {
      return NextResponse.json(
        { error: '请选择音色' },
        { status: 400 }
      );
    }

    // 创建本地任务记录（使用规范化文本和统一模型配置）
    const task = createTask({
      title: title || '',
      text: normalizedText,
      voice_id,
      speed: 1.0,
      model: MODEL,
    });

    // 调用 MiniMax 异步 API 创建任务
    try {
      const result = await createTtsTask({
        text: normalizedText,
        voiceId: voice_id,
        speed: 1.0,
      });

      // 保存 MiniMax task_id，更新状态为 processing
      updateTask(task.id, {
        status: 'processing',
        task_id: result.taskId,
      });

      // 返回本地 job_id，不等待生成完成
      return NextResponse.json({
        status: 'processing',
        job_id: task.id,
      });
    } catch (error) {
      // MiniMax 调用失败，更新任务状态
      const errorMessage = error instanceof Error ? error.message : '语音生成服务暂时不可用';
      updateTask(task.id, {
        status: 'failed',
        error_message: errorMessage,
      });

      return NextResponse.json(
        { error: errorMessage },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('创建 TTS 任务错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
