import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Wand2, CheckCircle2, AlertCircle, Plus, ArrowRight, Sparkles } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Generate() {
  const [params] = useState({
    populationSize: 50,
    maxGenerations: 200,
    mutationRate: 0.1,
    crossoverRate: 0.8
  });
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const loadResources = async () => {
    try {
      setLoadingResources(true);
      const [cRes, tRes, rRes, tsRes] = await Promise.all([
        api.get('/classes'),
        api.get('/teachers'),
        api.get('/classrooms'),
        api.get('/timeslots')
      ]);
      setClasses(cRes.data || []);
      setTeachers(tRes.data || []);
      setClassrooms(rRes.data || []);
      setTimeslots(tsRes.data || []);
    } catch (err) {
      toast.error('Failed to load scheduling resources');
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const quickAddRoom = async () => {
    try {
      const { data } = await api.post('/classrooms', {
        name: 'Room 101',
        capacity: 60,
        isLab: false,
        building: 'Main Block'
      });
      toast.success(`Created ${data.name}!`);
      loadResources();
    } catch (err) {
      toast.error('Failed to create classroom');
    }
  };

  const generate = async e => {
    e.preventDefault();

    if (classes.length === 0) {
      toast.error('Please create at least one class before generating');
      return;
    }

    setGenerating(true);
    setProgress(0);

    // Simulate progress while GA runs
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 8, 90));
    }, 400);

    try {
      const payload = { constraints: params };
      if (selectedClass) payload.classId = selectedClass;
      
      const { data } = await api.post('/timetable/generate', payload);
      clearInterval(interval);
      setProgress(100);
      toast.success(`Timetable generated! Fitness: ${data.fitnessScore}%`);
      setTimeout(() => navigate(`/timetable/${data._id}`), 600);
    } catch (err) {
      clearInterval(interval);
      toast.error(err.response?.data?.message || 'Generation failed');
      setGenerating(false);
      setProgress(0);
      loadResources(); // Refresh to catch any updates
    }
  };

  // Load complete sample demo dataset
  const loadDemoData = async () => {
    if (!window.confirm('Load full sample academic dataset (Classes, Subjects, Courses, Teachers, Rooms & Labs)?')) return;
    setSeeding(true);
    try {
      const res = await api.post('/timetable/seed-sample-data');
      toast.success(res.data.message || 'Sample demo data loaded!');
      await loadResources();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load sample data');
    } finally {
      setSeeding(false);
    }
  };

  // Check for any subject in classes missing a teacher
  const unassignedSubjects = [];
  classes.forEach(cls => {
    (cls.subjects || []).forEach(s => {
      if (s.subject && !s.teacher) {
        unassignedSubjects.push({
          className: `${cls.name}${cls.section ? ` - ${cls.section}` : ''}`,
          subjectName: s.subject?.name || 'Subject'
        });
      }
    });
  });

  return (
    <div className="page">
      <div className="topbar">
        <h2>Generate Timetable</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadDemoData} disabled={seeding}>
            <Sparkles size={15} style={{ marginRight: 5, color: '#f59e0b' }} />
            {seeding ? 'Loading Sample Data...' : 'Load Sample Data'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24, maxWidth: 620 }}>
        {/* Resource Readiness Checklist Card */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Scheduling Readiness</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={loadResources} disabled={loadingResources}>
                Refresh
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Classes</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: classes.length > 0 ? '#16a34a' : '#dc2626' }}>
                {classes.length}
              </div>
            </div>
            <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Teachers</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: teachers.length > 0 ? '#16a34a' : '#dc2626' }}>
                {teachers.length}
              </div>
            </div>
            <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rooms & Labs</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: classrooms.length > 0 ? '#16a34a' : '#f59e0b' }}>
                {classrooms.length}
              </div>
            </div>
            <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Time Slots</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: timeslots.length > 0 ? '#16a34a' : '#dc2626' }}>
                {timeslots.length > 0 ? '✓ Ready' : 'None'}
              </div>
            </div>
          </div>

          {classrooms.length === 0 && (
            <div style={{ marginTop: 12, padding: 10, background: '#fef3c7', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: '0.82rem' }}>
              <span>No physical rooms found. Add a room or quick-create default Room 101.</span>
              <button className="btn btn-primary btn-sm" onClick={quickAddRoom}>
                <Plus size={14} /> Add Room 101
              </button>
            </div>
          )}

          {unassignedSubjects.length > 0 && (
            <div style={{ marginTop: 12, padding: 10, background: '#fee2e2', borderRadius: 6, fontSize: '0.82rem', color: '#991b1b' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <AlertCircle size={15} /> Missing Teacher Assignment
              </div>
              <div>
                {unassignedSubjects.map((item, idx) => (
                  <div key={idx}>Class <strong>{item.className}</strong>: subject <strong>{item.subjectName}</strong> has no teacher assigned.</div>
                ))}
              </div>
              <div style={{ marginTop: 6 }}>
                <Link to="/classes" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'underline' }}>
                  Go to Classes & Batches to assign teachers <ArrowRight size={12} style={{ display: 'inline' }} />
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title"><Wand2 size={16} style={{ display: 'inline', marginRight: 6 }} />Generate Timetable</span>
          </div>

          {generating ? (
            <div className="generating-overlay">
              <div className="spinner" />
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem', color: '#64748b' }}>
                  <span>Running Genetic Algorithm...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <p>Evolving timetable population across generations</p>
            </div>
          ) : (
            <form onSubmit={generate}>
              <div className="form-group">
                <label className="form-label">Select Class (Optional)</label>
                <select className="form-input" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                  <option value="">All Classes ({classes.length})</option>
                  {classes.map(cls => (
                    <option key={cls._id} value={cls._id}>{cls.name} {cls.section && `- ${cls.section}`}</option>
                  ))}
                </select>
                <small style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Leave empty to generate for all classes</small>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: '0.8rem', color: '#64748b' }}>
                <strong style={{ color: '#475569' }}>How it works:</strong>
                <ul style={{ marginTop: 6, paddingLeft: 16, lineHeight: 1.8 }}>
                  <li>Uses genetic algorithm to eliminate clashes between teachers and rooms</li>
                  <li>Ensures maximum student coverage with optimal teacher workloads</li>
                  <li>Auto-provisions a default room if no physical room was configured</li>
                </ul>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                <Wand2 size={18} /> Generate Timetable
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
