import { NextRequest, NextResponse } from 'next/server';
import { extractSheetId, parseCSVToSKUs, DEFAULT_GSHEET_ID } from '@/lib/gsheet';
import { GSheetSyncResult } from '@/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawId = searchParams.get('sheetId') || DEFAULT_GSHEET_ID;
  const gid = searchParams.get('gid') || '0';
  const sheetId = extractSheetId(rawId);

  return handleSync(sheetId, gid);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawId = body.sheetId || DEFAULT_GSHEET_ID;
    const gid = body.gid || '0';
    const sheetId = extractSheetId(rawId);

    return handleSync(sheetId, gid);
  } catch {
    return handleSync(DEFAULT_GSHEET_ID, '0');
  }
}

async function handleSync(sheetId: string, gid: string): Promise<NextResponse<GSheetSyncResult>> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  try {
    const response = await fetch(csvUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/plain,*/*'
      },
      // Follow redirects to get the exported file
      redirect: 'follow',
      cache: 'no-store',
    });

    const finalUrl = response.url || '';

    // Check if redirected to Google login
    if (finalUrl.includes('accounts.google.com') || response.status === 401 || response.status === 403) {
      return NextResponse.json({
        success: false,
        errorCode: 'RESTRICTED_ACCESS',
        message: 'Google Sheet berstatus dibatasi (Private). Mohon ubah akses di Google Sheet: Klik tombol "Bagikan" -> Ubah "Akses umum" ke "Siapa saja yang memiliki link" sebagai Pelihat (Viewer).'
      }, { status: 200 });
    }

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: `Gagal mengambil data dari Google Sheet (Status: ${response.status}). Pastikan ID Sheet benar.`
      }, { status: 200 });
    }

    const csvText = await response.text();

    // Check if content is an HTML login page
    if (csvText.includes('<!DOCTYPE html>') || csvText.includes('ServiceLogin') || csvText.includes('accounts.google.com')) {
      return NextResponse.json({
        success: false,
        errorCode: 'RESTRICTED_ACCESS',
        message: 'Google Sheet memerlukan login akun Google. Silakan ubah izin sharing menjadi "Anyone with the link can view".'
      }, { status: 200 });
    }

    const skus = parseCSVToSKUs(csvText);

    if (skus.length === 0) {
      return NextResponse.json({
        success: false,
        errorCode: 'INVALID_FORMAT',
        message: 'Data spreadsheet berhasil diunduh namun tidak ada baris SKU yang terdeteksi.'
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      count: skus.length,
      skus,
      message: `Berhasil menyinkronkan ${skus.length} data SKU dari Database PlanCraft!`
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      errorCode: 'NETWORK_ERROR',
      message: `Terjadi kendala saat menghubungkan ke Google Sheet: ${errorMsg}`
    }, { status: 200 });
  }
}
