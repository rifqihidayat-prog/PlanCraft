import { NextRequest, NextResponse } from 'next/server';
import { changeUserPin } from '@/lib/db';
import { requireAuth } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: 'Format permintaan tidak valid.' }, { status: 400 });
    }
    const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const currentPin = typeof payload.currentPin === 'string' ? payload.currentPin : '';
    const newPin = typeof payload.newPin === 'string' ? payload.newPin : '';
    if (!/^\d{6}$/.test(currentPin) || !/^\d{6}$/.test(newPin)) {
      return NextResponse.json(
        { success: false, message: 'PIN lama dan PIN baru harus tepat 6 angka.' },
        { status: 400 }
      );
    }

    if (!changeUserPin(auth.user.id, currentPin, newPin)) {
      return NextResponse.json(
        { success: false, message: 'PIN lama tidak sesuai.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, message: 'PIN berhasil diubah.' });
  } catch (error) {
    console.error('Error changing user PIN:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat mengubah PIN.' },
      { status: 500 }
    );
  }
}
