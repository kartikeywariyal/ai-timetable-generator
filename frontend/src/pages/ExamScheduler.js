import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X, CalendarDays, Clock, MapPin, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const emptyEntry = { date: '', startTime: '', endTime: '', subject: '', description: '', location: '' };
const emptyForm = { title: '', type: 'exam', entries: [] };

export default function ExamScheduler() {
  const [schedules, setSchedules] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [conflicts, setConflicts] = useState([]);

  const load = () => api.get('/schedules?type=exam').then(r => setSchedules(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditing(null); setConflicts([]); setModal(true); };
  const openEdit = s => {
    setForm({ title: s.title, type: 'exam', entries: s.entries });
    setEditing(s._id); setConflicts([]); setModal(true);
  };

  const addEntry = () => setForm({ ...form, entries: [...form.entries, { ...emptyEntry }] });
  const removeEntry = i => {
    const entries = form.entries.filter((_, idx) => idx !== i);
    setForm({ ...form, entries });
    detectConflicts(entries);
  };

  const updateEntry = (i, field, val) => {
    const entries = [...form.entries];
    entries[i] = { ...entries[i], [field]: val };
    setForm({ ...form, entries });
    detectConflicts(entries);
  };

  // Real-time conflict detection
  const detectConflicts = (entries) => {
    const found = [];
    const slots = {};
    entries.forEach((e, i) => {
      if (!e.date || !e.startTime) return;
      const key = `${e.date}-${e.startTime}`;
      if (slots[key] !== undefined) {
        found.push(`Entry ${slots[key] + 1} and Entry ${i + 1} clash on ${e.date} at ${e.startTime}`);
      } else {
        slots[key] = i;
      }
    });
    setConflicts(found);
  };

  const save = async e => {
    e.preventDefault();
    if (conflicts.length > 0) return toast.error('Fix conflicts before saving');
    try {
      if (editing) await api.put(`/schedules/${editing}`, form);
      else await api.post('/schedules', form);
      toast.success('Exam schedule saved'); setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async id => {
    if (!window.confirm('Delete exam schedule?')) return;
    await api.delete(`/schedules/${id}`); toast.success('Deleted'); load();
  };

  const view = async id => {
    const r = await api.get(`/schedules/${id}`);
    setViewData(r.data);
  };

  const grouped = viewData
    ? viewData.entries.reduce((acc, e) => { if (!acc[e.date]) acc[e.date] = []; acc[e.date].push(e); return acc; }, {})
    : {};

  return (
    <div className="page">
      <div className="topbar">
        <h2>Exam Scheduler</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> New Exam Schedule</button>
      </div>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {schedules.map(s => (
          <div className="card" key={s._id} style={{ borderTop: '3px solid #dc2626' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{s.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                  {s.entries.length} exams · {new Date(s.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span className="badge" style={{ background: '#fee2e2', color: '#dc2626' }}>Exam</span>
            </div>

            {/* Exam list preview */}
            <div style={{ marginBottom: 12 }}>
              {s.entries.slice(0, 4).map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, flex: 1 }}>{e.subject}</span>
                  <span style={{ color: '#64748b' }}>{e.date}</span>
                  <span style={{ color: '#94a3b8' }}>{e.startTime}</span>
                </div>
              ))}
              {s.entries.length > 4 && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>+{s.entries.length - 4} more exams</div>}
            </div>

            <div className="actions">
              <button className="btn btn-primary btn-sm" onClick={() => view(s._id)}>View</button>
              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => del(s._id)}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <CalendarDays size={40} />
            <p>No exam schedules yet. Click "New Exam Schedule" to create one.</p>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewData && (
        <div className="modal-overlay" onClick={() => setViewData(null)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{viewData.title}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setViewData(null)}><X size={14} /></button>
            </div>

            {/* Calendar-style grid */}
            {Object.keys(grouped).sort().map(date => (
              <div key={date} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#dc2626', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#fee2e2', borderRadius: 6 }}>
                  <CalendarDays size={14} /> {date}
                </div>
                {grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((e, i) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #fecaca', borderLeft: '4px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>{e.subject}</span>
                      <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>{e.startTime} – {e.endTime}</span>
                    </div>
                    {e.location && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} /> {e.location}
                      </div>
                    )}
                    {e.description && <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>{e.description}</div>}
                  </div>
                ))}
              </div>
            ))}
            {Object.keys(grouped).length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No exams scheduled.</p>}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit' : 'New'} Exam Schedule</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}><X size={14} /></button>
            </div>

            {/* Conflict warnings */}
            {conflicts.length > 0 && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.8rem', color: '#dc2626', marginBottom: 4 }}>
                  <AlertTriangle size={14} /> {conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''} Detected
                </div>
                {conflicts.map((c, i) => <div key={i} style={{ fontSize: '0.75rem', color: '#b91c1c' }}>• {c}</div>)}
              </div>
            )}

            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Schedule Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mid-Term Exams 2024" required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label className="form-label" style={{ margin: 0 }}>Exam Entries</label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addEntry}><Plus size={13} /> Add Exam</button>
              </div>

              {form.entries.map((entry, i) => (
                <div key={i} style={{ background: '#fff5f5', borderRadius: 8, padding: 12, marginBottom: 10, border: '1px solid #fecaca' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#dc2626' }}>Exam {i + 1}</span>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeEntry(i)}><X size={12} /></button>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Subject *</label>
                      <input className="form-input" value={entry.subject} onChange={e => updateEntry(i, 'subject', e.target.value)} placeholder="e.g. Mathematics" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Date *</label>
                      <input className="form-input" type="date" value={entry.date} onChange={e => updateEntry(i, 'date', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Start Time *</label>
                      <input className="form-input" type="time" value={entry.startTime} onChange={e => updateEntry(i, 'startTime', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">End Time</label>
                      <input className="form-input" type="time" value={entry.endTime} onChange={e => updateEntry(i, 'endTime', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Venue / Room</label>
                      <input className="form-input" value={entry.location} onChange={e => updateEntry(i, 'location', e.target.value)} placeholder="e.g. Hall A" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Notes</label>
                      <input className="form-input" value={entry.description} onChange={e => updateEntry(i, 'description', e.target.value)} placeholder="e.g. Bring calculator" />
                    </div>
                  </div>
                </div>
              ))}

              {form.entries.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8rem', background: '#fff5f5', borderRadius: 8, marginBottom: 12 }}>
                  Click "Add Exam" to add exam entries
                </div>
              )}

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', background: conflicts.length > 0 ? '#94a3b8' : undefined }}>
                {conflicts.length > 0 ? 'Fix Conflicts First' : 'Save Exam Schedule'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
