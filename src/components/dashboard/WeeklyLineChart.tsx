'use client';

import React, { useState } from 'react';
import { WeeklyProductionPlan, DailyProductionLog, getMonthShortName } from '@/types';
import { formatKg, formatPercent } from '@/lib/storage';
import { TrendingUp, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface WeeklyLineChartProps {
  plans: WeeklyProductionPlan[];
  logs: DailyProductionLog[];
  titleSuffix?: string;
  selectedPlanId?: string;
}

export const WeeklyLineChart: React.FC<WeeklyLineChartProps> = ({
  plans,
  logs,
  titleSuffix,
  selectedPlanId,
}) => {
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<number | null>(null);

  // Sort plans chronologically by start_date ascending
  const sortedPlans = [...plans].sort((a, b) => a.start_date.localeCompare(b.start_date));

  // Compute week data points
  const weekData = sortedPlans.map((plan) => {
    const totalTarget = plan.targets.reduce((acc, t) => acc + (t.target_kg || 0), 0);
    const planLogs = logs.filter((l) => l.plan_id === plan.id);
    const totalActual = planLogs.reduce((acc, l) => acc + (l.actual_kg || 0), 0);
    const percent = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
    const isAchieved = totalTarget > 0 && totalActual >= totalTarget;
    const m = plan.month || Number(plan.start_date.split('-')[1]) || 10;

    return {
      id: plan.id,
      weekNumber: plan.week_number,
      month: m,
      year: plan.year,
      label: `${getMonthShortName(m)} W${plan.week_number}`,
      dateRange: `${plan.start_date.slice(5)} s/d ${plan.end_date.slice(5)}`,
      targetKg: Math.round(totalTarget * 10) / 10,
      actualKg: Math.round(totalActual * 10) / 10,
      percent: Math.round(percent * 10) / 10,
      isAchieved,
      status: plan.status,
    };
  });

  if (weekData.length === 0) {
    return null;
  }

  // Calculate SVG Dimensions & Scales
  const svgWidth = 520;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 35;
  const padBottom = 35;

  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const maxVal = Math.max(
    ...weekData.map((d) => Math.max(d.targetKg, d.actualKg)),
    1000
  );
  // Add 15% headroom
  const yMax = Math.ceil((maxVal * 1.15) / 1000) * 1000;

  const getX = (index: number) => {
    if (weekData.length <= 1) return padLeft + plotW / 2;
    return padLeft + (index / (weekData.length - 1)) * plotW;
  };

  const getY = (val: number) => {
    const ratio = Math.min(1, Math.max(0, val / yMax));
    return padTop + (1 - ratio) * plotH;
  };

  // Build SVG Paths
  const targetPath = weekData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.targetKg)}`)
    .join(' ');

  const actualPath = weekData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.actualKg)}`)
    .join(' ');

  // Gradient area path for actual production
  const areaPath =
    actualPath +
    ` L ${getX(weekData.length - 1)} ${padTop + plotH} L ${getX(0)} ${padTop + plotH} Z`;

  // Grid levels (e.g. 0, 25%, 50%, 75%, 100% of yMax)
  const gridSteps = [0, yMax * 0.33, yMax * 0.66, yMax];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 @min-[640px]:p-5 shadow-sm space-y-4">
      {/* Header & Legend */}
      <div className="flex flex-col @min-[640px]:flex-row @min-[640px]:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Grafik Tren Produksi {titleSuffix ? `(${titleSuffix})` : 'Mingguan'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Garis target membandingkan realisasi hasil jadi untuk melihat ketercapaian per pekan.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px] font-semibold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 shrink-0">
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-rose-500 inline-block" />
            <span className="text-rose-400">Garis Target</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-1 bg-emerald-400 rounded-full inline-block" />
            <span className="text-emerald-400">Garis Hasil Jadi</span>
          </div>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="relative overflow-hidden bg-slate-950/90 border border-slate-800 rounded-2xl p-2 pt-4">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y Labels */}
          {gridSteps.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {Math.round(val / 1000)}k
                </text>
              </g>
            );
          })}

          {/* Area Fill for Actual Line */}
          <path d={areaPath} fill="url(#actualGradient)" />

          {/* Target Line (Dashed Rose) */}
          <path
            d={targetPath}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2.5"
            strokeDasharray="5 4"
            strokeLinecap="round"
          />

          {/* Actual Line (Solid Emerald) */}
          <path
            d={actualPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Target Nodes & Actual Nodes */}
          {weekData.map((d, i) => {
            const x = getX(i);
            const yT = getY(d.targetKg);
            const yA = getY(d.actualKg);
            const isHovered = activeTooltipIndex === i;
            const isSelected = selectedPlanId === d.id;

            return (
              <g key={d.id} className="cursor-pointer" onClick={() => setActiveTooltipIndex(i)}>
                {/* Target Point (Square/Diamond) */}
                <rect
                  x={x - 3.5}
                  y={yT - 3.5}
                  width="7"
                  height="7"
                  fill="#090d16"
                  stroke="#f43f5e"
                  strokeWidth="2"
                  rx="1"
                />

                {/* Actual Point (Circle) */}
                <circle
                  cx={x}
                  cy={yA}
                  r={isSelected ? 8 : isHovered ? 7 : 5.5}
                  fill={d.isAchieved ? '#10b981' : d.percent >= 80 ? '#f59e0b' : '#f43f5e'}
                  stroke={isSelected ? '#f43f5e' : '#0f172a'}
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all duration-200"
                />

                {/* Percentage Tag Above Node */}
                <g transform={`translate(${x}, ${yA - 10})`}>
                  <rect
                    x="-20"
                    y="-13"
                    width="40"
                    height="14"
                    rx="4"
                    fill={d.isAchieved ? '#064e3b' : d.percent >= 80 ? '#78350f' : '#881337'}
                    stroke={d.isAchieved ? '#10b981' : d.percent >= 80 ? '#f59e0b' : '#f43f5e'}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="-3"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="bold"
                  >
                    {d.percent.toFixed(0)}%
                  </text>
                </g>

                {/* X Axis Label */}
                <text
                  x={x}
                  y={svgHeight - 14}
                  textAnchor="middle"
                  fill={isHovered ? '#ffffff' : '#94a3b8'}
                  fontSize="11"
                  fontWeight="bold"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Active Info if node is clicked/hovered */}
        {activeTooltipIndex !== null && weekData[activeTooltipIndex] && (
          <div className="mt-2 bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white">
                Minggu Ke-{weekData[activeTooltipIndex].weekNumber} ({weekData[activeTooltipIndex].dateRange})
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  weekData[activeTooltipIndex].isAchieved
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {weekData[activeTooltipIndex].isAchieved ? 'Target Tercapai ✅' : 'Belum Tercapai ❌'}
              </span>
            </div>
            <div className="text-right text-slate-300">
              Target: <strong className="text-rose-400">{formatKg(weekData[activeTooltipIndex].targetKg)} Kg</strong> | 
              Hasil Jadi: <strong className="text-emerald-400 ml-1">{formatKg(weekData[activeTooltipIndex].actualKg)} Kg</strong> 
              <span className="ml-1 text-white font-bold">({formatPercent(weekData[activeTooltipIndex].percent)})</span>
            </div>
          </div>
        )}
      </div>

      {/* Week Achievement Cards Grid */}
      <div className="grid grid-cols-2 @min-[640px]:grid-cols-4 gap-2 pt-1">
        {weekData.map((d) => {
          const isSelected = selectedPlanId === d.id;
          return (
            <div
              key={d.id}
              className={`p-2.5 rounded-xl border transition ${
                isSelected
                  ? 'bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/40 text-white'
                  : d.isAchieved
                  ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                  : d.actualKg > 0
                  ? 'bg-slate-950 border-slate-800 text-slate-300'
                  : 'bg-slate-950/40 border-slate-900 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isSelected ? 'text-rose-400' : 'text-white'}`}>
                  {d.label} {isSelected && '• Terpilih'}
                </span>
                {d.isAchieved ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : d.status === 'active' ? (
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>

              <div className="mt-1">
                <div className="text-[10px] text-slate-400">
                  {formatKg(d.actualKg)} / {formatKg(d.targetKg)} Kg
                </div>
                <div className="text-xs font-extrabold mt-0.5 flex items-center justify-between">
                  <span className={d.isAchieved ? 'text-emerald-400' : d.percent >= 80 ? 'text-amber-400' : 'text-rose-400'}>
                    {formatPercent(d.percent)}
                  </span>
                  <span className="text-[9px] uppercase font-semibold text-slate-400">
                    {d.isAchieved ? 'Achieved' : d.status === 'active' ? 'Running' : 'Target'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
