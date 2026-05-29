const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  users,
  teachers,
  classes,
  rosters,
  timetables,
  attendanceRecords,
  assignments,
  submissions,
  messages,
  notifications,
  announcements,
  conductRecords,
  peerEvaluations,
  onlineClasses,
  performancePredictions,
  reports,
  materials,
  todaySchedule,
  attendanceChart,
} = require("../data/mockData");

const router = express.Router();
router.use(requireAuth);

// ─── Profile & Auth (FR-T01–T05) ──────────────────────────────

router.get("/profile", (req, res) => {
  const profile = {
    user_id: req.user.user_id,
    full_name: req.user.full_name,
    email: req.user.email,
    phone_number: req.user.phone_number,
    department: req.user.department,
    profile_picture_url: req.user.profile_picture_url,
    employee_id: req.teacher.employee_id,
  };
  res.json(profile);
});

router.put("/profile", (req, res) => {
  const { full_name, phone_number, department, profile_picture_url } = req.body;
  req.user.full_name = full_name || req.user.full_name;
  req.user.phone_number = phone_number || req.user.phone_number;
  req.user.department = department || req.user.department;
  req.user.profile_picture_url = profile_picture_url || req.user.profile_picture_url;
  req.teacher.department = req.user.department;
  res.json({ success: true, profile: req.user });
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

router.post("/verify-otp", (req, res) => {
  const { otp_code } = req.body;
  if (!otp_code) {
    return res.status(400).json({ error: "OTP code is required." });
  }
  if (req.user.otp_code === otp_code) {
    req.user.otp_verified = true;
    return res.json({ success: true, message: "OTP verified successfully." });
  }
  res.status(400).json({ error: "Invalid OTP code." });
});

// ─── Dashboard (FR-T06–T09) ────────────────────────────────────

router.get("/dashboard", (req, res) => {
  const myClasses = classes.filter((item) => item.teacher_id === req.teacher.teacher_id);
  const unreadNotifications = notifications.filter((item) => !item.read).length;
  const ungraded = submissions.filter(
    (submission) => submission.score == null && assignmentBelongsToTeacher(submission.assignment_id, req.teacher.teacher_id)
  ).length;
  const unreadMessages = messages.filter((item) => item.unread > 0).length;

  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDayName = dayNames[today.getDay()];

  const todayClasses = todaySchedule.filter((item) => myClasses.some((cls) => cls.class_id === item.class_id));

  res.json({
    todayClasses,
    todayDayName,
    pendingTasks: {
      ungradedSubmissions: ungraded,
      unreadMessages,
      upcomingOnlineClasses: onlineClasses.filter((oc) => oc.status === "SCHEDULED").length,
    },
    attendanceChart,
    classes: myClasses,
    unreadNotifications,
    pendingAssignments: ungraded,
  });
});

// ─── Class Management (FR-T10–T12) ─────────────────────────────

router.get("/classes", (req, res) => {
  const myClasses = classes.filter((item) => item.teacher_id === req.teacher.teacher_id);
  res.json(myClasses);
});

router.get("/classes/:classId/roster", (req, res) => {
  const classId = Number(req.params.classId);
  const roster = rosters.find((entry) => entry.class_id === classId);
  if (!roster) {
    return res.status(404).json({ error: "Class roster not found." });
  }
  res.json(roster.students);
});

router.get("/classes/:classId/timetable", (req, res) => {
  const classId = Number(req.params.classId);
  const timetable = timetables.find((entry) => entry.class_id === classId);
  if (!timetable) {
    return res.status(404).json({ error: "Timetable not found." });
  }
  res.json(timetable.schedule);
});

// ─── Attendance (FR-T13–T18) ────────────────────────────────────

router.get("/attendance", (req, res) => {
  const classId = Number(req.query.classId);
  const date = req.query.date;
  if (!classId || !date) {
    return res.status(400).json({ error: "classId and date query params are required." });
  }
  const attendance = attendanceRecords.find((record) => record.class_id === classId && record.date === date);
  if (attendance) {
    return res.json(attendance);
  }
  const roster = rosters.find((entry) => entry.class_id === classId);
  if (!roster) {
    return res.status(404).json({ error: "Class roster not found." });
  }
  const defaultAttendance = roster.students.map((student) => ({
    student_id: student.student_id,
    name: student.name,
    status: "PRESENT",
    remark: "",
  }));
  res.json({ attendance_id: null, class_id: classId, date, entries: defaultAttendance });
});

router.post("/attendance", (req, res) => {
  const { class_id, date, entries } = req.body;
  if (!class_id || !date || !Array.isArray(entries)) {
    return res.status(400).json({ error: "class_id, date and entries are required." });
  }
  const attendanceId = attendanceRecords.length + 1;
  const record = { attendance_id: attendanceId, class_id, date, entries, recorded_by: req.teacher.teacher_id };
  attendanceRecords.push(record);
  res.json({ success: true, attendance: record });
});

router.put("/attendance/:attendanceId", (req, res) => {
  const attendanceId = Number(req.params.attendanceId);
  const record = attendanceRecords.find((item) => item.attendance_id === attendanceId);
  if (!record) {
    return res.status(404).json({ error: "Attendance record not found." });
  }
  record.entries = req.body.entries || record.entries;
  res.json({ success: true, attendance: record });
});

router.get("/attendance/history", (req, res) => {
  const classId = Number(req.query.classId);
  const studentId = Number(req.query.studentId);

  let history = attendanceRecords;
  if (classId) {
    history = history.filter((record) => record.class_id === classId);
  }
  if (studentId) {
    history = history.map((record) => ({
      ...record,
      entries: record.entries.filter((e) => e.student_id === studentId),
    })).filter((record) => record.entries.length > 0);
  }
  res.json(history);
});

router.get("/attendance/statistics", (req, res) => {
  const classId = Number(req.query.classId);
  if (!classId) {
    return res.status(400).json({ error: "classId query param is required." });
  }
  const history = attendanceRecords.filter((record) => record.class_id === classId);
  const totals = {};
  history.forEach((record) => {
    record.entries.forEach((entry) => {
      totals[entry.student_id] = totals[entry.student_id] || { present: 0, absent: 0, late: 0, total: 0 };
      totals[entry.student_id].total += 1;
      if (entry.status === "PRESENT") totals[entry.student_id].present += 1;
      if (entry.status === "ABSENT") totals[entry.student_id].absent += 1;
      if (entry.status === "LATE") totals[entry.student_id].late += 1;
    });
  });
  const roster = rosters.find((r) => r.class_id === classId);
  const statistics = Object.entries(totals).map(([studentId, values]) => {
    const student = roster ? roster.students.find((s) => s.student_id === Number(studentId)) : null;
    return {
      student_id: Number(studentId),
      student_name: student ? student.name : `Student ${studentId}`,
      present: values.present,
      absent: values.absent,
      late: values.late,
      percentage: values.total ? Math.round((values.present / values.total) * 100) : 0,
    };
  });
  res.json({
    statistics,
    average: statistics.length ? Math.round(statistics.reduce((sum, item) => sum + item.percentage, 0) / statistics.length) : 0,
  });
});

router.get("/attendance/chart", (req, res) => {
  res.json(attendanceChart);
});

// ─── Assignments (FR-T19–T28) ──────────────────────────────────

router.get("/assignments", (req, res) => {
  const teacherAssignments = assignments.filter((assignment) => assignment.teacher_id === req.teacher.teacher_id);
  res.json(teacherAssignments);
});

router.post("/assignments", (req, res) => {
  const { title, description, due_date, max_score, attachments, class_id } = req.body;
  if (!title || !description || !due_date || !max_score || !class_id) {
    return res.status(400).json({ error: "Title, description, due date, max score, and class_id are required." });
  }
  const assignmentId = assignments.length + 1;
  const assignment = {
    assignment_id: assignmentId,
    class_id,
    title,
    description,
    due_date,
    max_score,
    attachments: attachments || [],
    created_at: new Date().toISOString(),
    teacher_id: req.teacher.teacher_id,
    published: false,
  };
  assignments.push(assignment);
  res.json({ success: true, assignment });
});

router.put("/assignments/:assignmentId", (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const assignment = assignments.find((item) => item.assignment_id === assignmentId && item.teacher_id === req.teacher.teacher_id);
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found." });
  }
  const { title, description, due_date, max_score, attachments, published } = req.body;
  assignment.title = title || assignment.title;
  assignment.description = description || assignment.description;
  assignment.due_date = due_date || assignment.due_date;
  assignment.max_score = max_score ?? assignment.max_score;
  assignment.attachments = attachments || assignment.attachments;
  assignment.published = published ?? assignment.published;
  res.json({ success: true, assignment });
});

router.delete("/assignments/:assignmentId", (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const index = assignments.findIndex((item) => item.assignment_id === assignmentId && item.teacher_id === req.teacher.teacher_id);
  if (index === -1) {
    return res.status(404).json({ error: "Assignment not found." });
  }
  assignments.splice(index, 1);
  res.json({ success: true });
});

router.get("/assignments/:assignmentId/submissions", (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const assignment = assignments.find((item) => item.assignment_id === assignmentId && item.teacher_id === req.teacher.teacher_id);
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found." });
  }
  const assignmentSubmissions = submissions.filter((submission) => submission.assignment_id === assignmentId);
  res.json(assignmentSubmissions);
});

router.post("/assignments/:assignmentId/grade", (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const { submission_id, score, grade, feedback, publish } = req.body;
  if (!submission_id || score == null || !grade) {
    return res.status(400).json({ error: "submission_id, score, and grade are required." });
  }
  const submission = submissions.find((item) => item.submission_id === submission_id && item.assignment_id === assignmentId);
  if (!submission) {
    return res.status(404).json({ error: "Submission not found." });
  }
  submission.score = score;
  submission.grade = grade;
  submission.feedback = feedback || submission.feedback;
  submission.published = publish === true;
  res.json({ success: true, submission });
});

router.post("/assignments/:assignmentId/publish-grades", (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const { submission_ids } = req.body;
  if (!Array.isArray(submission_ids)) {
    return res.status(400).json({ error: "submission_ids array is required." });
  }
  let count = 0;
  submissions.forEach((sub) => {
    if (sub.assignment_id === assignmentId && submission_ids.includes(sub.submission_id) && sub.score != null) {
      sub.published = true;
      count++;
    }
  });
  res.json({ success: true, published_count: count });
});

// ─── Conduct & Peer Evaluation (FR-T29–T33) ───────────────────

router.get("/conduct", (req, res) => {
  const classId = Number(req.query.classId) || null;
  const conduct = conductRecords.filter((item) => !classId || item.class_id === classId);
  res.json(conduct);
});

router.post("/conduct", (req, res) => {
  const { student_id, student_name, class_id, conduct, notes } = req.body;
  if (!student_id || !conduct || !class_id) {
    return res.status(400).json({ error: "student_id, conduct, and class_id are required." });
  }
  const existing = conductRecords.findIndex((item) => item.student_id === student_id && item.class_id === class_id);
  if (existing >= 0) {
    conductRecords[existing].conduct = conduct;
    conductRecords[existing].notes = notes || conductRecords[existing].notes;
  } else {
    conductRecords.push({ student_id, student_name, class_id, conduct, notes: notes || "" });
  }
  res.json({ success: true });
});

router.get("/peer-evaluations", (req, res) => {
  const classId = Number(req.query.classId) || null;
  const evaluations = peerEvaluations.filter((item) => !classId || item.class_id === classId);
  res.json(evaluations);
});

router.post("/peer-evaluations", (req, res) => {
  const { class_id, title, due_date, questions } = req.body;
  if (!class_id || !title || !due_date) {
    return res.status(400).json({ error: "class_id, title, and due_date are required." });
  }
  const evaluation = {
    evaluation_id: peerEvaluations.length + 1,
    class_id,
    title,
    due_date,
    status: "OPEN",
    questions: questions || [],
    results: [],
    released: false,
  };
  peerEvaluations.push(evaluation);
  res.json({ success: true, evaluation });
});

router.get("/peer-evaluations/:evaluationId/results", (req, res) => {
  const evaluationId = Number(req.params.evaluationId);
  const evaluation = peerEvaluations.find((item) => item.evaluation_id === evaluationId);
  if (!evaluation) {
    return res.status(404).json({ error: "Peer evaluation not found." });
  }

  // Aggregate scores per reviewee
  const aggregated = {};
  evaluation.results.forEach((r) => {
    if (!aggregated[r.reviewee_id]) {
      aggregated[r.reviewee_id] = { reviewee_id: r.reviewee_id, reviewee_name: r.reviewee_name, scores: [], comments: [] };
    }
    aggregated[r.reviewee_id].scores.push(r.score);
    aggregated[r.reviewee_id].comments.push(r.comments);
  });

  const aggregatedResults = Object.values(aggregated).map((entry) => ({
    ...entry,
    average_score: entry.scores.length ? (entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length).toFixed(1) : 0,
  }));

  res.json({ evaluation, aggregatedResults });
});

router.post("/peer-evaluations/:evaluationId/release", (req, res) => {
  const evaluationId = Number(req.params.evaluationId);
  const evaluation = peerEvaluations.find((item) => item.evaluation_id === evaluationId);
  if (!evaluation) {
    return res.status(404).json({ error: "Peer evaluation not found." });
  }
  evaluation.released = true;
  res.json({ success: true });
});

// ─── Online Classes (FR-T34–T37) ──────────────────────────────

router.get("/online-classes", (req, res) => {
  const classId = Number(req.query.classId) || null;
  res.json(onlineClasses.filter((meeting) => !classId || meeting.class_id === classId));
});

router.post("/online-classes", (req, res) => {
  const { class_id, topic, scheduled_at, link, provider, recorded_url } = req.body;
  if (!class_id || !topic || !scheduled_at || !link) {
    return res.status(400).json({ error: "class_id, topic, scheduled_at, and link are required." });
  }
  const meeting = {
    class_id,
    meeting_id: onlineClasses.length + 1,
    topic,
    scheduled_at,
    link,
    provider: provider || "Google Meet",
    recorded_url: recorded_url || null,
    status: "SCHEDULED",
  };
  onlineClasses.push(meeting);
  res.json({ success: true, meeting });
});

router.put("/online-classes/:meetingId", (req, res) => {
  const meetingId = Number(req.params.meetingId);
  const meeting = onlineClasses.find((m) => m.meeting_id === meetingId);
  if (!meeting) {
    return res.status(404).json({ error: "Online class not found." });
  }
  const { topic, scheduled_at, link, provider, recorded_url, status } = req.body;
  if (topic) meeting.topic = topic;
  if (scheduled_at) meeting.scheduled_at = scheduled_at;
  if (link) meeting.link = link;
  if (provider) meeting.provider = provider;
  if (recorded_url) meeting.recorded_url = recorded_url;
  if (status) meeting.status = status;
  res.json({ success: true, meeting });
});

// ─── Performance & Analytics (FR-T38–T41) ─────────────────────

router.get("/performance", (req, res) => {
  const classId = Number(req.query.classId) || null;
  const studentId = Number(req.query.studentId);

  if (studentId) {
    const prediction = performancePredictions.find((item) => item.student_id === studentId);
    const studentSubmissions = submissions.filter((s) => s.student_id === studentId && s.score != null);
    const studentAttendance = attendanceRecords.reduce((acc, record) => {
      const entry = record.entries.find((e) => e.student_id === studentId);
      if (entry) {
        acc.total++;
        if (entry.status === "PRESENT") acc.present++;
      }
      return acc;
    }, { total: 0, present: 0 });

    const studentConduct = conductRecords.find((c) => c.student_id === studentId);

    return res.json({
      student_id: studentId,
      grades: studentSubmissions.map((s) => ({
        assignment_id: s.assignment_id,
        score: s.score,
        grade: s.grade,
        feedback: s.feedback,
      })),
      attendance: {
        rate: studentAttendance.total ? Math.round((studentAttendance.present / studentAttendance.total) * 100) : 0,
        total: studentAttendance.total,
        present: studentAttendance.present,
      },
      conduct: studentConduct || null,
      prediction: prediction || null,
    });
  }

  let filtered = performancePredictions;
  if (classId) {
    filtered = filtered.filter((item) => item.class_id === classId);
  }

  // Class summary
  if (classId) {
    const classSubmissions = submissions.filter((s) => {
      const assignment = assignments.find((a) => a.assignment_id === s.assignment_id && a.class_id === classId);
      return assignment && s.score != null;
    });
    const avgScore = classSubmissions.length
      ? (classSubmissions.reduce((sum, s) => sum + s.score, 0) / classSubmissions.length).toFixed(1)
      : 0;

    return res.json({
      predictions: filtered,
      classSummary: {
        average_score: avgScore,
        total_students: filtered.length,
        grade_distribution: {
          A: filtered.filter((p) => p.predicted_grade.startsWith("A")).length,
          B: filtered.filter((p) => p.predicted_grade.startsWith("B")).length,
          C: filtered.filter((p) => p.predicted_grade.startsWith("C")).length,
          D: filtered.filter((p) => p.predicted_grade.startsWith("D")).length,
          F: filtered.filter((p) => p.predicted_grade === "F").length,
        },
        risk_summary: {
          LOW: filtered.filter((p) => p.risk_level === "LOW").length,
          MEDIUM: filtered.filter((p) => p.risk_level === "MEDIUM").length,
          HIGH: filtered.filter((p) => p.risk_level === "HIGH").length,
        },
      },
    });
  }

  res.json({ predictions: filtered });
});

// ─── Reports (FR-T42–T44) ──────────────────────────────────────

router.get("/reports", (req, res) => {
  const classId = Number(req.query.classId) || null;
  res.json(reports.filter((item) => !classId || item.class_id === classId));
});

router.post("/reports/generate", (req, res) => {
  const { class_id, type, format, metrics } = req.body;
  if (!class_id || !type) {
    return res.status(400).json({ error: "class_id and type are required." });
  }
  const reportId = reports.length + 1;
  const report = {
    report_id: reportId,
    type,
    class_id,
    title: `${type} - Class ${class_id}`,
    format: format || "PDF",
    file_url: `/reports/${type.toLowerCase().replace(/\s+/g, "-")}-class${class_id}.${(format || "PDF").toLowerCase()}`,
    generated_at: new Date().toISOString(),
    metrics: metrics || null,
  };
  reports.push(report);
  res.json({ success: true, report });
});

router.get("/reports/:reportId/download", (req, res) => {
  const reportId = Number(req.params.reportId);
  const report = reports.find((r) => r.report_id === reportId);
  if (!report) {
    return res.status(404).json({ error: "Report not found." });
  }
  // In production, this would stream the actual file. For mock, return the URL.
  res.json({ download_url: report.file_url, format: report.format });
});

// ─── Messages / Communication (FR-T45–T48) ────────────────────

router.get("/messages", (req, res) => {
  res.json(messages);
});

router.post("/messages", (req, res) => {
  const { thread_id, body, attachment } = req.body;
  if (!thread_id || !body) {
    return res.status(400).json({ error: "thread_id and body are required." });
  }
  const thread = messages.find((t) => t.thread_id === thread_id);
  if (!thread) {
    return res.status(404).json({ error: "Thread not found." });
  }
  thread.messages.push({
    sender: "teacher",
    body,
    attachment: attachment || null,
    created_at: new Date().toISOString(),
  });
  thread.last_message = body;
  thread.unread = 0;
  res.json({ success: true, thread });
});

router.post("/messages/new-thread", (req, res) => {
  const { recipient_id, recipient_name, recipient_role, body, attachment } = req.body;
  if (!recipient_id || !body) {
    return res.status(400).json({ error: "recipient_id and body are required." });
  }
  const threadId = messages.length + 1;
  const thread = {
    thread_id: threadId,
    recipient_name: recipient_name || "Unknown",
    recipient_role: recipient_role || "Student",
    recipient_id,
    last_message: body,
    unread: 0,
    read_by_recipient: false,
    messages: [
      {
        sender: "teacher",
        body,
        attachment: attachment || null,
        created_at: new Date().toISOString(),
      },
    ],
  };
  messages.push(thread);
  res.json({ success: true, thread });
});

// ─── Announcements (FR-T47) ────────────────────────────────────

router.get("/announcements", (req, res) => {
  const classId = Number(req.query.classId) || null;
  res.json(announcements.filter((a) => !classId || a.class_id === classId));
});

router.post("/announcements", (req, res) => {
  const { title, body, class_id } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: "Title and body are required." });
  }
  const announcement = {
    announcement_id: announcements.length + 1,
    title,
    body,
    class_id: class_id || null,
    teacher_id: req.teacher.teacher_id,
    created_at: new Date().toISOString(),
  };
  announcements.push(announcement);
  res.json({ success: true, announcement });
});

// ─── Notifications (FR-T49–T50) ────────────────────────────────

router.get("/notifications", (req, res) => {
  res.json(notifications);
});

router.post("/notifications/read", (req, res) => {
  const { notificationId } = req.body;
  if (notificationId) {
    const notification = notifications.find((item) => item.id === notificationId);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found." });
    }
    notification.read = true;
    return res.json({ success: true, notification });
  }
  // Mark all as read
  notifications.forEach((n) => { n.read = true; });
  res.json({ success: true, message: "All notifications marked as read." });
});

// ─── Materials ──────────────────────────────────────────────

router.get("/materials", (req, res) => {
  const classId = Number(req.query.classId) || null;
  res.json(materials.filter((m) => !classId || m.class_id === classId));
});

router.post("/materials", (req, res) => {
  const { class_id, title, description, file_url, file_type, category } = req.body;
  if (!class_id || !title || !file_url) {
    return res.status(400).json({ error: "class_id, title, and file_url are required." });
  }
  const material = {
    material_id: materials.length + 1,
    class_id,
    title,
    description: description || "",
    file_url,
    file_type: file_type || "PDF",
    category: category || "Other",
    created_at: new Date().toISOString(),
    teacher_id: req.teacher.teacher_id,
  };
  materials.push(material);
  res.json({ success: true, material });
});

router.delete("/materials/:materialId", (req, res) => {
  const materialId = Number(req.params.materialId);
  const index = materials.findIndex((m) => m.material_id === materialId && m.teacher_id === req.teacher.teacher_id);
  if (index === -1) {
    return res.status(404).json({ error: "Material not found." });
  }
  materials.splice(index, 1);
  res.json({ success: true });
});

// ─── Helper ────────────────────────────────────────────────────

function assignmentBelongsToTeacher(assignmentId, teacherId) {
  const assignment = assignments.find((item) => item.assignment_id === assignmentId);
  return assignment && assignment.teacher_id === teacherId;
}

module.exports = router;
