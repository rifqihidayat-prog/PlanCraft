'use client';

import React, { useState, useMemo } from 'react';
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
  Trash2, 
  Clock, 
  AlertCircle,
  Search,
  Plus,
  Package,
  X
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
  'Bahan Baku Tertunda',
];

export const QuickInputForm: React.FC<QuickInputFormProps> = ({
  plan,
  skus,
  logs,
  onSaveLog,
  onDeleteLog,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Set default selected SKU from first target or empty
  const [selectedSku, setSelectedSku] = useState<{
    id: string;
    code: string;
    name: string;
    targetKg?: number;
  } | null>(() => {
    if (plan.targets.length > 0) {
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

  // Combine items: prioritize items in current weekly plan
  const planSkuMap = useMemo(() => {
    const map = new Map<string, number>();
    plan.targets.forEach(t => map.set(t.sku_id, t.target_kg));
    return map;
  }, [plan]);

  // Filtered SKUs for autocomplete
  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    // First: Plan targets
    const inPlan = plan.targets
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
    const notInPlan = skus
      .filter(s => !planSkuMap.has(s.id))
      .filter(s => !query || s.name.toLowerCase().includes(query) || s.sku_code.toLowerCase().includes(query))
      .slice(0, 50) // limit for fast rendering
      .map(s => ({
        id: s.id,
        code: s.sku_code,
        name: s.name,
        category: s.category,
        isInPlan: false,
        targetKg: undefined,
      }));

    return [...inPlan, ...notInPlan];
  }, [searchQuery, plan, skus, planSkuMap]);

  // Quick increment buttons
  const handleAddKg = (amount: number) => {
    const current = parseFloat(actualKg) || 0;
    setActualKg((current + amount).toString());
  };

  const handleSelectItem = (item: { id: string; code: string; name: string; targetKg?: number }) => {
    setSelectedSku(item);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSku) {
      alert('Pilih atau cari Nama Barang / SKU terlebih dahulu!');
      return;
    }

    const kg = parseFloat(actualKg);
    if (!kg || isNaN(kg) || kg <= 0) {
      alert('Mohon masukkan jumlah Kg hasil jadi dengan benar!');
      return;
    }

    onSaveLog({
      plan_id: plan.id,
      date,
      sku_id: selectedSku.id,
      sku_name: selectedSku.name,
      sku_code: selectedSku.code,
      actual_kg: kg,
      bottleneck_reason: bottleneck,
      notes: notes.trim() || undefined,
    });

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // ignore
    }

    setSuccessMsg(`Berhasil mencatat ${kg} Kg untuk ${selectedSku.name}!`);
    setActualKg('');
    setNotes('');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Filter logs for selected date
  const todayLogs = logs.filter(l => l.date === date);

  return (
    <div className="space-y-4 pb-24">
      {/* Title Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <Scale className="w-5 h-5 text-rose-500" />
          Input Hasil Produksi Jadi
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Pilih nama barang/SKU, lalu masukkan total berat hasil jadi (Kg) yang sudah diproduksi.
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

        {/* Search & Select SKU / Nama Barang */}
        <div className="space-y-2 relative">
          <label className="block text-xs font-semibold text-slate-300">
            Nama Barang / SKU
          </label>

          {/* Selected Item Box */}
          {selectedSku ? (
            <div className="bg-slate-950 border-2 border-rose-500/60 rounded-xl p-3 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-rose-300 font-semibold">
                    {selectedSku.code}
                  </span>
                  {selectedSku.targetKg !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                      Target Pekan: {formatKg(selectedSku.targetKg)} Kg
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white mt-1 truncate">
                  {selectedSku.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSku(null);
                  setIsDropdownOpen(true);
                }}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 font-medium transition"
              >
                Ganti Barang
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ketik untuk mencari nama barang atau kode SKU..."
                  value={searchQuery}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
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

              {/* Floating Autocomplete Dropdown */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-800">
                  {filteredOptions.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">
                      Barang tidak ditemukan dalam database.
                    </div>
                  ) : (
                    filteredOptions.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className="w-full text-left p-2.5 hover:bg-slate-800 transition flex items-center justify-between group active:bg-slate-700"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-slate-950 text-slate-300">
                              {item.code}
                            </span>
                            {item.isInPlan ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">
                                Target Plan: {formatKg(item.targetKg || 0)} Kg
                              </span>
                            ) : (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-slate-800 text-slate-400">
                                {item.category}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-200 group-hover:text-white mt-1 truncate">
                            {item.name}
                          </p>
                        </div>
                        <Plus className="w-4 h-4 text-slate-500 group-hover:text-rose-400 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Big Numeric Input: Hasil Jadi (Kg) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
          <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-400" />
              Hasil Jadi Produksi (Kg)
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold">Output Selesai</span>
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

        {/* Kendala / Bottleneck Quick Chips */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            Catatan Kendala (Opsional)
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
            placeholder="Contoh: Batch 04, selesai jam 15:30"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 active:scale-[0.98] transition flex items-center justify-center space-x-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Simpan Hasil Produksi</span>
        </button>
      </form>

      {/* History Log List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-bold text-white flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            Riwayat Input ({date})
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
                  </div>
                  {log.bottleneck_reason && log.bottleneck_reason !== 'Normal / Lancar' && (
                    <div className="mt-1 text-[10px] text-rose-400">
                      Kendala: {log.bottleneck_reason}
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
