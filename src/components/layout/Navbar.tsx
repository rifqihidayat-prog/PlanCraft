'use client';

import { Snowflake, Smartphone, Monitor, RefreshCw, Calendar, ShieldCheck, HardHat } from 'lucide-react';
import { WeeklyProductionPlan, AuthUser } from '@/types';

interface NavbarProps {
  activePlan: WeeklyProductionPlan;
  currentUser: AuthUser;
  isMobileFrame: boolean;
  setIsMobileFrame: (val: boolean) => void;
  onRefresh: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePlan,
  currentUser,
  isMobileFrame,
  setIsMobileFrame,
  onRefresh,
  onOpenLogin,
}) => {
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
          {/* Active Week Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-semibold text-white">W{activePlan.week_number}</span>
            <span>({activePlan.year})</span>
          </div>

          {/* User Role Switcher Button */}
          <button
            onClick={onOpenLogin}
            title={`Akun aktif: ${currentUser.name}. Klik untuk ganti akun.`}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition active:scale-95 ${
              currentUser.role === 'admin'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            {currentUser.role === 'admin' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : (
              <HardHat className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span>{currentUser.role === 'admin' ? 'Admin' : 'Produksi'}</span>
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
