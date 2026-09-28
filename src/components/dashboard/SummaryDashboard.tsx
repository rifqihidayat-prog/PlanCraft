'use client';

import React from 'react';
import { 
  WeeklyProductionPlan, 
  DailyProductionLog, 
  WeeklySummary 
} from '@/types';
import { formatKg, formatPercent } from '@/lib/storage';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  Scale, 
  Scissors, 
  Flame, 
  Calendar,
  ChevronRight,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

interface SummaryDashboardProps {
  plan: WeeklyProductionPlan;
  logs: DailyProductionLog[];
  summary: WeeklySummary;
  onNavigateToInput: () => void;
  onNavigateToPlanning: () => void;
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({
  plan,
  logs,
  summary,
  onNavigateToInput,
  onNavigateToPlanning,
}) => {
  // Today's stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.date === todayStr);
  const todayActualKg = todayLogs.reduce((acc, curr) => acc + curr.actual_kg, 0);
  
  // Calculate average daily target
  const dailyTargetSum = plan.targets.reduce((acc, curr) => acc + curr.daily_target_kg, 0);
  const todayAchievement = dailyTargetSum > 0 ? (todayActualKg / dailyTargetSum) * 100 : 0;

  // Status badge config
  const getStatusBadge = () => {
    if (summary.status === 'on_track') {
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        icon: CheckCircle2,
        label: 'On Track',
        desc: 'Produksi berjalan sesuai target',
      };
    }
    if (summary.status === 'warning') {
      return {
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        icon: AlertTriangle,
        label: 'Perlu Perhatian',
        desc: 'Mendekati target, jaga ritme potong',
      };
    }
    return {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      icon: Flame,
      label: 'Tertinggal',
      desc: 'Kecepatan produksi perlu dinaikkan',
    };
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  // SKU progress calculations
  const skuProgress = plan.targets.map(target => {
    const skuLogs = logs.filter(l => l.plan_id === plan.id && l.sku_id === target.sku_id);
    const actual = skuLogs.reduce((acc, l) => acc + l.actual_kg, 0);
    const percent = target.target_kg > 0 ? (actual / target.target_kg) * 100 : 0;
    const remaining = Math.max(0, target.target_kg - actual);
    return {
      ...target,
      actual_kg: Math.round(actual * 10) / 10,
      percent: Math.round(percent * 10) / 10,
      remaining_kg: Math.round(remaining * 10) / 10,
    };
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Plan Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Minggu Ke-{plan.week_number}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              {plan.start_date} s/d {plan.end_date}
            </span>
          </div>
          <button
            onClick={onNavigateToPlanning}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center"
          >
            Ubah Plan <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
        <h1 className="text-base sm:text-lg font-bold text-white mt-1.5 line-clamp-1">
          {plan.title}
        </h1>
        {plan.notes && (
          <p className="text-xs text-slate-400 mt-1 italic line-clamp-1">
            &ldquo;{plan.notes}&rdquo;
          </p>
        )}
      </div>

      {/* Hero Achievement Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-rose-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Pencapaian Pekan Ini
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {formatPercent(summary.achievement_rate)}
              </span>
              <span className="text-xs text-slate-400">
                dari {formatKg(summary.total_target_kg)} Kg
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 ${statusBadge.bg}`}>
            <StatusIcon className="w-4 h-4" />
            <span className="text-xs font-bold">{statusBadge.label}</span>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-1.5 mb-5">
          <div className="w-full bg-slate-800 rounded-full h-3.5 p-0.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary.achievement_rate >= 95
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/30'
                  : summary.achievement_rate >= 80
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-md shadow-amber-500/30'
                  : 'bg-gradient-to-r from-rose-600 to-orange-500 shadow-md shadow-rose-500/30'
              }`}
              style={{ width: `${Math.min(100, Math.max(2, summary.achievement_rate))}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 px-0.5">
            <span>Realisasi: <strong className="text-white">{formatKg(summary.total_actual_kg)} Kg</strong></span>
            <span>Sisa: <strong className="text-rose-400">{formatKg(summary.remaining_target_kg)} Kg</strong></span>
          </div>
        </div>

        {/* 4-Box Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] mb-1">
              <Target className="w-3.5 h-3.5 text-rose-400" />
              <span>Target Rencana</span>
            </div>
            <p className="text-sm font-bold text-white">{formatKg(summary.total_target_kg)} <span className="text-[10px] font-normal text-slate-400">Kg</span></p>
          </div>

          <div className="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] mb-1">
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span>Total Hasil Jadi</span>
            </div>
            <p className="text-sm font-bold text-emerald-400">{formatKg(summary.total_actual_kg)} <span className="text-[10px] font-normal text-slate-400">Kg</span></p>
          </div>

          <div className="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] mb-1">
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Susut/Trimming</span>
            </div>
            <p className="text-sm font-bold text-amber-400">{formatKg(summary.total_trimming_kg)} <span className="text-[10px] font-normal text-slate-400">Kg</span></p>
          </div>

          <div className="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Rendemen (Yield)</span>
            </div>
            <p className="text-sm font-bold text-blue-400">{formatPercent(summary.yield_rate)}</p>
          </div>
        </div>
      </div>

      {/* Target Hari Ini vs Capaian Hari Ini */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-sm font-bold text-white">Performa Produksi Hari Ini</h2>
          </div>
          <span className="text-xs text-slate-400">{todayStr}</span>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400">Hasil Jadi Hari Ini</p>
            <p className="text-xl font-extrabold text-white">
              {formatKg(todayActualKg)} <span className="text-xs text-slate-400 font-normal">/ {formatKg(dailyTargetSum)} Kg</span>
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
              todayAchievement >= 100 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-slate-800 text-slate-300'
            }`}>
              {formatPercent(todayAchievement)}
            </span>
          </div>
        </div>

        {/* Quick CTA to input */}
        <button
          onClick={onNavigateToInput}
          className="mt-3 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-rose-950/30 active:scale-[0.98] transition"
        >
          <span>+ Catat Hasil Produksi Baru</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Breakdown Capaian per SKU */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-rose-400" />
            Detail Capaian per SKU Daging
          </h2>
          <span className="text-xs text-slate-400">{skuProgress.length} Item</span>
        </div>

        <div className="space-y-3">
          {skuProgress.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              Belum ada target SKU di minggu ini. Klik Ubah Plan untuk menambahkan.
            </p>
          ) : (
            skuProgress.map((item) => {
              const isFinished = item.percent >= 100;
              return (
                <div
                  key={item.sku_id}
                  className="bg-slate-950/50 hover:bg-slate-950/80 transition border border-slate-800/80 rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
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
                    <div className="text-right">
                      <span className={`text-xs font-black ${
                        isFinished ? 'text-emerald-400' : 'text-slate-200'
                      }`}>
                        {formatPercent(item.percent)}
                      </span>
                      {isFinished && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline ml-1" />
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFinished
                          ? 'bg-emerald-400'
                          : item.percent >= 70
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, item.percent))}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>
                      Aktual: <strong className="text-slate-200">{formatKg(item.actual_kg)} Kg</strong>
                    </span>
                    <span>
                      Target: <strong className="text-slate-300">{formatKg(item.target_kg)} Kg</strong>
                    </span>
                    <span>
                      Sisa: <strong className="text-rose-400">{formatKg(item.remaining_kg)} Kg</strong>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
