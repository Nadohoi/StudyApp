import type { Question } from '../types';

interface Props {
  question: Question;
  selectedIndex: number;
  onRate: (quality: number) => void;
  onGuessed: () => void;
}

const RATINGS: { value: number; label: string; hint: string }[] = [
  { value: 0, label: 'Again', hint: 'Complete blackout' },
  { value: 1, label: 'Hard', hint: 'Wrong, but familiar' },
  { value: 3, label: 'Good', hint: 'Correct, with effort' },
  { value: 4, label: 'Easy', hint: 'Correct, quick' },
  { value: 5, label: 'Perfect', hint: 'Instant recall' },
];

export default function FeedbackPanel({ question, selectedIndex, onRate, onGuessed }: Props) {
  const isCorrect = selectedIndex === question.correctIndex;

  return (
    <div className={`feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`}>
      <div className="feedback-banner">
        <span className="feedback-icon">{isCorrect ? '✅' : '❌'}</span>
        <span className="feedback-title">
          {isCorrect ? 'Correct!' : 'Not quite.'}
        </span>
        {!isCorrect && (
          <span className="feedback-answer">
            The correct answer is{' '}
            <strong>{String.fromCharCode(65 + question.correctIndex)}</strong> —{' '}
            {question.options[question.correctIndex]}
          </span>
        )}
      </div>

      {question.explanation && (
        <div className="explanation">
          <strong>Explanation:</strong> {question.explanation}
        </div>
      )}

      <div className="guessed-section">
        <button className="btn btn-guessed" onClick={onGuessed}>
          🎲 I guessed this
        </button>
        <p className="muted small">
          Mark it if you guessed — it will be treated as not-known and re-shown after
          this session.
        </p>
      </div>

      <div className="rating-section">
        <p className="rating-label">How well did you remember this?</p>
        <div className="rating-buttons">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              className="rating-btn"
              onClick={() => onRate(r.value)}
            >
              <span className="rating-value">{r.label}</span>
              <span className="rating-hint">{r.hint}</span>
            </button>
          ))}
        </div>
        <p className="muted small">
          Your rating schedules the next review (SM-2 spaced repetition).
        </p>
      </div>
    </div>
  );
}
