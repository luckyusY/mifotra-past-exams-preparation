import {
  type Progress, streak, totalAnswered, totalCorrect, statsFor,
} from '@/lib/progress';

/**
 * Levels and badges.
 *
 * The rule I held to: nothing here rewards anything the learner did not
 * actually do. No participation points for opening the page, no streak-at-risk
 * nagging, no badge that arrives just for showing up. Someone preparing for a
 * public-service exam is not a slot machine player, and a reward that turns out
 * to be hollow costs more trust than it buys attention.
 *
 * XP is weighted toward correctness rather than volume, so grinding through
 * questions guessing does not out-earn working carefully through fewer.
 */

export const XP_CORRECT = 10;
export const XP_ATTEMPT = 2;

export function xpOf(p: Progress): number {
  const correct = totalCorrect(p);
  const attempted = totalAnswered(p);
  return correct * XP_CORRECT + (attempted - correct) * XP_ATTEMPT;
}

/** Thresholds widen as they go, so early progress is visible and later levels mean something. */
const LEVELS = [
  0, 100, 300, 700, 1400, 2500, 4000, 6000, 8500, 11500,
  15000, 19500, 25000, 31500, 39000, 48000, 58000, 70000,
];

export const LEVEL_NAMES = [
  'Beginner', 'Learner', 'Student', 'Apprentice', 'Practitioner',
  'Technician', 'Analyst', 'Specialist', 'Senior', 'Expert',
  'Advanced', 'Professional', 'Mentor', 'Master', 'Authority',
  'Distinguished', 'Principal', 'Fellow',
];

export type LevelState = {
  level: number;
  name: string;
  xp: number;
  into: number;
  needed: number;
  pct: number;
};

export function levelOf(p: Progress): LevelState {
  const xp = xpOf(p);
  let level = 0;
  while (level + 1 < LEVELS.length && xp >= LEVELS[level + 1]) level++;
  const floor = LEVELS[level];
  const ceil = LEVELS[level + 1] ?? floor;
  const span = Math.max(1, ceil - floor);
  return {
    level: level + 1,
    name: LEVEL_NAMES[level] ?? 'Fellow',
    xp,
    into: xp - floor,
    needed: ceil > floor ? span : 0,
    pct: ceil > floor ? Math.min(100, Math.round(((xp - floor) / span) * 100)) : 100,
  };
}

export type Badge = {
  id: string;
  name: string;
  hint: string;
  earned: boolean;
  /** 0-1, for the ones worth showing partial progress on. */
  progress?: number;
};

export function badgesFor(p: Progress, bankIds: string[]): Badge[] {
  const answered = totalAnswered(p);
  const correct = totalCorrect(p);
  const days = streak(p);
  const distinctDays = p.days.length;
  const acc = answered ? correct / answered : 0;
  const bank = statsFor(p, bankIds);

  const at = (n: number, of: number) => Math.min(1, of ? n / of : 0);

  return [
    { id: 'first-steps', name: 'First steps', hint: 'Answer 10 questions', earned: answered >= 10, progress: at(answered, 10) },
    { id: 'hundred', name: 'Century', hint: 'Answer 100 questions', earned: answered >= 100, progress: at(answered, 100) },
    { id: 'thousand', name: 'Thousand club', hint: 'Answer 1,000 questions', earned: answered >= 1000, progress: at(answered, 1000) },
    { id: 'week', name: 'Seven days', hint: 'Study 7 days in a row', earned: days >= 7, progress: at(days, 7) },
    { id: 'fortnight', name: 'Fourteen days', hint: 'Study 14 days in a row', earned: days >= 14, progress: at(days, 14) },
    { id: 'month', name: 'Thirty days', hint: 'Study 30 days in a row', earned: days >= 30, progress: at(days, 30) },
    { id: 'regular', name: 'Regular', hint: 'Study on 20 different days', earned: distinctDays >= 20, progress: at(distinctDays, 20) },
    {
      id: 'sharp',
      name: 'Sharp',
      hint: '80% correct over at least 100 questions',
      earned: answered >= 100 && acc >= 0.8,
      progress: answered >= 100 ? at(acc, 0.8) : at(answered, 100) * 0.5,
    },
    {
      id: 'thorough',
      name: 'Thorough',
      hint: 'Attempt a quarter of your bank',
      earned: bank.total > 0 && bank.seen >= bank.total * 0.25,
      progress: at(bank.seen, Math.max(1, bank.total * 0.25)),
    },
    {
      id: 'complete',
      name: 'Completionist',
      hint: 'Attempt every question in your bank',
      earned: bank.total > 0 && bank.seen >= bank.total,
      progress: at(bank.seen, Math.max(1, bank.total)),
    },
  ];
}
