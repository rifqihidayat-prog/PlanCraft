import { ProductSKU } from '@/types';

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
  // Check if starts with ID before query params
  const idOnly = trimmed.split('/')[0].split('?')[0];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(idOnly)) {
    return idOnly;
  }
  return DEFAULT_GSHEET_ID;
}

/**
 * Parse CSV text from Google Sheet into ProductSKU array
 */
export function parseCSVToSKUs(csvText: string): ProductSKU[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Find the header line by scanning the first 10 lines
  let headerLineIndex = -1;
  let codeIdx = -1;
  let nameIdx = -1;
  let grIdx = -1;
  let kgIdx = -1;
  let catIdx = -1;

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cols = parseCSVLine(lines[i]).map(c => c.trim().toLowerCase());
    const cIdx = cols.findIndex(c => c === 'sku' || c.includes('kode') || c.includes('code'));
    const nIdx = cols.findIndex(c => c.includes('nama') || c.includes('name') || c.includes('barang') || c.includes('item'));

    if (cIdx !== -1 && nIdx !== -1) {
      headerLineIndex = i;
      codeIdx = cIdx;
      nameIdx = nIdx;
      grIdx = cols.findIndex(c => c.includes('berat (gr)') || c.includes('gram') || c.includes('(gr)'));
      kgIdx = cols.findIndex(c => c.includes('berat (kg)') || c.includes('(kg)'));
      catIdx = cols.findIndex(c => c.includes('kategori') || c.includes('category'));
      break;
    }
  }

  // Fallback if no explicit header found
  if (headerLineIndex === -1) {
    headerLineIndex = 0;
    codeIdx = 0;
    nameIdx = 1;
    grIdx = 2;
    kgIdx = 3;
  }

  const result: ProductSKU[] = [];
  const seenCodes = new Set<string>();

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (!cols || cols.length === 0) continue;

    const rawCode = cols[codeIdx]?.trim();
    const rawName = cols[nameIdx]?.trim();

    // Skip empty lines, instructions, or subheadings
    if (!rawCode || !rawName) continue;
    if (rawCode.toLowerCase() === 'sku' || rawName.toLowerCase().includes('nama barang')) continue;

    // Check if duplicate SKU code
    if (seenCodes.has(rawCode)) continue;
    seenCodes.add(rawCode);

    // Format spec: berat gr / kg
    const beratGr = grIdx !== -1 ? cols[grIdx]?.trim() : '';
    const beratKg = kgIdx !== -1 ? cols[kgIdx]?.trim() : '';
    let specs = '';
    if (beratGr && beratKg) {
      specs = `Berat: ${beratGr} gr (${beratKg} kg)`;
    } else if (beratGr) {
      specs = `Berat: ${beratGr} gr`;
    } else if (beratKg) {
      specs = `Berat: ${beratKg} kg`;
    }

    // Classify category intelligently for frozen meat processing
    const nameLower = rawName.toLowerCase();
    let category: ProductSKU['category'] = 'Slice';

    if (nameLower.includes('slice') || nameLower.includes('shortplate') || nameLower.includes('karubi') || nameLower.includes('sukiyaki') || nameLower.includes('shabu') || nameLower.includes('yakiniku')) {
      category = 'Slice';
    } else if (nameLower.includes('giling') || nameLower.includes('mince')) {
      category = 'Mince/Giling';
    } else if (nameLower.includes('saikoro') || nameLower.includes('dadu') || nameLower.includes('cube') || nameLower.includes('dicing')) {
      category = 'Dicing/Saikoro';
    } else if (nameLower.includes('steak') || nameLower.includes('ribeye') || nameLower.includes('sirloin') || nameLower.includes('tenderloin') || nameLower.includes('wagyu') || nameLower.includes('meltique')) {
      category = 'Steak Cut';
    } else if (nameLower.includes('trim') || nameLower.includes('lemak') || nameLower.includes('tulang') || nameLower.includes('sop') || nameLower.includes('rawon') || nameLower.includes('rendang') || nameLower.includes('karkas')) {
      category = 'Trimming';
    } else {
      category = 'Lainnya';
    }

    result.push({
      id: `sku-gsheet-${rawCode}`,
      sku_code: rawCode,
      name: rawName,
      category,
      unit: 'kg',
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
