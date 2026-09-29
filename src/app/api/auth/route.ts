import { NextRequest, NextResponse } from 'next/server';
import { verifyUserCredentials, createSession } from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const MAX_FAILED_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_BUCKETS = 2000;
const loginAttempts = new Map<string, { attempts: number; resetAt: number }>();

function loginBucketKey(req: NextRequest, username: string): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const clientIp = req.headers.get('cf-connecting-ip')?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || forwardedFor?.split(',').at(-1)?.trim()
    || 'unknown';
  return `${clientIp}:${username.trim().toLowerCase()}`;
}

function retryAfterSeconds(key: string): number {
  const bucket = loginAttempts.get(key);
  if (!bucket) return 0;
  if (bucket.resetAt <= Date.now()) {
    loginAttempts.delete(key);
    return 0;
  }
  return bucket.attempts >= MAX_FAILED_ATTEMPTS ? Math.ceil((bucket.resetAt - Date.now()) / 1000) : 0;
}

function recordLoginFailure(key: string): void {
  const now = Date.now();
  const bucket = loginAttempts.get(key);
  if (bucket && bucket.resetAt > now) {
    bucket.attempts += 1;
  } else {
    loginAttempts.set(key, { attempts: 1, resetAt: now + LOGIN_WINDOW_MS });
  }

  if (loginAttempts.size > MAX_LOGIN_BUCKETS) {
    for (const [entryKey, entry] of loginAttempts) {
      if (entry.resetAt <= now) loginAttempts.delete(entryKey);
    }
    if (loginAttempts.size > MAX_LOGIN_BUCKETS) {
      const oldestKey = loginAttempts.keys().next().value;
      if (oldestKey) loginAttempts.delete(oldestKey);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Format permintaan tidak valid.' }, { status: 400 });
    }
    const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const username = typeof payload.username === 'string' ? payload.username.trim() : '';
    const pin = typeof payload.pin === 'string' ? payload.pin : '';
    if (!username || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { success: false, message: 'Username wajib diisi dan PIN harus tepat 6 angka.' },
        { status: 400 }
      );
    }

    const bucketKey = loginBucketKey(req, username);
    const retryAfter = retryAfterSeconds(bucketKey);
    if (retryAfter > 0) {
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak percobaan login. Coba lagi beberapa menit.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const user = verifyUserCredentials(username, pin);
    if (!user) {
      recordLoginFailure(bucketKey);
      return NextResponse.json(
        { success: false, message: 'Username atau PIN tidak sesuai' },
        { status: 401 }
      );
    }
    loginAttempts.delete(bucketKey);

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
