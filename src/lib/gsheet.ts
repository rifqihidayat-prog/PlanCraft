import { ProductSKU, GSheetSyncResult } from '@/types';

export const DEFAULT_GSHEET_ID = '1Dpe2Z8s3OcAJVN65vjGr2E_C2gR3UBPe946kG1GLR28';

/**
 * Extracts Google Sheet ID from full URL or returns ID as is
 */
export function extractSheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If it's already an ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  return DEFAULT_GSHEET_ID;
}

/**
 * Parse CSV text into ProductSKU array
 */
export function parseCSVToSKUs(csvText: string): ProductSKU[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const header = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());

  // Find column indexes
  let codeIdx = header.findIndex(h => h.includes('sku') || h.includes('kode') || h.includes('code'));
  let nameIdx = header.findIndex(h => h.includes('nama') || h.includes('name') || h.includes('barang') || h.includes('item'));
  let catIdx = header.findIndex(h => h.includes('kategori') || h.includes('category') || h.includes('jenis'));
  let unitIdx = header.findIndex(h => h.includes('satuan') || h.includes('unit') || h.includes('uom'));
  let specIdx = header.findIndex(h => h.includes('spek') || h.includes('spec') || h.includes('ket') || h.includes('desc'));

  // Defaults if header names don't match
  if (codeIdx === -1) codeIdx = 0;
  if (nameIdx === -1) nameIdx = 1 < header.length ? 1 : 0;
  if (catIdx === -1) catIdx = 2 < header.length ? 2 : -1;
  if (unitIdx === -1) unitIdx = 3 < header.length ? 3 : -1;
  if (specIdx === -1) specIdx = 4 < header.length ? 4 : -1;

  const result: ProductSKU[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (!cols || cols.length === 0) continue;

    const rawCode = cols[codeIdx]?.trim();
    const rawName = cols[nameIdx]?.trim();

    if (!rawCode && !rawName) continue;

    const code = rawCode || `SKU-${i}`;
    const name = rawName || rawCode;
    const rawCategory = catIdx !== -1 ? cols[catIdx]?.trim() : '';
    const unit = (unitIdx !== -1 && cols[unitIdx]?.toLowerCase().includes('pack')) ? 'pack' : 'kg';
    const specs = specIdx !== -1 ? cols[specIdx]?.trim() : '';

    // Normalize category
    let category: ProductSKU['category'] = 'Slice';
    const lowerCat = (rawCategory + ' ' + name).toLowerCase();
    if (lowerCat.includes('giling') || lowerCat.includes('mince')) {
      category = 'Mince/Giling';
    } else if (lowerCat.includes('saikoro') || lowerCat.includes('dadu') || lowerCat.includes('dicing') || lowerCat.includes('cube')) {
      category = 'Dicing/Saikoro';
    } else if (lowerCat.includes('steak') || lowerCat.includes('ribeye') || lowerCat.includes('sirloin') || lowerCat.includes('tenderloin')) {
      category = 'Steak Cut';
    } else if (lowerCat.includes('trim') || lowerCat.includes('lemak') || lowerCat.includes('tulang') || lowerCat.includes('susut')) {
      category = 'Trimming';
    } else if (lowerCat.includes('slice') || lowerCat.includes('shabu') || lowerCat.includes('sukiyaki') || lowerCat.includes('yakiniku')) {
      category = 'Slice';
    } else {
      category = 'Lainnya';
    }

    result.push({
      id: `sku-imported-${i}-${Date.now().toString(36)}`,
      sku_code: code,
      name,
      category,
      unit,
      specs: specs || undefined,
      active: true,
    });
  }

  return result;
}

/**
 * Basic CSV line splitter respecting quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
