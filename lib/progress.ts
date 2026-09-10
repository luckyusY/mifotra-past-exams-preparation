'use client';

/**
 * Study progress, kept on the device.
 *
 * There are no accounts, so this lives in localStorage. That is a real
 * limitation - clearing the browser loses it - but it is honest about what the
 * product currently is, and it means someone can start studying in ten seconds
 * with no signup. Everything here degrades to "no progress yet" rather than
 * throwing when storage is unavailable, which is what private mode does.
 */

const KEY = 'mifotra_progress_v1';

export type Attempt = { correct: boolean; at: number };

export type Progress = {
  /** question id -> most recent attempt */
  answers: Record<string, Attempt>;
  /** ISO dates on which at least one question was answered */
  days: string[];
  /** questions per day the learner is aiming for */
  dailyGoal: number;
  /**
   * date -> how many questions were answered that day.
   *
   * Kept separately because `answers` holds only the most recent attempt per
   * question, so re-doing a question would silently erase the day it was first
   * answered on and the tracker would lose history.
   */
  daily: Record<string, number>;
  /** date -> how many were correct, so the tracker can show quality not just volume */
  dailyCorrect: Record<string, number>;
};

const EMPTY: Progress = { answers: {}, days: [], dailyGoal: 20, daily: {}, dailyCorrect: {} };

export function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const p = JSON.parse(raw) as Progress;
    return {
      ...EMPTY,
      ...p,
      answers: p.answers ?? {},
      days: p.days ?? [],
      daily: p.daily ?? {},
      dailyCorrect: p.dailyCorrect ?? {},
    };
  } catch {
    return { ...EMPTY };
  }
}

function write(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode: progress simply is not kept */
  }
}

const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Record a batch of results at the end of an attempt. */
export function record(results: { id: string; correct: boolean }[]) {
  if (!results.length) return;
  const p = read();
  const now = Date.now();
  for (const r of results) p.answers[r.id] = { correct: r.correct, at: now };
  const today = dayOf(now);
  if (!p.days.includes(today)) p.days.push(today);
  p.daily[today] = (p.daily[today] ?? 0) + results.length;
  p.dailyCorrect[today] = (p.dailyCorrect[today] ?? 0) + results.filter((r) => r.correct).length;
  write(p);
}

export function setDailyGoal(n: number) {
  const p = read();
  p.dailyGoal = Math.max(5, Math.min(500, Math.round(n)));
  write(p);
}

export function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/* ---------- derived ---------- */

export function answeredToday(p: Progress): number {
  return p.daily[dayOf(Date.now())] ?? 0;
}

/** Total questions answered across all time, including repeats. */
export function totalAnswered(p: Progress): number {
  return Object.values(p.daily).reduce((a, b) => a + b, 0);
}

export function totalCorrect(p: Progress): number {
  return Object.values(p.dailyCorrect).reduce((a, b) => a + b, 0);
}

/** The last `weeks` weeks of activity, oldest first, for the tracker grid. */
export function calendar(p: Progress, weeks = 14): { date: string; count: number; correct: number }[] {
  const out: { date: string; count: number; correct: number }[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  // Wind back to the most recent Sunday so the grid's columns are whole weeks.
  cursor.setDate(cursor.getDate() - cursor.getDay());
  const start = new Date(cursor);
  start.setDate(start.getDate() - (weeks - 1) * 7);
  for (let d = new Date(start); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const key = dayOf(d.getTime());
    out.push({ date: key, count: p.daily[key] ?? 0, correct: p.dailyCorrect[key] ?? 0 });
  }
  return out;
}

/**
 * Consecutive days up to today. A streak that keeps counting after a missed day
 * would be flattering and useless; this one breaks honestly.
 */
export function streak(p: Progress): number {
  if (!p.days.length) return 0;
  const set = new Set(p.days);
  let n = 0;
  const cursor = new Date();
  // Today not yet studied does not break a streak that ran to yesterday.
  if (!set.has(dayOf(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    if (!set.has(dayOf(cursor.getTime()))) break;
    n++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

export type SetStat = { seen: number; correct: number; total: number };

export function statsFor(p: Progress, ids: string[]): SetStat {
  let seen = 0;
  let correct = 0;
  for (const id of ids) {
    const a = p.answers[id];
    if (!a) continue;
    seen++;
    if (a.correct) correct++;
  }
  return { seen, correct, total: ids.length };
}

/** Questions answered wrong, oldest first - the ones worth revisiting. */
export function weakIds(p: Progress): string[] {
  return Object.entries(p.answers)
    .filter(([, a]) => !a.correct)
    .sort((a, b) => a[1].at - b[1].at)
    .map(([id]) => id);
}
