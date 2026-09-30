import { NextRequest, NextResponse } from 'next/server';
import { getAllLogs, addProductionLog, deleteProductionLog } from '@/lib/db';
import { requireAuth } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const logs = getAllLogs();
    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching production logs:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil riwayat produksi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    if (!body.plan_id || !body.sku_id || typeof body.actual_kg !== 'number') {
      return NextResponse.json({ success: false, message: 'Data log tidak lengkap atau tidak valid' }, { status: 400 });
    }

    // Validasi & Proteksi Tanggal Berdasarkan Role:
    // - Akun Tim Produksi: Tanggal wajib hari ini (today), tidak boleh diedit atau dimanipulasi
    // - Akun Admin: Bebas menentukan tanggal produksi (untuk input susulan atau penyesuaian)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const logDate = auth.user?.role === 'admin' ? (body.date || todayStr) : todayStr;

    const created = addProductionLog({
      plan_id: body.plan_id,
      date: logDate,
      sku_id: body.sku_id,
      sku_code: body.sku_code || '',
      sku_name: body.sku_name || '',
      actual_kg: body.actual_kg,
      bottleneck_reason: body.bottleneck_reason || 'Normal / Lancar',
      notes: body.notes || '',
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('Error adding production log:', error);
    return NextResponse.json({ success: false, message: 'Gagal menyimpan hasil produksi ke server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // Hanya admin yang diizinkan menghapus riwayat produksi
  const auth = requireAuth(req, ['admin']);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Parameter ID diperlukan' }, { status: 400 });
    }

    const deleted = deleteProductionLog(id);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    console.error('Error deleting production log:', error);
    return NextResponse.json({ success: false, message: 'Gagal menghapus log dari server' }, { status: 500 });
  }
}
