'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  WeeklyProductionPlan, 
  WeeklyTargetItem, 
  ProductSKU,
  AuthUser,
  MONTH_NAMES,
  getMonthName 
} from '@/types';
import { 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  CalendarDays, 
  Search, 
  Calendar,
  FileSpreadsheet,
  Download,
  Upload,
  X,
  AlertCircle,
  Copy,
  ShieldAlert,
  Check
} from 'lucide-react';
import { parseExcelFile, downloadExcelTemplate, exportPlanToExcel, exportMonthlyPlanToExcel, ExcelImportRow } from '@/lib/excelHelper';

interface WeeklyPlanManagerProps {
  plan: WeeklyProductionPlan;
  plans?: WeeklyProductionPlan[];
  skus: ProductSKU[];
  currentUser?: AuthUser | null;
  onSavePlan: (updatedPlan: WeeklyProductionPlan) => void;
  onSelectPlan?: (plan: WeeklyProductionPlan) => void;
}

function getEstimatedWeekDates(year: number, month: number, weekNum: number): { start: string; end: string } {
  const m = String(month).padStart(2, '0');
  const lastDayOfMonth = new Date(year, month, 0).getDate();

  let startDay = 1;
  let endDay = 7;

  if (weekNum === 1) {
    startDay = 1;
    endDay = 7;
  } else if (weekNum === 2) {
    startDay = 8;
    endDay = 14;
  } else if (weekNum === 3) {
    startDay = 15;
    endDay = 21;
  } else if (weekNum === 4) {
    startDay = 22;
    endDay = 28;
  } else if (weekNum === 5) {
    startDay = 29;
    endDay = lastDayOfMonth;
  }

  const start = `${year}-${m}-${String(startDay).padStart(2, '0')}`;
  const end = `${year}-${m}-${String(Math.min(endDay, lastDayOfMonth)).padStart(2, '0')}`;
  return { start, end };
}

function computePlanSnapshot(
  planId: string,
  title: string,
  start: string,
  end: string,
  notes: string,
  m: number,
  w: number,
  y: number,
  targets: WeeklyTargetItem[]
): string {
  return JSON.stringify({
    planId,
    title: (title || '').trim(),
    start: start || '',
    end: end || '',
    notes: (notes || '').trim(),
    m,
    w,
    y,
    targets: (targets || []).map(t => ({
      sku_id: t.sku_id,
      target_kg: Math.round((Number(t.target_kg) || 0) * 100) / 100,
    })).sort((a, b) => a.sku_id.localeCompare(b.sku_id)),
  });
}

export const WeeklyPlanManager: React.FC<WeeklyPlanManagerProps> = ({
  plan,
  plans = [],
  skus,
  currentUser,
  onSavePlan,
  onSelectPlan,
}) => {
  const isReadOnly = currentUser?.role === 'production';

  const initMonth = plan.month || Number(plan.start_date?.split('-')[1]) || 10;
  const initWeek = Number(plan.week_number) > 5 ? 1 : (Number(plan.week_number) || 1);
  const initYear = plan.year || 2026;
  const initTitle = `Week ${initWeek} - Plan Produksi ${getMonthName(initMonth)} ${initYear}`;

  const [currentPlanId, setCurrentPlanId] = useState(plan.id);
  const [month, setMonth] = useState<number>(initMonth);
  const [weekNumber, setWeekNumber] = useState<number>(initWeek);
  const [year, setYear] = useState<number>(initYear);
  const [title, setTitle] = useState(initTitle);
  const [startDate, setStartDate] = useState(plan.start_date);
  const [endDate, setEndDate] = useState(plan.end_date);
  const [notes, setNotes] = useState(plan.notes || '');
  const [targets, setTargets] = useState<WeeklyTargetItem[]>(plan.targets || []);

  // Snapshot for dirty state tracking
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>(() => {
    return computePlanSnapshot(
      plan.id,
      initTitle,
      plan.start_date,
      plan.end_date,
      plan.notes || '',
      initMonth,
      initWeek,
      initYear,
      plan.targets || []
    );
  });

  // Search & add new item state
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSkuToAdd, setSelectedSkuToAdd] = useState<ProductSKU | null>(null);
  const [newTargetKg, setNewTargetKg] = useState<string>('500');

  // Notification Toast State
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Perubahan rencana berhasil disimpan!');

  // Copy targets modal / selector
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<ExcelImportRow[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Compute current plan snapshot and dirty state
  const currentSnapshot = useMemo(() => {
    return computePlanSnapshot(
      currentPlanId,
      title,
      startDate,
      endDate,
      notes,
      month,
      weekNumber,
      year,
      targets
    );
  }, [currentPlanId, title, startDate, endDate, notes, month, weekNumber, year, targets]);

  const isDirty = currentSnapshot !== lastSavedSnapshot;

  // Jika ada pembaruan data targets dari server untuk plan yang sedang dibuka (dan form belum diedit user)
  useEffect(() => {
    if (!isDirty && currentPlanId) {
      const latest = plans.find(p => p.id === currentPlanId);
      if (latest && JSON.stringify(latest.targets) !== JSON.stringify(targets)) {
        setTargets(latest.targets || []);
        setTitle(latest.title);
        setStartDate(latest.start_date);
        setEndDate(latest.end_date);
        setNotes(latest.notes || '');
        setLastSavedSnapshot(
          computePlanSnapshot(
            latest.id,
            latest.title,
            latest.start_date,
            latest.end_date,
            latest.notes || '',
            month,
            weekNumber,
            year,
            latest.targets || []
          )
        );
      }
    }
  }, [plans, currentPlanId, isDirty, month, weekNumber, year, targets]);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  // Helper normalisasi judul ke format ringkas: Week X - Plan Produksi [Bulan] [Tahun]
  const formatStandardTitle = (w: number, m: number, y: number) => {
    return `Week ${w} - Plan Produksi ${getMonthName(m)} ${y}`;
  };

  // Handler pergantian periode (Bulan, Week 1-5, Tahun) dengan isolasi plan per minggu
  const handlePeriodChange = (newMonth: number, newWeek: number, newYear: number) => {
    setMonth(newMonth);
    setWeekNumber(newWeek);
    setYear(newYear);

    const est = getEstimatedWeekDates(newYear, newMonth, newWeek);
    setStartDate(est.start);
    setEndDate(est.end);
    const defaultTitle = formatStandardTitle(newWeek, newMonth, newYear);
    setTitle(defaultTitle);

    // Cari apakah sudah ada plan di database untuk periode (year, month, week_number) ini
    const existing = plans.find(
      (p) =>
        p.year === newYear &&
        (p.month || Number(p.start_date.split('-')[1])) === newMonth &&
        p.week_number === newWeek
    );

    if (existing) {
      // Muat data plan tersebut beserta target produk miliknya
      setCurrentPlanId(existing.id);
      setTitle(defaultTitle);
      setStartDate(existing.start_date || est.start);
      setEndDate(existing.end_date || est.end);
      setTargets(existing.targets || []);
      setNotes(existing.notes || '');
      setLastSavedSnapshot(
        computePlanSnapshot(
          existing.id,
          defaultTitle,
          existing.start_date || est.start,
          existing.end_date || est.end,
          existing.notes || '',
          newMonth,
          newWeek,
          newYear,
          existing.targets || []
        )
      );
    } else {
      // Periode baru: ID baru dan target bersih (kosong) agar produk dari minggu sebelumnya tidak menempel
      const newId = `plan-m${newMonth}-w${newWeek}-${newYear}-${Date.now().toString(36).substr(2, 4)}`;
      setCurrentPlanId(newId);
      setTargets([]);
      setNotes('');
      setLastSavedSnapshot(
        computePlanSnapshot(
          newId,
          defaultTitle,
          est.start,
          est.end,
          '',
          newMonth,
          newWeek,
          newYear,
          []
        )
      );
    }
  };


  // Salin target dari plan lain
  const handleCopyTargetsFrom = (sourcePlanId: string) => {
    const source = plans.find(p => p.id === sourcePlanId);
    if (!source || !source.targets) return;

    setTargets([...source.targets]);
    setIsCopyModalOpen(false);
    showNotification(`Berhasil menyalin ${source.targets.length} target barang dari ${source.title}!`);
  };

  // Export Target Plan Pekan Ini ke Excel
  const handleExportCurrentWeek = () => {
    if (!targets || targets.length === 0) {
      alert(`Tidak ada target barang pada Week ${weekNumber} untuk diexport.`);
      return;
    }
    const currentPlan: WeeklyProductionPlan = {
      id: currentPlanId,
      title,
      week_number: Number(weekNumber),
      month: Number(month),
      year: Number(year),
      start_date: startDate,
      end_date: endDate,
      notes,
      targets,
      status: 'active',
    };
    exportPlanToExcel(currentPlan);
    setIsExportModalOpen(false);
    showNotification(`File Excel target Week ${weekNumber} berhasil diunduh!`);
  };

  // Export Rekap Target Plan 1 Bulan Penuh (W1 - W5) ke Excel
  const handleExportFullMonth = () => {
    try {
      const currentPlan: WeeklyProductionPlan = {
        id: currentPlanId,
        title,
        week_number: Number(weekNumber),
        month: Number(month),
        year: Number(year),
        start_date: startDate,
        end_date: endDate,
        notes,
        targets,
        status: 'active',
      };

      const combinedPlans = [...plans];
      const idx = combinedPlans.findIndex(p => p.id === currentPlanId);
      if (idx >= 0) {
        combinedPlans[idx] = currentPlan;
      } else {
        combinedPlans.push(currentPlan);
      }

      exportMonthlyPlanToExcel(Number(month), Number(year), combinedPlans);
      setIsExportModalOpen(false);
      showNotification(`File Excel target bulanan ${getMonthName(month)} ${year} berhasil diunduh!`);
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor data bulanan ke Excel.');
    }
  };

  // Total target
  const totalTargetKg = targets.reduce((sum, item) => sum + (item.target_kg || 0), 0);

  // Filter unassigned SKUs matching query
  const targetIdSet = useMemo(() => new Set(targets.map(t => t.sku_id)), [targets]);

  const filteredAvailableSkus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return skus
      .filter(s => !targetIdSet.has(s.id))
      .filter(s => !q || s.name.toLowerCase().includes(q) || s.sku_code.toLowerCase().includes(q))
      .slice(0, 60);
  }, [skus, targetIdSet, searchQuery]);

  // Handle target kg change for existing item
  const handleUpdateTargetKg = (skuId: string, val: number) => {
    if (isReadOnly) return;
    const updated = targets.map((t) => {
      if (t.sku_id === skuId) {
        return {
          ...t,
          target_kg: isNaN(val) ? 0 : val,
        };
      }
      return t;
    });
    setTargets(updated);
  };

  // Remove SKU from targets
  const handleRemoveTarget = (skuId: string) => {
    if (isReadOnly) return;
    const updatedTargets = targets.filter(t => t.sku_id !== skuId);
    setTargets(updatedTargets);
    showNotification('Item berhasil dihapus dari target mingguan!');
  };

  // Add new SKU to target list
  const handleAddTarget = () => {
    if (isReadOnly || !selectedSkuToAdd) {
      alert('Pilih barang terlebih dahulu.');
      return;
    }

    const kg = parseFloat(newTargetKg) || 100;

    const newItem: WeeklyTargetItem = {
      sku_id: selectedSkuToAdd.id,
      sku_code: selectedSkuToAdd.sku_code,
      sku_name: selectedSkuToAdd.name,
      category: selectedSkuToAdd.category,
      target_kg: kg,
    };

    const updatedTargets = [...targets, newItem];
    setTargets(updatedTargets);
    setSelectedSkuToAdd(null);
    setSearchQuery('');
    setNewTargetKg('500');
    showNotification(`Barang ${newItem.sku_name} ditambahkan ke target!`);
  };

  // Save Plan
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !isDirty) return;

    const finalTitle = formatStandardTitle(Number(weekNumber), Number(month), Number(year));
    const updatedPlan: WeeklyProductionPlan = {
      id: currentPlanId,
      title: finalTitle,
      week_number: Number(weekNumber),
      month: Number(month),
      year: Number(year),
      start_date: startDate,
      end_date: endDate,
      notes,
      targets,
      status: 'active',
    };

    onSavePlan(updatedPlan);
    setLastSavedSnapshot(
      computePlanSnapshot(
        currentPlanId,
        finalTitle,
        startDate,
        endDate,
        notes,
        month,
        weekNumber,
        year,
        targets
      )
    );
    showNotification(`Rencana ${finalTitle} berhasil disimpan!`);
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
      setImportError(err.message || 'Gagal memproses file Excel.');
      setImportRows([]);
    } finally {
      setIsParsingExcel(false);
    }
  };

  // Apply Excel Import to Targets
  const handleApplyExcelImport = () => {
    const validRows = importRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('Tidak ada baris data yang valid untuk diimpor.');
      return;
    }

    const importedTargets: WeeklyTargetItem[] = validRows.map(r => ({
      sku_id: r.matchedSku ? r.matchedSku.id : `sku-import-${r.sku.toLowerCase()}`,
      sku_code: r.sku,
      sku_name: r.name,
      category: r.matchedSku ? r.matchedSku.category : 'Umum',
      target_kg: r.qty,
    }));

    let mergedTargets: WeeklyTargetItem[] = [];
    if (importMode === 'replace') {
      mergedTargets = importedTargets;
    } else {
      // Append mode: update target_kg if already exists or add new
      const map = new Map<string, WeeklyTargetItem>();
      targets.forEach(t => map.set(t.sku_code.toLowerCase(), { ...t }));
      importedTargets.forEach(t => {
        const key = t.sku_code.toLowerCase();
        if (map.has(key)) {
          map.get(key)!.target_kg = t.target_kg;
        } else {
          map.set(key, t);
        }
      });
      mergedTargets = Array.from(map.values());
    }

    setTargets(mergedTargets);

    const updatedPlan: WeeklyProductionPlan = {
      id: currentPlanId,
      title,
      week_number: Number(weekNumber),
      month: Number(month),
      year: Number(year),
      start_date: startDate,
      end_date: endDate,
      notes,
      targets: mergedTargets,
      status: 'active',
    };
    onSavePlan(updatedPlan);
    setLastSavedSnapshot(
      computePlanSnapshot(
        currentPlanId,
        title,
        startDate,
        endDate,
        notes,
        month,
        weekNumber,
        year,
        mergedTargets
      )
    );

    setIsImportModalOpen(false);
    setImportFile(null);
    setImportRows([]);
    showNotification(`Berhasil mengimpor ${validRows.length} target barang dari Excel!`);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Floating Bottom Toast Notification */}
      {savedSuccess && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 border border-emerald-400 text-white rounded-2xl px-5 py-3.5 shadow-2xl flex items-center space-x-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base @min-[640px]:text-lg font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-rose-500" />
            {isReadOnly ? 'Target Kebutuhan Produksi Pekan Ini' : 'Perencanaan Produksi Mingguan'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isReadOnly 
              ? 'Daftar kebutuhan target barang (Kg) yang harus diproduksi oleh tim lapangan pekan ini.'
              : 'Atur kuota target mingguan (Kg) per jenis barang/SKU dari database master.'}
          </p>
        </div>

        {isReadOnly ? (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Unduh target kebutuhan ke Excel"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>Mode Tinjau (Tim Produksi)</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="Unduh target rencana ke Excel"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Excel</span>
            </button>
          </div>
        )}
      </div>


      {/* Plan Configuration Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-rose-400" />
              Periode Bulan Kebutuhan & Minggu
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
              {getMonthName(month)} {year} • W{weekNumber}
            </span>
          </div>

          {/* Row 1: Bulan Kebutuhan & Tahun */}
          <div className="grid grid-cols-1 @min-[640px]:grid-cols-3 gap-3">
            <div className="@min-[640px]:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bulan Kebutuhan
              </label>
              <select
                value={month}
                onChange={(e) => handlePeriodChange(Number(e.target.value), weekNumber, year)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((mName, idx) => (
                  <option key={mName} value={idx + 1}>
                    {mName} (Bulan {idx + 1})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tahun
              </label>
              <select
                value={year}
                onChange={(e) => handlePeriodChange(month, weekNumber, Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none cursor-pointer"
              >
                {[2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Pilihan Week 1 - 5 */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Pilihan Minggu Produksi (Week 1 - 5)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((w) => {
                const isSelected = weekNumber === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => handlePeriodChange(month, w, year)}
                    className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>Week {w}</span>
                    <span className="text-[10px] font-normal opacity-80">Minggu {w}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Judul & Rentang Tanggal */}
          <div className="grid grid-cols-1 @min-[640px]:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Judul Rencana</span>
                <span className="text-[10px] text-rose-400 font-medium">Pilih Week 1 - 5</span>
              </label>
              <select
                disabled={isReadOnly}
                value={weekNumber}
                onChange={(e) => {
                  const newW = Number(e.target.value);
                  handlePeriodChange(month, newW, year);
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none cursor-pointer disabled:opacity-70"
              >
                {[1, 2, 3, 4, 5].map((w) => (
                  <option key={w} value={w}>
                    Week {w} - Plan Produksi {getMonthName(month)} {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Mulai
                </label>
                <input
                  type="date"
                  disabled={isReadOnly}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-70"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Selesai
                </label>
                <input
                  type="date"
                  disabled={isReadOnly}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none disabled:opacity-70"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Tambah Target Barang (Hanya Admin) */}
        {!isReadOnly && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                + Tambah Barang ke Target Pekan Ini
              </h2>
              {targets.length === 0 && plans.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsCopyModalOpen(true)}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Target dari Pekan Lain</span>
                </button>
              )}
            </div>

            <div>
              {selectedSkuToAdd ? (
                <div className="bg-slate-950 border border-rose-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                        {selectedSkuToAdd.sku_code}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {selectedSkuToAdd.category}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white mt-1">
                      {selectedSkuToAdd.name}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="1"
                        step="10"
                        value={newTargetKg}
                        onChange={(e) => setNewTargetKg(e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white text-right focus:outline-none"
                        placeholder="500"
                      />
                      <span className="text-xs text-slate-400 font-medium">Kg</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTarget}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Tambahkan
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSkuToAdd(null)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                    <Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Ketik kode SKU atau nama barang untuk menambahkan..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  {/* Dropdown Menu SKU Autocomplete */}
                  {isDropdownOpen && (
                    <div 
                      style={{ backgroundColor: '#050505', borderColor: '#1e293b' }}
                      className="absolute z-30 left-0 right-0 top-full mt-1 border rounded-xl shadow-2xl max-h-56 overflow-y-auto"
                    >
                      {filteredAvailableSkus.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center">
                          Tidak ada barang yang cocok atau barang sudah ada di daftar target pekan ini.
                        </div>
                      ) : (
                        filteredAvailableSkus.map((sku) => (
                          <button
                            type="button"
                            key={sku.id}
                            onClick={() => {
                              setSelectedSkuToAdd(sku);
                              setIsDropdownOpen(false);
                            }}
                            style={{ borderBottom: '1px solid #111827' }}
                            className="w-full text-left p-2.5 hover:bg-slate-900 transition flex items-center justify-between group active:bg-slate-800 last:border-b-0 cursor-pointer"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center space-x-1.5">
                                <span 
                                  style={{ backgroundColor: '#000000', borderColor: '#1e293b' }}
                                  className="text-[10px] font-mono px-1 py-0.5 rounded text-slate-400 border"
                                >
                                  {sku.sku_code}
                                </span>
                                <span 
                                  style={{ backgroundColor: '#000000', borderColor: '#1e293b' }}
                                  className="text-[10px] px-1.5 py-0.5 rounded text-slate-400 border"
                                >
                                  {sku.category}
                                </span>
                                {sku.specs && (
                                  <span className="text-[10px] text-slate-500 truncate">
                                    {sku.specs}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-slate-200 group-hover:text-white mt-1 truncate">
                                {sku.name}
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
          </div>
        )}

        {/* Targets Table / List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Daftar Target Item</span>
                <span className="text-rose-400 font-mono">({targets.length} Item)</span>
              </h2>
              {targets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Export target rencana ke file Excel"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
              )}
            </div>
            <div className="text-xs text-slate-400">
              Total Target: <strong className="text-white text-sm">{totalTargetKg.toLocaleString('id-ID')} Kg</strong>
            </div>
          </div>

          {targets.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
              <CalendarDays className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">
                Belum ada target barang pada minggu ini.
              </p>
              {!isReadOnly && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Ketik nama barang di atas, import file Excel, atau salin dari pekan lain.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {targets.map((item) => (
                <div
                  key={item.sku_id}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                        {item.sku_code}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {item.category}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-white mt-1.5 truncate">
                      {item.sku_name}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {isReadOnly ? (
                      <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-right">
                        <span className="text-xs font-black text-rose-400">
                          {item.target_kg.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">Kg</span>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <input
                            type="number"
                            step="10"
                            value={item.target_kg}
                            onChange={(e) => handleUpdateTargetKg(item.sku_id, parseFloat(e.target.value))}
                            className="w-24 bg-slate-900 border border-slate-800 focus:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white text-right focus:outline-none focus:ring-0"
                          />
                          <span className="text-[10px] text-slate-500 ml-1">Kg</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveTarget(item.sku_id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                          title="Hapus dari target minggu ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Save Button (Hanya Admin) */}
        {!isReadOnly && (
          <button
            type="submit"
            disabled={!isDirty}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center space-x-2 ${
              isDirty
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-rose-950/40 active:scale-[0.98] cursor-pointer'
                : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            {isDirty ? (
              <>
                <Save className="w-4 h-4 text-white" />
                <span>Simpan & Terapkan Rencana Mingguan</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
                <span>Rencana Tersimpan (Tidak Ada Perubahan)</span>
              </>
            )}
          </button>
        )}
      </form>

      {/* Modal Import Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Import Target Plan dari Excel</h3>
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
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Format Kolom Template:</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">sku • nama barang • qty KG</p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadExcelTemplate('plan', skus)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Unduh Template</span>
                </button>
              </div>

              {/* Upload Input */}
              <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-4 text-center bg-slate-950/60 transition">
                <input
                  type="file"
                  id="excelFileInput"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="excelFileInput"
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

                  {/* Mode Import */}
                  <div className="pt-2 flex items-center space-x-4 text-xs text-slate-300">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="text-rose-600 focus:ring-0"
                      />
                      <span>Tambahkan ke daftar</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-rose-600 focus:ring-0"
                      />
                      <span>Gantikan daftar saat ini</span>
                    </label>
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
                onClick={handleApplyExcelImport}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-950/40"
              >
                <Check className="w-4 h-4" />
                <span>Terapkan ke Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Salin Target dari Pekan Lain */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Copy className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold text-white">Salin Target dari Pekan Lain</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Pilih rencana produksi yang ingin disalin target produk dan kuota Kg-nya ke minggu ini:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {plans
                .filter(p => p.id !== currentPlanId && p.targets && p.targets.length > 0)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleCopyTargetsFrom(p.id)}
                    className="w-full text-left p-3 rounded-xl border border-slate-800 hover:border-rose-500/50 bg-slate-950 hover:bg-slate-900 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-rose-400">
                        {p.title}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {p.targets.length} Item SKU • {p.targets.reduce((acc, t) => acc + (t.target_kg || 0), 0).toLocaleString('id-ID')} Kg
                      </p>
                    </div>
                    <Copy className="w-4 h-4 text-slate-600 group-hover:text-rose-400 shrink-0" />
                  </button>
                ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pilihan Export Plan Excel (Pekan Ini vs 1 Bulan Penuh) */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Export Target Rencana ke Excel</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Pilih cakupan data rencana produksi yang ingin Anda unduh ke dalam format Excel (.xlsx):
            </p>

            <div className="space-y-3">
              {/* Opsi 1: Export Minggu Ini */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-white">Rencana Pekan Ini (Week {weekNumber})</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                    W{weekNumber} • {getMonthName(month)} {year}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Target produksi khusus minggu ke-{weekNumber} ({targets.length} SKU, {totalTargetKg.toLocaleString('id-ID')} Kg).
                </p>
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleExportCurrentWeek}
                    disabled={targets.length === 0}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Week {weekNumber}</span>
                  </button>
                </div>
              </div>

              {/* Opsi 2: Export 1 Bulan Penuh */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Rencana 1 Bulan Penuh ({getMonthName(month)} {year})</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    Rekap W1 - W5
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Rekapitulasi target seluruh pekan (Week 1 s/d Week 5) dalam 1 tabel master plus lembar kerja per pekan.
                </p>
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleExportFullMonth}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Unduh Rekap 1 Bulan Penuh</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
