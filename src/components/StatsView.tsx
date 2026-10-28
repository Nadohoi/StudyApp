import { useMemo } from 'react';
import type { AppState } from '../types';
import { isMastered } from '../lib/sm2';

interface Props {
  state: AppState;
  dueCount: number;
  newCount: number;
}

export default function StatsView({ state, dueCount, newCount }: Props) {
  const { questions, reviews } = state;

  const stats = useMemo(() => {
    const total = questions.length;
    const reviewed = Object.keys(reviews).length;
    const mastered = questions.filter((q) => {
      const rs = reviews[q.id];
      return rs ? isMastered(rs) : false;
    }).length;
    const lapsed = questions.filter((q) => {
      const rs = reviews[q.id];
      return rs ? rs.lapses > 0 : false;
    }).length;

    // Per-topic breakdown.
    const topics = new Map<string, { total: number; mastered: number; due: number }>();
    for (const q of questions) {
      const topic = q.topic ?? 'General';
      const entry = topics.get(topic) ?? { total: 0, mastered: 0, due: 0 };
      entry.total += 1;
      const rs = reviews[q.id];
      if (rs && isMastered(rs)) entry.mastered += 1;
      if (rs && new Date(rs.dueDate).getTime() <= Date.now()) entry.due += 1;
      topics.set(topic, entry);
    }

    return { total, reviewed, mastered, lapsed, topics };
  }, [questions, reviews]);

  const masteryPct = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;

  return (
    <div className="view stats-view">
      <h1>Your progress</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total questions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{dueCount}</div>
          <div className="stat-label">Due today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{newCount}</div>
          <div className="stat-label">New (unseen)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.mastered}</div>
          <div className="stat-label">Mastered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.reviewed}</div>
          <div className="stat-label">Reviewed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.lapsed}</div>
          <div className="stat-label">Had lapses</div>
        </div>
      </div>

      <div className="card">
        <h2>Overall mastery</h2>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${masteryPct}%` }} />
        </div>
        <p className="muted small">
          {masteryPct}% mastered — a question is mastered after 3+ successful reviews.
        </p>
      </div>

      <div className="card">
        <h2>By topic</h2>
        {stats.topics.size === 0 ? (
          <p className="muted">No questions yet. Import some to get started.</p>
        ) : (
          <table className="topic-table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Total</th>
                <th>Mastered</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {[...stats.topics.entries()].map(([topic, t]) => (
                <tr key={topic}>
                  <td>{topic}</td>
                  <td>{t.total}</td>
                  <td>{t.mastered}</td>
                  <td>{t.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
