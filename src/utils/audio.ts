/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BabyVoiceConfig } from '../types.ts';

class SoundEngine {
  private ctx: AudioContext | null = null;
  public isPlaying = false;
  public currentTrack = 'fairytale_box';
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted = false;
  private masterVolume = 0.85;
  private voiceBuffer: AudioBuffer | null = null;
  private voiceSource: AudioBufferSourceNode | null = null;
  private currentVoiceUrl: string | null = null;
  public isVoicePlaying = false;
  private activeMusicNodes: { osc: OscillatorNode; gain: GainNode }[] = [];

  constructor() {
    this.attachUserGestureListener();
  }

  private attachUserGestureListener() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.unlockAudio();
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
  }

  public initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx({ sampleRate: 24000 });
      } catch {
        try {
          this.ctx = new AudioCtx();
        } catch {
          return null;
        }
      }

      try {
        this.destinationNode = this.ctx.createMediaStreamDestination();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

        this.voiceGain = this.ctx.createGain();
        this.voiceGain.gain.setValueAtTime(0.95, this.ctx.currentTime);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

        this.musicGain.connect(this.masterGain);
        this.voiceGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);

        this.masterGain.connect(this.ctx.destination);
        this.masterGain.connect(this.destinationNode);
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  public async unlockAudio(): Promise<boolean> {
    try {
      const ctx = this.initContext();
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }
      return ctx?.state === 'running';
    } catch {
      return false;
    }
  }

  public getAudioStreamDestination(): MediaStreamAudioDestinationNode | null {
    this.initContext();
    return this.destinationNode;
  }

  public setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private pcm16ToAudioBuffer(arrayBuffer: ArrayBuffer, sampleRate = 24000): AudioBuffer | null {
    if (!this.ctx) return null;
    try {
      let data = arrayBuffer;
      const u8 = new Uint8Array(arrayBuffer);
      if (u8.length >= 44 && u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46) {
        data = arrayBuffer.slice(44);
      }
      const int16 = new Int16Array(data);
      const audioBuffer = this.ctx.createBuffer(1, int16.length, sampleRate);
      const channel = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16.length; i++) {
        channel[i] = int16[i] / 32768.0;
      }
      return audioBuffer;
    } catch (e) {
      console.warn('Direct 24kHz PCM decode failed:', e);
      return null;
    }
  }

  public async loadVoiceAudio(url: string): Promise<AudioBuffer | null> {
    this.initContext();
    if (!this.ctx) return null;
    if (this.currentVoiceUrl === url && this.voiceBuffer) {
      return this.voiceBuffer;
    }

    try {
      let arrayBuffer: ArrayBuffer;
      if (url.startsWith('data:')) {
        const base64 = url.split(',')[1];
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        const res = await fetch(url);
        arrayBuffer = await res.arrayBuffer();
      }

      let audioBuffer: AudioBuffer | null = null;
      try {
        audioBuffer = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
      } catch {
        audioBuffer = this.pcm16ToAudioBuffer(arrayBuffer, 24000);
      }

      if (!audioBuffer) {
        audioBuffer = this.pcm16ToAudioBuffer(arrayBuffer, 24000);
      }

      if (audioBuffer) {
        this.voiceBuffer = audioBuffer;
        this.currentVoiceUrl = url;
      }
      return audioBuffer;
    } catch (err) {
      console.warn('Failed to decode voice audio:', err);
      return null;
    }
  }

  public stopVoice() {
    if (this.voiceSource) {
      try {
        this.voiceSource.stop();
        this.voiceSource.disconnect();
      } catch {}
      this.voiceSource = null;
    }
    this.isVoicePlaying = false;
  }

  public async previewVoice(url: string, _pitch = 1, speed = 1, _intensity = 85, onEnded?: () => void) {
    this.initContext();
    if (!this.ctx || !this.voiceGain) return;
    this.stopVoice();
    if (!url) return;

    const buffer = await this.loadVoiceAudio(url);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const playSpeed = Math.max(0.7, Math.min(1.4, speed || 1.0));
    source.playbackRate.setValueAtTime(playSpeed, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.95, this.ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(this.voiceGain);

    this.voiceSource = source;
    this.isVoicePlaying = true;

    source.onended = () => {
      this.isVoicePlaying = false;
      if (onEnded) onEnded();
    };

    source.start(0);
  }

  public syncPlayback(currentTime: number, isPlaying: boolean, trackName: string, babyVoice?: BabyVoiceConfig) {
    if (!isPlaying) {
      this.stopMusic();
      this.stopVoice();
      return;
    }

    if (!this.ctx || this.ctx.state !== 'running') return;

    if (!this.isPlaying || this.currentTrack !== trackName) {
      this.startMusicLoop(trackName, currentTime);
    }

    if (babyVoice && babyVoice.enabled && babyVoice.audioUrl) {
      const startDelay = babyVoice.startDelay || 1;
      const duration = babyVoice.audioDuration || 7;
      const isInWindow = currentTime >= startDelay && currentTime < startDelay + duration;

      if (this.musicGain) {
        const targetVol = isInWindow ? (babyVoice.bgMusicDucking ?? 0.35) : 0.7;
        this.musicGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
      }

      if (isInWindow) {
        if (!this.isVoicePlaying) {
          const offset = currentTime - startDelay;
          this.startVoiceAtOffset(babyVoice, offset);
        }
      } else {
        if (this.isVoicePlaying) {
          this.stopVoice();
        }
      }
    } else {
      if (this.musicGain) {
        this.musicGain.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.1);
      }
      this.stopVoice();
    }
  }

  public async startVoiceAtOffset(babyVoice: BabyVoiceConfig, offset: number) {
    if (!babyVoice.audioUrl || !this.ctx || !this.voiceGain) return;
    this.stopVoice();

    const buffer = await this.loadVoiceAudio(babyVoice.audioUrl);
    if (!buffer) return;

    if (offset >= buffer.duration) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const playSpeed = Math.max(0.7, Math.min(1.4, babyVoice.speed || 1.0));
    source.playbackRate.setValueAtTime(playSpeed, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(babyVoice.voiceVolume ?? 0.95, this.ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(this.voiceGain);

    this.voiceSource = source;
    this.isVoicePlaying = true;

    source.onended = () => {
      this.isVoicePlaying = false;
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.15);
      }
    };

    source.start(0, Math.max(0, offset));
  }

  public playBellTone(freq: number, startTime: number, duration = 1.2, detune = 0) {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.detune.setValueAtTime(detune, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(startTime);
    osc.stop(startTime + duration);

    this.activeMusicNodes.push({ osc, gain });

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(0.05, startTime + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.6);

    osc2.connect(gain2);
    gain2.connect(this.musicGain);

    osc2.start(startTime);
    osc2.stop(startTime + duration * 0.6);

    this.activeMusicNodes.push({ osc: osc2, gain: gain2 });
  }

  public playWhistle() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const freqs = [587.33, 739.99, 880.0];

    freqs.forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.02, now + 0.35);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 1.2);
    });
  }

  public playBabyGiggle() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const giggles = [
      { t: 0, f: 580, d: 0.12 },
      { t: 0.14, f: 650, d: 0.11 },
      { t: 0.28, f: 720, d: 0.13 },
      { t: 0.44, f: 800, d: 0.16 },
      { t: 0.62, f: 680, d: 0.2 },
    ];

    giggles.forEach((g) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(g.f, now + g.t);
      osc.frequency.exponentialRampToValueAtTime(g.f * 1.25, now + g.t + g.d);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(g.f * 1.5, now + g.t);
      filter.Q.setValueAtTime(3.0, now + g.t);

      gain.gain.setValueAtTime(0, now + g.t);
      gain.gain.linearRampToValueAtTime(0.22, now + g.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + g.t + g.d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + g.t);
      osc.stop(now + g.t + g.d);
    });
  }

  public playMagicBurst() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.05 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.45);
    });
  }

  public playPartyCheer() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Celebration fanfare chord: C5, E5, G5, C6
    [523.25, 659.25, 783.99, 1046.5].forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.95);
    });
  }

  public playBubblePop() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.09);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playThemeSFX(themeId: string) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    switch (themeId) {
      case 'cosmic_space': {
        // Rocket thruster sweep & star twinkle
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.5);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.linearRampToValueAtTime(2600, now + 0.5);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.7);

        // Starlight chime
        [1046.5, 1318.5, 1567.98].forEach((f, i) => {
          if (!this.ctx || !this.sfxGain) return;
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(f, now + 0.25 + i * 0.08);
          g.gain.setValueAtTime(0.12, now + 0.25 + i * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.65 + i * 0.08);
          o.connect(g);
          g.connect(this.sfxGain);
          o.start(now + 0.25 + i * 0.08);
          o.stop(now + 0.7 + i * 0.08);
        });
        break;
      }

      case 'racing_champion': {
        // Vroom speedway engine rev
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.35);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.7);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.24, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.8);
        break;
      }

      case 'royal_blue': {
        // Royal fanfare
        const fanfare = [392.0, 523.25, 659.25, 783.99];
        fanfare.forEach((f, i) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now + i * 0.12);
          gain.gain.setValueAtTime(0.01, now + i * 0.12);
          gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.45);
        });
        break;
      }

      case 'under_sea': {
        // Bubble cascade
        [360, 480, 620, 840, 1100].forEach((f, i) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.07);
          osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + i * 0.07 + 0.06);
          gain.gain.setValueAtTime(0.15, now + i * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.12);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.14);
        });
        break;
      }

      case 'unicorn_rainbow':
      case 'fairytale_pink': {
        this.playMagicBurst();
        break;
      }

      case 'teddy_clouds': {
        // Lullaby chime
        [523.25, 659.25, 783.99, 987.77].forEach((f, i) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.14);
          gain.gain.setValueAtTime(0.15, now + i * 0.14);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.6);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now + i * 0.14);
          osc.stop(now + i * 0.14 + 0.65);
        });
        break;
      }

      case 'mint_safari':
      case 'jungle_safari':
      default: {
        this.playBabyGiggle();
        break;
      }
    }
  }

  public startMusicLoop(trackName: string, startOffset = 0) {
    if (trackName === 'none') {
      this.stopMusic();
      return;
    }
    this.initContext();
    this.stopMusic();

    this.currentTrack = trackName;
    this.isPlaying = true;

    // Happy Birthday & Lullaby music box score
    const melody = [
      { note: 523.25, beat: 0, dur: 0.4 },
      { note: 523.25, beat: 0.5, dur: 0.4 },
      { note: 587.33, beat: 1.0, dur: 0.8 },
      { note: 523.25, beat: 2.0, dur: 0.8 },
      { note: 698.46, beat: 3.0, dur: 0.8 },
      { note: 659.25, beat: 4.0, dur: 1.4 },

      { note: 523.25, beat: 6.0, dur: 0.4 },
      { note: 523.25, beat: 6.5, dur: 0.4 },
      { note: 587.33, beat: 7.0, dur: 0.8 },
      { note: 523.25, beat: 8.0, dur: 0.8 },
      { note: 783.99, beat: 9.0, dur: 0.8 },
      { note: 698.46, beat: 10.0, dur: 1.4 },

      { note: 523.25, beat: 12.0, dur: 0.4 },
      { note: 523.25, beat: 12.5, dur: 0.4 },
      { note: 1046.50, beat: 13.0, dur: 0.8 },
      { note: 880.00, beat: 14.0, dur: 0.8 },
      { note: 698.46, beat: 15.0, dur: 0.8 },
      { note: 659.25, beat: 16.0, dur: 0.8 },
      { note: 587.33, beat: 17.0, dur: 1.2 },

      { note: 932.33, beat: 19.0, dur: 0.4 },
      { note: 932.33, beat: 19.5, dur: 0.4 },
      { note: 880.00, beat: 20.0, dur: 0.8 },
      { note: 698.46, beat: 21.0, dur: 0.8 },
      { note: 783.99, beat: 22.0, dur: 0.8 },
      { note: 698.46, beat: 23.0, dur: 2.0 },

      { note: 659.25, beat: 26.0, dur: 0.8 },
      { note: 698.46, beat: 27.0, dur: 0.8 },
      { note: 783.99, beat: 28.0, dur: 1.2 },
      { note: 880.00, beat: 29.5, dur: 0.8 },
      { note: 698.46, beat: 31.0, dur: 1.2 },
      { note: 523.25, beat: 33.0, dur: 1.5 },
      { note: 698.46, beat: 35.0, dur: 2.5 },
    ];

    const beatDuration = 1.0;
    const now = this.ctx!.currentTime;

    melody.forEach((p) => {
      const scheduledTime = now + (p.beat * beatDuration) - startOffset;
      if (scheduledTime >= now) {
        this.playBellTone(p.note, scheduledTime, p.dur * 1.5);
        this.playBellTone(p.note / 2, scheduledTime, p.dur * 1.2, 5);
      }
    });
  }

  public stopMusic() {
    this.isPlaying = false;
    this.activeMusicNodes.forEach(({ osc, gain }) => {
      try {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      } catch {}
    });
    this.activeMusicNodes = [];
  }
}

export const audioEngine = new SoundEngine();

// Formant & Oscillator Baby Speech Synthesizer
export async function synthesizeBabyVoice(
  script: string,
  pitch = 1.4,
  speed = 1.05,
  intensity = 85
): Promise<{ audioUrl: string; duration: number }> {
  const words = script.trim().split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);
  const totalDuration = Math.min(18, Math.max(3.5, (wordCount / 2.7) / speed));
  const sampleRate = 24000;
  const numFrames = Math.floor(sampleRate * totalDuration);

  const offlineCtx = new OfflineAudioContext(1, numFrames, sampleRate);
  const baseFreq = 420 * (pitch / 1.15);
  const wordDuration = totalDuration / wordCount;

  words.forEach((_, i) => {
    const wordStart = i * wordDuration;
    const activeDur = wordDuration * 0.85;

    const osc = offlineCtx.createOscillator();
    osc.type = 'sawtooth';

    const inflection = Math.sin((i / wordCount) * Math.PI * 2) * 45 + (i % 2 === 0 ? 30 : -20);
    const startPitch = baseFreq + inflection;
    const endPitch = baseFreq + (i === wordCount - 1 ? 55 : (Math.random() - 0.5) * 40);

    osc.frequency.setValueAtTime(startPitch, wordStart);
    osc.frequency.exponentialRampToValueAtTime(Math.max(150, endPitch), wordStart + activeDur);

    const formant1 = offlineCtx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(1050 + Math.sin(i * 3) * 200, wordStart);
    formant1.Q.setValueAtTime(4.0, wordStart);

    const formant2 = offlineCtx.createBiquadFilter();
    formant2.type = 'peaking';
    formant2.frequency.setValueAtTime(2800, wordStart);
    formant2.gain.setValueAtTime((intensity / 100) * 12, wordStart);
    formant2.Q.setValueAtTime(3.0, wordStart);

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0.0, wordStart);
    gain.gain.linearRampToValueAtTime(0.35 * (intensity / 100), wordStart + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, wordStart + activeDur);

    osc.connect(formant1);
    formant1.connect(formant2);
    formant2.connect(gain);
    gain.connect(offlineCtx.destination);

    osc.start(wordStart);
    osc.stop(wordStart + activeDur);

    // Baby laughter & breath noise burst
    const noiseFrames = Math.floor(sampleRate * 0.05);
    const noiseBuffer = offlineCtx.createBuffer(1, noiseFrames, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let j = 0; j < noiseFrames; j++) {
      output[j] = (Math.random() * 2 - 1) * 0.08;
    }

    const noiseSrc = offlineCtx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const noiseFilter = offlineCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(3500, wordStart);

    const noiseGain = offlineCtx.createGain();
    noiseGain.gain.setValueAtTime(0.06, wordStart);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, wordStart + 0.05);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(offlineCtx.destination);

    noiseSrc.start(wordStart);
    noiseSrc.stop(wordStart + 0.05);
  });

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWavBlob(renderedBuffer);
  return {
    audioUrl: URL.createObjectURL(wavBlob),
    duration: totalDuration,
  };
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const bufferLength = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      const intSample = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
