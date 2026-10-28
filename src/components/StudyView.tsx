import { useRef, useState } from 'react';
import type { QueueItem } from '../lib/queue';
import QuestionCard from './QuestionCard';
import FeedbackPanel from './FeedbackPanel';

interface Props {
  queue: QueueItem[];
  previewQueue: QueueItem[];
  onReview: (questionId: string, quality: number, selectedIndex: number) => void;
  onEmpty: () => void;
}

type Phase = 'main' | 'reReview';
type Mode = 'today' | 'preview';

export default function StudyView({ queue, previewQueue, onReview, onEmpty }: Props) {
  // Snapshot the queue once when the session starts so it doesn't shrink as
  // questions are answered (the parent rebuilds the queue on every review).
  const [sessionQueue, setSessionQueue] = useState<QueueItem[]>(() => queue);
  const [mode, setMode] = useState<Mode>('today');
  // Questions answered wrong or marked guessed, re-shown after the main session.
  // Stored in a ref so we can read the latest value synchronously when advancing.
  const reReviewRef = useRef<QueueItem[]>([]);
  const [phase, setPhase] = useState<Phase>('main');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0, guessed: 0 });

  const isPreview = mode === 'preview';
  const activeQueue = phase === 'main' ? sessionQueue : reReviewRef.current;
  const isReReview = phase === 'reReview';

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setSessionQueue(next === 'preview' ? previewQueue : queue);
    setPhase('main');
    setIndex(0);
    setSelected(null);
    reReviewRef.current = [];
    setSessionStats({ correct: 0, total: 0, guessed: 0 });
  };

  if (activeQueue.length === 0) {
    return (
      <div className="view empty-view">
        <div className="card center">
          <div className="empty-icon">🎉</div>
          <h2>{isPreview ? 'Nothing to preview' : 'All caught up!'}</h2>
          <p className="muted">
            {isPreview
              ? 'There are no questions scheduled for tomorrow right now. Check back after today\'s session.'
              : 'You have no questions due right now. New questions will appear as you import them, and reviewed questions come back when it\'s time to review.'}
          </p>
          {!isPreview && previewQueue.length > 0 && (
            <button className="btn btn-primary" onClick={() => switchMode('preview')}>
              Preview tomorrow's session ({previewQueue.length})
            </button>
          )}
          <button className="btn" onClick={onEmpty}>
            View your stats
          </button>
        </div>
      </div>
    );
  }

  const item = activeQueue[index];
  const q = item.question;
  const isNew = item.isNew;

  const addToReReview = (qi: QueueItem) => {
    if (!reReviewRef.current.some((r) => r.question.id === qi.question.id)) {
      reReviewRef.current.push(qi);
    }
  };

  const advance = () => {
    if (phase === 'main') {
      if (index + 1 < sessionQueue.length) {
        setIndex(index + 1);
        setSelected(null);
      } else if (reReviewRef.current.length > 0) {
        setPhase('reReview');
        setIndex(0);
        setSelected(null);
      } else {
        onEmpty();
      }
    } else {
      if (index + 1 < reReviewRef.current.length) {
        setIndex(index + 1);
        setSelected(null);
      } else {
        onEmpty();
      }
    }
  };

  const handleAnswer = (selectedIndex: number) => {
    setSelected(selectedIndex);
    setSessionStats((s) => ({
      correct: s.correct + (selectedIndex === q.correctIndex ? 1 : 0),
      total: s.total + 1,
      guessed: s.guessed,
    }));
    if (selectedIndex !== q.correctIndex) {
      addToReReview(item);
    }
  };

  const handleRate = (quality: number) => {
    if (phase === 'main' && !isPreview) {
      onReview(q.id, quality, selected ?? q.correctIndex);
    }
    advance();
  };

  const handleGuessed = () => {
    setSessionStats((s) => ({ ...s, guessed: s.guessed + 1 }));
    if (phase === 'main' && !isPreview) {
      // Treat as not-known: record a lapse (quality 1) so it comes back soon.
      onReview(q.id, 1, selected ?? q.correctIndex);
    }
    addToReReview(item);
    advance();
  };

  return (
    <div className="view study-view">
      <div className="session-bar">
        <span>
          Session: {sessionStats.total} answered · {sessionStats.correct} correct
          {sessionStats.guessed > 0 && ` · ${sessionStats.guessed} guessed`}
        </span>
        <span className="session-controls">
          <div className="mode-toggle">
            <button
              className={`mode-btn ${!isPreview ? 'active' : ''}`}
              onClick={() => switchMode('today')}
              disabled={queue.length === 0}
            >
              Today
            </button>
            <button
              className={`mode-btn ${isPreview ? 'active' : ''}`}
              onClick={() => switchMode('preview')}
              disabled={previewQueue.length === 0}
            >
              Preview next day
            </button>
          </div>
          <span className="muted">
            {isReReview ? (
              <>Re-review · {reReviewRef.current.length - index} remaining</>
            ) : (
              <>
                {isNew ? 'New question' : 'Review'} ·{' '}
                {sessionQueue.length - index} remaining
              </>
            )}
          </span>
        </span>
      </div>

      {isPreview && (
        <div className="preview-banner">
          👁️ Preview mode — practicing tomorrow's session. Nothing you answer here
          is saved to your schedule or history.
        </div>
      )}

      {isReReview && (
        <div className="re-review-banner">
          🔁 Re-reviewing the {reReviewRef.current.length} question(s) you missed or
          guessed. This is reinforcement only — it doesn't count toward your schedule.
        </div>
      )}

      <QuestionCard
        key={q.id}
        question={q}
        index={index}
        total={activeQueue.length}
        onAnswer={handleAnswer}
      />

      {selected !== null && (
        <FeedbackPanel
          question={q}
          selectedIndex={selected}
          onRate={handleRate}
          onGuessed={handleGuessed}
        />
      )}
    </div>
  );
}
