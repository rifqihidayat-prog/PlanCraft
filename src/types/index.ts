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
  week_number: number;
  year: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  status: 'active' | 'completed' | 'draft';
  working_days?: number;
  targets: WeeklyTargetItem[];
  notes?: string;
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
