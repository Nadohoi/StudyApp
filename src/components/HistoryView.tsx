import { useMemo, useState } from 'react';
import type { AppState, AnswerRecord } from '../types';

interface Props {
  state: AppState;
}

const QUALITY_LABELS: Record<number, string> = {
  0: 'Blackout',
  1: 'Wrong',
  2: 'Hard',
  3: 'Effortful',
  4: 'Hesitant',
  5: 'Perfect',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryView({ state }: Props) {
  const { questions, answerHistory } = state;
  const [expanded, setExpanded] = useState<string | null>(null);

  // Only questions that have at least one recorded answer.
  const entries = useMemo(() => {
    return questions
      .filter((q) => (answerHistory[q.id] ?? []).length > 0)
      .map((q) => {
        const records = [...(answerHistory[q.id] ?? [])].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const correct = records.filter((r) => r.isCorrect).length;
        return { question: q, records, correct };
      })
      .sort((a, b) => {
        const lastA = a.records[a.records.length - 1].timestamp;
        const lastB = b.records[b.records.length - 1].timestamp;
        return new Date(lastB).getTime() - new Date(lastA).getTime();
      });
  }, [questions, answerHistory]);

  const totalRecords = useMemo(
    () => Object.values(answerHistory).reduce((sum, arr) => sum + arr.length, 0),
    [answerHistory]
  );

  if (entries.length === 0) {
    return (
      <div className="view empty-view">
        <div className="card center">
          <div className="empty-icon">🗂️</div>
          <h2>No answer history yet</h2>
          <p className="muted">
            Answer some questions in the Study view and your past answers will
            appear here.
          </p>
        </div>
      </div>
    );
  }

  const letters = ['A', 'B', 'C', 'D'];

  return (
    <div className="view history-view">
      <h1>Answer history</h1>
      <p className="muted">
        {entries.length} question{entries.length === 1 ? '' : 's'} · {totalRecords}{' '}
        total answer{totalRecords === 1 ? '' : 's'} recorded
      </p>

      <div className="history-list">
        {entries.map(({ question: q, records, correct }) => {
          const isOpen = expanded === q.id;
          const pct = records.length > 0 ? Math.round((correct / records.length) * 100) : 0;
          return (
            <div key={q.id} className={`history-item card ${isOpen ? 'open' : ''}`}>
              <button
                className="history-item-header"
                onClick={() => setExpanded(isOpen ? null : q.id)}
              >
                <div className="history-item-main">
                  <span className="tag">{q.topic ?? 'General'}</span>
                  <span className="history-question">{q.question}</span>
                </div>
                <div className="history-item-summary">
                  <span className={`history-rate ${pct >= 70 ? 'good' : pct >= 40 ? 'mid' : 'bad'}`}>
                    {correct}/{records.length} correct
                  </span>
                  <span className="history-chevron">{isOpen ? '▾' : '▸'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="history-records">
                  {records.map((r: AnswerRecord, i) => (
                    <div key={i} className={`history-record ${r.isCorrect ? 'correct' : 'wrong'}`}>
                      <div className="history-record-top">
                        <span className="history-record-date">{formatDate(r.timestamp)}</span>
                        <span className="history-record-badge">
                          {r.isCorrect ? '✓ Correct' : '✗ Wrong'}
                        </span>
                      </div>
                      <div className="history-record-detail">
                        <span>
                          Your answer:{' '}
                          <strong>
                            {letters[r.selectedIndex] ?? '?'} —{' '}
                            {q.options[r.selectedIndex] ?? 'Unknown'}
                          </strong>
                        </span>
                        {!r.isCorrect && (
                          <span className="history-correct-answer">
                            Correct answer:{' '}
                            <strong>
                              {letters[r.correctIndex] ?? '?'} —{' '}
                              {q.options[r.correctIndex] ?? 'Unknown'}
                            </strong>
                          </span>
                        )}
                        <span className="history-quality">
                          Rating: {QUALITY_LABELS[r.quality] ?? r.quality}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
