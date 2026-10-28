

# 🏫 Smart School Connect – Developer Handoff Document
Version: 1.0  

Target Audience: Development Team (Full-stack, Frontend, Backend, QA)  
Purpose: To provide a clear, role-based functional specification for system implementation.

---

## 1. System Overview
This system digitizes the administrative, academic, and communication workflows of a single Ethiopian high school. The architecture is role-based, with strict data visibility rules ensuring that users only access information pertinent to their position.

### 1.1 Core Hierarchy (Chain of Command)
1. Principal (Top Executive)
2. VP Academic & VP Admin (Executive Management)
3. Department Head (Middle Management)
4. Teacher (Execution)
5. Student & Parent (End-Users/Beneficiaries)
6. PTSA & SIC (Oversight/Advisory)

---

## 2. Role-Based Access Control (RBAC) Matrix
*Developers: This matrix outlines which actions each role can perform across the system.*

| Feature / Module | Principal | VP Acad | VP Admin | Dept Head | Teacher | Student | Parent | PTSA | SIC |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Register Senior Staff (VPs/Heads) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Register Teachers | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Register Students/Parents | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Register Non-Academic Staff/Assets | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Register TAs (within dept) | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View All Student Data | ✅ | ✅ | ❌ | ✅ (Dept) | ✅ (Class) | ❌ | ❌ | ❌ | ❌ |
| View Own Child's Data | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Modify Grades | ✅ (Appeals) | ✅ (Oversight) | ❌ | ❌ | ✅ (Class) | ❌ | ❌ | ❌ | ❌ |
| Mark Attendance | ❌ | ❌ | ❌ | ❌ | ✅ (Class) | ❌ | ❌ | ❌ | ❌ |
| Manage Timetable | ❌ | ✅ | ❌ | ✅ (Dept) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Assets/Facilities | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve Budget/Expenditure | ✅ (Final) | ❌ | ✅ (Request) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve Lesson Plans | ❌ | ✅ | ❌ | ✅ (Review) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Submit Grievance/Feedback | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| View Audit Logs | ✅ (Full) | ✅ (Acad) | ✅ (Admin) | ✅ (Dept) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Post School-Wide Announcements | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Post Dept/PTSA/SIC Announcements | ❌ | ❌ | ❌ | ✅ (Dept) | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 3. Detailed Role Functionalities
*Provide to the development team as a checklist for module implementation.*

### 3.1 Principal
*Role: Head of School / CEO.*
- User Management: Register VPs (Academic/Admin) and Department Heads only.
- Governance: Approve final budgets, major expenditures, and disciplinary appeals (suspension/expulsion).
- Academic Oversight: View school-wide academic performance, national exam results, and teacher performance summaries (aggregated).
- Strategic: Approve the School Improvement Plan (SIP) and submit compliance reports to the Woreda/District Office (Mock).
- Communication: Post school-wide announcements, communicate with VPs, and manage grievances escalated from PTSA/Teachers.
- Audit: Full access to system audit logs.
[7/16/2026 4:36 PM] 1sew: ### 3.2 VP Academic
*Role: Chief Academic Officer.*
- Curriculum & Timetable: Set up the academic calendar, master timetable, and assign teachers to specific classes/subjects.
- Teacher Management: Register new teachers, assign them to departments, and manage teacher workload.
- Student Management: Register students (bulk upload), assign classes, promote students to next grade, and manage transfers.
- Academic Oversight: Approve lesson plans, manage examination schedules, and monitor grade submissions.
- Reporting: Generate school-wide academic reports (progress reports, transcripts, exam analysis).
- Communication: Send academic announcements to teachers, students, and parents.

### 3.3 VP Admin
*Role: Chief Operating Officer (Finance & Infrastructure).*
- Asset Management: Register, assign, track, and dispose of school assets (laptops, furniture, lab equipment). Generate QR code labels (Mock).
- Facility Management: Manage facility bookings, schedule maintenance, and track utilization (heatmaps).
- Financial Oversight: Manage mock budget entries, track expenditures, process purchase requests, and manage inventory (consumables).
- Staff Management: Register non-academic staff (cleaners, guards, lab techs) and manage their attendance/leave.
- Discipline: Log administrative incidents and manage visitor/security logs.
- Reporting: Generate financial summaries, asset inventories, and procurement reports.

### 3.4 Department Head
*Role: Subject/Department Manager (e.g., Head of Math).*
- Teacher Oversight: Manage teachers within the specific department. Assign courses to teachers.
- TA Registration: Register Teaching Assistants (TAs) strictly within their own department.
- Academic Quality: Review and approve/reject lesson plans submitted by teachers in the department.
- Resource Management: Manage department-specific subject resources and request new ones from VP Admin.
- Performance: View department performance metrics and generate departmental academic reports.
- Peer Evaluation: Create and manage peer evaluation forms for teachers in the department.
- Communication: Post departmental announcements and communicate with teachers.

### 3.5 Teacher
*Role: Classroom Manager & Instructor.*
- Classroom Management: Mark daily attendance, view class rosters.
- Grading: Enter continuous assessment (CA) and exam grades for assigned classes. Submit grades for approval.
- Conduct: Grade student conduct and add behavioral comments.
- Assignments: Create, distribute, and grade assignments. Manage student submissions and feedback.
- Lesson Planning: Create lesson plans and submit them to the Department Head for approval.
- Instruction: Conduct/schedule online classes (Mock video integration).
- Communication: Communicate with parents regarding progress/behavior, and with students regarding academic queries.
- Reporting: Generate class performance reports and individual student academic reports.

### 3.6 Student
*Role: Primary Beneficiary (Grades 9-12).*
- View Only (Own Data): View personal grades, GPA, class rank, detailed transcripts, attendance history, and conduct grades.
- Assignments: View assigned tasks, submit assignment files, and review teacher feedback/grades.
- Exams: View the exam schedule and personal exam results.
- Learning Tools: Access AI-Supported Interactive Books and create/maintain personal digital notes.
- Communication: Send direct messages to subject teachers for clarification.
- Peer Evaluation: Complete peer evaluation forms assigned by the teacher (view own aggregated results).
[7/16/2026 4:36 PM] 1sew: ### 3.7 Parent
*Role: Guardian / Accountability Partner.*
- Read-Only (Own Child): View comprehensive academic progress (grades, transcripts, attendance, conduct, assignment status) for their linked child/children.
- Communication: Send messages to teachers and administration regarding progress or concerns.
- PTSA Engagement: View PTSA meeting schedules, minutes, and participate in PTSA surveys/votes.
- Profile: Manage personal profile and notification preferences.
- Grievance: Submit formal complaints/grievances regarding academic or administrative issues.
- Financial (Mock): View the fee structure and payment history/outstanding balance.

### 3.8 PTSA Representative
*Role: School-Community Liaison (Oversight).*
- Oversight (Read-Only): View school-wide aggregated academic performance, attendance rates, and financial summaries (Mock).
- Governance: Schedule PTSA meetings, upload meeting minutes, and manage member attendance.
- Feedback: Submit formal feedback to the Principal regarding school policies and performance.
- Community Voice: Create and distribute satisfaction surveys to parents and view aggregated results.

### 3.9 SIC Member
*Role: Strategic Planner & Evaluator (School Improvement Committee).*
- Strategic Planning: View and provide feedback on the School Improvement Plan (SIP).
- Monitoring: Access Key Performance Indicators (KPIs) and track the progress of improvement initiatives (M&E).
- Evaluation: View school self-assessment reports and external inspection reports.
- Resource Mobilization: Suggest partnerships and view resource utilization for improvement projects.
- Accountability: Submit SIC annual activity reports to the Principal/Board.

---

## 4. Key Business Rules & Constraints (Critical for Devs)
*Developers must enforce these rules at the backend/database level.*

1.  Hierarchical Registration: Users can only create accounts for roles directly below them in the hierarchy (e.g., Principal creates VPs, VP Academic creates Teachers).
2.  Data Isolation: Teachers only see students enrolled in their specific classes. Parents only see their own children. Students only see themselves.
3.  Read-Only vs. Write Access: PTSA and SIC have read-only access to operational data (grades, attendance) and write access only to specific fields like surveys or feedback forms.
4.  Departmental Boundaries: Department Heads cannot access or manage teachers/students outside their specific department.
5.  Approval Workflows:
    - *Grades:* Teacher enters -> Teacher submits -> VP Academic/Dept Head approves.
    - *Lesson Plans:* Teacher creates -> Department Head approves.
    - *Purchase Requests:* VP Admin initiates -> Principal approves.
    - *SIP:* SIC/Principal drafts -> Principal approves -> Woreda receives.

---

## 5. Core Data Entities (Database Models)
*Devs: These are the primary tables needed.*

1.  User: (Base entity: ID, Name, Email, Password, Role)
2.  School: (ID, Name, Address, Principal_ID)
3.  Department: (ID, Name, School_ID)
4.  Staff: (ID, User_ID, School_ID, Department_ID, Position)
5.  Student: (ID, User_ID, Class_ID, Parent_ID)
6.  Class: (ID, Grade_Level, Section, Academic_Year)
7.  Course/Subject: (ID, Name, Department_ID, Teacher_ID, Class_ID)
8.  Enrollment: (Student_ID, Course_ID)
9.  Attendance: (ID, Student_ID, Date, Status)
10. Gradebook: (ID, Student_ID, Course_ID, CA_Score, Exam_Score, Final_Grade, Term)
11. Assignment: (ID, Teacher_ID, Course_ID, Title, Description, Due_Date, Max_Score)
12. Submission: (ID, Assignment_ID, Student_ID, File_Path, Score, Feedback)
13. LessonPlan: (ID, Teacher_ID, Subject, Objectives, Activities, Status)
14. Asset: (ID, Name, Category, Status, Assigned_User, Location)
15. FacilityBooking: (ID, Facility_ID, Booked_By, Start_Time, End_Time, Status)
16. AuditLog: (ID, User_ID, Action, Timestamp)

---
[7/16/2026 4:36 PM] 1sew: ## 6. UI/UX & Technology Notes
- Framework: React/Tailwind recommended for modularity.
- Design Language: Clean, professional, accessible (WCAG 2.1). Must be fully responsive (teachers/parents use mobile heavily).
- State Management: Context API/Redux to manage user authentication and role-based menus.
- Localization: Must support Amharic translation/readiness (Unicode support).
- Reports: Integration with PDF generators (e.g., jsPDF, ReportLab) for transcript/report generation.

---

This document acts as the single source of truth for your development team. It prevents misinterpretation of user privileges and ensures the system architecture aligns perfectly with the Ethiopian high school management structure.
