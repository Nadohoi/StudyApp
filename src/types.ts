export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  topic?: string;
}

export interface ReviewState {
  questionId: string;
  repetitions: number;
  interval: number;
  easeFactor: number;
  dueDate: string;
  lastReviewed?: string;
  lapses: number;
}

export interface Settings {
  newPerDay: number;
  maxReviewsPerDay: number;
}

/** A single recorded answer for a question. */
export interface AnswerRecord {
  questionId: string;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  /** SM-2 quality rating 0-5 used to schedule the next review. */
  quality: number;
  /** ISO timestamp of when the answer was given. */
  timestamp: string;
}

export interface AppState {
  questions: Question[];
  reviews: Record<string, ReviewState>;
  /** Chronological history of answers, keyed by question id. */
  answerHistory: Record<string, AnswerRecord[]>;
  settings: Settings;
}

export type View = 'import' | 'study' | 'stats' | 'history' | 'settings';

export interface ImportResult {
  questions: Question[];
  errors: string[];
  skipped: number;
}
