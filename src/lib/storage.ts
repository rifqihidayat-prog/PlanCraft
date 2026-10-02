import { ProductSKU, WeeklyProductionPlan, DailyProductionLog, WeeklySummary } from '@/types';
import { DEFAULT_SKUS, INITIAL_PLANS, INITIAL_PLAN, INITIAL_LOGS } from './mockData';
import { DEFAULT_GSHEET_ID } from './gsheet';

const STORAGE_KEYS = {
  SKUS: 'plancraft_skus_v1',
  PLANS: 'plancraft_plans_v1',
  ACTIVE_PLAN_ID: 'plancraft_active_plan_id_v1',
  LOGS: 'plancraft_logs_v1',
  GSHEET_ID: 'plancraft_gsheet_id_v1',
};

// Check if running in browser
const isClient = typeof window !== 'undefined';

export function getStoredSKUs(): ProductSKU[] {
  if (!isClient) return DEFAULT_SKUS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SKUS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SKUS, JSON.stringify(DEFAULT_SKUS));
      return DEFAULT_SKUS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_SKUS;
  }
}

export function saveStoredSKUs(skus: ProductSKU[]): void {
  if (!isClient) return;
  try {
    localStorage.setItem(STORAGE_KEYS.SKUS, JSON.stringify(skus));
  } catch (e) {
    console.error('Failed to save SKUs to localStorage', e);
  }
}

export function deduplicatePlansList(plans: WeeklyProductionPlan[]): WeeklyProductionPlan[] {
  const map = new Map<string, WeeklyProductionPlan>();
  plans.forEach(p => {
    const m = p.month || Number(p.start_date?.split('-')[1]) || 10;
    const w = Number(p.week_number) > 5 ? 1 : (Number(p.week_number) || 1);
    const y = p.year || 2026;
    const key = `${y}-${m}-${w}`;
    if (!map.has(key)) {
      map.set(key, p);
    } else {
      const existing = map.get(key)!;
      if (p.status === 'active' && existing.status !== 'active') {
        map.set(key, p);
      } else if ((p.targets?.length || 0) > (existing.targets?.length || 0) && existing.status !== 'active') {
        map.set(key, p);
      }
    }
  });
  return Array.from(map.values()).sort((a, b) => {
    if ((b.year || 2026) !== (a.year || 2026)) return (b.year || 2026) - (a.year || 2026);
    const bMonth = b.month || Number(b.start_date?.split('-')[1]) || 10;
    const aMonth = a.month || Number(a.start_date?.split('-')[1]) || 10;
    if (bMonth !== aMonth) return bMonth - aMonth;
    return a.week_number - b.week_number;
  });
}

export function getStoredPlans(): WeeklyProductionPlan[] {
  if (!isClient) return deduplicatePlansList(INITIAL_PLANS);
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PLANS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(INITIAL_PLANS));
      return deduplicatePlansList(INITIAL_PLANS);
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? deduplicatePlansList(parsed) : deduplicatePlansList(INITIAL_PLANS);
  } catch {
    return deduplicatePlansList(INITIAL_PLANS);
  }
}

export function saveStoredPlans(plans: WeeklyProductionPlan[]): void {
  if (!isClient) return;
  try {
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
  } catch (e) {
    console.error('Failed to save plans to localStorage', e);
  }
}

export function getActivePlan(): WeeklyProductionPlan {
  const plans = getStoredPlans();
  if (plans.length === 0) return INITIAL_PLAN;

  if (isClient) {
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PLAN_ID);
    if (activeId) {
      const found = plans.find(p => p.id === activeId);
      if (found) return found;
    }
  }

  const active = plans.find(p => p.status === 'active') || plans[0];
  return active;
}

export function setActivePlanId(planId: string): void {
  if (!isClient) return;
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PLAN_ID, planId);
  } catch (e) {
    console.error('Failed to set active plan id', e);
  }
}

export function getStoredLogs(): DailyProductionLog[] {
  if (!isClient) return INITIAL_LOGS;
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_LOGS;
  }
}

export function saveStoredLogs(logs: DailyProductionLog[]): void {
  if (!isClient) return;
  try {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save logs to localStorage', e);
  }
}

export function addDailyLog(log: Omit<DailyProductionLog, 'id' | 'created_at'>): DailyProductionLog {
  const logs = getStoredLogs();
  const newLog: DailyProductionLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    created_at: new Date().toISOString(),
  };

  const updated = [newLog, ...logs];
  saveStoredLogs(updated);
  return newLog;
}

export function deleteDailyLog(id: string): void {
  const logs = getStoredLogs();
  const updated = logs.filter(l => l.id !== id);
  saveStoredLogs(updated);
}

export function getStoredGSheetId(): string {
  if (!isClient) return DEFAULT_GSHEET_ID;
  return localStorage.getItem(STORAGE_KEYS.GSHEET_ID) || DEFAULT_GSHEET_ID;
}

export function saveStoredGSheetId(id: string): void {
  if (!isClient) return;
  localStorage.setItem(STORAGE_KEYS.GSHEET_ID, id);
}

/**
 * Calculates summary for a specific plan or across all plans
 */
export function calculateWeeklySummary(
  targetPlans: WeeklyProductionPlan[],
  logs: DailyProductionLog[]
): WeeklySummary {
  const planIds = new Set(targetPlans.map(p => p.id));
  const relevantLogs = logs.filter(l => planIds.has(l.plan_id));

  // Sum all targets from the selected plans
  let total_target_kg = 0;
  targetPlans.forEach(plan => {
    plan.targets.forEach(t => {
      total_target_kg += t.target_kg || 0;
    });
  });

  const total_actual_kg = relevantLogs.reduce((acc, curr) => acc + (curr.actual_kg || 0), 0);

  const achievement_rate = total_target_kg > 0 
    ? Math.round((total_actual_kg / total_target_kg) * 1000) / 10 
    : 0;

  const remaining_target_kg = Math.max(0, Math.round((total_target_kg - total_actual_kg) * 10) / 10);

  let status: 'on_track' | 'warning' | 'behind' = 'on_track';
  if (achievement_rate < 80) {
    status = 'behind';
  } else if (achievement_rate < 95) {
    status = 'warning';
  }

  return {
    total_target_kg: Math.round(total_target_kg * 10) / 10,
    total_actual_kg: Math.round(total_actual_kg * 10) / 10,
    achievement_rate,
    remaining_target_kg,
    status,
  };
}

export function formatKg(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(val);
}

export function formatPercent(val: number): string {
  return `${val.toFixed(1)}%`;
}
