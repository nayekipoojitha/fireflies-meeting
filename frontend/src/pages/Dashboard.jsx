import React, { useEffect, useMemo, useState } from 'react';
import { meetingsApi } from '../services/api';
import MeetingCard from '../components/MeetingCard';

const emptyForm = { title: '', date: '', duration: 30, participants: '', transcript: '' };

export default function Dashboard({ notify }) {
  const [meetings, setMeetings] = useState([]);
  const [q, setQ] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [participantFilter, setParticipantFilter] = useState('');
  const [sort, setSort] = useState('recent');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await meetingsApi.list();
      setMeetings(Array.isArray(response.data) ? response.data : []);
    } catch {
      notify('Could not connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Extract unique participants for the dropdown filter
  const allParticipants = useMemo(() => {
    const set = new Set();
    meetings.forEach(m => {
      (m.participants || []).forEach(p => {
        if (p && typeof p === 'string' && p.trim()) {
          set.add(p.trim());
        }
      });
    });
    return Array.from(set).sort();
  }, [meetings]);

  const filtered = useMemo(() => {
    if (!Array.isArray(meetings)) return [];
    const query = q.toLowerCase().trim();

    const result = meetings.filter(m => {
      if (!m) return false;
      const participantsStr = (m.participants || []).join(' ');
      const matchesText = !query || `${m.title || ''} ${participantsStr}`.toLowerCase().includes(query);

      let meetingDate = '';
      if (m.date) {
        try {
          const d = new Date(m.date);
          if (!isNaN(d.getTime())) {
            meetingDate = d.toISOString().slice(0, 10);
          }
        } catch {}
      }
      const matchesDate = !dateFilter || meetingDate === dateFilter;

      const matchesParticipant = !participantFilter ||
        (m.participants || []).some(p => p && p.trim().toLowerCase() === participantFilter.toLowerCase());

      return matchesText && matchesDate && matchesParticipant;
    });

    return result.sort((a, b) => {
      const first = new Date(a.date || 0).getTime();
      const second = new Date(b.date || 0).getTime();
      return sort === 'oldest' ? first - second : second - first;
    });
  }, [meetings, q, dateFilter, participantFilter, sort]);

  const hasActiveFilters = Boolean(q || dateFilter || participantFilter);

  const clearAllFilters = () => {
    setQ('');
    setDateFilter('');
    setParticipantFilter('');
  };

  const submit = async e => {
    e.preventDefault();
    if (!form.title.trim()) {
      return notify('Please enter a meeting title');
    }

    try {
      await meetingsApi.create({
        title: form.title.trim(),
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        duration: Number(form.duration) > 0 ? Number(form.duration) : 30,
        participants: form.participants.split(',').map(x => x.trim()).filter(Boolean),
        transcript: form.transcript
      });
      setShow(false);
      setForm(emptyForm);
      notify('Meeting created successfully');
      await load();
    } catch {
      notify('Could not create meeting');
    }
  };

  return (
    <section>
      <div className="hero">
        <div>
          <div className="eyebrow">LIBRARY</div>
          <h1>Meetings</h1>
          <p className="muted">Your conversations, summaries and next steps in one place.</p>
        </div>
        <button onClick={() => setShow(true)}>+ New meeting</button>
      </div>

      <div className="toolbar">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="⌕  Search meetings or participants..."
        />
        <select
          value={participantFilter}
          onChange={e => setParticipantFilter(e.target.value)}
          title="Filter by participant"
        >
          <option value="">All participants</option>
          {allParticipants.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input
          className="date-filter"
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          title="Filter by date"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          title="Sort meetings"
        >
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button className="clear-filter" onClick={clearAllFilters}>
          ✕ Clear active filters
        </button>
      )}

      <div className="library-count">
        {hasActiveFilters ? (
          <span>Showing {filtered.length} of {meetings.length} meeting{meetings.length === 1 ? '' : 's'}</span>
        ) : (
          <span>{filtered.length} meeting{filtered.length === 1 ? '' : 's'}</span>
        )}
      </div>

      <div className="list">
        {loading && <div className="empty card">Loading meetings...</div>}
        {!loading && filtered.length > 0 && (
          filtered.map(m => <MeetingCard key={m._id} m={m} />)
        )}
        {!loading && filtered.length === 0 && (
          <div className="empty card">
            <h3>No meetings found</h3>
            <p className="muted">
              {hasActiveFilters ? 'No meetings match your current filters.' : 'No meetings exist yet. Create your first meeting above!'}
            </p>
            {hasActiveFilters && (
              <button className="secondary" style={{ marginTop: 12 }} onClick={clearAllFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {show && (
        <div className="modal-bg">
          <form className="modal" onSubmit={submit}>
            <div className="modal-head">
              <div>
                <div className="eyebrow">CREATE</div>
                <h2>New meeting</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShow(false)}>×</button>
            </div>

            <label>
              Title
              <input
                required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Capstone Project Discussion"
              />
            </label>
            <div className="two">
              <label>
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                />
              </label>
              <label>
                Duration (minutes)
                <input
                  type="number"
                  min="1"
                  value={form.duration}
                  onChange={e => setForm({ ...form, duration: e.target.value })}
                />
              </label>
            </div>
            <label>
              Participants (comma-separated)
              <input
                value={form.participants}
                onChange={e => setForm({ ...form, participants: e.target.value })}
                placeholder="Poojitha, Rahul, Ananya"
              />
            </label>
            <label>
              Transcript
              <textarea
                rows="7"
                value={form.transcript}
                onChange={e => setForm({ ...form, transcript: e.target.value })}
                placeholder={'Paste lines like:\n00:00 Rahul: Let’s start...\n00:15 Poojitha: The dashboard is ready...'}
              />
            </label>
            <p className="form-hint">
              Tip: use <strong>00:15 Speaker: text</strong> timestamps so transcript clicks can seek the demo recording.
            </p>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShow(false)}>Cancel</button>
              <button type="submit">Create meeting</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
