import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function expectedAuthToken(): Promise<string | null> {
  const password = process.env.ACCESS_PASSWORD;
  if (!password) return null;

  const data = new TextEncoder().encode(`tts-auth:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function middleware(request: NextRequest) {
  // 仅保护 /dashboard 路由
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const authCookie = request.cookies.get('auth_token')?.value;
    const expected = await expectedAuthToken();
    if (!expected || authCookie !== expected) {
      // 未登录，重定向到登录页
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
