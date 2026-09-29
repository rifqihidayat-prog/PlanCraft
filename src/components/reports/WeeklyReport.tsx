'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  WeeklyProductionPlan, 
  DailyProductionLog, 
  WeeklySummary,
  MONTH_NAMES,
  getMonthName
} from '@/types';
import { formatKg, formatPercent, calculateWeeklySummary } from '@/lib/storage';
import { 
  BarChart3, 
  Printer, 
  FileSpreadsheet,
  Calendar
} from 'lucide-react';

interface WeeklyReportProps {
  plan: WeeklyProductionPlan;
  plans?: WeeklyProductionPlan[];
  onSelectPlan?: (plan: WeeklyProductionPlan) => void;
  logs: DailyProductionLog[];
  summary?: WeeklySummary;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({
  plan,
  plans = [],
  onSelectPlan,
  logs,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    return plan.month || Number(plan.start_date?.split('-')[1]) || 10;
  });
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    const w = Number(plan.week_number);
    return w > 5 ? 1 : (w || 1);
  });

  useEffect(() => {
    const m = plan.month || Number(plan.start_date?.split('-')[1]) || 10;
    const w = Number(plan.week_number) > 5 ? 1 : (Number(plan.week_number) || 1);
    setSelectedMonth(m);
    setSelectedWeek(w);
  }, [plan.id, plan.month, plan.week_number, plan.start_date]);

  const handlePeriodChange = (newMonth: number, newWeek: number) => {
    setSelectedMonth(newMonth);
    setSelectedWeek(newWeek);
    if (plans && onSelectPlan) {
      const matched = plans.find(
        p => (p.month || Number(p.start_date.split('-')[1])) === newMonth && p.week_number === newWeek
      );
      if (matched) {
        onSelectPlan(matched);
      }
    }
  };

  const isMatchedPlan = useMemo(() => {
    const pMonth = plan.month || Number(plan.start_date?.split('-')[1]) || 10;
    const pWeek = Number(plan.week_number) > 5 ? 1 : (Number(plan.week_number) || 1);
    return pMonth === selectedMonth && pWeek === selectedWeek;
  }, [plan, selectedMonth, selectedWeek]);

  const planMonth = plan.month || Number(plan.start_date.split('-')[1]) || 10;

  // Summary dihitung khusus untuk plan yang sedang aktif/terpilih
  const effectiveSummary = useMemo(() => {
    return calculateWeeklySummary([plan], logs);
  }, [plan, logs]);

  // Generate list of working days dates from start_date to end_date
  const getDatesBetween = (start: string, end: string) => {
    const dates: { dateStr: string; dayName: string; shortDate: string }[] = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    try {
      const cur = new Date(start);
      const stop = new Date(end);
      while (cur <= stop) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        dates.push({
          dateStr,
          dayName: dayNames[cur.getDay()],
          shortDate: `${d}/${m}`,
        });
        cur.setDate(cur.getDate() + 1);
      }
    } catch {
      // fallback
    }
    return dates;
  };

  const weekDates = getDatesBetween(plan.start_date, plan.end_date);
  const planLogs = logs.filter(l => l.plan_id === plan.id);
  const totalDiff = effectiveSummary.total_actual_kg - effectiveSummary.total_target_kg;

  // Export CSV handler (without susut and yield)
  const handleExportCSV = () => {
    const dateHeaders = weekDates.map(d => `${d.dayName} (${d.shortDate})`).join(',');
    let csv = `Laporan Realisasi Produksi PlanCraft - Bulan ${getMonthName(planMonth)} Minggu Ke-${plan.week_number} (${plan.year})\n`;
    csv += `Periode: ${plan.start_date} s/d ${plan.end_date}\n\n`;
    csv += `Kode SKU,Nama Produk,Kategori,Target (Kg),${dateHeaders},Total Aktual (Kg),Selisih (Kg),Capaian (%)\n`;

    plan.targets.forEach(target => {
      const skuLogs = planLogs.filter(l => l.sku_id === target.sku_id);
      const totalActual = skuLogs.reduce((acc, l) => acc + l.actual_kg, 0);
      const diff = totalActual - target.target_kg;
      const pct = target.target_kg > 0 ? (totalActual / target.target_kg) * 100 : 0;

      const dailyValues = weekDates.map(d => {
        const dayLogs = skuLogs.filter(l => l.date === d.dateStr);
        const daySum = dayLogs.reduce((acc, l) => acc + l.actual_kg, 0);
        return daySum > 0 ? daySum.toFixed(1) : '0';
      }).join(',');

      csv += `"${target.sku_code}","${target.sku_name}","${target.category}",${target.target_kg},${dailyValues},${totalActual.toFixed(1)},${diff.toFixed(1)},${pct.toFixed(1)}%\n`;
    });

    csv += `\nTOTAL RINGKASAN,,,,${effectiveSummary.total_target_kg},${effectiveSummary.total_actual_kg},${totalDiff.toFixed(1)},${effectiveSummary.achievement_rate}%\n`;

    // Download trigger
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PlanCraft_Report_${plan.year}_M${planMonth}_W${plan.week_number}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Period Filter: Bulan Kebutuhan & Week 1 - 5 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <Calendar className="w-4 h-4 text-rose-500" />
            <span>Pilih Periode Laporan Mingguan:</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 font-medium">Bulan Kebutuhan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => handlePeriodChange(Number(e.target.value), selectedWeek)}
              className="bg-black border border-slate-800 focus:border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((mName, idx) => (
                <option key={mName} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Week 1 - 5 Selector Chips */}
        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {[1, 2, 3, 4, 5].map((w) => {
            const isSelected = selectedWeek === w;
            const planForWeek = (plans || []).find(
              p => (p.month || Number(p.start_date.split('-')[1])) === selectedMonth && p.week_number === w
            );
            const hasPlan = Boolean(planForWeek);

            return (
              <button
                key={w}
                type="button"
                onClick={() => handlePeriodChange(selectedMonth, w)}
                className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center border cursor-pointer ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/40'
                    : hasPlan
                    ? 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
                    : 'bg-slate-950/50 hover:bg-slate-900 text-slate-500 border-slate-900'
                }`}
              >
                <span>Week {w}</span>
                <span className="text-[9px] font-normal opacity-80 mt-0.5 truncate">
                  {hasPlan ? `${planForWeek!.targets?.length || 0} Target` : 'Belum Ada'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Period Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800/80 gap-1.5">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Laporan Pekan Terpilih:</span>
            <span className="font-bold text-white">
              {getMonthName(selectedMonth)} • Week {selectedWeek}
            </span>
            {isMatchedPlan ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                {plan.status === 'active' ? 'Aktif' : 'Tersedia'}
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold">
                Plan Belum Dibuat
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400">
            {isMatchedPlan ? `${plan.start_date} s/d ${plan.end_date}` : 'Belum ada rencana produksi untuk minggu ini'}
          </span>
        </div>
      </div>

      {/* Title & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col @min-[640px]:flex-row @min-[640px]:items-center justify-between gap-3">
        <div>
          <h1 className="text-base @min-[640px]:text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-rose-500" />
            Rekap & Laporan Evaluasi Mingguan
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Bulan {getMonthName(selectedMonth)} {plan.year} • Minggu Ke-{selectedWeek} ({plan.start_date} s/d {plan.end_date})
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="flex-1 @min-[640px]:flex-none px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/30"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (CSV)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition active:scale-95 flex items-center gap-1.5"
            title="Cetak Halaman"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards (Tanpa Susut & Tanpa Yield) */}
      <div className="grid grid-cols-2 @min-[640px]:grid-cols-4 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <p className="text-[11px] text-slate-400">Target Pekan</p>
          <p className="text-lg font-black text-white mt-0.5">
            {formatKg(effectiveSummary.total_target_kg)} <span className="text-xs font-normal text-slate-400">Kg</span>
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <p className="text-[11px] text-slate-400">Aktual Hasil Jadi</p>
          <p className="text-lg font-black text-emerald-400 mt-0.5">
            {formatKg(effectiveSummary.total_actual_kg)} <span className="text-xs font-normal text-slate-400">Kg</span>
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <p className="text-[11px] text-slate-400">Selisih Deviasi</p>
          <p className={`text-lg font-black mt-0.5 ${totalDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalDiff >= 0 ? `+${formatKg(totalDiff)}` : formatKg(totalDiff)} <span className="text-xs font-normal text-slate-400">Kg</span>
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <p className="text-[11px] text-slate-400">Pencapaian %</p>
          <p className={`text-lg font-black mt-0.5 ${
            effectiveSummary.achievement_rate >= 95 ? 'text-emerald-400' : effectiveSummary.achievement_rate >= 80 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {formatPercent(effectiveSummary.achievement_rate)}
          </p>
        </div>
      </div>

      {/* Daily Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm overflow-hidden">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          Matriks Realisasi Harian Hasil Jadi (Kg)
        </h2>

        <div className="overflow-x-auto -mx-4 @min-[640px]:mx-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                <th className="py-2.5 px-3 font-semibold min-w-[150px]">Nama Barang / SKU</th>
                <th className="py-2.5 px-2 font-semibold text-right">Target (Kg)</th>
                {weekDates.map(d => (
                  <th key={d.dateStr} className="py-2.5 px-2 font-semibold text-right min-w-[55px]">
                    <div>{d.dayName}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{d.shortDate}</div>
                  </th>
                ))}
                <th className="py-2.5 px-2 font-semibold text-right bg-slate-900/90">Aktual</th>
                <th className="py-2.5 px-2 font-semibold text-right bg-slate-900/90">Selisih</th>
                <th className="py-2.5 px-3 font-semibold text-right bg-slate-900/90">% Capaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(!plan.targets || plan.targets.length === 0) ? (
                <tr>
                  <td colSpan={weekDates.length + 5} className="py-8 text-center text-xs text-slate-500">
                    Belum ada target produk yang direncanakan untuk pekan ini. Silakan buat rencana di menu Plan terlebih dahulu.
                  </td>
                </tr>
              ) : (
                plan.targets.map(target => {
                  const skuLogs = planLogs.filter(l => l.sku_id === target.sku_id);
                  const actual = skuLogs.reduce((acc, l) => acc + l.actual_kg, 0);
                  const diff = actual - target.target_kg;
                  const pct = target.target_kg > 0 ? (actual / target.target_kg) * 100 : 0;

                  return (
                    <tr key={target.sku_id} className="hover:bg-slate-950/40 transition">
                      <td className="py-2.5 px-3 font-medium text-white">
                        <div className="truncate font-semibold">{target.sku_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{target.sku_code}</div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-300">
                        {formatKg(target.target_kg)}
                      </td>

                      {weekDates.map(d => {
                        const dayLogs = skuLogs.filter(l => l.date === d.dateStr);
                        const daySum = dayLogs.reduce((acc, l) => acc + l.actual_kg, 0);
                        return (
                          <td key={d.dateStr} className={`py-2.5 px-2 text-right font-medium ${
                            daySum > 0 ? 'text-slate-200' : 'text-slate-600'
                          }`}>
                            {daySum > 0 ? formatKg(daySum) : '-'}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-2 text-right font-bold text-emerald-400 bg-slate-950/30">
                        {formatKg(actual)}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-bold bg-slate-950/30 ${
                        diff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {diff >= 0 ? `+${formatKg(diff)}` : formatKg(diff)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black bg-slate-950/30">
                        <span className={pct >= 95 ? 'text-emerald-400' : pct >= 80 ? 'text-amber-400' : 'text-rose-400'}>
                          {formatPercent(pct)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field Bottlenecks and Log Issues */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
          Catatan Lapangan & Kendala
        </h2>
        {planLogs.filter(l => l.notes || (l.bottleneck_reason && l.bottleneck_reason !== 'Normal / Lancar')).length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            Semua proses produksi berjalan normal tanpa kendala.
          </p>
        ) : (
          <div className="space-y-2">
            {planLogs
              .filter(l => l.notes || (l.bottleneck_reason && l.bottleneck_reason !== 'Normal / Lancar'))
              .map(l => (
                <div key={l.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="font-semibold text-white">{l.sku_name} ({l.date})</span>
                    <span className="text-rose-400 font-medium">{l.bottleneck_reason}</span>
                  </div>
                  {l.notes && <p className="text-slate-300 mt-1 italic">&ldquo;{l.notes}&rdquo;</p>}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
