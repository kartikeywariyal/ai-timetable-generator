import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, AlertTriangle, CheckCircle, Clock, BarChart3, Settings, Trash2, Edit2, Wand2, Eye } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import HolidayCalendar from '../components/HolidayCalendar';
import TimetableResultNotification from '../components/TimetableResultNotification';
import HolidayImpactNotification from '../components/HolidayImpactNotification';

export default function SemesterPlanner() {
  const navigate = useNavigate();
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('semester');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    academicCalendar: {
      weeklySchedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      periodsPerDay: 6
    },
    bufferSlots: {
      enabled: true,
      slotsPerWeek: 2,
      preferredDays: ['Friday'],
      preferredPeriods: [7, 8]
    },
    doublePeriods: {
      enabled: true,
      maxPerDay: 2,
      minGapBetween: 1
    },
    redistributionSettings: {
      autoRedistribute: true,
      prioritizeCore: true,
      allowWeekendClasses: false,
      maxDailyHours: 8
    }
  });
  
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    type: 'institutional'
  });
  
  const [selectedDates, setSelectedDates] = useState([]);
  const [bulkHolidayMode, setBulkHolidayMode] = useState(false);
  const [weeklyTimetables, setWeeklyTimetables] = useState([]);
  const [showWeeklyView, setShowWeeklyView] = useState(false);
  const [selectedSemesters, setSelectedSemesters] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [timetableResult, setTimetableResult] = useState(null);
  const [showTimetableResult, setShowTimetableResult] = useState(false);
  const [holidayImpactData, setHolidayImpactData] = useState(null);
  const [showHolidayImpact, setShowHolidayImpact] = useState(false);

  useEffect(() => {
    loadSemesters();
  }, []);
  
  useEffect(() => {
    if (selectedSemester) {
      loadWeeklyTimetables();
    }
  }, [selectedSemester]);

  const loadSemesters = async () => {
    try {
      const response = await api.get('/semesters');
      setSemesters(response.data);
      if (response.data.length > 0 && !selectedSemester) {
        setSelectedSemester(response.data[0]);
      }
      // Reset selections when loading
      setSelectedSemesters(new Set());
      setSelectAll(false);
    } catch (err) {
      toast.error('Failed to load semesters');
    } finally {
      setLoading(false);
    }
  };

  const generateSemesterTimetable = async () => {
    if (!selectedSemester) return;
    
    try {
      setLoading(true);
      const response = await api.post(`/semesters/${selectedSemester._id}/generate-timetable`);
      toast.success('Semester timetable generated successfully!');
      
      // Load weekly timetables
      loadWeeklyTimetables();
      
      // Show generation results in proper notification
      const result = response.data;
      setTimetableResult(result);
      setShowTimetableResult(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate timetable');
    } finally {
      setLoading(false);
    }
  };
  
  const loadWeeklyTimetables = async () => {
    if (!selectedSemester) return;
    
    try {
      const response = await api.get(`/semesters/${selectedSemester._id}/weekly-timetables`);
      setWeeklyTimetables(response.data);
    } catch (err) {
      console.error('Failed to load weekly timetables:', err);
    }
  };
  
  const toggleDateSelection = (dateString) => {
    setSelectedDates(prev => {
      if (prev.includes(dateString)) {
        return prev.filter(d => d !== dateString);
      } else {
        return [...prev, dateString];
      }
    });
  };
  
  const clearSelectedDates = () => {
    setSelectedDates([]);
  };

  const saveSemester = async (e) => {
    e.preventDefault();
    try {
      if (selectedSemester && modalType === 'semester') {
        await api.put(`/semesters/${selectedSemester._id}`, form);
        toast.success('Semester updated');
      } else {
        await api.post('/semesters', form);
        toast.success('Semester created');
      }
      setShowModal(false);
      loadSemesters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save semester');
    }
  };

  const addHoliday = async (e) => {
    e.preventDefault();
    if (!selectedSemester) return;
    
    try {
      const response = await api.post(`/semesters/${selectedSemester._id}/holidays`, holidayForm);
      toast.success('Holiday added and impact analyzed');
      setSelectedSemester(response.data.semester);
      setShowModal(false);
      setHolidayForm({ name: '', startDate: '', endDate: '', type: 'institutional' });
      
      if (response.data.impact) {
        showImpactAnalysis(response.data.impact);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add holiday');
    }
  };

  const addBulkHolidays = async () => {
    if (!selectedSemester || selectedDates.length === 0) return;
    
    try {
      const holidayPromises = selectedDates.map(date => {
        const holidayName = getHolidayName(date);
        return api.post(`/semesters/${selectedSemester._id}/holidays`, {
          name: holidayName,
          startDate: date,
          endDate: date,
          type: 'institutional'
        });
      });
      
      await Promise.all(holidayPromises);
      toast.success(`Added ${selectedDates.length} holidays successfully`);
      setSelectedDates([]);
      setBulkHolidayMode(false);
      setShowModal(false);
      loadSemesters();
      
      // Show impact analysis in proper notification
      setHolidayImpactData(selectedDates.length);
      setShowHolidayImpact(true);
    } catch (err) {
      toast.error('Failed to add some holidays');
    }
  };
  
  const getHolidayName = (dateString) => {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    return `Holiday - ${dayName}, ${monthName} ${day}`;
  };

  const showImpactAnalysis = (impact) => {
    const message = `Holiday Impact Analysis:
• ${impact.affectedDays} teaching days affected
• ${impact.totalLostPeriods} periods need redistribution
• ${impact.affectedClasses} classes impacted

Redistribution suggestions available.`;
    
    if (window.confirm(message + '\n\nWould you like to auto-redistribute classes?')) {
      redistributeClasses('buffer');
    }
  };

  const redistributeClasses = async (strategy) => {
    if (!selectedSemester) return;
    
    try {
      const response = await api.post(`/semesters/${selectedSemester._id}/redistribute`, {
        strategy
      });
      toast.success('Classes redistributed successfully');
      console.log('Redistribution results:', response.data.results);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to redistribute classes');
    }
  };

  const deleteSemester = async (id) => {
    if (!window.confirm('Delete this semester? This will also delete all related progress data.')) return;
    
    try {
      await api.delete(`/semesters/${id}`);
      toast.success('Semester deleted');
      
      // Clear selection if the deleted semester was selected
      if (selectedSemester?._id === id) {
        setSelectedSemester(null);
        setWeeklyTimetables([]);
        setShowWeeklyView(false);
      }
      
      // Reload semesters list
      loadSemesters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete semester');
    }
  };

  const openModal = (type, semester = null) => {
    setModalType(type);
    if (type === 'semester' && semester) {
      setForm({
        name: semester.name,
        startDate: semester.startDate?.split('T')[0] || '',
        endDate: semester.endDate?.split('T')[0] || '',
        academicCalendar: semester.academicCalendar || form.academicCalendar,
        bufferSlots: semester.bufferSlots || form.bufferSlots,
        doublePeriods: semester.doublePeriods || form.doublePeriods,
        redistributionSettings: semester.redistributionSettings || form.redistributionSettings
      });
    }
    setShowModal(true);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSemesters(new Set());
      setSelectAll(false);
    } else {
      setSelectedSemesters(new Set(semesters.map(s => s._id)));
      setSelectAll(true);
    }
  };

  const handleSelectSemester = (semesterId) => {
    const newSelected = new Set(selectedSemesters);
    if (newSelected.has(semesterId)) {
      newSelected.delete(semesterId);
    } else {
      newSelected.add(semesterId);
    }
    setSelectedSemesters(newSelected);
    setSelectAll(false);
  };

  const bulkDeleteSemesters = async () => {
    if (selectedSemesters.size === 0) {
      toast.error('No semesters selected');
      return;
    }
    
    const confirmMessage = `Delete ${selectedSemesters.size} selected semester${selectedSemesters.size > 1 ? 's' : ''}? This will also delete all related timetables and progress data.`;
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await Promise.all(
        Array.from(selectedSemesters).map(id => api.delete(`/semesters/${id}`))
      );
      toast.success(`Deleted ${selectedSemesters.size} semesters`);
      
      // Clear selection if selected semester was deleted
      if (selectedSemester && selectedSemesters.has(selectedSemester._id)) {
        setSelectedSemester(null);
        setWeeklyTimetables([]);
        setShowWeeklyView(false);
      }
      
      loadSemesters();
    } catch (err) {
      toast.error('Failed to delete some semesters');
    }
  };

  const handleViewWeeklyTimetables = () => {
    setShowTimetableResult(false);
    setShowWeeklyView(true);
  };

  const handleGenerateTimetableFromHoliday = () => {
    setShowHolidayImpact(false);
    generateSemesterTimetable();
  };

  const calculateProgress = (semester) => {
    if (!semester.academicCalendar) return { total: 0, actual: 0, percentage: 0, totalDays: 0 };
    
    const total = semester.academicCalendar.totalTeachingDays || 0;
    const actual = semester.academicCalendar.actualTeachingDays || 0;
    const percentage = total > 0 ? Math.round((actual / total) * 100) : 0;
    
    // Calculate total days between start and end date
    let totalDays = 0;
    if (semester.startDate && semester.endDate) {
      const start = new Date(semester.startDate);
      const end = new Date(semester.endDate);
      totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    return { total, actual, percentage, totalDays };
  };

  if (loading) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="topbar">
        <h2>Semester Planner</h2>
        <button className="btn btn-primary" onClick={() => openModal('semester')}>
          <Plus size={16} /> New Semester
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, marginTop: 24 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Semesters</span>
            {semesters.length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleSelectAll}
                >
                  {selectAll ? 'Deselect All' : 'Select All'}
                </button>
                {selectedSemesters.size > 0 && (
                  <button className="btn btn-danger btn-sm" onClick={bulkDeleteSemesters}>
                    Delete Selected ({selectedSemesters.size})
                  </button>
                )}
              </div>
            )}
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {semesters.map(semester => {
              const progress = calculateProgress(semester);
              const isSelected = selectedSemesters.has(semester._id);
              return (
                <div 
                  key={semester._id}
                  className={`semester-item ${selectedSemester?._id === semester._id ? 'active' : ''}`}
                  style={{
                    padding: 12,
                    borderBottom: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    background: isSelected ? '#e0f2fe' : 
                               selectedSemester?._id === semester._id ? '#f0f9ff' : 'transparent',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectSemester(semester._id);
                    }}
                    style={{ cursor: 'pointer', marginTop: 4 }}
                  />
                  <div 
                    style={{ flex: 1 }}
                    onClick={() => setSelectedSemester(semester)}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{semester.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 8 }}>
                      {new Date(semester.startDate).toLocaleDateString()} - {new Date(semester.endDate).toLocaleDateString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className={`badge ${
                        semester.status === 'active' ? 'badge-green' :
                        semester.status === 'completed' ? 'badge-blue' : 'badge-secondary'
                      }`}>
                        {semester.status}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {progress.actual}/{progress.total} days
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}}
            {semesters.length === 0 && (
              <div className="empty-state" style={{ padding: 20 }}>
                <Calendar size={32} />
                <p>No semesters created yet</p>
              </div>
            )}
          </div>
        </div>

        <div>
          {selectedSemester ? (
            <>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">{selectedSemester.name}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-success btn-sm" onClick={generateSemesterTimetable}>
                      <Wand2 size={14} /> Generate Timetable
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowWeeklyView(!showWeeklyView)}>
                      <Eye size={14} /> {showWeeklyView ? 'Hide' : 'View'} Weekly
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => openModal('semester', selectedSemester)}>
                      <Edit2 size={14} /> Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteSemester(selectedSemester._id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                  <div className="stat-card">
                    <div className="stat-icon gray"><Clock size={20} /></div>
                    <div>
                      <div className="stat-value">{calculateProgress(selectedSemester).totalDays}</div>
                      <div className="stat-label">Total Days</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon blue"><Calendar size={20} /></div>
                    <div>
                      <div className="stat-value">{calculateProgress(selectedSemester).total}</div>
                      <div className="stat-label">Total Teaching Days</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon green"><CheckCircle size={20} /></div>
                    <div>
                      <div className="stat-value">{calculateProgress(selectedSemester).actual}</div>
                      <div className="stat-label">Available Days</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon orange"><AlertTriangle size={20} /></div>
                    <div>
                      <div className="stat-value">{selectedSemester.holidays?.length || 0}</div>
                      <div className="stat-label">Holidays</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon purple"><BarChart3 size={20} /></div>
                    <div>
                      <div className="stat-value">{calculateProgress(selectedSemester).percentage}%</div>
                      <div className="stat-label">Availability</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header">
                  <span className="card-title">Holiday Calendar</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setBulkHolidayMode(true); openModal('calendar'); }}>
                      <Calendar size={14} /> Bulk Add
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => { setBulkHolidayMode(false); openModal('holiday'); }}>
                      <Plus size={14} /> Add Holiday
                    </button>
                  </div>
                </div>
                
                {selectedSemester.holidays && selectedSemester.holidays.length > 0 ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Holiday Name</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Type</th>
                          <th>Duration</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSemester.holidays.map((holiday, index) => {
                          const start = new Date(holiday.startDate);
                          const end = new Date(holiday.endDate);
                          const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                          
                          return (
                            <tr key={index}>
                              <td><strong>{holiday.name}</strong></td>
                              <td>{start.toLocaleDateString()}</td>
                              <td>{end.toLocaleDateString()}</td>
                              <td>
                                <span className={`badge ${
                                  holiday.type === 'national' ? 'badge-red' :
                                  holiday.type === 'regional' ? 'badge-blue' : 'badge-secondary'
                                }`}>
                                  {holiday.type}
                                </span>
                              </td>
                              <td>{duration} day{duration > 1 ? 's' : ''}</td>
                              <td>
                                <button 
                                  className="btn btn-danger btn-sm" 
                                  onClick={() => deleteHoliday(index)}
                                  title="Delete Holiday"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Calendar size={40} />
                    <p>No holidays added yet</p>
                  </div>
                )}
              </div>
              
              {/* Weekly Timetables View */}
              {showWeeklyView && weeklyTimetables.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                  <div className="card-header">
                    <span className="card-title">Weekly Timetables ({weeklyTimetables.length} weeks)</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {weeklyTimetables.map(week => {
                      const compensationClasses = week.entries?.filter(e => e.isCompensation).length || 0;
                      const saturdayClasses = week.entries?.filter(e => e.isSaturdayClass).length || 0;
                      const totalClasses = week.entries?.length || 0;
                      const fitnessScore = week.fitnessScore || 0;
                      
                      return (
                        <div key={week.weekNumber} className="card" style={{ margin: 0 }}>
                          <div className="card-header">
                            <span className="card-title">Week {week.weekNumber}</span>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              {fitnessScore > 0 && (
                                <span className={`badge ${
                                  fitnessScore >= 80 ? 'badge-green' :
                                  fitnessScore >= 50 ? 'badge-yellow' : 'badge-red'
                                }`} style={{ fontSize: '0.7rem' }}>
                                  {fitnessScore}%
                                </span>
                              )}
                              <span className={`badge ${
                                week.status === 'completed' ? 'badge-green' :
                                week.status === 'in_progress' ? 'badge-yellow' : 'badge-secondary'
                              }`}>
                                {week.status}
                              </span>
                            </div>
                          </div>
                          
                          <div style={{ padding: 12, fontSize: '0.9rem' }}>
                            <p><strong>Period:</strong> {new Date(week.weekStartDate).toLocaleDateString()} - {new Date(week.weekEndDate).toLocaleDateString()}</p>
                            <p><strong>Total Classes:</strong> {totalClasses}</p>
                            {compensationClasses > 0 && (
                              <p style={{ color: '#ea580c' }}><strong>Compensations:</strong> {compensationClasses}</p>
                            )}
                            {saturdayClasses > 0 && (
                              <p style={{ color: '#7c3aed' }}><strong>Saturday Classes:</strong> {saturdayClasses}</p>
                            )}
                            {week.holidaysInWeek && week.holidaysInWeek.length > 0 && (
                              <p style={{ color: '#dc2626' }}><strong>Holidays:</strong> {week.holidaysInWeek.join(', ')}</p>
                            )}
                          </div>
                          
                          <div style={{ padding: '0 12px 12px' }}>
                            <button 
                              className="btn btn-primary btn-sm" 
                              style={{ width: '100%' }}
                              onClick={() => navigate(`/weekly-timetable/${selectedSemester._id}/${week.weekNumber}`)}
                            >
                              View Timetable
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <div className="empty-state">
                <Calendar size={60} />
                <h3>Select a Semester</h3>
                <p>Choose a semester from the list to view details and manage holidays</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: modalType === 'calendar' ? 800 : 480 }}>
            <div className="modal-header">
              <span className="modal-title">
                {modalType === 'semester' ? (selectedSemester ? 'Edit Semester' : 'New Semester') :
                 modalType === 'holiday' ? 'Add Holiday' :
                 modalType === 'calendar' ? 'Select Holiday Dates' : 'Semester Settings'}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            
            {modalType === 'calendar' && (
              <div>
                <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af' }}>
                    📅 Select multiple dates from the calendar below to add as holidays
                  </p>
                </div>
                
                <HolidayCalendar
                  startDate={selectedSemester?.startDate}
                  endDate={selectedSemester?.endDate}
                  existingHolidays={selectedSemester?.holidays || []}
                  selectedDates={selectedDates}
                  onDateToggle={toggleDateSelection}
                  onClearAll={clearSelectedDates}
                />
                
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={addBulkHolidays}
                    disabled={selectedDates.length === 0}
                  >
                    Add {selectedDates.length} Holidays
                  </button>
                </div>
              </div>
            )}
            
            {modalType === 'semester' && (
              <form onSubmit={saveSemester}>
                <div className="form-group">
                  <label className="form-label">Semester Name *</label>
                  <input 
                    className="form-input" 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    placeholder="e.g., Fall 2024, Spring 2025"
                    required 
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input 
                      className="form-input" 
                      type="date" 
                      value={form.startDate} 
                      onChange={e => setForm({...form, startDate: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <input 
                      className="form-input" 
                      type="date" 
                      value={form.endDate} 
                      onChange={e => setForm({...form, endDate: e.target.value})} 
                      required 
                    />
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  {selectedSemester ? 'Update Semester' : 'Create Semester'}
                </button>
              </form>
            )}
            
            {modalType === 'holiday' && (
              <form onSubmit={addHoliday}>
                <div className="form-group">
                  <label className="form-label">Holiday Name *</label>
                  <input 
                    className="form-input" 
                    value={holidayForm.name} 
                    onChange={e => setHolidayForm({...holidayForm, name: e.target.value})} 
                    placeholder="e.g., Diwali, Christmas, Mid-term Break"
                    required 
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input 
                      className="form-input" 
                      type="date" 
                      value={holidayForm.startDate} 
                      onChange={e => setHolidayForm({...holidayForm, startDate: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <input 
                      className="form-input" 
                      type="date" 
                      value={holidayForm.endDate} 
                      onChange={e => setHolidayForm({...holidayForm, endDate: e.target.value})} 
                      required 
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Holiday Type</label>
                  <select 
                    className="form-select" 
                    value={holidayForm.type} 
                    onChange={e => setHolidayForm({...holidayForm, type: e.target.value})}
                  >
                    <option value="institutional">Institutional</option>
                    <option value="regional">Regional</option>
                    <option value="national">National</option>
                  </select>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Add Holiday & Analyze Impact
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      
      {/* Timetable Result Notification */}
      {showTimetableResult && (
        <TimetableResultNotification 
          result={timetableResult}
          onClose={() => setShowTimetableResult(false)}
          onViewWeekly={handleViewWeeklyTimetables}
        />
      )}
      
      {/* Holiday Impact Notification */}
      {showHolidayImpact && (
        <HolidayImpactNotification 
          holidayCount={holidayImpactData}
          onClose={() => setShowHolidayImpact(false)}
          onGenerateTimetable={handleGenerateTimetableFromHoliday}
        />
      )}
    </div>
  );
}