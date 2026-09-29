'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  WeeklyProductionPlan, 
  ProductSKU, 
  WeeklyTargetItem,
  MONTH_NAMES,
  getMonthName
} from '@/types';
import { formatKg } from '@/lib/storage';
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Search, 
  X,
  Calendar,
  Layers
} from 'lucide-react';

interface WeeklyPlanManagerProps {
  plan: WeeklyProductionPlan;
  plans?: WeeklyProductionPlan[];
  skus: ProductSKU[];
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

export const WeeklyPlanManager: React.FC<WeeklyPlanManagerProps> = ({
  plan,
  plans,
  skus,
  onSavePlan,
  onSelectPlan,
}) => {
  const [currentPlanId, setCurrentPlanId] = useState(plan.id);
  const [month, setMonth] = useState<number>(() => {
    return plan.month || Number(plan.start_date?.split('-')[1]) || 10;
  });
  const [weekNumber, setWeekNumber] = useState<number>(() => {
    const w = Number(plan.week_number);
    return w > 5 ? 1 : (w || 1);
  });
  const [year, setYear] = useState<number>(plan.year || 2026);
  const [title, setTitle] = useState(plan.title);
  const [startDate, setStartDate] = useState(plan.start_date);
  const [endDate, setEndDate] = useState(plan.end_date);
  const [notes, setNotes] = useState(plan.notes || '');
  const [targets, setTargets] = useState<WeeklyTargetItem[]>(plan.targets);

  // Search & add new item state
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSkuToAdd, setSelectedSkuToAdd] = useState<ProductSKU | null>(null);
  const [newTargetKg, setNewTargetKg] = useState<string>('500');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Perubahan rencana berhasil disimpan!');

  // Sync state saat plan aktif berubah
  useEffect(() => {
    setCurrentPlanId(plan.id);
    const pMonth = plan.month || Number(plan.start_date?.split('-')[1]) || 10;
    const pWeek = Number(plan.week_number) > 5 ? 1 : (Number(plan.week_number) || 1);
    setMonth(pMonth);
    setWeekNumber(pWeek);
    setYear(plan.year || 2026);
    setTitle(plan.title);
    setStartDate(plan.start_date);
    setEndDate(plan.end_date);
    setNotes(plan.notes || '');
    setTargets(plan.targets);
  }, [plan.id, plan.targets, plan.title, plan.week_number, plan.month, plan.year, plan.start_date, plan.end_date, plan.notes]);

  // Handler pergantian periode (Bulan, Week 1-5, Tahun) dengan estimasi tanggal otomatis
  const handlePeriodChange = (newMonth: number, newWeek: number, newYear: number) => {
    setMonth(newMonth);
    setWeekNumber(newWeek);
    setYear(newYear);

    const est = getEstimatedWeekDates(newYear, newMonth, newWeek);
    setStartDate(est.start);
    setEndDate(est.end);
    setTitle(`Plan Produksi Minggu Ke-${newWeek} (${getMonthName(newMonth)} ${newYear})`);
  };

  // Buat plan baru untuk periode yang dipilih
  const handleCreateNewPlan = () => {
    const newId = `plan-m${month}-w${weekNumber}-${year}-${Date.now().toString(36).substr(2, 4)}`;
    const est = getEstimatedWeekDates(year, month, weekNumber);
    const newPlan: WeeklyProductionPlan = {
      id: newId,
      title: `Plan Produksi Minggu Ke-${weekNumber} (${getMonthName(month)} ${year})`,
      week_number: weekNumber,
      month: month,
      year: year,
      start_date: est.start,
      end_date: est.end,
      status: 'active',
      notes: '',
      targets: [],
    };
    onSavePlan(newPlan);
    if (onSelectPlan) onSelectPlan(newPlan);
    setSuccessMessage(`Plan baru untuk ${getMonthName(month)} ${year} (Minggu ${weekNumber}) berhasil dibuat!`);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
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

  // Remove SKU from targets and persist immediately
  const handleRemoveTarget = (skuId: string) => {
    const updatedTargets = targets.filter(t => t.sku_id !== skuId);
    setTargets(updatedTargets);

    const updatedPlan: WeeklyProductionPlan = {
      ...plan,
      title,
      week_number: Number(weekNumber),
      month: Number(month),
      year: Number(year),
      start_date: startDate,
      end_date: endDate,
      notes,
      targets: updatedTargets,
    };

    onSavePlan(updatedPlan);
    setSuccessMessage('Item berhasil dihapus dari target mingguan & tersimpan!');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Add new SKU to target list and persist immediately
  const handleAddTarget = () => {
    if (!selectedSkuToAdd) {
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

    const updatedPlan: WeeklyProductionPlan = {
      ...plan,
      title,
      week_number: Number(weekNumber),
      month: Number(month),
      year: Number(year),
      start_date: startDate,
      end_date: endDate,
      notes,
      targets: updatedTargets,
    };

    onSavePlan(updatedPlan);
    setSuccessMessage(`Berhasil menambahkan ${newItem.sku_name} ke target!`);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedPlan: WeeklyProductionPlan = {
      ...plan,
      title,
      week_number: Number(weekNumber),
      month: Number(month),
      year: Number(year),
      start_date: startDate,
      end_date: endDate,
      notes,
      targets,
    };

    onSavePlan(updatedPlan);
    setSuccessMessage('Perubahan rencana produksi mingguan berhasil disimpan!');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-base @min-[640px]:text-lg font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-rose-500" />
            Perencanaan Produksi Mingguan
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Atur kuota target mingguan (Kg) per jenis barang/SKU dari database.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl p-3.5 flex items-center space-x-2 text-xs font-semibold animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Plan Selector & Quick Switcher */}
      {plans && plans.length > 0 && onSelectPlan && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <Layers className="w-4 h-4 text-rose-500" />
            <span className="font-semibold text-slate-300">Pilih Rencana untuk Diedit:</span>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={currentPlanId}
              onChange={(e) => {
                const target = plans.find(p => p.id === e.target.value);
                if (target) onSelectPlan(target);
              }}
              className="bg-black border border-slate-800 focus:border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {getMonthName(p.month)} {p.year} - Minggu {p.week_number} ({p.title})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCreateNewPlan}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Plan Baru</span>
            </button>
          </div>
        </div>
      )}

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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Pilihan Minggu (Week 1 - 5)</span>
              <span className="text-[11px] text-rose-400 font-bold">
                Minggu Ke-{weekNumber}
              </span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => handlePeriodChange(month, w, year)}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border transition flex flex-col items-center justify-center cursor-pointer ${
                    weekNumber === w
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/40 ring-2 ring-rose-500/20'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] text-slate-300 uppercase">Week</span>
                  <span className="text-base font-black">{w}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              * Memilih minggu akan otomatis menghitung perkiraan tanggal mulai dan selesai di bulan {getMonthName(month)}.
            </p>
          </div>

          {/* Row 3: Judul Rencana */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Judul Rencana Produksi
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Tanggal Selesai
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Catatan / Instruksi
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Utamakan pemenuhan pesanan slice dan giling."
              className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-0"
            />
          </div>
        </div>

        {/* Commitment Summary Card */}
        <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">
              Total Target Rencana
            </span>
            <p className="text-2xl font-black text-white mt-0.5">
              {formatKg(totalTargetKg)} <span className="text-xs font-normal text-slate-400">Kg / Minggu</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Jumlah Barang Terjadwal</span>
            <p className="text-base font-bold text-rose-400 mt-0.5">
              {targets.length} SKU
            </p>
          </div>
        </div>

        {/* Add SKU to Targets Section (Custom Searchable Combobox dengan garis gelap) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            + Tambah Barang ke Plan Minggu Ini
          </h2>

          <div className="space-y-2">
            {selectedSkuToAdd ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col @min-[640px]:flex-row @min-[640px]:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-rose-400 font-semibold border border-slate-800">
                      {selectedSkuToAdd.sku_code}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {selectedSkuToAdd.category}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white mt-1.5 truncate">
                    {selectedSkuToAdd.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <input
                      type="number"
                      step="10"
                      value={newTargetKg}
                      onChange={(e) => setNewTargetKg(e.target.value)}
                      placeholder="Target Kg"
                      className="w-28 bg-slate-900 border border-slate-800 focus:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white text-right focus:outline-none focus:ring-0"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      Kg
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddTarget}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSkuToAdd(null)}
                    className="p-2 text-slate-400 hover:text-white"
                    title="Batal pilih"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ketik nama barang atau kode SKU untuk mencari..."
                    value={searchQuery}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-0"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Floating Dark Dropdown Panel (Garis hitam pekat tanpa garis putih) */}
                {isDropdownOpen && (
                  <div 
                    style={{ backgroundColor: '#050505', borderColor: '#1e293b' }}
                    className="absolute left-0 right-0 top-full mt-1.5 z-30 border rounded-xl shadow-2xl max-h-56 overflow-y-auto"
                  >
                    {filteredAvailableSkus.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500 text-center">
                        Tidak ada barang yang cocok atau barang sudah ada di daftar.
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
                          className="w-full text-left p-2.5 hover:bg-slate-900 transition flex items-center justify-between group active:bg-slate-800 last:border-b-0"
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
                                <span className="text-[10px] text-slate-500">
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

        {/* Targets Table / List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Daftar Target Item ({targets.length} Item)
            </h2>
          </div>

          <div className="space-y-2">
            {targets.map((item) => (
              <div
                key={item.sku_id}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="min-w-0">
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
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Hapus dari target minggu ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Save Button */}
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-950/40 active:scale-[0.98] transition flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Simpan & Terapkan Rencana Mingguan</span>
        </button>
      </form>
    </div>
  );
};
