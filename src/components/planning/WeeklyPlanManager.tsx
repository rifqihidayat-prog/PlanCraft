'use client';

import React, { useState } from 'react';
import { 
  WeeklyProductionPlan, 
  ProductSKU, 
  WeeklyTargetItem 
} from '@/types';
import { formatKg } from '@/lib/storage';
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Sparkles,
  Calculator,
  Calendar
} from 'lucide-react';

interface WeeklyPlanManagerProps {
  plan: WeeklyProductionPlan;
  skus: ProductSKU[];
  onSavePlan: (updatedPlan: WeeklyProductionPlan) => void;
}

export const WeeklyPlanManager: React.FC<WeeklyPlanManagerProps> = ({
  plan,
  skus,
  onSavePlan,
}) => {
  const [title, setTitle] = useState(plan.title);
  const [weekNumber, setWeekNumber] = useState(plan.week_number);
  const [year, setYear] = useState(plan.year);
  const [startDate, setStartDate] = useState(plan.start_date);
  const [endDate, setEndDate] = useState(plan.end_date);
  const [workingDays, setWorkingDays] = useState(plan.working_days || 6);
  const [notes, setNotes] = useState(plan.notes || '');
  const [targets, setTargets] = useState<WeeklyTargetItem[]>(plan.targets);

  const [selectedSkuToAdd, setSelectedSkuToAdd] = useState<string>('');
  const [newTargetKg, setNewTargetKg] = useState<string>('500');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Calculate total target
  const totalTargetKg = targets.reduce((sum, item) => sum + (item.target_kg || 0), 0);
  const totalDailyTargetKg = workingDays > 0 ? totalTargetKg / workingDays : 0;

  // Handle target kg change for existing item
  const handleUpdateTargetKg = (skuId: string, val: number) => {
    const updated = targets.map((t) => {
      if (t.sku_id === skuId) {
        const kg = isNaN(val) ? 0 : val;
        return {
          ...t,
          target_kg: kg,
          daily_target_kg: workingDays > 0 ? Math.round((kg / workingDays) * 10) / 10 : 0,
        };
      }
      return t;
    });
    setTargets(updated);
  };

  // Remove SKU from targets
  const handleRemoveTarget = (skuId: string) => {
    setTargets(targets.filter(t => t.sku_id !== skuId));
  };

  // Add new SKU to target list
  const handleAddTarget = () => {
    if (!selectedSkuToAdd) {
      alert('Pilih SKU yang ingin ditambahkan terlebih dahulu.');
      return;
    }

    const sku = skus.find(s => s.id === selectedSkuToAdd);
    if (!sku) return;

    if (targets.some(t => t.sku_id === sku.id)) {
      alert('SKU ini sudah ada dalam daftar target minggu ini.');
      return;
    }

    const kg = parseFloat(newTargetKg) || 100;
    const daily = workingDays > 0 ? Math.round((kg / workingDays) * 10) / 10 : 0;

    const newItem: WeeklyTargetItem = {
      sku_id: sku.id,
      sku_code: sku.sku_code,
      sku_name: sku.name,
      category: sku.category,
      target_kg: kg,
      daily_target_kg: daily,
    };

    setTargets([...targets, newItem]);
    setSelectedSkuToAdd('');
    setNewTargetKg('500');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (targets.length === 0) {
      alert('Rencana produksi setidaknya harus memiliki 1 item target.');
      return;
    }

    const updatedPlan: WeeklyProductionPlan = {
      ...plan,
      title,
      week_number: Number(weekNumber),
      year: Number(year),
      start_date: startDate,
      end_date: endDate,
      working_days: Number(workingDays),
      notes,
      targets,
    };

    onSavePlan(updatedPlan);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  // Available SKUs not yet in targets
  const unassignedSkus = skus.filter(s => !targets.some(t => t.sku_id === s.id));

  return (
    <div className="space-y-4 pb-24">
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-rose-500" />
            Perencanaan Produksi Mingguan
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Atur kuota target mingguan (Kg) per jenis potongan daging frozen.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl p-3.5 flex items-center space-x-2 text-xs font-semibold animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Perubahan rencana produksi mingguan berhasil disimpan!</span>
        </div>
      )}

      {/* Plan Configuration Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-rose-400" />
            Informasi Periode Produksi
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Judul Rencana
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Minggu Ke-
                </label>
                <input
                  type="number"
                  min="1"
                  max="53"
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(Number(e.target.value))}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Hari Kerja (Shift 1)
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={workingDays}
                  onChange={(e) => setWorkingDays(Number(e.target.value))}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Mulai (Senin)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Selesai (Sabtu)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Catatan / Instruksi Produksi
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Utamakan pemenuhan pesanan shabu-shabu di awal pekan."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Commitment Summary Card */}
        <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-900/30 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold">
              Total Komitmen Rencana
            </span>
            <p className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {formatKg(totalTargetKg)} <span className="text-xs font-normal text-slate-400">Kg / Minggu</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
              <Calculator className="w-3 h-3 text-rose-400" />
              Rata-rata Target Harian
            </span>
            <p className="text-base font-bold text-rose-400 mt-0.5">
              {formatKg(totalDailyTargetKg)} <span className="text-xs font-normal text-slate-400">Kg / Hari</span>
            </p>
          </div>
        </div>

        {/* Targets Table / List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Daftar Target Item Daging ({targets.length} Item)
            </h2>
          </div>

          <div className="space-y-2.5">
            {targets.map((item) => (
              <div
                key={item.sku_id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-300">
                      {item.sku_code}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white mt-1">
                    {item.sku_name}
                  </h3>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <label className="block text-[10px] text-slate-500">Target Mingguan (Kg)</label>
                    <div className="relative mt-0.5">
                      <input
                        type="number"
                        step="10"
                        value={item.target_kg}
                        onChange={(e) => handleUpdateTargetKg(item.sku_id, parseFloat(e.target.value))}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-white text-right focus:ring-1 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="text-right hidden sm:block">
                    <label className="block text-[10px] text-slate-500">Harian (~)</label>
                    <span className="text-xs font-medium text-slate-400 inline-block py-1">
                      {formatKg(item.daily_target_kg)} Kg
                    </span>
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

          {/* Add SKU to Targets Section */}
          {unassignedSkus.length > 0 && (
            <div className="pt-3 border-t border-slate-800/80">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                + Tambah Item Daging Lain ke Minggu Ini
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedSkuToAdd}
                  onChange={(e) => setSelectedSkuToAdd(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="">-- Pilih SKU dari Database --</option>
                  {unassignedSkus.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.sku_code}] {s.name} ({s.category})
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <input
                    type="number"
                    step="10"
                    placeholder="Target (Kg)"
                    value={newTargetKg}
                    onChange={(e) => setNewTargetKg(e.target.value)}
                    className="w-28 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white text-right focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTarget}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition active:scale-95 flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah
                  </button>
                </div>
              </div>
            </div>
          )}
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
