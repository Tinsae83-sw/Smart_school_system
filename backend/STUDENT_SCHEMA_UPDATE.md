# Student Role Schema Update

## Overview
This document describes the database schema updates made to support the complete Student role functionality for the Smart School Connect system, aligned with Ethiopian high school (grades 9-12) requirements.

## Online Learning Capabilities

The schema now includes comprehensive support for online learning, allowing students to:

### Virtual Classes
- **Join live virtual classes** via Zoom/Google Meet integration
- **View scheduled sessions** with start/end times
- **Access session recordings** after class
- **Track attendance** with join/leave times and duration
- **Participate in chat** during live sessions

### Course Materials
- **Access digital course materials** (videos, PDFs, documents, links)
- **Track progress** on each material (completion percentage, time spent)
- **View materials in order** as organized by teachers
- **Download resources** for offline access

### Discussion Forums
- **Participate in class discussions** via threaded forums
- **Ask questions** and get answers from teachers/peers
- **Reply to posts** with threaded conversations
- **View pinned posts** for important announcements

### Session Tracking
- **Engagement scoring** based on participation
- **Attendance records** for virtual sessions
- **Duration tracking** for time spent in class

## New Models Added

### 1. Student Notes (`student_notes`)
- **Purpose**: Enable students to create, edit, and organize personal notes
- **Fields**:
  - `note_id`: Primary key
  - `student_id`: Reference to student
  - `title`: Note title
  - `content`: Note content
  - `subject`: Optional subject categorization
  - `tags`: Array of tags for organization
  - `created_at`, `updated_at`: Timestamps
- **Index**: `student_id` for efficient queries

### 2. AI Books System

#### AIBook (`ai_books`)
- **Purpose**: Store interactive AI-powered learning books
- **Fields**:
  - `book_id`: Primary key
  - `title`: Book title
  - `subject_id`: Optional reference to subject
  - `grade_level`: Target grade (9, 10, 11, 12)
  - `description`: Book description
  - `content`: JSON structure for book content
  - `author`: Author name
  - `cover_image_url`: Book cover image
  - `is_active`: Active status
- **Relations**: Links to Subject, BookProgress, BookQuiz

#### BookProgress (`book_progress`)
- **Purpose**: Track student reading progress
- **Fields**:
  - `progress_id`: Primary key
  - `book_id`: Reference to AIBook
  - `student_id`: Reference to student
  - `current_page`: Current page number
  - `total_pages`: Total pages in book
  - `completion_percentage`: Progress percentage
  - `last_read_at`: Last read timestamp
- **Unique Constraint**: One progress record per student per book

#### BookBookmark (`book_bookmarks`)
- **Purpose**: Allow students to bookmark pages
- **Fields**:
  - `bookmark_id`: Primary key
  - `book_id`: Reference to AIBook
  - `student_id`: Reference to student
  - `page_number`: Bookmarked page
  - `section_title`: Optional section title
  - `note`: Optional note about bookmark

#### BookHighlight (`book_highlights`)
- **Purpose**: Enable text highlighting in books
- **Fields**:
  - `highlight_id`: Primary key
  - `book_id`: Reference to AIBook
  - `student_id`: Reference to student
  - `page_number`: Page number
  - `text_content`: Highlighted text
  - `color`: Highlight color (default: yellow)
  - `note`: Optional note

#### BookAnnotation (`book_annotations`)
- **Purpose**: Allow students to add personal annotations
- **Fields**:
  - `annotation_id`: Primary key
  - `book_id`: Reference to AIBook
  - `student_id`: Reference to student
  - `page_number`: Page number
  - `annotation_type`: NOTE, QUESTION, SUMMARY
  - `content`: Annotation content

#### BookQuiz (`book_quizzes`)
- **Purpose**: AI-generated quizzes for testing understanding
- **Fields**:
  - `quiz_id`: Primary key
  - `book_id`: Reference to AIBook
  - `title`: Quiz title
  - `questions`: JSON array of quiz questions
  - `passing_score`: Minimum passing score

#### QuizAttempt (`quiz_attempts`)
- **Purpose**: Track student quiz attempts and results
- **Fields**:
  - `attempt_id`: Primary key
  - `quiz_id`: Reference to BookQuiz
  - `student_id`: Reference to student
  - `answers`: JSON of student answers
  - `score`: Achieved score
  - `percentage`: Score percentage
  - `passed`: Pass/fail status
  - `attempted_at`: Attempt timestamp

### 3. Student Notification Preferences (`student_notification_preferences`)
- **Purpose**: Allow students to customize notification settings
- **Fields**:
  - `preference_id`: Primary key
  - `student_id`: Reference to student (unique)
  - Email toggles: grades, attendance, conduct, assignments, announcements
  - SMS toggles: grades, attendance, conduct, assignments, announcements
  - In-app toggles: grades, attendance, conduct, assignments, announcements
- **Defaults**: Email and in-app enabled, SMS disabled

### 4. Student Login History (`student_login_history`)
- **Purpose**: Track student login activity for security
- **Fields**:
  - `login_id`: Primary key
  - `student_id`: Reference to student
  - `login_time`: Login timestamp
  - `logout_time`: Logout timestamp
  - `ip_address`: IP address
  - `user_agent`: Browser/device info
  - `device_type`: MOBILE, DESKTOP, TABLET
  - `login_status`: SUCCESS, FAILED

### 5. Student Profile (`student_profiles`)
- **Purpose**: Extended student profile information
- **Fields**:
  - `profile_id`: Primary key
  - `student_id`: Reference to student (unique)
  - `phone_number`: Contact phone
  - `email_address`: Contact email
  - `home_address`: Home address
  - `profile_picture_url`: Profile image
  - `bio`: Personal bio
  - `interests`: Array of interests

### 6. VirtualClass (`virtual_classes`)
- **Purpose**: Manage virtual/online classes with video conferencing
- **Fields**:
  - `virtual_class_id`: Primary key
  - `class_subject_id`: Reference to ClassSubject
  - `title`: Class title
  - `description`: Class description
  - `meeting_link`: Zoom/Google Meet link
  - `meeting_id`: Meeting ID
  - `meeting_password`: Meeting password
  - `is_recurring`: Recurring class flag
  - `recurring_pattern`: DAILY, WEEKLY, BIWEEKLY
  - `max_participants`: Maximum participants
  - `is_active`: Active status
  - `created_by`: Creator user_id

### 7. LiveSession (`live_sessions`)
- **Purpose**: Individual live session instances
- **Fields**:
  - `session_id`: Primary key
  - `virtual_class_id`: Reference to VirtualClass
  - `title`: Session title
  - `scheduled_start`: Scheduled start time
  - `scheduled_end`: Scheduled end time
  - `actual_start`: Actual start time
  - `actual_end`: Actual end time
  - `status`: SCHEDULED, LIVE, ENDED, CANCELLED
  - `recording_url`: Session recording link
  - `chat_enabled`: Chat enabled flag
  - `recording_enabled`: Recording enabled flag
  - `notes`: Session notes

### 8. SessionAttendance (`session_attendances`)
- **Purpose**: Track student attendance in live sessions
- **Fields**:
  - `attendance_id`: Primary key
  - `session_id`: Reference to LiveSession
  - `student_id`: Reference to student
  - `join_time`: Join timestamp
  - `leave_time`: Leave timestamp
  - `duration_minutes`: Duration in minutes
  - `attended`: Attendance status
  - `engagement_score`: Participation score
  - `notes`: Attendance notes
- **Unique Constraint**: One record per student per session

### 9. CourseMaterial (`course_materials`)
- **Purpose**: Digital course materials for online learning
- **Fields**:
  - `material_id`: Primary key
  - `class_subject_id`: Reference to ClassSubject
  - `title`: Material title
  - `description`: Material description
  - `material_type`: VIDEO, PDF, DOCUMENT, LINK, AUDIO
  - `file_url`: File URL
  - `file_size`: File size in bytes
  - `duration_minutes`: Duration for video/audio
  - `order`: Display order
  - `is_published`: Published status
  - `created_by`: Creator user_id

### 10. MaterialProgress (`material_progress`)
- **Purpose**: Track student progress on course materials
- **Fields**:
  - `progress_id`: Primary key
  - `material_id`: Reference to CourseMaterial
  - `student_id`: Reference to student
  - `completed`: Completion status
  - `completion_percentage`: Progress percentage
  - `last_accessed`: Last access timestamp
  - `time_spent_minutes`: Time spent in minutes
- **Unique Constraint**: One record per student per material

### 11. DiscussionForum (`discussion_forums`)
- **Purpose**: Class discussion forums
- **Fields**:
  - `forum_id`: Primary key
  - `class_subject_id`: Reference to ClassSubject
  - `title`: Forum title
  - `description`: Forum description
  - `is_active`: Active status
  - `created_by`: Creator user_id

### 12. ForumPost (`forum_posts`)
- **Purpose**: Posts and replies in discussion forums
- **Fields**:
  - `post_id`: Primary key
  - `forum_id`: Reference to DiscussionForum
  - `student_id`: Student author (optional)
  - `teacher_id`: Teacher author (optional)
  - `parent_post_id`: Parent post for replies
  - `content`: Post content
  - `is_pinned`: Pinned status
- **Self-referencing relation**: For threaded replies

## Enhanced Models

### Assignment Model Updates
Added fields for resubmission support:
- `allow_resubmission`: Boolean flag to enable resubmissions
- `resubmission_deadline`: Deadline for resubmissions
- `max_resubmissions`: Maximum number of allowed resubmissions

### Submission Model Updates
Added fields for resubmission tracking:
- `resubmission_number`: Track submission attempt number
- `parent_submission_id`: Reference to original submission
- `feedback_viewed`: Track if student viewed feedback
- Updated unique constraint to include `resubmission_number`

## Updated Relations

### Student Model
Added relations to new models:
- `student_notes`: StudentNote[]
- `book_progress`: BookProgress[]
- `book_bookmarks`: BookBookmark[]
- `book_highlights`: BookHighlight[]
- `book_annotations`: BookAnnotation[]
- `quiz_attempts`: QuizAttempt[]
- `notification_preferences`: StudentNotificationPreference?
- `login_history`: StudentLoginHistory[]
- `student_profile`: StudentProfile?
- `peer_evaluations_received`: StudentPeerEvaluation[] (StudentEvaluated)
- `peer_evaluations_given`: StudentPeerEvaluation[] (StudentEvaluator)

### Subject Model
Added relation:
- `ai_books`: AIBook[]

### StudentPeerEvaluation Model
Added relations:
- `evaluated_student`: Student (StudentEvaluated)
- `evaluator_student`: Student (StudentEvaluator)

## Privacy & Data Isolation

All student-specific models include:
- `student_id` foreign key to ensure data isolation
- Indexes on `student_id` for efficient querying
- Cascade delete to maintain referential integrity
- Students can only access their own data through application-level permissions

## Next Steps

1. **Run Prisma Migration**:
   ```bash
   cd backend
   npx prisma migrate dev --name add_student_functionality
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Implement API Endpoints**:
   - Student notes CRUD operations
   - AI book access and progress tracking
   - Notification preference management
   - Profile management
   - Resubmission logic
   - Virtual class attendance
   - Course material progress
   - Discussion forum participation

4. **Create Frontend Components**:
   - Student dashboard with quick stats
   - Notes interface
   - AI book reader
   - Notification settings
   - Profile settings
   - Virtual classroom interface
   - Course materials viewer
   - Discussion forum

## Functionality Mapping

The schema supports all 17 functional areas from the Student specification:

1. ✅ Dashboard & Overview (via existing models + new relations)
2. ✅ Academic Performance (existing Grade, ExamResult models)
3. ✅ Transcript (existing Transcript model)
4. ✅ Attendance (existing AttendanceRecord model)
5. ✅ Conduct (existing ConductGrade model)
6. ✅ Assignments & Submissions (enhanced Assignment, Submission models)
7. ✅ Examinations (existing Exam, ExamResult models)
8. ✅ Communication (existing Message model)
9. ✅ Announcements (existing Announcement model)
10. ✅ Peer Evaluation (existing StudentPeerEvaluation model)
11. ✅ Take Notes (new StudentNote model)
12. ✅ AI-Supported Books (new AIBook system models)
13. ✅ Timetable (existing ClassSchedule model)
14. ✅ Profile & Settings (new StudentProfile, StudentNotificationPreference models)
15. ✅ Reports & Export (existing Report model)
16. ✅ Mobile & Accessibility (application-level implementation)
17. ✅ Support & Help (application-level implementation)

## Notes

- All timestamps use UTC via `@default(now())`
- JSON fields are used for flexible data structures (book content, quiz questions, etc.)
- Decimal precision is set appropriately for scores and percentages
- Unique constraints prevent duplicate records where appropriate
- Indexes optimize common query patterns
