import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getVoices } from '@/lib/minimax';

export async function GET() {
  try {
    // 验证认证
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 获取音色列表（硬编码，无需调用外部 API）
    const voices = getVoices();

    return NextResponse.json({ voices });
  } catch (error) {
    console.error('获取音色列表错误:', error);
    return NextResponse.json(
      { error: '获取音色列表失败' },
      { status: 500 }
    );
  }
}
