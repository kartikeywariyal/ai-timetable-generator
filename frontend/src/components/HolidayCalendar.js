import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HolidayCalendar = ({ 
  startDate, 
  endDate, 
  existingHolidays = [], 
  selectedDates = [], 
  onDateToggle,
  onClearAll 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(startDate));

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateInRange = (date) => {
    const checkDate = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return checkDate >= start && checkDate <= end;
  };

  const isDateHoliday = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return existingHolidays.some(holiday => {
      const holidayStart = new Date(holiday.startDate).toISOString().split('T')[0];
      const holidayEnd = new Date(holiday.endDate).toISOString().split('T')[0];
      return dateStr >= holidayStart && dateStr <= holidayEnd;
    });
  };

  const isDateSelected = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return selectedDates.includes(dateStr);
  };

  const handleDateClick = (date) => {
    if (!isDateInRange(date) || isDateHoliday(date)) return;
    const dateStr = date.toISOString().split('T')[0];
    onDateToggle(dateStr);
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isInRange = isDateInRange(date);
      const isHoliday = isDateHoliday(date);
      const isSelected = isDateSelected(date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      days.push(
        <div
          key={day}
          className={`calendar-day ${
            !isInRange ? 'disabled' :
            isHoliday ? 'holiday' :
            isSelected ? 'selected' :
            isWeekend ? 'weekend' : 'available'
          }`}
          onClick={() => handleDateClick(date)}
        >
          <span className="day-number">{day}</span>
          {isHoliday && <span className="day-label">Holiday</span>}
          {isSelected && <span className="day-label">Selected</span>}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="holiday-calendar">
      <div className="calendar-header">
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={() => navigateMonth(-1)}
        >
          <ChevronLeft size={16} />
        </button>
        <h3 className="calendar-title">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={() => navigateMonth(1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="calendar-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {renderCalendar()}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color selected"></div>
          <span>Selected ({selectedDates.length})</span>
        </div>
        <div className="legend-item">
          <div className="legend-color holiday"></div>
          <span>Existing Holiday</span>
        </div>
        <div className="legend-item">
          <div className="legend-color weekend"></div>
          <span>Weekend</span>
        </div>
        <div className="legend-item">
          <div className="legend-color available"></div>
          <span>Available</span>
        </div>
      </div>

      <div className="calendar-actions">
        <button 
          className="btn btn-secondary" 
          onClick={onClearAll}
          disabled={selectedDates.length === 0}
        >
          Clear All
        </button>
        <span className="selection-count">
          {selectedDates.length} dates selected
        </span>
      </div>
    </div>
  );
};

export default HolidayCalendar;