import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, GraduationCap, Building2, Wand2, Clock, UserCheck, UserX } from 'lucide-react';
import api from '../api/axios';

export default function Dashboard() {
  const [counts, setCounts] = useState({});
  const [timetables, setTimetables] = useState([]);
  const [substitutes, setSubstitutes] = useState([]);
  const [unavailabilities, setUnavailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [t, s, c, r, tt, sub, una, schedules] = await Promise.all([
        api.get('/teachers'), 
        api.get('/subjects'),
        api.get('/classes'), 
        api.get('/classrooms'),
        api.get('/timetable'), 
        api.get('/substitutes'),
        api.get('/unavailability'),
        api.get('/schedules')
      ]);
      
      // Get timetables with their substitute information
      const timetablesWithSubs = tt.data.map(timetable => {
        const timetableSubs = sub.data.filter(substitute => 
          substitute.timetableId === timetable._id
        );
        
        return {
          ...timetable,
          hasSubstitutes: timetableSubs.length > 0,
          substituteCount: timetableSubs.length,
          latestSubstitute: timetableSubs.length > 0 
            ? timetableSubs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
            : null
        };
      });
      
      setCounts({ 
        teachers: t.data.length, 
        subjects: s.data.length, 
        classes: c.data.length, 
        classrooms: r.data.length,
        substitutes: sub.data.length,
        unavailabilities: una.data.length
      });
      
      // Create separate entries for original timetables and updated timetables with substitutes
      const originalTimetables = timetablesWithSubs.map(timetable => ({
        ...timetable,
        type: 'regular',
        displayName: timetable.name,
        fitnessScore: timetable.fitnessScore,
        generation: timetable.generation,
        isOriginal: true
      }));
      
      const updatedTimetables = timetablesWithSubs
        .filter(timetable => timetable.hasSubstitutes)
        .map(timetable => ({
          ...timetable,
          _id: `${timetable._id}_updated`, // Create unique ID for updated version
          type: 'updated',
          displayName: `${timetable.name} (with ${timetable.substituteCount} substitutes)`,
          fitnessScore: timetable.fitnessScore,
          generation: timetable.generation,
          createdAt: timetable.latestSubstitute.createdAt, // Use substitute creation time
          isOriginal: false
        }));
      
      // Combine all timetables (original, updated with substitutes, personal, and exam schedules)
      const allTimetables = [
        ...originalTimetables,
        ...updatedTimetables,
        ...schedules.data.map(schedule => ({
          ...schedule,
          type: schedule.type, // 'personal' or 'exam'
          displayName: schedule.title,
          fitnessScore: null,
          generation: null,
          isOriginal: true
        }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setTimetables(allTimetables.slice(0, 5));
      setSubstitutes(sub.data.slice(0, 3));
      setUnavailabilities(una.data.slice(0, 3));
      
      console.log('Dashboard loaded:', {
        originalTimetables: originalTimetables.length,
        updatedTimetables: updatedTimetables.length,
        schedules: schedules.data.length,
        totalEntries: allTimetables.length,
        substitutes: sub.data.length,
        unavailabilities: una.data.length
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = [
    { label: 'Teachers', value: counts.teachers || 0, icon: Users, cls: 'purple' },
    { label: 'Subjects', value: counts.subjects || 0, icon: BookOpen, cls: 'blue' },
    { label: 'Classes', value: counts.classes || 0, icon: GraduationCap, cls: 'green' },
    { label: 'Classrooms', value: counts.classrooms || 0, icon: Building2, cls: 'orange' },
    { label: 'Substitutes', value: counts.substitutes || 0, icon: UserCheck, cls: 'teal' },
    { label: 'Unavailabilities', value: counts.unavailabilities || 0, icon: UserX, cls: 'red' },
  ];

  const fitnessClass = score => score >= 80 ? '' : score >= 50 ? 'medium' : 'low';

  return (
    <div className="page">
      <div className="topbar">
        <h2>Dashboard</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/generate')}>
            <Wand2 size={16} /> Generate Timetable
          </button>
        </div>
      </div>

      <div style={{ padding: '0' }}>
        {error && (
          <div className="card" style={{ marginTop: 24, background: '#fee2e2', border: '1px solid #fecaca' }}>
            <p style={{ color: '#dc2626', margin: 0 }}>{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="spinner" style={{ marginTop: 60 }} />
        ) : (
          <>
            <div className="stats-grid" style={{ marginTop: 24 }}>
          {stats.map(({ label, value, icon: Icon, cls }) => (
            <div className="stat-card" key={label}>
              <div className={`stat-icon ${cls}`}><Icon size={20} /></div>
              <div>
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Timetables & Schedules</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/personal-scheduler')}>
                <Clock size={14} /> My Schedules
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/generate')}>
                <Wand2 size={14} /> New
              </button>
            </div>
          </div>
          {timetables.length === 0 ? (
            <div className="empty-state">
              <Clock size={40} />
              <p>No timetables or schedules created yet. Click "Generate Timetable" or "Schedules" to start.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Fitness</th>
                    <th>Generation</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timetables.map(tt => {
                    console.log('Rendering timetable:', tt);
                    return (
                      <tr key={tt._id}>
                        <td><strong>{tt.displayName}</strong></td>
                        <td>
                          <span className={`badge ${
                            tt.type === 'regular' ? 'badge-blue' :
                            tt.type === 'updated' ? 'badge-purple' :
                            tt.type === 'exam' ? 'badge-red' : 'badge-green'
                          }`}>
                            {tt.type === 'regular' ? 'Original Timetable' :
                             tt.type === 'updated' ? 'Updated Timetable' :
                             tt.type === 'exam' ? 'Exam Schedule' : 'Personal Schedule'}
                          </span>
                        </td>
                        <td>
                          {tt.fitnessScore !== null ? (
                            <span className={`fitness-badge ${fitnessClass(tt.fitnessScore)}`}>
                              {tt.fitnessScore}%
                            </span>
                          ) : (
                            <span className="badge badge-secondary">N/A</span>
                          )}
                        </td>
                        <td>{tt.generation || 'N/A'}</td>
                        <td>{tt.createdAt ? new Date(tt.createdAt).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => {
                              if (tt.type === 'updated') {
                                // For updated timetables, navigate to a special view that shows substitutes
                                const timetableId = tt._id.replace('_updated', '');
                                navigate(`/timetable/${timetableId}?view=substitutes`);
                              } else if (tt.type === 'regular') {
                                navigate(`/timetable/${tt._id}`);
                              } else if (tt.type === 'exam') {
                                navigate('/exam-scheduler');
                              } else {
                                navigate('/personal-scheduler');
                              }
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Substitutes */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Substitute Assignments</span>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/substitute-manager')}>
              <UserCheck size={14} /> Manage
            </button>
          </div>
          {substitutes.length === 0 ? (
            <div className="empty-state">
              <UserCheck size={40} />
              <p>No substitute assignments yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Period</th>
                    <th>Original Teacher</th>
                    <th>Substitute</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {substitutes.map(sub => (
                    <tr key={sub._id}>
                      <td>{new Date(sub.date).toLocaleDateString()}</td>
                      <td>Period {sub.period}</td>
                      <td>{sub.originalTeacher?.name || 'N/A'}</td>
                      <td>{sub.substituteTeacher?.name || 'N/A'}</td>
                      <td>
                        <span className={`badge ${
                          sub.status === 'approved' ? 'badge-green' :
                          sub.status === 'rejected' ? 'badge-red' : 'badge-yellow'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Unavailabilities */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Teacher Unavailabilities</span>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/unavailability-manager')}>
              <UserX size={14} /> Manage
            </button>
          </div>
          {unavailabilities.length === 0 ? (
            <div className="empty-state">
              <UserX size={40} />
              <p>No teacher unavailabilities recorded.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {unavailabilities.map(una => (
                    <tr key={una._id}>
                      <td>{una.teacher?.name || 'N/A'}</td>
                      <td>{new Date(una.startDate).toLocaleDateString()}</td>
                      <td>{new Date(una.endDate).toLocaleDateString()}</td>
                      <td>
                        <span className="badge badge-secondary">
                          {una.reason}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          una.status === 'approved' ? 'badge-green' :
                          una.status === 'rejected' ? 'badge-red' : 'badge-yellow'
                        }`}>
                          {una.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
