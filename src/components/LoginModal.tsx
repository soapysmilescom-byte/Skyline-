/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Mail, Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import Logo from './Logo.tsx';
import { authenticateTerminal, TERMINAL_SECURITY_CODE } from '../utils/auth.ts';
import { audioEngine } from '../utils/audio.ts';
import { Session } from '../types.ts';

interface LoginModalProps {
  onLoginSuccess: (session: Session) => void;
  defaultEmail?: string;
}

export default function LoginModal({ onLoginSuccess, defaultEmail = '' }: LoginModalProps) {
  const [email, setEmail] = useState(defaultEmail || '');
  const [password, setPassword] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTerminalId, setShowTerminalId] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    audioEngine.unlockAudio();
    setError(null);
    setSuccess(null);
    setLoading(true);

    setTimeout(() => {
      const res = authenticateTerminal(email, password, terminalId);
      if (!res.success || !res.session) {
        setError(res.error || 'Authentication failed. Please verify your credentials.');
        setLoading(false);
        return;
      }
      setSuccess(res.isNewUser ? 'PixelBridge License activated! Launching workspace...' : 'Welcome back! Session verified. Launching workspace...');
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess(res.session!);
      }, 650);
    }, 400);
  };

  const fillDemoCredentials = () => {
    setEmail('studio@pixelbridge.ai');
    setPassword('studio123');
    setTerminalId(TERMINAL_SECURITY_CODE);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-4 sm:p-6 overflow-y-auto font-sans-clean">
      <div className="relative w-full max-w-[430px] bg-white border border-slate-200/90 rounded-3xl shadow-[0_25px_60px_-15px_rgba(30,58,138,0.18)] p-6 sm:p-8 flex flex-col gap-6 my-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative">
            <Logo size="xl" showGlow />
            <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1 rounded-full border-2 border-white shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>PixelBridge Portal</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">PixelBridge</h2>
            <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
              Login with your registered email to get access
            </p>
          </div>
        </div>

        {/* Quick Demo Fill button */}
        <button
          type="button"
          onClick={fillDemoCredentials}
          className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200/80 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Auto-fill Demo Credentials (Code: {TERMINAL_SECURITY_CODE})</span>
        </button>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Password</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span>Terminal ID</span>
              </label>
              <span className="text-[10px] text-slate-400">Assigned 5-digit key ({TERMINAL_SECURITY_CODE})</span>
            </div>
            <div className="relative">
              <input
                type={showTerminalId ? 'text' : 'password'}
                required
                value={terminalId}
                onChange={(e) => setTerminalId(e.target.value)}
                placeholder={`Enter assigned Terminal ID (${TERMINAL_SECURITY_CODE})`}
                className="w-full font-mono text-sm px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowTerminalId(!showTerminalId)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label="Toggle terminal ID visibility"
              >
                {showTerminalId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed font-medium">{error}</div>
            </div>
          )}

          {success && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-700 animate-in fade-in">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed font-medium">{success}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            onMouseDown={() => audioEngine.unlockAudio()}
            onTouchStart={() => audioEngine.unlockAudio()}
            className="w-full mt-1.5 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Access...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Login to PixelBridge</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <span>PixelBridge Secure Auth</span>
          <span>•</span>
          <span>Encrypted Session</span>
        </div>
      </div>
    </div>
  );
}
