'use client';

import React from 'react';
import { 
  WeeklyProductionPlan, 
  DailyProductionLog, 
  WeeklySummary 
} from '@/types';
import { formatKg, formatPercent } from '@/lib/storage';
import { 
  BarChart3, 
  Printer, 
  FileSpreadsheet
} from 'lucide-react';

interface WeeklyReportProps {
  plan: WeeklyProductionPlan;
  logs: DailyProductionLog[];
  summary: WeeklySummary;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({
  plan,
  logs,
  summary,
}) => {
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
  const totalDiff = summary.total_actual_kg - summary.total_target_kg;

  // Export CSV handler (without susut and yield)
  const handleExportCSV = () => {
    const dateHeaders = weekDates.map(d => `${d.dayName} (${d.shortDate})`).join(',');
    let csv = `Laporan Realisasi Produksi PlanCraft - Minggu ${plan.week_number} (${plan.year})\n`;
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

    csv += `\nTOTAL RINGKASAN,,,,${summary.total_target_kg},${summary.total_actual_kg},${totalDiff.toFixed(1)},${summary.achievement_rate}%\n`;

    // Download trigger
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PlanCraft_Report_W${plan.week_number}_${plan.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Title & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-rose-500" />
            Rekap & Laporan Evaluasi Mingguan
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Minggu Ke-{plan.week_number} ({plan.start_date} s/d {plan.end_date})
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/30"
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <p className="text-[11px] text-slate-400">Target Pekan</p>
          <p className="text-lg font-black text-white mt-0.5">
            {formatKg(summary.total_target_kg)} <span className="text-xs font-normal text-slate-400">Kg</span>
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <p className="text-[11px] text-slate-400">Aktual Hasil Jadi</p>
          <p className="text-lg font-black text-emerald-400 mt-0.5">
            {formatKg(summary.total_actual_kg)} <span className="text-xs font-normal text-slate-400">Kg</span>
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
            summary.achievement_rate >= 95 ? 'text-emerald-400' : summary.achievement_rate >= 80 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {formatPercent(summary.achievement_rate)}
          </p>
        </div>
      </div>

      {/* Daily Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm overflow-hidden">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          Matriks Realisasi Harian Hasil Jadi (Kg)
        </h2>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
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
              {plan.targets.map(target => {
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
              })}
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
