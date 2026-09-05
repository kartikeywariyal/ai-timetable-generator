import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', section: '', strength: 30, subjects: [] });
  const [editing, setEditing] = useState(null);

  const load = () => {
    api.get('/classes').then(r => setClasses(r.data));
    api.get('/subjects').then(r => setSubjects(r.data));
    api.get('/teachers').then(r => setTeachers(r.data));
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ name: '', section: '', strength: 30, subjects: [] }); setEditing(null); setModal(true); };
  const openEdit = c => {
    setForm({
      name: c.name, section: c.section || '', strength: c.strength,
      subjects: c.subjects.map(s => ({ subject: s.subject?._id || s.subject, teacher: s.teacher?._id || s.teacher }))
    });
    setEditing(c._id); setModal(true);
  };

  const addSubjectRow = () => setForm({ ...form, subjects: [...form.subjects, { subject: '', teacher: '' }] });
  const removeSubjectRow = i => setForm({ ...form, subjects: form.subjects.filter((_, idx) => idx !== i) });
  const updateSubjectRow = (i, field, val) => {
    const subs = [...form.subjects];
    subs[i] = { ...subs[i], [field]: val };
    setForm({ ...form, subjects: subs });
  };

  const save = async e => {
    e.preventDefault();
    try {
      const validSubjects = form.subjects
        .filter(s => s.subject)
        .map(s => ({
          subject: s.subject,
          teacher: s.teacher && String(s.teacher).trim() ? s.teacher : null
        }));
      const payload = { ...form, subjects: validSubjects };
      if (editing) await api.put(`/classes/${editing}`, payload);
      else await api.post('/classes', payload);
      toast.success('Saved'); setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async id => {
    if (!window.confirm('Delete class?')) return;
    await api.delete(`/classes/${id}`); toast.success('Deleted'); load();
  };

  return (
    <div className="page">
      <div className="topbar">
        <h2>Classes</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Class</button>
      </div>

      <div style={{ marginTop: 24 }} className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Class</th><th>Section</th><th>Strength</th><th>Subjects</th><th>Actions</th></tr></thead>
            <tbody>
              {classes.map(c => (
                <tr key={c._id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.section || '-'}</td>
                  <td>{c.strength}</td>
                  <td>{c.subjects.map((s, i) => <span key={i} className="chip">{s.subject?.name}</span>)}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}><Pencil size={13} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(c._id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {classes.length === 0 && <tr><td colSpan={5} className="empty-state">No classes found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit' : 'Add'} Class</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}><X size={14} /></button>
            </div>
            <form onSubmit={save}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Class Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Section</label>
                  <input className="form-input" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Strength</label>
                <input className="form-input" type="number" min={1} value={form.strength} onChange={e => setForm({ ...form, strength: +e.target.value })} />
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>Subject-Teacher Assignments</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addSubjectRow}><Plus size={12} /> Add</button>
                </div>
                {form.subjects.map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select className="form-select" value={row.subject} onChange={e => updateSubjectRow(i, 'subject', e.target.value)}>
                      <option value="">Subject</option>
                      {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                    <select className="form-select" value={row.teacher} onChange={e => updateSubjectRow(i, 'teacher', e.target.value)}>
                      <option value="">Teacher</option>
                      {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeSubjectRow(i)}><X size={12} /></button>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Save</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
