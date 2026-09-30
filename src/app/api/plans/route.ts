import { NextRequest, NextResponse } from 'next/server';
import { getAllPlans, savePlan, getActivePlan } from '@/lib/db';
import { requireAuth } from '@/lib/serverAuth';
import { WeeklyProductionPlan } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const plans = getAllPlans();
    const activePlan = getActivePlan();
    return NextResponse.json({ success: true, data: { plans, activePlan } });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json({ success: false, message: 'Gagal memuat rencana produksi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Hanya admin PPIC yang berwenang mengubah atau membuat rencana target produksi
  const auth = requireAuth(req, ['admin']);
  if (auth.error) return auth.error;

  try {
    const plan = (await req.json()) as WeeklyProductionPlan;
    if (!plan || !plan.id || !plan.week_number) {
      return NextResponse.json({ success: false, message: 'Data rencana produksi tidak valid' }, { status: 400 });
    }

    if (!plan.month && plan.start_date) {
      plan.month = Number(plan.start_date.split('-')[1]) || 10;
    }

    savePlan(plan);
    const activePlan = getActivePlan();
    return NextResponse.json({ success: true, data: plan, activePlan });
  } catch (error) {
    console.error('Error saving plan:', error);
    return NextResponse.json({ success: false, message: 'Gagal menyimpan rencana produksi ke server' }, { status: 500 });
  }
}
