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

    const isAdmin = auth.user?.role === 'admin';

    // Role-based migration security:
    // - Akun Admin: Berhak memigrasikan logs, plans, dan skus
    // - Akun Tim Produksi: HANYA berhak memigrasikan log produksi. Perubahan plan dan SKU diabaikan demi kepatuhan RBAC.
    const result = migrateBrowserData(
      {
        logs: body.logs,
        plans: isAdmin ? body.plans : undefined,
        skus: isAdmin ? body.skus : undefined,
      },
      isAdmin
    );

    return NextResponse.json({
      success: true,
      message: isAdmin
        ? 'Migrasi data browser (Logs, Plans, SKUs) ke server SQLite berhasil!'
        : 'Migrasi log produksi browser ke server SQLite berhasil!',
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
