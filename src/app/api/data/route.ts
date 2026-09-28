import { NextResponse } from 'next/server';
import { getAllSKUs, getAllPlans, getActivePlan, getAllLogs, getActivePlanId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const skus = getAllSKUs();
    const plans = getAllPlans();
    const activePlan = getActivePlan();
    const logs = getAllLogs();
    const activePlanId = getActivePlanId();

    return NextResponse.json({
      success: true,
      data: {
        skus,
        plans,
        activePlan,
        logs,
        activePlanId,
      },
    });
  } catch (error) {
    console.error('Error fetching centralized data from SQLite:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat data dari database server' },
      { status: 500 }
    );
  }
}
