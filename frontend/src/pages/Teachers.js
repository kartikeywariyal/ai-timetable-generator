import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ALL_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const empty = { name: '', email: '', course: '', subjects: [], availability: [], maxHoursPerDay: 6, maxHoursPerWeek: 30 };

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const load = () => {
    api.get('/teachers').then(r => {
      setTeachers(r.data);
      setSelectedItems(new Set());
      setSelectAll(false);
    });
    api.get('/subjects').then(r => setSubjects(r.data));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = t => {
    setForm({
      name: t.name, email: t.email || '', course: t.course || '',
      subjects: t.subjects.map(s => s._id),
      availability: t.availability || [],
      maxHoursPerDay: t.maxHoursPerDay,
      maxHoursPerWeek: t.maxHoursPerWeek
    });
    setEditing(t._id);
    setModal(true);
  };

  const save = async e => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/teachers/${editing}`, form);
      else await api.post('/teachers', form);
      toast.success('Saved');
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleSelectAll = (items) => {
    if (selectAll) {
      setSelectedItems(new Set());
      setSelectAll(false);
    } else {
      setSelectedItems(new Set(items.map(item => item._id)));
      setSelectAll(true);
    }
  };

  const handleSelectItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    setSelectAll(false);
  };

  const bulkDelete = async () => {
    if (selectedItems.size === 0) {
      toast.error('No teachers selected');
      return;
    }
    
    if (!window.confirm(`Delete ${selectedItems.size} selected teachers?`)) return;
    
    try {
      await Promise.all(
        Array.from(selectedItems).map(id => api.delete(`/teachers/${id}`))
      );
      toast.success(`Deleted ${selectedItems.size} teachers`);
      load();
    } catch (err) {
      toast.error('Failed to delete some teachers');
    }
  };

  const del = async id => {
    if (!window.confirm('Delete teacher?')) return;
    await api.delete(`/teachers/${id}`);
    toast.success('Deleted');
    load();
  };

  const togglePeriod = (day, period) => {
    const avail = [...form.availability];
    const idx = avail.findIndex(a => a.day === day);
    if (idx === -1) {
      avail.push({ day, periods: [period] });
    } else {
      const periods = avail[idx].periods.includes(period)
        ? avail[idx].periods.filter(p => p !== period)
        : [...avail[idx].periods, period];
      if (periods.length === 0) avail.splice(idx, 1);
      else avail[idx] = { ...avail[idx], periods };
    }
    setForm({ ...form, availability: avail });
  };

  const isPeriodAvail = (day, period) => {
    const a = form.availability.find(a => a.day === day);
    return a ? a.periods.includes(period) : false;
  };

  const filtered = teachers.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesCourse = !selectedCourse || t.course === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  // Group teachers by course
  const groupedTeachers = filtered.reduce((groups, teacher) => {
    const course = teacher.course || 'Uncategorized';
    if (!groups[course]) groups[course] = [];
    groups[course].push(teacher);
    return groups;
  }, {});

  const courses = [...new Set(teachers.map(t => t.course).filter(Boolean))];

  return (
    <div className="page">
      <div className="topbar">
        <h2>Teachers</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <select className="form-select" style={{ minWidth: 150 }} value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
            <option value="">All Courses</option>
            {courses.map(course => <option key={course} value={course}>{course}</option>)}
          </select>
          <div className="search-bar">
            <input placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Teacher</button>
        </div>
      </div>

      {Object.entries(groupedTeachers).map(([course, courseTeachers]) => (
        <div key={course} style={{ marginTop: 24 }} className="card">
          <div className="card-header">
            <span className="card-title">{course} ({courseTeachers.length} teachers)</span>
            {courseTeachers.length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => handleSelectAll(courseTeachers)}
                >
                  {selectAll ? 'Deselect All' : 'Select All'}
                </button>
                {selectedItems.size > 0 && (
                  <button className="btn btn-danger btn-sm" onClick={bulkDelete}>
                    Delete Selected ({selectedItems.size})
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Select</th>
                  <th>Name</th><th>Email</th><th>Subjects</th>
                  <th>Max/Day</th><th>Max/Week</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courseTeachers.map(t => (
                  <tr key={t._id} style={{ background: selectedItems.has(t._id) ? '#f0f9ff' : 'transparent' }}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedItems.has(t._id)}
                        onChange={() => handleSelectItem(t._id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td><strong>{t.name}</strong></td>
                    <td>{t.email || '-'}</td>
                    <td>{t.subjects.map(s => <span key={s._id} className="chip">{s.name}</span>)}</td>
                    <td>{t.maxHoursPerDay}h</td>
                    <td>{t.maxHoursPerWeek}h</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}><Pencil size={13} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(t._id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      
      {Object.keys(groupedTeachers).length === 0 && (
        <div style={{ marginTop: 24 }} className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Select</th>
                  <th>Name</th><th>Email</th><th>Subjects</th>
                  <th>Max/Day</th><th>Max/Week</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={7} className="empty-state">No teachers found</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit' : 'Add'} Teacher</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}><X size={14} /></button>
            </div>
            <form onSubmit={save}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Course *</label>
                <select className="form-select" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} required>
                  <option value="">Select Course</option>
                  <option value="BTech">BTech</option>
                  <option value="BCS">BCS</option>
                  <option value="MCA">MCA</option>
                  <option value="MBA">MBA</option>
                  <option value="MSc">MSc</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subjects</label>
                <select className="form-select" multiple value={form.subjects}
                  onChange={e => setForm({ ...form, subjects: [...e.target.selectedOptions].map(o => o.value) })}>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Max Hours/Day</label>
                  <input className="form-input" type="number" min={1} max={10} value={form.maxHoursPerDay}
                    onChange={e => setForm({ ...form, maxHoursPerDay: +e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Hours/Week</label>
                  <input className="form-input" type="number" min={1} max={50} value={form.maxHoursPerWeek}
                    onChange={e => setForm({ ...form, maxHoursPerWeek: +e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Availability (click to toggle)</label>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ fontSize: '0.75rem', borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '4px 6px', textAlign: 'left' }}>Day</th>
                        {ALL_PERIODS.map(p => <th key={p} style={{ padding: '4px 6px' }}>P{p}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map(day => (
                        <tr key={day}>
                          <td style={{ padding: '4px 6px', fontWeight: 500 }}>{day.slice(0, 3)}</td>
                          {ALL_PERIODS.map(p => (
                            <td key={p} style={{ padding: '4px 6px', textAlign: 'center' }}>
                              <div
                                onClick={() => togglePeriod(day, p)}
                                style={{
                                  width: 22, height: 22, borderRadius: 4, cursor: 'pointer',
                                  background: isPeriodAvail(day, p) ? '#6366f1' : '#e2e8f0',
                                  margin: 'auto'
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Save</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
