import * as XLSX from 'xlsx';
import { ProductSKU } from '@/types';

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
