'use client';

import React from 'react';
import { 
  WeeklyProductionPlan, 
  DailyProductionLog, 
  WeeklySummary,
  getMonthName,
  getMonthShortName
} from '@/types';
import { formatKg, formatPercent } from '@/lib/storage';
import { WeeklyLineChart } from './WeeklyLineChart';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  Scale, 
  Flame, 
  ChevronRight, 
  Filter,
  ArrowUpRight
} from 'lucide-react';

interface SummaryDashboardProps {
  plans: WeeklyProductionPlan[];
  selectedWeekFilter: string; // 'all' or plan.id or 'month-M-YYYY'
  onSelectWeekFilter: (val: string) => void;
  activePlan: WeeklyProductionPlan;
  logs: DailyProductionLog[];
  summary: WeeklySummary;
  onNavigateToInput: () => void;
  onNavigateToPlanning: () => void;
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({
  plans,
  selectedWeekFilter,
  onSelectWeekFilter,
  activePlan,
  logs,
  summary,
  onNavigateToInput,
  onNavigateToPlanning,
}) => {
  const isAllWeeks = selectedWeekFilter === 'all';
  const currentPlan = isAllWeeks ? activePlan : (plans.find(p => p.id === selectedWeekFilter) || activePlan);

  // Available months extracted from plans
  const availableMonths = React.useMemo(() => {
    const map = new Map<string, { month: number; year: number; label: string }>();
    plans.forEach(p => {
      const m = p.month || Number(p.start_date.split('-')[1]) || 10;
      const y = p.year;
      const key = `${m}-${y}`;
      if (!map.has(key)) {
        map.set(key, {
          month: m,
          year: y,
          label: `${getMonthName(m)} ${y}`,
        });
      }
    });
    return Array.from(map.entries()).sort((a, b) => {
      if (b[1].year !== a[1].year) return b[1].year - a[1].year;
      return b[1].month - a[1].month;
    });
  }, [plans]);

  // Determine current selected month key
  const currentMonthKey = React.useMemo(() => {
    if (selectedWeekFilter === 'all') return 'all';
    if (selectedWeekFilter.startsWith('month-')) {
      const parts = selectedWeekFilter.split('-');
      return `${parts[1]}-${parts[2]}`;
    }
    const found = plans.find(p => p.id === selectedWeekFilter);
    if (found) {
      const m = found.month || Number(found.start_date.split('-')[1]) || 10;
      return `${m}-${found.year}`;
    }
    return 'all';
  }, [selectedWeekFilter, plans]);

  // Plans filtered by current month key (when not 'all')
  const filteredMonthPlans = React.useMemo(() => {
    if (currentMonthKey === 'all') return plans;
    const [mStr, yStr] = currentMonthKey.split('-');
    const m = Number(mStr);
    const y = Number(yStr);
    return plans
      .filter(p => {
        const pMonth = p.month || Number(p.start_date.split('-')[1]) || 10;
        return pMonth === m && p.year === y;
      })
      .sort((a, b) => a.week_number - b.week_number);
  }, [plans, currentMonthKey]);

  const handleMonthChange = (monthKey: string) => {
    if (monthKey === 'all') {
      onSelectWeekFilter('all');
    } else {
      // Set to all weeks of this month
      onSelectWeekFilter(`month-${monthKey}`);
    }
  };

  const selectedMonthInfo = availableMonths.find(([k]) => k === currentMonthKey)?.[1];

  // Title for hero card
  let periodTitle = 'Pencapaian Akumulasi Semua Week';
  if (selectedWeekFilter.startsWith('month-')) {
    const parts = selectedWeekFilter.split('-');
    const m = Number(parts[1]);
    const y = Number(parts[2]);
    periodTitle = `Pencapaian Akumulasi Bulan ${getMonthName(m)} ${y}`;
  } else if (!isAllWeeks) {
    const m = currentPlan.month || Number(currentPlan.start_date.split('-')[1]) || 10;
    periodTitle = `Pencapaian Minggu Ke-${currentPlan.week_number} (${getMonthShortName(m)} ${currentPlan.year})`;
  }

  // Today's stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.date === todayStr);
  const todayActualKg = todayLogs.reduce((acc, curr) => acc + curr.actual_kg, 0);

  // Status badge config
  const getStatusBadge = () => {
    if (summary.status === 'on_track') {
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        icon: CheckCircle2,
        label: 'On Track',
      };
    }
    if (summary.status === 'warning') {
      return {
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        icon: AlertTriangle,
        label: 'Perlu Perhatian',
      };
    }
    return {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      icon: Flame,
      label: 'Tertinggal',
    };
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  // Aggregate targets across all or selected plans for SKU breakdown
  const targetSkuList = React.useMemo(() => {
    let plansToConsider = plans;
    if (selectedWeekFilter.startsWith('month-')) {
      const parts = selectedWeekFilter.split('-');
      const m = Number(parts[1]);
      const y = Number(parts[2]);
      plansToConsider = plans.filter(p => {
        const pMonth = p.month || Number(p.start_date.split('-')[1]) || 10;
        return pMonth === m && p.year === y;
      });
    } else if (!isAllWeeks) {
      plansToConsider = [currentPlan];
    }

    const map = new Map<string, {
      sku_id: string;
      sku_code: string;
      sku_name: string;
      category: string;
      target_kg: number;
    }>();

    plansToConsider.forEach(p => {
      p.targets.forEach(t => {
        if (!map.has(t.sku_id)) {
          map.set(t.sku_id, {
            sku_id: t.sku_id,
            sku_code: t.sku_code,
            sku_name: t.sku_name,
            category: t.category,
            target_kg: t.target_kg,
          });
        } else {
          const existing = map.get(t.sku_id)!;
          existing.target_kg += t.target_kg;
        }
      });
    });

    const relevantPlanIds = new Set(plansToConsider.map(p => p.id));
    const filteredLogs = logs.filter(l => relevantPlanIds.has(l.plan_id));

    return Array.from(map.values()).map(target => {
      const skuLogs = filteredLogs.filter(l => l.sku_id === target.sku_id);
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
  }, [isAllWeeks, plans, currentPlan, logs, selectedWeekFilter]);

  return (
    <div className="space-y-4 pb-20">
      {/* Two-Tier Filter Bar: Bulan Kebutuhan + Minggu */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm flex flex-col @min-[640px]:flex-row @min-[640px]:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
          <Filter className="w-4 h-4 text-rose-500" />
          <span>Filter Periode Produksi:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tier 1: Bulan Kebutuhan */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Bulan:</span>
            <select
              value={currentMonthKey}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="bg-black border border-slate-800 focus:border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="all">Semua Bulan</option>
              {availableMonths.map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tier 2: Minggu Produksi (Week 1 - 5) */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Pekan:</span>
            <select
              value={selectedWeekFilter}
              onChange={(e) => onSelectWeekFilter(e.target.value)}
              className="bg-black border border-slate-800 focus:border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-0 cursor-pointer"
            >
              {currentMonthKey === 'all' ? (
                <>
                  <option value="all">📊 Total Semua Pekan</option>
                  {plans.map((p) => {
                    const m = p.month || Number(p.start_date.split('-')[1]) || 10;
                    return (
                      <option key={p.id} value={p.id}>
                        {getMonthShortName(m)} - Minggu Ke-{p.week_number}
                      </option>
                    );
                  })}
                </>
              ) : (
                <>
                  <option value={`month-${currentMonthKey}`}>
                    📅 Seluruh {selectedMonthInfo?.label || 'Bulan'} (Akumulasi W1-W5)
                  </option>
                  {filteredMonthPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      Minggu Ke-{p.week_number} (W{p.week_number}) • {p.start_date.slice(5)} s/d {p.end_date.slice(5)}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {!isAllWeeks && !selectedWeekFilter.startsWith('month-') && (
            <button
              onClick={onNavigateToPlanning}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 transition"
            >
              Ubah Plan <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          )}
        </div>
      </div>

      {/* Hero Achievement Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-rose-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {periodTitle}
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-4xl @min-[640px]:text-5xl font-black text-white tracking-tight">
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

        {/* 3-Box Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] mb-1">
              <Target className="w-3.5 h-3.5 text-rose-400" />
              <span>Target Rencana</span>
            </div>
            <p className="text-sm @min-[640px]:text-base font-bold text-white">
              {formatKg(summary.total_target_kg)} <span className="text-[10px] font-normal text-slate-400">Kg</span>
            </p>
          </div>

          <div className="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] mb-1">
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span>Total Hasil Jadi</span>
            </div>
            <p className="text-sm @min-[640px]:text-base font-bold text-emerald-400">
              {formatKg(summary.total_actual_kg)} <span className="text-[10px] font-normal text-slate-400">Kg</span>
            </p>
          </div>

          <div className="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[11px] mb-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Sisa Target</span>
            </div>
            <p className="text-sm @min-[640px]:text-base font-bold text-rose-400">
              {formatKg(summary.remaining_target_kg)} <span className="text-[10px] font-normal text-slate-400">Kg</span>
            </p>
          </div>
        </div>
      </div>

      {/* Target Hari Ini vs Capaian Hari Ini */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-sm font-bold text-white">Realisasi Hari Ini ({todayStr})</h2>
          </div>
          <span className="text-xs text-slate-400">{todayLogs.length} Entri</span>
        </div>

        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400">Total Hasil Produksi Jadi Hari Ini</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">
              {formatKg(todayActualKg)} <span className="text-xs text-slate-400 font-normal">Kg</span>
            </p>
          </div>
          <button
            onClick={onNavigateToInput}
            className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-md transition"
          >
            <span>+ Input Hasil</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Line Chart Tren Produksi Mingguan (Target vs Realisasi Garis) */}
      <WeeklyLineChart plans={plans} logs={logs} />

      {/* Detail Capaian per SKU */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-rose-400" />
            Detail Pencapaian per Barang / SKU
          </h2>
          <span className="text-xs text-slate-400">{targetSkuList.length} Item</span>
        </div>

        <div className="space-y-3">
          {targetSkuList.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              Belum ada target barang pada periode ini. Buka menu Plan untuk menambahkan barang.
            </p>
          ) : (
            targetSkuList.map((item) => {
              const isFinished = item.percent >= 100;
              return (
                <div
                  key={item.sku_id}
                  className="bg-slate-950/50 hover:bg-slate-950/80 transition border border-slate-800 rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                          {item.sku_code}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
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
