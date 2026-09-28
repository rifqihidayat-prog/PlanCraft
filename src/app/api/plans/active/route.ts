import { NextRequest, NextResponse } from 'next/server';
import { setActivePlanIdInDb, getActivePlan } from '@/lib/db';
import { requireAuth } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const { planId } = await req.json();
    if (!planId) {
      return NextResponse.json({ success: false, message: 'Plan ID diperlukan' }, { status: 400 });
    }

    setActivePlanIdInDb(planId);
    const activePlan = getActivePlan();

    return NextResponse.json({ success: true, data: activePlan });
  } catch (error) {
    console.error('Error setting active plan:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengatur rencana aktif di server' }, { status: 500 });
  }
}
