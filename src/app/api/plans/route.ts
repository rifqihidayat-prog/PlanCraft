import { NextRequest, NextResponse } from 'next/server';
import { getAllPlans, savePlan, getActivePlan } from '@/lib/db';
import { WeeklyProductionPlan } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
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
  try {
    const plan = (await req.json()) as WeeklyProductionPlan;
    if (!plan || !plan.id || !plan.week_number) {
      return NextResponse.json({ success: false, message: 'Data rencana produksi tidak valid' }, { status: 400 });
    }

    savePlan(plan);
    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error('Error saving plan:', error);
    return NextResponse.json({ success: false, message: 'Gagal menyimpan rencana produksi ke server' }, { status: 500 });
  }
}
