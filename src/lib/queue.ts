import type { AppState, Question, ReviewState } from '../types';
import { isDue } from './sm2';

export interface QueueItem {
  question: Question;
  state?: ReviewState;
  isNew: boolean;
}

/**
 * Build the review queue for today.
 * Prioritizes due questions first, then new questions up to the daily limit.
 * Respects the max reviews per day setting.
 */
export function buildQueue(state: AppState, now: Date = new Date()): QueueItem[] {
  const { questions, reviews, settings } = state;
  const queue: QueueItem[] = [];

  // Due questions (already seen, due today or overdue).
  const due: QueueItem[] = [];
  // New questions (never reviewed).
  const fresh: QueueItem[] = [];

  for (const q of questions) {
    const rs = reviews[q.id];
    if (!rs) {
      fresh.push({ question: q, state: undefined, isNew: true });
    } else if (isDue(rs, now)) {
      due.push({ question: q, state: rs, isNew: false });
    }
  }

  // Shuffle new questions so the order isn't always the import order.
  shuffle(fresh);

  queue.push(...due);
  queue.push(...fresh.slice(0, Math.max(0, settings.newPerDay)));

  // Cap total session length.
  if (queue.length > settings.maxReviewsPerDay) {
    return queue.slice(0, settings.maxReviewsPerDay);
  }
  return queue;
}

/**
 * Build a preview queue for the NEXT day's session.
 *
 * Unlike `buildQueue`, this simulates what would be due tomorrow without
 * affecting any real records. It includes:
 *   - questions that become due tomorrow (but are NOT yet due today), and
 *   - new (never reviewed) questions, up to the daily new limit.
 *
 * The result is capped by the max reviews per day setting.
 */
export function buildPreviewQueue(
  state: AppState,
  now: Date = new Date()
): QueueItem[] {
  const { questions, reviews, settings } = state;

  // Boundaries for "tomorrow" (start of tomorrow to start of the day after).
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const dayAfterStart = new Date(tomorrowStart);
  dayAfterStart.setDate(dayAfterStart.getDate() + 1);

  const dueTomorrow: QueueItem[] = [];
  const fresh: QueueItem[] = [];

  for (const q of questions) {
    const rs = reviews[q.id];
    if (!rs) {
      fresh.push({ question: q, state: undefined, isNew: true });
      continue;
    }
    const due = new Date(rs.dueDate).getTime();
    // Not yet due today, but due within tomorrow's window.
    if (due >= tomorrowStart.getTime() && due < dayAfterStart.getTime()) {
      dueTomorrow.push({ question: q, state: rs, isNew: false });
    }
  }

  shuffle(fresh);
  const queue: QueueItem[] = [...dueTomorrow];
  queue.push(...fresh.slice(0, Math.max(0, settings.newPerDay)));

  if (queue.length > settings.maxReviewsPerDay) {
    return queue.slice(0, settings.maxReviewsPerDay);
  }
  return queue;
}

/** Count of questions due today (for the dashboard). */
export function countDue(state: AppState, now: Date = new Date()): number {
  return state.questions.filter((q) => {
    const rs = state.reviews[q.id];
    return rs ? isDue(rs, now) : false;
  }).length;
}

/** Count of new (never reviewed) questions. */
export function countNew(state: AppState): number {
  return state.questions.filter((q) => !state.reviews[q.id]).length;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
