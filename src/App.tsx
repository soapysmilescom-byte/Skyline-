/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Sparkles, Clock, LogOut } from 'lucide-react';
import { BirthdayProfile, StudioConfig, Session } from './types.ts';
import { DEFAULT_PROFILE, DEFAULT_BABY_VOICE, PRESET_PROFILES } from './constants/presets.ts';
import { getActiveSession, saveActiveSession } from './utils/auth.ts';
import Navbar from './components/Navbar.tsx';
import LoginModal from './components/LoginModal.tsx';
import LicenseModal from './components/LicenseModal.tsx';
import VideoStudio from './components/VideoStudio.tsx';
import EditorTabs from './components/EditorTabs.tsx';
import ExportModal from './components/ExportModal.tsx';

export default function App() {
  const [session, setSession] = useState<Session | null>(() => getActiveSession());
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [profile, setProfile] = useState<BirthdayProfile>(() => {
    const saved = localStorage.getItem('birthday_profile_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.babyVoice) {
          parsed.babyVoice = DEFAULT_BABY_VOICE;
        }
        return parsed;
      } catch {
        return DEFAULT_PROFILE;
      }
    }
    return DEFAULT_PROFILE;
  });

  const [config, setConfig] = useState<StudioConfig>(() => ({
    aspectRatio: '9:16',
    fps: 30,
    musicTheme: 'fairytale_box',
    soundEffects: true,
    sparkleIntensity: 65,
    showWatermark: false,
    babyVoice: profile.babyVoice || DEFAULT_BABY_VOICE,
  }));

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [customPhotoImg, setCustomPhotoImg] = useState<HTMLImageElement | null>(null);

  // Sync profile to localStorage
  useEffect(() => {
    localStorage.setItem('birthday_profile_data', JSON.stringify(profile));
  }, [profile]);

  // Load custom photo
  useEffect(() => {
    if (profile.photoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setCustomPhotoImg(img);
      img.src = profile.photoUrl;
    } else {
      setCustomPhotoImg(null);
    }
  }, [profile.photoUrl]);

  const handleUpdateProfile = (partial: Partial<BirthdayProfile>) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  };

  const handleUpdateConfig = (partial: Partial<StudioConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleLoginSuccess = (sess: Session) => {
    setSession(sess);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    saveActiveSession(null);
    setSession(null);
    setIsLicenseOpen(false);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-pink-500 selection:text-white pb-12">
      {/* Login Modal if opened or no active session */}
      {!session && <LoginModal onLoginSuccess={handleLoginSuccess} />}
      {isLoginModalOpen && <LoginModal onLoginSuccess={handleLoginSuccess} />}

      {/* Header */}
      <Navbar
        session={session}
        onOpenLicense={() => setIsLicenseOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenExporter={() => setIsExportOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 pt-5 flex flex-col gap-6">
        {/* PixelBridge Active Session Bar */}
        {session && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-xs">
            <div className="flex items-center gap-2 text-stone-200">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping flex-shrink-0" />
              <span>
                <strong className="text-blue-400 font-semibold">PixelBridge Active</strong> | Account:{' '}
                <span className="text-white font-mono">{session.email}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsLicenseOpen(true)}
                className="text-[11px] text-pink-300 hover:text-pink-200 font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <Clock className="w-3 h-3 text-amber-400" />
                <span>License Status & Timer</span>
              </button>
              <span className="text-stone-600 hidden sm:inline">•</span>
              <button
                onClick={handleLogout}
                className="text-[11px] text-stone-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Switch / Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Presets & Theme Bar */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border text-xs ${
            profile.themeId === 'jungle_safari'
              ? 'bg-gradient-to-r from-emerald-950/60 via-stone-900 to-amber-950/40 border-emerald-500/30 text-emerald-200'
              : 'bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-stone-900 border border-pink-500/20 text-pink-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0 animate-pulse" />
            <span>
              Now editing:{' '}
              <strong className="text-white font-bold">{profile.name || 'Baby'}</strong> turning 1!{' '}
              <span className="text-pink-300 font-semibold">🎬 3D Pixar Video Active:</span> Tap video anytime to trigger theme sound effects & interactive emoji bursts!
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-stone-300 text-[11px] flex-wrap">
            <span className="text-stone-400 font-semibold mr-0.5">Quick Pixar Presets:</span>
            <button
              onClick={() => handleUpdateProfile(PRESET_PROFILES.jungle_boy)}
              className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                profile.themeId === 'jungle_safari' && profile.gender === 'boy'
                  ? 'bg-amber-500/30 border-amber-400 text-white font-bold'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
              }`}
            >
              🦁 Leo (Safari)
            </button>
            <button
              onClick={() => handleUpdateProfile(PRESET_PROFILES.jungle_girl)}
              className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                profile.themeId === 'jungle_safari' && profile.gender === 'girl'
                  ? 'bg-emerald-500/30 border-emerald-400 text-white font-bold'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
              }`}
            >
              🌿 Aneira (Safari)
            </button>
            <button
              onClick={() => handleUpdateProfile(PRESET_PROFILES.noah_space)}
              className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                profile.themeId === 'cosmic_space' && profile.gender === 'boy'
                  ? 'bg-indigo-500/30 border-indigo-400 text-white font-bold'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
              }`}
            >
              🚀 Noah (Space)
            </button>
            <button
              onClick={() => handleUpdateProfile(PRESET_PROFILES.seraphina_unicorn)}
              className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                profile.themeId === 'unicorn_rainbow'
                  ? 'bg-fuchsia-500/30 border-fuchsia-400 text-white font-bold'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
              }`}
            >
              🦄 Seraphina (Unicorn)
            </button>
            <button
              onClick={() => handleUpdateProfile(PRESET_PROFILES.kai_ocean)}
              className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                profile.themeId === 'under_sea' && profile.gender === 'boy'
                  ? 'bg-cyan-500/30 border-cyan-400 text-white font-bold'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
              }`}
            >
              🌊 Kai (Ocean)
            </button>
            <button
              onClick={() => handleUpdateProfile(PRESET_PROFILES.ethan_racing)}
              className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                profile.themeId === 'racing_champion'
                  ? 'bg-red-500/30 border-red-400 text-white font-bold'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
              }`}
            >
              🏎️ Ethan (Racer)
            </button>
            <button
              onClick={() => handleUpdateProfile(PRESET_PROFILES.liam)}
              className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                profile.themeId === 'royal_blue'
                  ? 'bg-blue-500/30 border-blue-400 text-white font-bold'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
              }`}
            >
              👑 Liam (Royal)
            </button>
            <button
              onClick={() => handleUpdateProfile(PRESET_PROFILES.mia_teddy)}
              className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                profile.themeId === 'teddy_clouds'
                  ? 'bg-amber-500/30 border-amber-400 text-white font-bold'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
              }`}
            >
              🧸 Mia (Teddy)
            </button>
            <button
              onClick={() => handleUpdateProfile(PRESET_PROFILES.kiara)}
              className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                profile.themeId === 'fairytale_pink'
                  ? 'bg-pink-500/30 border-pink-400 text-white font-bold'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
              }`}
            >
              🌸 Kiara (Princess)
            </button>
            <button
              onClick={() => handleUpdateProfile(PRESET_PROFILES.aria)}
              className={`px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-all ${
                profile.themeId === 'mint_safari'
                  ? 'bg-teal-500/30 border-teal-400 text-white font-bold'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white'
              }`}
            >
              🍃 Aria (Meadow)
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('tab-child-details');
                if (el) {
                  el.click();
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="px-2 py-0.5 rounded-md bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-[11px] cursor-pointer font-semibold"
            >
              + 7 More
            </button>
            <span className="text-stone-500 hidden md:inline">•</span>
            <span className="hidden md:inline">
              {profile.themeId === 'jungle_safari' ? '✨ 37s HD Video' : '✨ 38s 3D Motion'}
            </span>
            <span className="text-stone-500 hidden md:inline">•</span>
            <span className="hidden md:inline">📱 9:16 Reel</span>
          </div>
        </div>

        {/* Video Studio Section */}
        {session && (
          <section className="w-full">
            <VideoStudio
              profile={profile}
              config={config}
              onChangeConfig={handleUpdateConfig}
              onOpenExporter={() => setIsExportOpen(true)}
            />
          </section>
        )}

        {/* Editor Controls Section */}
        <section className="w-full max-w-4xl mx-auto">
          <EditorTabs
            profile={profile}
            config={config}
            onChangeProfile={handleUpdateProfile}
            onChangeConfig={handleUpdateConfig}
            onOpenExporter={() => setIsExportOpen(true)}
          />
        </section>
      </main>

      {/* License Modal */}
      {session && (
        <LicenseModal
          isOpen={isLicenseOpen}
          onClose={() => setIsLicenseOpen(false)}
          session={session}
          onLogout={handleLogout}
        />
      )}

      {/* Export HD Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        profile={profile}
        config={config}
        customUploadedImage={customPhotoImg}
      />
    </div>
  );
}
