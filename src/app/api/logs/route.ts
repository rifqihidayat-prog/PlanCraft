import { NextRequest, NextResponse } from 'next/server';
import { getAllLogs, addProductionLog, deleteProductionLog } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = getAllLogs();
    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching production logs:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengambil riwayat produksi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.plan_id || !body.sku_id || typeof body.actual_kg !== 'number') {
      return NextResponse.json({ success: false, message: 'Data log tidak lengkap atau tidak valid' }, { status: 400 });
    }

    const created = addProductionLog({
      plan_id: body.plan_id,
      date: body.date || new Date().toISOString().split('T')[0],
      sku_id: body.sku_id,
      sku_code: body.sku_code || '',
      sku_name: body.sku_name || '',
      actual_kg: body.actual_kg,
      notes: body.notes || '',
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('Error adding production log:', error);
    return NextResponse.json({ success: false, message: 'Gagal menyimpan hasil produksi ke server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
