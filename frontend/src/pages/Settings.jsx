import React, { useState } from 'react';

export default function Settings({ notify }) {
  const [notifications, setNotifications] = useState(true);
  const [autoSummary, setAutoSummary] = useState(true);

  const save = () => notify('Settings saved');

  return (
    <section>
      <div className="eyebrow">SETTINGS</div>
      <h1>Settings</h1>

      <div className="settings-grid">
        <div className="card">
          <h2>Preferences</h2>
          <label className="task">
            <input type="checkbox" checked={notifications} onChange={e => setNotifications(e.target.checked)} />
            <span>Meeting notifications<small>Show updates when meeting data changes</small></span>
          </label>
          <label className="task">
            <input type="checkbox" checked={autoSummary} onChange={e => setAutoSummary(e.target.checked)} />
            <span>Automatic AI summaries<small>Generate a summary when supported by the backend</small></span>
          </label>
          <button onClick={save}>Save preferences</button>
        </div>

        <div className="card">
          <h2>Workspace</h2>
          <div className="settings-row"><span>Workspace name</span><strong>Personal</strong></div>
          <div className="settings-row"><span>Plan</span><strong>Student Demo</strong></div>
          <div className="settings-row"><span>Transcription</span><strong>Seeded / uploaded</strong></div>
          <div className="settings-row"><span>AI provider</span><strong>Groq (optional)</strong></div>
        </div>
      </div>
    </section>
  );
}
