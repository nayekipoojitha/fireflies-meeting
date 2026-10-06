import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MeetingDetails from './pages/MeetingDetails';
import Settings from './pages/Settings';

export default function App() {
  const [toast, setToast] = useState('');

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__firefliesToast);
    window.__firefliesToast = window.setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="app">
      <aside>
        <div className="brand"><span>✦</span> Fireflies</div>
        <nav>
          <NavLink to="/" end>⌂ <span>Meetings</span></NavLink>
          <NavLink to="/settings">⚙ <span>Settings</span></NavLink>
        </nav>
        <div className="side-bottom">
          AI Meeting Assistant
          <div className="muted">Workspace overview</div>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <strong>Meeting workspace</strong>
            <div className="muted">Capture, review and act on conversations</div>
          </div>
          <div className="avatar">PN</div>
        </header>

        <Routes>
          <Route path="/" element={<Dashboard notify={notify} />} />
          <Route path="/meetings/:id" element={<MeetingDetails notify={notify} />} />
          <Route path="/meeting/:id" element={<MeetingDetails notify={notify} />} />
          <Route path="/settings" element={<Settings notify={notify} />} />
          <Route path="*" element={<Dashboard notify={notify} />} />
        </Routes>
      </main>

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}
