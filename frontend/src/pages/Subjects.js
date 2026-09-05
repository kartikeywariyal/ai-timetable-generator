import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const empty = { name: '', code: '', course: '', hoursPerWeek: 3, isLab: false };

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedCourses, setSelectedCourses] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const load = () => api.get('/subjects').then(r => {
    setSubjects(r.data);
    setSelectedItems(new Set());
    setSelectAll(false);
    setSelectedCourses(new Set());
  });
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = s => { 
    setForm({ 
      name: s.name, 
      code: s.code || '', 
      course: s.course || '',
      hoursPerWeek: s.hoursPerWeek, 
      isLab: s.isLab 
    }); 
    setEditing(s._id); 
    setModal(true); 
  };

  const save = async e => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/subjects/${editing}`, form);
      else await api.post('/subjects', form);
      toast.success('Saved'); setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
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

  const handleCourseFilter = (course) => {
    const newSelected = new Set(selectedCourses);
    if (newSelected.has(course)) {
      newSelected.delete(course);
    } else {
      newSelected.add(course);
    }
    setSelectedCourses(newSelected);
  };

  const bulkDelete = async () => {
    if (selectedItems.size === 0) {
      toast.error('No subjects selected');
      return;
    }
    
    if (!window.confirm(`Delete ${selectedItems.size} selected subjects?`)) return;
    
    try {
      await Promise.all(
        Array.from(selectedItems).map(id => api.delete(`/subjects/${id}`))
      );
      toast.success(`Deleted ${selectedItems.size} subjects`);
      load();
    } catch (err) {
      toast.error('Failed to delete some subjects');
    }
  };

  const del = async id => {
    if (!window.confirm('Delete subject?')) return;
    await api.delete(`/subjects/${id}`); toast.success('Deleted'); load();
  };

  // Filter and group subjects by course
  const filtered = subjects.filter(s => {
    const courseMatch = !selectedCourse || s.course === selectedCourse;
    const checkboxMatch = selectedCourses.size === 0 || selectedCourses.has(s.course);
    return courseMatch && checkboxMatch;
  });
  
  const groupedSubjects = filtered.reduce((groups, subject) => {
    const course = subject.course || 'Uncategorized';
    if (!groups[course]) groups[course] = [];
    groups[course].push(subject);
    return groups;
  }, {});

  const courses = [...new Set(subjects.map(s => s.course).filter(Boolean))];

  return (
    <div className="page">
      <div className="topbar">
        <h2>Subjects</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <select className="form-select" style={{ minWidth: 150 }} value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
            <option value="">All Courses</option>
            {courses.map(course => <option key={course} value={course}>{course}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Subject</button>
        </div>
      </div>

      {/* Course Filter Checkboxes */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Filter by Courses</span>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => setSelectedCourses(new Set())}
          >
            Clear All
          </button>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {courses.map(course => (
            <label key={course} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={selectedCourses.has(course)}
                onChange={() => handleCourseFilter(course)}
                style={{ cursor: 'pointer' }}
              />
              <span>{course}</span>
              <span className="badge badge-secondary">
                {subjects.filter(s => s.course === course).length}
              </span>
            </label>
          ))}
        </div>
      </div>

      {Object.entries(groupedSubjects).map(([course, courseSubjects]) => (
        <div key={course} style={{ marginTop: 24 }} className="card">
          <div className="card-header">
            <span className="card-title">{course} ({courseSubjects.length} subjects)</span>
            {courseSubjects.length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => handleSelectAll(courseSubjects)}
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
              <thead><tr><th style={{ width: 40 }}>Select</th><th>Name</th><th>Code</th><th>Hours/Week</th><th>Type</th><th>Actions</th></tr></thead>
              <tbody>
                {courseSubjects.map(s => (
                  <tr key={s._id} style={{ background: selectedItems.has(s._id) ? '#f0f9ff' : 'transparent' }}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedItems.has(s._id)}
                        onChange={() => handleSelectItem(s._id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.code || '-'}</td>
                    <td>{s.hoursPerWeek}</td>
                    <td><span className={`badge ${s.isLab ? 'badge-blue' : 'badge-purple'}`}>{s.isLab ? 'Lab' : 'Theory'}</span></td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}><Pencil size={13} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(s._id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      
      {Object.keys(groupedSubjects).length === 0 && (
        <div style={{ marginTop: 24 }} className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th style={{ width: 40 }}>Select</th><th>Name</th><th>Code</th><th>Hours/Week</th><th>Type</th><th>Actions</th></tr></thead>
              <tbody>
                <tr><td colSpan={6} className="empty-state">No subjects found</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit' : 'Add'} Subject</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}><X size={14} /></button>
            </div>
            <form onSubmit={save}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Code</label>
                  <input className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
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
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hours/Week</label>
                  <input className="form-input" type="number" min={1} max={10} value={form.hoursPerWeek}
                    onChange={e => setForm({ ...form, hoursPerWeek: +e.target.value })} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                  <input type="checkbox" id="isLab" checked={form.isLab} onChange={e => setForm({ ...form, isLab: e.target.checked })} />
                  <label htmlFor="isLab" className="form-label" style={{ margin: 0 }}>Lab Subject</label>
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
