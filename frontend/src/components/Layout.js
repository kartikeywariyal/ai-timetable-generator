import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, BookOpen, Building2,
  Clock, Wand2, LogOut, GraduationCap, CalendarDays, FileText, UserCheck, AlertTriangle, Calendar, FileSpreadsheet
} from 'lucide-react';

const adminNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/generate', icon: Wand2, label: 'Generate' },
  { to: '/excel-import', icon: FileSpreadsheet, label: 'Excel Import' },
  { to: '/teachers', icon: Users, label: 'Teachers' },
  { to: '/subjects', icon: BookOpen, label: 'Subjects' },
  { to: '/classes', icon: GraduationCap, label: 'Classes & Batches' },
  { to: '/classrooms', icon: Building2, label: 'Rooms & Labs' },
  { to: '/timeslots', icon: Clock, label: 'Time Slots' },
  { to: '/semester-planner', icon: Calendar, label: 'Semester Planner' },
  { to: '/personal-scheduler', icon: CalendarDays, label: 'My Schedule' },
  { to: '/exam-scheduler', icon: FileText, label: 'Exam Scheduler' },
  { to: '/substitute-manager', icon: UserCheck, label: 'Substitutes' },
  { to: '/unavailability-manager', icon: AlertTriangle, label: 'Unavailability' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  const roleBadgeStyle = {
    display: 'inline-block', padding: '2px 8px', borderRadius: 20,
    fontSize: '0.65rem', fontWeight: 600, marginTop: 4,
    background: '#1e293b', color: '#6366f1', border: '1px solid #6366f1'
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Chrono<span>Gen</span></h1>
          <p>AI Timetable Generator</p>
        </div>
        <nav className="sidebar-nav">
          {adminNav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.9rem', color: '#fff', flexShrink: 0
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 600 }}>{user?.name}</div>
              <div style={roleBadgeStyle}>{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '9px 0', borderRadius: 8, border: '1px solid #dc2626',
            background: 'transparent', color: '#f87171', fontSize: '0.82rem',
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f87171'; }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
