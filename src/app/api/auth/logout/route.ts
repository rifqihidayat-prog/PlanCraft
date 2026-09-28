import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      deleteSession(token);
    }

    const res = NextResponse.json({
      success: true,
      message: 'Berhasil keluar (logout)',
    });

    // Hapus cookie sesi
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      path: '/',
      maxAge: 0,
    });

    return res;
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses logout' },
      { status: 500 }
    );
  }
}
