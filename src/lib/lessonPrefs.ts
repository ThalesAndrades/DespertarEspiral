/**
 * lessonPrefs — per-student, device-local lesson preferences and state.
 *
 * Everything here is backed by localStorage so it works with zero backend
 * changes (no new Supabase tables, no migrations): video resume position,
 * playback speed, autoplay-next preference, and personal lesson notes.
 *
 * All functions are SSR-safe (no-op when `window`/`localStorage` is absent)
 * and never throw — storage access is wrapped so a disabled/quota-full
 * localStorage degrades gracefully instead of breaking the player.
 */

const NS = "de:lesson";

function safeGet(key: string): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* ── Video resume position (seconds), per lesson ── */
export function getResumePosition(lessonId: string): number {
  const raw = safeGet(`${NS}:pos:${lessonId}`);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function setResumePosition(lessonId: string, seconds: number): void {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  safeSet(`${NS}:pos:${lessonId}`, String(Math.floor(seconds)));
}

export function clearResumePosition(lessonId: string): void {
  safeRemove(`${NS}:pos:${lessonId}`);
}

/* ── Playback speed (global preference) ── */
export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export function getPlaybackRate(): number {
  const raw = safeGet(`${NS}:rate`);
  const n = raw ? Number(raw) : 1;
  return (PLAYBACK_RATES as readonly number[]).includes(n) ? n : 1;
}

export function setPlaybackRate(rate: number): void {
  safeSet(`${NS}:rate`, String(rate));
}

/* ── Autoplay next lesson (global preference, default on) ── */
export function getAutoplayNext(): boolean {
  return safeGet(`${NS}:autoplay`) !== "0";
}

export function setAutoplayNext(enabled: boolean): void {
  safeSet(`${NS}:autoplay`, enabled ? "1" : "0");
}

/* ── Personal notes, per lesson ── */
export function getLessonNotes(lessonId: string): string {
  return safeGet(`${NS}:notes:${lessonId}`) ?? "";
}

export function setLessonNotes(lessonId: string, text: string): void {
  if (text.trim() === "") {
    safeRemove(`${NS}:notes:${lessonId}`);
    return;
  }
  safeSet(`${NS}:notes:${lessonId}`, text);
}

/* ── Helpers ── */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
