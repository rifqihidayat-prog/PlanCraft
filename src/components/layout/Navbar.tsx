'use client';

import React, { useState } from 'react';
import { 
  Snowflake, 
  Smartphone, 
  Monitor, 
  RefreshCw, 
  Calendar, 
  ShieldCheck, 
  HardHat, 
  LogOut,
  ChevronDown,
  Check
} from 'lucide-react';
import { WeeklyProductionPlan, AuthUser } from '@/types';

interface NavbarProps {
  activePlan: WeeklyProductionPlan;
  plans: WeeklyProductionPlan[];
  onSelectPlan: (plan: WeeklyProductionPlan) => void;
  currentUser: AuthUser;
  isMobileFrame: boolean;
  setIsMobileFrame: (val: boolean) => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePlan,
  plans = [],
  onSelectPlan,
  currentUser,
  isMobileFrame,
  setIsMobileFrame,
  onRefresh,
  onLogout,
}) => {
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/40">
            <Snowflake className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                Plan<span className="text-rose-500">Craft</span>
              </span>
              <span className="hidden xs:inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Frozen Meat
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              1 Line • 1 Shift • Weekly Tracking
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2">
          {/* Active Week Selector Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsWeekDropdownOpen(!isWeekDropdownOpen)}
              title="Klik untuk memilih minggu produksi"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-rose-500/50 text-xs text-slate-200 transition active:scale-95 group cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-white">W{activePlan.week_number}</span>
              <span className="text-slate-400 hidden xs:inline">({activePlan.year})</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isWeekDropdownOpen ? 'rotate-180 text-rose-400' : ''}`} />
            </button>

            {/* Dropdown Menu Minggu Produksi */}
            {isWeekDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsWeekDropdownOpen(false)} 
                />
                <div 
                  style={{ backgroundColor: '#050505', borderColor: '#1e293b' }}
                  className="absolute right-0 top-full mt-2 z-50 w-64 border rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95"
                >
                  <div className="px-3 py-2 border-b border-slate-900 mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Pilih Minggu Produksi
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono font-bold">
                      {plans.length} Week
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {plans.map((p) => {
                      const isCurrent = p.id === activePlan.id;
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => {
                            onSelectPlan(p);
                            setIsWeekDropdownOpen(false);
                          }}
                          style={{ 
                            backgroundColor: isCurrent ? '#0f172a' : 'transparent',
                            borderColor: isCurrent ? '#f43f5e' : 'transparent'
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl border transition flex items-center justify-between group hover:bg-slate-900 ${
                            isCurrent ? 'font-semibold text-white' : 'text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs font-bold ${isCurrent ? 'text-rose-400' : 'text-white'}`}>
                                Minggu Ke-{p.week_number}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({p.year})
                              </span>
                              {p.status === 'active' && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                                  Aktif
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {p.start_date} s/d {p.end_date}
                            </p>
                          </div>
                          {isCurrent && (
                            <Check className="w-4 h-4 text-rose-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Role Badge */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
              currentUser.role === 'admin'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {currentUser.role === 'admin' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : (
              <HardHat className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span>{currentUser.role === 'admin' ? 'Admin' : 'Produksi'}</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            title="Keluar / Logout Akun"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs text-slate-300 transition active:scale-95 group"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400" />
            <span className="hidden xs:inline">Keluar</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            title="Refresh Data"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Device Frame View Toggle for desktop review */}
          <button
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            title={isMobileFrame ? "Tampilan Fullscreen" : "Tampilan Simulasi Layar HP"}
            className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition font-medium"
          >
            {isMobileFrame ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                <span>Mode Monitor</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mode HP (Preview)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
