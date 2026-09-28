import { ProductSKU, WeeklyProductionPlan, DailyProductionLog, WeeklySummary } from '@/types';
import { DEFAULT_SKUS, INITIAL_PLAN, INITIAL_LOGS } from './mockData';
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

export function getStoredPlans(): WeeklyProductionPlan[] {
  if (!isClient) return [INITIAL_PLAN];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PLANS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify([INITIAL_PLAN]));
      return [INITIAL_PLAN];
    }
    return JSON.parse(data);
  } catch {
    return [INITIAL_PLAN];
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

export function calculateWeeklySummary(
  plan: WeeklyProductionPlan,
  logs: DailyProductionLog[]
): WeeklySummary {
  const planLogs = logs.filter(l => l.plan_id === plan.id);

  const total_target_kg = plan.targets.reduce((acc, curr) => acc + (curr.target_kg || 0), 0);
  const total_actual_kg = planLogs.reduce((acc, curr) => acc + (curr.actual_kg || 0), 0);
  const total_trimming_kg = planLogs.reduce((acc, curr) => acc + (curr.trimming_loss_kg || 0), 0);

  const achievement_rate = total_target_kg > 0 
    ? Math.round((total_actual_kg / total_target_kg) * 1000) / 10 
    : 0;

  const remaining_target_kg = Math.max(0, Math.round((total_target_kg - total_actual_kg) * 10) / 10);

  const total_processed_meat = total_actual_kg + total_trimming_kg;
  const yield_rate = total_processed_meat > 0 
    ? Math.round((total_actual_kg / total_processed_meat) * 1000) / 10 
    : 100;

  let status: 'on_track' | 'warning' | 'behind' = 'on_track';
  if (achievement_rate < 80) {
    status = 'behind';
  } else if (achievement_rate < 95) {
    status = 'warning';
  }

  return {
    total_target_kg,
    total_actual_kg: Math.round(total_actual_kg * 10) / 10,
    total_trimming_kg: Math.round(total_trimming_kg * 10) / 10,
    achievement_rate,
    remaining_target_kg,
    yield_rate,
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

export function getIndonesianDayName(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[d.getDay()];
  } catch {
    return '';
  }
}
