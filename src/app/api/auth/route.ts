import { NextResponse } from 'next/server';
import { verifyPassword, setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: '请输入访问密码' },
        { status: 400 }
      );
    }

    const isValid = await verifyPassword(password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '访问密码错误' },
        { status: 401 }
      );
    }

    // 设置认证 cookie
    await setAuthCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('认证错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
