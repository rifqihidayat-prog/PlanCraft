import { NextRequest, NextResponse } from 'next/server';
import { getAllSKUs, upsertSKUs } from '@/lib/db';
import { requireAuth } from '@/lib/serverAuth';
import { ProductSKU } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const skus = getAllSKUs();
    return NextResponse.json({ success: true, data: skus });
  } catch (error) {
    console.error('Error fetching SKUs from SQLite:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil data SKU' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Hanya admin yang berwenang memperbarui master SKU database
  const auth = requireAuth(req, ['admin']);
  if (auth.error) return auth.error;

  try {
    const { skus } = (await req.json()) as { skus: ProductSKU[] };
    if (!Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json({ success: false, message: 'Daftar SKU kosong atau tidak valid' }, { status: 400 });
    }

    upsertSKUs(skus);
    return NextResponse.json({ success: true, count: skus.length });
  } catch (error) {
    console.error('Error saving SKUs to SQLite:', error);
    return NextResponse.json({ success: false, message: 'Gagal menyimpan SKU ke database server' }, { status: 500 });
  }
}
