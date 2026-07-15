# Parent API Endpoints Specification

## Overview
This document defines all API endpoints for the Parent role in the Smart School Connect system, covering all 18 functional areas specified in the Parent functionality requirements.

## Base URL
All endpoints are prefixed with `/api/parent`

## Authentication
All endpoints require JWT authentication with the `PARENT` role.

---

## 1. Dashboard & Overview

### 1.1 Get Parent Dashboard
```http
GET /api/parent/dashboard
```
**Description:** Get personalized summary for parent with all their children

**Response:**
```json
{
  "children": [
    {
      "student_id": 2,
      "full_name": "Maya Patel",
      "student_number": "S-1002",
      "class_name": "Grade 10 - Algebra",
      "school_name": "Smart Valley Academy",
      "summary": {
        "average_grade": 82,
        "attendance_rate": 88,
        "assignments_submitted": 4,
        "total_assignments": 5,
        "conduct_grade": "Good"
      }
    }
  ],
  "announcements": [...],
  "notifications": [...]
}
```

### 1.2 Get Child Dashboard
```http
GET /api/parent/children/:childId/dashboard
```
**Description:** Get detailed dashboard for a specific child

**Response:**
```json
{
  "child": {
    "student_id": 2,
    "full_name": "Maya Patel",
    "student_number": "S-1002",
    "class_name": "Grade 10 - Algebra",
    "school_name": "Smart Valley Academy"
  },
  "summary": {
    "average_grade": 82,
    "attendance_rate": 88,
    "assignments_submitted": 4,
    "total_assignments": 5,
    "conduct_grade": "Good",
    "pending_assignments": 1,
    "upcoming_exams": 2
  },
  "alerts": [
    { "type": "ABSENCE", "message": "Recent absence recorded for your child on Oct 4." },
    { "type": "LOW_GRADE", "message": "A recent score is below the expected grade range." },
    { "type": "DEADLINE", "message": "Upcoming deadline: Linear Functions Homework." }
  ],
  "performance_trend": [
    { "month": "Aug", "score": 72 },
    { "month": "Sep", "score": 78 },
    { "month": "Oct", "score": 85 },
    { "month": "Nov", "score": 82 }
  ],
  "announcements": [...]
}
```

### 1.3 Get Quick Stats
```http
GET /api/parent/children/:childId/quick-stats
```
**Description:** Get quick statistics cards for a child

**Response:**
```json
{
  "current_gpa": 3.2,
  "attendance_rate": 88,
  "conduct_grade": "Good",
  "pending_assignments": 1,
  "upcoming_exams": 2
}
```

### 1.4 Get Recent Activity Feed
```http
GET /api/parent/children/:childId/activity-feed?limit=10
```
**Description:** Get recent activity updates for a child

**Response:**
```json
{
  "activities": [
    {
      "type": "GRADE_POSTED",
      "message": "New grade posted for Quadratic Equations: 85/100",
      "timestamp": "2025-10-09T14:15:00.000Z"
    },
    {
      "type": "ATTENDANCE_MARKED",
      "message": "Attendance marked: Present",
      "timestamp": "2025-10-08T08:00:00.000Z"
    }
  ]
}
```

---

## 2. View Child's Academic Performance (Read-Only)

### 2.1 Get Current Grades
```http
GET /api/parent/children/:childId/grades
```
**Description:** Get all current grades for a child

**Query Parameters:**
- `term`: Optional term filter (e.g., "2025/2026 - Semester 1")
- `subject_id`: Optional subject filter

**Response:**
```json
{
  "grades": [
    {
      "subject_id": 1,
      "subject_name": "Mathematics",
      "subject_code": "MATH101",
      "teacher_name": "Alicia Gomez",
      "term_grade": 85,
      "letter_grade": "B+",
      "exam_scores": [
        { "exam_type": "MIDTERM", "score": 82, "max_score": 100 },
        { "exam_type": "FINAL", "score": 88, "max_score": 100 }
      ],
      "continuous_assessment": [
        { "type": "Quiz", "score": 85, "weight": 20 },
        { "type": "Assignment", "score": 90, "weight": 30 }
      ]
    }
  ]
}
```

### 2.2 Get Grade Distribution
```http
GET /api/parent/children/:childId/grade-distribution
```
**Description:** Get visual breakdown of grades across subjects

**Response:**
```json
{
  "distribution": [
    { "subject": "Mathematics", "score": 85, "letter": "B+" },
    { "subject": "English", "score": 92, "letter": "A-" },
    { "subject": "Physics", "score": 78, "letter": "B" },
    { "subject": "Chemistry", "score": 88, "letter": "B+" }
  ],
  "chart_data": {
    "labels": ["Mathematics", "English", "Physics", "Chemistry"],
    "data": [85, 92, 78, 88]
  }
}
```

### 2.3 Get Subject-wise Performance
```http
GET /api/parent/children/:childId/subjects/:subjectId/performance
```
**Description:** Get detailed performance for a specific subject

**Response:**
```json
{
  "subject": {
    "subject_id": 1,
    "subject_name": "Mathematics",
    "subject_code": "MATH101",
    "teacher_name": "Alicia Gomez"
  },
  "current_grade": 85,
  "letter_grade": "B+",
  "class_average": 78,
  "rank_in_class": 5,
  "total_students": 40,
  "trend": "IMPROVING",
  "performance_history": [
    { "month": "Aug", "score": 72 },
    { "month": "Sep", "score": 78 },
    { "month": "Oct", "score": 85 }
  ],
  "assignments": [...],
  "exam_results": [...]
}
```

### 2.4 Get Term Reports
```http
GET /api/parent/children/:childId/term-reports
```
**Description:** Get term-wise academic reports

**Query Parameters:**
- `term`: Optional term filter

**Response:**
```json
{
  "reports": [
    {
      "term": "2025/2026 - Semester 1",
      "gpa": 3.2,
      "average_grade": 82,
      "subjects": [
        { "subject": "Mathematics", "grade": 85, "letter": "B+" },
        { "subject": "English", "grade": 92, "letter": "A-" }
      ],
      "class_rank": 5,
      "total_students": 40,
      "attendance_rate": 88,
      "conduct_grade": "Good",
      "pdf_url": "/reports/term-report-child2-sem1.pdf"
    }
  ]
}
```

### 2.5 Get Grade History
```http
GET /api/parent/children/:childId/grade-history
```
**Description:** Get historical grades across all terms/years

**Response:**
```json
{
  "history": [
    {
      "academic_year": "2024/2025",
      "terms": [
        {
          "term": "Semester 1",
          "gpa": 3.0,
          "average_grade": 80
        },
        {
          "term": "Semester 2",
          "gpa": 3.1,
          "average_grade": 81
        }
      ]
    },
    {
      "academic_year": "2025/2026",
      "terms": [
        {
          "term": "Semester 1",
          "gpa": 3.2,
          "average_grade": 82
        }
      ]
    }
  ]
}
```

### 2.6 Get Class Average Comparison
```http
GET /api/parent/children/:childId/class-comparison
```
**Description:** Compare child's performance to class average (anonymous)

**Response:**
```json
{
  "comparison": [
    {
      "subject": "Mathematics",
      "child_score": 85,
      "class_average": 78,
      "difference": 7,
      "percentile": 75
    },
    {
      "subject": "English",
      "child_score": 92,
      "class_average": 85,
      "difference": 7,
      "percentile": 85
    }
  ]
}
```

### 2.7 Get Subject Rank
```http
GET /api/parent/children/:childId/subject-ranks
```
**Description:** Get child's rank within class for each subject

**Response:**
```json
{
  "ranks": [
    {
      "subject": "Mathematics",
      "rank": 5,
      "total_students": 40,
      "percentile": 87.5
    },
    {
      "subject": "English",
      "rank": 3,
      "total_students": 40,
      "percentile": 92.5
    }
  ]
}
```

### 2.8 Get Progress Over Time
```http
GET /api/parent/children/:childId/progress-chart
```
**Description:** Get chart data showing academic progress over time

**Response:**
```json
{
  "chart_data": {
    "labels": ["Aug 2024", "Sep 2024", "Oct 2024", "Nov 2024", "Dec 2024", "Jan 2025"],
    "datasets": [
      {
        "label": "Average Grade",
        "data": [72, 78, 75, 80, 82, 85],
        "color": "#10b981"
      }
    ]
  }
}
```

---

## 3. View Child's Attendance (Read-Only)

### 3.1 Get Attendance Summary
```http
GET /api/parent/children/:childId/attendance/summary
```
**Description:** Get overall attendance rate for current term/year

**Query Parameters:**
- `term`: Optional term filter

**Response:**
```json
{
  "summary": {
    "total_days": 45,
    "present_days": 40,
    "absent_days": 3,
    "late_days": 2,
    "attendance_rate": 88.9,
    "term": "2025/2026 - Semester 1"
  }
}
```

### 3.2 Get Daily Attendance
```http
GET /api/parent/children/:childId/attendance/daily
```
**Description:** Get daily attendance record for current term

**Query Parameters:**
- `start_date`: Optional start date (YYYY-MM-DD)
- `end_date`: Optional end date (YYYY-MM-DD)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 30)

**Response:**
```json
{
  "attendance": [
    {
      "attendance_id": 1,
      "date": "2025-10-03",
      "status": "ABSENT",
      "remarks": "Sick",
      "class_name": "Grade 10 - Algebra"
    },
    {
      "attendance_id": 2,
      "date": "2025-10-04",
      "status": "PRESENT",
      "remarks": "",
      "class_name": "Grade 10 - Algebra"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 30,
    "total_pages": 2
  }
}
```

### 3.3 Get Monthly Attendance
```http
GET /api/parent/children/:childId/attendance/monthly
```
**Description:** Get attendance summary by month (calendar view)

**Query Parameters:**
- `year`: Year (default: current year)
- `month`: Month (default: current month)

**Response:**
```json
{
  "month": "2025-10",
  "calendar": [
    { "day": 1, "date": "2025-10-01", "status": "PRESENT" },
    { "day": 2, "date": "2025-10-02", "status": "PRESENT" },
    { "day": 3, "date": "2025-10-03", "status": "ABSENT", "remarks": "Sick" },
    { "day": 4, "date": "2025-10-04", "status": "PRESENT" }
  ],
  "summary": {
    "present": 18,
    "absent": 2,
    "late": 1,
    "total": 21,
    "percentage": 86
  }
}
```

### 3.4 Get Attendance Trends
```http
GET /api/parent/children/:childId/attendance/trends
```
**Description:** Get charts showing attendance patterns over time

**Response:**
```json
{
  "trends": {
    "monthly_data": [
      { "month": "2025-08", "present": 20, "absent": 1, "late": 0, "percentage": 95 },
      { "month": "2025-09", "present": 18, "absent": 2, "late": 1, "percentage": 86 },
      { "month": "2025-10", "present": 15, "absent": 2, "late": 1, "percentage": 83 }
    ],
    "pattern_analysis": {
      "most_absent_day": "Monday",
      "most_late_day": "Wednesday",
      "improvement_needed": true
    }
  }
}
```

### 3.5 Get Absence Reasons
```http
GET /api/parent/children/:childId/attendance/absences
```
**Description:** Get reasons provided for absences

**Response:**
```json
{
  "absences": [
    {
      "date": "2025-10-03",
      "status": "ABSENT",
      "reason": "Sick",
      "reported_by": "Parent"
    },
    {
      "date": "2025-10-10",
      "status": "ABSENT",
      "reason": "Family emergency",
      "reported_by": "Parent"
    }
  ]
}
```

### 3.6 Get Attendance Alerts
```http
GET /api/parent/children/:childId/attendance/alerts
```
**Description:** Get alerts if attendance drops below threshold

**Response:**
```json
{
  "alerts": [
    {
      "type": "LOW_ATTENDANCE",
      "threshold": 80,
      "current_rate": 75,
      "message": "Attendance has dropped below 80% threshold",
      "severity": "HIGH"
    }
  ]
}
```

### 3.7 Export Attendance Report
```http
GET /api/parent/children/:childId/attendance/export
```
**Description:** Download attendance report (PDF/Excel)

**Query Parameters:**
- `format`: "pdf" or "excel" (default: "pdf")
- `term`: Optional term filter

**Response:** File download

---

## 4. View Child's Conduct (Read-Only)

### 4.1 Get Conduct Summary
```http
GET /api/parent/children/:childId/conduct/summary
```
**Description:** Get current conduct grade/rating

**Response:**
```json
{
  "conduct": {
    "current_grade": "Good",
    "rating": 3.5,
    "scale": 5,
    "term": "2025/2026 - Semester 1"
  }
}
```

### 4.2 Get Conduct History
```http
GET /api/parent/children/:childId/conduct/history
```
**Description:** Get conduct grades across all terms/years

**Response:**
```json
{
  "history": [
    {
      "academic_year": "2024/2025",
      "terms": [
        { "term": "Semester 1", "grade": "Good", "rating": 3.5 },
        { "term": "Semester 2", "grade": "Excellent", "rating": 4.2 }
      ]
    },
    {
      "academic_year": "2025/2026",
      "terms": [
        { "term": "Semester 1", "grade": "Good", "rating": 3.8 }
      ]
    }
  ]
}
```

### 4.3 Get Conduct Comments
```http
GET /api/parent/children/:childId/conduct/comments
```
**Description:** Get teacher comments regarding conduct

**Response:**
```json
{
  "comments": [
    {
      "teacher_name": "Alicia Gomez",
      "subject": "Mathematics",
      "comment": "Excellent participation, respectful",
      "date": "2025-10-01",
      "term": "2025/2026 - Semester 1"
    },
    {
      "teacher_name": "Mr. Johnson",
      "subject": "English",
      "comment": "Needs to improve focus in class",
      "date": "2025-10-05",
      "term": "2025/2026 - Semester 1"
    }
  ]
}
```

### 4.4 Get Conduct Incidents
```http
GET /api/parent/children/:childId/conduct/incidents
```
**Description:** Get log of disciplinary incidents (anonymized)

**Response:**
```json
{
  "incidents": [
    {
      "incident_id": 1,
      "date": "2025-09-15",
      "type": "Minor",
      "description": "Late to class",
      "resolution": "Warning issued",
      "status": "RESOLVED",
      "reported_by": "Teacher"
    }
  ]
}
```

### 4.5 Get Conduct Trends
```http
GET /api/parent/children/:childId/conduct/trends
```
**Description:** Get charts showing conduct improvement/decline over time

**Response:**
```json
{
  "trends": {
    "chart_data": {
      "labels": ["Aug 2024", "Sep 2024", "Oct 2024", "Nov 2024", "Dec 2024"],
      "data": [3.2, 3.5, 3.8, 3.7, 4.0]
    },
    "trend": "IMPROVING"
  }
}
```

---

## 5. View Child's Transcript (Read-Only)

### 5.1 Get Official Transcript
```http
GET /api/parent/children/:childId/transcript
```
**Description:** Get full academic transcript for current term/year

**Query Parameters:**
- `term`: Optional term filter

**Response:**
```json
{
  "transcript": {
    "student": {
      "student_id": 2,
      "full_name": "Maya Patel",
      "student_number": "S-1002",
      "class_name": "Grade 10 - Algebra"
    },
    "term": "2025/2026 - Semester 1",
    "gpa": 3.2,
    "subjects": [
      {
        "subject": "Mathematics",
        "grade": 85,
        "letter_grade": "B+",
        "credits": 4
      },
      {
        "subject": "English",
        "grade": 92,
        "letter_grade": "A-",
        "credits": 4
      }
    ],
    "total_credits": 32,
    "cumulative_gpa": 3.15
  }
}
```

### 5.2 Get Cumulative Transcript
```http
GET /api/parent/children/:childId/transcript/cumulative
```
**Description:** Get complete academic history from Grade 9 to current grade

**Response:**
```json
{
  "transcript": {
    "student": {
      "student_id": 2,
      "full_name": "Maya Patel",
      "student_number": "S-1002"
    },
    "academic_history": [
      {
        "grade_level": "Grade 9",
        "academic_year": "2023/2024",
        "gpa": 3.0,
        "subjects": [...]
      },
      {
        "grade_level": "Grade 10",
        "academic_year": "2024/2025",
        "gpa": 3.1,
        "subjects": [...]
      }
    ],
    "cumulative_gpa": 3.05,
    "total_credits": 96
  }
}
```

### 5.3 Download Transcript
```http
GET /api/parent/children/:childId/transcript/download
```
**Description:** Download official transcript as PDF

**Query Parameters:**
- `type`: "current" or "cumulative" (default: "current")

**Response:** File download

### 5.4 Print Transcript
```http
POST /api/parent/children/:childId/transcript/print
```
**Description:** Generate print-ready transcript

**Response:**
```json
{
  "print_url": "/transcripts/print/student-2-20251015.pdf",
  "expires_at": "2025-10-15T18:00:00.000Z"
}
```

### 5.5 Verify Transcript
```http
GET /api/parent/children/:childId/transcript/verify
```
**Description:** Verify transcript authenticity with QR code/unique ID

**Response:**
```json
{
  "verification": {
    "transcript_id": "TR-2025-001",
    "qr_code": "data:image/png;base64,...",
    "unique_id": "UUID-12345-67890",
    "verified": true,
    "issued_date": "2025-10-15",
    "issuing_authority": "Smart Valley Academy"
  }
}
```

---

## 6. View Child's Assignments & Submissions (Read-Only)

### 6.1 Get Current Assignments
```http
GET /api/parent/children/:childId/assignments
```
**Description:** Get all assignments with details

**Query Parameters:**
- `status`: Filter by status ("PENDING", "SUBMITTED", "GRADED", "OVERDUE")
- `subject_id`: Optional subject filter

**Response:**
```json
{
  "assignments": [
    {
      "assignment_id": 1,
      "title": "Quadratic Equations",
      "subject": "Mathematics",
      "subject_code": "MATH101",
      "teacher_name": "Alicia Gomez",
      "due_date": "2025-10-10T23:59:00.000Z",
      "max_score": 100,
      "status": "GRADED",
      "submission": {
        "submitted_at": "2025-10-11T09:08:00.000Z",
        "is_late": true,
        "score": 85,
        "grade": "B+",
        "feedback": "Good work, minor errors in problem 5."
      }
    }
  ]
}
```

### 6.2 Get Assignment Deadlines
```http
GET /api/parent/children/:childId/assignments/deadlines
```
**Description:** Get calendar view of upcoming assignment deadlines

**Query Parameters:**
- `month`: Month (default: current month)
- `year`: Year (default: current year)

**Response:**
```json
{
  "deadlines": [
    {
      "date": "2025-10-20",
      "assignments": [
        {
          "assignment_id": 3,
          "title": "Linear Functions Homework",
          "subject": "Mathematics",
          "due_time": "23:59"
        }
      ]
    }
  ]
}
```

### 6.3 Get Submitted Assignments
```http
GET /api/parent/children/:childId/assignments/submitted
```
**Description:** Get assignments that have been submitted

**Response:**
```json
{
  "submissions": [
    {
      "assignment_id": 1,
      "title": "Quadratic Equations",
      "subject": "Mathematics",
      "submitted_at": "2025-10-11T09:08:00.000Z",
      "is_late": true,
      "score": 85,
      "grade": "B+",
      "feedback": "Good work, minor errors in problem 5.",
      "file_url": "/submissions/submitted-maya-patel-quadratics.pdf"
    }
  ]
}
```

### 6.4 Get Assignment Scores
```http
GET /api/parent/children/:childId/assignments/scores
```
**Description:** Get scores/grades for submitted assignments

**Response:**
```json
{
  "scores": [
    {
      "assignment_id": 1,
      "title": "Quadratic Equations",
      "subject": "Mathematics",
      "score": 85,
      "max_score": 100,
      "percentage": 85,
      "grade": "B+",
      "graded_at": "2025-10-12T10:00:00.000Z"
    }
  ]
}
```

### 6.5 Get Missing Assignments
```http
GET /api/parent/children/:childId/assignments/missing
```
**Description:** Get overdue or not yet submitted assignments

**Response:**
```json
{
  "missing": [
    {
      "assignment_id": 4,
      "title": "Physics Lab Report",
      "subject": "Physics",
      "due_date": "2025-10-08T23:59:00.000Z",
      "days_overdue": 7,
      "status": "OVERDUE"
    }
  ]
}
```

### 6.6 Download Assignment Files
```http
GET /api/parent/children/:childId/assignments/:assignmentId/files
```
**Description:** Download assignment files provided by teacher

**Response:** File download

---

## 7. View Child's Exam Results (Read-Only)

### 7.1 Get Exam Schedule
```http
GET /api/parent/children/:childId/exams/schedule
```
**Description:** Get upcoming exams with dates, subjects, times, venues

**Response:**
```json
{
  "exams": [
    {
      "exam_id": 1,
      "subject": "Mathematics",
      "exam_type": "MIDTERM",
      "date": "2025-10-25",
      "time": "09:00-11:00",
      "venue": "Room 101",
      "duration_minutes": 120
    }
  ]
}
```

### 7.2 Get Exam Results
```http
GET /api/parent/children/:childId/exams/results
```
**Description:** Get exam scores for all subjects

**Query Parameters:**
- `exam_type`: Optional filter ("MIDTERM", "FINAL", "QUIZ")
- `term`: Optional term filter

**Response:**
```json
{
  "results": [
    {
      "exam_id": 1,
      "subject": "Mathematics",
      "exam_type": "MIDTERM",
      "score": 82,
      "max_score": 100,
      "percentage": 82,
      "letter_grade": "B+",
      "class_average": 78,
      "remarks": "Good performance",
      "exam_date": "2025-10-15"
    }
  ]
}
```

### 7.3 Get National Exam Results
```http
GET /api/parent/children/:childId/exams/national
```
**Description:** Access Grade 10 (EGSECE) and Grade 12 (ESSLCE) national exam results

**Response:**
```json
{
  "national_exams": [
    {
      "exam_type": "EGSECE",
      "grade_level": "Grade 10",
      "year": "2024",
      "subjects": [
        { "subject": "Mathematics", "score": 85, "grade": "A" },
        { "subject": "English", "score": 90, "grade": "A" }
      ],
      "overall_grade": "A",
      "division": 1
    }
  ]
}
```

### 7.4 Get Exam Performance Analysis
```http
GET /api/parent/children/:childId/exams/analysis
```
**Description:** Get charts showing performance in each exam compared to class average

**Response:**
```json
{
  "analysis": {
    "chart_data": {
      "labels": ["Mathematics", "English", "Physics", "Chemistry"],
      "child_scores": [82, 90, 75, 88],
      "class_averages": [78, 85, 72, 80]
    },
    "summary": {
      "above_average_subjects": 3,
      "below_average_subjects": 1,
      "overall_performance": "ABOVE_AVERAGE"
    }
  }
}
```

### 7.5 Download Exam Report
```http
GET /api/parent/children/:childId/exams/report/download
```
**Description:** Download exam result report (PDF)

**Query Parameters:**
- `term`: Optional term filter

**Response:** File download

---

## 8. Communication with Teachers (Write)

### 8.1 Send Message to Teacher
```http
POST /api/parent/messages/send
```
**Description:** Send a message to child's teacher(s)

**Request Body:**
```json
{
  "receiver_id": 5,
  "student_id": 2,
  "subject": "Academic Progress",
  "content": "I would like to discuss my child's recent performance in Mathematics.",
  "attachment_url": null
}
```

**Response:**
```json
{
  "message_id": 123,
  "status": "SENT",
  "timestamp": "2025-10-15T10:30:00.000Z"
}
```

### 8.2 Send Message to VP Academic
```http
POST /api/parent/messages/send-vp-academic
```
**Description:** Send message to VP Academic for academic concerns

**Request Body:**
```json
{
  "subject": "Academic Concern",
  "content": "I have concerns about the curriculum...",
  "student_id": 2
}
```

**Response:**
```json
{
  "message_id": 124,
  "status": "SENT",
  "timestamp": "2025-10-15T10:35:00.000Z"
}
```

### 8.3 Get Message History
```http
GET /api/parent/messages
```
**Description:** Get all sent and received messages (threaded conversations)

**Query Parameters:**
- `thread_id`: Optional filter by thread
- `student_id`: Optional filter by student

**Response:**
```json
{
  "threads": [
    {
      "thread_id": 3,
      "recipient_name": "Alicia Gomez",
      "recipient_role": "Teacher",
      "student_id": 2,
      "student_name": "Maya Patel",
      "last_message": "Thank you for the update.",
      "unread_count": 1,
      "last_updated": "2025-10-07T11:25:00.000Z",
      "messages": [
        {
          "message_id": 45,
          "sender_id": 10,
          "sender_name": "Parent",
          "content": "Can we schedule a call about the project?",
          "timestamp": "2025-10-07T11:05:00.000Z",
          "is_read": true
        }
      ]
    }
  ]
}
```

### 8.4 Get Message Thread
```http
GET /api/parent/messages/:threadId
```
**Description:** Get specific message thread

**Response:**
```json
{
  "thread_id": 3,
  "participants": [
    { "user_id": 10, "name": "Parent", "role": "PARENT" },
    { "user_id": 5, "name": "Alicia Gomez", "role": "TEACHER" }
  ],
  "student_context": {
    "student_id": 2,
    "student_name": "Maya Patel"
  },
  "messages": [...]
}
```

### 8.5 Reply to Message
```http
POST /api/parent/messages/:messageId/reply
```
**Description:** Reply to a message

**Request Body:**
```json
{
  "content": "Thank you for the information.",
  "attachment_url": null
}
```

**Response:**
```json
{
  "message_id": 46,
  "status": "SENT",
  "timestamp": "2025-10-15T11:00:00.000Z"
}
```

### 8.6 Mark Message as Read
```http
PUT /api/parent/messages/:messageId/read
```
**Description:** Mark a message as read

**Response:**
```json
{
  "message_id": 45,
  "is_read": true,
  "read_at": "2025-10-15T11:05:00.000Z"
}
```

### 8.7 Mark All Messages as Read
```http
PUT /api/parent/messages/read-all
```
**Description:** Mark all messages as read

**Response:**
```json
{
  "updated_count": 5,
  "timestamp": "2025-10-15T11:10:00.000Z"
}
```

---

## 9. Communication with School Administration (Write)

### 9.1 Send Message to Principal
```http
POST /api/parent/messages/principal
```
**Description:** Send message to Principal regarding school-wide concerns

**Request Body:**
```json
{
  "subject": "School Facility Concern",
  "content": "I would like to report an issue with the school library...",
  "student_id": 2
}
```

**Response:**
```json
{
  "message_id": 125,
  "status": "SENT",
  "timestamp": "2025-10-15T12:00:00.000Z"
}
```

### 9.2 Send Message to VP Admin
```http
POST /api/parent/messages/vp-admin
```
**Description:** Send message regarding administrative matters

**Request Body:**
```json
{
  "subject": "Fee Inquiry",
  "content": "I have questions about the fee structure...",
  "student_id": 2
}
```

**Response:**
```json
{
  "message_id": 126,
  "status": "SENT",
  "timestamp": "2025-10-15T12:05:00.000Z"
}
```

### 9.3 Submit Complaint/Grievance
```http
POST /api/parent/grievances
```
**Description:** Formally submit complaints

**Request Body:**
```json
{
  "category": "ACADEMIC",
  "subject": "Grading Concern",
  "description": "I believe there was an error in grading...",
  "student_id": 2,
  "priority": "HIGH"
}
```

**Response:**
```json
{
  "grievance_id": 15,
  "status": "PENDING",
  "reference_number": "GRV-2025-015",
  "submitted_at": "2025-10-15T12:10:00.000Z"
}
```

### 9.4 Submit Feedback
```http
POST /api/parent/feedback
```
**Description:** Provide feedback or suggestions for school improvement

**Request Body:**
```json
{
  "category": "GENERAL",
  "subject": "School Improvement Suggestion",
  "description": "I suggest adding more extracurricular activities...",
  "student_id": 2
}
```

**Response:**
```json
{
  "feedback_id": 20,
  "status": "RECEIVED",
  "submitted_at": "2025-10-15T12:15:00.000Z"
}
```

### 9.5 Track Grievance Status
```http
GET /api/parent/grievances
```
**Description:** See status of submitted grievances

**Response:**
```json
{
  "grievances": [
    {
      "grievance_id": 15,
      "reference_number": "GRV-2025-015",
      "category": "ACADEMIC",
      "subject": "Grading Concern",
      "status": "IN_PROGRESS",
      "submitted_at": "2025-10-15T12:10:00.000Z",
      "updated_at": "2025-10-16T09:00:00.000Z",
      "response": "Your grievance is being reviewed by the academic department."
    }
  ]
}
```

### 9.6 Get Grievance Details
```http
GET /api/parent/grievances/:grievanceId
```
**Description:** Get details of a specific grievance

**Response:**
```json
{
  "grievance": {
    "grievance_id": 15,
    "reference_number": "GRV-2025-015",
    "category": "ACADEMIC",
    "subject": "Grading Concern",
    "description": "I believe there was an error in grading...",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "submitted_at": "2025-10-15T12:10:00.000Z",
    "responses": [
      {
        "responder": "VP Academic",
        "message": "Your grievance is being reviewed...",
        "timestamp": "2025-10-16T09:00:00.000Z"
      }
    ]
  }
}
```

---

## 10. View Announcements & Notices (Read-Only)

### 10.1 Get School Announcements
```http
GET /api/parent/announcements
```
**Description:** Get all school-wide announcements

**Query Parameters:**
- `target`: Filter by target ("ALL", "PARENT", "STUDENT")
- `limit`: Number of announcements (default: 20)

**Response:**
```json
{
  "announcements": [
    {
      "announcement_id": 1,
      "title": "School Open Day Reminder",
      "message": "Parent-teacher conferences will be held next Tuesday...",
      "created_by": "Principal",
      "published_at": "2025-10-06T12:00:00.000Z",
      "target_roles": ["PARENT", "TEACHER"],
      "is_active": true
    }
  ]
}
```

### 10.2 Get Parent-Specific Announcements
```http
GET /api/parent/announcements/parent-specific
```
**Description:** Get announcements specifically for parents

**Response:**
```json
{
  "announcements": [
    {
      "announcement_id": 5,
      "title": "Parent-Teacher Meeting",
      "message": "Scheduled for next Tuesday at 3 PM...",
      "published_at": "2025-10-12T13:00:00.000Z"
    }
  ]
}
```

### 10.3 Get PTSA Announcements
```http
GET /api/parent/announcements/ptsa
```
**Description:** Get announcements from PTSA

**Response:**
```json
{
  "announcements": [
    {
      "announcement_id": 10,
      "title": "PTSA Meeting Notice",
      "message": "Next PTSA meeting will be held on...",
      "published_at": "2025-10-14T10:00:00.000Z"
    }
  ]
}
```

### 10.4 Get Urgent Notices
```http
GET /api/parent/announcements/urgent
```
**Description:** Get urgent/safety announcements

**Response:**
```json
{
  "notices": [
    {
      "notice_id": 1,
      "title": "School Closure Due to Weather",
      "message": "School will be closed tomorrow due to heavy rain...",
      "type": "URGENT",
      "published_at": "2025-10-15T08:00:00.000Z"
    }
  ]
}
```

### 10.5 Get Event Calendar
```http
GET /api/parent/events/calendar
```
**Description:** Get upcoming school events

**Query Parameters:**
- `month`: Month (default: current month)
- `year`: Year (default: current year)

**Response:**
```json
{
  "events": [
    {
      "event_id": 1,
      "title": "Sports Day",
      "date": "2025-10-20",
      "time": "09:00-16:00",
      "location": "School Ground",
      "description": "Annual sports competition..."
    }
  ]
}
```

---

## 11. Child's Peer Evaluation Results (Read-Only)

### 11.1 Get Peer Evaluation Summary
```http
GET /api/parent/children/:childId/peer-evaluations
```
**Description:** Get aggregated results of peer evaluations

**Response:**
```json
{
  "evaluations": [
    {
      "evaluation_id": 1,
      "title": "Group Project Feedback",
      "subject": "Mathematics",
      "due_date": "2025-10-15",
      "average_rating": 9.3,
      "total_evaluators": 3,
      "max_rating": 10,
      "status": "RELEASED"
    }
  ]
}
```

### 11.2 Get Peer Evaluation Comments
```http
GET /api/parent/children/:childId/peer-evaluations/:evaluationId/comments
```
**Description:** Get anonymized comments from peers

**Response:**
```json
{
  "comments": [
    {
      "evaluator_id": 1,
      "anonymized_name": "Peer 1",
      "score": 9,
      "comments": "Strong leadership and clear communication."
    },
    {
      "evaluator_id": 3,
      "anonymized_name": "Peer 2",
      "score": 9,
      "comments": "Very helpful in group tasks."
    }
  ]
}
```

### 11.3 Get Peer Rating
```http
GET /api/parent/children/:childId/peer-evaluations/:evaluationId/rating
```
**Description:** Get average peer rating

**Response:**
```json
{
  "rating": {
    "average_score": 9.3,
    "max_score": 10,
    "total_evaluations": 3,
    "rating_breakdown": {
      "leadership": 9.5,
      "communication": 9.0,
      "teamwork": 9.5,
      "participation": 9.0
    }
  }
}
```

### 11.4 Get Peer Comparison
```http
GET /api/parent/children/:childId/peer-evaluations/:evaluationId/comparison
```
**Description:** Compare child's peer rating to class average

**Response:**
```json
{
  "comparison": {
    "child_rating": 9.3,
    "class_average": 8.5,
    "difference": 0.8,
    "percentile": 85,
    "total_students": 40
  }
}
```

---

## 12. School Fee & Payment Management (Mock / Read-Only)

### 12.1 Get Fee Structure
```http
GET /api/parent/children/:childId/fees/structure
```
**Description:** Get current fee structure for child's grade

**Response:**
```json
{
  "fee_structure": [
    {
      "fee_id": 1,
      "name": "Tuition Fee",
      "amount": 15000,
      "currency": "ETB",
      "term": "2025/2026 - Semester 1",
      "description": "Regular tuition fee"
    },
    {
      "fee_id": 2,
      "name": "Lab Fee",
      "amount": 2000,
      "currency": "ETB",
      "term": "2025/2026 - Semester 1",
      "description": "Science laboratory fee"
    }
  ],
  "total_fees": 17000,
  "currency": "ETB"
}
```

### 12.2 Get Payment History
```http
GET /api/parent/children/:childId/payments/history
```
**Description:** Get payment history

**Response:**
```json
{
  "payments": [
    {
      "payment_id": 1,
      "amount": 8000,
      "currency": "ETB",
      "status": "COMPLETED",
      "payment_method": "Chapa",
      "transaction_id": "CHP-2025-001",
      "receipt_url": "/receipts/receipt-001.pdf",
      "created_at": "2025-09-15T10:30:00.000Z"
    },
    {
      "payment_id": 2,
      "amount": 5000,
      "currency": "ETB",
      "status": "COMPLETED",
      "payment_method": "Telebirr",
      "transaction_id": "TBR-2025-042",
      "receipt_url": "/receipts/receipt-002.pdf",
      "created_at": "2025-10-01T14:20:00.000Z"
    }
  ]
}
```

### 12.3 Get Outstanding Balance
```http
GET /api/parent/children/:childId/payments/balance
```
**Description:** Get outstanding fees or overdue payments

**Response:**
```json
{
  "balance": {
    "total_fees": 17000,
    "total_paid": 13000,
    "outstanding_balance": 4000,
    "currency": "ETB",
    "overdue_amount": 0,
    "next_due_date": "2025-11-01"
  }
}
```

### 12.4 Generate Fee Receipt
```http
GET /api/parent/children/:childId/payments/:paymentId/receipt
```
**Description:** Download payment receipt

**Response:** File download

### 12.5 Request Fee Clarification
```http
POST /api/parent/messages/fee-inquiry
```
**Description:** Send message to VP Admin regarding fee queries

**Request Body:**
```json
{
  "subject": "Fee Inquiry",
  "content": "I have questions about the fee breakdown...",
  "student_id": 2
}
```

**Response:**
```json
{
  "message_id": 127,
  "status": "SENT",
  "timestamp": "2025-10-15T13:00:00.000Z"
}
```

---

## 13. Parent Profile & Settings

### 13.1 Get Parent Profile
```http
GET /api/parent/profile
```
**Description:** Get parent's personal profile

**Response:**
```json
{
  "profile": {
    "user_id": 10,
    "full_name": "John Patel",
    "email": "john.patel@email.com",
    "phone_number": "+251911234567",
    "address": "Addis Ababa, Ethiopia",
    "relationship": "Father",
    "preferred_language": "en",
    "profile_picture_url": "/profiles/parent-10.jpg"
  }
}
```

### 13.2 Update Parent Profile
```http
PUT /api/parent/profile
```
**Description:** Update personal information

**Request Body:**
```json
{
  "full_name": "John Patel",
  "phone_number": "+251911234567",
  "address": "Addis Ababa, Ethiopia",
  "preferred_language": "en"
}
```

**Response:**
```json
{
  "status": "UPDATED",
  "updated_at": "2025-10-15T13:30:00.000Z"
}
```

### 13.3 Get Notification Preferences
```http
GET /api/parent/notifications/preferences
```
**Description:** Get notification preferences

**Response:**
```json
{
  "preferences": {
    "email": {
      "grades": true,
      "attendance": true,
      "conduct": true,
      "assignments": true,
      "announcements": true
    },
    "sms": {
      "grades": false,
      "attendance": true,
      "conduct": false,
      "assignments": false,
      "announcements": true
    },
    "in_app": {
      "grades": true,
      "attendance": true,
      "conduct": true,
      "assignments": true,
      "announcements": true
    }
  }
}
```

### 13.4 Update Notification Preferences
```http
PUT /api/parent/notifications/preferences
```
**Description:** Update notification preferences

**Request Body:**
```json
{
  "email": {
    "grades": true,
    "attendance": true,
    "conduct": false,
    "assignments": true,
    "announcements": true
  },
  "sms": {
    "grades": false,
    "attendance": true,
    "conduct": false,
    "assignments": false,
    "announcements": true
  },
  "in_app": {
    "grades": true,
    "attendance": true,
    "conduct": true,
    "assignments": true,
    "announcements": true
  }
}
```

**Response:**
```json
{
  "status": "UPDATED",
  "updated_at": "2025-10-15T13:35:00.000Z"
}
```

### 13.5 Change Password
```http
POST /api/parent/change-password
```
**Description:** Change account password

**Request Body:**
```json
{
  "current_password": "oldpassword123",
  "new_password": "newpassword456"
}
```

**Response:**
```json
{
  "status": "SUCCESS",
  "message": "Password changed successfully"
}
```

### 13.6 Get Associated Children
```http
GET /api/parent/children
```
**Description:** View all associated children and their details

**Response:**
```json
{
  "children": [
    {
      "student_id": 2,
      "full_name": "Maya Patel",
      "student_number": "S-1002",
      "class_name": "Grade 10 - Algebra",
      "relationship": "Daughter",
      "linked_at": "2024-09-01"
    },
    {
      "student_id": 4,
      "full_name": "Sara Ahmed",
      "student_number": "S-1101",
      "class_name": "Grade 11 - Physics",
      "relationship": "Daughter",
      "linked_at": "2024-09-01"
    }
  ]
}
```

### 13.7 Request Child Association
```http
POST /api/parent/children/request
```
**Description:** Request to add another child to account (requires VP Academic approval)

**Request Body:**
```json
{
  "student_number": "S-1201",
  "relationship": "Son",
  "reason": "I am the legal guardian"
}
```

**Response:**
```json
{
  "request_id": 5,
  "status": "PENDING_APPROVAL",
  "submitted_at": "2025-10-15T14:00:00.000Z"
}
```

### 13.8 Get Login History
```http
GET /api/parent/login-history
```
**Description:** See login history for security monitoring

**Response:**
```json
{
  "login_history": [
    {
      "login_time": "2025-10-15T09:00:00.000Z",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "location": "Addis Ababa, Ethiopia"
    },
    {
      "login_time": "2025-10-14T18:30:00.000Z",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "location": "Addis Ababa, Ethiopia"
    }
  ]
}
```

### 13.9 Request Account Deactivation
```http
POST /api/parent/account/deactivate
```
**Description:** Request account deactivation (if child leaves school)

**Request Body:**
```json
{
  "reason": "Child has transferred to another school"
}
```

**Response:**
```json
{
  "request_id": 6,
  "status": "PENDING",
  "submitted_at": "2025-10-15T14:30:00.000Z"
}
```

---

## 14. Parent-Teacher Conference Scheduling

### 14.1 Get Conference Schedule
```http
GET /api/parent/conferences/schedule
```
**Description:** Get upcoming parent-teacher conference dates and times

**Response:**
```json
{
  "conferences": [
    {
      "conference_id": 1,
      "title": "Parent-Teacher Conference - Semester 1",
      "date": "2025-10-25",
      "time_slots": [
        { "time": "09:00-09:30", "available": true },
        { "time": "09:30-10:00", "available": false },
        { "time": "10:00-10:30", "available": true }
      ],
      "location": "Main Hall",
      "teachers_available": ["Alicia Gomez", "Mr. Johnson"]
    }
  ]
}
```

### 14.2 Book Conference Slot
```http
POST /api/parent/conferences/book
```
**Description:** Select and book a specific time slot

**Request Body:**
```json
{
  "conference_id": 1,
  "time_slot": "09:00-09:30",
  "teacher_id": 5,
  "student_id": 2
}
```

**Response:**
```json
{
  "booking_id": 10,
  "status": "CONFIRMED",
  "conference_date": "2025-10-25",
  "time_slot": "09:00-09:30",
  "teacher": "Alicia Gomez",
  "booked_at": "2025-10-15T15:00:00.000Z"
}
```

### 14.3 Get Conference History
```http
GET /api/parent/conferences/history
```
**Description:** See past meetings with teachers

**Response:**
```json
{
  "history": [
    {
      "booking_id": 5,
      "conference_date": "2025-09-20",
      "time_slot": "10:00-10:30",
      "teacher": "Alicia Gomez",
      "student": "Maya Patel",
      "notes": "Discussed academic progress in Mathematics",
      "status": "COMPLETED"
    }
  ]
}
```

### 14.4 Cancel Conference Booking
```http
DELETE /api/parent/conferences/:bookingId
```
**Description:** Cancel a booked conference slot

**Response:**
```json
{
  "status": "CANCELLED",
  "cancelled_at": "2025-10-15T15:30:00.000Z"
}
```

### 14.5 Reschedule Conference Booking
```http
PUT /api/parent/conferences/:bookingId/reschedule
```
**Description:** Reschedule a booked conference slot

**Request Body:**
```json
{
  "new_time_slot": "10:00-10:30",
  "new_date": "2025-10-26"
}
```

**Response:**
```json
{
  "status": "RESCHEDULED",
  "new_date": "2025-10-26",
  "new_time_slot": "10:00-10:30",
  "rescheduled_at": "2025-10-15T15:35:00.000Z"
}
```

---

## 15. PTSA Engagement (Advisory/Participatory)

### 15.1 Get PTSA Dashboard
```http
GET /api/parent/ptsa/dashboard
```
**Description:** Get PTSA-related information

**Response:**
```json
{
  "dashboard": {
    "upcoming_meetings": [
      {
        "meeting_id": 1,
        "title": "PTSA Monthly Meeting",
        "date": "2025-10-20",
        "time": "18:00-20:00",
        "location": "School Auditorium"
      }
    ],
    "recent_announcements": [...],
    "member_status": "ACTIVE_MEMBER"
  }
}
```

### 15.2 Get PTSA Meeting Schedule
```http
GET /api/parent/ptsa/meetings/schedule
```
**Description:** Get dates and times for upcoming PTSA meetings

**Response:**
```json
{
  "meetings": [
    {
      "meeting_id": 1,
      "title": "PTSA Monthly Meeting",
      "date": "2025-10-20",
      "time": "18:00-20:00",
      "location": "School Auditorium",
      "agenda": "Budget review, upcoming events"
    }
  ]
}
```

### 15.3 Get PTSA Meeting Minutes
```http
GET /api/parent/ptsa/meetings/:meetingId/minutes
```
**Description:** Access minutes from past PTSA meetings

**Response:**
```json
{
  "minutes": {
    "meeting_id": 1,
    "title": "PTSA Monthly Meeting",
    "date": "2025-09-20",
    "content": "The meeting was called to order at 18:00...",
    "action_items": [
      "Review budget proposal",
      "Plan winter fundraiser"
    ],
    "created_at": "2025-09-21T10:00:00.000Z"
  }
}
```

### 15.4 Submit Feedback to PTSA
```http
POST /api/parent/ptsa/feedback
```
**Description:** Send suggestions or feedback to PTSA executive committee

**Request Body:**
```json
{
  "subject": "PTSA Event Suggestion",
  "content": "I suggest organizing a cultural festival...",
  "category": "EVENT"
}
```

**Response:**
```json
{
  "feedback_id": 25,
  "status": "SUBMITTED",
  "submitted_at": "2025-10-15T16:00:00.000Z"
}
```

### 15.5 Get PTSA Announcements
```http
GET /api/parent/ptsa/announcements
```
**Description:** Get announcements specifically from PTSA

**Response:**
```json
{
  "announcements": [
    {
      "announcement_id": 10,
      "title": "PTSA Meeting Notice",
      "message": "Next PTSA meeting will be held on...",
      "published_at": "2025-10-14T10:00:00.000Z"
    }
  ]
}
```

### 15.6 Get PTSA Election Information
```http
GET /api/parent/ptsa/elections
```
**Description:** Get PTSA election information (view candidates, vote)

**Response:**
```json
{
  "election": {
    "election_id": 1,
    "title": "PTSA Executive Committee Election 2025",
    "status": "OPEN",
    "closing_date": "2025-10-30",
    "candidates": [
      {
        "candidate_id": 1,
        "name": "John Doe",
        "position": "President",
        "bio": "Experienced parent volunteer..."
      }
    ],
    "has_voted": false
  }
}
```

### 15.7 Submit PTSA Election Vote
```http
POST /api/parent/ptsa/elections/:electionId/vote
```
**Description:** Vote in PTSA election

**Request Body:**
```json
{
  "candidate_id": 1,
  "position": "President"
}
```

**Response:**
```json
{
  "status": "VOTE_RECORDED",
  "voted_at": "2025-10-15T16:30:00.000Z"
}
```

---

## 16. Mobile & Accessibility

### 16.1 Get Mobile Settings
```http
GET /api/parent/mobile/settings
```
**Description:** Get mobile-specific settings

**Response:**
```json
{
  "settings": {
    "push_notifications": {
      "enabled": true,
      "categories": ["grades", "attendance", "assignments"]
    },
    "offline_mode": {
      "enabled": true,
      "cache_size": "50MB"
    }
  }
}
```

### 16.2 Update Mobile Settings
```http
PUT /api/parent/mobile/settings
```
**Description:** Update mobile-specific settings

**Request Body:**
```json
{
  "push_notifications": {
    "enabled": true,
    "categories": ["grades", "attendance", "assignments", "announcements"]
  },
  "offline_mode": {
    "enabled": true,
    "cache_size": "100MB"
  }
}
```

**Response:**
```json
{
  "status": "UPDATED",
  "updated_at": "2025-10-15T17:00:00.000Z"
}
```

### 16.3 Get Accessibility Settings
```http
GET /api/parent/accessibility/settings
```
**Description:** Get accessibility settings

**Response:**
```json
{
  "settings": {
    "high_contrast": false,
    "screen_reader": false,
    "font_size": "medium",
    "language": "en"
  }
}
```

### 16.4 Update Accessibility Settings
```http
PUT /api/parent/accessibility/settings
```
**Description:** Update accessibility settings

**Request Body:**
```json
{
  "high_contrast": true,
  "screen_reader": false,
  "font_size": "large",
  "language": "am"
}
```

**Response:**
```json
{
  "status": "UPDATED",
  "updated_at": "2025-10-15T17:05:00.000Z"
}
```

---

## 17. Reports & Export

### 17.1 Generate Academic Report
```http
POST /api/parent/children/:childId/reports/academic
```
**Description:** Generate PDF report of child's academic performance

**Request Body:**
```json
{
  "term": "2025/2026 - Semester 1",
  "include_charts": true,
  "include_comments": true
}
```

**Response:**
```json
{
  "report_id": 50,
  "status": "GENERATING",
  "estimated_completion": "2025-10-15T17:10:00.000Z"
}
```

### 17.2 Generate Attendance Report
```http
POST /api/parent/children/:childId/reports/attendance
```
**Description:** Generate PDF report of child's attendance

**Request Body:**
```json
{
  "term": "2025/2026 - Semester 1",
  "include_calendar": true
}
```

**Response:**
```json
{
  "report_id": 51,
  "status": "GENERATING",
  "estimated_completion": "2025-10-15T17:12:00.000Z"
}
```

### 17.3 Generate Conduct Report
```http
POST /api/parent/children/:childId/reports/conduct
```
**Description:** Generate PDF report of child's conduct

**Request Body:**
```json
{
  "term": "2025/2026 - Semester 1",
  "include_comments": true
}
```

**Response:**
```json
{
  "report_id": 52,
  "status": "GENERATING",
  "estimated_completion": "2025-10-15T17:14:00.000Z"
}
```

### 17.4 Generate Combined Report
```http
POST /api/parent/children/:childId/reports/combined
```
**Description:** Generate combined report (academic + attendance + conduct)

**Request Body:**
```json
{
  "term": "2025/2026 - Semester 1",
  "include_charts": true,
  "include_comments": true
}
```

**Response:**
```json
{
  "report_id": 53,
  "status": "GENERATING",
  "estimated_completion": "2025-10-15T17:16:00.000Z"
}
```

### 17.5 Export Data to CSV
```http
GET /api/parent/children/:childId/export/csv
```
**Description:** Export child's data in CSV format

**Query Parameters:**
- `type`: Data type ("grades", "attendance", "all")
- `term`: Optional term filter

**Response:** CSV file download

### 17.6 Download Generated Report
```http
GET /api/parent/reports/:reportId/download
```
**Description:** Download a generated report

**Response:** File download

---

## 18. Support & Help

### 18.1 Get User Guide
```http
GET /api/parent/support/user-guide
```
**Description:** View help/FAQ guide for using parent portal

**Response:**
```json
{
  "guide": {
    "sections": [
      {
        "title": "Getting Started",
        "content": "Welcome to the Parent Portal..."
      },
      {
        "title": "Viewing Grades",
        "content": "To view your child's grades..."
      }
    ]
  }
}
```

### 18.2 Submit Help Request
```http
POST /api/parent/support/help-request
```
**Description:** Request technical support

**Request Body:**
```json
{
  "category": "TECHNICAL",
  "subject": "Login Issue",
  "description": "I am unable to log in to my account...",
  "priority": "HIGH"
}
```

**Response:**
```json
{
  "request_id": 100,
  "status": "SUBMITTED",
  "reference_number": "SUP-2025-100",
  "submitted_at": "2025-10-15T17:30:00.000Z"
}
```

### 18.3 Get Troubleshooting Tips
```http
GET /api/parent/support/troubleshooting
```
**Description:** See common issues and solutions

**Response:**
```json
{
  "tips": [
    {
      "issue": "Cannot view grades",
      "solution": "Ensure your child is linked to your account..."
    },
    {
      "issue": "Notifications not working",
      "solution": "Check your notification preferences..."
    }
  ]
}
```

### 18.4 Get Support Contact
```http
GET /api/parent/support/contact
```
**Description:** Get direct support contact information

**Response:**
```json
{
  "contact": {
    "phone": "+251911000000",
    "email": "support@smartschool.edu.et",
    "hours": "Monday-Friday, 8:00-17:00",
    "emergency_contact": "+251911111111"
  }
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid input data",
  "details": "student_id is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Notes

1. **Authentication**: All endpoints require JWT token with `PARENT` role
2. **Privacy**: Parents can only access data for their own linked children
3. **Rate Limiting**: API calls may be rate-limited to prevent abuse
4. **Data Validation**: All input data is validated before processing
5. **Audit Logging**: All actions are logged for security and compliance
6. **Mock Data**: Some endpoints (like payments) may return mock data in development
