import type { AppState } from '../types';

const STORAGE_KEY = 'studyapp.state.v1';

export const DEFAULT_SETTINGS = {
  newPerDay: 20,
  maxReviewsPerDay: 100,
};

export function defaultState(): AppState {
  return {
    questions: [],
    reviews: {},
    answerHistory: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      reviews: parsed.reviews && typeof parsed.reviews === 'object' ? parsed.reviews : {},
      answerHistory:
        parsed.answerHistory && typeof parsed.answerHistory === 'object'
          ? parsed.answerHistory
          : {},
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Download the full state as a JSON backup file. */
export function exportState(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `studyapp-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Parse an exported backup JSON back into an AppState. */
export function importState(text: string): AppState {
  const parsed = JSON.parse(text) as Partial<AppState>;
  return {
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    reviews: parsed.reviews && typeof parsed.reviews === 'object' ? parsed.reviews : {},
    answerHistory:
      parsed.answerHistory && typeof parsed.answerHistory === 'object'
        ? parsed.answerHistory
        : {},
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
  };
}
