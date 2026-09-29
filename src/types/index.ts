export interface ProductSKU {
  id: string;
  sku_code: string;
  name: string;
  category: 'Slice' | 'Mince/Giling' | 'Dicing/Saikoro' | 'Steak Cut' | 'Trimming' | 'Lainnya';
  unit: 'kg' | 'pack';
  specs?: string;
  active: boolean;
}

export interface WeeklyTargetItem {
  sku_id: string;
  sku_name: string;
  sku_code: string;
  category: string;
  target_kg: number;
  daily_target_kg?: number;
}

export interface DailyProductionLog {
  id: string;
  plan_id: string;
  date: string; // YYYY-MM-DD
  sku_id: string;
  sku_name: string;
  sku_code: string;
  actual_kg: number;
  trimming_loss_kg?: number;
  bottleneck_reason?: string;
  notes?: string;
  created_at: string;
}

export interface WeeklyProductionPlan {
  id: string;
  title: string;
  week_number: number; // 1 - 5 (Minggu ke-1 s/d Minggu ke-5)
  month: number;       // 1 - 12 (Bulan kebutuhan: 1 = Januari ... 12 = Desember)
  year: number;        // Tahun kebutuhan, misal 2026
  start_date: string;  // YYYY-MM-DD
  end_date: string;    // YYYY-MM-DD
  status: 'active' | 'completed' | 'draft';
  working_days?: number;
  targets: WeeklyTargetItem[];
  notes?: string;
}

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
];

export function getMonthName(month?: number): string {
  if (!month || month < 1 || month > 12) return 'Bulan';
  return MONTH_NAMES[month - 1];
}

export function getMonthShortName(month?: number): string {
  if (!month || month < 1 || month > 12) return 'Bln';
  return MONTH_SHORT_NAMES[month - 1];
}

export interface WeeklySummary {
  total_target_kg: number;
  total_actual_kg: number;
  achievement_rate: number; // percentage
  remaining_target_kg: number;
  status: 'on_track' | 'warning' | 'behind';
}

export interface GSheetSyncResult {
  success: boolean;
  message: string;
  errorCode?: 'RESTRICTED_ACCESS' | 'INVALID_FORMAT' | 'NETWORK_ERROR';
  count?: number;
  skus?: ProductSKU[];
}

export type UserRole = 'admin' | 'production';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}
