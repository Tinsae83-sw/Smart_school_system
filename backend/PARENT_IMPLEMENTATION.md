# Parent Role Implementation

## Overview

This document summarizes the complete implementation of the Parent role functionality for the Smart School Connect system. The Parent role is designed for Ethiopian high school grades 9–12, providing parents with comprehensive access to their children's academic progress, attendance, conduct, and school communication.

## Implementation Date

November 2025

## Database Schema Additions

### New Parent-Specific Tables

The following tables were added to `prisma/schema.prisma` to support Parent functionality:

#### 1. Conduct & Behavior Tracking

**ConductGrade**
- Stores term-wise conduct grades for students
- Includes rating (1-5 scale), letter grade, and teacher comments
- Linked to students via student_id
- Unique constraint on (student_id, term, academic_year)

**ConductComment**
- Stores individual teacher comments on student conduct
- Linked to ConductGrade
- Includes subject context and timestamp

**ConductIncident**
- Records behavioral incidents (minor, major, serious)
- Includes description, resolution, and status tracking
- Links to student and reporter

#### 2. Parent-Teacher Conference

**ParentTeacherConference**
- Manages scheduled parent-teacher conference events
- Includes date, time, location, and academic term
- Status tracking (SCHEDULED, COMPLETED, CANCELLED)

**ConferenceBooking**
- Records parent bookings for conference slots
- Links parent, student, and teacher
- Includes reminder tracking

#### 3. Parent Settings & Preferences

**ParentNotificationPreference**
- Stores notification preferences per parent
- Granular control for email, SMS, and in-app notifications
- Categories: grades, attendance, conduct, assignments, announcements

**ParentLoginHistory**
- Tracks parent login sessions
- Includes IP address, device type, and login status

#### 4. Child Association Requests

**ParentChildAssociationRequest**
- Manages parent requests to link to additional children
- Includes relationship type and reason
- Approval workflow with VP Academic review

#### 5. National Exam Results

**NationalExamResult**
- Stores EGSECE (Grade 10) and ESSLCE (Grade 12) results
- Includes subject-wise scores, overall grade, division
- School and regional ranking
- Certificate URL and verification status

#### 6. Student Peer Evaluations

**StudentPeerEvaluation**
- Stores peer evaluation scores for students
- Evaluates teamwork, participation, collaboration, respect
- Anonymous evaluation support
- Term and academic year tracking

## API Endpoints

### Base Path: `/api/parent`

All endpoints require authentication and Parent role authorization.

### 1. Dashboard & Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Get parent dashboard with all children summary |
| GET | `/children/:childId/dashboard` | Get specific child's dashboard |
| GET | `/children/:childId/quick-stats` | Get quick statistics for a child |
| GET | `/children/:childId/activity-feed` | Get recent activity feed |

### 2. Academic Performance (Read-Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/children/:childId/grades` | Get current grades by subject |
| GET | `/children/:childId/grade-distribution` | Get grade distribution chart data |
| GET | `/children/:childId/subjects/:subjectId/performance` | Get performance for specific subject |
| GET | `/children/:childId/term-reports` | Get term reports |
| GET | `/children/:childId/grade-history` | Get historical grade data |
| GET | `/children/:childId/class-comparison` | Compare with class averages |
| GET | `/children/:childId/subject-ranks` | Get subject-wise rankings |
| GET | `/children/:childId/progress-chart` | Get progress chart data |

### 3. Attendance (Read-Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/children/:childId/attendance/summary` | Get attendance summary |
| GET | `/children/:childId/attendance/daily` | Get daily attendance records |
| GET | `/children/:childId/attendance/monthly` | Get monthly calendar view |
| GET | `/children/:childId/attendance/trends` | Get attendance trends |
| GET | `/children/:childId/attendance/absences` | Get absence reasons |
| GET | `/children/:childId/attendance/alerts` | Get attendance alerts |
| GET | `/children/:childId/attendance/export` | Export attendance report |

### 4. Conduct (Read-Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/children/:childId/conduct/summary` | Get conduct summary |
| GET | `/children/:childId/conduct/history` | Get conduct history |
| GET | `/children/:childId/conduct/comments` | Get teacher comments |
| GET | `/children/:childId/conduct/incidents` | Get conduct incidents |
| GET | `/children/:childId/conduct/trends` | Get conduct trends |

### 5. Transcript (Read-Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/children/:childId/transcript` | Get official transcript |
| GET | `/children/:childId/transcript/cumulative` | Get cumulative transcript |
| GET | `/children/:childId/transcript/download` | Download transcript PDF |
| POST | `/children/:childId/transcript/print` | Generate print URL |
| GET | `/children/:childId/transcript/verify` | Verify transcript authenticity |

### 6. Assignments & Submissions (Read-Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/children/:childId/assignments` | Get current assignments |
| GET | `/children/:childId/assignments/deadlines` | Get assignment deadlines calendar |
| GET | `/children/:childId/assignments/submitted` | Get submitted assignments |
| GET | `/children/:childId/assignments/scores` | Get assignment scores |
| GET | `/children/:childId/assignments/missing` | Get missing/overdue assignments |
| GET | `/children/:childId/assignments/:assignmentId/files` | Download assignment files |

### 7. Exam Results (Read-Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/children/:childId/exams/schedule` | Get upcoming exam schedule |
| GET | `/children/:childId/exams/results` | Get exam results |
| GET | `/children/:childId/exams/national` | Get national exam results (EGSECE/ESSLCE) |
| GET | `/children/:childId/exams/analysis` | Get exam performance analysis |
| GET | `/children/:childId/exams/report/download` | Download exam report |

### 8. Communication with Teachers (Write)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/messages/send` | Send message to teacher |
| POST | `/messages/send-vp-academic` | Send message to VP Academic |
| GET | `/messages` | Get message history |
| GET | `/messages/:threadId` | Get message thread |
| POST | `/messages/:messageId/reply` | Reply to message |
| PUT | `/messages/:messageId/read` | Mark message as read |
| PUT | `/messages/read-all` | Mark all messages as read |

### 9. Communication with Administration (Write)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/messages/principal` | Send message to Principal |
| POST | `/messages/vp-admin` | Send message to VP Admin |
| POST | `/grievances` | Submit grievance |
| POST | `/feedback` | Submit feedback |
| GET | `/grievances` | Track grievance status |
| GET | `/grievances/:grievanceId` | Get grievance details |

### 10. Announcements & Notices (Read-Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/announcements` | Get school announcements |
| GET | `/announcements/parent-specific` | Get parent-specific announcements |
| GET | `/announcements/ptsa` | Get PTSA announcements |
| GET | `/announcements/urgent` | Get urgent notices |
| GET | `/events/calendar` | Get event calendar |

### 11. Peer Evaluations (Read-Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/children/:childId/peer-evaluations` | Get peer evaluation summary |
| GET | `/children/:childId/peer-evaluations/:evaluationId/comments` | Get peer comments |
| GET | `/children/:childId/peer-evaluations/:evaluationId/rating` | Get peer rating |
| GET | `/children/:childId/peer-evaluations/:evaluationId/comparison` | Get class comparison |

### 12. Fee Management (Mock/Read-Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/children/:childId/fees/structure` | Get fee structure |
| GET | `/children/:childId/payments/history` | Get payment history |
| GET | `/children/:childId/payments/balance` | Get outstanding balance |
| GET | `/children/:childId/payments/:paymentId/receipt` | Generate fee receipt |
| POST | `/messages/fee-inquiry` | Request fee clarification |

### 13. Parent Profile & Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get parent profile |
| PUT | `/profile` | Update parent profile |
| GET | `/notifications/preferences` | Get notification preferences |
| PUT | `/notifications/preferences` | Update notification preferences |
| POST | `/change-password` | Change password |
| GET | `/children` | Get associated children |
| POST | `/children/request` | Request child association |
| GET | `/login-history` | Get login history |
| POST | `/account/deactivate` | Request account deactivation |

### 14. Parent-Teacher Conference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/conferences/schedule` | Get conference schedule |
| POST | `/conferences/book` | Book conference slot |
| GET | `/conferences/history` | Get conference history |
| DELETE | `/conferences/:bookingId` | Cancel booking |
| PUT | `/conferences/:bookingId/reschedule` | Reschedule booking |

### 15. PTSA Engagement

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ptsa/dashboard` | Get PTSA dashboard |
| GET | `/ptsa/meetings/schedule` | Get PTSA meeting schedule |
| GET | `/ptsa/meetings/:meetingId/minutes` | Get meeting minutes |
| POST | `/ptsa/feedback` | Submit PTSA feedback |
| GET | `/ptsa/announcements` | Get PTSA announcements |
| GET | `/ptsa/elections` | Get election information |
| POST | `/ptsa/elections/:electionId/vote` | Submit election vote |

### 16. Mobile & Accessibility

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mobile/settings` | Get mobile settings |
| PUT | `/mobile/settings` | Update mobile settings |
| GET | `/accessibility/settings` | Get accessibility settings |
| PUT | `/accessibility/settings` | Update accessibility settings |

### 17. Reports & Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/children/:childId/reports/academic` | Generate academic report |
| POST | `/children/:childId/reports/attendance` | Generate attendance report |
| POST | `/children/:childId/reports/conduct` | Generate conduct report |
| POST | `/children/:childId/reports/combined` | Generate combined report |
| GET | `/children/:childId/export/csv` | Export data to CSV |
| GET | `/reports/:reportId/download` | Download generated report |

### 18. Support & Help

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/support/user-guide` | Get user guide |
| POST | `/support/help-request` | Submit help request |
| GET | `/support/troubleshooting` | Get troubleshooting tips |
| GET | `/support/contact` | Get support contact |

### 19. Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | Get user notifications |

## Authentication & Authorization

### Middleware

**Authentication Middleware** (`src/middleware/authMiddleware.js`)
- `authenticate()`: General authentication that validates Bearer token and attaches user info to request
- Checks session validity and expiration
- Updates last activity timestamp

**Role Authorization Middleware** (`src/middleware/roleMiddleware.js`)
- `authorize(allowedRoles)`: Role-based authorization
- Validates user role against allowed roles
- Attaches role-specific IDs (parent_id, student_id, teacher_id) to request

### Access Control

All Parent routes use:
1. `authenticate` middleware for token validation
2. `authorize(['PARENT'])` middleware for role verification

### Child Access Verification

Parent endpoints that access child data include verification to ensure:
- The parent is linked to the requested child via `StudentParent` table
- Access is denied if no parent-child relationship exists

## Controller Implementation

**File**: `src/controllers/parentController.js`

The controller implements 70+ endpoint handlers organized into 18 functional sections:

1. Dashboard & Overview (4 endpoints)
2. Academic Performance (8 endpoints)
3. Attendance (7 endpoints)
4. Conduct (5 endpoints)
5. Transcript (5 endpoints)
6. Assignments (6 endpoints)
7. Exams (5 endpoints)
8. Teacher Communication (7 endpoints)
9. Admin Communication (5 endpoints)
10. Announcements (5 endpoints)
11. Peer Evaluations (4 endpoints)
12. Fee Management (5 endpoints)
13. Profile & Settings (8 endpoints)
14. Conferences (5 endpoints)
15. PTSA (7 endpoints)
16. Mobile & Accessibility (4 endpoints)
17. Reports (6 endpoints)
18. Support (4 endpoints)

Each endpoint includes:
- Parent-child relationship verification where applicable
- Error handling with appropriate HTTP status codes
- Data transformation for API responses
- Mock data where database tables are not yet populated

## Route Configuration

**File**: `src/routes/parentRoutes.js`

All routes are configured with:
- Express Router
- Authentication middleware applied globally
- Role authorization for PARENT role
- RESTful path structure following `/api/parent` base

## Server Integration

**File**: `src/server.js`

Parent routes are integrated at line 84-85:
```javascript
const parentRoutes = require('./routes/parentRoutes');
app.use('/api/parent', parentRoutes);
```

## Ethiopian Context Features

The implementation includes Ethiopian-specific features:

1. **National Exams**: EGSECE (Grade 10) and ESSLCE (Grade 12) result tracking
2. **Grading System**: Support for Ethiopian grading scales and divisions
3. **Academic Years**: Ethiopian academic year format (e.g., 2025/2026)
4. **Semester System**: Two-semester academic structure
5. **Currency**: Ethiopian Birr (ETB) for fee management
6. **Language Support**: Preferred language field for Amharic/English

## Security Considerations

1. **Authentication**: Token-based authentication with session validation
2. **Authorization**: Role-based access control
3. **Child Access**: Strict parent-child relationship verification
4. **Data Privacy**: Parents can only access their linked children's data
5. **Session Management**: Automatic session expiration tracking
6. **Login History**: Audit trail of parent logins

## Testing Recommendations

### Manual Testing Checklist

- [ ] Test parent login and token generation
- [ ] Verify parent can view their linked children
- [ ] Test child access denial for non-linked children
- [ ] Verify grade viewing functionality
- [ ] Test attendance calendar view
- [ ] Test message sending to teachers
- [ ] Test grievance submission
- [ ] Verify notification preferences update
- [ ] Test conference booking
- [ ] Verify report generation

### API Testing

Use tools like Postman or curl to test endpoints. Example:

```bash
# Get parent dashboard
curl -X GET http://localhost:5000/api/parent/dashboard \
  -H "Authorization: Bearer <token>"

# Get child grades
curl -X GET http://localhost:5000/api/parent/children/1/grades \
  -H "Authorization: Bearer <token>"
```

## Future Enhancements

1. **Real-time Notifications**: WebSocket integration for real-time alerts
2. **Mobile App**: Dedicated mobile application for parents
3. **SMS Integration**: Actual SMS notification delivery
4. **Payment Gateway**: Integration with Ethiopian payment systems
5. **Video Conferencing**: Virtual parent-teacher conferences
6. **AI Insights**: AI-powered academic performance recommendations
7. **Multi-language**: Full Amharic language support

## Related Documentation

- `PARENT_API_SPECIFICATION.md`: Detailed API specification with request/response formats
- `PRINCIPAL_IMPLEMENTATION.md`: Principal role implementation reference
- `schema.prisma`: Complete database schema

## Support

For issues or questions regarding the Parent implementation, contact the development team or refer to the support endpoints:
- GET `/api/parent/support/user-guide`
- GET `/api/parent/support/contact`

---

**Implementation Status**: ✅ Complete

**Last Updated**: November 2025
