'use client';

import React, { useState } from 'react';
import { ProductSKU, GSheetSyncResult } from '@/types';
import { DEFAULT_GSHEET_ID, parseCSVToSKUs } from '@/lib/gsheet';
import { DEFAULT_SKUS } from '@/lib/mockData';
import { 
  Boxes, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  Plus, 
  ShieldAlert,
  RotateCcw,
  Search,
  Tag,
  Info
} from 'lucide-react';

interface GoogleSheetSyncProps {
  skus: ProductSKU[];
  onUpdateSKUs: (newSkus: ProductSKU[]) => void;
}

export const GoogleSheetSync: React.FC<GoogleSheetSyncProps> = ({
  skus,
  onUpdateSKUs,
}) => {
  const [sheetId, setSheetId] = useState(DEFAULT_GSHEET_ID);
  const [loading, setLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<GSheetSyncResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New SKU manual state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<ProductSKU['category']>('Slice');
  const [newSpecs, setNewSpecs] = useState('');

  const gsheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=0#gid=0`;

  // Fetch sync from API
  const handleSyncGSheet = async () => {
    setLoading(true);
    setSyncResult(null);

    try {
      const res = await fetch(`/api/sync-skus?sheetId=${encodeURIComponent(sheetId)}&gid=0`);
      const data: GSheetSyncResult = await res.json();

      setSyncResult(data);

      if (data.success && data.skus && data.skus.length > 0) {
        onUpdateSKUs(data.skus);
      }
    } catch {
      setSyncResult({
        success: false,
        errorCode: 'NETWORK_ERROR',
        message: 'Gagal menghubungi server. Periksa koneksi internet Anda.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle local CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseCSVToSKUs(text);
        if (parsed.length > 0) {
          onUpdateSKUs(parsed);
          setSyncResult({
            success: true,
            message: `Berhasil mengimpor ${parsed.length} SKU dari file CSV lokal!`,
            count: parsed.length,
          });
        } else {
          setSyncResult({
            success: false,
            message: 'Format CSV tidak dikenali atau file kosong.',
          });
        }
      }
    };
    reader.readAsText(file);
  };

  // Add manual SKU
  const handleAddManualSKU = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;

    const newSku: ProductSKU = {
      id: `sku-${Date.now()}`,
      sku_code: newCode.toUpperCase(),
      name: newName,
      category: newCat,
      unit: 'kg',
      specs: newSpecs || undefined,
      active: true,
    };

    onUpdateSKUs([...skus, newSku]);
    setNewCode('');
    setNewName('');
    setNewSpecs('');
    setShowAddModal(false);
  };

  // Filtered SKUs
  const filteredSkus = skus.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sku_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-24">
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <Boxes className="w-5 h-5 text-rose-500" />
          Database SKU & Sinkronisasi Google Sheet
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Hubungkan master barang pengolahan daging frozen langsung dari spreadsheet Google Drive Anda.
        </p>
      </div>

      {/* Google Sheet Sync Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Google Sheet: <strong>Database PlanCraft</strong></span>
            </h2>
            <a
              href={gsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 mt-0.5"
            >
              <span>Buka Google Sheet di Tab Baru</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateSKUs(DEFAULT_SKUS)}
              title="Reset ke SKU contoh standar"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standar</span>
            </button>
          </div>
        </div>

        {/* Input Sheet ID & Sync Button */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Google Spreadsheet ID / URL
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="Contoh: 1Dpe2Z8s3OcAJVN65vjGr2E_C2gR3UBPe946kG1GLR28"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
            <button
              onClick={handleSyncGSheet}
              disabled={loading}
              className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 shrink-0 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Menghubungkan...' : 'Tarik Data SKU'}</span>
            </button>
          </div>
        </div>

        {/* Sync Status / Guidance Banner */}
        {syncResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              syncResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {syncResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold text-white">{syncResult.message}</p>

                {syncResult.errorCode === 'RESTRICTED_ACCESS' && (
                  <div className="mt-2.5 pt-2.5 border-t border-amber-500/20 text-slate-300 space-y-1.5 bg-slate-950/60 p-3 rounded-lg">
                    <p className="font-bold text-amber-400 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" />
                      Petunjuk Mengaktifkan Akses Google Sheet:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 pl-1">
                      <li>Buka file spreadsheet Google Drive Anda.</li>
                      <li>Klik tombol <strong>Bagikan (Share)</strong> di sudut kanan atas.</li>
                      <li>
                        Di bagian <em>Akses umum</em>, ubah dari <strong>Dibatasi</strong> ke{' '}
                        <strong className="text-white">"Siapa saja yang memiliki link"</strong> (Anyone with the link).
                      </li>
                      <li>Pastikan perannya disetel sebagai <strong>Pelihat (Viewer)</strong>.</li>
                      <li>Klik Selesai, lalu kembali ke halaman ini dan tekan tombol <strong>"Tarik Data SKU"</strong>.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Alternative CSV Upload */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/80">
          <span>Opsi Alternatif (Bila di Cold Storage tanpa internet):</span>
          <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition flex items-center gap-1.5 active:scale-95">
            <UploadCloud className="w-4 h-4 text-rose-400" />
            <span>Upload File CSV Database</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Master SKU List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Daftar Master SKU Daging ({skus.length} Item)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Data barang yang dapat dijadwalkan pada rencana produksi mingguan.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition"
          >
            <Plus className="w-4 h-4 text-rose-400" />
            <span>Tambah SKU Manual</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode SKU, nama daging, atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-rose-500 focus:outline-none"
          />
        </div>

        {/* SKU Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {filteredSkus.map((sku) => (
            <div
              key={sku.id}
              className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-start justify-between space-x-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {sku.sku_code}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">
                    {sku.category}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">
                    {sku.unit}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white mt-1 truncate">
                  {sku.name}
                </h3>
                {sku.specs && (
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {sku.specs}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Add SKU Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-rose-500" />
              Tambah Master SKU Daging Baru
            </h3>

            <form onSubmit={handleAddManualSKU} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Kode SKU
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BF-SL-005"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Daging Sirloin Slice 2mm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Kategori
                </label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value as ProductSKU['category'])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="Slice">Slice</option>
                  <option value="Mince/Giling">Mince/Giling</option>
                  <option value="Dicing/Saikoro">Dicing/Saikoro</option>
                  <option value="Steak Cut">Steak Cut</option>
                  <option value="Trimming">Trimming</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Spesifikasi / Kemasan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Tray 500g, Fat 30%"
                  value={newSpecs}
                  onChange={(e) => setNewSpecs(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  Simpan SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
