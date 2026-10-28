import { useRef, useState } from 'react';
import type { Question } from '../types';
import { extractPdfText, parsePdfText } from '../lib/pdfParser';

interface Props {
  existingIds: Set<string>;
  onImport: (questions: Question[]) => void;
}

interface EditableQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  topic: string;
  flagged: boolean;
}

export default function PdfImport({ existingIds, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [message, setMessage] = useState('');

  const handleFile = async (file: File) => {
    setParsing(true);
    setError('');
    setMessage('');
    setQuestions([]);
    try {
      const text = await extractPdfText(file);
      const result = parsePdfText(text);
      setTopic(result.topic);
      setQuestions(
        result.questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: [...q.options],
          correctIndex: q.correctIndex,
          topic: q.topic ?? '',
          flagged: q.flagged,
        }))
      );
      if (result.errors.length > 0) {
        setError(result.errors.join(' '));
      }
    } catch (e) {
      setError(`Could not read the PDF: ${(e as Error).message}`);
    } finally {
      setParsing(false);
    }
  };

  const updateQuestion = (index: number, patch: Partial<EditableQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const options = q.options.map((o, j) => (j === oIndex ? value : o));
        return { ...q, options };
      })
    );
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const flaggedCount = questions.filter((q) => q.flagged).length;

  const confirmImport = () => {
    const valid = questions.filter((q) => q.question.trim() && q.options.every((o) => o.trim()));
    const newOnes = valid.filter((q) => !existingIds.has(q.id));
    const dupCount = valid.length - newOnes.length;
    onImport(
      newOnes.map((q) => ({
        id: q.id,
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        correctIndex: q.correctIndex,
        topic: q.topic.trim() || undefined,
      }))
    );
    setMessage(
      `Added ${newOnes.length} new question(s)` +
        (dupCount > 0 ? ` (${dupCount} already existed and were skipped)` : '') +
        '. You can now start studying.'
    );
    setQuestions([]);
  };

  if (parsing) {
    return (
      <div className="card center">
        <div className="empty-icon">⏳</div>
        <h2>Reading PDF…</h2>
        <p className="muted">Extracting text and parsing questions. This may take a moment.</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="card">
        <h2>Import from PDF</h2>
        <p className="muted">
          Upload a text-based PDF of multiple-choice questions. The app will detect the
          questions, options, and the correct answer (marked with <code>*</code>), then let
          you review before importing.
        </p>
        <div className="dropzone" onClick={() => fileRef.current?.click()}>
          <div className="dropzone-icon">📕</div>
          <p>Click to choose a PDF file</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="pdf-review-header">
        <h2>Review parsed questions</h2>
        <div className="pdf-review-meta">
          {topic && <span className="tag">{topic}</span>}
          <span className="muted small">
            {questions.length} question(s)
            {flaggedCount > 0 && (
              <span className="flag-warning"> · {flaggedCount} need answer</span>
            )}
          </span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="pdf-question-list">
        {questions.map((q, qi) => (
          <div key={qi} className={`pdf-question ${q.flagged ? 'flagged' : ''}`}>
            <div className="pdf-question-head">
              <span className="pdf-qnum">{qi + 1}</span>
              {q.flagged && (
                <span className="flag-badge" title="No correct answer detected — pick one below">
                  ⚠️ no answer
                </span>
              )}
              <button className="pdf-delete" onClick={() => removeQuestion(qi)} title="Delete question">
                ✕
              </button>
            </div>

            <textarea
              className="pdf-input pdf-question-input"
              value={q.question}
              rows={2}
              onChange={(e) => updateQuestion(qi, { question: e.target.value })}
            />

            <div className="pdf-options">
              {q.options.map((opt, oi) => (
                <div key={oi} className="pdf-option-row">
                  <label className="pdf-radio">
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={q.correctIndex === oi}
                      onChange={() => updateQuestion(qi, { correctIndex: oi, flagged: false })}
                    />
                    <span className="pdf-option-letter">{String.fromCharCode(65 + oi)}</span>
                  </label>
                  <input
                    className="pdf-input"
                    value={opt}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <input
              className="pdf-input pdf-topic-input"
              value={q.topic}
              placeholder="Topic"
              onChange={(e) => updateQuestion(qi, { topic: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="button-row">
        <button className="btn btn-primary" onClick={confirmImport}>
          Import {questions.length} question(s)
        </button>
        <button className="btn" onClick={() => setQuestions([])}>
          Cancel
        </button>
      </div>
      {message && <div className="alert alert-success" style={{ marginTop: 12 }}>{message}</div>}
    </div>
  );
}
