/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import {
  Mic,
  Sparkles,
  Calendar,
  MapPin,
  Users,
  FileSpreadsheet,
  Upload,
  Trash2,
  Wand2,
  Clock,
  Heart,
  Palette,
  Loader2,
} from 'lucide-react';
import { BirthdayProfile, StudioConfig } from '../types.ts';
import { PRESET_PROFILES, THEMES, THEME_VIDEOS } from '../constants/presets.ts';
import BabyVoiceTab from './BabyVoiceTab.tsx';
import GoogleSheetsTab from './GoogleSheetsTab.tsx';

interface EditorTabsProps {
  profile: BirthdayProfile;
  config: StudioConfig;
  onChangeProfile: (newProfile: Partial<BirthdayProfile>) => void;
  onChangeConfig: (newConfig: Partial<StudioConfig>) => void;
  onOpenExporter: () => void;
}

export default function EditorTabs({
  profile,
  config,
  onChangeProfile,
  onChangeConfig,
  onOpenExporter,
}: EditorTabsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'voice' | 'details' | 'venue' | 'visuals' | 'sheets'>('voice');
  const [presetFilter, setPresetFilter] = useState<'all' | 'boy' | 'girl'>('all');
  const [generatingVerse, setGeneratingVerse] = useState(false);
  const [verseNotification, setVerseNotification] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      onChangeProfile({ photoUrl: res, avatarMode: 'photo_frame' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    onChangeProfile({ photoUrl: null, avatarMode: '3d_doll' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateVerseAI = async () => {
    setGeneratingVerse(true);
    setVerseNotification(null);
    try {
      const res = await fetch('/api/gemini/generate-verse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          age: profile.age,
          gender: profile.gender,
          theme: profile.themeId,
        }),
      });
      const data = await res.json();
      if (data.verse) {
        onChangeProfile({
          customVerse: data.verse,
          invitationNote: data.subline || profile.invitationNote,
        });
        setVerseNotification('✨ AI Verse applied to celebration invitation!');
        setTimeout(() => setVerseNotification(null), 4000);
      }
    } catch (e) {
      console.error(e);
      onChangeProfile({
        customVerse: `All aboard the celebration express! Sweet dreams and giggles we confess, as our precious ${profile.name || 'star'} turns ONE today!`,
      });
    } finally {
      setGeneratingVerse(false);
    }
  };

  const applyPreset = (key: string) => {
    const p = PRESET_PROFILES[key];
    if (p) {
      onChangeProfile({ ...p });
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-stone-900/90 backdrop-blur-xl rounded-2xl border border-stone-800 shadow-xl overflow-x-auto scrollbar-none">
        <button
          id="tab-baby-voice-generator"
          type="button"
          onClick={() => setActiveTab('voice')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'voice'
              ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white shadow-lg shadow-pink-500/25 scale-[1.02]'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>🎙️ Baby Voice Generator</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/30 text-amber-200 uppercase tracking-wider font-extrabold">
            Featured
          </span>
        </button>

        <button
          id="tab-child-details"
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'details'
              ? 'bg-pink-500/25 text-pink-200 border border-pink-500/50 shadow-md'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
          }`}
        >
          <Heart className="w-4 h-4 text-pink-400" />
          <span>Baby Photo & Star</span>
        </button>

        <button
          id="tab-event-venue"
          type="button"
          onClick={() => setActiveTab('venue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'venue'
              ? 'bg-pink-500/25 text-pink-200 border border-pink-500/50 shadow-md'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-400" />
          <span>Date, Time & Venue</span>
        </button>

        <button
          id="tab-visual-effects"
          type="button"
          onClick={() => setActiveTab('visuals')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'visuals'
              ? 'bg-pink-500/25 text-pink-200 border border-pink-500/50 shadow-md'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Sparkles & Rhyme</span>
        </button>

        <button
          id="tab-google-sheets"
          type="button"
          onClick={() => setActiveTab('sheets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'sheets'
              ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/50 shadow-md shadow-emerald-500/10'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>📊 Google Sheets & RSVPs</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold uppercase">
            Drive
          </span>
        </button>
      </div>

      {/* Tab 1: Baby Voice Generator */}
      {activeTab === 'voice' && (
        <BabyVoiceTab
          profile={profile}
          config={config}
          onChangeProfile={onChangeProfile}
          onChangeConfig={onChangeConfig}
          onOpenExporter={onOpenExporter}
        />
      )}

      {/* Tab 2: Child Details & Presets */}
      {activeTab === 'details' && (
        <div className="flex flex-col gap-6 bg-stone-900/90 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-stone-800 shadow-xl text-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-400" />
                <span>Birthday Star & Photo</span>
              </h3>
              <p className="text-xs text-stone-400">
                Personalize the name, age, and attach a picture of your child for the 3D animated floral frame.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Select Video Preset:
                </span>
                <div className="flex items-center gap-1 bg-stone-950/60 p-0.5 rounded-lg border border-stone-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPresetFilter('all')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      presetFilter === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    All (13)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetFilter('boy')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      presetFilter === 'boy' ? 'bg-blue-600 text-white shadow-sm' : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    👦 Boys (6)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetFilter('girl')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      presetFilter === 'girl' ? 'bg-pink-600 text-white shadow-sm' : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    👧 Girls (7)
                  </button>
                </div>
              </div>

              {/* Preset Chips */}
              <div className="flex items-center gap-1.5 flex-wrap max-h-36 overflow-y-auto pr-1">
                {(presetFilter === 'all' || presetFilter === 'boy') && (
                  <>
                    <button
                      type="button"
                      onClick={() => applyPreset('jungle_boy')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        profile.themeId === 'jungle_safari' && profile.gender === 'boy'
                          ? 'bg-amber-500/25 text-amber-200 border-amber-500/80 font-bold shadow-md shadow-amber-500/10'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700/60'
                      }`}
                    >
                      <span>🦁 Leo (Jungle 3D)</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-extrabold uppercase">
                        3D Video
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('noah_space')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        profile.themeId === 'cosmic_space' && profile.gender === 'boy'
                          ? 'bg-indigo-500/25 text-indigo-200 border-indigo-500/80 font-bold shadow-md shadow-indigo-500/10'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700/60'
                      }`}
                    >
                      <span>🚀 Noah (Cosmic Space)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('liam')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        profile.themeId === 'royal_blue'
                          ? 'bg-blue-500/25 text-blue-200 border-blue-500/80 font-bold shadow-md shadow-blue-500/10'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700/60'
                      }`}
                    >
                      <span>👑 Liam (Royal Express)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('kai_ocean')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        profile.themeId === 'under_sea' && profile.gender === 'boy'
                          ? 'bg-cyan-500/25 text-cyan-200 border-cyan-500/80 font-bold shadow-md shadow-cyan-500/10'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700/60'
                      }`}
                    >
                      <span>🌊 Kai (Ocean Explorer)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('oliver_teddy')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        profile.themeId === 'teddy_clouds' && profile.gender === 'boy'
                          ? 'bg-amber-500/25 text-amber-200 border-amber-500/80 font-bold shadow-md shadow-amber-500/10'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700/60'
                      }`}
                    >
                      <span>☁️ Oliver (Cloud Balloon)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('ethan_racing')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        profile.themeId === 'racing_champion'
                          ? 'bg-red-500/25 text-red-200 border-red-500/80 font-bold shadow-md shadow-red-500/10'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700/60'
                      }`}
                    >
                      <span>🏎️ Ethan (Grand Prix)</span>
                    </button>
                  </>
                )}

                {(presetFilter === 'all' || presetFilter === 'girl') && (
                  <>
                    <button
                      type="button"
                      onClick={() => applyPreset('jungle_girl')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        profile.themeId === 'jungle_safari' && profile.gender === 'girl'
                          ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/80 font-bold shadow-md shadow-emerald-500/10'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700/60'
                      }`}
                    >
                      <span>🌿 Aneira (Jungle 3D)</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-extrabold uppercase">
                        3D Video
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('kiara')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        profile.themeId === 'fairytale_pink'
                          ? 'bg-pink-500/25 text-pink-200 border-pink-500/80 font-bold shadow-md shadow-pink-500/10'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700/60'
                      }`}
                    >
                      <span>🌸 Kiara (Fairytale Pink)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('seraphina_unicorn')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        profile.themeId === 'unicorn_rainbow'
                          ? 'bg-fuchsia-500/25 text-fuchsia-200 border-fuchsia-500/80 font-bold shadow-md shadow-fuchsia-500/10'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700/60'
                      }`}
                    >
                      <span>🦄 Seraphina (Rainbow Unicorn)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('marina_ocean')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        profile.themeId === 'under_sea' && profile.gender === 'girl'
                          ? 'bg-cyan-500/25 text-cyan-200 border-cyan-500/80 font-bold shadow-md shadow-cyan-500/10'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700/60'
                      }`}
                    >
                      <span>🐬 Marina (Mermaid Cove)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('mia_teddy')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        profile.themeId === 'teddy_clouds' && profile.gender === 'girl'
                          ? 'bg-pink-500/25 text-pink-200 border-pink-500/80 font-bold shadow-md shadow-pink-500/10'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700/60'
                      }`}
                    >
                      <span>☁️ Mia (Pastel Teddy)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('stella_space')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        profile.themeId === 'cosmic_space' && profile.gender === 'girl'
                          ? 'bg-purple-500/25 text-purple-200 border-purple-500/80 font-bold shadow-md shadow-purple-500/10'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700/60'
                      }`}
                    >
                      <span>⭐ Stella (Starlight Galaxy)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('aria')}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        profile.themeId === 'mint_safari'
                          ? 'bg-teal-500/25 text-teal-200 border-teal-500/80 font-bold shadow-md shadow-teal-500/10'
                          : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700/60'
                      }`}
                    >
                      <span>🍃 Aria (Mint Meadow)</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Child Details Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="child-name-input" className="text-xs font-semibold text-stone-300">
                Child's Name
              </label>
              <input
                id="child-name-input"
                type="text"
                value={profile.name}
                onChange={(e) => onChangeProfile({ name: e.target.value })}
                placeholder="e.g. Aneira / Kiara / Leo"
                className="w-full px-3 py-2 bg-stone-800/80 rounded-xl border border-stone-700 focus:border-pink-500 focus:outline-none text-sm text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-300">Turning Age</label>
              <select
                value={profile.age}
                onChange={(e) => onChangeProfile({ age: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-stone-800/80 rounded-xl border border-stone-700 focus:border-pink-500 focus:outline-none text-xs text-white"
              >
                <option value={1}>1 Year Old (Turning ONE!)</option>
                <option value={2}>2 Years Old</option>
                <option value={3}>3 Years Old</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-300">Theme Styling</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChangeProfile({ gender: 'girl' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    profile.gender === 'girl'
                      ? 'bg-pink-600/30 border-pink-500 text-pink-200'
                      : 'bg-stone-800 border-stone-700 text-stone-400'
                  }`}
                >
                  👧 Princess / Girl
                </button>
                <button
                  type="button"
                  onClick={() => onChangeProfile({ gender: 'boy' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    profile.gender === 'boy'
                      ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                      : 'bg-stone-800 border-stone-700 text-stone-400'
                  }`}
                >
                  👦 Prince / Boy
                </button>
              </div>
            </div>
          </div>

          {/* Child Photo Attachment Section */}
          <div className="flex flex-col gap-2 p-4 bg-stone-950/60 rounded-2xl border border-stone-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Child Photo in 3D Motion Frame
                </h4>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Upload a clear portrait photo. It will be framed with a golden floral wreath and crown!
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-4 mt-2">
              {profile.photoUrl ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md">
                  <img src={profile.photoUrl} alt="Baby" className="w-full h-full object-cover" />
                  <button
                    onClick={handleRemovePhoto}
                    className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow"
                    title="Remove custom photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-stone-800/80 border-2 border-dashed border-stone-700 flex flex-col items-center justify-center text-stone-500 text-[10px] text-center p-1">
                  <span>3D Doll Animated</span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-pink-600/20"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{profile.photoUrl ? 'Replace Photo' : 'Upload Child Photo'}</span>
                </button>
                {profile.photoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-stone-400 hover:text-rose-300 text-xs text-left cursor-pointer transition-colors"
                  >
                    Revert to 3D Character
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Theme Selector Grid */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              <span>Select Celebration Theme</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {THEMES.map((th) => {
                const isSelected = profile.themeId === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      onChangeProfile({
                        themeId: th.id,
                        videoSource: THEME_VIDEOS[th.id],
                      });
                    }}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? `bg-gradient-to-br ${th.gradient} ${th.borderColor} shadow-lg ring-1 ring-white/20`
                        : 'bg-stone-800/50 border-stone-700/60 hover:bg-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{th.emoji}</span>
                        <span>{th.name}</span>
                      </span>
                      {th.hasVideoMotion && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold uppercase">
                          3D Video
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-400">{th.subline}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Date, Time & Venue */}
      {activeTab === 'venue' && (
        <div className="flex flex-col gap-6 bg-stone-900/90 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-stone-800 shadow-xl text-stone-200">
          <div className="pb-3 border-b border-stone-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>Event Details, Time & Venue</span>
            </h3>
            <p className="text-xs text-stone-400">
              Displayed across the train carriages and the final blessing invitation card.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-date-input" className="text-xs font-semibold text-stone-300 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-stone-400" />
                <span>Celebration Date</span>
              </label>
              <input
                id="event-date-input"
                type="text"
                value={profile.date}
                onChange={(e) => onChangeProfile({ date: e.target.value })}
                placeholder="e.g. 15 June 2026"
                className="w-full px-3 py-2 bg-stone-800/80 rounded-xl border border-stone-700 focus:border-pink-500 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-time-input" className="text-xs font-semibold text-stone-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400" />
                <span>Time</span>
              </label>
              <input
                id="event-time-input"
                type="text"
                value={profile.time}
                onChange={(e) => onChangeProfile({ time: e.target.value })}
                placeholder="e.g. 6:00 PM onwards"
                className="w-full px-3 py-2 bg-stone-800/80 rounded-xl border border-stone-700 focus:border-pink-500 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="venue-name-input" className="text-xs font-semibold text-stone-300 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-stone-400" />
                <span>Venue Name</span>
              </label>
              <input
                id="venue-name-input"
                type="text"
                value={profile.venueName}
                onChange={(e) => onChangeProfile({ venueName: e.target.value })}
                placeholder="e.g. Little Stars Party Hall"
                className="w-full px-3 py-2 bg-stone-800/80 rounded-xl border border-stone-700 focus:border-pink-500 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="venue-address-input" className="text-xs font-semibold text-stone-300">
                Venue Address / Area
              </label>
              <input
                id="venue-address-input"
                type="text"
                value={profile.venueAddress}
                onChange={(e) => onChangeProfile({ venueAddress: e.target.value })}
                placeholder="e.g. Satellite Road, Ahmedabad"
                className="w-full px-3 py-2 bg-stone-800/80 rounded-xl border border-stone-700 focus:border-pink-500 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="parents-names-input" className="text-xs font-semibold text-stone-300 flex items-center gap-1">
                <Users className="w-3 h-3 text-stone-400" />
                <span>Parents' Names (Sign-off Card)</span>
              </label>
              <input
                id="parents-names-input"
                type="text"
                value={profile.parentsNames}
                onChange={(e) => onChangeProfile({ parentsNames: e.target.value })}
                placeholder="e.g. Mr. Rohan Patel & Mrs. Priya Patel"
                className="w-full px-3 py-2 bg-stone-800/80 rounded-xl border border-stone-700 focus:border-pink-500 text-sm text-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Sparkles & Rhyme */}
      {activeTab === 'visuals' && (
        <div className="flex flex-col gap-6 bg-stone-900/90 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-stone-800 shadow-xl text-stone-200">
          <div className="pb-3 border-b border-stone-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Sparkles, Rhyme & Invitation Message</span>
            </h3>
            <p className="text-xs text-stone-400">
              Customize golden sparkles intensity and custom celebratory rhymes.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                <span>Celebration Rhyme (Scene 4 & 7)</span>
              </label>
              <button
                id="generate-ai-verse-btn"
                type="button"
                onClick={handleGenerateVerseAI}
                disabled={generatingVerse}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/20 text-pink-300 hover:text-white border border-pink-500/40 text-xs font-semibold hover:bg-pink-500/30 transition-all cursor-pointer"
              >
                {generatingVerse ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Crafting AI Rhyme...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Generate Custom AI Rhyme</span>
                  </>
                )}
              </button>
            </div>

            {verseNotification && (
              <p className="text-xs text-emerald-400 font-medium">{verseNotification}</p>
            )}

            <textarea
              id="custom-verse-textarea"
              rows={2}
              value={profile.customVerse}
              onChange={(e) => onChangeProfile({ customVerse: e.target.value })}
              className="w-full px-3 py-2 bg-stone-800/80 rounded-xl border border-stone-700 focus:border-pink-500 text-xs text-stone-200 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Golden Star Sparkles Intensity</span>
            </span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={config.sparkleIntensity}
                onChange={(e) => onChangeConfig({ sparkleIntensity: parseInt(e.target.value) })}
                className="w-32 h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="font-mono text-xs text-amber-300 w-8">{config.sparkleIntensity}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Google Sheets & RSVPs */}
      {activeTab === 'sheets' && (
        <GoogleSheetsTab profile={profile} onChangeProfile={onChangeProfile} />
      )}
    </div>
  );
}
