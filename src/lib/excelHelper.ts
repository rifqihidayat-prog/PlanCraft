import * as XLSX from 'xlsx';
import { ProductSKU, WeeklyProductionPlan, getMonthName } from '@/types';

export interface ExcelImportRow {
  sku: string;
  name: string;
  qty: number;
  matchedSku?: ProductSKU;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Normalisasi header untuk mencocokkan kolom fleksibel
 */
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parsing file Excel (.xlsx, .xls, .csv) dengan format kolom:
 * - sku / kode sku
 * - nama barang / nama produk
 * - qty kg / target kg / hasil jadi kg
 */
export async function parseExcelFile(
  file: File,
  availableSkus: ProductSKU[]
): Promise<ExcelImportRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File Excel tidak memiliki lembar kerja (sheet).');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  if (jsonData.length === 0) {
    throw new Error('Lembar kerja Excel kosong atau tidak memiliki baris data.');
  }

  // Peta pencarian SKU master berdasarkan sku_code (case-insensitive) dan name
  const skuCodeMap = new Map<string, ProductSKU>();
  const skuNameMap = new Map<string, ProductSKU>();
  availableSkus.forEach((s) => {
    skuCodeMap.set(s.sku_code.trim().toLowerCase(), s);
    skuNameMap.set(s.name.trim().toLowerCase(), s);
  });

  const parsedRows: ExcelImportRow[] = [];

  jsonData.forEach((row) => {
    let rawSku = '';
    let rawName = '';
    let rawQty: any = '';

    for (const [key, value] of Object.entries(row)) {
      const norm = normalizeKey(key);
      if (norm === 'sku' || norm === 'kodesku' || norm === 'skucode' || norm === 'kodebarang') {
        rawSku = String(value).trim();
      } else if (norm === 'namabarang' || norm === 'namaproduk' || norm === 'nama' || norm === 'productname' || norm === 'item') {
        rawName = String(value).trim();
      } else if (norm === 'qtykg' || norm === 'qty' || norm === 'targetkg' || norm === 'target' || norm === 'hasiljadikg' || norm === 'aktualkg') {
        rawQty = value;
      }
    }

    // Jika kolom tidak bernama standar, coba deteksi dari urutan kolom (kolom 1 = SKU, 2 = Nama, 3 = Qty)
    if (!rawSku && !rawName && !rawQty) {
      const values = Object.values(row);
      if (values.length >= 3) {
        rawSku = String(values[0] || '').trim();
        rawName = String(values[1] || '').trim();
        rawQty = values[2];
      }
    }

    // Lewati baris kosong
    if (!rawSku && !rawName && (!rawQty || rawQty === 0)) {
      return;
    }

    const numQty = typeof rawQty === 'number' ? rawQty : parseFloat(String(rawQty).replace(',', '.')) || 0;

    // Cari kesesuaian di Master SKU
    let matched = rawSku ? skuCodeMap.get(rawSku.toLowerCase()) : undefined;
    if (!matched && rawName) {
      matched = skuNameMap.get(rawName.toLowerCase());
    }

    let isValid = true;
    let errorMessage: string | undefined;

    if (!rawSku && !matched) {
      isValid = false;
      errorMessage = 'Kode SKU tidak ditemukan pada baris data';
    } else if (numQty <= 0) {
      isValid = false;
      errorMessage = 'Nilai Qty KG harus lebih dari 0';
    }

    parsedRows.push({
      sku: matched ? matched.sku_code : rawSku,
      name: matched ? matched.name : (rawName || 'Tanpa Nama'),
      qty: Math.round(numQty * 10) / 10,
      matchedSku: matched,
      isValid,
      errorMessage,
    });
  });

  return parsedRows;
}

/**
 * Unduh Template File Excel (.xlsx) dengan kolom:
 * SKU, Nama Barang, Qty (KG)
 */
export function downloadExcelTemplate(type: 'plan' | 'production', sampleSkus?: ProductSKU[]) {
  const filename = type === 'plan' ? 'Template_Plan_Produksi_PlanCraft.xlsx' : 'Template_Input_Hasil_PlanCraft.xlsx';
  const qtyLabel = 'Qty (KG)';

  const headers = ['SKU', 'Nama Barang', qtyLabel];

  // Gunakan sample nyata jika tersedia, atau sampel standar
  const sampleRows: (string | number)[][] = [];
  if (sampleSkus && sampleSkus.length > 0) {
    sampleSkus.slice(0, 5).forEach((s, idx) => {
      sampleRows.push([s.sku_code, s.name, (idx + 1) * 250]);
    });
  } else {
    sampleRows.push(
      ['MC-SL-001', 'Shortplate Slice US 500g', 500],
      ['MC-DG-002', 'Daging Giling Reguler 1Kg', 750],
      ['MC-SK-003', 'Saikoro Cube Beef Meltique 500g', 300],
      ['MC-ST-004', 'Ribeye Steak Meltique 200g', 200]
    );
  }

  const aoa = [headers, ...sampleRows];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  // Set lebar kolom agar rapi
  worksheet['!cols'] = [
    { wch: 16 }, // SKU
    { wch: 38 }, // Nama Barang
    { wch: 14 }, // Qty (KG)
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  XLSX.writeFile(workbook, filename);
}

/**
 * Unduh / Export Target Plan Mingguan ke format Excel (.xlsx)
 */
export function exportPlanToExcel(plan: WeeklyProductionPlan) {
  const monthName = getMonthName(plan.month);
  const cleanMonthName = monthName.replace(/[^a-zA-Z0-9]/g, '');
  const filename = `Plan_Produksi_W${plan.week_number}_${cleanMonthName}_${plan.year || 2026}.xlsx`;

  const headers = ['No', 'Kode SKU', 'Nama Barang', 'Kategori', 'Target (KG)'];

  const rows: (string | number)[][] = (plan.targets || []).map((t, idx) => [
    idx + 1,
    t.sku_code,
    t.sku_name,
    t.category || '-',
    t.target_kg,
  ]);

  const totalKg = (plan.targets || []).reduce((acc, t) => acc + (t.target_kg || 0), 0);
  rows.push(['', '', 'TOTAL TARGET', '', totalKg]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set lebar kolom agar rapi
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // Kode SKU
    { wch: 40 }, // Nama Barang
    { wch: 20 }, // Kategori
    { wch: 16 }, // Target (KG)
  ];

  const workbook = XLSX.utils.book_new();
  const sheetTitle = `W${plan.week_number} ${cleanMonthName}`.substring(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);
  XLSX.writeFile(workbook, filename);
}

/**
 * Unduh / Export Rekap Rencana Produksi 1 Bulan Penuh (W1 - W5) ke format Excel (.xlsx)
 */
export function exportMonthlyPlanToExcel(
  month: number,
  year: number,
  plans: WeeklyProductionPlan[]
) {
  const monthName = getMonthName(month);
  const cleanMonthName = monthName.replace(/[^a-zA-Z0-9]/g, '');
  const filename = `Plan_Produksi_Bulanan_${cleanMonthName}_${year}.xlsx`;

  // Filter rencana yang sesuai dengan bulan & tahun, diurutkan berdasarkan week_number
  const monthPlans = plans
    .filter((p) => {
      const pMonth = p.month || Number(p.start_date.split('-')[1]) || 10;
      return pMonth === month && (p.year || 2026) === year;
    })
    .sort((a, b) => a.week_number - b.week_number);

  const hasAnyTargets = monthPlans.some((p) => p.targets && p.targets.length > 0);
  if (!hasAnyTargets) {
    throw new Error(`Belum ada target rencana produksi pada bulan ${monthName} ${year} untuk diexport.`);
  }

  // Agregasi seluruh SKU di bulan tersebut ke peta SKU
  const skuMap = new Map<string, {
    sku_code: string;
    sku_name: string;
    category: string;
    weeks: { [w: number]: number };
  }>();

  monthPlans.forEach((p) => {
    const w = Number(p.week_number);
    (p.targets || []).forEach((t) => {
      if (!skuMap.has(t.sku_id)) {
        skuMap.set(t.sku_id, {
          sku_code: t.sku_code,
          sku_name: t.sku_name,
          category: t.category || '-',
          weeks: { [w]: t.target_kg || 0 },
        });
      } else {
        const item = skuMap.get(t.sku_id)!;
        item.weeks[w] = (item.weeks[w] || 0) + (t.target_kg || 0);
      }
    });
  });

  const headers = [
    'No',
    'Kode SKU',
    'Nama Barang',
    'Kategori',
    'Week 1 (Kg)',
    'Week 2 (Kg)',
    'Week 3 (Kg)',
    'Week 4 (Kg)',
    'Week 5 (Kg)',
    'Total Bulan (Kg)',
  ];

  const rows: (string | number)[][] = [];
  let sumW1 = 0;
  let sumW2 = 0;
  let sumW3 = 0;
  let sumW4 = 0;
  let sumW5 = 0;
  let grandTotal = 0;

  let no = 1;
  Array.from(skuMap.values()).forEach((item) => {
    const w1 = item.weeks[1] || 0;
    const w2 = item.weeks[2] || 0;
    const w3 = item.weeks[3] || 0;
    const w4 = item.weeks[4] || 0;
    const w5 = item.weeks[5] || 0;
    const total = w1 + w2 + w3 + w4 + w5;

    sumW1 += w1;
    sumW2 += w2;
    sumW3 += w3;
    sumW4 += w4;
    sumW5 += w5;
    grandTotal += total;

    rows.push([
      no++,
      item.sku_code,
      item.sku_name,
      item.category,
      w1,
      w2,
      w3,
      w4,
      w5,
      total,
    ]);
  });

  // Baris Total Akumulasi
  rows.push([
    '',
    '',
    'TOTAL KESELURUHAN',
    '',
    sumW1,
    sumW2,
    sumW3,
    sumW4,
    sumW5,
    grandTotal,
  ]);

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Master Rekap Bulanan
  const summaryWs = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  summaryWs['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // Kode SKU
    { wch: 40 }, // Nama Barang
    { wch: 20 }, // Kategori
    { wch: 14 }, // Week 1
    { wch: 14 }, // Week 2
    { wch: 14 }, // Week 3
    { wch: 14 }, // Week 4
    { wch: 14 }, // Week 5
    { wch: 18 }, // Total Bulan
  ];
  XLSX.utils.book_append_sheet(workbook, summaryWs, `Rekap ${cleanMonthName}`.substring(0, 31));

  // Lembar spesifik per minggu (Week 1 s/d Week 5) jika ada targetnya
  monthPlans.forEach((p) => {
    if (p.targets && p.targets.length > 0) {
      const weekHeaders = ['No', 'Kode SKU', 'Nama Barang', 'Kategori', 'Target (KG)'];
      const weekRows: (string | number)[][] = p.targets.map((t, idx) => [
        idx + 1,
        t.sku_code,
        t.sku_name,
        t.category || '-',
        t.target_kg,
      ]);
      const weekTotal = p.targets.reduce((acc, t) => acc + (t.target_kg || 0), 0);
      weekRows.push(['', '', 'TOTAL TARGET', '', weekTotal]);

      const weekWs = XLSX.utils.aoa_to_sheet([weekHeaders, ...weekRows]);
      weekWs['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 40 },
        { wch: 20 },
        { wch: 16 },
      ];
      const sheetName = `Week ${p.week_number}`.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, weekWs, sheetName);
    }
  });

  XLSX.writeFile(workbook, filename);
}

