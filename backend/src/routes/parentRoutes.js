const express = require("express");
const { requireParent } = require("../middleware/authMiddleware");
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
  parentChildren,
  feeStructures,
  payments,
} = require("../data/mockData");

const router = express.Router();
router.use(requireParent);

function getStudent(studentId) {
  return users.find((item) => item.user_id === Number(studentId) && item.role === "STUDENT");
}

function getChildLink(parentId, studentId) {
  return parentChildren.find(
    (link) => link.parent_user_id === Number(parentId) && link.student_user_id === Number(studentId)
  );
}

function getParentChildren(parentId) {
  return parentChildren
    .filter((link) => link.parent_user_id === Number(parentId))
    .map((link) => {
      const student = getStudent(link.student_user_id);
      const studentClass = student ? classes.find((cls) => cls.class_id === student.current_class_id) : null;
      return student
        ? {
            student_id: student.user_id,
            full_name: student.full_name,
            student_number: student.student_number,
            relationship: link.relationship,
            class_name: studentClass?.class_name || "Unknown Class",
            school_name: studentClass ? "Smart Valley Academy" : "Smart School Connect",
            current_class_id: student.current_class_id,
          }
        : null;
    })
    .filter(Boolean);
}

function getStudentAttendanceEntries(studentId) {
  const records = [];
  attendanceRecords.forEach((record) => {
    const matches = record.entries.filter((entry) => entry.student_id === Number(studentId));
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

function getStudentAssignments(studentId) {
  const student = getStudent(studentId);
  if (!student) return [];
  return assignments.filter((assignment) => assignment.class_id === student.current_class_id);
}

function getStudentSubmission(studentId, assignmentId) {
  return submissions.find(
    (submission) => submission.student_id === Number(studentId) && submission.assignment_id === Number(assignmentId)
  );
}

function getStudentGrades(studentId) {
  return submissions
    .filter((submission) => submission.student_id === Number(studentId))
    .map((submission) => {
      const assignment = assignments.find((item) => item.assignment_id === submission.assignment_id);
      return {
        ...submission,
        assignment_title: assignment?.title || "Unknown Assignment",
        class_id: assignment?.class_id || null,
      };
    });
}

function getStudentClass(studentId) {
  const student = getStudent(studentId);
  return student ? classes.find((cls) => cls.class_id === student.current_class_id) : null;
}

function getAnnouncementsForParent() {
  return announcements.filter((announcement) =>
    !announcement.target_roles ||
    announcement.target_roles.includes("ALL") ||
    announcement.target_roles.includes("PARENT")
  );
}

function buildPerformanceTrend(studentId) {
  const prediction = performancePredictions.find((item) => item.student_id === Number(studentId));
  if (!prediction) {
    return [
      { month: "Aug", score: 72 },
      { month: "Sep", score: 78 },
      { month: "Oct", score: 82 },
    ];
  }

  return [
    { month: "Aug", score: Math.max(50, Math.min(100, (prediction.predicted_grade === "A-" ? 88 : 76))) },
    { month: "Sep", score: Math.max(50, Math.min(100, (prediction.predicted_grade === "A-" ? 85 : 72))) },
    { month: "Oct", score: Math.max(50, Math.min(100, (prediction.predicted_grade === "A-" ? 90 : 78))) },
  ];
}

function buildAlerts(studentId) {
  const attendanceEntries = getStudentAttendanceEntries(studentId);
  const lowGrade = submissions.some(
    (submission) => submission.student_id === Number(studentId) && submission.score != null && submission.score < 65
  );
  const alerts = [];

  if (attendanceEntries.some((entry) => entry.status === "ABSENT")) {
    alerts.push({ type: "ABSENCE", message: "Recent absence recorded for your child." });
  }
  if (lowGrade) {
    alerts.push({ type: "LOW_GRADE", message: "A recent score is below the expected grade range." });
  }
  const nextDeadline = getStudentAssignments(studentId)
    .filter((assignment) => new Date(assignment.due_date) > new Date())
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
  if (nextDeadline) {
    alerts.push({ type: "DEADLINE", message: `Upcoming deadline: ${nextDeadline.title}.` });
  }

  return alerts.slice(0, 3);
}

router.get("/profile", (req, res) => {
  const user = req.user;
  res.json({
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    phone_number: user.phone_number,
    relationship: user.relationship,
    preferred_language: user.preferred_language,
    profile_picture_url: user.profile_picture_url,
  });
});

router.put("/profile", (req, res) => {
  const { full_name, phone_number, preferred_language, relationship } = req.body;
  req.user.full_name = full_name || req.user.full_name;
  req.user.phone_number = phone_number || req.user.phone_number;
  req.user.preferred_language = preferred_language || req.user.preferred_language;
  req.user.relationship = relationship || req.user.relationship;
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

router.get("/children", (req, res) => {
  res.json(getParentChildren(req.user.user_id));
});

router.get("/children/:studentId/dashboard", (req, res) => {
  const studentId = Number(req.params.studentId);
  const link = getChildLink(req.user.user_id, studentId);
  if (!link) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }

  const student = getStudent(studentId);
  if (!student) {
    return res.status(404).json({ error: "Child not found." });
  }

  const classInfo = getStudentClass(studentId);
  const assignmentsList = getStudentAssignments(studentId);
  const submissionsForChild = submissions.filter((item) => item.student_id === studentId);
  const gradedSubmissions = submissionsForChild.filter((item) => item.score != null);
  const attendanceEntries = getStudentAttendanceEntries(studentId);
  const averageGrade = gradedSubmissions.length
    ? Math.round(gradedSubmissions.reduce((sum, item) => sum + Number(item.score), 0) / gradedSubmissions.length)
    : 0;
  const attendanceRate = attendanceEntries.length
    ? Math.round((attendanceEntries.filter((entry) => entry.status === "PRESENT").length / attendanceEntries.length) * 100)
    : 0;
  const assignmentsSubmitted = assignmentsList.filter((assignment) =>
    submissionsForChild.some((submission) => submission.assignment_id === assignment.assignment_id)
  ).length;
  const alerts = buildAlerts(studentId);

  res.json({
    child: {
      student_id: student.user_id,
      full_name: student.full_name,
      student_number: student.student_number,
      class_name: classInfo?.class_name || "Unknown Class",
      school_name: classInfo ? "Smart Valley Academy" : "Smart School Connect",
    },
    summary: {
      average_grade: averageGrade,
      attendance_rate: attendanceRate,
      assignments_submitted: assignmentsSubmitted,
      total_assignments: assignmentsList.length,
    },
    alerts,
    performance_trend: buildPerformanceTrend(studentId),
    announcements: getAnnouncementsForParent().slice(0, 5),
  });
});

router.get("/children/:studentId/grades", (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!getChildLink(req.user.user_id, studentId)) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }
  res.json(getStudentGrades(studentId));
});

router.get("/children/:studentId/attendance", (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!getChildLink(req.user.user_id, studentId)) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }
  res.json(getStudentAttendanceEntries(studentId));
});

router.get("/children/:studentId/attendance/summary", (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!getChildLink(req.user.user_id, studentId)) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }

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

router.get("/children/:studentId/assignments", (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!getChildLink(req.user.user_id, studentId)) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }

  const assignmentList = getStudentAssignments(studentId);
  const enriched = assignmentList.map((assignment) => {
    const submission = getStudentSubmission(studentId, assignment.assignment_id);
    const isOpen = new Date(assignment.due_date) > new Date();
    const status = submission
      ? submission.score == null
        ? "SUBMITTED"
        : "GRADED"
      : isOpen
      ? "OPEN"
      : "CLOSED";
    return {
      ...assignment,
      status,
      submission: submission || null,
    };
  });

  res.json(enriched);
});

router.get("/children/:studentId/conduct", (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!getChildLink(req.user.user_id, studentId)) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }
  res.json(conductRecords.filter((record) => record.student_id === studentId));
});

router.get("/children/:studentId/peer-evaluations", (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!getChildLink(req.user.user_id, studentId)) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }

  const student = getStudent(studentId);
  if (!student) {
    return res.status(404).json({ error: "Child not found." });
  }

  const classIds = [student.current_class_id];
  res.json(peerEvaluations.filter((evaluation) => classIds.includes(evaluation.class_id)));
});

router.get("/children/:studentId/performance", (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!getChildLink(req.user.user_id, studentId)) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }

  const prediction = performancePredictions.find((item) => item.student_id === studentId);
  if (!prediction) {
    return res.status(404).json({ error: "Performance prediction not found." });
  }
  res.json(prediction);
});

router.get("/children/:studentId/transcript", (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!getChildLink(req.user.user_id, studentId)) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }
  res.json({ pdf_url: `/transcripts/student-${studentId}.pdf` });
});

router.get("/children/:studentId/messages", (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!getChildLink(req.user.user_id, studentId)) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }
  const parentMessages = messages.filter(
    (thread) => thread.recipient_role === "Parent" && thread.student_id === studentId
  );
  res.json(parentMessages);
});

router.post("/children/:studentId/messages", (req, res) => {
  const studentId = Number(req.params.studentId);
  const { thread_id, body } = req.body;
  if (!body) {
    return res.status(400).json({ error: "Message body is required." });
  }
  if (!getChildLink(req.user.user_id, studentId)) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }

  let thread = messages.find(
    (item) => item.thread_id === Number(thread_id) && item.recipient_role === "Parent" && item.student_id === studentId
  );

  if (!thread) {
    thread = {
      thread_id: messages.length + 1,
      recipient_name: req.user.full_name,
      recipient_role: "Parent",
      student_id: studentId,
      last_message: body,
      unread: 0,
      messages: [],
    };
    messages.push(thread);
  }

  const message = { sender: "parent", body, created_at: new Date().toISOString() };
  thread.messages.push(message);
  thread.last_message = body;
  thread.unread = 0;

  res.json({ success: true, thread });
});

router.get("/notifications", (req, res) => {
  res.json(
    notifications.filter((notification) =>
      !notification.target_roles ||
      notification.target_roles.includes("ALL") ||
      notification.target_roles.includes("PARENT")
    )
  );
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

// FR-P35: View school fee balance for each child
router.get("/children/:studentId/fees", (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!getChildLink(req.user.user_id, studentId)) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }

  const parentEntry = parentChildren.find((link) => link.student_user_id === studentId);
  const parentId = parentEntry ? users.find((u) => u.user_id === parentEntry.parent_user_id)?.user_id : null;

  const studentFees = feeStructures.filter((fee) => fee.student_id === studentId);
  const totalFees = studentFees.reduce((sum, fee) => sum + fee.amount, 0);
  const studentPayments = payments.filter((p) => p.student_id === studentId && p.status === "COMPLETED");
  const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalFees - totalPaid;

  res.json({
    fees: studentFees,
    totalFees,
    totalPaid,
    balance,
    currency: "ETB",
  });
});

// FR-P36: Initiate online fee payment
router.post("/children/:studentId/payments", (req, res) => {
  const studentId = Number(req.params.studentId);
  const { amount, payment_method } = req.body;
  if (!amount || !payment_method) {
    return res.status(400).json({ error: "Amount and payment method are required." });
  }
  if (!getChildLink(req.user.user_id, studentId)) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }

  const parentEntry = parentChildren.find((link) => link.student_user_id === studentId);

  const newPayment = {
    payment_id: payments.length + 1,
    parent_id: req.user.user_id,
    student_id: studentId,
    amount: Number(amount),
    currency: "ETB",
    status: "COMPLETED",
    payment_method,
    transaction_id: `${payment_method.toUpperCase().slice(0, 3)}-2025-${String(payments.length + 1).padStart(3, "0")}`,
    receipt_url: `/receipts/receipt-${String(payments.length + 1).padStart(3, "0")}.pdf`,
    created_at: new Date().toISOString(),
  };

  payments.push(newPayment);
  res.json({ success: true, payment: newPayment });
});

// FR-P37: View payment history
router.get("/children/:studentId/payments", (req, res) => {
  const studentId = Number(req.params.studentId);
  if (!getChildLink(req.user.user_id, studentId)) {
    return res.status(403).json({ error: "Child not linked to this parent." });
  }

  res.json(payments.filter((p) => p.student_id === studentId));
});

module.exports = router;
