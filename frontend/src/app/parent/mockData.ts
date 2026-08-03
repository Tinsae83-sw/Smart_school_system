// Shared mock data for Parent pages when backend is not available

export const MOCK_DASHBOARD = {
  child: {
    student_id: 2,
    full_name: "Maya Patel",
    student_number: "S-1002",
    class_name: "Grade 10 - Algebra",
    school_name: "Smart Valley Academy",
  },
  summary: {
    average_grade: 82,
    attendance_rate: 88,
    assignments_submitted: 4,
    total_assignments: 5,
  },
  alerts: [
    { type: "ABSENCE", message: "Recent absence recorded for your child on Oct 4." },
    { type: "LOW_GRADE", message: "A recent score is below the expected grade range." },
    { type: "DEADLINE", message: "Upcoming deadline: Linear Functions Homework." },
  ],
  performance_trend: [
    { month: "Aug", score: 72 },
    { month: "Sep", score: 78 },
    { month: "Oct", score: 85 },
    { month: "Nov", score: 82 },
  ],
  announcements: [
    { announcement_id: 1, title: "School Open Day Reminder", body: "Parent-teacher conferences will be held next Tuesday in the main hall.", created_at: "2025-10-06T12:00:00.000Z" },
    { announcement_id: 2, title: "Algebra Midterm Review", body: "Extra study materials have been uploaded. Please review before the exam.", created_at: "2025-10-08T10:00:00.000Z" },
    { announcement_id: 3, title: "Physics Lab Safety Reminder", body: "All students must wear safety goggles during lab sessions.", created_at: "2025-10-09T08:00:00.000Z" },
  ],
};

export const MOCK_DASHBOARD_2 = {
  child: {
    student_id: 4,
    full_name: "Sara Ahmed",
    student_number: "S-1101",
    class_name: "Grade 11 - Physics",
    school_name: "Smart Valley Academy",
  },
  summary: {
    average_grade: 95,
    attendance_rate: 98,
    assignments_submitted: 3,
    total_assignments: 3,
  },
  alerts: [
    { type: "DEADLINE", message: "Upcoming deadline: Motion Lab Report." },
  ],
  performance_trend: [
    { month: "Aug", score: 88 },
    { month: "Sep", score: 92 },
    { month: "Oct", score: 95 },
  ],
  announcements: MOCK_DASHBOARD.announcements,
};

export const MOCK_GRADES = [
  { submission_id: 3, assignment_title: "Quadratic Equations", score: 85, grade: "B+", feedback: "Good work, minor errors in problem 5.", status: "GRADED", is_late: false },
  { submission_id: 4, assignment_title: "Motion Lab Report", score: 45, grade: "A", feedback: "Excellent analysis!", status: "GRADED", is_late: false },
  { submission_id: 1, assignment_title: "Linear Functions Homework", score: null, grade: null, feedback: null, status: "SUBMITTED", is_late: false },
];

export const MOCK_PERFORMANCE = {
  student_id: 2,
  student_name: "Maya Patel",
  predicted_grade: "A-",
  risk_level: "LOW",
  recommendation: "Keep reviewing past papers. Excellent trajectory. Focus on quadratic equations for further improvement.",
  average_score: 91,
  attendance_rate: 92,
};

export const MOCK_TRANSCRIPT = { pdf_url: "/transcripts/student-2.pdf" };

export const MOCK_ATTENDANCE = [
  { attendance_id: 1, class_id: 1, date: "2025-10-03", status: "ABSENT", remark: "Sick" },
  { attendance_id: 2, class_id: 1, date: "2025-10-04", status: "PRESENT", remark: "" },
  { attendance_id: 3, class_id: 1, date: "2025-10-05", status: "PRESENT", remark: "" },
  { attendance_id: 4, class_id: 1, date: "2025-10-06", status: "PRESENT", remark: "" },
  { attendance_id: 5, class_id: 1, date: "2025-10-07", status: "LATE", remark: "Overslept" },
  { attendance_id: 6, class_id: 1, date: "2025-10-08", status: "PRESENT", remark: "" },
  { attendance_id: 7, class_id: 1, date: "2025-10-09", status: "PRESENT", remark: "" },
  { attendance_id: 8, class_id: 1, date: "2025-10-10", status: "ABSENT", remark: "" },
];

export const MOCK_ATTENDANCE_SUMMARY = [
  { month: "2025-10", present: 5, absent: 2, late: 1, total: 8, percentage: 63 },
  { month: "2025-09", present: 18, absent: 2, late: 1, total: 21, percentage: 86 },
];

export const MOCK_ASSIGNMENTS = [
  { assignment_id: 1, class_id: 1, title: "Quadratic Equations", description: "Solve the worksheet and upload your answers as a PDF.", due_date: "2025-10-10T23:59:00.000Z", max_score: 100, status: "GRADED", submission: { submission_id: 1, student_id: 2, submitted_at: "2025-10-11T09:08:00.000Z", file_url: "submitted-maya-patel-quadratics.pdf", is_late: true, score: 85, grade: "B+", feedback: "Good work, minor errors in problem 5." } },
  { assignment_id: 2, class_id: 2, title: "Motion Lab Report", description: "Submit a lab report on the motion experiment.", due_date: "2025-10-14T23:59:00.000Z", max_score: 50, status: "GRADED", submission: { submission_id: 2, student_id: 2, submitted_at: "2025-10-13T10:00:00.000Z", file_url: "submitted-maya-motion.pdf", is_late: false, score: 45, grade: "A", feedback: "Excellent analysis!" } },
  { assignment_id: 3, class_id: 1, title: "Linear Functions Homework", description: "Complete problems 1-20 from Chapter 3.", due_date: "2025-10-20T23:59:00.000Z", max_score: 80, status: "OPEN", submission: null },
];

export const MOCK_MESSAGES = [
  {
    thread_id: 3,
    recipient_name: "Alicia Gomez",
    recipient_role: "Teacher",
    student_id: 2,
    last_message: "Thank you for the update.",
    unread: 1,
    messages: [
      { sender: "parent", body: "Can we schedule a call about the project?", created_at: "2025-10-07T11:05:00.000Z" },
      { sender: "teacher", body: "Yes, I am free on Friday afternoon.", created_at: "2025-10-07T11:20:00.000Z" },
      { sender: "parent", body: "Thank you for the update.", created_at: "2025-10-07T11:25:00.000Z" },
    ],
  },
  {
    thread_id: 4,
    recipient_name: "Mr. Johnson",
    recipient_role: "Teacher",
    student_id: 2,
    last_message: "Please check the homework submission.",
    unread: 0,
    messages: [
      { sender: "parent", body: "Please check the homework submission.", created_at: "2025-10-09T09:00:00.000Z" },
      { sender: "teacher", body: "I'll review it by end of day.", created_at: "2025-10-09T09:15:00.000Z" },
    ],
  },
];

export const MOCK_NOTIFICATIONS = [
  { id: 1, type: "ATTENDANCE", title: "Absence Alert", body: "Maya Patel was marked absent today.", read: false, created_at: "2025-10-10T08:20:00.000Z" },
  { id: 2, type: "GRADE", title: "New Grade Published", body: "Quadratic Equations has been graded. Score: 85/100", read: false, created_at: "2025-10-09T14:15:00.000Z" },
  { id: 3, type: "ASSIGNMENT", title: "Assignment Deadline", body: "Linear Functions Homework is due in 3 days.", read: false, created_at: "2025-10-17T09:00:00.000Z" },
  { id: 4, type: "SYSTEM", title: "Parent-Teacher Meeting", body: "Scheduled for next Tuesday at 3 PM.", read: false, created_at: "2025-10-12T13:00:00.000Z" },
  { id: 5, type: "MESSAGE", title: "New Message", body: "Alicia Gomez sent you a message.", read: true, created_at: "2025-10-07T11:05:00.000Z" },
  { id: 6, type: "PAYMENT", title: "Payment Confirmed", body: "Your fee payment of 5,000 ETB has been received.", read: true, created_at: "2025-10-01T14:20:00.000Z" },
];

export const MOCK_CONDUCT = [
  { student_id: 2, student_name: "Maya Patel", class_id: 1, conduct: "A", notes: "Very respectful and punctual." },
];

export const MOCK_PEER_EVALUATIONS = [
  {
    evaluation_id: 1,
    class_id: 1,
    title: "Group Project Feedback",
    due_date: "2025-10-15",
    status: "OPEN",
    questions: ["Contribution to the project", "Communication skills", "Teamwork and collaboration"],
    results: [
      { reviewer_id: 1, reviewer_name: "John Doe", score: 9, comments: "Strong leadership and clear communication." },
      { reviewer_id: 3, reviewer_name: "Isaac Lee", score: 9, comments: "Very helpful in group tasks." },
      { reviewer_id: 7, reviewer_name: "Priya Sharma", score: 10, comments: "Outstanding collaboration." },
    ],
    released: true,
  },
];

export const MOCK_FEES = {
  fees: [
    { fee_id: 1, name: "Tuition Fee", amount: 15000, currency: "ETB", term: "2025/2026 - Semester 1" },
    { fee_id: 2, name: "Lab Fee", amount: 2000, currency: "ETB", term: "2025/2026 - Semester 1" },
  ],
  totalFees: 17000,
  totalPaid: 13000,
  balance: 4000,
  currency: "ETB",
};

export const MOCK_PAYMENTS = [
  { payment_id: 1, amount: 8000, currency: "ETB", status: "COMPLETED", payment_method: "Chapa", transaction_id: "CHP-2025-001", receipt_url: "/receipts/receipt-001.pdf", created_at: "2025-09-15T10:30:00.000Z" },
  { payment_id: 2, amount: 5000, currency: "ETB", status: "COMPLETED", payment_method: "Telebirr", transaction_id: "TBR-2025-042", receipt_url: "/receipts/receipt-002.pdf", created_at: "2025-10-01T14:20:00.000Z" },
];
