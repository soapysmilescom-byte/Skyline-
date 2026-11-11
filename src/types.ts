/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BabyVoiceConfig {
  enabled: boolean;
  script: string;
  expression: string;
  tone: string;
  pitch: number;
  intensity: number;
  speed: number;
  voiceVolume: number;
  bgMusicDucking: number;
  startDelay: number;
  audioUrl: string | null;
  audioDuration: number;
  showCaptionsOnVideo: boolean;
}

export interface BirthdayProfile {
  name: string;
  age: number;
  gender: 'boy' | 'girl';
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  parentsNames: string;
  grandparentsNames: string;
  invitationNote: string;
  photoUrl: string | null;
  avatarMode: '3d_doll' | 'photo_frame';
  customVerse: string;
  themeId: string;
  videoSource?: string;
  jungleBadgeText?: string;
  babyVoice: BabyVoiceConfig;
  spreadsheetId?: string;
}

export interface StudioConfig {
  aspectRatio: '9:16' | '1:1' | '16:9';
  fps: number;
  musicTheme: string;
  soundEffects: boolean;
  sparkleIntensity: number;
  showWatermark: boolean;
  babyVoice: BabyVoiceConfig;
}

export interface ThemeOption {
  id: string;
  name: string;
  badge: string;
  gender: 'boy' | 'girl' | 'both';
  emoji: string;
  subline: string;
  gradient: string;
  borderColor: string;
  textColor: string;
  hasVideoMotion?: boolean;
}

export interface Scene {
  id: string;
  title: string;
  startTime: number;
  duration: number;
  type: string;
}

export interface Guest {
  rowIndex?: number;
  name: string;
  status: 'Attending' | 'Maybe' | 'Declined' | 'Invited';
  adults: number;
  kids: number;
  phone: string;
  email: string;
  dietaryNotes: string;
  invitationSent: boolean;
  giftWishes: string;
}

export interface Session {
  email: string;
  terminalId: string;
  activatedAt: number;
  expiresAt: number;
  sessionToken: string;
}
