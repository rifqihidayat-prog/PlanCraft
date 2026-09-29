'use client';

import React, { useState, useMemo } from 'react';
import { 
  WeeklyProductionPlan, 
  DailyProductionLog, 
  ProductSKU,
  AuthUser 
} from '@/types';
import { formatKg, formatPercent } from '@/lib/storage';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Scale, 
  Trash2, 
  Clock, 
  AlertCircle,
  Search,
  Plus,
  X,
  Calendar,
  Lock,
  FileSpreadsheet,
  Download,
  Upload,
  ChevronDown,
  Check,
  Layers,
  Target
} from 'lucide-react';
import { parseExcelFile, downloadExcelTemplate, ExcelImportRow } from '@/lib/excelHelper';

interface QuickInputFormProps {
  plan: WeeklyProductionPlan;
  skus: ProductSKU[];
  logs: DailyProductionLog[];
  currentUser?: AuthUser | null;
  onSaveLog: (log: Omit<DailyProductionLog, 'id' | 'created_at'>) => void;
  onDeleteLog: (id: string) => void;
}

const COMMON_BOTTLENECK_TAGS = [
  'Normal / Lancar',
  'Thawing Lambat',
  'Pisau Slicer Tumpul',
  'Daging Keras / Beku Solid',
  'Tray / Plastik Habis',
  'Mesin Sealer Trouble',
  'Bahan Baku Tertunda',
];

export const QuickInputForm: React.FC<QuickInputFormProps> = ({
  plan,
  skus,
  logs,
  currentUser,
  onSaveLog,
  onDeleteLog,
}) => {
  // Helper tanggal lokal sistem (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  // Default selected SKU from first target
  const [selectedSku, setSelectedSku] = useState<{
    id: string;
    code: string;
    name: string;
    targetKg?: number;
  } | null>(() => {
    if (plan.targets && plan.targets.length > 0) {
      const t = plan.targets[0];
      return {
        id: t.sku_id,
        code: t.sku_code,
        name: t.sku_name,
        targetKg: t.target_kg,
      };
    }
    return null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [date, setDate] = useState<string>(todayStr);
  const [actualKg, setActualKg] = useState<string>('');
  const [bottleneck, setBottleneck] = useState<string>('Normal / Lancar');
  const [notes, setNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Widget Target Kebutuhan drawer state
  const [isTargetDrawerOpen, setIsTargetDrawerOpen] = useState(false);

  // Modal Import Excel state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<ExcelImportRow[]>([]);
  const [importDate, setImportDate] = useState<string>(todayStr);
  const [importBottleneck, setImportBottleneck] = useState<string>('Normal / Lancar');
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Jika akun produksi: tanggal dikunci ke todayStr. Jika admin: bebas pilih tanggal.
  const effectiveDate = isAdmin ? date : todayStr;
  const effectiveImportDate = isAdmin ? importDate : todayStr;

  // History tab filter: 'all' = all dates, 'selected' = only selected date
  const [historyFilter, setHistoryFilter] = useState<'all' | 'selected'>('all');

  // Total target Kg in active plan
  const planTotalTargetKg = useMemo(() => {
    return (plan.targets || []).reduce((acc, t) => acc + (t.target_kg || 0), 0);
  }, [plan]);

  // Actual produced per target in current plan
  const targetActualMap = useMemo(() => {
    const map = new Map<string, number>();
    const planLogs = logs.filter(l => l.plan_id === plan.id);
    planLogs.forEach(l => {
      const current = map.get(l.sku_id) || 0;
      map.set(l.sku_id, current + l.actual_kg);
    });
    return map;
  }, [logs, plan.id]);

  // Filtered SKUs for autocomplete
  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    // First: Plan targets
    const inPlan = (plan.targets || [])
      .filter(t => !query || t.sku_name.toLowerCase().includes(query) || t.sku_code.toLowerCase().includes(query))
      .map(t => ({
        id: t.sku_id,
        code: t.sku_code,
        name: t.sku_name,
        category: t.category,
        isInPlan: true,
        targetKg: t.target_kg,
      }));

    // Second: Other Master SKUs not in plan
    const inPlanIds = new Set((plan.targets || []).map(t => t.sku_id));
    const notInPlan = skus
      .filter(s => !inPlanIds.has(s.id))
      .filter(s => !query || s.name.toLowerCase().includes(query) || s.sku_code.toLowerCase().includes(query))
      .map(s => ({
        id: s.id,
        code: s.sku_code,
        name: s.name,
        category: s.category,
        isInPlan: false,
        targetKg: undefined,
      }));

    return [...inPlan, ...notInPlan].slice(0, 50);
  }, [plan, skus, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSku) {
      alert('Pilih SKU / nama barang terlebih dahulu.');
      return;
    }

    const kg = parseFloat(actualKg);
    if (isNaN(kg) || kg <= 0) {
      alert('Masukkan total berat hasil jadi (Kg) yang valid.');
      return;
    }

    onSaveLog({
      plan_id: plan.id,
      sku_id: selectedSku.id,
      sku_code: selectedSku.code,
      sku_name: selectedSku.name,
      date: effectiveDate,
      actual_kg: Math.round(kg * 10) / 10,
      bottleneck_reason: bottleneck,
      notes: notes.trim() || undefined,
    });

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#f43f5e', '#10b981', '#fbbf24']
    });

    setSuccessMsg(`Hasil produksi ${formatKg(kg)} Kg untuk ${selectedSku.name} berhasil disimpan!`);
    setActualKg('');
    setNotes('');

    setTimeout(() => {
      setSuccessMsg(null);
    }, 3500);
  };

  // Excel Import File Selection & Parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsParsingExcel(true);
    setImportError(null);

    try {
      const rows = await parseExcelFile(file, skus);
      setImportRows(rows);
    } catch (err: any) {
      setImportError(err.message || 'Gagal membaca file Excel.');
      setImportRows([]);
    } finally {
      setIsParsingExcel(false);
    }
  };

  // Apply Batch Excel Production Logs
  const handleApplyExcelLogs = () => {
    const validRows = importRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('Tidak ada baris data hasil produksi yang valid.');
      return;
    }

    let savedCount = 0;
    validRows.forEach(row => {
      onSaveLog({
        plan_id: plan.id,
        sku_id: row.matchedSku ? row.matchedSku.id : `sku-${row.sku.toLowerCase()}`,
        sku_code: row.sku,
        sku_name: row.name,
        date: effectiveImportDate,
        actual_kg: row.qty,
        bottleneck_reason: importBottleneck,
        notes: 'Import Excel Batch',
      });
      savedCount++;
    });

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#10b981', '#3b82f6', '#f59e0b']
    });

    setIsImportModalOpen(false);
    setImportFile(null);
    setImportRows([]);
    setSuccessMsg(`Berhasil mengimpor ${savedCount} entri hasil produksi dari Excel!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const displayedLogs = useMemo(() => {
    if (historyFilter === 'selected') {
      return logs.filter(l => l.date === effectiveDate);
    }
    return logs;
  }, [logs, historyFilter, effectiveDate]);

  return (
    <div className="space-y-4 pb-24">
      {/* Title Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base @min-[640px]:text-lg font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-rose-500" />
            Input Hasil Produksi Jadi
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pilih barang/SKU, lalu masukkan total berat hasil jadi (Kg) yang ditimbang.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsImportModalOpen(true)}
          className="px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-emerald-950/40 cursor-pointer self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Import Excel Hasil</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl p-3.5 flex items-center space-x-2 text-xs font-semibold animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Target Kebutuhan Pekan Ini (Collapsible Widget) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsTargetDrawerOpen(!isTargetDrawerOpen)}
          className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition text-left cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <Target className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Target Kebutuhan Pekan Ini (W{plan.week_number})</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-mono font-bold">
                  {(plan.targets || []).length} Item
                </span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Total Kuota: <strong className="text-white">{planTotalTargetKg.toLocaleString('id-ID')} Kg</strong> • Klik untuk melihat rincian barang
              </p>
            </div>
          </div>

          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isTargetDrawerOpen ? 'rotate-180 text-rose-400' : ''}`} />
        </button>

        {isTargetDrawerOpen && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/70 space-y-2">
            {(plan.targets || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                Belum ada target barang yang direncanakan untuk pekan ini.
              </p>
            ) : (
              (plan.targets || []).map((target) => {
                const actual = targetActualMap.get(target.sku_id) || 0;
                const pct = target.target_kg > 0 ? (actual / target.target_kg) * 100 : 0;
                const isFinished = pct >= 100;

                return (
                  <div
                    key={target.sku_id}
                    className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          {target.sku_code}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {target.category}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white mt-1 truncate">
                        {target.sku_name}
                      </p>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                        <span>Target: <strong className="text-slate-200">{formatKg(target.target_kg)} Kg</strong></span>
                        <span>•</span>
                        <span>Realisasi: <strong className={isFinished ? 'text-emerald-400' : 'text-slate-200'}>{formatKg(actual)} Kg</strong></span>
                        <span>({formatPercent(pct)})</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSku({
                          id: target.sku_id,
                          code: target.sku_code,
                          name: target.sku_name,
                          targetKg: target.target_kg,
                        });
                        setIsTargetDrawerOpen(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-[11px] font-bold border border-rose-500/30 transition shrink-0 cursor-pointer"
                    >
                      Pilih Item
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 @min-[640px]:p-5 shadow-lg space-y-4">
        {/* Date Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Tanggal Produksi
            </label>
            {isAdmin ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Admin: Bebas Pilih Tanggal
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Terkunci (Hari Ini)
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => {
                if (isAdmin) {
                  setDate(e.target.value);
                }
              }}
              readOnly={!isAdmin}
              disabled={!isAdmin}
              className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition ${
                !isAdmin ? 'cursor-not-allowed opacity-80' : 'focus:border-slate-700'
              }`}
            />
            {!isAdmin && (
              <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        {/* SKU Selector / Autocomplete */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Nama Barang / SKU
          </label>

          {selectedSku ? (
            <div className="bg-slate-950 border border-rose-500/40 rounded-xl p-3 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                    {selectedSku.code}
                  </span>
                  {selectedSku.targetKg && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Target: {formatKg(selectedSku.targetKg)} Kg
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-bold text-white mt-1 truncate">
                  {selectedSku.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSku(null);
                  setSearchQuery('');
                }}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
                <Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Ketik kode SKU atau nama barang..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              {isDropdownOpen && (
                <div 
                  style={{ backgroundColor: '#050505', borderColor: '#1e293b' }}
                  className="absolute z-30 left-0 right-0 top-full mt-1 border rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-900"
                >
                  {filteredOptions.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">
                      Tidak ada barang yang cocok.
                    </div>
                  ) : (
                    filteredOptions.map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => {
                          setSelectedSku({
                            id: opt.id,
                            code: opt.code,
                            name: opt.name,
                            targetKg: opt.targetKg,
                          });
                          setIsDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left p-2.5 hover:bg-slate-900 transition flex items-center justify-between group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                              {opt.code}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                              {opt.category}
                            </span>
                            {opt.isInPlan && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                Target Plan W{plan.week_number}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-200 group-hover:text-white mt-1 truncate">
                            {opt.name}
                          </p>
                        </div>
                        <Plus className="w-4 h-4 text-slate-600 group-hover:text-rose-400 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Berat Hasil Jadi (Kg) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Total Berat Hasil Jadi (Kg)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0.1"
              placeholder="0.0"
              value={actualKg}
              onChange={(e) => setActualKg(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-emerald-400 placeholder-slate-600 focus:outline-none"
            />
            <span className="absolute right-4 top-3.5 text-xs text-slate-500 font-bold">
              Kg
            </span>
          </div>
        </div>

        {/* Catatan Kendala */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Status Kendala / Catatan Shift
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
            {COMMON_BOTTLENECK_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => setBottleneck(tag)}
                className={`py-1.5 px-2 text-left text-[11px] rounded-lg border transition truncate cursor-pointer ${
                  bottleneck === tag
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Catatan tambahan (opsional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-950/40 active:scale-[0.98] transition flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Simpan Hasil Produksi</span>
        </button>
      </form>

      {/* History Log Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-rose-500" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Riwayat Hasil Jadi
            </h2>
          </div>

          {/* Filter Riwayat */}
          <div className="flex items-center space-x-1 text-[11px] bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setHistoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                historyFilter === 'all'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setHistoryFilter('selected')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                historyFilter === 'selected'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tanggal Ini
            </button>
          </div>
        </div>

        {displayedLogs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            Belum ada riwayat hasil produksi yang tercatat.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {displayedLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      {log.sku_code}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5 text-rose-400" />
                      {log.date}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white mt-1 truncate">
                    {log.sku_name}
                  </h3>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-0.5">
                    <span>
                      Hasil Jadi: <strong className="text-emerald-400 font-bold">{formatKg(log.actual_kg)} Kg</strong>
                    </span>
                  </div>
                  {log.bottleneck_reason && log.bottleneck_reason !== 'Normal / Lancar' && (
                    <div className="mt-1 text-[10px] text-rose-400">
                      Kendala: {log.bottleneck_reason}
                    </div>
                  )}
                  {log.notes && (
                    <p className="text-[10px] text-slate-500 mt-0.5 italic truncate">
                      &ldquo;{log.notes}&rdquo;
                    </p>
                  )}
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Hapus catatan ${log.sku_name} (${log.actual_kg} Kg pada ${log.date})?`)) {
                        onDeleteLog(log.id);
                      }
                    }}
                    title="Hapus entri ini (Admin)"
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Import Excel Hasil Jadi */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Import Hasil Produksi dari Excel</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {/* Template Info & Download */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Format Kolom Template:</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">sku • nama barang • qty KG</p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadExcelTemplate('production', skus)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Unduh Template</span>
                </button>
              </div>

              {/* Tanggal Hasil Produksi untuk batch import */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Tanggal Hasil Produksi
                  </label>
                  <input
                    type="date"
                    value={effectiveImportDate}
                    disabled={!isAdmin}
                    readOnly={!isAdmin}
                    onChange={(e) => {
                      if (isAdmin) setImportDate(e.target.value);
                    }}
                    className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none ${
                      !isAdmin ? 'opacity-70 cursor-not-allowed' : 'focus:border-slate-700'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Status Kendala / Catatan
                  </label>
                  <select
                    value={importBottleneck}
                    onChange={(e) => setImportBottleneck(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    {COMMON_BOTTLENECK_TAGS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Input */}
              <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-4 text-center bg-slate-950/60 transition">
                <input
                  type="file"
                  id="excelImportProdInput"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="excelImportProdInput"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <Upload className="w-7 h-7 text-emerald-400" />
                  <span className="text-xs font-bold text-white">
                    {importFile ? importFile.name : 'Pilih File Excel (.xlsx, .xls, .csv)'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Klik untuk memilih atau drag and drop file di sini
                  </span>
                </label>
              </div>

              {importError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Preview Parsed Rows */}
              {importRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">
                      Preview Data ({importRows.filter(r => r.isValid).length} baris valid)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Total: {importRows.reduce((acc, r) => acc + (r.isValid ? r.qty : 0), 0).toLocaleString('id-ID')} Kg
                    </span>
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/60 bg-slate-950">
                    {importRows.map((row, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-mono text-[10px] text-rose-400 font-bold mr-1.5">
                            {row.sku}
                          </span>
                          <span className="text-white font-medium text-[11px] truncate">
                            {row.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          {row.isValid ? (
                            <span className="font-bold text-emerald-400 font-mono">
                              {row.qty} Kg
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-400 font-semibold">
                              {row.errorMessage || 'Invalid'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={importRows.filter(r => r.isValid).length === 0}
                onClick={handleApplyExcelLogs}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-950/40"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Entri Hasil Jadi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
