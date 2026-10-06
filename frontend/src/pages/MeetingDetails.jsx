import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { meetingsApi, actionsApi } from '../services/api';

function parseTime(t) {
  if (t === null || t === undefined) return 0;
  if (typeof t === 'number') return isNaN(t) ? 0 : t;
  const p = String(t).split(':').map(Number);
  return p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]) ? p[0] * 60 + p[1] : (Number(t) || 0);
}

function format(v) {
  const s = parseTime(v);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function formatDate(d) {
  if (!d) return 'No date';
  try {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? 'No date' : parsed.toLocaleDateString();
  } catch {
    return 'No date';
  }
}

function highlight(text, q) {
  if (!q || !text) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = String(text).split(new RegExp(`(${escaped})`, 'ig'));
  return parts.map((part, index) =>
    part.toLowerCase() === q.toLowerCase() ? <mark key={index}>{part}</mark> : part
  );
}

export default function MeetingDetails({ notify }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const audio = useRef(null);

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);

  // New action item state
  const [newTask, setNewTask] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  // Inline edit state for action items
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [editingTaskAssignee, setEditingTaskAssignee] = useState('');

  // Edit meeting metadata modal state
  const [editingMeeting, setEditingMeeting] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', date: '', duration: 30, participants: '' });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      if (!id) {
        setError('No meeting ID provided');
        setLoading(false);
        return;
      }
      try {
        const response = await meetingsApi.get(id);
        if (!cancelled) {
          if (response.data && response.data._id) {
            setMeeting(response.data);
          } else {
            setError('Meeting not found');
          }
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err.response?.data?.message || 'Could not load meeting details';
          setError(msg);
          notify('Meeting not found');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  const transcript = meeting?.transcript || [];

  const shownTranscript = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return transcript;
    return transcript.filter(x =>
      `${x.text || ''} ${x.speaker || ''}`.toLowerCase().includes(q)
    );
  }, [transcript, search]);

  const seek = timestamp => {
    if (!audio.current) return;
    const sec = parseTime(timestamp);
    audio.current.currentTime = sec;
    audio.current.play().catch(() => {});
  };

  const deleteMeeting = async () => {
    if (!window.confirm(`Delete "${meeting?.title || 'this meeting'}" and all of its transcript and action items?`)) return;
    try {
      await meetingsApi.remove(id);
      notify('Meeting deleted');
      navigate('/');
    } catch {
      notify('Could not delete meeting');
    }
  };

  const generateAI = async () => {
    setBusy(true);
    try {
      const response = await meetingsApi.generateAI(id);
      setMeeting(prev => ({
        ...prev,
        ...response.data
      }));
      if (response.data?.liveAi) {
        notify('Live AI summary generated with Groq');
      } else {
        notify('AI summary loaded successfully');
      }
    } catch (err) {
      notify('AI generation encountered an issue; existing data preserved');
    } finally {
      setBusy(false);
    }
  };

  const startEditMeeting = () => {
    let dateStr = '';
    if (meeting.date) {
      try {
        const d = new Date(meeting.date);
        if (!isNaN(d.getTime())) dateStr = d.toISOString().slice(0, 10);
      } catch {}
    }
    setEditForm({
      title: meeting.title || '',
      date: dateStr,
      duration: meeting.duration || 30,
      participants: (meeting.participants || []).join(', ')
    });
    setEditingMeeting(true);
  };

  const saveMeetingEdit = async e => {
    e.preventDefault();
    if (!editForm.title.trim()) {
      return notify('Meeting title is required');
    }
    try {
      const response = await meetingsApi.update(id, {
        title: editForm.title.trim(),
        date: editForm.date ? new Date(editForm.date).toISOString() : meeting.date,
        duration: Number(editForm.duration) > 0 ? Number(editForm.duration) : 30,
        participants: editForm.participants.split(',').map(x => x.trim()).filter(Boolean)
      });
      setMeeting(prev => ({
        ...prev,
        ...response.data,
        transcript: response.data.transcript || prev.transcript,
        actionItems: response.data.actionItems || prev.actionItems
      }));
      setEditingMeeting(false);
      notify('Meeting updated successfully');
    } catch {
      notify('Could not update meeting');
    }
  };

  // Action item handlers
  const addActionItem = async () => {
    if (!newTask.trim()) return;
    try {
      const response = await actionsApi.create(id, {
        task: newTask.trim(),
        assignee: newAssignee.trim() || 'Unassigned'
      });
      setMeeting(prev => ({
        ...prev,
        actionItems: [...(prev.actionItems || []), response.data]
      }));
      setNewTask('');
      setNewAssignee('');
      notify('Action item added');
    } catch {
      notify('Could not add action item');
    }
  };

  const toggleActionItem = async actionItem => {
    try {
      const response = await actionsApi.update(actionItem._id, {
        completed: !actionItem.completed
      });
      setMeeting(prev => ({
        ...prev,
        actionItems: (prev.actionItems || []).map(x =>
          x._id === actionItem._id ? response.data : x
        )
      }));
    } catch {
      notify('Could not update action item');
    }
  };

  const startEditActionItem = actionItem => {
    setEditingTaskId(actionItem._id);
    setEditingTaskText(actionItem.task || '');
    setEditingTaskAssignee(actionItem.assignee || '');
  };

  const saveEditActionItem = async taskId => {
    if (!editingTaskText.trim()) {
      return notify('Task text cannot be empty');
    }
    try {
      const response = await actionsApi.update(taskId, {
        task: editingTaskText.trim(),
        assignee: editingTaskAssignee.trim() || 'Unassigned'
      });
      setMeeting(prev => ({
        ...prev,
        actionItems: (prev.actionItems || []).map(x =>
          x._id === taskId ? response.data : x
        )
      }));
      setEditingTaskId(null);
      notify('Action item updated');
    } catch {
      notify('Could not update action item');
    }
  };

  const removeActionItem = async actionItem => {
    if (!window.confirm(`Delete action item "${actionItem.task}"?`)) return;
    try {
      await actionsApi.remove(actionItem._id);
      setMeeting(prev => ({
        ...prev,
        actionItems: (prev.actionItems || []).filter(x => x._id !== actionItem._id)
      }));
      notify('Action item deleted');
    } catch {
      notify('Could not delete action item');
    }
  };

  if (error) {
    return (
      <section>
        <button className="back" onClick={() => navigate('/')}>← Back to meetings</button>
        <div className="card empty">
          <h2>Meeting not found</h2>
          <p className="muted">{error}</p>
          <button style={{ marginTop: 16 }} onClick={() => navigate('/')}>
            Return to Dashboard
          </button>
        </div>
      </section>
    );
  }

  if (loading || !meeting) {
    return (
      <section>
        <button className="back" onClick={() => navigate('/')}>← Back to meetings</button>
        <div className="card empty">Loading meeting details...</div>
      </section>
    );
  }

  return (
    <section>
      <button className="back" onClick={() => navigate('/')}>← Back to meetings</button>

      <div className="detail-head">
        <div>
          <div className="eyebrow">MEETING</div>
          <h1>{meeting.title}</h1>
          <p className="muted">
            {formatDate(meeting.date)} · {meeting.duration} minutes · {(meeting.participants || []).join(' · ') || 'No participants'}
          </p>
        </div>
        <div className="head-actions">
          <button className="secondary" onClick={startEditMeeting}>Edit</button>
          <button className="danger" onClick={deleteMeeting}>Delete</button>
        </div>
      </div>

      <div className="player card">
        <div className="player-title">Meeting recording <span>Demo audio · 60 sec</span></div>
        <audio
          ref={audio}
          controls
          preload="metadata"
          src="/sample.wav"
          onTimeUpdate={e => {
            const t = e.currentTarget.currentTime;
            let currentIdx = 0;
            for (let i = 0; i < transcript.length; i++) {
              if (parseTime(transcript[i].timestamp) <= t) {
                currentIdx = i;
              } else {
                break;
              }
            }
            setActive(currentIdx);
          }}
        />
        <div className="audio-note">
          <span>●</span> Click any transcript line or key topic below to seek the recording to that exact moment.
        </div>
      </div>

      <div className="detail-grid">
        <div className="card transcript-panel">
          <div className="panel-head">
            <h2>Transcript</h2>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search transcript..."
            />
          </div>

          <div className="transcript-scroll">
            {shownTranscript.map((x, i) => {
              const originalIndex = transcript.indexOf(x);
              const isActive = originalIndex === active;
              return (
                <button
                  type="button"
                  className={'line ' + (isActive ? 'active' : '')}
                  key={x._id || i}
                  onClick={() => {
                    setActive(originalIndex);
                    seek(x.timestamp);
                  }}
                  title={`Seek audio to ${format(x.timestamp)}`}
                >
                  <div>
                    <b>{x.speaker}</b>
                    <span>{format(x.timestamp)}</span>
                  </div>
                  <p>{highlight(x.text, search)}</p>
                </button>
              );
            })}
          </div>

          {!shownTranscript.length && (
            <p className="muted" style={{ padding: '16px 0', textAlign: 'center' }}>
              {search ? 'No matching transcript lines found.' : 'No transcript recorded.'}
            </p>
          )}
        </div>

        <div className="right-col">
          <div className="card">
            <div className="section-title">
              <h2>AI Summary</h2>
              <button className="small-btn" onClick={generateAI} disabled={busy}>
                {busy ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
            <p style={{ lineHeight: 1.6 }}>{meeting.summary || 'No summary yet. Click "Generate with AI" above to generate one.'}</p>
            <div className="ai-note">
              <span>✦</span> If a Groq API key is present, live AI generates summaries and chapters. Seeded fallback remains active if unavailable.
            </div>
          </div>

          <div className="card">
            <h2>Key topics</h2>
            <div className="topics">
              {(meeting.topics || []).map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => seek(t.timestamp)}
                  title={`Jump to ${format(t.timestamp)}`}
                >
                  <span>{format(t.timestamp)}</span>
                  {t.title}
                </button>
              ))}
              {(!meeting.topics || meeting.topics.length === 0) && (
                <p className="muted small">No key topics recorded yet.</p>
              )}
            </div>
          </div>

          <div className="card">
            <h2>Action items</h2>
            <div className="add-task-row">
              <input
                className="task-input"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addActionItem()}
                placeholder="Add an action item..."
              />
              <input
                className="task-assignee-input"
                value={newAssignee}
                onChange={e => setNewAssignee(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addActionItem()}
                placeholder="Assignee (optional)"
              />
              <button onClick={addActionItem}>Add</button>
            </div>

            <div className="task-list">
              {(meeting.actionItems || []).map(a => {
                const isEditingThis = editingTaskId === a._id;
                if (isEditingThis) {
                  return (
                    <div className="task-edit-box" key={a._id}>
                      <input
                        className="task-edit-text"
                        value={editingTaskText}
                        onChange={e => setEditingTaskText(e.target.value)}
                        placeholder="Task description"
                        autoFocus
                      />
                      <input
                        className="task-edit-assignee"
                        value={editingTaskAssignee}
                        onChange={e => setEditingTaskAssignee(e.target.value)}
                        placeholder="Assignee"
                      />
                      <div className="task-edit-buttons">
                        <button className="small-btn" onClick={() => saveEditActionItem(a._id)}>Save</button>
                        <button className="small-btn secondary" onClick={() => setEditingTaskId(null)}>Cancel</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="task" key={a._id}>
                    <input
                      type="checkbox"
                      checked={!!a.completed}
                      onChange={() => toggleActionItem(a)}
                    />
                    <span className={a.completed ? 'done' : ''}>
                      {a.task}
                      <small>{a.assignee || 'Unassigned'}</small>
                    </span>
                    <button
                      type="button"
                      className="task-action-btn"
                      onClick={() => startEditActionItem(a)}
                      title="Edit action item"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="task-delete"
                      onClick={() => removeActionItem(a)}
                      title="Delete action item"
                    >
                      ×
                    </button>
                  </div>
                );
              })}

              {(!meeting.actionItems || meeting.actionItems.length === 0) && (
                <p className="muted small" style={{ paddingTop: 8 }}>
                  No action items yet. Add one above!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {editingMeeting && (
        <div className="modal-bg">
          <form className="modal" onSubmit={saveMeetingEdit}>
            <div className="modal-head">
              <div>
                <div className="eyebrow">MEETING</div>
                <h2>Edit meeting</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setEditingMeeting(false)}>×</button>
            </div>

            <label>
              Title
              <input
                required
                value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              />
            </label>

            <div className="two">
              <label>
                Date
                <input
                  type="date"
                  value={editForm.date}
                  onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                />
              </label>
              <label>
                Duration (minutes)
                <input
                  type="number"
                  min="1"
                  value={editForm.duration}
                  onChange={e => setEditForm({ ...editForm, duration: e.target.value })}
                />
              </label>
            </div>

            <label>
              Participants (comma-separated)
              <input
                value={editForm.participants}
                onChange={e => setEditForm({ ...editForm, participants: e.target.value })}
                placeholder="Poojitha, Rahul, Ananya"
              />
            </label>

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setEditingMeeting(false)}>
                Cancel
              </button>
              <button type="submit">Save changes</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
