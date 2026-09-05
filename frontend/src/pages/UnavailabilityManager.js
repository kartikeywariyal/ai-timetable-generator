import React, { useEffect, useState } from 'react';
import { Plus, Calendar, AlertTriangle, CheckCircle, XCircle, Clock, Users, Zap, Download, Share2 } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function UnavailabilityManager() {
  const [unavailabilities, setUnavailabilities] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [timetableView, setTimetableView] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const load = () => {
    api.get('/unavailability').then(r => {
      setUnavailabilities(r.data);
      setSelectedItems(new Set());
      setSelectAll(false);
    });
    api.get('/teachers').then(r => setTeachers(r.data));
    api.get('/timetable').then(r => setTimetables(r.data));
  };
  useEffect(() => { load(); }, []);

  const openModal = () => {
    setForm({
      teacher: '',
      type: 'leave',
      startDate: '',
      endDate: '',
      isFullDay: true,
      specificSlots: [],
      reason: ''
    });
    setModal('create');
  };

  const addUnavailability = async e => {
    e.preventDefault();
    try {
      await api.post('/unavailability', form);
      toast.success('Unavailability added');
      setModal(null); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/unavailability/${id}/status`, { status });
    toast.success(`${status === 'approved' ? 'Approved' : 'Rejected'}`);
    load();
  };

  const checkConflicts = async () => {
    if (!form.timetableId || !form.startDate || !form.endDate) {
      toast.error('Please select timetable and date range');
      return;
    }
    
    // Calculate days of the week for the date range
    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);
    const daysInRange = new Set();
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Iterate through each date in the range
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayName = dayNames[date.getDay()];
      daysInRange.add(dayName);
    }
    
    const relevantDays = Array.from(daysInRange);
    
    setLoading(true);
    try {
      const { data } = await api.post('/unavailability/check-conflicts', {
        timetableId: form.timetableId,
        startDate: form.startDate,
        endDate: form.endDate,
        relevantDays // Send the calculated days
      });
      
      // Filter conflicts to only show those on relevant days
      const filteredConflicts = data.conflicts.filter(conflict => 
        relevantDays.includes(conflict.entry.day)
      );
      
      setConflicts(filteredConflicts);
      
      if (filteredConflicts.length > 0) {
        toast.success(`Found ${filteredConflicts.length} conflicts on ${relevantDays.join(', ')}`);
      } else {
        toast.success(`No conflicts found for selected dates (${relevantDays.join(', ')})`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const autoAssignSubstitutes = async () => {
    if (conflicts.length === 0) return;
    
    try {
      const { data } = await api.post('/unavailability/auto-assign-substitutes', {
        timetableId: form.timetableId,
        conflicts
      });
      toast.success(data.message);
      setConflicts([]);
      // Load updated timetable view
      loadTimetableView(form.timetableId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const loadTimetableView = async (timetableId) => {
    if (!timetableId) {
      setTimetableView(null);
      return;
    }
    try {
      const { data } = await api.get(`/substitutes/timetable/${timetableId}`);
      setTimetableView(data);
    } catch (err) {
      toast.error('Failed to load timetable view');
    }
  };

  const exportUpdatedPDF = () => {
    if (!timetableView) return;
    
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(`ChronoGen - ${timetableView.name}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Unavailability Resolved Timetable | Generated: ${new Date().toLocaleDateString()}`, 14, 22);
    doc.text(`Fitness: ${timetableView.fitnessScore}% | Active Substitutions: ${timetableView.substitutes.length}`, 14, 28);

    const days = timetableView.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = timetableView.periods || [];
    
    const head = [['Day', ...periods.map(p => `P${p.periodNumber}\n${p.startTime}-${p.endTime}`)]];
    const body = days.map(day => {
      const row = [day];
      periods.forEach(period => {
        const entry = timetableView.entries.find(e => e.day === day && e.period === period.periodNumber);
        const substitute = timetableView.substitutes.find(s => 
          s.originalEntry.day === day && s.originalEntry.period === period.periodNumber && s.status === 'approved'
        );
        
        if (entry) {
          let cellText = `${entry.class?.name || ''}\n${entry.subject?.name || ''}`;
          if (substitute) {
            cellText += substitute.isLibrary ? '\n📚 Library' : `\n${substitute.substituteTeacher?.name || ''} (SUB)`;
          } else {
            cellText += `\n${entry.teacher?.name || ''}`;
          }
          cellText += `\n${entry.classroom?.name || ''}`;
          row.push(cellText);
        } else {
          row.push('Free');
        }
      });
      return row;
    });

    autoTable(doc, { 
      head, 
      body, 
      startY: 35, 
      styles: { fontSize: 8, cellPadding: 3 }, 
      headStyles: { fillColor: [99, 102, 241] },
      didParseCell: (data) => {
        if (data.row.index > 0 && data.column.index > 0) {
          const day = days[data.row.index - 1];
          const period = periods[data.column.index - 1];
          if (period) {
            const substitute = timetableView.substitutes.find(s => 
              s.originalEntry.day === day && s.originalEntry.period === period.periodNumber && s.status === 'approved'
            );
            if (substitute) {
              data.cell.styles.fillColor = substitute.isLibrary ? [254, 243, 199] : [219, 234, 254];
            }
          }
        }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text('Legend:', 14, finalY);
    doc.setFillColor(219, 234, 254);
    doc.rect(14, finalY + 3, 5, 3, 'F');
    doc.text('Substitute Teacher', 22, finalY + 5);
    doc.setFillColor(254, 243, 199);
    doc.rect(80, finalY + 3, 5, 3, 'F');
    doc.text('Library Period', 88, finalY + 5);
    
    doc.save(`${timetableView.name}_unavailability_resolved.pdf`);
    toast.success('PDF exported successfully');
  };

  const exportUpdatedExcel = () => {
    if (!timetableView) return;
    
    const wb = XLSX.utils.book_new();
    const days = timetableView.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = timetableView.periods || [];
    
    const rows = [['Day', ...periods.map(p => `P${p.periodNumber} (${p.startTime}-${p.endTime})`)]];
    
    days.forEach(day => {
      const row = [day];
      periods.forEach(period => {
        const entry = timetableView.entries.find(e => e.day === day && e.period === period.periodNumber);
        const substitute = timetableView.substitutes.find(s => 
          s.originalEntry.day === day && s.originalEntry.period === period.periodNumber && s.status === 'approved'
        );
        
        if (entry) {
          let cellText = `${entry.class?.name || ''} - ${entry.subject?.name || ''}`;
          if (substitute) {
            cellText += substitute.isLibrary ? ' | 📚 Library' : ` | ${substitute.substituteTeacher?.name || ''} (SUB)`;
          } else {
            cellText += ` | ${entry.teacher?.name || ''}`;
          }
          cellText += ` | ${entry.classroom?.name || ''}`;
          row.push(cellText);
        } else {
          row.push('Free');
        }
      });
      rows.push(row);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Resolved Timetable');
    
    if (timetableView.substitutes.length > 0) {
      const subRows = [['Type', 'Day', 'Period', 'Class', 'Subject', 'Original Teacher', 'Substitute/Action', 'Reason']];
      timetableView.substitutes.forEach(sub => {
        subRows.push([
          sub.type === 'substitute' ? 'Substitute' : 'Swap',
          sub.originalEntry.day,
          `P${sub.originalEntry.period}`,
          sub.originalEntry.class?.name || '',
          sub.originalEntry.subject?.name || '',
          sub.originalEntry.teacher?.name || '',
          sub.isLibrary ? '📚 Library' : (sub.substituteTeacher?.name || sub.swapWith?.teacher?.name || ''),
          sub.reason || ''
        ]);
      });
      const subWs = XLSX.utils.aoa_to_sheet(subRows);
      XLSX.utils.book_append_sheet(wb, subWs, 'Substitutions');
    }
    
    XLSX.writeFile(wb, `${timetableView.name}_unavailability_resolved.xlsx`);
    toast.success('Excel exported successfully');
  };

  const shareUpdatedTimetable = async () => {
    if (!timetableView) return;
    
    const shareData = {
      title: `${timetableView.name} - Unavailability Resolved`,
      text: `Timetable with unavailability conflicts resolved. ${timetableView.substitutes.length} substitutions applied. Fitness: ${timetableView.fitnessScore}%`,
      url: window.location.href
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Shared successfully');
      } catch (err) {
        if (err.name !== 'AbortError') {
          fallbackShare(shareData);
        }
      }
    } else {
      fallbackShare(shareData);
    }
  };

  const fallbackShare = (shareData) => {
    const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
    navigator.clipboard.writeText(shareText).then(() => {
      toast.success('Link copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
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
      toast.error('No items selected');
      return;
    }
    
    if (!window.confirm(`Delete ${selectedItems.size} selected unavailability records?`)) return;
    
    try {
      await Promise.all(
        Array.from(selectedItems).map(id => api.delete(`/unavailability/${id}`))
      );
      toast.success(`Deleted ${selectedItems.size} records`);
      load();
    } catch (err) {
      toast.error('Failed to delete some records');
    }
  };

  const del = async id => {
    if (!window.confirm('Delete this record?')) return;
    await api.delete(`/unavailability/${id}`);
    toast.success('Deleted'); load();
  };

  const pending = unavailabilities.filter(u => u.status === 'pending');
  const approved = unavailabilities.filter(u => u.status === 'approved');

  const typeColors = {
    leave: '#ef4444',
    exam_duty: '#f59e0b',
    event: '#8b5cf6',
    meeting: '#06b6d4',
    training: '#10b981',
    other: '#6b7280'
  };

  const typeIcons = {
    leave: '🏖️',
    exam_duty: '📝',
    event: '🎉',
    meeting: '👥',
    training: '📚',
    other: '📋'
  };

  return (
    <div className="page">
      <div className="topbar">
        <h2>Teacher Unavailability</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={openModal}>
            <Plus size={16} /> Add Unavailability
          </button>
          <button className="btn btn-secondary" onClick={() => setModal('conflicts')}>
            <AlertTriangle size={16} /> Check Conflicts
          </button>
        </div>
      </div>

      {/* Resolved Timetable View */}
      {timetableView && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <span className="card-title">Resolved Timetable - {timetableView.name}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Shows schedule with unavailability conflicts resolved</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-success btn-sm" onClick={exportUpdatedPDF}>
                  <Download size={14} /> PDF
                </button>
                <button className="btn btn-success btn-sm" onClick={exportUpdatedExcel}>
                  <Download size={14} /> Excel
                </button>
                <button className="btn btn-secondary btn-sm" onClick={shareUpdatedTimetable}>
                  <Share2 size={14} /> Share
                </button>
              </div>
            </div>
          </div>
          <div className="timetable-grid" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '8px', border: '1px solid #e2e8f0', minWidth: 80 }}>Day</th>
                  {timetableView.periods?.map(p => (
                    <th key={p.periodNumber} style={{ padding: '8px', border: '1px solid #e2e8f0', minWidth: 120 }}>
                      P{p.periodNumber}<br />
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.startTime}-{p.endTime}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timetableView.days?.map(day => (
                  <tr key={day}>
                    <td style={{ padding: '8px', border: '1px solid #e2e8f0', fontWeight: 600, background: '#f8fafc' }}>
                      {day}
                    </td>
                    {timetableView.periods?.map(period => {
                      const entry = timetableView.entries.find(e => e.day === day && e.period === period.periodNumber);
                      const substitute = timetableView.substitutes.find(s => 
                        s.originalEntry.day === day && s.originalEntry.period === period.periodNumber && s.status === 'approved'
                      );
                      
                      return (
                        <td key={period.periodNumber} style={{ 
                          padding: '6px', 
                          border: '1px solid #e2e8f0',
                          background: substitute ? (substitute.isLibrary ? '#fef3c7' : '#dbeafe') : 'white'
                        }}>
                          {entry ? (
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.75rem' }}>{entry.class?.name}</div>
                              <div style={{ color: '#4f46e5', fontSize: '0.7rem' }}>{entry.subject?.name}</div>
                              <div style={{ color: substitute ? '#dc2626' : '#059669', fontSize: '0.7rem' }}>
                                {substitute ? (
                                  substitute.isLibrary ? '📚 Library' : substitute.substituteTeacher?.name
                                ) : (
                                  entry.teacher?.name
                                )}
                              </div>
                              <div style={{ color: '#64748b', fontSize: '0.65rem' }}>{entry.classroom?.name}</div>
                              {substitute && (
                                <div style={{ 
                                  background: substitute.isLibrary ? '#f59e0b' : '#2563eb', 
                                  color: 'white', 
                                  fontSize: '0.6rem', 
                                  padding: '1px 4px', 
                                  borderRadius: 3, 
                                  marginTop: 2,
                                  display: 'inline-block'
                                }}>
                                  RESOLVED
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Free</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px', background: '#f8fafc', fontSize: '0.75rem', color: '#64748b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 12, height: 12, background: '#dbeafe', border: '1px solid #93c5fd' }}></div>
                  <span>Substitute Teacher</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 12, height: 12, background: '#fef3c7', border: '1px solid #fcd34d' }}></div>
                  <span>Library Period</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ background: '#2563eb', color: 'white', padding: '1px 4px', borderRadius: 2, fontSize: '0.6rem' }}>RESOLVED</span>
                  <span>Unavailability Resolved</span>
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                Conflicts Resolved: {timetableView.substitutes.length} | Updated: {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Approvals */}
      {pending.length > 0 && (
        <div className="card" style={{ marginTop: 24, borderTop: '3px solid #f59e0b' }}>
          <div className="card-header">
            <span className="card-title">Pending Approvals ({pending.length})</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Teacher</th><th>Type</th><th>Period</th><th>Reason</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pending.map(u => (
                  <tr key={u._id}>
                    <td><strong>{u.teacher?.name}</strong></td>
                    <td>
                      <span style={{ color: typeColors[u.type] }}>
                        {typeIcons[u.type]} {u.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem' }}>
                        {new Date(u.startDate).toLocaleDateString()} - {new Date(u.endDate).toLocaleDateString()}
                        {u.isFullDay ? ' (Full Day)' : ' (Specific Slots)'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{u.reason || '-'}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-success btn-sm" onClick={() => updateStatus(u._id, 'approved')}>
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => updateStatus(u._id, 'rejected')}>
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approved Unavailabilities */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <span className="card-title">Active Unavailabilities ({approved.length})</span>
          {approved.length > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => handleSelectAll(approved)}
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
                <th>Teacher</th><th>Type</th><th>Period</th><th>Reason</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {approved.map(u => (
                <tr key={u._id} style={{ background: selectedItems.has(u._id) ? '#f0f9ff' : 'transparent' }}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedItems.has(u._id)}
                      onChange={() => handleSelectItem(u._id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td><strong>{u.teacher?.name}</strong></td>
                  <td>
                    <span style={{ color: typeColors[u.type] }}>
                      {typeIcons[u.type]} {u.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem' }}>
                      {new Date(u.startDate).toLocaleDateString()} - {new Date(u.endDate).toLocaleDateString()}
                      <br />
                      {u.isFullDay ? (
                        <span style={{ color: '#dc2626' }}>Full Day</span>
                      ) : (
                        <span style={{ color: '#2563eb' }}>Specific Slots</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{u.reason || '-'}</td>
                  <td>
                    <span className="badge badge-green">Active</span>
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => del(u._id)}>Remove</button>
                  </td>
                </tr>
              ))}
              {approved.length === 0 && (
                <tr><td colSpan={7} className="empty-state">No active unavailabilities</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Unavailability Modal */}
      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Teacher Unavailability</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={addUnavailability}>
              <div className="form-group">
                <label className="form-label">Teacher</label>
                <select className="form-select" value={form.teacher} onChange={e => setForm({ ...form, teacher: e.target.value })} required>
                  <option value="">Select Teacher</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="leave">🏖️ Leave</option>
                    <option value="exam_duty">📝 Exam Duty</option>
                    <option value="event">🎉 Event</option>
                    <option value="meeting">👥 Meeting</option>
                    <option value="training">📚 Training</option>
                    <option value="other">📋 Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <select className="form-select" value={form.isFullDay} onChange={e => setForm({ ...form, isFullDay: e.target.value === 'true' })}>
                    <option value="true">Full Day</option>
                    <option value="false">Specific Slots</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="date" value={form.startDate} 
                    onChange={e => setForm({ ...form, startDate: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="date" value={form.endDate} 
                    onChange={e => setForm({ ...form, endDate: e.target.value })} required />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Reason</label>
                <input className="form-input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} 
                  placeholder="Brief description" />
              </div>
              
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Add Unavailability
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Conflict Checker Modal */}
      {modal === 'conflicts' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Check Timetable Conflicts</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>×</button>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Timetable</label>
                <select className="form-select" value={form.timetableId} onChange={e => setForm({ ...form, timetableId: e.target.value })}>
                  <option value="">Select Timetable</option>
                  {timetables.map(t => <option key={t._id} value={t._id}>{t.name} ({t.fitnessScore}%)</option>)}
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input className="form-input" type="date" value={form.startDate} 
                  onChange={e => {
                    setForm({ ...form, startDate: e.target.value });
                    // Clear conflicts when date changes
                    setConflicts([]);
                    setTimetableView(null);
                  }} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input className="form-input" type="date" value={form.endDate} 
                  onChange={e => {
                    setForm({ ...form, endDate: e.target.value });
                    // Clear conflicts when date changes
                    setConflicts([]);
                    setTimetableView(null);
                  }} />
              </div>
            </div>
            
            {/* Show calculated days */}
            {form.startDate && form.endDate && (
              <div style={{ 
                background: '#f0f9ff', 
                border: '1px solid #0ea5e9', 
                borderRadius: 6, 
                padding: 12, 
                marginBottom: 16,
                fontSize: '0.8rem'
              }}>
                <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: 4 }}>Days to Check:</div>
                <div style={{ color: '#0c4a6e' }}>
                  {(() => {
                    const startDate = new Date(form.startDate);
                    const endDate = new Date(form.endDate);
                    const daysInRange = new Set();
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    
                    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                      const dayName = dayNames[date.getDay()];
                      daysInRange.add(dayName);
                    }
                    
                    return Array.from(daysInRange).join(', ');
                  })()} 
                  ({Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24)) + 1} days)
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button className="btn btn-secondary" onClick={checkConflicts} disabled={loading}>
                <AlertTriangle size={14} /> {loading ? 'Checking...' : 'Check Conflicts'}
              </button>
              {conflicts.length > 0 && (
                <button className="btn btn-primary" onClick={() => {
                  autoAssignSubstitutes();
                  // Load timetable view after assignment
                  setTimeout(() => loadTimetableView(form.timetableId), 1000);
                }}>
                  <Zap size={14} /> Auto-Assign Substitutes ({conflicts.length})
                </button>
              )}
            </div>
            
            {conflicts.length > 0 && (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <h4 style={{ color: '#dc2626', marginBottom: 12 }}>Found {conflicts.length} Conflicts:</h4>
                {conflicts.map((conflict, i) => (
                  <div key={i} style={{ 
                    background: '#fef2f2', 
                    border: '1px solid #fecaca', 
                    borderRadius: 6, 
                    padding: 12, 
                    marginBottom: 8,
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ fontWeight: 600, color: '#dc2626' }}>
                      {conflict.entry.teacher?.name} - {conflict.entry.class?.name}
                    </div>
                    <div style={{ color: '#7f1d1d' }}>
                      {conflict.entry.subject?.name} | {conflict.entry.day} P{conflict.entry.period}
                    </div>
                    <div style={{ color: '#991b1b', marginTop: 4 }}>
                      Conflict: {typeIcons[conflict.unavailability.type]} {conflict.unavailability.type.replace('_', ' ')} 
                      ({new Date(conflict.unavailability.startDate).toLocaleDateString()})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}