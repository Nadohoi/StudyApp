import * as pdfjsLib from 'pdfjs-dist';
import type { Question } from '../types';

// Configure the pdf.js worker for Vite.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface ParsedPdfQuestion extends Question {
  flagged: boolean; // true when no correct answer was detected
}

export interface PdfParseResult {
  questions: ParsedPdfQuestion[];
  topic: string;
  errors: string[];
}

/**
 * Extract text from a PDF file using pdf.js.
 */
export async function extractPdfText(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Join text items; pdf.js often splits CJK text into separate items.
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join('');
    text += pageText + '\n';
  }
  return text;
}

// Question start: "1、..." or "1. ..." or "1．..."
const QUESTION_RE = /^\s*(\d+)\s*[、.．]\s*(.+)$/;
// Option: "A. ..." / "B、..." / "C .7*" (letter, optional space, separator, text)
const OPTION_RE = /^\s*([A-Da-d])\s*[.．、]\s*(.*)$/;
// Page marker like "1/37"
const PAGE_MARKER_RE = /^\s*\d+\s*\/\s*\d+\s*$/;
// Header like "（共 300 題）" or "共 300 題"
const HEADER_RE = /^\s*[（(]?\s*共\s*\d+\s*題\s*[）)]?\s*$/;

/**
 * Parse raw PDF text into questions.
 * Expected format (from the user's sample):
 *   <title>
 *   （共 300 題）
 *   1/37
 *   1、question text
 *   A. option
 *   B. option*
 *   C. option
 * The `*` marks the correct answer.
 */
export function parsePdfText(text: string): PdfParseResult {
  const result: PdfParseResult = { questions: [], topic: '', errors: [] };
  const lines = text.split(/\r?\n/);

  let topic = '';
  let current: ParsedPdfQuestion | null = null;
  let currentOptions: { letter: string; text: string; isCorrect: boolean }[] = [];
  let currentQuestionText = '';

  const flush = () => {
    if (!current) return;
    const options = currentOptions.map((o) => o.text);
    const correctIndex = currentOptions.findIndex((o) => o.isCorrect);
    current.options = options;
    current.correctIndex = correctIndex >= 0 ? correctIndex : 0;
    current.flagged = correctIndex < 0;
    result.questions.push(current);
    current = null;
    currentOptions = [];
    currentQuestionText = '';
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Capture the topic from the first meaningful line (the title).
    if (!topic && !PAGE_MARKER_RE.test(line) && !HEADER_RE.test(line) && !QUESTION_RE.test(line)) {
      topic = line;
    }

    if (PAGE_MARKER_RE.test(line) || HEADER_RE.test(line)) {
      continue;
    }

    const qMatch = line.match(QUESTION_RE);
    if (qMatch) {
      flush();
      current = {
        id: '',
        question: qMatch[2].trim(),
        options: [],
        correctIndex: 0,
        topic: '',
        flagged: false,
      };
      currentQuestionText = qMatch[2].trim();
      continue;
    }

    const oMatch = line.match(OPTION_RE);
    if (oMatch && current) {
      let optText = oMatch[2].trim();
      let isCorrect = false;
      // The `*` marks the correct answer (may have surrounding spaces).
      if (/\*\s*$/.test(optText)) {
        isCorrect = true;
        optText = optText.replace(/\*\s*$/, '').trim();
      }
      currentOptions.push({ letter: oMatch[1].toUpperCase(), text: optText, isCorrect });
      continue;
    }

    // Continuation line: append to the current question text.
    if (current) {
      currentQuestionText += line;
      current.question = currentQuestionText;
    }
  }

  flush();

  // Assign ids and topic.
  for (const q of result.questions) {
    q.id = makeId(q.question);
    q.topic = topic || undefined;
  }

  if (result.questions.length === 0) {
    result.errors.push(
      'No questions could be parsed. The PDF may be a scanned image (no selectable text) or use a different format.'
    );
  }

  return result;
}

/** Deterministic id from content (matches parser.ts). */
function makeId(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return 'q_' + Math.abs(hash).toString(36);
}
