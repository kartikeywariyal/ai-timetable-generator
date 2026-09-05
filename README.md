# ChronoGen — AI-Powered Timetable Generator

A full-stack web application that uses a **Genetic Algorithm** to generate optimized, conflict-free school/college timetables with advanced semester planning and holiday management.

## Problem Statement
Traditional timetable scheduling in educational institutions is a complex, time-consuming, and error-prone manual process. It involves balancing numerous constraints, such as teacher availability, classroom capacity, subject hours, and preventing overlaps (clashes). As the number of classes and teachers grows, the possible combinations become astronomical, making it nearly impossible for a human to find an optimal, conflict-free solution.

## Future Aspects

### Immediate Roadmap
- **Advanced Substitution Management**: Enhanced substitute teacher assignment with preference matching
- **Mobile Application**: React Native app for teachers and students
- **Real-time Notifications**: WebSocket-based live updates for schedule changes
- **Advanced Analytics**: Comprehensive reporting and insights dashboard

### Long-term Vision
- **AI-Powered Optimization**: Machine learning integration for predictive scheduling
- **Multi-Institution Support**: Centralized management for multiple campuses
- **Integration APIs**: Connect with existing ERP and LMS systems
- **Blockchain Verification**: Immutable record keeping for academic schedules

## Solution
**ChronoGen** solves this by leveraging an **AI-driven Genetic Algorithm (GA)**. By mimicking the process of natural selection, the system explores thousands of potential schedules, iteratively improving them through selection, crossover, and mutation. This automated approach ensures:
- **Zero Conflicts**: No double-booking of teachers, rooms, or classes.
- **Efficiency**: Generates complex schedules in seconds rather than days.
- **Constraint Satisfaction**: Respects teacher-specific preferences and workload limits.
- **Flexibility**: Easily adapts to last-minute changes in staff or infrastructure.

## Reliability & Scalability
- **Reliability**: The system uses a robust fitness-based evaluation to guarantee the validity of the generated timetable. Built on the **MERN stack**, it ensures consistent data persistence and atomic operations via MongoDB, preventing data loss during complex generation cycles.
- **Scalability**: The architecture is designed for growth. The **MongoDB** backend scales horizontally to handle increasing data volumes, while the **Express** API can be load-balanced to support multiple concurrent generation requests. The modular **Genetic Algorithm** engine is decoupled from the UI, allowing it to be scaled independently or even offloaded to worker threads for massive datasets.

## Tech Stack
- **Framework**: Express.js (Backend), React.js (Frontend)
- **Database**: MongoDB (Mongoose ODM)
- **Backend**: Node.js
- **Frontend**: React (Create React App)
- **Algorithm**: Genetic Algorithm (selection, crossover, mutation)
- **Export**: PDF (jsPDF) + Excel (SheetJS)

## Project Structure
```
chrono/
├── backend/
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express API routes
│   ├── middleware/       # JWT auth
│   ├── utils/
│   │   └── geneticAlgorithm.js   # GA engine
│   └── server.js
├── frontend/
│   └── src/
│       ├── pages/       # Dashboard, Teachers, Subjects, Classes, Classrooms, Timeslots, Generate, TimetableView, TeacherDashboard
│       ├── components/  # Layout, Sidebar
│       ├── context/     # AuthContext
│       └── api/         # Axios instance
└── start.bat
```

## Prerequisites
- Node.js >= 18
- MongoDB running locally on port 27017

## Setup & Run

### 1. Start MongoDB
Make sure MongoDB is running locally.

### 2. Backend
```bash
cd backend
npm install
npm run dev
```
Runs on http://localhost:5000

### 3. Frontend
```bash
cd frontend
npm install
npm start
```
Runs on http://localhost:3000

### Or use the batch script (Windows):
```
start.bat
```

## Usage Flow

### Admin Workflow
1. **Register/Login** as admin
2. Add **Subjects** by course (BTech, BCS, MCA, etc.)
3. Add **Teachers** with course assignments and availability
4. Add **Classrooms** with capacity and lab specifications
5. Add **Classes** with subject-teacher assignments
6. Configure **Time Slots** with validation (max 2-hour duration, no overlaps)
7. **Generate Timetables** → automated optimization with hybrid GA approach
8. **Edit Timetables** using drag-drop with intelligent conflict detection and alternative suggestions
9. **Manage Semester Planning** with holiday calendars and weekly timetable generation
10. **Handle Substitutes** and teacher unavailabilities with auto-assignment
11. **Generate Exam Schedules** with conflict resolution
12. **Export** timetables as PDF or Excel with detailed formatting

### Teacher Workflow
1. **Login** as teacher
2. View **Personal Timetable** and workload
3. **Request Substitutes** for unavailable periods
4. **Manage Availability** and leave requests
5. **View Substitute Assignments** and swap requests

### Student Workflow
1. **Login** as student
2. **Create Personal Schedules** for study planning
3. **View Class Timetables** and exam schedules
4. **Export Personal Schedules** as PDF


## Database Schema
The system uses **MongoDB** with **Mongoose** models. Below is the relational structure:

### 1. User
- `name` (String, Required)
- `email` (String, Unique, Required)
- `password` (String, Required)
- `role` (Enum: ['admin', 'viewer'])

### 2. Subject
- `name` (String, Required)
- `code` (String)
- `hoursPerWeek` (Number, Default: 3)
- `isLab` (Boolean)
- `createdBy` (Ref: User)

### 3. Teacher
- `name` (String, Required)
- `email` (String)
- `subjects` (Array of Ref: Subject)
- `availability` (Array of {day, periods[]})
- `maxHoursPerDay` (Number)
- `maxHoursPerWeek` (Number)
- `createdBy` (Ref: User)

### 4. Classroom
- `name` (String, Required)
- `capacity` (Number)
- `isLab` (Boolean)
- `building` (String)
- `createdBy` (Ref: User)

### 5. Class
- `name` (String, Required)
- `section` (String)
- `strength` (Number)
- `subjects` (Array of {subject, teacher})
- `createdBy` (Ref: User)

### 6. Timeslot
- `days` (Array of String)
- `periods` (Array of {periodNumber, startTime, endTime, isBreak})
- `createdBy` (Ref: User)

### 8. Schedule
- `name` (String, Required)
- `type` (Enum: ['personal', 'exam'])
- `entries` (Array of {day, period, subject, description, location})
- `createdBy` (Ref: User)
- `targetClass` (Ref: Class) // For exam schedules

### 9. Substitute
- `originalTeacher` (Ref: Teacher, Required)
- `substituteTeacher` (Ref: Teacher, Required)
- `date` (Date, Required)
- `period` (Number, Required)
- `class` (Ref: Class, Required)
- `subject` (Ref: Subject, Required)
- `reason` (String)
- `status` (Enum: ['pending', 'approved', 'rejected'])
- `type` (Enum: ['admin_assigned', 'teacher_swap'])
- `createdBy` (Ref: User)

### 10. TeacherUnavailability
- `teacher` (Ref: Teacher, Required)
- `startDate` (Date, Required)
- `endDate` (Date, Required)
- `reason` (Enum: ['leave', 'exam_duty', 'event', 'meeting', 'training'])
- `description` (String)
- `status` (Enum: ['pending', 'approved', 'rejected'])
- `affectedPeriods` (Array of {date, period, class, subject})
- `substituteAssignments` (Array of Ref: Substitute)
- `createdBy` (Ref: User)

## Key Features
- **Smart Generation**: Automated scheduling using hybrid Genetic Algorithm with intelligent fallback.
- **Conflict Management**: Ensures no teacher, class, or room is double-booked with real-time validation.
- **Advanced Conflict Resolution**: Interactive conflict notifications with alternative slot suggestions and one-click resolution.
- **Time Slot Validation**: Prevents creation of time slots longer than 2 hours with overlap detection.
- **Workload Balancing**: Respects teacher availability and maximum working hours.
- **Interactive UI**: Responsive dashboard for data entry and timetable visualization.
- **Role-Based Access**: Support for Admin, Teacher, and Student roles with different interfaces.
- **Course Organization**: Teachers and subjects grouped by courses (BTech, BCS, MCA, MBA, MSc).
- **Drag-Drop Editing**: Manual timetable editing with real-time conflict detection and smart suggestions.
- **Semester Planning**: Comprehensive semester management with holiday tracking and compensation.
- **Weekly Timetables**: Detailed weekly view with drag-drop editing and conflict resolution.
- **Personal Scheduling**: Students can create and manage personal schedules.
- **Exam Scheduling**: Automated exam timetable generation with conflict detection.
- **Substitute Management**: Comprehensive substitute teacher system with auto-assignment and swap functionality.
- **Unavailability Tracking**: Teacher leave management with automatic substitute assignment.
- **Bulk Operations**: Bulk selection and deletion across Teachers, Subjects, and Classrooms.
- **Advanced Filtering**: View timetables by Class, Teacher, or Subject with real-time updates.
- **Multi-Format Export**: One-click download as PDF or Excel files with detailed formatting.
- **Teacher Insights**: Dedicated dashboard for teacher workload analysis and distribution.
- **Holiday Management**: Interactive calendar for bulk holiday addition with impact analysis.

## System Design

### Architecture Overview
**ChronoGen** follows a modern **3-tier architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   React.js      │  │   Components    │  │   Pages     │ │
│  │   Frontend      │  │   - Sidebar     │  │   - Dashboard│ │
│  │                 │  │   - Layout      │  │   - Generate │ │
│  │                 │  │   - Conflict    │  │   - Timetable│ │
│  │                 │  │     Notification│  │   - Teachers │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                               HTTP/REST API
                                │
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Express.js    │  │   Routes        │  │   Utils     │ │
│  │   Backend       │  │   - Auth        │  │   - GA      │ │
│  │                 │  │   - Timetable   │  │   - Semester│ │
│  │                 │  │   - Teachers    │  │     Generator│ │
│  │                 │  │   - Substitutes │  │   - Export  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                            Mongoose ODM
                                │
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   MongoDB       │  │   Collections   │  │   Indexes   │ │
│  │   Database      │  │   - Users       │  │   - Compound│ │
│  │                 │  │   - Timetables  │  │   - Text    │ │
│  │                 │  │   - Teachers    │  │   - Geo     │ │
│  │                 │  │   - Substitutes │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. **Genetic Algorithm Engine**
```javascript
// Hybrid Multi-Strategy Approach
class GeneticAlgorithm {
  strategies: [
    PrimaryGA(populationSize: 100, generations: 200),
    SecondaryGA(populationSize: 75, generations: 150),
    QuickGA(populationSize: 50, generations: 100),
    IntelligentFallback(priority-based scheduling)
  ]
  
  fitness_evaluation: {
    teacher_conflicts: -0.4,
    classroom_conflicts: -0.3,
    class_conflicts: -0.3,
    availability_violations: -0.2,
    workload_balance: +0.1
  }
}
```

#### 2. **Conflict Resolution System**
```javascript
// Real-time Conflict Detection
conflictDetector: {
  checkTeacherConflicts(entry, targetSlot),
  checkClassroomConflicts(entry, targetSlot),
  checkClassConflicts(entry, targetSlot),
  findAlternativeSlots(entry, allEntries),
  suggestOptimalMoves(conflicts)
}

// Interactive Resolution
conflictNotification: {
  displayConflicts(conflicts),
  showAlternatives(availableSlots),
  provideSolutions(conflictType),
  enableOneClickResolution()
}
```

#### 3. **Semester Planning Engine**
```javascript
// Week-by-Week Generation
semesterPlanner: {
  generateWeekRanges(startDate, endDate),
  detectHolidays(week),
  compensateClasses(missedClasses),
  scheduleSaturdayMakeup(conflicts),
  trackSyllabusProgress(subjects)
}
```

### Data Flow Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │───▶│  Frontend   │───▶│   Backend   │───▶│  Database   │
│  Actions    │    │  React.js   │    │ Express.js  │    │  MongoDB    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Drag & Drop │    │ State Mgmt  │    │ GA Engine   │    │ Collections │
│ Validation  │    │ Conflict    │    │ Validation  │    │ Indexing    │
│ Export      │    │ Detection   │    │ Export      │    │ Aggregation │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   JWT Auth  │  │ Role-Based  │  │ Input       │        │
│  │   Tokens    │  │ Access      │  │ Validation  │        │
│  │             │  │ Control     │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Password    │  │ CORS        │  │ Rate        │        │
│  │ Hashing     │  │ Protection  │  │ Limiting    │        │
│  │ (bcrypt)    │  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Performance Optimization

#### 1. **Database Optimization**
```javascript
// Compound Indexes
indexes: {
  timetable_entries: { day: 1, period: 1, teacher: 1 },
  teacher_availability: { teacher: 1, day: 1 },
  class_schedule: { class: 1, day: 1, period: 1 }
}

// Aggregation Pipelines
aggregations: {
  teacher_workload: pipeline([match, group, sort]),
  conflict_detection: pipeline([lookup, unwind, match]),
  semester_progress: pipeline([group, project, sort])
}
```

#### 2. **Frontend Optimization**
```javascript
// State Management
optimizations: {
  lazy_loading: "React.lazy() for route components",
  memoization: "React.memo() for expensive renders",
  virtual_scrolling: "Large dataset handling",
  debounced_search: "Real-time filtering"
}

// Caching Strategy
caching: {
  api_responses: "React Query for server state",
  computed_values: "useMemo for calculations",
  static_assets: "Service Worker caching"
}
```

### Scalability Design

#### 1. **Horizontal Scaling**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Load        │    │ App Server  │    │ App Server  │
│ Balancer    │───▶│ Instance 1  │    │ Instance 2  │
│ (Nginx)     │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   └─────────┬─────────┘
       │                             │
       ▼                             ▼
┌─────────────┐              ┌─────────────┐
│ MongoDB     │              │ Redis       │
│ Replica Set │              │ Cache       │
│             │              │             │
└─────────────┘              └─────────────┘
```

#### 2. **Microservices Architecture (Future)**
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Auth      │  │ Timetable   │  │ Notification│  │   Export    │
│  Service    │  │  Service    │  │   Service   │  │  Service    │
│             │  │             │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
       │                │                │                │
       └────────────────┼────────────────┼────────────────┘
                        │                │
                ┌─────────────┐  ┌─────────────┐
                │   Message   │  │   API       │
                │   Queue     │  │  Gateway    │
                │  (RabbitMQ) │  │  (Kong)     │
                └─────────────┘  └─────────────┘
```

### Algorithm Complexity Analysis

#### 1. **Genetic Algorithm**
```
Time Complexity:
- Population Generation: O(P × L) where P = population size, L = lessons
- Fitness Evaluation: O(P × L × C) where C = constraints
- Selection: O(P × log P)
- Crossover & Mutation: O(P × L)
- Overall per generation: O(P × L × C)
- Total: O(G × P × L × C) where G = generations

Space Complexity: O(P × L) for population storage

Optimization Strategies:
- Early termination on fitness threshold
- Elitism to preserve best solutions
- Adaptive mutation rates
- Parallel fitness evaluation
```

#### 2. **Conflict Detection**
```
Time Complexity:
- Teacher conflicts: O(L) where L = total lessons
- Classroom conflicts: O(L)
- Class conflicts: O(L)
- Alternative slot finding: O(D × P × L) where D = days, P = periods

Optimization:
- Hash maps for O(1) lookups
- Indexed database queries
- Memoization of conflict checks
```

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                   │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   CDN       │  │ Load        │  │ SSL         │        │
│  │ (Cloudflare)│  │ Balancer    │  │ Certificate │        │
│  │             │  │ (Nginx)     │  │ (Let's      │        │
│  └─────────────┘  └─────────────┘  │ Encrypt)    │        │
│                                     └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Frontend    │  │ Backend     │  │ Database    │        │
│  │ (Vercel/    │  │ (Railway/   │  │ (MongoDB    │        │
│  │ Netlify)    │  │ Heroku)     │  │ Atlas)      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Monitoring  │  │ Logging     │  │ Backup      │        │
│  │ (DataDog)   │  │ (Winston)   │  │ (Automated) │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Error Handling & Recovery

```javascript
// Graceful Error Handling
errorHandling: {
  frontend: {
    errorBoundaries: "React Error Boundaries",
    fallbackUI: "User-friendly error messages",
    retryMechanism: "Automatic retry for failed requests"
  },
  
  backend: {
    globalErrorHandler: "Express error middleware",
    validationErrors: "Joi schema validation",
    databaseErrors: "Mongoose error handling"
  },
  
  algorithm: {
    fallbackStrategies: "Multiple GA approaches",
    constraintRelaxation: "Gradual constraint loosening",
    manualOverride: "Admin intervention capability"
  }
}
```

### Future Enhancements

1. **AI/ML Integration**
   - Machine Learning for pattern recognition
   - Predictive analytics for optimal scheduling
   - Natural Language Processing for requirement parsing

2. **Real-time Collaboration**
   - WebSocket integration for live updates
   - Multi-user editing capabilities
   - Real-time conflict resolution

3. **Mobile Application**
   - React Native mobile app
   - Offline capability with sync
   - Push notifications for schedule changes

4. **Advanced Analytics**
   - Resource utilization reports
   - Teacher workload analytics
   - Student performance correlation

## Genetic Algorithm Details
- **Selection**: Tournament selection (k=3) picks the best candidates for reproduction.
- **Crossover**: Single-point crossover combines parents to create offspring.
- **Mutation**: Randomly reassigns day, period, or classroom to maintain diversity.
- **Fitness Evaluation**:
  The algorithm calculates a fitness score between `0` and `1`. A score of `1.0` represents a perfect, conflict-free timetable.
  Conflicts that reduce the fitness score include:
  - **Teacher Clash**: A teacher assigned to multiple classes at the same time.
  - **Class Clash**: A class assigned to multiple subjects/teachers at the same time.
  - **Room Clash**: A classroom occupied by multiple classes at the same time.
  - **Daily Overload**: A teacher exceeding their configured `maxHoursPerDay`.
  - **Availability**: Scheduling a teacher during their specified unavailable slots.
- **Elitism**: The best chromosome from each generation is automatically carried over to the next.

## Team Roles & Project Division (Team of 4)
To efficiently develop and maintain **ChronoGen**, tasks are divided into four specific roles:

### **1. Frontend Developer — Siddharth Agarwal**
- **Focus**: User interface, client-side state, and responsive design.
- **Key Files**: [App.js](file:///c%3A/Users/Lenovo/OneDrive/Desktop/chrono/frontend/src/App.js), [Dashboard.js](file:///c%3A/Users/Lenovo/OneDrive/Desktop/chrono/frontend/src/pages/Dashboard.js), [TimetableView.js](file:///c%3A/Users/Lenovo/OneDrive/Desktop/chrono/frontend/src/pages/TimetableView.js).
- **Responsibilities**:
    - Build interactive UI components and dashboard pages.
    - Implement the Timetable Grid and visualization filters.
    - Handle frontend state management and API data fetching.
    - Ensure a smooth and modern user experience.

### **2. Backend Developer — Vijay Singh Bisht**
- **Focus**: Server architecture, API routing, and system security.
- **Key Files**: [server.js](file:///c%3A/Users/Lenovo/OneDrive/Desktop/chrono/backend/server.js), [auth.js](file:///c%3A/Users/Lenovo/OneDrive/Desktop/chrono/backend/routes/auth.js), [export.js](file:///c%3A/Users/Lenovo/OneDrive/Desktop/chrono/backend/routes/export.js).
- **Responsibilities**:
    - Build and maintain REST API endpoints.
    - Implement authentication and middleware logic.
    - Handle PDF and Excel file generation for export.
    - Manage project environment and dependencies.

### **3. Database Developer — Divyansh Rautela**
- **Focus**: Data modeling, persistence, and relational integrity.
- **Key Files**: [models/](file:///c%3A/Users/Lenovo/OneDrive/Desktop/chrono/backend/models/), [User.js](file:///c%3A/Users/Lenovo/OneDrive/Desktop/chrono/backend/models/User.js), [Timetable.js](file:///c%3A/Users/Lenovo/OneDrive/Desktop/chrono/backend/models/Timetable.js).
- **Responsibilities**:
    - Design and manage Mongoose schemas and MongoDB collections.
    - Ensure data integrity between classes, teachers, and subjects.
    - Optimize database queries for fetching constraints and results.
    - Maintain the Database Schema documentation.

### **4. Algorithm (Algo) Specialist — Garhvit Singh Negi**
- **Focus**: Core logic of the Genetic Algorithm and scheduling optimization.
- **Key Files**: [geneticAlgorithm.js](file:///c%3A/Users/Lenovo/OneDrive/Desktop/chrono/backend/utils/geneticAlgorithm.js), [timetable.js](file:///c%3A/Users/Lenovo/OneDrive/Desktop/chrono/backend/routes/timetable.js).
- **Responsibilities**:
    - Refine the Genetic Algorithm (Fitness, Crossover, Mutation).
    - Implement conflict resolution logic for teachers and classrooms.
    - Handle complex scheduling constraints and workload balancing.
    - Tune GA parameters to ensure optimal and valid results.

*Each team member will be contributing to the project and in the GitHub repository based on their respective roles.*

## API Endpoints
 __________________________________________________________________________________________
|                     |                                      |                            |
|  Method             | Endpoint                             | Description                |
|---------------------|--------------------------------------|----------------------------|
| POST                | /api/auth/register                   | Register admin             |
| POST                | /api/auth/login                      | Login                      |
| GET/POST/PUT/DELETE | /api/teachers                        | CRUD teachers              |
| GET/POST/PUT/DELETE | /api/subjects                        | CRUD subjects              |
| GET/POST/PUT/DELETE | /api/classes                         | CRUD classes               |
| GET/POST/PUT/DELETE | /api/classrooms                      | CRUD classrooms            |
| GET/POST/PUT/DELETE | /api/timeslots                       | CRUD timeslot config       |
| POST                | /api/timetable/generate              | Run hybrid GA & generate   |
| GET                 | /api/timetable                       | List all timetables        |
| GET                 | /api/timetable/:id                   | Get timetable              |
| PUT                 | /api/timetable/:id/entries           | Update timetable entries   |
| PUT                 | /api/timetable/:id/name              | Update timetable name      |
| GET                 | /api/timetable/:id/teacher-dashboard | Teacher workload analysis  |
| GET/POST/PUT/DELETE | /api/semesters                       | CRUD semester planning     |
| POST                | /api/semesters/:id/holidays          | Add holidays to semester   |
| POST                | /api/semesters/:id/generate-timetable| Generate semester timetable|
| GET                 | /api/semesters/:id/weekly-timetables | Get weekly timetables      |
| GET/POST/PUT/DELETE | /api/schedules                       | CRUD personal/exam schedules|
| GET/POST/PUT/DELETE | /api/substitutes                     | CRUD substitute assignments|
| GET                 | /api/substitutes/timetable/:id       | Get timetable with subs    |
| POST                | /api/substitutes/auto-assign         | Auto-assign substitutes    |
| GET/POST/PUT/DELETE | /api/unavailability                  | CRUD teacher unavailability|
| POST                | /api/unavailability/conflicts        | Check unavailability conflicts|
| GET                 | /api/export/:id/pdf                  | Export PDF                 |
| GET                 | /api/export/:id/excel                | Export Excel               |
|_____________________|______________________________________|____________________________|

























