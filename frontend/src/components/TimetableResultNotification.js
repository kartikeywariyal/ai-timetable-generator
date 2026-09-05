import React from 'react';
import { CheckCircle, X, Calendar, Clock, Target, AlertTriangle } from 'lucide-react';

export default function TimetableResultNotification({ result, onClose, onViewWeekly }) {
  if (!result) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={20} style={{ color: '#16a34a' }} />
            <span className="modal-title">Timetable Generated Successfully!</span>
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
            border: '1px solid #bbf7d0'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                  <Calendar size={16} style={{ color: '#059669' }} />
                  <span style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 500 }}>Total Weeks</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>{result.totalWeeks}</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                  <AlertTriangle size={16} style={{ color: result.totalMissedClasses > 0 ? '#ea580c' : '#059669' }} />
                  <span style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 500 }}>Missed Classes</span>
                </div>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 700, 
                  color: result.totalMissedClasses > 0 ? '#ea580c' : '#059669' 
                }}>
                  {result.totalMissedClasses}
                </div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                  <Target size={16} style={{ color: '#059669' }} />
                  <span style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 500 }}>Strategy</span>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669', textAlign: 'center' }}>
                  {result.compensationStrategy}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ 
            background: '#f0f9ff', 
            borderRadius: '8px', 
            padding: '12px', 
            border: '1px solid #bae6fd',
            fontSize: '0.85rem',
            color: '#0c4a6e'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>📋 What happens next:</div>
            <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
              <li>Weekly timetables have been generated for the entire semester</li>
              <li>Holiday conflicts are automatically resolved with compensation classes</li>
              <li>Saturday makeup classes are scheduled when needed</li>
              <li>You can view and edit individual weekly schedules</li>
            </ul>
          </div>
          
          {result.totalMissedClasses > 0 && (
            <div style={{ 
              background: '#fef3c7', 
              borderRadius: '8px', 
              padding: '12px', 
              marginTop: '12px',
              border: '1px solid #fbbf24',
              fontSize: '0.85rem',
              color: '#92400e'
            }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>⚠️ Compensation Required:</div>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                {result.totalMissedClasses} classes need compensation due to holidays. 
                These have been automatically rescheduled to available slots or moved to Saturday sessions.
              </p>
            </div>
          )}
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
            onClick={onViewWeekly}
            style={{ fontSize: '0.9rem' }}
          >
            <Calendar size={16} /> View Weekly Timetables
          </button>
        </div>
      </div>
    </div>
  );
}