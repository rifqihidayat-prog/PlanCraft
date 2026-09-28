import { NextRequest, NextResponse } from 'next/server';
import { migrateBrowserData } from '@/lib/db';
import { requireAuth } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Wajib terautentikasi untuk migrasi
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Format data migrasi tidak valid' },
        { status: 400 }
      );
    }

    const result = migrateBrowserData({
      logs: body.logs,
      plans: body.plans,
      skus: body.skus,
    });

    return NextResponse.json({
      success: true,
      message: 'Migrasi data browser ke server SQLite berhasil!',
      migrated: result,
    });
  } catch (error) {
    console.error('Error during data migration:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memigrasi data browser ke server' },
      { status: 500 }
    );
  }
}
