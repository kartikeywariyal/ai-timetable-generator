import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, Upload, FileSpreadsheet, Wand2, FileText, Users, MapPin, Clock, Loader, Eye, AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ExcelImport() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const sheets = {
      Classes: [
        ['Class Name','Section','Strength','Course'],
        ['BTech CSE','A',60,'BTech'],
        ['BTech CSE','B',58,'BTech'],
        ['BTech IT','A',55,'BTech'],
        ['BTech ECE','A',52,'BTech'],
        ['BCS','A',45,'BCS'],
        ['BCS','B',42,'BCS'],
        ['MCA','A',40,'MCA'],
        ['MBA','A',50,'MBA'],
        ['MSc CS','A',35,'MSc'],
      ],
      Subjects: [
        ['Subject Name','Subject Code','Hours Per Week','Is Lab','Course'],
        ['Data Structures','CS201',4,'No','BTech'],
        ['Data Structures Lab','CS201L',2,'Yes','BTech'],
        ['Database Management Systems','CS301',3,'No','BTech'],
        ['Database Lab','CS301L',2,'Yes','BTech'],
        ['Computer Networks','CS401',3,'No','BTech'],
        ['Network Lab','CS401L',2,'Yes','BTech'],
        ['Software Engineering','CS501',3,'No','BTech'],
        ['Web Development','CS601',3,'No','BTech'],
        ['Web Development Lab','CS601L',2,'Yes','BTech'],
        ['Machine Learning','CS701',4,'No','BTech'],
        ['Artificial Intelligence','CS801',3,'No','BTech'],
        ['Operating Systems','CS302',3,'No','BTech'],
        ['OS Lab','CS302L',2,'Yes','BTech'],
        ['Compiler Design','CS502',3,'No','BTech'],
        ['Mobile App Development','CS602',3,'No','BTech'],
        ['Mobile Lab','CS602L',2,'Yes','BTech'],
        ['Cybersecurity','CS702',3,'No','BTech'],
        ['Cloud Computing','CS802',3,'No','BTech'],
        ['Microprocessors','EC301',3,'No','BTech'],
        ['Microprocessors Lab','EC301L',2,'Yes','BTech'],
        ['Programming Fundamentals','BCS101',4,'No','BCS'],
        ['Programming Lab','BCS101L',2,'Yes','BCS'],
        ['Mathematics','BCS201',3,'No','BCS'],
        ['Statistics','BCS301',3,'No','BCS'],
        ['Discrete Mathematics','BCS302',3,'No','BCS'],
        ['Advanced Java','MCA201',4,'No','MCA'],
        ['Java Lab','MCA201L',2,'Yes','MCA'],
        ['System Analysis','MCA301',3,'No','MCA'],
        ['Project Management','MCA401',3,'No','MCA'],
        ['Data Mining','MCA501',3,'No','MCA'],
        ['Marketing Management','MBA101',3,'No','MBA'],
        ['Financial Management','MBA201',3,'No','MBA'],
        ['Human Resource Management','MBA301',3,'No','MBA'],
        ['Operations Management','MBA401',3,'No','MBA'],
        ['Strategic Management','MBA501',3,'No','MBA'],
        ['Advanced Algorithms','MSC201',4,'No','MSc'],
        ['Research Methodology','MSC301',3,'No','MSc'],
        ['Thesis Work','MSC401',2,'No','MSc'],
      ],
      Teachers: [
        ['Teacher Name','Email','Subjects','Max Hours Per Day','Max Hours Per Week'],
        ['Dr. John Smith','john.smith@college.edu','Data Structures,Data Structures Lab,Advanced Algorithms',6,30],
        ['Prof. Jane Doe','jane.doe@college.edu','Database Management Systems,Database Lab,System Analysis',5,25],
        ['Dr. Alice Brown','alice.brown@college.edu','Computer Networks,Network Lab,Cybersecurity',6,30],
        ['Prof. Bob Wilson','bob.wilson@college.edu','Software Engineering,Project Management,Strategic Management',5,25],
        ['Dr. Carol Davis','carol.davis@college.edu','Web Development,Web Development Lab,Mobile App Development,Mobile Lab',6,30],
        ['Prof. David Miller','david.miller@college.edu','Machine Learning,Artificial Intelligence,Cloud Computing,Data Mining',6,30],
        ['Dr. Emma Taylor','emma.taylor@college.edu','Operating Systems,OS Lab,Compiler Design',5,25],
        ['Prof. Frank Johnson','frank.johnson@college.edu','Programming Fundamentals,Programming Lab,Advanced Java,Java Lab',6,30],
        ['Dr. Grace Lee','grace.lee@college.edu','Mathematics,Statistics,Discrete Mathematics,Research Methodology',5,25],
        ['Prof. Henry Clark','henry.clark@college.edu','Marketing Management,Human Resource Management',4,20],
        ['Dr. Ivy Martinez','ivy.martinez@college.edu','Financial Management,Operations Management',4,20],
        ['Prof. Jack Anderson','jack.anderson@college.edu','Thesis Work,Research Methodology',3,15],
        ['Dr. Sarah Wilson','sarah.wilson@college.edu','Microprocessors,Microprocessors Lab',5,25],
      ],
      Classrooms: [
        ['Room Name','Capacity','Is Lab','Building'],
        ['Room 101',60,'No','Main Block'],
        ['Room 102',55,'No','Main Block'],
        ['Room 103',50,'No','Main Block'],
        ['Room 201',65,'No','Main Block'],
        ['Room 202',60,'No','Main Block'],
        ['Room 203',55,'No','Main Block'],
        ['Room 301',45,'No','Main Block'],
        ['Lab 301',30,'Yes','CS Block'],
        ['Lab 302',25,'Yes','CS Block'],
        ['Lab 303',35,'Yes','CS Block'],
        ['Lab 401',30,'Yes','CS Block'],
        ['Lab 402',25,'Yes','CS Block'],
        ['Lab 501',20,'Yes','EC Block'],
        ['Seminar Hall',100,'No','Main Block'],
        ['Conference Room',20,'No','Admin Block'],
      ],
      TimeSlots: [
        ['Days','Period Number','Start Time','End Time','Is Break'],
        ['Monday,Tuesday,Wednesday,Thursday,Friday',1,'09:00','10:00','No'],
        ['Monday,Tuesday,Wednesday,Thursday,Friday',2,'10:00','11:00','No'],
        ['Monday,Tuesday,Wednesday,Thursday,Friday',3,'11:00','11:15','Yes'],
        ['Monday,Tuesday,Wednesday,Thursday,Friday',4,'11:15','12:15','No'],
        ['Monday,Tuesday,Wednesday,Thursday,Friday',5,'12:15','13:15','No'],
        ['Monday,Tuesday,Wednesday,Thursday,Friday',6,'13:15','14:00','Yes'],
        ['Monday,Tuesday,Wednesday,Thursday,Friday',7,'14:00','15:00','No'],
        ['Monday,Tuesday,Wednesday,Thursday,Friday',8,'15:00','16:00','No'],
        ['Saturday',1,'09:00','10:00','No'],
        ['Saturday',2,'10:00','11:00','No'],
        ['Saturday',3,'11:00','11:15','Yes'],
        ['Saturday',4,'11:15','12:15','No'],
      ],
      Assignments: [
        ['Class Name','Section','Subject Name','Teacher Name'],
        ['BTech CSE','A','Data Structures','Dr. John Smith'],
        ['BTech CSE','A','Data Structures Lab','Dr. John Smith'],
        ['BTech CSE','A','Database Management Systems','Prof. Jane Doe'],
        ['BTech CSE','A','Database Lab','Prof. Jane Doe'],
        ['BTech CSE','A','Computer Networks','Dr. Alice Brown'],
        ['BTech CSE','A','Network Lab','Dr. Alice Brown'],
        ['BTech CSE','A','Software Engineering','Prof. Bob Wilson'],
        ['BTech CSE','A','Web Development','Dr. Carol Davis'],
        ['BTech CSE','A','Web Development Lab','Dr. Carol Davis'],
        ['BTech CSE','A','Machine Learning','Prof. David Miller'],
        ['BTech CSE','A','Operating Systems','Dr. Emma Taylor'],
        ['BTech CSE','A','OS Lab','Dr. Emma Taylor'],
        ['BTech CSE','B','Data Structures','Dr. John Smith'],
        ['BTech CSE','B','Data Structures Lab','Dr. John Smith'],
        ['BTech CSE','B','Database Management Systems','Prof. Jane Doe'],
        ['BTech CSE','B','Database Lab','Prof. Jane Doe'],
        ['BTech CSE','B','Computer Networks','Dr. Alice Brown'],
        ['BTech CSE','B','Software Engineering','Prof. Bob Wilson'],
        ['BTech CSE','B','Web Development','Dr. Carol Davis'],
        ['BTech IT','A','Data Structures','Dr. John Smith'],
        ['BTech IT','A','Database Management Systems','Prof. Jane Doe'],
        ['BTech IT','A','Computer Networks','Dr. Alice Brown'],
        ['BTech IT','A','Web Development','Dr. Carol Davis'],
        ['BTech IT','A','Machine Learning','Prof. David Miller'],
        ['BTech ECE','A','Microprocessors','Dr. Sarah Wilson'],
        ['BTech ECE','A','Microprocessors Lab','Dr. Sarah Wilson'],
        ['BTech ECE','A','Computer Networks','Dr. Alice Brown'],
        ['BCS','A','Programming Fundamentals','Prof. Frank Johnson'],
        ['BCS','A','Programming Lab','Prof. Frank Johnson'],
        ['BCS','A','Mathematics','Dr. Grace Lee'],
        ['BCS','A','Statistics','Dr. Grace Lee'],
        ['BCS','A','Discrete Mathematics','Dr. Grace Lee'],
        ['BCS','B','Programming Fundamentals','Prof. Frank Johnson'],
        ['BCS','B','Programming Lab','Prof. Frank Johnson'],
        ['BCS','B','Mathematics','Dr. Grace Lee'],
        ['MCA','A','Advanced Java','Prof. Frank Johnson'],
        ['MCA','A','Java Lab','Prof. Frank Johnson'],
        ['MCA','A','System Analysis','Prof. Jane Doe'],
        ['MCA','A','Project Management','Prof. Bob Wilson'],
        ['MCA','A','Data Mining','Prof. David Miller'],
        ['MBA','A','Marketing Management','Prof. Henry Clark'],
        ['MBA','A','Financial Management','Dr. Ivy Martinez'],
        ['MBA','A','Human Resource Management','Prof. Henry Clark'],
        ['MBA','A','Operations Management','Dr. Ivy Martinez'],
        ['MBA','A','Strategic Management','Prof. Bob Wilson'],
        ['MSc CS','A','Advanced Algorithms','Dr. John Smith'],
        ['MSc CS','A','Research Methodology','Prof. Jack Anderson'],
        ['MSc CS','A','Thesis Work','Prof. Jack Anderson'],
      ],
      Instructions: [
        ['Sheet','Column','Description','Required','Example'],
        ['Classes','Class Name','Full name of the class/program','Yes','BTech CSE'],
        ['Classes','Section','Section identifier','Yes','A'],
        ['Classes','Strength','Number of students','Yes','60'],
        ['Classes','Course','Program type','Yes','BTech / BCS / MCA / MBA / MSc'],
        ['Subjects','Subject Name','Full subject name','Yes','Data Structures'],
        ['Subjects','Subject Code','Unique subject code','Yes','CS201'],
        ['Subjects','Hours Per Week','Weekly teaching hours','Yes','3 or 4'],
        ['Subjects','Is Lab','Whether it is a lab subject','Yes','Yes or No'],
        ['Subjects','Course','Which program this subject belongs to','Yes','BTech'],
        ['Teachers','Teacher Name','Full name with title','Yes','Dr. John Smith'],
        ['Teachers','Email','Teacher email address','Yes','john@college.edu'],
        ['Teachers','Subjects','Comma-separated list of subjects they teach','Yes','Data Structures,Algorithms'],
        ['Teachers','Max Hours Per Day','Maximum teaching hours per day','Yes','6'],
        ['Teachers','Max Hours Per Week','Maximum teaching hours per week','Yes','30'],
        ['Classrooms','Room Name','Room identifier','Yes','Room 101'],
        ['Classrooms','Capacity','Maximum student capacity','Yes','60'],
        ['Classrooms','Is Lab','Whether it is a lab room','Yes','Yes or No'],
        ['Classrooms','Building','Building name','Yes','Main Block'],
        ['TimeSlots','Days','Comma-separated days this slot applies to','Yes','Monday,Tuesday,Wednesday,Thursday,Friday'],
        ['TimeSlots','Period Number','Sequential period number','Yes','1'],
        ['TimeSlots','Start Time','24-hour format start time','Yes','09:00'],
        ['TimeSlots','End Time','24-hour format end time','Yes','10:00'],
        ['TimeSlots','Is Break','Whether this is a break period','Yes','Yes or No'],
        ['Assignments','Class Name','Must match exactly with Classes sheet','Yes','BTech CSE'],
        ['Assignments','Section','Must match exactly with Classes sheet','Yes','A'],
        ['Assignments','Subject Name','Must match exactly with Subjects sheet','Yes','Data Structures'],
        ['Assignments','Teacher Name','Must match exactly with Teachers sheet','Yes','Dr. John Smith'],
        ['Notes','','Do NOT change column headers','',''],
        ['Notes','','Teacher names must match exactly across sheets','',''],
        ['Notes','','Subject names must match exactly across sheets','',''],
        ['Notes','','Lab subjects need lab classrooms (Is Lab = Yes)','',''],
        ['Notes','','Each class-subject pair should appear only once in Assignments','',''],
      ],
    };

    Object.entries(sheets).forEach(([name, data]) => {
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = data[0].map(() => ({ wch: 28 }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    });

    XLSX.writeFile(wb, 'ChronoGen_Template.xlsx');
    toast.success('Template downloaded!');
  };

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.csv')) {
      toast.error('Please select a .xlsx or .csv file');
      return;
    }
    setFile(f);
    setParsedData(null);
  };

  const uploadFile = async () => {
    if (!file) { toast.error('Please select a file first'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/excel/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setParsedData(response.data.data);
      toast.success('File parsed successfully!');
      if (response.data.data.errors.length > 0)
        toast.error(`Found ${response.data.data.errors.length} errors — fix before generating`);
    } catch (error) {
      toast.error('Upload failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };

  const generateTimetable = async () => {
    setGenerating(true);
    try {
      const response = await api.post('/excel/generate', { data: parsedData });
      toast.success('Timetable generated successfully!');
      navigate(`/timetable/${response.data.timetable._id}`);
    } catch (error) {
      toast.error('Generation failed: ' + (error.response?.data?.details || error.response?.data?.error || error.message));
      console.error('Generation error:', error.response?.data || error);
    } finally {
      setGenerating(false);
    }
  };

  const renderSummary = () => {
    if (!parsedData) return null;
    const items = [
      { label: 'Classes', count: parsedData.classes.length, icon: Users, color: 'blue' },
      { label: 'Subjects', count: parsedData.subjects.length, icon: FileText, color: 'green' },
      { label: 'Teachers', count: parsedData.teachers.length, icon: Users, color: 'orange' },
      { label: 'Classrooms', count: parsedData.classrooms.length, icon: MapPin, color: 'purple' },
      { label: 'Time Slots', count: parsedData.timeSlots.periods.length, icon: Clock, color: 'teal' },
      { label: 'Assignments', count: parsedData.assignments.length, icon: FileText, color: 'pink' },
    ];
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">Data Summary</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPreview(!showPreview)}>
            <Eye size={14} /> {showPreview ? 'Hide' : 'Show'} Details
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
          {items.map(({ label, count, icon: Icon, color }) => (
            <div key={label} className="stat-card">
              <div className={`stat-icon ${color}`}><Icon size={16} /></div>
              <div><div className="stat-value">{count}</div><div className="stat-label">{label}</div></div>
            </div>
          ))}
        </div>
        {showPreview && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 12 }}>
            {parsedData.classes.length > 0 && (
              <div>
                <strong>Classes:</strong>
                <ul style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  {parsedData.classes.slice(0, 4).map((c, i) => <li key={i}>{c.name} {c.section} ({c.strength} students)</li>)}
                  {parsedData.classes.length > 4 && <li>...and {parsedData.classes.length - 4} more</li>}
                </ul>
              </div>
            )}
            {parsedData.subjects.length > 0 && (
              <div>
                <strong>Subjects:</strong>
                <ul style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  {parsedData.subjects.slice(0, 4).map((s, i) => <li key={i}>{s.name} ({s.hoursPerWeek}h/week{s.isLab ? ', Lab' : ''})</li>)}
                  {parsedData.subjects.length > 4 && <li>...and {parsedData.subjects.length - 4} more</li>}
                </ul>
              </div>
            )}
            {parsedData.teachers.length > 0 && (
              <div>
                <strong>Teachers:</strong>
                <ul style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  {parsedData.teachers.slice(0, 4).map((t, i) => <li key={i}>{t.name} (max {t.maxHoursPerWeek}h/week)</li>)}
                  {parsedData.teachers.length > 4 && <li>...and {parsedData.teachers.length - 4} more</li>}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderValidation = () => {
    if (!parsedData || (!parsedData.errors.length && !parsedData.warnings.length)) return null;
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">Validation Results</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {parsedData.errors.length > 0 && <span className="badge badge-red">{parsedData.errors.length} Errors</span>}
            {parsedData.warnings.length > 0 && <span className="badge badge-yellow">{parsedData.warnings.length} Warnings</span>}
          </div>
        </div>
        {parsedData.errors.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <AlertTriangle size={16} style={{ color: '#dc2626' }} />
              <strong style={{ color: '#dc2626' }}>Errors (must be fixed):</strong>
            </div>
            <div style={{ background: '#fee2e2', borderRadius: 8, padding: 12 }}>
              {parsedData.errors.map((e, i) => <div key={i} style={{ fontSize: '0.85rem', color: '#7f1d1d', marginBottom: 4 }}>• {e}</div>)}
            </div>
          </div>
        )}
        {parsedData.warnings.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <AlertTriangle size={16} style={{ color: '#ea580c' }} />
              <strong style={{ color: '#ea580c' }}>Warnings:</strong>
            </div>
            <div style={{ background: '#fef3c7', borderRadius: 8, padding: 12 }}>
              {parsedData.warnings.map((w, i) => <div key={i} style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: 4 }}>• {w}</div>)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="topbar"><h2>Excel Import/Export</h2></div>
      <div style={{ marginTop: 24, maxWidth: 1000 }}>

        <div className="card">
          <div className="card-header"><span className="card-title">Step 1: Download Template</span></div>
          <div>
            <p style={{ color: '#64748b', marginBottom: 12 }}>
              Download the Excel template with 6 pre-filled sheets: Classes, Subjects, Teachers, Classrooms, TimeSlots, Assignments.
            </p>
            <button className="btn btn-primary" onClick={downloadTemplate}>
              <Download size={16} /> Download Excel Template (.xlsx)
            </button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header"><span className="card-title">Step 2: Upload Filled Template</span></div>
          <div>
            <div style={{ marginBottom: 16 }}>
              <input type="file" accept=".xlsx,.csv" onChange={handleFileSelect} style={{ marginBottom: 12 }} />
              {file && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: '#f0f9ff', borderRadius: 6, fontSize: '0.9rem' }}>
                  <FileSpreadsheet size={16} style={{ color: '#2563eb' }} />
                  <span>{file.name}</span>
                  <span style={{ color: '#64748b' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={uploadFile} disabled={!file || uploading}>
              {uploading ? <Loader size={16} className="spinner" /> : <Upload size={16} />}
              {uploading ? 'Parsing...' : 'Upload & Parse'}
            </button>
          </div>
        </div>

        {renderSummary()}
        {renderValidation()}

        {parsedData && parsedData.errors.length === 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><span className="card-title">Step 3: Generate Timetable</span></div>
            <div>
              <p style={{ color: '#64748b', marginBottom: 12 }}>
                Generate an optimized timetable using the Genetic Algorithm with the parsed data.
              </p>
              <button className="btn btn-success" onClick={generateTimetable} disabled={generating}>
                {generating ? <Loader size={16} className="spinner" /> : <Wand2 size={16} />}
                {generating ? 'Generating...' : 'Generate Timetable'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
