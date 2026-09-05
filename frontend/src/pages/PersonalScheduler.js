import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X, CalendarDays, Clock, MapPin, BookOpen } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const emptyEntry = { date: '', startTime: '', endTime: '', subject: '', description: '', location: '' };
const emptyForm = { title: '', type: 'personal', entries: [] };

const DAY_COLORS = ['#ede9fe','#dbeafe','#dcfce7','#ffedd5','#fce7f3','#e0f2fe','#fef9c3'];

export default function PersonalScheduler() {
  const [schedules, setSchedules] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [viewData, setViewData] = useState(null);

  const load = () => api.get('/schedules?type=personal').then(r => setSchedules(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = s => {
    setForm({ title: s.title, type: s.type, entries: s.entries });
    setEditing(s._id); setModal(true);
  };

  const addEntry = () => setForm({ ...form, entries: [...form.entries, { ...emptyEntry }] });
  const removeEntry = i => setForm({ ...form, entries: form.entries.filter((_, idx) => idx !== i) });
  const updateEntry = (i, field, val) => {
    const entries = [...form.entries];
    entries[i] = { ...entries[i], [field]: val };
    setForm({ ...form, entries });
  };

  const save = async e => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/schedules/${editing}`, form);
      else await api.post('/schedules', form);
      toast.success('Schedule saved'); setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async id => {
    if (!window.confirm('Delete schedule?')) return;
    await api.delete(`/schedules/${id}`); toast.success('Deleted'); load();
  };

  const view = async id => {
    const r = await api.get(`/schedules/${id}`);
    setViewData(r.data); setViewId(id);
  };

  // Group entries by date for calendar view
  const grouped = viewData ? viewData.entries.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {}) : {};

  return (
    <div className="page">
      <div className="topbar">
        <h2>Personal Scheduler</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> New Schedule</button>
      </div>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {schedules.map((s, i) => (
          <div className="card" key={s._id} style={{ borderTop: `3px solid ${DAY_COLORS[i % DAY_COLORS.length].replace('fe','c4').replace('f3','c4')}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{s.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                  {s.entries.length} entries · {new Date(s.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span className="badge badge-purple">Personal</span>
            </div>
            {/* Mini preview of next 3 entries */}
            {s.entries.slice(0, 3).map((e, j) => (
              <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, fontSize: '0.78rem', color: '#475569' }}>
                <CalendarDays size={12} style={{ color: '#6366f1', flexShrink: 0 }} />
                <span style={{ fontWeight: 500 }}>{e.date}</span>
                <Clock size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                <span>{e.startTime}–{e.endTime}</span>
                <span style={{ color: '#1e293b', fontWeight: 500 }}>{e.subject}</span>
              </div>
            ))}
            {s.entries.length > 3 && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 8 }}>+{s.entries.length - 3} more</div>}
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={() => view(s._id)}>View</button>
              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => del(s._id)}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <CalendarDays size={40} />
            <p>No personal schedules yet. Click "New Schedule" to create one.</p>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewId && viewData && (
        <div className="modal-overlay" onClick={() => setViewId(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{viewData.title}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setViewId(null)}><X size={14} /></button>
            </div>
            {Object.keys(grouped).sort().map(date => (
              <div key={date} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#4f46e5', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CalendarDays size={14} /> {date}
                </div>
                {grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((e, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 6, borderLeft: '3px solid #6366f1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{e.subject}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{e.startTime} – {e.endTime}</span>
                    </div>
                    {e.description && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>{e.description}</div>}
                    {e.location && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} /> {e.location}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {Object.keys(grouped).length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No entries yet.</p>}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit' : 'New'} Personal Schedule</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}><X size={14} /></button>
            </div>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Schedule Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Week 1 Study Plan" required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label className="form-label" style={{ margin: 0 }}>Entries</label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addEntry}><Plus size={13} /> Add Entry</button>
              </div>
              {form.entries.map((entry, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Entry {i + 1}</span>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeEntry(i)}><X size={12} /></button>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Date</label>
                      <input className="form-input" type="date" value={entry.date} onChange={e => updateEntry(i, 'date', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Subject / Task</label>
                      <input className="form-input" value={entry.subject} onChange={e => updateEntry(i, 'subject', e.target.value)} placeholder="e.g. Mathematics" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Start Time</label>
                      <input className="form-input" type="time" value={entry.startTime} onChange={e => updateEntry(i, 'startTime', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">End Time</label>
                      <input className="form-input" type="time" value={entry.endTime} onChange={e => updateEntry(i, 'endTime', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Location</label>
                      <input className="form-input" value={entry.location} onChange={e => updateEntry(i, 'location', e.target.value)} placeholder="e.g. Library" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Notes</label>
                      <input className="form-input" value={entry.description} onChange={e => updateEntry(i, 'description', e.target.value)} placeholder="Optional notes" />
                    </div>
                  </div>
                </div>
              ))}
              {form.entries.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8rem', background: '#f8fafc', borderRadius: 8, marginBottom: 12 }}>
                  Click "Add Entry" to add study sessions
                </div>
              )}
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Save Schedule</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
