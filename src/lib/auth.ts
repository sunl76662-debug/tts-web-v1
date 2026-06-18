import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'auth_token';

// 获取访问密码
function getAccessPassword(): string {
  const password = process.env.ACCESS_PASSWORD;
  if (!password) {
    throw new Error('ACCESS_PASSWORD 未配置');
  }
  return password;
}

function getCookieValue(): string {
  return crypto
    .createHash('sha256')
    .update(`tts-auth:${getAccessPassword()}`)
    .digest('hex');
}

// Timing-safe 密码比较
function comparePassword(input: string, expected: string): boolean {
  const inputBuffer = Buffer.from(input, 'utf-8');
  const expectedBuffer = Buffer.from(expected, 'utf-8');

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

// 验证密码
export async function verifyPassword(password: string): Promise<boolean> {
  const expectedPassword = getAccessPassword();
  return comparePassword(password, expectedPassword);
}

// 设置认证 cookie
export async function setAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, getCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 天
  });
}

// 检查是否已认证
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!authCookie) return false;
  return comparePassword(authCookie, getCookieValue());
}

// 清除认证 cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
