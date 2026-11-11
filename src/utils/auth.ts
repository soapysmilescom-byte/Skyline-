/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Session } from '../types.ts';

export const TERMINAL_SECURITY_CODE = '85291';
export const LICENSE_DURATION_MS = 720 * 60 * 60 * 1000; // 30 days
const USERS_STORAGE_KEY = 'terminal_auth_users_85291';
const SESSION_STORAGE_KEY = 'terminal_active_session_85291';

interface StoredUser {
  email: string;
  passwordHash: string;
  terminalId: string;
  activatedAt: number;
  expiresAt: number;
  lastLoginAt: number;
}

export function getStoredUsers(): Record<string, StoredUser> {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to parse registered users:', e);
    return {};
  }
}

export function saveStoredUsers(users: Record<string, StoredUser>) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save registered users:', e);
  }
}

export function getActiveSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to parse active session:', e);
    return null;
  }
}

export function saveActiveSession(session: Session | null) {
  try {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to update active session:', e);
  }
}

export function authenticateTerminal(
  emailInput: string,
  passwordInput: string,
  terminalIdInput: string
): { success: boolean; session?: Session; error?: string; isNewUser?: boolean } {
  const email = emailInput.trim().toLowerCase();
  const password = passwordInput.trim();
  const terminalId = terminalIdInput.trim();

  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!password || password.length < 3) {
    return { success: false, error: 'Please enter a password (at least 3 characters).' };
  }
  if (terminalId !== TERMINAL_SECURITY_CODE) {
    return {
      success: false,
      error: 'Invalid Terminal ID. Access requires an authorized terminal security code.',
    };
  }

  const users = getStoredUsers();
  const now = Date.now();
  let user = users[email];
  let isNew = false;

  if (user) {
    if (user.passwordHash !== password) {
      return {
        success: false,
        error: 'Incorrect password for this email. Please check your credentials.',
      };
    }
    user.terminalId = TERMINAL_SECURITY_CODE;
    user.lastLoginAt = now;
    users[email] = user;
    saveStoredUsers(users);
  } else {
    isNew = true;
    const expiresAt = now + LICENSE_DURATION_MS;
    user = {
      email,
      passwordHash: password,
      terminalId: TERMINAL_SECURITY_CODE,
      activatedAt: now,
      expiresAt,
      lastLoginAt: now,
    };
    users[email] = user;
    saveStoredUsers(users);
  }

  const session: Session = {
    email: user.email,
    terminalId: TERMINAL_SECURITY_CODE,
    activatedAt: user.activatedAt,
    expiresAt: user.expiresAt,
    sessionToken: `term_${TERMINAL_SECURITY_CODE}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  };

  saveActiveSession(session);
  return { success: true, session, isNewUser: isNew };
}

export function calculateLicenseRemaining(expiresAt: number, activatedAt: number) {
  const now = Date.now();
  const remainingMs = expiresAt - now;

  if (remainingMs <= 0) {
    return {
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      percentRemaining: 0,
      formattedString: 'Expired (0d 00h 00m 00s)',
    };
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const totalLicenseMs = Math.max(expiresAt - activatedAt, LICENSE_DURATION_MS);
  const percentRemaining = Math.max(0, Math.min(100, (remainingMs / totalLicenseMs) * 100));

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedString = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

  return {
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    percentRemaining,
    formattedString,
  };
}
