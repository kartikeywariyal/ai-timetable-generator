import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const empty = { name: '', capacity: 40, isLab: false, building: '' };

export default function Classrooms() {
  const [classrooms, setClassrooms] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const load = () => api.get('/classrooms').then(r => {
    setClassrooms(r.data);
    setSelectedItems(new Set());
    setSelectAll(false);
  });
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = c => { setForm({ name: c.name, capacity: c.capacity, isLab: c.isLab, building: c.building || '' }); setEditing(c._id); setModal(true); };

  const save = async e => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/classrooms/${editing}`, form);
      else await api.post('/classrooms', form);
      toast.success('Saved'); setModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
      setSelectAll(false);
    } else {
      setSelectedItems(new Set(classrooms.map(item => item._id)));
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
      toast.error('No classrooms selected');
      return;
    }
    
    if (!window.confirm(`Delete ${selectedItems.size} selected classrooms?`)) return;
    
    try {
      await Promise.all(
        Array.from(selectedItems).map(id => api.delete(`/classrooms/${id}`))
      );
      toast.success(`Deleted ${selectedItems.size} classrooms`);
      load();
    } catch (err) {
      toast.error('Failed to delete some classrooms');
    }
  };

  const del = async id => {
    if (!window.confirm('Delete classroom?')) return;
    await api.delete(`/classrooms/${id}`); toast.success('Deleted'); load();
  };

  return (
    <div className="page">
      <div className="topbar">
        <h2>Classrooms</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {classrooms.length > 0 && (
            <>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleSelectAll}
              >
                {selectAll ? 'Deselect All' : 'Select All'}
              </button>
              {selectedItems.size > 0 && (
                <button className="btn btn-danger btn-sm" onClick={bulkDelete}>
                  Delete Selected ({selectedItems.size})
                </button>
              )}
            </>
          )}
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Classroom</button>
        </div>
      </div>

      <div style={{ marginTop: 24 }} className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th style={{ width: 40 }}>Select</th><th>Name</th><th>Building</th><th>Capacity</th><th>Type</th><th>Actions</th></tr></thead>
            <tbody>
              {classrooms.map(c => (
                <tr key={c._id} style={{ background: selectedItems.has(c._id) ? '#f0f9ff' : 'transparent' }}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedItems.has(c._id)}
                      onChange={() => handleSelectItem(c._id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.building || '-'}</td>
                  <td>{c.capacity}</td>
                  <td><span className={`badge ${c.isLab ? 'badge-blue' : 'badge-green'}`}>{c.isLab ? 'Lab' : 'Classroom'}</span></td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}><Pencil size={13} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(c._id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {classrooms.length === 0 && <tr><td colSpan={6} className="empty-state">No classrooms found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Edit' : 'Add'} Classroom</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(false)}><X size={14} /></button>
            </div>
            <form onSubmit={save}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Room Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Building</label>
                  <input className="form-input" value={form.building} onChange={e => setForm({ ...form, building: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Capacity</label>
                  <input className="form-input" type="number" min={1} value={form.capacity} onChange={e => setForm({ ...form, capacity: +e.target.value })} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                  <input type="checkbox" id="isLab" checked={form.isLab} onChange={e => setForm({ ...form, isLab: e.target.checked })} />
                  <label htmlFor="isLab" className="form-label" style={{ margin: 0 }}>Lab Room</label>
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
