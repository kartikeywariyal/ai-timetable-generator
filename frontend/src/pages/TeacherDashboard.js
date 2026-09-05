import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, BookOpen, Calendar } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function TeacherDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get(`/timetable/${id}/teacher-dashboard`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => { toast.error('Failed to load'); setLoading(false); });
  }, [id]);

  const filtered = data.filter(d => d.teacher?.name?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={14} /></button>
          <h2>Teacher Dashboard</h2>
        </div>
        <div className="search-bar">
          <input placeholder="Search teacher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map((d, i) => (
          <div className="card" key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div className="stat-icon purple"><User size={18} /></div>
              <div>
                <div style={{ fontWeight: 600 }}>{d.teacher?.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.teacher?.email || 'No email'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#6366f1' }}>{d.totalLectures}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Total Lectures</div>
              </div>
              <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#16a34a' }}>{Object.keys(d.byDay).length}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Active Days</div>
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                <BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} />Subjects
              </div>
              <div>{d.subjects.map((s, j) => <span key={j} className="chip">{s}</span>)}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />Daily Load
              </div>
              {Object.entries(d.byDay).map(([day, count]) => (
                <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: '0.75rem', width: 80, color: '#64748b' }}>{day.slice(0, 3)}</span>
                  <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${(count / 8) * 100}%` }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#475569', width: 20 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <User size={40} />
            <p>No teacher data found</p>
          </div>
        )}
      </div>
    </div>
  );
}
