/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Mail, KeyRound, Calendar, LogOut, X, AlertTriangle } from 'lucide-react';
import { Session } from '../types.ts';
import { calculateLicenseRemaining } from '../utils/auth.ts';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  onLogout: () => void;
}

export default function LicenseModal({ isOpen, onClose, session, onLogout }: LicenseModalProps) {
  const [remaining, setRemaining] = useState(() =>
    calculateLicenseRemaining(session.expiresAt, session.activatedAt)
  );

  useEffect(() => {
    setRemaining(calculateLicenseRemaining(session.expiresAt, session.activatedAt));
    const interval = setInterval(() => {
      setRemaining(calculateLicenseRemaining(session.expiresAt, session.activatedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.expiresAt, session.activatedAt]);

  if (!isOpen) return null;

  const formatDate = (ts: number) => {
    try {
      return new Date(ts).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  const isLow = !remaining.isExpired && remaining.days < 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-stone-200 flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">PixelBridge License Terminal</h3>
              <p className="text-xs text-stone-400">Active session validity and workstation access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Countdown Timer Block */}
        <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Time Remaining</span>
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${remaining.isExpired ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
              {remaining.isExpired ? 'Expired' : 'Active'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center py-1">
            <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-2 flex flex-col items-center">
              <span className="text-lg font-black font-mono text-white tracking-tight">
                {remaining.days}
              </span>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider mt-0.5">Days</span>
            </div>
            <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-2 flex flex-col items-center">
              <span className="text-lg font-black font-mono text-white tracking-tight">
                {remaining.hours.toString().padStart(2, '0')}
              </span>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider mt-0.5">Hours</span>
            </div>
            <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-2 flex flex-col items-center">
              <span className="text-lg font-black font-mono text-white tracking-tight">
                {remaining.minutes.toString().padStart(2, '0')}
              </span>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider mt-0.5">Mins</span>
            </div>
            <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-2 flex flex-col items-center relative overflow-hidden">
              <span className="text-lg font-black font-mono text-blue-400 tracking-tight">
                {remaining.seconds.toString().padStart(2, '0')}
              </span>
              <span className="text-[10px] text-blue-300 uppercase tracking-wider mt-0.5">Secs</span>
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500 animate-pulse" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-stone-950 rounded-full h-2 overflow-hidden border border-stone-800">
            <div
              className={`h-full transition-all duration-1000 ${isLow ? 'bg-amber-500' : remaining.isExpired ? 'bg-rose-500' : 'bg-blue-500'}`}
              style={{ width: `${remaining.percentRemaining}%` }}
            />
          </div>

          {remaining.isExpired && (
            <div className="text-xs text-rose-300 font-medium flex items-center gap-1.5 mt-1">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>License period has expired. Please contact support.</span>
            </div>
          )}
        </div>

        {/* License details */}
        <div className="bg-stone-950/70 border border-stone-800/80 rounded-2xl p-4 flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="text-stone-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              Account Email
            </span>
            <span className="font-semibold text-white font-mono">{session.email}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="text-stone-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Terminal Status
            </span>
            <span className="font-medium text-blue-400 px-2 py-0.5 bg-blue-950/40 border border-blue-500/40 rounded-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Authorized & Verified</span>
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="text-stone-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
              License Type
            </span>
            <span className="font-medium text-stone-300 px-2 py-0.5 bg-stone-900 border border-stone-700/80 rounded-md">
              PixelBridge Pro License
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="text-stone-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Activated At
            </span>
            <span className="text-stone-300">{formatDate(session.activatedAt)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-stone-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              Valid Until
            </span>
            <span className="font-medium text-stone-200">{formatDate(session.expiresAt)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            onClick={onLogout}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-medium text-xs border border-stone-700/80 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center cursor-pointer"
          >
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
