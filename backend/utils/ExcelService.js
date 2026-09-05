const ExcelJS = require('exceljs');

class ExcelService {
  // Generate Excel template with all required sheets
  async generateTemplate() {
    const workbook = new ExcelJS.Workbook();

    // 1. Classes Sheet
    const classesSheet = workbook.addWorksheet('Classes');
    classesSheet.columns = [
      { header: 'Class Name', key: 'name', width: 15 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Strength', key: 'strength', width: 10 },
      { header: 'Course', key: 'course', width: 15 }
    ];
    
    // Add sample data
    classesSheet.addRows([
      { name: 'BTech CSE', section: 'A', strength: 60, course: 'BTech' },
      { name: 'BTech CSE', section: 'B', strength: 58, course: 'BTech' },
      { name: 'BCS', section: 'A', strength: 45, course: 'BCS' }
    ]);

    // 2. Subjects Sheet
    const subjectsSheet = workbook.addWorksheet('Subjects');
    subjectsSheet.columns = [
      { header: 'Subject Name', key: 'name', width: 25 },
      { header: 'Subject Code', key: 'code', width: 15 },
      { header: 'Hours Per Week', key: 'hoursPerWeek', width: 15 },
      { header: 'Is Lab', key: 'isLab', width: 10 },
      { header: 'Course', key: 'course', width: 15 }
    ];
    
    subjectsSheet.addRows([
      { name: 'Data Structures', code: 'CS201', hoursPerWeek: 4, isLab: 'No', course: 'BTech' },
      { name: 'Database Systems', code: 'CS301', hoursPerWeek: 3, isLab: 'No', course: 'BTech' },
      { name: 'Database Lab', code: 'CS301L', hoursPerWeek: 2, isLab: 'Yes', course: 'BTech' }
    ]);

    // 3. Teachers Sheet
    const teachersSheet = workbook.addWorksheet('Teachers');
    teachersSheet.columns = [
      { header: 'Teacher Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Subjects (comma separated)', key: 'subjects', width: 30 },
      { header: 'Max Hours Per Day', key: 'maxHoursPerDay', width: 18 },
      { header: 'Max Hours Per Week', key: 'maxHoursPerWeek', width: 20 },
      { header: 'Course', key: 'course', width: 15 },
      { header: 'Preferred Building', key: 'preferredBuilding', width: 20 }
    ];
    
    teachersSheet.addRows([
      { name: 'Dr. John Smith', email: 'john@college.edu', subjects: 'Data Structures,Algorithms', maxHoursPerDay: 6, maxHoursPerWeek: 24, course: 'BTech', preferredBuilding: 'CS Block' },
      { name: 'Prof. Jane Doe', email: 'jane@college.edu', subjects: 'Database Systems,Database Lab', maxHoursPerDay: 5, maxHoursPerWeek: 20, course: 'BTech', preferredBuilding: 'Main Block' }
    ]);

    // 4. Teacher Availability Sheet (New)
    const availabilitySheet = workbook.addWorksheet('TeacherAvailability');
    availabilitySheet.columns = [
      { header: 'Teacher Name', key: 'name', width: 20 },
      { header: 'Day', key: 'day', width: 15 },
      { header: 'Unavailable Periods (comma separated)', key: 'periods', width: 35 }
    ];

    availabilitySheet.addRows([
      { name: 'Dr. John Smith', day: 'Monday', periods: '1, 2' },
      { name: 'Prof. Jane Doe', day: 'Wednesday', periods: '4, 5' }
    ]);

    // 5. Classrooms Sheet
    const classroomsSheet = workbook.addWorksheet('Classrooms');
    classroomsSheet.columns = [
      { header: 'Room Name', key: 'name', width: 15 },
      { header: 'Capacity', key: 'capacity', width: 10 },
      { header: 'Is Lab', key: 'isLab', width: 10 },
      { header: 'Building', key: 'building', width: 15 }
    ];
    
    classroomsSheet.addRows([
      { name: 'Room 101', capacity: 60, isLab: 'No', building: 'Main Block' },
      { name: 'Lab 201', capacity: 30, isLab: 'Yes', building: 'CS Block' },
      { name: 'Room 102', capacity: 50, isLab: 'No', building: 'Main Block' }
    ]);

    // 5. Time Slots Sheet
    const timeSlotsSheet = workbook.addWorksheet('TimeSlots');
    timeSlotsSheet.columns = [
      { header: 'Days (comma separated)', key: 'days', width: 25 },
      { header: 'Period Number', key: 'periodNumber', width: 15 },
      { header: 'Start Time', key: 'startTime', width: 12 },
      { header: 'End Time', key: 'endTime', width: 12 },
      { header: 'Is Break', key: 'isBreak', width: 10 }
    ];
    
    timeSlotsSheet.addRows([
      { days: 'Monday,Tuesday,Wednesday,Thursday,Friday', periodNumber: 1, startTime: '09:00', endTime: '10:00', isBreak: 'No' },
      { days: 'Monday,Tuesday,Wednesday,Thursday,Friday', periodNumber: 2, startTime: '10:00', endTime: '11:00', isBreak: 'No' },
      { days: 'Monday,Tuesday,Wednesday,Thursday,Friday', periodNumber: 3, startTime: '11:00', endTime: '11:15', isBreak: 'Yes' },
      { days: 'Monday,Tuesday,Wednesday,Thursday,Friday', periodNumber: 4, startTime: '11:15', endTime: '12:15', isBreak: 'No' },
      { days: 'Monday,Tuesday,Wednesday,Thursday,Friday', periodNumber: 5, startTime: '12:15', endTime: '13:15', isBreak: 'No' }
    ]);

    // 7. Class-Subject Assignments Sheet
    const assignmentsSheet = workbook.addWorksheet('Assignments');
    assignmentsSheet.columns = [
      { header: 'Class Name', key: 'className', width: 15 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Subject Name', key: 'subjectName', width: 25 },
      { header: 'Teacher Name', key: 'teacherName', width: 20 },
      { header: 'Is Consecutive (Yes/No)', key: 'isConsecutive', width: 22 },
      { header: 'Preferred Room', key: 'preferredRoom', width: 18 }
    ];
    
    assignmentsSheet.addRows([
      { className: 'BTech CSE', section: 'A', subjectName: 'Data Structures', teacherName: 'Dr. John Smith', isConsecutive: 'Yes', preferredRoom: 'Room 101' },
      { className: 'BTech CSE', section: 'A', subjectName: 'Database Systems', teacherName: 'Prof. Jane Doe', isConsecutive: 'No', preferredRoom: '' },
      { className: 'BTech CSE', section: 'B', subjectName: 'Data Structures', teacherName: 'Dr. John Smith', isConsecutive: 'Yes', preferredRoom: 'Room 101' }
    ]);

    // 7. Instructions Sheet
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.columns = [
      { header: 'Sheet', key: 'sheet', width: 15 },
      { header: 'Instructions', key: 'instructions', width: 80 }
    ];
    
    instructionsSheet.addRows([
      { sheet: 'Classes', instructions: 'Add all classes with their sections and student strength. Course field helps organize classes by program.' },
      { sheet: 'Subjects', instructions: 'List all subjects with codes and weekly hours. Mark lab subjects as "Yes" in Is Lab column.' },
      { sheet: 'Teachers', instructions: 'Add teacher details with subjects they can teach (comma separated). Set realistic hour limits.' },
      { sheet: 'Classrooms', instructions: 'List all available rooms with capacity. Mark lab rooms as "Yes" for lab subjects.' },
      { sheet: 'TimeSlots', instructions: 'Define your weekly schedule with periods and breaks. Use 24-hour format for times.' },
      { sheet: 'Assignments', instructions: 'Assign subjects to classes with specific teachers. Each row creates a class-subject-teacher mapping.' },
      { sheet: 'General', instructions: 'Fill all sheets completely. Ensure teacher names, subject names match exactly across sheets.' }
    ]);

    // Style headers
    [classesSheet, subjectsSheet, teachersSheet, classroomsSheet, timeSlotsSheet, assignmentsSheet, instructionsSheet].forEach(sheet => {
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } };
    });

    return workbook;
  }

  // Parse uploaded Excel file
  async parseExcelFile(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const result = {
      classes: [],
      subjects: [],
      teachers: [],
      classrooms: [],
      timeSlots: { days: [], periods: [] },
      assignments: [],
      errors: [],
      warnings: []
    };

    try {
      // Parse Classes
      const classesSheet = workbook.getWorksheet('Classes');
      if (classesSheet) {
        classesSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header
          const [, name, section, strength, course] = row.values;
          
          if (name && section) {
            result.classes.push({
              name: String(name).trim(),
              section: String(section).trim(),
              strength: parseInt(strength) || 30,
              course: String(course || '').trim()
            });
          }
        });
      } else {
        result.errors.push('Classes sheet not found');
      }

      // Parse Subjects
      const subjectsSheet = workbook.getWorksheet('Subjects');
      if (subjectsSheet) {
        subjectsSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const [, name, code, hoursPerWeek, isLab, course] = row.values;
          
          if (name) {
            result.subjects.push({
              name: String(name).trim(),
              code: String(code || '').trim(),
              hoursPerWeek: parseInt(hoursPerWeek) || 3,
              isLab: String(isLab).toLowerCase() === 'yes',
              course: String(course || '').trim()
            });
          }
        });
      } else {
        result.errors.push('Subjects sheet not found');
      }

      // Parse Teachers
      const teachersSheet = workbook.getWorksheet('Teachers');
      if (teachersSheet) {
        teachersSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const [, name, email, subjects, maxHoursPerDay, maxHoursPerWeek, course] = row.values;
          
          if (name) {
            result.teachers.push({
              name: String(name).trim(),
              email: String(email || '').trim(),
              subjects: String(subjects || '').split(',').map(s => s.trim()).filter(s => s),
              maxHoursPerDay: parseInt(maxHoursPerDay) || 6,
              maxHoursPerWeek: parseInt(maxHoursPerWeek) || 24,
              course: String(course || '').trim()
            });
          }
        });
      } else {
        result.errors.push('Teachers sheet not found');
      }

      // Parse Classrooms
      const classroomsSheet = workbook.getWorksheet('Classrooms');
      if (classroomsSheet) {
        classroomsSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const [, name, capacity, isLab, building] = row.values;
          
          if (name) {
            result.classrooms.push({
              name: String(name).trim(),
              capacity: parseInt(capacity) || 30,
              isLab: String(isLab).toLowerCase() === 'yes',
              building: String(building || '').trim()
            });
          }
        });
      } else {
        result.errors.push('Classrooms sheet not found');
      }

      // Parse Time Slots
      const timeSlotsSheet = workbook.getWorksheet('TimeSlots');
      if (timeSlotsSheet) {
        const daysSet = new Set();
        timeSlotsSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const [, days, periodNumber, startTime, endTime, isBreak] = row.values;
          
          if (days && periodNumber) {
            // Add days to set
            String(days).split(',').forEach(day => daysSet.add(day.trim()));
            
            result.timeSlots.periods.push({
              periodNumber: parseInt(periodNumber),
              startTime: String(startTime).trim(),
              endTime: String(endTime).trim(),
              isBreak: String(isBreak).toLowerCase() === 'yes'
            });
          }
        });
        result.timeSlots.days = Array.from(daysSet);
      } else {
        result.errors.push('TimeSlots sheet not found');
      }

      // Parse Assignments
      const assignmentsSheet = workbook.getWorksheet('Assignments');
      if (assignmentsSheet) {
        assignmentsSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const [, className, section, subjectName, teacherName] = row.values;
          
          if (className && section && subjectName && teacherName) {
            result.assignments.push({
              className: String(className).trim(),
              section: String(section).trim(),
              subjectName: String(subjectName).trim(),
              teacherName: String(teacherName).trim()
            });
          }
        });
      } else {
        result.errors.push('Assignments sheet not found');
      }

      // Validation
      this.validateData(result);

    } catch (error) {
      result.errors.push(`Parsing error: ${error.message}`);
    }

    return result;
  }

  // Validate parsed data
  validateData(data) {
    // Check for empty data
    if (data.classes.length === 0) data.errors.push('No classes found');
    if (data.subjects.length === 0) data.errors.push('No subjects found');
    if (data.teachers.length === 0) data.errors.push('No teachers found');
    if (data.classrooms.length === 0) data.errors.push('No classrooms found');
    if (data.timeSlots.periods.length === 0) data.errors.push('No time slots found');
    if (data.assignments.length === 0) data.errors.push('No assignments found');

    // Validate assignments reference existing data
    data.assignments.forEach((assignment, index) => {
      const classExists = data.classes.some(c => 
        c.name === assignment.className && c.section === assignment.section
      );
      if (!classExists) {
        data.errors.push(`Assignment ${index + 1}: Class "${assignment.className} ${assignment.section}" not found`);
      }

      const subjectExists = data.subjects.some(s => s.name === assignment.subjectName);
      if (!subjectExists) {
        data.errors.push(`Assignment ${index + 1}: Subject "${assignment.subjectName}" not found`);
      }

      const teacherExists = data.teachers.some(t => t.name === assignment.teacherName);
      if (!teacherExists) {
        data.errors.push(`Assignment ${index + 1}: Teacher "${assignment.teacherName}" not found`);
      }
    });

    // Check for lab subjects and lab classrooms
    const labSubjects = data.subjects.filter(s => s.isLab);
    const labClassrooms = data.classrooms.filter(c => c.isLab);
    
    if (labSubjects.length > 0 && labClassrooms.length === 0) {
      data.warnings.push('Lab subjects found but no lab classrooms available');
    }

    // Check teacher subject assignments
    data.teachers.forEach(teacher => {
      teacher.subjects.forEach(subjectName => {
        const subjectExists = data.subjects.some(s => s.name === subjectName);
        if (!subjectExists) {
          data.warnings.push(`Teacher "${teacher.name}" assigned to non-existent subject "${subjectName}"`);
        }
      });
    });
  }
}

module.exports = ExcelService;