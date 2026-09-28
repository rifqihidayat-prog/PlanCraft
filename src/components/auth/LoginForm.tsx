'use client';

import React, { useState } from 'react';
import { AuthUser } from '@/types';
import { loginWithCredentials, saveStoredUser } from '@/lib/auth';
import { loginOnServer } from '@/lib/apiClient';
import { 
  Snowflake, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  HardHat, 
  ArrowRight, 
  AlertCircle 
} from 'lucide-react';

interface LoginFormProps {
  onLogin: (user: AuthUser) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Silakan masukkan username');
      return;
    }
    if (!pin.trim()) {
      setErrorMsg('Silakan masukkan PIN / Password');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Coba login ke server SQLite
      const serverRes = await loginOnServer(username, pin);
      if (serverRes.success && serverRes.user) {
        saveStoredUser(serverRes.user);
        setIsLoading(false);
        onLogin(serverRes.user);
        return;
      }

      // 2. Jika server mengembalikan user tidak valid, tampilkan error
      if (serverRes.message && serverRes.message !== 'Gagal terhubung ke server database') {
        setIsLoading(false);
        setErrorMsg(serverRes.message);
        return;
      }

      // 3. Fallback jika server offline
      const localRes = loginWithCredentials(username, pin);
      setIsLoading(false);
      if (localRes.success && localRes.user) {
        saveStoredUser(localRes.user);
        onLogin(localRes.user);
      } else {
        setErrorMsg(localRes.message || 'Username atau PIN tidak sesuai');
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('Terjadi kesalahan saat masuk');
    }
  };

  const handleQuickFill = (userType: 'admin' | 'produksi') => {
    if (userType === 'admin') {
      setUsername('admin');
      setPin('1234');
    } else {
      setUsername('produksi');
      setPin('1234');
    }
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8">
      <div 
        style={{ backgroundColor: '#050505', borderColor: '#1e293b' }}
        className="w-full max-w-sm rounded-3xl border p-6 sm:p-7 shadow-2xl shadow-rose-950/20"
      >
        {/* App Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-900/50 mb-3">
            <Snowflake className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black tracking-tight text-white">
              Plan<span className="text-rose-500">Craft</span>
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
              Frozen Meat
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Masuk untuk mengakses sistem pelacakan produksi
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2 animate-in fade-in zoom-in-95">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: admin atau produksi"
                autoCapitalize="none"
                autoCorrect="off"
                style={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
              />
            </div>
          </div>

          {/* PIN / Password Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              PIN / Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN (Default: 1234)"
                style={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-rose-900/40 transition active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Masuk ke PlanCraft</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Helper / Demo Credentials */}
        <div className="mt-6 pt-5 border-t border-slate-900 space-y-2.5">
          <p className="text-[11px] text-center font-medium text-slate-400">
            Pilih cepat akun untuk uji coba:
          </p>

          <div className="grid grid-cols-2 gap-2">
            {/* Quick Fill Produksi */}
            <button
              type="button"
              onClick={() => handleQuickFill('produksi')}
              style={{ backgroundColor: '#030712', borderColor: '#1e293b' }}
              className="p-2.5 rounded-xl border text-left hover:border-emerald-500/50 transition active:scale-95 group"
            >
              <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs mb-0.5">
                <HardHat className="w-3.5 h-3.5" />
                <span>Tim Produksi</span>
              </div>
              <p className="text-[10px] text-slate-500 group-hover:text-slate-400">
                User: <strong>produksi</strong><br />
                PIN: <strong>1234</strong>
              </p>
            </button>

            {/* Quick Fill Admin */}
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              style={{ backgroundColor: '#030712', borderColor: '#1e293b' }}
              className="p-2.5 rounded-xl border text-left hover:border-rose-500/50 transition active:scale-95 group"
            >
              <div className="flex items-center space-x-1.5 text-rose-400 font-bold text-xs mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin PPIC</span>
              </div>
              <p className="text-[10px] text-slate-500 group-hover:text-slate-400">
                User: <strong>admin</strong><br />
                PIN: <strong>1234</strong>
              </p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
