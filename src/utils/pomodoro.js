/**
 * Pomodoro helpers (pure) + localStorage persistence (offline-first).
 * Dipakai ArdoroModule. Semua durasi dalam DETIK.
 */

export const POMODORO_PRESETS = {
  klasik: { label: 'Klasik 25/5', focus: 25 * 60, short: 5 * 60, long: 15 * 60, rounds: 4 },
  deep: { label: 'Deep 50/10', focus: 50 * 60, short: 10 * 60, long: 20 * 60, rounds: 4 },
  kilat: { label: 'Kilat 15/3', focus: 15 * 60, short: 3 * 60, long: 10 * 60, rounds: 4 },
};

export const DEFAULT_ARDORO_SETTINGS = {
  preset: 'klasik',
  focus: POMODORO_PRESETS.klasik.focus,
  short: POMODORO_PRESETS.klasik.short,
  long: POMODORO_PRESETS.klasik.long,
  rounds: 4,
  autoContinue: true,
  sound: true,
};

const SETTINGS_KEY = 'ardoro_settings_v1';
const STATS_KEY = 'ardoro_stats_v1';

/** 1500 -> "25:00", 65 -> "1:05" */
export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${String(rest).padStart(2, '0')}`;
}

export function clampRounds(n) {
  const v = Math.floor(Number(n) || 4);
  return Math.min(8, Math.max(2, v));
}

/** Durasi (detik) untuk sebuah fase berdasarkan settings. */
export function durationFor(phase, settings) {
  const s = settings || DEFAULT_ARDORO_SETTINGS;
  if (phase === 'short') return Math.max(60, Math.floor(s.short) || 300);
  if (phase === 'long') return Math.max(60, Math.floor(s.long) || 900);
  return Math.max(60, Math.floor(s.focus) || 1500);
}

/**
 * Transisi fase Pomodoro.
 * state: { phase: 'focus'|'short'|'long', focusDone: number }
 * - focus selesai -> focusDone+1; tiap kelipatan `rounds` dapat long break, else short.
 * - break selesai -> kembali focus.
 */
export function advancePhase(state, rounds = 4) {
  const r = clampRounds(rounds);
  const phase = state?.phase || 'focus';
  const done = Math.max(0, Math.floor(state?.focusDone) || 0);
  if (phase === 'focus') {
    const next = done + 1;
    return { phase: next % r === 0 ? 'long' : 'short', focusDone: next };
  }
  return { phase: 'focus', focusDone: done };
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readJson(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage penuh / private mode — abaikan, timer tetap jalan */
  }
}

export function loadArdoroSettings() {
  const s = readJson(SETTINGS_KEY, DEFAULT_ARDORO_SETTINGS);
  return {
    ...DEFAULT_ARDORO_SETTINGS,
    ...s,
    rounds: clampRounds(s.rounds),
    autoContinue: s.autoContinue !== false,
    sound: s.sound !== false,
  };
}

export function saveArdoroSettings(settings) {
  writeJson(SETTINGS_KEY, settings);
}

export function loadArdoroStats() {
  try {
    if (typeof localStorage === 'undefined') return { days: {} };
    const raw = localStorage.getItem(STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { days: parsed?.days && typeof parsed.days === 'object' ? parsed.days : {} };
  } catch {
    return { days: {} };
  }
}

/** Catat satu sesi fokus selesai (immutable — aman untuk setState). */
export function recordFocusSession(stats, focusSeconds, dateStr = todayKey()) {
  const days = { ...((stats && stats.days) || {}) };
  const prev = days[dateStr] || { focusSec: 0, sessions: 0 };
  days[dateStr] = {
    focusSec: (prev.focusSec || 0) + Math.max(0, Math.floor(focusSeconds) || 0),
    sessions: (prev.sessions || 0) + 1,
  };
  const next = { days };
  writeJson(STATS_KEY, next);
  return next;
}

/** Ringkasan untuk kartu statistik. */
export function summarizeStats(stats, now = new Date()) {
  const days = (stats && stats.days) || {};
  const today = days[todayKey(now)] || { focusSec: 0, sessions: 0 };
  let totalSessions = 0;
  let totalSec = 0;
  for (const k of Object.keys(days)) {
    totalSessions += days[k]?.sessions || 0;
    totalSec += days[k]?.focusSec || 0;
  }
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = todayKey(d);
    last7.push({ key, label: d.toLocaleDateString('id-ID', { weekday: 'short' }), minutes: Math.round(((days[key]?.focusSec) || 0) / 60) });
  }
  return {
    todaySessions: today.sessions || 0,
    todayMinutes: Math.round((today.focusSec || 0) / 60),
    totalSessions,
    totalMinutes: Math.round(totalSec / 60),
    last7,
  };
}
