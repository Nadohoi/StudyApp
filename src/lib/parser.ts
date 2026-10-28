import Papa from 'papaparse';
import type { ImportResult } from '../types';

const OPTION_KEYS = ['optionA', 'optionB', 'optionC', 'optionD'] as const;

/**
 * Parse a CSV string into questions.
 * Expected columns: question, optionA, optionB, optionC, optionD, correct, explanation, topic
 * `correct` is the letter A-D or the 1-based index of the correct option.
 * Questions may have 2-4 options; empty trailing options (e.g. no optionD) are dropped.
 */
export function parseCsv(text: string): ImportResult {
  const result: ImportResult = { questions: [], errors: [], skipped: 0 };

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  parsed.data.forEach((row, i) => {
    const line = i + 2; // +1 for header, +1 for 1-based
    const questionText = (row.question ?? '').trim();
    if (!questionText) {
      result.skipped += 1;
      return;
    }

    // Collect options A-D, dropping empty trailing options.
    const rawOptions = OPTION_KEYS.map((k) => (row[k] ?? '').trim());
    let last = rawOptions.length - 1;
    while (last >= 0 && rawOptions[last] === '') last -= 1;
    const options = rawOptions.slice(0, last + 1);

    if (options.length < 2) {
      result.errors.push(`Line ${line}: need at least 2 options (optionA-D).`);
      result.skipped += 1;
      return;
    }

    const correctRaw = (row.correct ?? '').trim().toUpperCase();
    let correctIndex = -1;
    if (/^[A-D]$/.test(correctRaw)) {
      correctIndex = correctRaw.charCodeAt(0) - 65;
    } else if (/^[1-4]$/.test(correctRaw)) {
      correctIndex = parseInt(correctRaw, 10) - 1;
    }
    if (correctIndex < 0 || correctIndex >= options.length) {
      result.errors.push(
        `Line ${line}: invalid "correct" value "${row.correct}". Use A-${String.fromCharCode(64 + options.length)} or 1-${options.length}.`
      );
      result.skipped += 1;
      return;
    }

    result.questions.push({
      id: makeId(questionText),
      question: questionText,
      options,
      correctIndex,
      explanation: (row.explanation ?? '').trim() || undefined,
      topic: (row.topic ?? '').trim() || undefined,
    });
  });

  return result;
}

/**
 * Parse a JSON string into questions.
 * Accepts either an array of question objects or an object with a `questions` array.
 */
export function parseJson(text: string): ImportResult {
  const result: ImportResult = { questions: [], errors: [], skipped: 0 };

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    result.errors.push(`Invalid JSON: ${(e as Error).message}`);
    return result;
  }

  let rows: unknown[] = [];
  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === 'object' && Array.isArray((data as { questions?: unknown[] }).questions)) {
    rows = (data as { questions: unknown[] }).questions;
  } else {
    result.errors.push('JSON must be an array of questions or an object with a "questions" array.');
    return result;
  }

  rows.forEach((raw, i) => {
    const line = i + 1;
    const row = raw as Record<string, unknown>;
    const questionText = String(row.question ?? '').trim();
    if (!questionText) {
      result.skipped += 1;
      return;
    }

    const optionsRaw = row.options;
    if (!Array.isArray(optionsRaw) || optionsRaw.length < 2 || optionsRaw.length > 4) {
      result.errors.push(`Item ${line}: "options" must be an array of 2-4 strings.`);
      result.skipped += 1;
      return;
    }
    const options = optionsRaw.map((o) => String(o).trim());
    if (options.some((o) => !o)) {
      result.errors.push(`Item ${line}: all options must be non-empty.`);
      result.skipped += 1;
      return;
    }

    let correctIndex = -1;
    const correctRaw = row.correctIndex ?? row.correct;
    if (typeof correctRaw === 'number') {
      correctIndex = correctRaw;
    } else if (typeof correctRaw === 'string') {
      const s = correctRaw.trim().toUpperCase();
      if (/^[A-D]$/.test(s)) correctIndex = s.charCodeAt(0) - 65;
      else if (/^[1-4]$/.test(s)) correctIndex = parseInt(s, 10) - 1;
    }
    if (correctIndex < 0 || correctIndex >= options.length) {
      result.errors.push(
        `Item ${line}: invalid "correctIndex". Use 0-${options.length - 1}, A-${String.fromCharCode(64 + options.length)}, or 1-${options.length}.`
      );
      result.skipped += 1;
      return;
    }

    result.questions.push({
      id: makeId(questionText),
      question: questionText,
      options,
      correctIndex,
      explanation: row.explanation ? String(row.explanation).trim() : undefined,
      topic: row.topic ? String(row.topic).trim() : undefined,
    });
  });

  return result;
}

/** Detect file type by extension and parse accordingly. */
export function parseFile(filename: string, text: string): ImportResult {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'json') return parseJson(text);
  return parseCsv(text);
}

/** Deterministic id from content so re-imports don't duplicate. */
function makeId(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return 'q_' + Math.abs(hash).toString(36);
}
