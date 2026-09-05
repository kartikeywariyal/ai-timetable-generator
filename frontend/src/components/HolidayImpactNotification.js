import React from 'react';
import { Calendar, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function HolidayImpactNotification({ holidayCount, onClose, onGenerateTimetable }) {
  if (!holidayCount) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={20} style={{ color: '#16a34a' }} />
            <span className="modal-title">Holidays Added Successfully!</span>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            <X size={16} />
          </button>
        </div>
        
        <div style={{ marginBottom: 20 }}>
          <div style={{ 
            background: '#f0fdf4', 
            borderRadius: '8px', 
            padding: '16px', 
            marginBottom: '16px',
            border: '1px solid #bbf7d0',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              <Calendar size={24} style={{ color: '#059669' }} />
              <span style={{ fontSize: '1.2rem', fontWeight: 600, color: '#059669' }}>
                {holidayCount} Holiday{holidayCount > 1 ? 's' : ''} Added
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#065f46' }}>
              All holidays have been successfully added to your semester calendar
            </p>
          </div>
          
          <div style={{ 
            background: '#f0f9ff', 
            borderRadius: '8px', 
            padding: '14px', 
            border: '1px solid #bae6fd',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <AlertTriangle size={16} style={{ color: '#0369a1' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0369a1' }}>
                Automatic Impact Management
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#0c4a6e', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 8px 0' }}>
                These holidays will be automatically considered when generating the semester timetable:
              </p>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>Missed classes will be rescheduled to available slots in the same week</li>
                <li>Classes will be moved to Saturday if no weekday slots are available</li>
                <li>Syllabus completion will be tracked automatically</li>
              </ul>
            </div>
          </div>
          
          <div style={{ 
            background: '#fefce8', 
            borderRadius: '8px', 
            padding: '12px', 
            border: '1px solid #fde047',
            fontSize: '0.8rem',
            color: '#a16207'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Clock size={14} />
              <strong>Next Step:</strong>
            </div>
            <p style={{ margin: 0 }}>
              Generate the semester timetable to see the complete schedule with automatic holiday compensation.
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-secondary"
            onClick={onClose}
            style={{ fontSize: '0.9rem' }}
          >
            Close
          </button>
          <button 
            className="btn btn-primary"
            onClick={onGenerateTimetable}
            style={{ fontSize: '0.9rem' }}
          >
            <Calendar size={16} /> Generate Timetable
          </button>
        </div>
      </div>
    </div>
  );
}