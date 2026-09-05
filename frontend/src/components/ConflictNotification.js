import React from 'react';
import { AlertTriangle, X, Lightbulb, Clock, Users, MapPin, Target } from 'lucide-react';

const getConflictSolutions = (conflictType) => {
  const solutions = {
    teacher: {
      icon: <Users size={14} />,
      title: "Teacher Conflict Solutions:",
      suggestions: [
        "Move one class to a different time slot when the teacher is free",
        "Assign a substitute teacher for one of the conflicting classes",
        "Swap the teacher with another qualified teacher for that period",
        "Consider splitting the class if it's too large for one teacher"
      ],
      precautions: [
        "Check teacher availability before scheduling",
        "Maintain teacher workload balance across days",
        "Ensure teachers have adequate break time between classes"
      ]
    },
    classroom: {
      icon: <MapPin size={14} />,
      title: "Classroom Conflict Solutions:",
      suggestions: [
        "Move one class to an available classroom of similar capacity",
        "Reschedule one class to a different time when the room is free",
        "Use a larger classroom if both classes can be combined",
        "Consider using lab spaces for practical subjects"
      ],
      precautions: [
        "Check classroom capacity matches class size",
        "Ensure lab subjects are scheduled in appropriate lab rooms",
        "Reserve special equipment rooms for relevant subjects"
      ]
    },
    class: {
      icon: <Clock size={14} />,
      title: "Class Schedule Conflict Solutions:",
      suggestions: [
        "Move one subject to a different time slot",
        "Combine related subjects into a longer session",
        "Reschedule one subject to another day",
        "Consider if subjects can be taught by the same teacher consecutively"
      ],
      precautions: [
        "Ensure balanced distribution of subjects across the week",
        "Avoid scheduling too many difficult subjects consecutively",
        "Maintain appropriate gaps between similar subjects"
      ]
    }
  };
  
  return solutions[conflictType] || solutions.teacher;
};

const findAlternativeSlots = (draggedEntry, allEntries, days, periods) => {
  const alternatives = [];
  
  // Check each day and period combination
  for (const day of days) {
    for (const period of periods) {
      // Skip the current slot
      if (day === draggedEntry.day && period === draggedEntry.period) continue;
      
      // Check if this slot has any conflicts
      const hasTeacherConflict = allEntries.some(entry => 
        entry.day === day && 
        entry.period === period && 
        entry.teacher?._id === draggedEntry.teacher?._id &&
        entry._id !== draggedEntry._id
      );
      
      const hasClassroomConflict = allEntries.some(entry => 
        entry.day === day && 
        entry.period === period && 
        entry.classroom?._id === draggedEntry.classroom?._id &&
        entry._id !== draggedEntry._id
      );
      
      const hasClassConflict = allEntries.some(entry => 
        entry.day === day && 
        entry.period === period && 
        entry.class?._id === draggedEntry.class?._id &&
        entry._id !== draggedEntry._id
      );
      
      // If no conflicts, add to alternatives
      if (!hasTeacherConflict && !hasClassroomConflict && !hasClassConflict) {
        alternatives.push({ day, period });
      }
    }
  }
  
  return alternatives;
};

export default function ConflictNotification({ 
  conflicts, 
  onProceed, 
  onCancel, 
  draggedEntry, 
  allEntries, 
  days, 
  periods,
  onAlternativeSelect 
}) {
  if (!conflicts || conflicts.length === 0) return null;

  // Group conflicts by type for better organization
  const groupedConflicts = conflicts.reduce((acc, conflict) => {
    if (!acc[conflict.type]) acc[conflict.type] = [];
    acc[conflict.type].push(conflict);
    return acc;
  }, {});
  
  // Find alternative slots if we have the necessary data
  const alternativeSlots = draggedEntry && allEntries && days && periods 
    ? findAlternativeSlots(draggedEntry, allEntries, days, periods)
    : [];

  return (
    <div className="conflict-notification" style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: '#fef2f2',
      border: '2px solid #fca5a5',
      borderRadius: '12px',
      padding: '16px',
      maxWidth: '500px',
      maxHeight: '80vh',
      overflowY: 'auto',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AlertTriangle size={20} style={{ color: '#dc2626' }} />
        <span style={{ fontWeight: 600, color: '#dc2626', fontSize: '1rem' }}>
          Scheduling Conflicts Detected
        </span>
        <button 
          onClick={onCancel}
          style={{
            marginLeft: 'auto',
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
      
      {/* Display conflicts */}
      <div style={{ marginBottom: 16 }}>
        {conflicts.map((conflict, i) => (
          <div key={i} style={{
            fontSize: '0.85rem',
            color: '#7f1d1d',
            marginBottom: '6px',
            paddingLeft: '8px',
            borderLeft: '3px solid #fca5a5'
          }}>
            • {conflict.message}
          </div>
        ))}
      </div>
      
      {/* Alternative Slots */}
      {alternativeSlots.length > 0 && (
        <div style={{ 
          background: '#f0fdf4', 
          borderRadius: '8px', 
          padding: '12px', 
          marginBottom: '16px',
          border: '1px solid #bbf7d0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Target size={16} style={{ color: '#059669' }} />
            <span style={{ fontWeight: 600, color: '#059669', fontSize: '0.9rem' }}>
              Alternative Time Slots ({alternativeSlots.length} available)
            </span>
          </div>
          
          <div style={{ fontSize: '0.75rem', color: '#065f46', marginBottom: 8 }}>
            Click on any slot below to move your lecture there without conflicts:
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
            gap: '6px',
            maxHeight: '120px',
            overflowY: 'auto'
          }}>
            {alternativeSlots.slice(0, 12).map((slot, idx) => (
              <button
                key={idx}
                onClick={() => onAlternativeSelect && onAlternativeSelect(slot.day, slot.period)}
                style={{
                  background: '#dcfce7',
                  border: '1px solid #16a34a',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '0.7rem',
                  color: '#14532d',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontWeight: 500
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#bbf7d0';
                  e.target.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#dcfce7';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                {slot.day.slice(0, 3)}<br />P{slot.period}
              </button>
            ))}
          </div>
          
          {alternativeSlots.length > 12 && (
            <div style={{ 
              fontSize: '0.7rem', 
              color: '#065f46', 
              marginTop: 6, 
              textAlign: 'center' 
            }}>
              +{alternativeSlots.length - 12} more slots available
            </div>
          )}
        </div>
      )}
      
      {alternativeSlots.length === 0 && draggedEntry && (
        <div style={{ 
          background: '#fef3c7', 
          borderRadius: '8px', 
          padding: '10px', 
          marginBottom: '16px',
          border: '1px solid #fbbf24',
          fontSize: '0.75rem',
          color: '#92400e'
        }}>
          <strong>⚠️ No Conflict-Free Slots Available</strong><br />
          All other time slots have conflicts. Consider:
          <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
            <li>Rearranging multiple lectures to create space</li>
            <li>Using substitute teachers or alternative classrooms</li>
            <li>Reviewing the entire timetable for optimization</li>
          </ul>
        </div>
      )}
      
      {/* Solutions and Precautions */}
      <div style={{ 
        background: '#f0f9ff', 
        borderRadius: '8px', 
        padding: '12px', 
        marginBottom: '16px',
        border: '1px solid #bae6fd'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Lightbulb size={16} style={{ color: '#0369a1' }} />
          <span style={{ fontWeight: 600, color: '#0369a1', fontSize: '0.9rem' }}>
            Recommended Solutions
          </span>
        </div>
        
        {Object.entries(groupedConflicts).map(([type, typeConflicts]) => {
          const solutions = getConflictSolutions(type);
          return (
            <div key={type} style={{ marginBottom: 12 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                marginBottom: 6,
                color: '#0c4a6e',
                fontWeight: 500,
                fontSize: '0.8rem'
              }}>
                {solutions.icon}
                {solutions.title}
              </div>
              
              <div style={{ marginLeft: 20, fontSize: '0.75rem', color: '#1e40af' }}>
                <div style={{ marginBottom: 6 }}>
                  <strong>Quick Fixes:</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                    {solutions.suggestions.slice(0, 2).map((suggestion, idx) => (
                      <li key={idx} style={{ marginBottom: 2 }}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <strong>Prevention Tips:</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                    {solutions.precautions.slice(0, 2).map((precaution, idx) => (
                      <li key={idx} style={{ marginBottom: 2 }}>{precaution}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* General Tips */}
      <div style={{ 
        background: '#fefce8', 
        borderRadius: '8px', 
        padding: '10px', 
        marginBottom: '16px',
        border: '1px solid #fde047',
        fontSize: '0.75rem',
        color: '#a16207'
      }}>
        <strong>💡 Pro Tips:</strong>
        <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
          <li>Use filters to view specific teacher/class schedules before moving</li>
          <li>Check the Teacher Dashboard to see workload distribution</li>
          <li>Consider creating substitute assignments instead of forcing conflicts</li>
          <li>Review the entire week's schedule for better optimization</li>
        </ul>
      </div>
      
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={onCancel}
          style={{ fontSize: '0.8rem' }}
        >
          Cancel & Review
        </button>
        <button 
          className="btn btn-danger btn-sm"
          onClick={onProceed}
          style={{ fontSize: '0.8rem' }}
        >
          Proceed Anyway
        </button>
      </div>
    </div>
  );
}