/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Mic, Volume2, Sparkles, Play, Square, Loader2, Wand2, Music } from 'lucide-react';
import { BirthdayProfile, StudioConfig, BabyVoiceConfig } from '../types.ts';
import { audioEngine, synthesizeBabyVoice } from '../utils/audio.ts';
import { DEFAULT_BABY_VOICE } from '../constants/presets.ts';

interface BabyVoiceTabProps {
  profile: BirthdayProfile;
  config: StudioConfig;
  onChangeProfile: (newProfile: Partial<BirthdayProfile>) => void;
  onChangeConfig: (newConfig: Partial<StudioConfig>) => void;
  onOpenExporter: () => void;
}

export default function BabyVoiceTab({
  profile,
  config,
  onChangeProfile,
  onChangeConfig,
}: BabyVoiceTabProps) {
  const voice = config.babyVoice || DEFAULT_BABY_VOICE;

  const [generating, setGenerating] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptSuggestions, setScriptSuggestions] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const updateVoice = (partial: Partial<BabyVoiceConfig>) => {
    const updated = { ...voice, ...partial };
    onChangeConfig({ babyVoice: updated });
    onChangeProfile({ babyVoice: updated });
  };

  const getPresetScripts = (expression: string) => {
    const name = profile.name || 'Baby';
    switch (expression) {
      case 'funny':
        return [
          'Goo goo gaga! Guess who is eating the whole birthday cake with both hands today?! Me! No broccoli, only frosting!',
          `Attention party guests! This is Conductor ${name}! My official birthday rule: unlimited balloons and loud giggles!`,
          "I survived 365 days of drinking milk and tummy time! Now hand over the presents and let's boogie!",
        ];
      case 'cheerful':
        return [
          profile.themeId === 'jungle_safari'
            ? "Hi everyone! It's my birthday! Come join my jungle party! Let's go on an adventure!"
            : "Yay! It's my big 1st Birthday! The fairytale train has arrived and everyone is invited to celebrate with me!",
          'Welcome to my party! Thank you for loving me and sharing big warm hugs today! Let\'s eat lots of cake!',
          'Look at me, I am turning ONE today! Let\'s sing Happy Birthday and make magical memories!',
        ];
      case 'excited':
        return [
          profile.themeId === 'jungle_safari'
            ? 'Roar! Put on your safari hat! All aboard my jungle jeep, let\'s explore with lions, giraffes and elephants!'
            : 'Choo-choo! All aboard my magical 1st Birthday Express! Next stop: Fun town, balloons, and cake!',
          'Hooray! Today is the happiest day ever! Put on your party hats and dance with me!',
          'Beep beep! The celebration train is rolling in, and I cannot wait to see all my friends and family!',
        ];
      case 'cute_sweet':
        return [
          'Tank you for coming to my first birthday party. You make my heart sparkle with joy and sunshine!',
          'One whole year of sweet baby cuddles and kisses. Come blow out the shiny candle with me!',
          'I am still little, but my love for all of you is as big as the sky! Welcome to my party!',
        ];
      case 'royal_prince_princess':
        return [
          `Hear ye, hear ye! By royal decree of ${profile.gender === 'boy' ? 'Prince' : 'Princess'} ${name}, the 1st Birthday court is now open!`,
          'Welcome to our royal kingdom of sweets and laughter! Put on your crowns and let the celebration begin!',
          'The royal train carriage has arrived! Welcome honored guests to my grand 1st birthday gala!',
        ];
      case 'giggle_laugh':
        return [
          'Hehehehe! Peekaboo! Did you know I\'m already ONE year old?! Let\'s giggle, play, and eat treats!',
          'Tee-hee! Tickles, hugs, and big cake smiles! Come play peekaboo with me at my birthday party!',
          'Giggle giggle! The train goes chugga chugga and I go woohoo! See you at my party!',
        ];
      default:
        return [
          "Goo goo gaga! Choo-choo! Welcome to my 1st Birthday party! Come eat cake with me and dance all day!",
        ];
    }
  };

  const handleGenerateScriptAI = async () => {
    setGeneratingScript(true);
    try {
      const res = await fetch('/api/gemini/generate-baby-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          age: profile.age,
          expression: voice.expression,
          gender: profile.gender,
        }),
      });
      const data = await res.json();
      if (data.scripts && data.scripts.length > 0) {
        setScriptSuggestions(data.scripts);
      } else {
        setScriptSuggestions(getPresetScripts(voice.expression));
      }
    } catch (e) {
      console.warn('Script gen fallback', e);
      setScriptSuggestions(getPresetScripts(voice.expression));
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleGenerateVoice = async () => {
    if (!voice.script.trim()) return;
    setGenerating(true);
    setStatusMessage(null);

    try {
      // First try backend Gemini TTS
      const res = await fetch('/api/gemini/generate-baby-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: voice.script,
          expression: voice.expression,
          tone: voice.tone,
          pitch: voice.pitch,
          intensity: voice.intensity,
          speed: voice.speed,
          childName: profile.name,
          gender: profile.gender,
        }),
      });
      const data = await res.json();

      if (data.success && data.audioDataUrl) {
        const audioBuffer = await audioEngine.loadVoiceAudio(data.audioDataUrl);
        const duration = audioBuffer ? audioBuffer.duration : 7;
        updateVoice({ audioUrl: data.audioDataUrl, audioDuration: duration });
        setStatusMessage('✨ AI Baby Voice generated successfully and added to video background!');
        setTimeout(() => setStatusMessage(null), 5000);

        audioEngine.previewVoice(data.audioDataUrl, voice.pitch, voice.speed, voice.intensity, () => {
          setIsPlayingPreview(false);
        });
        setIsPlayingPreview(true);
        return;
      }

      // Offline / client synthesized fallback
      const syn = await synthesizeBabyVoice(voice.script, voice.pitch, voice.speed, voice.intensity);
      updateVoice({ audioUrl: syn.audioUrl, audioDuration: syn.duration });
      setStatusMessage('✨ High-Definition Baby Voice generated and synchronized with video!');
      setTimeout(() => setStatusMessage(null), 5000);

      audioEngine.previewVoice(syn.audioUrl, voice.pitch, voice.speed, voice.intensity, () => {
        setIsPlayingPreview(false);
      });
      setIsPlayingPreview(true);
    } catch (err) {
      console.error('Voice generation error:', err);
      // Fallback
      const syn = await synthesizeBabyVoice(voice.script, voice.pitch, voice.speed, voice.intensity);
      updateVoice({ audioUrl: syn.audioUrl, audioDuration: syn.duration });
      setStatusMessage('✨ Baby Voice synthesized and synchronized with celebration video!');
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setGenerating(false);
    }
  };

  const togglePreview = async () => {
    await audioEngine.unlockAudio();
    if (isPlayingPreview) {
      audioEngine.stopVoice();
      setIsPlayingPreview(false);
    } else {
      if (voice.audioUrl) {
        audioEngine.previewVoice(voice.audioUrl, voice.pitch, voice.speed, voice.intensity, () => {
          setIsPlayingPreview(false);
        });
        setIsPlayingPreview(true);
      } else {
        handleGenerateVoice();
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-stone-900/90 backdrop-blur-xl p-4 sm:p-6 rounded-2xl border border-stone-800 shadow-xl text-stone-200">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20 flex-shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">AI Baby Voice Generator</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                Studio Audio
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Create an adorable talking baby voiceover that speaks your child's 1st birthday invitation!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              checked={voice.enabled}
              onChange={(e) => updateVoice({ enabled: e.target.checked })}
              className="w-4 h-4 rounded text-pink-500 focus:ring-pink-500 accent-pink-500 cursor-pointer"
            />
            <span>Enable in Video</span>
          </label>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Script Textarea & AI Suggestion */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Baby Speech Script</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateScriptAI}
              disabled={generatingScript}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-semibold transition-all cursor-pointer"
            >
              {generatingScript ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating AI Ideas...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Get AI Script Ideas</span>
                </>
              )}
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          value={voice.script}
          onChange={(e) => updateVoice({ script: e.target.value })}
          placeholder="Enter the words your baby will say..."
          className="w-full px-3.5 py-2.5 bg-stone-800/80 rounded-xl border border-stone-700 focus:border-pink-500 focus:outline-none text-sm text-stone-100 placeholder-stone-500 leading-relaxed"
        />

        {/* Script suggestions chips */}
        {scriptSuggestions.length > 0 && (
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-stone-950/60 border border-stone-800">
            <span className="text-[11px] font-bold text-amber-300">Tap to use suggested script:</span>
            <div className="flex flex-col gap-1.5">
              {scriptSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => updateVoice({ script: s })}
                  className="text-left text-xs text-stone-300 hover:text-white bg-stone-800/60 hover:bg-stone-700/60 p-2 rounded-lg border border-stone-700/60 transition-colors cursor-pointer"
                >
                  "{s}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Voice Style and Tone Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-stone-300">Vocal Expression</label>
          <select
            value={voice.expression}
            onChange={(e) => {
              const val = e.target.value;
              updateVoice({ expression: val });
              setScriptSuggestions(getPresetScripts(val));
            }}
            className="w-full px-3 py-2 bg-stone-800 rounded-xl border border-stone-700 text-xs text-stone-200 focus:border-pink-500 focus:outline-none cursor-pointer"
          >
            <option value="cheerful">Cheerful & Welcoming</option>
            <option value="excited">Excited & Bubbly (Choo-choo / Roar)</option>
            <option value="cute_sweet">Sweet & Gentle Princess/Prince</option>
            <option value="royal_prince_princess">Royal Decree & Palace Host</option>
            <option value="funny">Funny & Playful (Cake eating)</option>
            <option value="giggle_laugh">Baby Giggles & Peekaboo</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-stone-300">Cadence / Tone</label>
          <select
            value={voice.tone}
            onChange={(e) => updateVoice({ tone: e.target.value })}
            className="w-full px-3 py-2 bg-stone-800 rounded-xl border border-stone-700 text-xs text-stone-200 focus:border-pink-500 focus:outline-none cursor-pointer"
          >
            <option value="playful_toddler">Playful Toddler (1-2 Year Old)</option>
            <option value="sweet_fairytale">Sweet Fairytale Bell Voice</option>
            <option value="royal_cherub">Royal Cherub Express</option>
          </select>
        </div>
      </div>

      {/* Voice Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-stone-800/80">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Pitch (Baby formant)</span>
            <span className="font-mono text-pink-400">{voice.pitch.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.9"
            max="1.8"
            step="0.05"
            value={voice.pitch}
            onChange={(e) => updateVoice({ pitch: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Talking Speed</span>
            <span className="font-mono text-pink-400">{voice.speed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.3"
            step="0.05"
            value={voice.speed}
            onChange={(e) => updateVoice({ speed: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Energy & Laugh</span>
            <span className="font-mono text-pink-400">{voice.intensity}%</span>
          </div>
          <input
            type="range"
            min="40"
            max="100"
            step="5"
            value={voice.intensity}
            onChange={(e) => updateVoice({ intensity: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
        </div>
      </div>

      {/* Timing and Ducking Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-stone-950/60 rounded-xl border border-stone-800">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-stone-400 flex items-center gap-1">
              <Music className="w-3 h-3 text-amber-400" />
              <span>Lower music while baby speaks (Ducking)</span>
            </span>
            <span className="font-mono text-amber-300">
              {Math.round((voice.bgMusicDucking ?? 0.35) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.8"
            step="0.05"
            value={voice.bgMusicDucking ?? 0.35}
            onChange={(e) => updateVoice({ bgMusicDucking: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-stone-400">Starts speaking in video at:</span>
            <span className="font-mono text-pink-400">{voice.startDelay || 1}s</span>
          </div>
          <input
            type="range"
            min="0"
            max="6"
            step="0.5"
            value={voice.startDelay || 1}
            onChange={(e) => updateVoice({ startDelay: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
        <button
          type="button"
          onClick={togglePreview}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold transition-all cursor-pointer"
        >
          {isPlayingPreview ? (
            <>
              <Square className="w-3.5 h-3.5 text-rose-400 fill-current" />
              <span>Stop Preview</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              <span>Test Voice Preview</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleGenerateVoice}
          disabled={generating || !voice.script.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-pink-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Synthesizing Voice...</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              <span>Generate & Apply Baby Voice</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
