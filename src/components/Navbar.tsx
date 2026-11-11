/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileSpreadsheet, Film, ShieldCheck } from 'lucide-react';
import Logo from './Logo.tsx';
import { Session } from '../types.ts';

interface NavbarProps {
  session: Session | null;
  onOpenLicense: () => void;
  onOpenLogin: () => void;
  onOpenExporter: () => void;
}

export default function Navbar({
  session,
  onOpenLicense,
  onOpenLogin,
  onOpenExporter,
}: NavbarProps) {
  const scrollToSheets = () => {
    const el = document.getElementById('tab-google-sheets');
    if (el) {
      el.click();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-stone-900/80 backdrop-blur-md border-b border-stone-800/80 px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Logo size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                PixelBridge
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                Studio 3D
              </span>
            </div>
            <p className="text-[11px] text-stone-400 hidden lg:block truncate">
              Professional 3D video animator, invitations & motion clips
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {session ? (
            <button
              onClick={onOpenLicense}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold cursor-pointer transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Active License</span>
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping ml-0.5" />
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 text-xs font-semibold cursor-pointer transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PixelBridge Login</span>
            </button>
          )}

          <button
            id="header-sheets-btn"
            onClick={scrollToSheets}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all cursor-pointer"
            title="Open Google Sheets Guest & RSVP Tracker"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Sheets</span>
          </button>

          <button
            id="header-export-btn"
            onClick={onOpenExporter}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Film className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Clips</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>
    </header>
  );
}
