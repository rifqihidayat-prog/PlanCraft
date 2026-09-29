'use client';

import React, { useState } from 'react';
import { AuthUser } from '@/types';
import { saveStoredUser } from '@/lib/auth';
import { loginOnServer } from '@/lib/apiClient';
import { 
  Snowflake, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
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
      setErrorMsg('Silakan masukkan PIN 6 digit');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setErrorMsg('PIN harus tepat 6 angka');
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

      setIsLoading(false);
      setErrorMsg(serverRes.message || 'Username atau PIN tidak sesuai');
    } catch {
      setIsLoading(false);
      setErrorMsg('Terjadi kesalahan saat masuk');
    }
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
              PIN 6 digit
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="current-password"
                placeholder="Masukkan 6 angka"
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

      </div>
    </div>
  );
};
