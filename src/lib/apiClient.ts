import { ProductSKU, WeeklyProductionPlan, DailyProductionLog, AuthUser } from '@/types';

export interface InitialDataResponse {
  skus: ProductSKU[];
  plans: WeeklyProductionPlan[];
  activePlan: WeeklyProductionPlan;
  logs: DailyProductionLog[];
  activePlanId: string;
}

const TOKEN_KEY = 'plancraft_token_v1';

function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function fetchInitialData(): Promise<InitialDataResponse | null> {
  try {
    const res = await fetch('/api/data', { 
      cache: 'no-store',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
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
      headers: getAuthHeaders(),
      credentials: 'include',
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
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
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
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

export async function loginOnServer(
  username: string, 
  pin: string
): Promise<{ success: boolean; user?: AuthUser; token?: string; message?: string }> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, pin }),
    });
    const json = await res.json();
    if (json.success && json.token && typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, json.token);
    }
    return json;
  } catch (err) {
    console.error('Failed to authenticate on server:', err);
    return { success: false, message: 'Gagal terhubung ke server database' };
  }
}

export async function checkSession(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/me', {
      cache: 'no-store',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
      return null;
    }
    const json = await res.json();
    return json.success && json.user ? json.user : null;
  } catch (err) {
    console.error('Failed to check session on server:', err);
    return null;
  }
}

export async function logoutOnServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json.success);
  } catch (err) {
    console.error('Failed to logout on server:', err);
    return false;
  }
}

export async function migrateBrowserDataOnServer(data: {
  logs?: DailyProductionLog[];
  plans?: WeeklyProductionPlan[];
  skus?: ProductSKU[];
}): Promise<{ success: boolean; message?: string; migrated?: any }> {
  try {
    const res = await fetch('/api/migrate', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      return { success: false, message: `Server mengembalikan status ${res.status}` };
    }
    const json = await res.json();
    return json;
  } catch (err) {
    console.error('Failed to migrate browser data on server:', err);
    return { success: false, message: 'Gagal menghubungi server untuk migrasi' };
  }
}
