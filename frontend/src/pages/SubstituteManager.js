import React, { useEffect, useState } from 'react';
import { Plus, UserCheck, Users, RefreshCw, X, CheckCircle, XCircle, Clock, ArrowRightLeft, Download, Share2 } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function SubstituteManager() {
  const [substitutes, setSubstitutes] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [selectedTimetable, setSelectedTimetable] = useState('');
  const [timetableView, setTimetableView] = useState(null);
  const [modal, setModal] = useState(null); // 'substitute' or 'swap'
  const [form, setForm] = useState({});
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const load = () => {
    api.get('/substitutes').then(r => {
      setSubstitutes(r.data);
      setSelectedItems(new Set());
      setSelectAll(false);
    });
    api.get('/timetable').then(r => setTimetables(r.data));
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

  const handleTimetableSelect = (timetableId) => {
    setSelectedTimetable(timetableId);
    loadTimetableView(timetableId);
  };

  const exportUpdatedPDF = () => {
    if (!timetableView) return;
    
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(`ChronoGen - ${timetableView.name}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Updated Timetable with Substitutions | Generated: ${new Date().toLocaleDateString()}`, 14, 22);
    doc.text(`Fitness: ${timetableView.fitnessScore}% | Active Substitutions: ${timetableView.substitutes.length}`, 14, 28);

    // Create timetable data
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
        // Highlight substituted cells
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

    // Add legend
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text('Legend:', 14, finalY);
    doc.setFillColor(219, 234, 254);
    doc.rect(14, finalY + 3, 5, 3, 'F');
    doc.text('Substitute Teacher', 22, finalY + 5);
    doc.setFillColor(254, 243, 199);
    doc.rect(80, finalY + 3, 5, 3, 'F');
    doc.text('Library Period', 88, finalY + 5);
    
    doc.save(`${timetableView.name}_updated.pdf`);
    toast.success('PDF exported successfully');
  };

  const exportUpdatedExcel = () => {
    if (!timetableView) return;
    
    const wb = XLSX.utils.book_new();
    const days = timetableView.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = timetableView.periods || [];
    
    // Create main timetable sheet
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
    XLSX.utils.book_append_sheet(wb, ws, 'Updated Timetable');
    
    // Create substitutions summary sheet
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
    
    XLSX.writeFile(wb, `${timetableView.name}_updated.xlsx`);
    toast.success('Excel exported successfully');
  };

  const shareUpdatedTimetable = async () => {
    if (!timetableView) return;
    
    const shareData = {
      title: `${timetableView.name} - Updated Timetable`,
      text: `Updated timetable with ${timetableView.substitutes.length} active substitutions. Fitness: ${timetableView.fitnessScore}%`,
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
  useEffect(() => { load(); }, []);

  const openSubstitute = () => {
    setForm({ 
      timetableId: selectedTimetable, 
      day: '', 
      period: '', 
      reason: '', 
      isLibrary: false,
      substituteTeacher: ''
    });
    setModal('substitute');
  };

  const openSwap = () => {
    setForm({ 
      timetableId: selectedTimetable, 
      day1: '', 
      period1: '', 
      day2: '', 
      period2: '', 
      reason: '' 
    });
    setModal('swap');
  };

  const findSubstitute = async () => {
    if (!form.timetableId || !form.day || !form.period) return;
    setLoading(true);
    try {
      const r = await api.post('/substitutes/find-substitute', {
        timetableId: form.timetableId,
        day: form.day,
        period: parseInt(form.period)
      });
      setAvailableTeachers(r.data.available);
      toast.success(`Found ${r.data.available.length} available teachers`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const assignSubstitute = async e => {
    e.preventDefault();
    
    if (!timetableView) {
      toast.error('Please select a timetable first');
      return;
    }
    
    // Find the actual timetable entry
    const actualEntry = timetableView.entries.find(e => 
      e.day === form.day &&
      e.period === parseInt(form.period)
    );
    
    if (!actualEntry) {
      toast.error('Could not find timetable entry for the selected slot');
      return;
    }
    
    try {
      await api.post('/substitutes/assign', {
        timetableId: form.timetableId,
        originalEntry: {
          day: actualEntry.day,
          period: actualEntry.period,
          class: actualEntry.class?._id,
          subject: actualEntry.subject?._id,
          teacher: actualEntry.teacher?._id,
          classroom: actualEntry.classroom?._id
        },
        substituteTeacher: form.isLibrary ? null : form.substituteTeacher,
        isLibrary: form.isLibrary,
        reason: form.reason
      });
      toast.success(form.isLibrary ? 'Library period assigned' : 'Substitute assigned');
      setModal(null); 
      load();
      loadTimetableView(form.timetableId); // Refresh timetable view
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const requestSwap = async e => {
    e.preventDefault();
    
    if (!timetableView) {
      toast.error('Please select a timetable first');
      return;
    }
    
    // Find the actual timetable entries for both slots
    const entry1 = timetableView.entries.find(e => 
      e.day === form.day1 &&
      e.period === parseInt(form.period1)
    );
    
    const entry2 = timetableView.entries.find(e => 
      e.day === form.day2 &&
      e.period === parseInt(form.period2)
    );
    
    if (!entry1 || !entry2) {
      toast.error('Could not find timetable entries for the selected slots');
      return;
    }
    
    try {
      await api.post('/substitutes/swap-request', {
        timetableId: form.timetableId,
        originalEntry: {
          day: entry1.day,
          period: entry1.period,
          teacher: entry1.teacher?._id
        },
        swapWith: {
          day: entry2.day,
          period: entry2.period,
          teacher: entry2.teacher?._id
        },
        requestedBy: entry1.teacher?._id,
        reason: form.reason
      });
      toast.success('Swap request submitted');
      setModal(null); 
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/substitutes/${id}/status`, { status });
    toast.success(`${status === 'approved' ? 'Approved' : 'Rejected'}`);
    load();
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
    
    if (!window.confirm(`Delete ${selectedItems.size} selected items?`)) return;
    
    try {
      await Promise.all(
        Array.from(selectedItems).map(id => api.delete(`/substitutes/${id}`))
      );
      toast.success(`Deleted ${selectedItems.size} items`);
      load();
    } catch (err) {
      toast.error('Failed to delete some items');
    }
  };

  const del = async id => {
    if (!window.confirm('Delete this record?')) return;
    await api.delete(`/substitutes/${id}`);
    toast.success('Deleted'); load();
  };

  const pendingSwaps = substitutes.filter(s => s.type === 'swap' && s.status === 'pending');
  const approvedSubs = substitutes.filter(s => s.status === 'approved');

  return (
    <div className="page">
      <div className="topbar">
        <h2>Substitute Management</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" style={{ minWidth: 200 }} value={selectedTimetable} 
            onChange={e => handleTimetableSelect(e.target.value)}>
            <option value="">Select Timetable to View</option>
            {timetables.map(t => <option key={t._id} value={t._id}>{t.name} ({t.fitnessScore}%)</option>)}
          </select>
          <button className="btn btn-primary" onClick={openSubstitute}><UserCheck size={16} /> Assign Substitute</button>
          <button className="btn btn-secondary" onClick={openSwap}><ArrowRightLeft size={16} /> Request Swap</button>
        </div>
      </div>

      {/* Timetable View with Substitutions */}
      {timetableView && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <span className="card-title">Updated Timetable - {timetableView.name}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Shows current schedule with substitutions applied</span>
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
                                  {substitute.type === 'substitute' ? 'SUB' : 'SWAP'}
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
                  <span style={{ background: '#2563eb', color: 'white', padding: '1px 4px', borderRadius: 2, fontSize: '0.6rem' }}>SUB</span>
                  <span>Substitute Assignment</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ background: '#7c3aed', color: 'white', padding: '1px 4px', borderRadius: 2, fontSize: '0.6rem' }}>SWAP</span>
                  <span>Teacher Swap</span>
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                Active Substitutions: {timetableView.substitutes.length} | Last Updated: {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Swap Requests */}
      {pendingSwaps.length > 0 && (
        <div className="card" style={{ marginTop: 24, borderTop: '3px solid #f59e0b' }}>
          <div className="card-header">
            <span className="card-title">Pending Swap Requests ({pendingSwaps.length})</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Requested By</th><th>Original Slot</th><th>Swap With</th><th>Reason</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pendingSwaps.map(s => (
                  <tr key={s._id}>
                    <td><strong>{s.requestedBy?.name}</strong></td>
                    <td>{s.originalEntry.day} P{s.originalEntry.period}</td>
                    <td>{s.swapWith.day} P{s.swapWith.period} ({s.swapWith.teacher?.name})</td>
                    <td>{s.reason || '-'}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-success btn-sm" onClick={() => updateStatus(s._id, 'approved')}>
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => updateStatus(s._id, 'rejected')}>
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

      {/* Active Substitutes & Approved Swaps */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <span className="card-title">Active Substitutes & Swaps ({approvedSubs.length})</span>
          {approvedSubs.length > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => handleSelectAll(approvedSubs)}
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
                <th>Type</th><th>Original</th><th>Assignment</th><th>Reason</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvedSubs.map(s => (
                <tr key={s._id} style={{ background: selectedItems.has(s._id) ? '#f0f9ff' : 'transparent' }}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedItems.has(s._id)}
                      onChange={() => handleSelectItem(s._id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td>
                    <span className={`badge ${s.type === 'substitute' ? 'badge-blue' : 'badge-purple'}`}>
                      {s.type === 'substitute' ? 'Substitute' : 'Swap'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem' }}>
                      <div><strong>{s.originalEntry.class?.name}</strong> - {s.originalEntry.subject?.name}</div>
                      <div style={{ color: '#64748b' }}>{s.originalEntry.day} P{s.originalEntry.period} ({s.originalEntry.teacher?.name})</div>
                    </div>
                  </td>
                  <td>
                    {s.type === 'substitute' ? (
                      s.isLibrary ? (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>📚 Library Period</span>
                      ) : (
                        <span style={{ color: '#2563eb', fontWeight: 600 }}>{s.substituteTeacher?.name}</span>
                      )
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#7c3aed' }}>
                        Swapped with {s.swapWith.teacher?.name}<br />
                        {s.swapWith.day} P{s.swapWith.period}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.reason || '-'}</td>
                  <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => del(s._id)}>Remove</button>
                  </td>
                </tr>
              ))}
              {approvedSubs.length === 0 && (
                <tr><td colSpan={7} className="empty-state">No active substitutes or swaps</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Substitute Assignment Modal */}
      {modal === 'substitute' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Assign Substitute Teacher</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}><X size={14} /></button>
            </div>
            <form onSubmit={assignSubstitute}>
              <div className="form-group">
                <label className="form-label">Timetable</label>
                <select className="form-select" value={form.timetableId} onChange={e => setForm({ ...form, timetableId: e.target.value })} required>
                  <option value="">Select Timetable</option>
                  {timetables.map(t => <option key={t._id} value={t._id}>{t.name} ({t.fitnessScore}%)</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Day</label>
                  <select className="form-select" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })} required>
                    <option value="">Select Day</option>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => 
                      <option key={d} value={d}>{d}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Period</label>
                  <select className="form-select" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} required>
                    <option value="">Select Period</option>
                    {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>Period {p}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <button type="button" className="btn btn-secondary" onClick={findSubstitute} disabled={loading}>
                  <RefreshCw size={14} /> {loading ? 'Finding...' : 'Find Available Teachers'}
                </button>
              </div>
              
              {availableTeachers.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Available Teachers ({availableTeachers.length})</label>
                  <select className="form-select" value={form.substituteTeacher} onChange={e => setForm({ ...form, substituteTeacher: e.target.value, isLibrary: false })}>
                    <option value="">Select Substitute Teacher</option>
                    {availableTeachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="isLibrary" checked={form.isLibrary} 
                  onChange={e => setForm({ ...form, isLibrary: e.target.checked, substituteTeacher: '' })} />
                <label htmlFor="isLibrary" className="form-label" style={{ margin: 0 }}>
                  📚 Assign as Library Period (if no teacher available)
                </label>
              </div>
              
              <div className="form-group">
                <label className="form-label">Reason</label>
                <input className="form-input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} 
                  placeholder="e.g. Teacher on leave" />
              </div>
              
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {form.isLibrary ? '📚 Assign Library Period' : 'Assign Substitute'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Swap Request Modal */}
      {modal === 'swap' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Request Teacher Swap</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}><X size={14} /></button>
            </div>
            <form onSubmit={requestSwap}>
              <div className="form-group">
                <label className="form-label">Timetable</label>
                <select className="form-select" value={form.timetableId} onChange={e => setForm({ ...form, timetableId: e.target.value })} required>
                  <option value="">Select Timetable</option>
                  {timetables.map(t => <option key={t._id} value={t._id}>{t.name} ({t.fitnessScore}%)</option>)}
                </select>
              </div>
              
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#4f46e5' }}>Teacher A's Lecture</div>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Day</label>
                    <select className="form-select" value={form.day1} onChange={e => setForm({ ...form, day1: e.target.value })}>
                      <option value="">Select Day</option>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => 
                        <option key={d} value={d}>{d}</option>
                      )}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Period</label>
                    <select className="form-select" value={form.period1} onChange={e => setForm({ ...form, period1: e.target.value })}>
                      <option value="">Period</option>
                      {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>P{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fff5f5', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#dc2626' }}>Teacher B's Lecture (Swap With)</div>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Day</label>
                    <select className="form-select" value={form.day2} onChange={e => setForm({ ...form, day2: e.target.value })}>
                      <option value="">Select Day</option>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => 
                        <option key={d} value={d}>{d}</option>
                      )}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Period</label>
                    <select className="form-select" value={form.period2} onChange={e => setForm({ ...form, period2: e.target.value })}>
                      <option value="">Period</option>
                      {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>P{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Reason for Swap</label>
                <input className="form-input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} 
                  placeholder="e.g. Personal commitment" />
              </div>
              
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <ArrowRightLeft size={16} /> Submit Swap Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}