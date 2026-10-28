import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AnswerRecord, AppState, Question, View } from './types';
import { defaultState, loadState, saveState } from './lib/storage';
import { applySm2 } from './lib/sm2';
import { buildQueue, buildPreviewQueue, countDue, countNew } from './lib/queue';
import ImportView from './components/ImportView';
import StudyView from './components/StudyView';
import StatsView from './components/StatsView';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [view, setView] = useState<View>(() =>
    state.questions.length > 0 ? 'study' : 'import'
  );

  // Persist on every change.
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Merge incoming questions with existing ones, skipping duplicates by id.
  // Ids are deterministic (derived from question text), so re-importing the
  // same file won't create duplicates.
  const setQuestions = useCallback((incoming: Question[]) => {
    setState((prev) => {
      const existingIds = new Set(prev.questions.map((q) => q.id));
      const newOnes = incoming.filter((q) => !existingIds.has(q.id));
      return { ...prev, questions: [...prev.questions, ...newOnes] };
    });
  }, []);

  const setSettings = useCallback((settings: AppState['settings']) => {
    setState((prev) => ({ ...prev, settings }));
  }, []);

  const recordReview = useCallback(
    (questionId: string, quality: number, selectedIndex: number) => {
      setState((prev) => {
        const question = prev.questions.find((q) => q.id === questionId);
        const prevState = prev.reviews[questionId];
        const next = applySm2(prevState, quality);
        const record: AnswerRecord = {
          questionId,
          selectedIndex,
          correctIndex: question?.correctIndex ?? -1,
          isCorrect: question ? selectedIndex === question.correctIndex : false,
          quality,
          timestamp: new Date().toISOString(),
        };
        const history = prev.answerHistory[questionId] ?? [];
        return {
          ...prev,
          reviews: { ...prev.reviews, [questionId]: { ...next, questionId } },
          answerHistory: {
            ...prev.answerHistory,
            [questionId]: [...history, record],
          },
        };
      });
    },
    []
  );

  const resetAll = useCallback(() => {
    setState(defaultState());
    setView('import');
  }, []);

  const restoreState = useCallback((next: AppState) => {
    setState(next);
    setView(next.questions.length > 0 ? 'study' : 'import');
  }, []);

  const queue = useMemo(() => buildQueue(state), [state]);
  const previewQueue = useMemo(() => buildPreviewQueue(state), [state]);
  const dueCount = useMemo(() => countDue(state), [state]);
  const newCount = useMemo(() => countNew(state), [state]);
  const existingIds = useMemo(
    () => new Set(state.questions.map((q) => q.id)),
    [state.questions]
  );

  const navItems: { key: View; label: string }[] = [
    { key: 'import', label: 'Import' },
    { key: 'study', label: 'Study' },
    { key: 'stats', label: 'Stats' },
    { key: 'history', label: 'History' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">📚</span>
          <span className="brand-name">StudyApp</span>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-btn ${view === item.key ? 'active' : ''}`}
              onClick={() => setView(item.key)}
              disabled={item.key !== 'import' && state.questions.length === 0}
            >
              {item.label}
              {item.key === 'study' && state.questions.length > 0 && (
                <span className="nav-badge">{queue.length}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {view === 'import' && (
          <ImportView
            hasQuestions={state.questions.length > 0}
            existingIds={existingIds}
            onImport={setQuestions}
            onRestore={restoreState}
          />
        )}
        {view === 'study' && (
          <StudyView
            queue={queue}
            previewQueue={previewQueue}
            onReview={recordReview}
            onEmpty={() => setView('stats')}
          />
        )}
        {view === 'stats' && (
          <StatsView
            state={state}
            dueCount={dueCount}
            newCount={newCount}
          />
        )}
        {view === 'history' && <HistoryView state={state} />}
        {view === 'settings' && (
          <SettingsView
            settings={state.settings}
            questionCount={state.questions.length}
            onSettings={setSettings}
            onReset={resetAll}
          />
        )}
      </main>
    </div>
  );
}
