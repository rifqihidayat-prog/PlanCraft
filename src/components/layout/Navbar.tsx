'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  Check,
  KeyRound,
  X
} from 'lucide-react';
import { WeeklyProductionPlan, AuthUser, getMonthName, getMonthShortName } from '@/types';
import { changePinOnServer } from '@/lib/apiClient';

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
  const pinDialogRef = useRef<HTMLDialogElement>(null);
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [pinFeedback, setPinFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    const dialog = pinDialogRef.current;
    if (isPinDialogOpen && dialog && !dialog.open) dialog.showModal();
  }, [isPinDialogOpen]);

  const closePinDialog = () => {
    if (isSavingPin) return;
    setIsPinDialogOpen(false);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinFeedback(null);
  };

  const handleChangePin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(currentPin) || !/^\d{6}$/.test(newPin) || !/^\d{6}$/.test(confirmPin)) {
      setPinFeedback({ type: 'error', message: 'Semua PIN harus terdiri dari tepat 6 angka.' });
      return;
    }
    if (newPin !== confirmPin) {
      setPinFeedback({ type: 'error', message: 'Konfirmasi PIN baru tidak sama.' });
      return;
    }

    setIsSavingPin(true);
    setPinFeedback(null);
    const result = await changePinOnServer(currentPin, newPin);
    setIsSavingPin(false);
    if (result.success) {
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setPinFeedback({ type: 'success', message: result.message || 'PIN berhasil diubah.' });
    } else {
      setPinFeedback({ type: 'error', message: result.message || 'PIN tidak berhasil diubah.' });
    }
  };

  const activePlanMonth = activePlan.month || Number(activePlan.start_date.split('-')[1]) || 10;

  // Group plans by month for clarity
  const groupedPlans = React.useMemo(() => {
    const groups: { [key: string]: { label: string; items: WeeklyProductionPlan[] } } = {};
    plans.forEach(p => {
      const m = p.month || Number(p.start_date.split('-')[1]) || 10;
      const key = `${p.year}-${String(m).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = {
          label: `${getMonthName(m)} ${p.year}`,
          items: []
        };
      }
      groups[key].items.push(p);
    });
    // Sort groups descending
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, val]) => ({
        ...val,
        items: [...val.items].sort((a, b) => a.week_number - b.week_number),
      }));
  }, [plans]);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 @min-[640px]:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex shrink-0 items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/40">
            <Snowflake className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg @min-[640px]:text-xl tracking-tight text-white">
                Plan<span className="text-rose-500">Craft</span>
              </span>
              <span className="hidden xs:inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Frozen Meat
              </span>
            </div>
            <p className="hidden @min-[640px]:block text-[11px] text-slate-400 font-medium">
              1 Line • 1 Shift • Weekly Tracking
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {/* Active Week Selector Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsWeekDropdownOpen(!isWeekDropdownOpen)}
              title="Klik untuk memilih minggu produksi"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-rose-500/50 text-xs text-slate-200 transition active:scale-95 group cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-white">
                {getMonthShortName(activePlanMonth)} W{activePlan.week_number}
              </span>
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
                  className="absolute right-0 top-full mt-2 z-50 w-72 border rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95"
                >
                  <div className="px-3 py-2 border-b border-slate-900 mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Pilih Periode Produksi
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono font-bold">
                      {plans.length} Week
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {groupedPlans.map((group) => (
                      <div key={group.label} className="space-y-1">
                        <div className="px-2 pt-1 text-[10px] font-bold text-rose-400/90 uppercase tracking-wider flex items-center gap-1">
                          <span>📅 {group.label}</span>
                        </div>
                        {group.items.map((p) => {
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
                                    Minggu Ke-{p.week_number} (W{p.week_number})
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
                    ))}
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

          <button
            type="button"
            onClick={() => {
              setPinFeedback(null);
              setIsPinDialogOpen(true);
            }}
            title="Pengaturan PIN"
            aria-label="Pengaturan PIN"
            aria-haspopup="dialog"
            aria-expanded={isPinDialogOpen}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden @min-[640px]:inline">Ganti PIN</span>
          </button>

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
            className={`${isMobileFrame ? 'flex' : 'hidden @min-[768px]:flex'} items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition font-medium`}
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

      {isPinDialogOpen && (
        <dialog
          ref={pinDialogRef}
          aria-labelledby="change-pin-title"
          className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white shadow-2xl backdrop:bg-black/75"
          onCancel={(event) => {
            if (isSavingPin) event.preventDefault();
          }}
          onClose={closePinDialog}
          onClick={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left || event.clientX > bounds.right ||
              event.clientY < bounds.top || event.clientY > bounds.bottom
            ) closePinDialog();
          }}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="change-pin-title" className="text-lg font-bold">Pengaturan PIN</h2>
              <p className="mt-1 text-xs text-slate-400">
                Ganti PIN akun <span className="font-semibold text-slate-200">{currentUser.username}</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={closePinDialog}
              disabled={isSavingPin}
              aria-label="Tutup pengaturan PIN"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {pinFeedback?.type === 'success' ? (
            <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {pinFeedback.message}
            </p>
          ) : (
            <form onSubmit={handleChangePin} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  PIN lama
                  <input
                    type="password"
                    value={currentPin}
                    onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="current-password"
                    required
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  PIN baru
                  <input
                    type="password"
                    value={newPin}
                    onChange={(event) => setNewPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="new-password"
                    required
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-300">
                  Ulangi PIN baru
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="new-password"
                    required
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500"
                  />
                </label>

                {pinFeedback?.type === 'error' && (
                  <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {pinFeedback.message}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closePinDialog}
                    disabled={isSavingPin}
                    className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPin}
                    className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 active:scale-[0.99] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
                  >
                    {isSavingPin ? 'Menyimpan…' : 'Simpan PIN'}
                  </button>
                </div>
            </form>
          )}
        </dialog>
      )}
    </header>
  );
};
