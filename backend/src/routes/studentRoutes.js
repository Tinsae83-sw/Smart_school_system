const express = require("express");
const { requireStudent } = require("../middleware/authMiddleware");
const {
  users,
  classes,
  rosters,
  assignments,
  submissions,
  attendanceRecords,
  messages,
  notifications,
  conductRecords,
  peerEvaluations,
  performancePredictions,
  announcements,
  studentNotes,
  aiBooks,
  studentBookAccess,
  learningTutorials,
  bookRepository,
} = require("../data/mockData");

const router = express.Router();
router.use(requireStudent);

const allowedFileExtensions = ["pdf", "docx", "doc", "jpg", "jpeg", "png"];
const maxUploadSize = 10 * 1024 * 1024;

function getStudentClassIds(studentId) {
  return rosters.filter((entry) => entry.students.some((student) => student.student_id === studentId)).map((entry) => entry.class_id);
}

function getStudentAssignments(studentId) {
  const classIds = getStudentClassIds(studentId);
  return assignments.filter((assignment) => classIds.includes(assignment.class_id));
}

function getStudentSubmission(studentId, assignmentId) {
  return submissions.find((submission) => submission.student_id === studentId && submission.assignment_id === assignmentId);
}

function getStudentAttendanceEntries(studentId) {
  const records = [];
  attendanceRecords.forEach((record) => {
    const matches = record.entries.filter((entry) => entry.student_id === studentId);
    matches.forEach((entry) => {
      records.push({
        attendance_id: record.attendance_id,
        class_id: record.class_id,
        date: record.date,
        status: entry.status,
        remark: entry.remark,
      });
    });
  });
  return records;
}

function getStudentNotifications() {
  return notifications.map((notification) => ({ ...notification }));
}

function getStudentMessages(studentName) {
  return messages.filter((thread) => thread.recipient_role === "Student" && thread.recipient_name === studentName);
}

router.get("/profile", (req, res) => {
  const user = req.user;
  res.json({
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    phone_number: user.phone_number,
    profile_picture_url: user.profile_picture_url,
    student_number: user.student_number,
    current_class_id: user.current_class_id,
  });
});

router.put("/profile", (req, res) => {
  const { full_name, phone_number } = req.body;
  const user = req.user;
  user.full_name = full_name || user.full_name;
  user.phone_number = phone_number || user.phone_number;
  res.json({ success: true, profile: { ...user } });
});

router.post("/change-password", (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Both current and new passwords are required." });
  }
  if (req.user.password_hash !== currentPassword) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  req.user.password_hash = newPassword;
  res.json({ success: true, message: "Password updated successfully." });
});

router.get("/dashboard", (req, res) => {
  const studentId = req.user.user_id;
  const studentAssignments = getStudentAssignments(studentId);
  const now = new Date();
  const upcomingAssignments = studentAssignments
    .filter((assignment) => new Date(assignment.due_date) > now)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);
  const scoredSubmissions = submissions
    .filter((submission) => submission.student_id === studentId && submission.score != null)
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
    .slice(0, 5);
  const attendanceEntries = getStudentAttendanceEntries(studentId);
  const totalDays = attendanceEntries.length;
  const presentDays = attendanceEntries.filter((entry) => entry.status === "PRESENT").length;
  const attendancePercentage = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;
  const unreadNotifications = notifications.filter((item) => !item.read).length;

  res.json({
    upcoming_assignments: upcomingAssignments,
    recent_grades: scoredSubmissions,
    notifications: getStudentNotifications(),
    attendance_summary: {
      present: presentDays,
      total: totalDays,
      percentage: attendancePercentage,
    },
    conduct: conductRecords.find((record) => record.student_id === studentId) || null,
  });
});

router.get("/assignments", (req, res) => {
  const studentId = req.user.user_id;
  const studentAssignments = getStudentAssignments(studentId);
  const enriched = studentAssignments.map((assignment) => {
    const submission = getStudentSubmission(studentId, assignment.assignment_id);
    const isOpen = new Date(assignment.due_date) > new Date();
    const status = submission ? (submission.score == null ? "SUBMITTED" : "GRADED") : isOpen ? "OPEN" : "CLOSED";
    return {
      ...assignment,
      status,
      submission: submission || null,
    };
  });
  res.json(enriched);
});

router.post("/assignments/:assignmentId/submit", (req, res) => {
  const studentId = req.user.user_id;
  const assignmentId = Number(req.params.assignmentId);
  const { file_name, file_size, file_type } = req.body;

  if (!file_name || !file_size || !file_type) {
    return res.status(400).json({ error: "file_name, file_size, and file_type are required." });
  }

  const extension = file_name.split(".").pop()?.toLowerCase();
  if (!extension || !allowedFileExtensions.includes(extension)) {
    return res.status(400).json({ error: `Invalid file type. Allowed types: ${allowedFileExtensions.join(", ")}.` });
  }
  if (file_size > maxUploadSize) {
    return res.status(400).json({ error: "File size exceeds the 10MB limit." });
  }

  const assignment = assignments.find((item) => item.assignment_id === assignmentId);
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found." });
  }

  const existing = getStudentSubmission(studentId, assignmentId);
  const submittedAt = new Date().toISOString();
  const status = new Date(assignment.due_date) >= new Date() ? "ON_TIME" : "LATE";

  if (existing) {
    existing.submitted_at = submittedAt;
    existing.file_url = file_name;
    existing.status = status;
    existing.score = existing.score;
    existing.grade = existing.grade;
    existing.feedback = existing.feedback;
    res.json({ success: true, submission: existing, message: "Submission updated successfully." });
    return;
  }

  const studentRecord = rosters
    .flatMap((entry) => entry.students)
    .find((student) => student.student_id === studentId);

  const submission = {
    submission_id: submissions.length + 1,
    assignment_id: assignmentId,
    student_id: studentId,
    student_name: req.user.full_name,
    submitted_at: submittedAt,
    file_url: file_name,
    status,
    score: null,
    grade: null,
    feedback: null,
  };
  submissions.push(submission);
  res.json({ success: true, submission, message: "Assignment submitted successfully." });
});

router.get("/grades", (req, res) => {
  const studentId = req.user.user_id;
  const scored = submissions
    .filter((submission) => submission.student_id === studentId)
    .map((submission) => {
      const assignment = assignments.find((item) => item.assignment_id === submission.assignment_id);
      return {
        ...submission,
        subject: assignment?.class_id ? classes.find((cls) => cls.class_id === assignment.class_id)?.subject_name : undefined,
        assignment_title: assignment?.title,
      };
    });
  res.json(scored);
});

router.get("/attendance", (req, res) => {
  const studentId = req.user.user_id;
  res.json(getStudentAttendanceEntries(studentId));
});

router.get("/attendance/summary", (req, res) => {
  const studentId = req.user.user_id;
  const entries = getStudentAttendanceEntries(studentId);
  const byMonth = entries.reduce((summary, entry) => {
    const month = entry.date.slice(0, 7);
    summary[month] = summary[month] || { present: 0, absent: 0, late: 0, total: 0 };
    summary[month].total += 1;
    summary[month][entry.status.toLowerCase()] += 1;
    return summary;
  }, {});
  const summary = Object.entries(byMonth).map(([month, stats]) => ({
    month,
    ...stats,
    percentage: stats.total ? Math.round((stats.present / stats.total) * 100) : 0,
  }));
  res.json(summary);
});

router.get("/conduct", (req, res) => {
  const studentId = req.user.user_id;
  res.json(conductRecords.filter((record) => record.student_id === studentId));
});

router.get("/peer-evaluations", (req, res) => {
  const studentId = req.user.user_id;
  const classIds = getStudentClassIds(studentId);
  res.json(peerEvaluations.filter((evaluation) => classIds.includes(evaluation.class_id)));
});

router.get("/messages", (req, res) => {
  const studentName = req.user.full_name;
  res.json(getStudentMessages(studentName));
});

router.post("/messages", (req, res) => {
  const studentName = req.user.full_name;
  const { thread_id, body } = req.body;
  if (!thread_id || !body) {
    return res.status(400).json({ error: "thread_id and body are required." });
  }
  const thread = messages.find((item) => item.thread_id === thread_id && item.recipient_name === studentName);
  if (!thread) {
    return res.status(404).json({ error: "Message thread not found." });
  }
  thread.messages.push({ sender: "student", body, created_at: new Date().toISOString() });
  thread.last_message = body;
  thread.unread = 0;
  res.json({ success: true, thread });
});

router.get("/notifications", (req, res) => {
  res.json(getStudentNotifications());
});

router.post("/notifications/read", (req, res) => {
  const { notificationId } = req.body;
  const notification = notifications.find((item) => item.id === notificationId);
  if (!notification) {
    return res.status(404).json({ error: "Notification not found." });
  }
  notification.read = true;
  res.json({ success: true, notification });
});

router.get("/performance", (req, res) => {
  const studentId = req.user.user_id;
  const prediction = performancePredictions.find((item) => item.student_id === studentId);
  if (!prediction) {
    return res.status(404).json({ error: "Prediction not found." });
  }
  res.json(prediction);
});

// ----------------------------
// NOTES (FR-S35, FR-S36)
// ----------------------------
router.get("/notes", (req, res) => {
  const studentId = req.user.user_id;
  const notes = studentNotes.filter((n) => n.student_id === studentId);
  res.json(notes);
});

router.post("/notes", (req, res) => {
  const studentId = req.user.user_id;
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }
  const note = {
    note_id: studentNotes.length + 1,
    student_id: studentId,
    title,
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  studentNotes.push(note);
  res.json({ success: true, note });
});

router.put("/notes/:noteId", (req, res) => {
  const studentId = req.user.user_id;
  const noteId = Number(req.params.noteId);
  const { title, content } = req.body;
  const note = studentNotes.find((n) => n.note_id === noteId && n.student_id === studentId);
  if (!note) {
    return res.status(404).json({ error: "Note not found." });
  }
  if (title) note.title = title;
  if (content) note.content = content;
  note.updated_at = new Date().toISOString();
  res.json({ success: true, note });
});

router.delete("/notes/:noteId", (req, res) => {
  const studentId = req.user.user_id;
  const noteId = Number(req.params.noteId);
  const index = studentNotes.findIndex((n) => n.note_id === noteId && n.student_id === studentId);
  if (index === -1) {
    return res.status(404).json({ error: "Note not found." });
  }
  studentNotes.splice(index, 1);
  res.json({ success: true, message: "Note deleted." });
});

// ----------------------------
// AI BOOKS (FR-S37, FR-S38)
// ----------------------------
router.get("/books", (req, res) => {
  const studentClassIds = getStudentClassIds(req.user.user_id);
  const studentSubjects = classes
    .filter((cls) => studentClassIds.includes(cls.class_id))
    .map((cls) => cls.subject_name);
  const recommended = aiBooks.filter(
    (book) => studentSubjects.includes(book.subject_name) || book.subject_name === "Learning Skills"
  );
  res.json(recommended);
});

router.post("/books/:bookId/access", (req, res) => {
  const studentId = req.user.user_id;
  const bookId = Number(req.params.bookId);
  const book = aiBooks.find((b) => b.book_id === bookId);
  if (!book) {
    return res.status(404).json({ error: "Book not found." });
  }
  const access = {
    access_id: studentBookAccess.length + 1,
    student_id: studentId,
    book_id: bookId,
    accessed_at: new Date().toISOString(),
  };
  studentBookAccess.push(access);
  res.json({ success: true, access, book });
});

router.get("/books/access-log", (req, res) => {
  const studentId = req.user.user_id;
  const log = studentBookAccess
    .filter((a) => a.student_id === studentId)
    .map((a) => ({
      ...a,
      book: aiBooks.find((b) => b.book_id === a.book_id) || null,
    }))
    .sort((a, b) => new Date(b.accessed_at) - new Date(a.accessed_at));
  res.json(log);
});

// ----------------------------
// TRANSCRIPT (FR-S19)
// ----------------------------
router.get("/transcript", (req, res) => {
  const studentId = req.user.user_id;
  const studentSubmissions = submissions.filter((s) => s.student_id === studentId);
  const studentAssignments = studentSubmissions.map((s) => {
    const assignment = assignments.find((a) => a.assignment_id === s.assignment_id);
    return {
      assignment_title: assignment?.title || "Assignment",
      subject: assignment?.class_id ? classes.find((c) => c.class_id === assignment.class_id)?.subject_name : "Unknown",
      score: s.score,
      grade: s.grade,
      feedback: s.feedback,
    };
  });
  const attendanceEntries = getStudentAttendanceEntries(studentId);
  const totalDays = attendanceEntries.length;
  const presentDays = attendanceEntries.filter((e) => e.status === "PRESENT").length;
  const conduct = conductRecords.find((r) => r.student_id === studentId) || null;
  const prediction = performancePredictions.find((p) => p.student_id === studentId) || null;
  res.json({
    student: {
      name: req.user.full_name,
      email: req.user.email,
      student_number: req.user.student_number,
    },
    grades: studentAssignments,
    attendance: { present: presentDays, total: totalDays, percentage: totalDays ? Math.round((presentDays / totalDays) * 100) : 0 },
    conduct,
    prediction,
    generated_at: new Date().toISOString(),
  });
});

// ----------------------------
// ANNOUNCEMENTS (FR-S08, FR-S32)
// ----------------------------
router.get("/announcements", (req, res) => {
  const studentClassIds = getStudentClassIds(req.user.user_id);
  const relevant = announcements.filter(
    (a) => a.class_id === null || studentClassIds.includes(a.class_id)
  );
  res.json(relevant);
});

// ----------------------------
// PEER EVALUATION SUBMISSION & RESULTS (FR-S27, FR-S28)
// ----------------------------
router.post("/peer-evaluations/:evaluationId/submit", (req, res) => {
  const studentId = req.user.user_id;
  const evaluationId = Number(req.params.evaluationId);
  const { reviewee_id, score, comments } = req.body;
  if (!reviewee_id || score == null) {
    return res.status(400).json({ error: "reviewee_id and score are required." });
  }
  const evaluation = peerEvaluations.find((e) => e.evaluation_id === evaluationId);
  if (!evaluation) {
    return res.status(404).json({ error: "Peer evaluation not found." });
  }
  if (evaluation.status !== "OPEN") {
    return res.status(400).json({ error: "This evaluation is no longer accepting submissions." });
  }
  const existingIndex = evaluation.results.findIndex(
    (r) => r.reviewer_id === studentId && r.reviewee_id === reviewee_id
  );
  const result = {
    reviewer_id: studentId,
    reviewer_name: req.user.full_name,
    reviewee_id,
    score,
    comments: comments || "",
  };
  if (existingIndex >= 0) {
    evaluation.results[existingIndex] = result;
  } else {
    evaluation.results.push(result);
  }
  res.json({ success: true, result });
});

router.get("/peer-evaluations/:evaluationId/results", (req, res) => {
  const studentId = req.user.user_id;
  const evaluationId = Number(req.params.evaluationId);
  const evaluation = peerEvaluations.find((e) => e.evaluation_id === evaluationId);
  if (!evaluation) {
    return res.status(404).json({ error: "Peer evaluation not found." });
  }
  if (!evaluation.released) {
    return res.status(403).json({ error: "Results have not been released yet." });
  }
  const myResults = evaluation.results.filter((r) => r.reviewee_id === studentId);
  res.json({ evaluation_id: evaluationId, title: evaluation.title, my_results: myResults });
});

// ----------------------------
// PROFILE PICTURE (FR-S04)
// ----------------------------
router.put("/profile/picture", (req, res) => {
  const { profile_picture_url } = req.body;
  if (!profile_picture_url) {
    return res.status(400).json({ error: "profile_picture_url is required." });
  }
  req.user.profile_picture_url = profile_picture_url;
  res.json({ success: true, profile_picture_url });
});

// ----------------------------
// LEARNING TUTORIALS
// ----------------------------
router.get("/tutorials", (req, res) => {
  const { subject, difficulty } = req.query;
  let tutorials = learningTutorials;
  
  if (subject) {
    tutorials = tutorials.filter((t) => t.subject_name === subject);
  }
  if (difficulty) {
    tutorials = tutorials.filter((t) => t.difficulty === difficulty);
  }
  
  res.json(tutorials);
});

router.post("/tutorials/:tutorialId/complete", (req, res) => {
  const studentId = req.user.user_id;
  const tutorialId = Number(req.params.tutorialId);
  const tutorial = learningTutorials.find((t) => t.tutorial_id === tutorialId);
  
  if (!tutorial) {
    return res.status(404).json({ error: "Tutorial not found." });
  }
  
  res.json({ success: true, message: "Tutorial marked as completed.", tutorial });
});

// ----------------------------
// BOOK REPOSITORY
// ----------------------------
router.get("/book-repository", (req, res) => {
  const { subject, category } = req.query;
  let books = bookRepository;
  
  if (subject) {
    books = books.filter((b) => b.subject_name === subject);
  }
  if (category) {
    books = books.filter((b) => b.category === category);
  }
  
  res.json(books);
});

router.post("/book-repository/:bookId/access", (req, res) => {
  const studentId = req.user.user_id;
  const bookId = Number(req.params.bookId);
  const book = bookRepository.find((b) => b.book_id === bookId);
  
  if (!book) {
    return res.status(404).json({ error: "Book not found." });
  }
  
  const access = {
    access_id: studentBookAccess.length + 1,
    student_id: studentId,
    book_id: bookId,
    accessed_at: new Date().toISOString(),
  };
  studentBookAccess.push(access);
  res.json({ success: true, access, book });
});

module.exports = router;
