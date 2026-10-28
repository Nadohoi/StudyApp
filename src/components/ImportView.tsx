import { useRef, useState } from 'react';
import type { AppState, Question } from '../types';
import { parseFile } from '../lib/parser';
import { importState } from '../lib/storage';
import PdfImport from './PdfImport';

interface Props {
  hasQuestions: boolean;
  existingIds: Set<string>;
  onImport: (questions: Question[]) => void;
  onRestore: (state: AppState) => void;
}

export default function ImportView({ hasQuestions, existingIds, onImport, onRestore }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'csv' | 'pdf'>('csv');
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string>('');
  const [parsed, setParsed] = useState<Question[]>([]);

  const handleFile = async (file: File) => {
    setErrors([]);
    setSuccess('');
    setParsed([]);
    const text = await file.text();
    const result = parseFile(file.name, text);
    setErrors(result.errors);
    if (result.questions.length > 0) {
      setParsed(result.questions);
      setSuccess(
        `Parsed ${result.questions.length} question(s)` +
          (result.skipped > 0 ? ` (${result.skipped} skipped)` : '') +
          '. Review the preview below, then click "Load into app".'
      );
    } else if (result.errors.length === 0) {
      setErrors(['No valid questions found in the file.']);
    }
  };

  const loadAll = () => {
    if (parsed.length === 0) return;
    const newOnes = parsed.filter((q) => !existingIds.has(q.id));
    const dupCount = parsed.length - newOnes.length;
    onImport(newOnes);
    setSuccess(
      `Added ${newOnes.length} new question(s)` +
        (dupCount > 0 ? ` (${dupCount} already existed and were skipped)` : '') +
        '. You can now start studying.'
    );
    setParsed([]);
  };

  const handleBackup = async (file: File) => {
    setErrors([]);
    setSuccess('');
    try {
      const text = await file.text();
      const state = importState(text);
      onRestore(state);
      setSuccess(`Backup restored: ${state.questions.length} question(s).`);
    } catch (e) {
      setErrors([`Could not restore backup: ${(e as Error).message}`]);
    }
  };

  return (
    <div className="view import-view">
      <div className="import-tabs">
        <button
          className={`import-tab ${tab === 'csv' ? 'active' : ''}`}
          onClick={() => setTab('csv')}
        >
          CSV / JSON
        </button>
        <button
          className={`import-tab ${tab === 'pdf' ? 'active' : ''}`}
          onClick={() => setTab('pdf')}
        >
          PDF
        </button>
      </div>

      {tab === 'pdf' ? (
        <PdfImport existingIds={existingIds} onImport={onImport} />
      ) : (
      <>
      <div className="card hero-card">
        <h1>Import your questions</h1>
        <p className="muted">
          Upload a <strong>CSV</strong> or <strong>JSON</strong> file of multiple-choice
          questions. The app will present them one at a time and use spaced repetition
          to help you remember them.
        </p>

        <div className="dropzone" onClick={() => fileRef.current?.click()}>
          <div className="dropzone-icon">📄</div>
          <p>Click to choose a CSV or JSON file</p>
          <p className="muted small">or drag & drop it here</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,application/json,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="format-hint">
          <h3>CSV format</h3>
          <pre>{`question,optionA,optionB,optionC,optionD,correct,explanation,topic
"What is 2+2?","3","4","5","6",B,"Basic addition.","Math"`}</pre>
          <p className="muted small">
            <code>correct</code> can be <code>A-D</code> or <code>1-4</code>.{' '}
            <code>explanation</code> and <code>topic</code> are optional.
          </p>
        </div>

        {errors.length > 0 && (
          <div className="alert alert-error">
            <strong>Import issues:</strong>
            <ul>
              {errors.slice(0, 20).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
              {errors.length > 20 && <li>…and {errors.length - 20} more</li>}
            </ul>
          </div>
        )}

        {success && <div className="alert alert-success">{success}</div>}

        {parsed.length > 0 && (
          <div className="preview">
            <h3>Preview (showing {Math.min(parsed.length, 5)} of {parsed.length})</h3>
            {parsed.slice(0, 5).map((q) => (
              <div key={q.id} className="preview-item">
                <p className="preview-q">{q.question}</p>
                <ul>
                  {q.options.map((o, i) => (
                    <li key={i} className={i === q.correctIndex ? 'correct' : ''}>
                      {o}
                    </li>
                  ))}
                </ul>
                {q.topic && <span className="tag">{q.topic}</span>}
              </div>
            ))}
            <button className="btn btn-primary" onClick={loadAll}>
              Load all {parsed.length} question(s) into app
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Restore a backup</h2>
        <p className="muted">
          If you previously exported your progress as JSON, you can restore it here.
        </p>
        <button className="btn" onClick={() => backupRef.current?.click()}>
          Choose backup JSON
        </button>
        <input
          ref={backupRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleBackup(f);
            e.target.value = '';
          }}
        />
        {hasQuestions && (
          <p className="muted small" style={{ marginTop: 12 }}>
            Note: restoring a backup will replace your current questions and progress.
          </p>
        )}
      </div>
      </>
      )}
    </div>
  );
}
