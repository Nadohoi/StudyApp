import type { ReviewState } from '../types';

export const MIN_EASE_FACTOR = 1.3;
export const DEFAULT_EASE_FACTOR = 2.5;

/**
 * SM-2 spaced repetition algorithm.
 *
 * Quality ratings (0-5):
 *   0 - complete blackout
 *   1 - wrong, but remembered upon seeing answer
 *   2 - wrong, but easy to recall
 *   3 - correct, but required serious effort
 *   4 - correct, after a hesitation
 *   5 - perfect response
 *
 * @param state current review state (or undefined for a new question)
 * @param quality the quality rating 0-5
 * @param now current date (for testability)
 */
export function applySm2(
  state: ReviewState | undefined,
  quality: number,
  now: Date = new Date()
): ReviewState {
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  const base: ReviewState = state ?? {
    questionId: '',
    repetitions: 0,
    interval: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    dueDate: now.toISOString(),
    lapses: 0,
  };

  let repetitions = base.repetitions;
  let interval = base.interval;
  let easeFactor = base.easeFactor;
  let lapses = base.lapses;

  // Update ease factor (only for quality >= 3 in classic SM-2, but we apply
  // the formula for all ratings to keep it simple and responsive).
  easeFactor =
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < MIN_EASE_FACTOR) easeFactor = MIN_EASE_FACTOR;

  if (q < 3) {
    // Incorrect / hard: reset repetition count and interval.
    repetitions = 0;
    interval = 1;
    lapses += 1;
  } else {
    // Correct: advance repetitions and interval.
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  const due = new Date(now);
  due.setDate(due.getDate() + interval);
  due.setHours(0, 0, 0, 0);

  return {
    questionId: base.questionId,
    repetitions,
    interval,
    easeFactor: round(easeFactor),
    dueDate: due.toISOString(),
    lastReviewed: now.toISOString(),
    lapses,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Returns true if the review state is due on or before `now`. */
export function isDue(state: ReviewState, now: Date = new Date()): boolean {
  return new Date(state.dueDate).getTime() <= now.getTime();
}

/** A question is considered "mastered" after 3+ successful repetitions. */
export function isMastered(state: ReviewState): boolean {
  return state.repetitions >= 3;
}
