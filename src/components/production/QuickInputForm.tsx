'use client';

import React, { useState } from 'react';
import { 
  WeeklyProductionPlan, 
  DailyProductionLog, 
  ProductSKU 
} from '@/types';
import { formatKg } from '@/lib/storage';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Scale, 
  Scissors, 
  Trash2, 
  Clock, 
  AlertCircle,
  Tag,
  Plus
} from 'lucide-react';

interface QuickInputFormProps {
  plan: WeeklyProductionPlan;
  skus: ProductSKU[];
  logs: DailyProductionLog[];
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
  'Kualitas Daging Lemak Tinggi',
];

export const QuickInputForm: React.FC<QuickInputFormProps> = ({
  plan,
  skus,
  logs,
  onSaveLog,
  onDeleteLog,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Form states
  const [selectedSkuId, setSelectedSkuId] = useState<string>(
    plan.targets[0]?.sku_id || skus[0]?.id || ''
  );
  const [date, setDate] = useState<string>(todayStr);
  const [actualKg, setActualKg] = useState<string>('');
  const [trimmingKg, setTrimmingKg] = useState<string>('');
  const [bottleneck, setBottleneck] = useState<string>('Normal / Lancar');
  const [notes, setNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Available SKUs from current plan
  const planSkus = plan.targets.map(t => {
    return {
      sku_id: t.sku_id,
      name: t.sku_name,
      code: t.sku_code,
      category: t.category,
      target_kg: t.target_kg,
    };
  });

  const selectedTarget = plan.targets.find(t => t.sku_id === selectedSkuId);
  const selectedSku = skus.find(s => s.id === selectedSkuId);

  // Quick increment buttons
  const handleAddKg = (amount: number) => {
    const current = parseFloat(actualKg) || 0;
    setActualKg((current + amount).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const kg = parseFloat(actualKg);
    if (!kg || isNaN(kg) || kg <= 0) {
      alert('Mohon masukkan jumlah Kg hasil jadi dengan benar!');
      return;
    }

    const trim = parseFloat(trimmingKg) || 0;

    onSaveLog({
      plan_id: plan.id,
      date,
      sku_id: selectedSkuId,
      sku_name: selectedTarget?.sku_name || selectedSku?.name || 'Produk Daging',
      sku_code: selectedTarget?.sku_code || selectedSku?.sku_code || 'SKU',
      actual_kg: kg,
      trimming_loss_kg: trim,
      bottleneck_reason: bottleneck,
      notes: notes.trim() || undefined,
    });

    // Fire celebratory confetti!
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // ignore
    }

    setSuccessMsg(`Berhasil mencatat ${kg} Kg untuk ${selectedTarget?.sku_name || 'produk'}!`);
    setActualKg('');
    setTrimmingKg('');
    setNotes('');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Filter logs for today
  const todayLogs = logs.filter(l => l.date === date);

  return (
    <div className="space-y-4 pb-24">
      {/* Title Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <Scale className="w-5 h-5 text-rose-500" />
          Input Realisasi Produksi (Mobile Entry)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Gunakan form ini untuk mencatat hasil timbangan harian di line produksi daging.
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl p-3.5 flex items-center space-x-2 text-xs font-semibold animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Input Card */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        {/* Date Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Tanggal Produksi
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
            required
          />
        </div>

        {/* SKU Selector - Touch Cards */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Pilih Jenis Potongan Daging (SKU)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {planSkus.map((item) => {
              const isSelected = selectedSkuId === item.sku_id;
              return (
                <button
                  type="button"
                  key={item.sku_id}
                  onClick={() => setSelectedSkuId(item.sku_id)}
                  className={`text-left p-3 rounded-xl border transition flex items-center justify-between active:scale-[0.98] ${
                    isSelected
                      ? 'bg-rose-600/15 border-rose-500 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-300">
                        {item.code}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">
                        {item.category}
                      </span>
                    </div>
                    <p className={`text-xs font-bold mt-1 truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {item.name}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-rose-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Numeric Input: Hasil Jadi (Kg) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
          <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-400" />
              Hasil Jadi Daging (Kg Output)
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold">Good Product</span>
          </label>
          <div className="relative mt-2">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={actualKg}
              onChange={(e) => setActualKg(e.target.value)}
              placeholder="0.0"
              className="w-full bg-slate-900 border-2 border-slate-700 focus:border-rose-500 rounded-xl px-4 py-3 text-2xl sm:text-3xl font-black text-white placeholder-slate-600 focus:outline-none tracking-tight"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              Kg
            </span>
          </div>

          {/* Quick Increment Chips */}
          <div className="flex items-center space-x-2 mt-2.5 overflow-x-auto pb-1">
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Cepat:</span>
            {[25, 50, 100, 200, 500].map((val) => (
              <button
                type="button"
                key={val}
                onClick={() => handleAddKg(val)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold shrink-0 transition active:scale-95 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Susut / Trimming (Kg) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              Susut / Lemak / Trimming (Kg)
            </span>
            <span className="text-[10px] text-slate-500">(Opsional / Waste)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              value={trimmingKg}
              onChange={(e) => setTrimmingKg(e.target.value)}
              placeholder="0.0"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
              Kg
            </span>
          </div>
        </div>

        {/* Kendala / Bottleneck Quick Chips */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            Catatan Kendala di Lapangan
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_BOTTLENECK_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => setBottleneck(tag)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                  bottleneck === tag
                    ? 'bg-rose-500 text-white border-rose-500 font-semibold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Keterangan Tambahan
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Batch 04/26, selesai jam 15:30"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 active:scale-[0.98] transition flex items-center justify-center space-x-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Simpan Hasil Timbangan</span>
        </button>
      </form>

      {/* Today's History Log List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-bold text-white flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            Riwayat Input Hari Ini ({date})
          </span>
          <span className="text-xs text-slate-400">{todayLogs.length} Entri</span>
        </h2>

        {todayLogs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            Belum ada catatan produksi untuk tanggal {date}.
          </p>
        ) : (
          <div className="space-y-2">
            {todayLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-300">
                      {log.sku_code}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {log.sku_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                    <span>
                      Hasil: <strong className="text-emerald-400 font-semibold">{formatKg(log.actual_kg)} Kg</strong>
                    </span>
                    {log.trimming_loss_kg ? (
                      <span>
                        Susut: <strong className="text-amber-400 font-semibold">{formatKg(log.trimming_loss_kg)} Kg</strong>
                      </span>
                    ) : null}
                  </div>
                  {log.bottleneck_reason && log.bottleneck_reason !== 'Normal / Lancar' && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-400">
                      <Tag className="w-3 h-3" />
                      <span>{log.bottleneck_reason}</span>
                    </div>
                  )}
                  {log.notes && (
                    <p className="text-[10px] text-slate-500 mt-0.5 italic">
                      &ldquo;{log.notes}&rdquo;
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Hapus catatan ${log.sku_name} (${log.actual_kg} Kg)?`)) {
                      onDeleteLog(log.id);
                    }
                  }}
                  title="Hapus entri ini"
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
