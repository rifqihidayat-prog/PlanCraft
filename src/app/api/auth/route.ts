import { NextRequest, NextResponse } from 'next/server';
import { verifyUserCredentials } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username, pin } = await req.json();
    if (!username || !pin) {
      return NextResponse.json({ success: false, message: 'Username dan PIN harus diisi' }, { status: 400 });
    }

    const user = verifyUserCredentials(username, pin);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Username atau PIN tidak sesuai' }, { status: 401 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error verifying user credentials:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan sistem server' }, { status: 500 });
  }
}
