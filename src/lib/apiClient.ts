import { ProductSKU, WeeklyProductionPlan, DailyProductionLog, AuthUser } from '@/types';

export interface InitialDataResponse {
  skus: ProductSKU[];
  plans: WeeklyProductionPlan[];
  activePlan: WeeklyProductionPlan;
  logs: DailyProductionLog[];
  activePlanId: string;
}

export async function fetchInitialData(): Promise<InitialDataResponse | null> {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error('Failed to fetch centralized data from server:', err);
    return null;
  }
}

export async function createProductionLog(
  log: Omit<DailyProductionLog, 'id' | 'created_at'>
): Promise<DailyProductionLog | null> {
  try {
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error('Failed to create production log on server:', err);
    return null;
  }
}

export async function removeProductionLog(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/logs?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return Boolean(json.success);
  } catch (err) {
    console.error('Failed to delete production log on server:', err);
    return false;
  }
}

export async function saveProductionPlan(plan: WeeklyProductionPlan): Promise<WeeklyProductionPlan | null> {
  try {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error('Failed to save production plan on server:', err);
    return null;
  }
}

export async function setActivePlanOnServer(planId: string): Promise<WeeklyProductionPlan | null> {
  try {
    const res = await fetch('/api/plans/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.error('Failed to set active plan on server:', err);
    return null;
  }
}

export async function saveSKUsToServer(skus: ProductSKU[]): Promise<boolean> {
  try {
    const res = await fetch('/api/skus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();
    return Boolean(json.success);
  } catch (err) {
    console.error('Failed to save SKUs to server:', err);
    return false;
  }
}

export async function loginOnServer(username: string, pin: string): Promise<{ success: boolean; user?: AuthUser; message?: string }> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin }),
    });
    const json = await res.json();
    return json;
  } catch (err) {
    console.error('Failed to authenticate on server:', err);
    return { success: false, message: 'Gagal terhubung ke server database' };
  }
}
