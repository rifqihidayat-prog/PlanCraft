'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  Snowflake, 
  Smartphone, 
  Monitor, 
  RefreshCw, 
  ShieldCheck, 
  HardHat, 
  LogOut,
  KeyRound,
  X
} from 'lucide-react';
import { WeeklyProductionPlan, AuthUser } from '@/types';
import { changePinOnServer } from '@/lib/apiClient';

interface NavbarProps {
  activePlan?: WeeklyProductionPlan;
  plans?: WeeklyProductionPlan[];
  onSelectPlan?: (plan: WeeklyProductionPlan) => void;
  currentUser: AuthUser;
  isMobileFrame: boolean;
  setIsMobileFrame: (val: boolean) => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  isMobileFrame,
  setIsMobileFrame,
  onRefresh,
  onLogout,
}) => {
  const pinDialogRef = useRef<HTMLDialogElement>(null);
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
