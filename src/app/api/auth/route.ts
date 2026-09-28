import { NextRequest, NextResponse } from 'next/server';
import { verifyUserCredentials, createSession } from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username, pin } = await req.json();
    if (!username || !pin) {
      return NextResponse.json(
        { success: false, message: 'Username dan PIN/Password harus diisi' },
        { status: 400 }
      );
    }

    const user = verifyUserCredentials(username, pin);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Username atau PIN tidak sesuai' },
        { status: 401 }
      );
    }

    // Buat session token di SQLite
    const { token, expiresAt } = createSession(user.id);

    const isHttps = req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';

    const res = NextResponse.json({
      success: true,
      user,
      token,
      message: `Selamat datang, ${user.name}!`,
    });

    // Pasang HTTP-Only Cookie yang aman
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return res;
  } catch (error) {
    console.error('Error during authentication login:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem server saat login' },
      { status: 500 }
    );
  }
}
