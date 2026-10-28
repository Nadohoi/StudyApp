import { useRef, useState } from 'react';
import type { AppState, Settings } from '../types';
import { exportState, importState } from '../lib/storage';

interface Props {
  settings: Settings;
  questionCount: number;
  onSettings: (settings: Settings) => void;
  onReset: () => void;
}

export default function SettingsView({ settings, questionCount, onSettings, onReset }: Props) {
  const backupRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const update = (patch: Partial<Settings>) => {
    onSettings({ ...settings, ...patch });
  };

  const handleExport = () => {
    // Build a fresh state from localStorage so export always reflects current data.
    const raw = localStorage.getItem('studyapp.state.v1');
    if (!raw) {
      setMessage('Nothing to export yet.');
      return;
    }
    exportState(JSON.parse(raw) as AppState);
    setMessage('Backup downloaded.');
  };

  const handleRestore = async (file: File) => {
    setMessage('');
    try {
      const text = await file.text();
      const state = importState(text);
      // Persist restored state directly.
      localStorage.setItem('studyapp.state.v1', JSON.stringify(state));
      setMessage(`Backup restored: ${state.questions.length} question(s). Reload to see changes.`);
    } catch (e) {
      setMessage(`Restore failed: ${(e as Error).message}`);
    }
  };

  return (
    <div className="view settings-view">
      <h1>Settings</h1>

      <div className="card">
        <h2>Daily study limits</h2>
        <div className="setting-row">
          <label htmlFor="newPerDay">New questions per day</label>
          <input
            id="newPerDay"
            type="number"
            min={1}
            max={500}
            value={settings.newPerDay}
            onChange={(e) => update({ newPerDay: Math.max(1, Number(e.target.value)) })}
          />
        </div>
        <div className="setting-row">
          <label htmlFor="maxReviews">Max reviews per day</label>
          <input
            id="maxReviews"
            type="number"
            min={1}
            max={2000}
            value={settings.maxReviewsPerDay}
            onChange={(e) => update({ maxReviewsPerDay: Math.max(1, Number(e.target.value)) })}
          />
        </div>
        <p className="muted small">
          You currently have {questionCount} question(s) loaded.
        </p>
      </div>

      <div className="card">
        <h2>Backup & restore</h2>
        <p className="muted">
          Export your questions and progress as a JSON file, or restore from a previous
          backup. This lets you back up your data or move it to another device.
        </p>
        <div className="button-row">
          <button className="btn btn-primary" onClick={handleExport}>
            Export backup (JSON)
          </button>
          <button className="btn" onClick={() => backupRef.current?.click()}>
            Restore from backup
          </button>
          <input
            ref={backupRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleRestore(f);
              e.target.value = '';
            }}
          />
        </div>
        {message && <p className="muted small" style={{ marginTop: 12 }}>{message}</p>}
      </div>

      <div className="card danger-card">
        <h2>Danger zone</h2>
        <p className="muted">
          Clear all questions and progress. This cannot be undone — export a backup first
          if you want to keep your data.
        </p>
        {!confirmReset ? (
          <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>
            Clear all data
          </button>
        ) : (
          <div className="button-row">
            <button className="btn btn-danger" onClick={onReset}>
              Yes, clear everything
            </button>
            <button className="btn" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
