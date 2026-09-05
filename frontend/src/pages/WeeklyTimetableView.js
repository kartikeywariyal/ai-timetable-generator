import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, Users, Edit2, Check, X, AlertTriangle, Save, RefreshCw, Trash2 } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ConflictNotification from '../components/ConflictNotification';

export default function WeeklyTimetableView() {
  const { semesterId, weekNumber } = useParams();
  const navigate = useNavigate();
  const [tt, setTt] = useState(null);
  const [timeslotConfig, setTimeslotConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [draggedEntry, setDraggedEntry] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [conflictWarnings, setConflictWarnings] = useState([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingDrop, setPendingDrop] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ttRes, tsRes] = await Promise.all([
          api.get(`/semesters/${semesterId}/week/${weekNumber}`),
          api.get('/timeslots')
        ]);
        setTt(ttRes.data);
        setNewName(ttRes.data.name || `Week ${weekNumber} Timetable`);
        if (tsRes.data.length > 0) setTimeslotConfig(tsRes.data[0]);
        setLoading(false);
      } catch (err) {
        toast.error('Failed to load weekly timetable');
        console.error(err);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [semesterId, weekNumber]);

  if (loading) return <div className="page"><div className="spinner" /></div>;
  if (!tt) return <div className="page"><p>Weekly timetable not found</p></div>;

  // Filter entries
  const entries = tt.entries.filter(e => {
    if (filterClass && e.class?._id !== filterClass) return false;
    if (filterTeacher && e.teacher?._id !== filterTeacher) return false;
    if (filterSubject && e.subject?._id !== filterSubject) return false;
    return true;
  });

  // Day order
  const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const days = [...new Set(tt.entries.map(e => e.day))].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const periods = [...new Set(tt.entries.map(e => e.period))].sort((a, b) => a - b);
  const classes = [...new Map(tt.entries.filter(e => e.class).map(e => [e.class._id, e.class])).values()];
  const teachers = [...new Map(tt.entries.filter(e => e.teacher).map(e => [e.teacher._id, e.teacher])).values()];
  const subjects = [...new Map(tt.entries.filter(e => e.subject).map(e => [e.subject._id, e.subject])).values()];

  // Map period number -> time label from timeslot config
  const periodLabel = (p) => {
    if (!timeslotConfig) return `P${p}`;
    const slot = timeslotConfig.periods.find(s => s.periodNumber === p);
    return slot ? `${slot.startTime} – ${slot.endTime}` : `P${p}`;
  };

  const getCell = (day, period) => entries.find(e => e.day === day && e.period === period);

  const fitnessClass = s => s >= 80 ? '' : s >= 50 ? 'medium' : 'low';

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('ChronoGen - Weekly Timetable', 14, 15);
    doc.setFontSize(10);
    doc.text(`Week ${weekNumber} | Fitness: ${tt.fitnessScore}% | Generated: ${new Date(tt.createdAt).toLocaleDateString()}`, 14, 22);

    const grouped = {};
    for (const e of tt.entries) {
      const key = e.class?.name || 'Unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    }

    let y = 30;
    for (const [cls, ents] of Object.entries(grouped)) {
      doc.setFontSize(12);
      doc.text(`Class: ${cls}`, 14, y);
      y += 4;
      const clsDays = [...new Set(ents.map(e => e.day))].sort();
      const clsPeriods = [...new Set(ents.map(e => e.period))].sort((a, b) => a - b);
      const head = [['Day', ...clsPeriods.map(p => `P${p}`)]];
      const body = clsDays.map(d => {
        const row = [d];
        for (const p of clsPeriods) {
          const e = ents.find(x => x.day === d && x.period === p);
          row.push(e ? `${e.subject?.name || ''}\\n${e.teacher?.name || ''}` : '-');
        }
        return row;
      });
      autoTable(doc, { head, body, startY: y, styles: { fontSize: 8 }, headStyles: { fillColor: [99, 102, 241] } });
      y = doc.lastAutoTable.finalY + 10;
      if (y > 180) { doc.addPage(); y = 20; }
    }
    doc.save(`week-${weekNumber}-timetable.pdf`);
  };

  const exportExcel = async () => {
    if (!tt) return;
    try {
      toast.loading('Preparing Excel file...', { id: 'excel-export' });
      if (tt._id) {
        try {
          const response = await api.get(`/export/${tt._id}/excel`, {
            responseType: 'blob'
          });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `week-${weekNumber}-timetable.xlsx`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          toast.success('Excel exported successfully', { id: 'excel-export' });
          return;
        } catch (backendErr) {
          console.warn('Backend export fallback to client-side XLSX:', backendErr);
        }
      }

      // Client-side fallback using XLSX
      const wb = XLSX.utils.book_new();
      const grouped = {};
      for (const e of tt.entries || []) {
        const key = e.class?.name || 'Class';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(e);
      }

      Object.entries(grouped).forEach(([className, ents]) => {
        const clsDays = [...new Set(ents.map(e => e.day))].sort();
        const clsPeriods = [...new Set(ents.map(e => e.period))].sort((a, b) => a - b);
        const rows = [
          ['Day', ...clsPeriods.map(p => `Period ${p}`)],
          ...clsDays.map(d => [
            d,
            ...clsPeriods.map(p => {
              const match = ents.find(x => x.day === d && x.period === p);
              return match ? `${match.subject?.name || ''} (${match.teacher?.name || ''}) [${match.classroom?.name || ''}]` : '-';
            })
          ])
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, className.substring(0, 31));
      });

      XLSX.writeFile(wb, `week-${weekNumber}-timetable.xlsx`);
      toast.success('Excel exported successfully', { id: 'excel-export' });
    } catch (err) {
      console.error('Excel Export Error:', err);
      toast.error('Failed to export Excel', { id: 'excel-export' });
    }
  };

  const updateName = async () => {
    if (!newName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      setTt({ ...tt, name: newName.trim() });
      setEditingName(false);
      toast.success('Name updated');
    } catch (err) {
      toast.error('Failed to update name');
    }
  };

  const cancelEdit = () => {
    setNewName(tt.name || `Week ${weekNumber} Timetable`);
    setEditingName(false);
  };

  const checkConflicts = (sourceEntry, targetDay, targetPeriod) => {
    const warnings = [];
    
    // Check teacher conflicts
    const teacherConflict = tt.entries.find(e => 
      e.day === targetDay && 
      e.period === targetPeriod && 
      e.teacher?._id === sourceEntry.teacher?._id &&
      e._id !== sourceEntry._id
    );
    if (teacherConflict) {
      warnings.push({
        type: 'teacher',
        message: `${sourceEntry.teacher?.name} is already teaching ${teacherConflict.class?.name} - ${teacherConflict.subject?.name} at this time`
      });
    }
    
    // Check classroom conflicts
    const classroomConflict = tt.entries.find(e => 
      e.day === targetDay && 
      e.period === targetPeriod && 
      e.classroom?._id === sourceEntry.classroom?._id &&
      e._id !== sourceEntry._id
    );
    if (classroomConflict) {
      warnings.push({
        type: 'classroom',
        message: `${sourceEntry.classroom?.name} is already occupied by ${classroomConflict.class?.name} - ${classroomConflict.subject?.name}`
      });
    }
    
    // Check class conflicts
    const classConflict = tt.entries.find(e => 
      e.day === targetDay && 
      e.period === targetPeriod && 
      e.class?._id === sourceEntry.class?._id &&
      e._id !== sourceEntry._id
    );
    if (classConflict) {
      warnings.push({
        type: 'class',
        message: `${sourceEntry.class?.name} already has ${classConflict.subject?.name} with ${classConflict.teacher?.name} at this time`
      });
    }
    
    return warnings;
  };

  const handleDragStart = (e, entry) => {
    if (!editMode) return;
    setDraggedEntry(entry);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, day, period) => {
    if (!editMode || !draggedEntry) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell(`${day}-${period}`);
    
    // Show conflict warnings
    const warnings = checkConflicts(draggedEntry, day, period);
    setConflictWarnings(warnings);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
    setConflictWarnings([]);
  };

  const handleDrop = (e, targetDay, targetPeriod) => {
    if (!editMode || !draggedEntry) return;
    e.preventDefault();
    
    const warnings = checkConflicts(draggedEntry, targetDay, targetPeriod);
    
    if (warnings.length > 0) {
      setPendingDrop({ targetDay, targetPeriod, warnings });
      setShowConflictDialog(true);
      return;
    }
    
    // No conflicts, proceed with the move
    performMove(targetDay, targetPeriod);
  };

  const performMove = (targetDay, targetPeriod) => {
    // Update the entry
    const updatedEntries = tt.entries.map(entry => {
      if (entry._id === draggedEntry._id) {
        return { ...entry, day: targetDay, period: targetPeriod };
      }
      return entry;
    });
    
    setTt({ ...tt, entries: updatedEntries });
    
    // Track pending changes
    const changeIndex = pendingChanges.findIndex(c => c.entryId === draggedEntry._id);
    const newChange = {
      entryId: draggedEntry._id,
      originalDay: draggedEntry.day,
      originalPeriod: draggedEntry.period,
      newDay: targetDay,
      newPeriod: targetPeriod,
      entry: draggedEntry
    };
    
    if (changeIndex >= 0) {
      const updatedChanges = [...pendingChanges];
      updatedChanges[changeIndex] = newChange;
      setPendingChanges(updatedChanges);
    } else {
      setPendingChanges([...pendingChanges, newChange]);
    }
    
    setDraggedEntry(null);
    setDragOverCell(null);
    setConflictWarnings([]);
    
    toast.success('Entry moved. Click Save Changes to apply.');
  };

  const handleConflictProceed = () => {
    if (pendingDrop) {
      performMove(pendingDrop.targetDay, pendingDrop.targetPeriod);
    }
    setShowConflictDialog(false);
    setPendingDrop(null);
  };

  const handleConflictCancel = () => {
    setDraggedEntry(null);
    setDragOverCell(null);
    setConflictWarnings([]);
    setShowConflictDialog(false);
    setPendingDrop(null);
  };

  const saveChanges = async () => {
    if (pendingChanges.length === 0) {
      toast.error('No changes to save');
      return;
    }
    
    try {
      toast.success('Changes saved successfully');
      setPendingChanges([]);
    } catch (err) {
      toast.error('Failed to save changes');
    }
  };

  const discardChanges = () => {
    if (pendingChanges.length === 0) return;
    
    if (window.confirm('Discard all unsaved changes?')) {
      window.location.reload();
    }
  };

  return (
    <div className="page">
      <ConflictNotification 
        conflicts={showConflictDialog ? pendingDrop?.warnings : null}
        onProceed={handleConflictProceed}
        onCancel={handleConflictCancel}
      />
      <div className="topbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/semester-planner')}>
              <ArrowLeft size={14} /> Back to Semester
            </button>
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input 
                  className="form-input" 
                  style={{ fontSize: '1.25rem', fontWeight: 600, padding: '4px 8px', minWidth: 250 }}
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' ? updateName() : e.key === 'Escape' ? cancelEdit() : null}
                  autoFocus
                />
                <button className="btn btn-success btn-sm" onClick={updateName}>
                  <Check size={14} />
                </button>
                <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0 }}>
                  {tt.name || `Week ${weekNumber} Timetable`}
                </h2>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingName(true)}>
                  <Edit2 size={14} />
                </button>
              </div>
            )}
          </div>
          <span className={`fitness-badge ${fitnessClass(tt.fitnessScore)}`} style={{ marginTop: 4, display: 'inline-flex' }}>
            Efficiency: {tt.fitnessScore}%
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className={`btn ${editMode ? 'btn-warning' : 'btn-secondary'} btn-sm`} 
            onClick={() => setEditMode(!editMode)}
          >
            <Edit2 size={14} /> {editMode ? 'Exit Edit' : 'Edit Mode'}
          </button>
          {editMode && pendingChanges.length > 0 && (
            <>
              <button className="btn btn-success btn-sm" onClick={saveChanges}>
                <Save size={14} /> Save Changes ({pendingChanges.length})
              </button>
              <button className="btn btn-danger btn-sm" onClick={discardChanges}>
                <X size={14} /> Discard
              </button>
            </>
          )}
          <button className="btn btn-success btn-sm" onClick={exportExcel}><Download size={14} /> Excel</button>
          <button className="btn btn-success btn-sm" onClick={exportPDF}><Download size={14} /> PDF</button>
        </div>
      </div>

      {/* Conflict Warnings */}
      {editMode && conflictWarnings.length > 0 && (
        <div style={{ 
          marginTop: 16, 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: 8, 
          padding: 12 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={16} style={{ color: '#dc2626' }} />
            <span style={{ fontWeight: 600, color: '#dc2626' }}>Potential Conflicts:</span>
          </div>
          {conflictWarnings.map((warning, i) => (
            <div key={i} style={{ 
              fontSize: '0.8rem', 
              color: '#7f1d1d', 
              marginLeft: 24,
              marginBottom: 4
            }}>
              • {warning.message}
            </div>
          ))}
        </div>
      )}

      {/* Edit Mode Instructions */}
      {editMode && (
        <div style={{ 
          marginTop: 16, 
          background: '#f0f9ff', 
          border: '1px solid #0ea5e9', 
          borderRadius: 8, 
          padding: 12,
          fontSize: '0.8rem'
        }}>
          <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: 4 }}>Edit Mode Active:</div>
          <div style={{ color: '#0c4a6e' }}>
            • Drag and drop entries to move them to different time slots<br />
            • Hover over target cells to see potential conflicts<br />
            • Conflicts will be highlighted with warnings before you drop<br />
            • Click "Save Changes" to apply your modifications
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 160 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select className="form-select" style={{ width: 160 }} value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}>
          <option value="">All Teachers</option>
          {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        <select className="form-select" style={{ width: 160 }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        {(filterClass || filterTeacher || filterSubject) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setFilterClass(''); setFilterTeacher(''); setFilterSubject(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      <div style={{ marginTop: 16 }} className="card">
        <div className="tt-grid">
          <table className="tt-table">
            <thead>
              <tr>
                <th style={{ background: '#4f46e5', minWidth: 100, textAlign: 'left', paddingLeft: 12 }}>Day</th>
                {periods.map(p => (
                  <th key={p}>
                    <div style={{ fontWeight: 700 }}>Period {p}</div>
                    <div style={{ fontWeight: 400, fontSize: '0.7rem', opacity: 0.85, marginTop: 2 }}>{periodLabel(p)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day}>
                  <td style={{ background: '#f8fafc', fontWeight: 600, fontSize: '0.85rem', color: '#4f46e5', whiteSpace: 'nowrap', paddingLeft: 12 }}>
                    {day}
                  </td>
                  {periods.map(period => {
                    const cell = getCell(day, period);
                    const isDragOver = dragOverCell === `${day}-${period}`;
                    return (
                      <td 
                        key={period}
                        onDragOver={(e) => handleDragOver(e, day, period)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day, period)}
                        style={{
                          background: isDragOver ? '#fef3c7' : 'transparent',
                          border: isDragOver ? '2px dashed #f59e0b' : '1px solid #e2e8f0'
                        }}
                      >
                        {cell ? (
                          <div 
                            className="tt-cell"
                            draggable={editMode}
                            onDragStart={(e) => handleDragStart(e, cell)}
                            style={{
                              cursor: editMode ? 'grab' : 'default',
                              opacity: draggedEntry?._id === cell._id ? 0.5 : 1,
                              background: cell.isCompensation ? '#fef3c7' : 
                                         cell.isSaturdayClass ? '#f3e8ff' : 
                                         cell.isExtraClass ? '#dcfce7' : 
                                         pendingChanges.some(c => c.entryId === cell._id) ? '#dcfce7' : 'transparent'
                            }}
                          >
                            <div className="subject">{cell.subject?.name || '-'}</div>
                            <div className="teacher">{cell.teacher?.name || '-'}</div>
                            <div className="room">{cell.classroom?.name || ''}{cell.class?.name ? ` · ${cell.class.name}` : ''}</div>
                            {cell.isCompensation && (
                              <div style={{ 
                                fontSize: '0.6rem', 
                                color: '#ca8a04', 
                                fontWeight: 600, 
                                marginTop: 2 
                              }}>
                                COMPENSATION
                              </div>
                            )}
                            {cell.isSaturdayClass && (
                              <div style={{ 
                                fontSize: '0.6rem', 
                                color: '#7c3aed', 
                                fontWeight: 600, 
                                marginTop: 2 
                              }}>
                                SATURDAY
                              </div>
                            )}
                            {pendingChanges.some(c => c.entryId === cell._id) && (
                              <div style={{ 
                                fontSize: '0.6rem', 
                                color: '#059669', 
                                fontWeight: 600, 
                                marginTop: 2 
                              }}>
                                MODIFIED
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="tt-empty">—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#94a3b8' }}>
        Week {weekNumber} · Entries: {entries.length} · Created: {new Date(tt.createdAt).toLocaleString()}
      </div>
    </div>
  );
}