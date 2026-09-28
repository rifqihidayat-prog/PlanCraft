import { ProductSKU, WeeklyProductionPlan, DailyProductionLog } from '@/types';

export const DEFAULT_SKUS: ProductSKU[] = [
  {
    id: 'sku-1',
    sku_code: 'BF-SL-001',
    name: 'Beef Shortplate Slice 1mm',
    category: 'Slice',
    unit: 'kg',
    specs: 'Tray 500g, Fat 50%',
    active: true,
  },
  {
    id: 'sku-2',
    sku_code: 'BF-SL-002',
    name: 'Wagyu Karubi Slice 1.5mm',
    category: 'Slice',
    unit: 'kg',
    specs: 'Tray 250g, Marbling Score 5+',
    active: true,
  },
  {
    id: 'sku-3',
    sku_code: 'BF-MC-001',
    name: 'Daging Giling / Mince Special 85/15',
    category: 'Mince/Giling',
    unit: 'kg',
    specs: 'Vacuum Pack 1kg, 85% lean 15% fat',
    active: true,
  },
  {
    id: 'sku-4',
    sku_code: 'BF-SK-001',
    name: 'Saikoro Beef Dicing 2x2 cm',
    category: 'Dicing/Saikoro',
    unit: 'kg',
    specs: 'Bag 1kg, Meltique Beef',
    active: true,
  },
  {
    id: 'sku-5',
    sku_code: 'BF-ST-001',
    name: 'Ribeye Steak Cut 200g',
    category: 'Steak Cut',
    unit: 'kg',
    specs: 'Vacuum skin pack, Aus Grain-fed',
    active: true,
  },
  {
    id: 'sku-6',
    sku_code: 'BF-ST-002',
    name: 'Tenderloin Steak Cut 200g',
    category: 'Steak Cut',
    unit: 'kg',
    specs: 'Vacuum skin pack, Meltique',
    active: true,
  },
  {
    id: 'sku-7',
    sku_code: 'BF-SL-003',
    name: 'Sukiyaki Beef Slice Roll',
    category: 'Slice',
    unit: 'kg',
    specs: 'Tray 500g, Topside lean',
    active: true,
  },
  {
    id: 'sku-8',
    sku_code: 'BF-TR-001',
    name: 'Beef Trimming Fat & Bones',
    category: 'Trimming',
    unit: 'kg',
    specs: 'Bulk 20kg block for industrial use',
    active: true,
  }
];

export const INITIAL_PLAN: WeeklyProductionPlan = {
  id: 'plan-w40-2026',
  title: 'Plan Produksi Minggu Ke-40 (Oktober 2026)',
  week_number: 40,
  year: 2026,
  start_date: '2026-09-28',
  end_date: '2026-10-03',
  status: 'active',
  working_days: 6, // Senin - Sabtu
  notes: 'Fokus penuhi pesanan frozen slice dan minced beef untuk catering dan retail.',
  targets: [
    {
      sku_id: 'sku-1',
      sku_name: 'Beef Shortplate Slice 1mm',
      sku_code: 'BF-SL-001',
      category: 'Slice',
      target_kg: 2400,
      daily_target_kg: 400,
    },
    {
      sku_id: 'sku-2',
      sku_code: 'BF-SL-002',
      sku_name: 'Wagyu Karubi Slice 1.5mm',
      category: 'Slice',
      target_kg: 600,
      daily_target_kg: 100,
    },
    {
      sku_id: 'sku-3',
      sku_code: 'BF-MC-001',
      sku_name: 'Daging Giling / Mince Special 85/15',
      category: 'Mince/Giling',
      target_kg: 1500,
      daily_target_kg: 250,
    },
    {
      sku_id: 'sku-4',
      sku_code: 'BF-SK-001',
      sku_name: 'Saikoro Beef Dicing 2x2 cm',
      category: 'Dicing/Saikoro',
      target_kg: 900,
      daily_target_kg: 150,
    },
    {
      sku_id: 'sku-5',
      sku_code: 'BF-ST-001',
      sku_name: 'Ribeye Steak Cut 200g',
      category: 'Steak Cut',
      target_kg: 600,
      daily_target_kg: 100,
    }
  ]
};

export const INITIAL_LOGS: DailyProductionLog[] = [
  {
    id: 'log-1',
    plan_id: 'plan-w40-2026',
    date: '2026-09-28',
    sku_id: 'sku-1',
    sku_name: 'Beef Shortplate Slice 1mm',
    sku_code: 'BF-SL-001',
    actual_kg: 415.5,
    trimming_loss_kg: 24.5,
    bottleneck_reason: 'Normal',
    notes: 'Kualitas daging beku sangat baik, mesin slicing stabil.',
    created_at: '2026-09-28T16:30:00.000Z'
  },
  {
    id: 'log-2',
    plan_id: 'plan-w40-2026',
    date: '2026-09-28',
    sku_id: 'sku-3',
    sku_name: 'Daging Giling / Mince Special 85/15',
    sku_code: 'BF-MC-001',
    actual_kg: 260.0,
    trimming_loss_kg: 8.0,
    bottleneck_reason: 'Normal',
    notes: 'Grinder beroperasi lancar, packaging 1kg selesai.',
    created_at: '2026-09-28T17:00:00.000Z'
  },
  {
    id: 'log-3',
    plan_id: 'plan-w40-2026',
    date: '2026-09-28',
    sku_id: 'sku-4',
    sku_name: 'Saikoro Beef Dicing 2x2 cm',
    sku_code: 'BF-SK-001',
    actual_kg: 140.0,
    trimming_loss_kg: 18.0,
    bottleneck_reason: 'Daging Terlalu Keras / Frozen Solid',
    notes: 'Thawing sedikit terhambat di pagi hari, pemotongan kubus agak lambat.',
    created_at: '2026-09-28T17:15:00.000Z'
  }
];
