'use client';

import React, { useState } from 'react';
import { AuthUser, UserRole } from '@/types';
import { DEFAULT_ACCOUNTS, loginWithCredentials, switchRole } from '@/lib/auth';
import { 
  ShieldCheck, 
  HardHat, 
  Lock, 
  X, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface LoginModalProps {
  currentUser: AuthUser;
  isOpen: boolean;
  onClose: () => void;
  onUserChange: (user: AuthUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onUserChange,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFastSwitch = (role: UserRole) => {
    const newUser = switchRole(role);
    onUserChange(newUser);
    onClose();
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const account = DEFAULT_ACCOUNTS.find(a => a.role === selectedRole);
    if (!account) return;

    const res = loginWithCredentials(account.username, pin);
    if (res.success && res.user) {
      onUserChange(res.user);
      setPin('');
      setErrorMsg(null);
      onClose();
    } else {
      setErrorMsg(res.message || 'PIN tidak valid');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        style={{ backgroundColor: '#050505', borderColor: '#1e293b' }}
        className="w-full max-w-sm border rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-900">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-white">Ganti Akun & Hak Akses</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-white rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Role Selection Cards */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-slate-400">Pilih Jenis Akun:</p>

          {/* Admin Card */}
          <button
            type="button"
            onClick={() => handleFastSwitch('admin')}
            style={{ 
              backgroundColor: currentUser.role === 'admin' ? '#0f172a' : '#030712',
              borderColor: currentUser.role === 'admin' ? '#f43f5e' : '#1e293b'
            }}
            className="w-full p-3.5 rounded-2xl border text-left flex items-start justify-between transition hover:border-slate-700 active:scale-[0.99]"
          >
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold text-white">Akun Admin PPIC</h3>
                  {currentUser.role === 'admin' && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Akses Penuh: Dashboard, Input Hasil, <strong>Plan</strong>, Laporan, dan <strong>Database SKU</strong>.
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
          </button>

          {/* Produksi Card */}
          <button
            type="button"
            onClick={() => handleFastSwitch('production')}
            style={{ 
              backgroundColor: currentUser.role === 'production' ? '#0f172a' : '#030712',
              borderColor: currentUser.role === 'production' ? '#10b981' : '#1e293b'
            }}
            className="w-full p-3.5 rounded-2xl border text-left flex items-start justify-between transition hover:border-slate-700 active:scale-[0.99]"
          >
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <HardHat className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold text-white">Akun Tim Produksi</h3>
                  {currentUser.role === 'production' && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Khusus Lapangan: Dashboard, Input Hasil, dan Laporan. (<strong>Tanpa Plan & Database</strong>).
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
          </button>
        </div>

        {/* Footer info */}
        <div className="pt-2 text-center text-[10px] text-slate-500 border-t border-slate-900">
          Klik salah satu kartu di atas untuk berganti hak akses dengan cepat.
        </div>
      </div>
    </div>
  );
};
