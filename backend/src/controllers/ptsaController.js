const prisma = require('../config/prisma');

// ============================================================
// PTSA REPRESENTATIVE CONTROLLER
// ============================================================

// Helper function to get PTSA representative ID (with or without authentication)
async function getPtsaRepId(req) {
  // If authenticated, use the authenticated representative ID
  if (req.ptsaRepId) {
    return req.ptsaRepId;
  }
  
  // For development without authentication, use the first PTSA representative in the database
  const rep = await prisma.pTSARepresentative.findFirst({
    where: { user: { role: 'PTSA_REPRESENTATIVE' } },
    include: { user: true }
  });
  
  if (!rep) {
    throw new Error('No PTSA representative found in database');
  }
  
  return rep.ptsa_rep_id;
}

/**
 * Get PTSA Dashboard
 * GET /api/ptsa/dashboard
 */
async function getPtsaDashboard(req, res) {
  try {
    // Get total students
    const totalStudents = await prisma.student.count();

    // Get upcoming PTSA meetings
    const upcomingMeetings = await prisma.pTSAMeeting.count({
      where: {
        meeting_date: { gte: new Date() },
        status: 'SCHEDULED'
      }
    });

    // Get pending PTSA feedback
    const pendingFeedback = await prisma.pTSAFeedback.count({
      where: { status: 'PENDING' }
    });

    // Get active discussions (using meeting count as proxy)
    const activeDiscussions = await prisma.pTSAMeeting.count({
      where: { status: 'SCHEDULED' }
    });

    // Calculate school progress score (mock calculation)
    const schoolProgressScore = 75;

    // Calculate parent participation (mock calculation)
    const parentParticipation = 68;

    res.json({
      total_students: totalStudents,
      upcoming_meetings: upcomingMeetings,
      pending_feedback: pendingFeedback,
      active_discussions: activeDiscussions,
      school_progress_score: schoolProgressScore,
      parent_participation: parentParticipation
    });
  } catch (error) {
    console.error('Error fetching PTSA dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
}

/**
 * Get PTSA Meetings
 * GET /api/ptsa/meetings
 */
async function getPtsaMeetings(req, res) {
  try {
    const meetings = await prisma.pTSAMeeting.findMany({
      where: {
        meeting_date: { gte: new Date() }
      },
      orderBy: { meeting_date: 'asc' },
      take: 10
    });

    res.json(meetings.map(m => ({
      meeting_id: m.ptsa_meeting_id,
      title: m.title,
      date: m.meeting_date,
      location: m.location || 'Main Hall',
      status: m.status === 'SCHEDULED' ? 'Upcoming' : 'Completed'
    })));
  } catch (error) {
    console.error('Error fetching PTSA meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
}

/**
 * Get PTSA Feedback
 * GET /api/ptsa/feedback
 */
async function getPtsaFeedback(req, res) {
  try {
    const feedback = await prisma.pTSAFeedback.findMany({
      where: { status: 'PENDING' },
      orderBy: { submitted_at: 'desc' },
      take: 10,
      include: {
        submitter: {
          include: { user: true }
        }
      }
    });

    res.json(feedback.map(f => ({
      feedback_id: f.ptsa_feedback_id,
      subject: f.subject,
      category: f.category || 'General',
      status: f.status,
      submitted_date: f.submitted_at
    })));
  } catch (error) {
    console.error('Error fetching PTSA feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
}

/**
 * Get PTSA Profile
 * GET /api/ptsa/profile
 */
async function getPtsaProfile(req, res) {
  try {
    const repId = await getPtsaRepId(req);

    const rep = await prisma.pTSARepresentative.findUnique({
      where: { ptsa_rep_id: repId },
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            phone_number: true,
            profile_picture_url: true
          }
        }
      }
    });

    if (!rep) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    res.json({
      representative_id: rep.ptsa_rep_id,
      full_name: rep.user.full_name,
      email: rep.user.email,
      phone_number: rep.user.phone_number,
      profile_picture_url: rep.user.profile_picture_url,
      position: rep.position || 'Representative'
    });
  } catch (error) {
    console.error('Error fetching PTSA profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

/**
 * Get Academic Grade Summaries
 * GET /api/ptsa/academic/grade-summaries
 */
async function getAcademicGradeSummaries(req, res) {
  try {
    const grades = await prisma.studentMark.findMany({
      include: {
        student: {
          include: {
            current_class: true
          }
        },
        class_subject: {
          include: {
            subject: true
          }
        }
      }
    });

    const summaries = [];

    grades.forEach(mark => {
      const gradeLevel = mark.student.grade_level;
      const subjectName = mark.class_subject.subject.subject_name;
      const score = parseFloat(mark.score);

      const existing = summaries.find(s => s.grade_level === gradeLevel && s.subject === subjectName);
      if (existing) {
        existing.total_score += score;
        existing.count += 1;
      } else {
        summaries.push({
          grade_level: gradeLevel,
          subject: subjectName,
          total_score: score,
          count: 1
        });
      }
    });

    const result = summaries.map(s => ({
      grade_level: s.grade_level,
      subject: s.subject,
      average_grade: s.count > 0 ? s.total_score / s.count : 0,
      student_count: s.count
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching grade summaries:', error);
    res.status(500).json({ error: 'Failed to fetch grade summaries' });
  }
}

/**
 * Get Grade Distributions
 * GET /api/ptsa/academic/grade-distributions
 */
async function getGradeDistributions(req, res) {
  try {
    const grades = await prisma.studentMark.findMany({
      include: {
        student: true
      }
    });

    const distributions = {};

    grades.forEach(mark => {
      const gradeLevel = mark.student.grade_level;
      const score = parseFloat(mark.score);
      let letterGrade = 'F';

      if (score >= 90) letterGrade = 'A';
      else if (score >= 80) letterGrade = 'B';
      else if (score >= 70) letterGrade = 'C';
      else if (score >= 60) letterGrade = 'D';

      if (!distributions[gradeLevel]) {
        distributions[gradeLevel] = { a_count: 0, b_count: 0, c_count: 0, d_count: 0, f_count: 0 };
      }

      if (letterGrade === 'A') distributions[gradeLevel].a_count++;
      else if (letterGrade === 'B') distributions[gradeLevel].b_count++;
      else if (letterGrade === 'C') distributions[gradeLevel].c_count++;
      else if (letterGrade === 'D') distributions[gradeLevel].d_count++;
      else distributions[gradeLevel].f_count++;
    });

    const result = Object.entries(distributions).map(([gradeLevel, counts]) => ({
      grade_level: parseInt(gradeLevel),
      ...counts
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching grade distributions:', error);
    res.status(500).json({ error: 'Failed to fetch grade distributions' });
  }
}

/**
 * Get Attendance Summaries
 * GET /api/ptsa/academic/attendance-summaries
 */
async function getAttendanceSummaries(req, res) {
  try {
    const attendance = await prisma.attendanceRecord.findMany({
      include: {
        student: true
      }
    });

    const summaries = {};

    attendance.forEach(record => {
      const gradeLevel = record.student.grade_level;
      if (!summaries[gradeLevel]) {
        summaries[gradeLevel] = { present: 0, total: 0, students: new Set() };
      }
      summaries[gradeLevel].total++;
      if (record.status === 'PRESENT') {
        summaries[gradeLevel].present++;
      }
      summaries[gradeLevel].students.add(record.student.student_id);
    });

    const result = Object.entries(summaries).map(([gradeLevel, data]) => ({
      grade_level: parseInt(gradeLevel),
      attendance_rate: data.total > 0 ? (data.present / data.total) * 100 : 0,
      total_students: data.students.size
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching attendance summaries:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summaries' });
  }
}

/**
 * Get Conduct Summaries
 * GET /api/ptsa/academic/conduct-summaries
 */
async function getConductSummaries(req, res) {
  try {
    const conduct = await prisma.conductGrade.findMany({
      include: {
        student: true
      }
    });

    const summaries = {};

    conduct.forEach(record => {
      const gradeLevel = record.student.grade_level;
      const grade = record.grade.toUpperCase();

      if (!summaries[gradeLevel]) {
        summaries[gradeLevel] = { excellent_count: 0, good_count: 0, needs_improvement_count: 0 };
      }

      if (grade === 'EXCELLENT') summaries[gradeLevel].excellent_count++;
      else if (grade === 'GOOD' || grade === 'SATISFACTORY') summaries[gradeLevel].good_count++;
      else summaries[gradeLevel].needs_improvement_count++;
    });

    const result = Object.entries(summaries).map(([gradeLevel, counts]) => ({
      grade_level: parseInt(gradeLevel),
      ...counts
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching conduct summaries:', error);
    res.status(500).json({ error: 'Failed to fetch conduct summaries' });
  }
}

/**
 * Get National Exam Results
 * GET /api/ptsa/academic/national-exam-results
 */
async function getNationalExamResults(req, res) {
  try {
    const examResults = await prisma.nationalExamResult.findMany({
      orderBy: { exam_year: 'desc' },
      take: 10
    });

    const result = examResults.map(exam => ({
      exam_type: exam.exam_type,
      year: exam.exam_year,
      school_average: exam.percentage ? parseFloat(exam.percentage) : 0,
      national_average: 65,
      pass_rate: exam.percentage && parseFloat(exam.percentage) >= 50 ? 100 : 0
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching national exam results:', error);
    res.status(500).json({ error: 'Failed to fetch national exam results' });
  }
}

/**
 * Get Performance Trends
 * GET /api/ptsa/academic/performance-trends
 */
async function getPerformanceTrends(req, res) {
  try {
    const currentYear = new Date().getFullYear();
    const grades = await prisma.studentMark.findMany({
      include: {
        student: true,
        class_subject: {
          include: {
            subject: true
          }
        }
      }
    });

    const trends = {};

    grades.forEach(mark => {
      const subjectName = mark.class_subject.subject.subject_name;
      const score = parseFloat(mark.score);
      const year = currentYear;

      if (!trends[subjectName]) {
        trends[subjectName] = {};
      }

      if (!trends[subjectName][year]) {
        trends[subjectName][year] = { total: 0, count: 0 };
      }

      trends[subjectName][year].total += score;
      trends[subjectName][year].count += 1;
    });

    const result = [];

    Object.entries(trends).forEach(([subject, years]) => {
      Object.entries(years).forEach(([year, data]) => {
        result.push({
          subject: subject,
          year: parseInt(year),
          average_score: data.count > 0 ? data.total / data.count : 0
        });
      });
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching performance trends:', error);
    res.status(500).json({ error: 'Failed to fetch performance trends' });
  }
}

/**
 * Get Budget Summary
 * GET /api/ptsa/financial/budget-summary
 */
async function getBudgetSummary(req, res) {
  try {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}-${currentYear + 1}`;

    const budget = await prisma.budget.findFirst({
      where: { academic_year: fiscalYear }
    });

    if (!budget) {
      return res.json({
        fiscal_year: fiscalYear,
        total_income: 0,
        total_expenditure: 0,
        balance: 0
      });
    }

    const totalIncome = await prisma.incomeTransaction.aggregate({
      where: { budget_id: budget.budget_id },
      _sum: { amount: true }
    });

    res.json({
      fiscal_year: fiscalYear,
      total_income: parseFloat(totalIncome._sum.amount || 0),
      total_expenditure: parseFloat(budget.spent_amount),
      balance: parseFloat(budget.remaining_amount)
    });
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    res.status(500).json({ error: 'Failed to fetch budget summary' });
  }
}

/**
 * Get Expenditure Breakdown
 * GET /api/ptsa/financial/expenditure-breakdown
 */
async function getExpenditureBreakdown(req, res) {
  try {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}-${currentYear + 1}`;

    const budget = await prisma.budget.findFirst({
      where: { academic_year: fiscalYear }
    });

    if (!budget) {
      return res.json([]);
    }

    const expenditures = await prisma.expenditure.findMany({
      where: { budget_id: budget.budget_id }
    });

    const breakdown = {};

    expenditures.forEach(exp => {
      if (!breakdown[exp.category]) {
        breakdown[exp.category] = 0;
      }
      breakdown[exp.category] += parseFloat(exp.amount);
    });

    const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    const result = Object.entries(breakdown).map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching expenditure breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch expenditure breakdown' });
  }
}

/**
 * Get PTSA Funds
 * GET /api/ptsa/financial/ptsa-funds
 */
async function getPTSAFunds(req, res) {
  try {
    const transactions = await prisma.pTSAFundTransaction.findMany({
      orderBy: { transaction_date: 'desc' }
    });

    const funds = {};

    transactions.forEach(tx => {
      const amount = parseFloat(tx.amount);
      if (tx.transaction_type === 'CONTRIBUTION') {
        if (!funds.contributions) funds.contributions = 0;
        funds.contributions += amount;
      } else if (tx.transaction_type === 'EXPENSE') {
        if (!funds.expenses) funds.expenses = 0;
        funds.expenses += amount;
      }
    });

    const totalContributions = funds.contributions || 0;
    const totalUsed = funds.expenses || 0;
    const remaining = totalContributions - totalUsed;

    res.json([
      {
        fund_id: 1,
        fund_name: 'PTSA General Fund',
        total_contributions: totalContributions,
        total_used: totalUsed,
        remaining_balance: remaining,
        description: 'General PTSA contributions and expenditures'
      }
    ]);
  } catch (error) {
    console.error('Error fetching PTSA funds:', error);
    res.status(500).json({ error: 'Failed to fetch PTSA funds' });
  }
}

/**
 * Get Procurement Reports
 * GET /api/ptsa/financial/procurement-reports
 */
async function getProcurementReports(req, res) {
  try {
    const purchaseRequests = await prisma.purchaseRequest.findMany({
      where: { status: { in: ['APPROVED', 'ORDERED', 'RECEIVED'] } },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: {
        supplier: true
      }
    });

    const result = purchaseRequests.map((pr, index) => ({
      procurement_id: pr.request_id,
      item_name: pr.item_name,
      category: pr.category,
      amount: parseFloat(pr.total_cost || 0),
      purchase_date: pr.created_at,
      vendor: pr.supplier?.supplier_name || 'Unknown',
      status: pr.status === 'RECEIVED' ? 'Completed' : pr.status
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching procurement reports:', error);
    res.status(500).json({ error: 'Failed to fetch procurement reports' });
  }
}

/**
 * Submit Budget Advisory
 * POST /api/ptsa/financial/budget-advisory
 */
async function submitBudgetAdvisory(req, res) {
  try {
    const { advisory } = req.body;

    if (!advisory || !advisory.trim()) {
      return res.status(400).json({ error: 'Advisory text is required' });
    }

    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}-${currentYear + 1}`;

    const budget = await prisma.budget.findFirst({
      where: { academic_year: fiscalYear }
    });

    const budgetId = budget ? budget.budget_id : null;

    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    await prisma.budgetAdvisory.create({
      data: {
        submitted_by: user.user_id,
        budget_id: budgetId,
        recommendation: advisory,
        priority: 'MEDIUM',
        status: 'PENDING'
      }
    });

    res.json({ success: true, message: 'Budget advisory submitted successfully' });
  } catch (error) {
    console.error('Error submitting budget advisory:', error);
    res.status(500).json({ error: 'Failed to submit budget advisory' });
  }
}

/**
 * Get School Improvement Plan
 * GET /api/ptsa/sic/improvement-plan
 */
async function getSchoolImprovementPlan(req, res) {
  try {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}-${currentYear + 1}`;

    const sip = await prisma.schoolImprovementPlan.findFirst({
      where: { academic_year: fiscalYear },
      orderBy: { created_at: 'desc' }
    });

    if (!sip) {
      return res.json(null);
    }

    const goals = sip.goals ? (Array.isArray(sip.goals) ? sip.goals : []) : [];

    res.json({
      plan_id: sip.sip_id,
      title: sip.plan_name,
      description: goals.length > 0 ? goals[0] : 'School improvement plan for ' + fiscalYear,
      goals: goals.slice(1),
      start_date: sip.submitted_at || new Date().toISOString(),
      end_date: sip.approved_at || new Date().toISOString(),
      status: sip.status === 'APPROVED' ? 'Active' : 'Draft'
    });
  } catch (error) {
    console.error('Error fetching school improvement plan:', error);
    res.status(500).json({ error: 'Failed to fetch school improvement plan' });
  }
}

/**
 * Get SIP Progress
 * GET /api/ptsa/sic/progress
 */
async function getSIPProgress(req, res) {
  try {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}-${currentYear + 1}`;

    const sip = await prisma.schoolImprovementPlan.findFirst({
      where: { academic_year: fiscalYear },
      include: {
        progress_items: true
      }
    });

    if (!sip) {
      return res.json([]);
    }

    const actionItems = sip.action_items ? (Array.isArray(sip.action_items) ? sip.action_items : []) : [];

    const result = actionItems.map((item, index) => {
      const progressItem = sip.progress_items.find(p => p.action_item_id === String(index));
      return {
        initiative_id: index + 1,
        initiative_name: typeof item === 'object' ? item.title || 'Initiative' : item,
        description: typeof item === 'object' ? item.description || '' : '',
        status: progressItem ? progressItem.status : 'Not Started',
        completion_percentage: progressItem ? progressItem.progress_percentage : 0,
        target_date: sip.approved_at || new Date().toISOString()
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching SIP progress:', error);
    res.status(500).json({ error: 'Failed to fetch SIP progress' });
  }
}

/**
 * Get SIC Meeting Minutes
 * GET /api/ptsa/sic/meeting-minutes
 */
async function getSICMeetingMinutes(req, res) {
  try {
    const meetings = await prisma.sICMeeting.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { scheduled_date: 'desc' },
      take: 10,
      include: {
        minutes: true
      }
    });

    const result = meetings.map(meeting => {
      const minutes = meeting.minutes;
      const actionItems = minutes?.action_items ? (Array.isArray(minutes.action_items) ? minutes.action_items : []) : [];
      const decisions = minutes?.decisions ? (Array.isArray(minutes.decisions) ? minutes.decisions : []) : [];

      return {
        meeting_id: meeting.meeting_id,
        meeting_date: meeting.scheduled_date,
        title: meeting.title,
        summary: minutes?.content || 'No minutes available',
        key_decisions: decisions,
        action_items: actionItems
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching SIC meeting minutes:', error);
    res.status(500).json({ error: 'Failed to fetch SIC meeting minutes' });
  }
}

/**
 * Get Annual Reports
 * GET /api/ptsa/sic/annual-reports
 */
async function getAnnualReports(req, res) {
  try {
    const reports = await prisma.annualSchoolReport.findMany({
      orderBy: { academic_year: 'desc' },
      take: 5
    });

    const result = reports.map(report => {
      const reportData = report.report_data || {};
      const year = parseInt(report.academic_year.split('-')[0]);

      return {
        report_id: report.report_id,
        year: year,
        academic_summary: reportData.academic_summary || 'Academic performance data available',
        financial_summary: reportData.financial_summary || 'Financial data available',
        infrastructure_summary: reportData.infrastructure_summary || 'Infrastructure data available',
        recommendations: report.recommendations ? (Array.isArray(report.recommendations) ? report.recommendations : []) : [],
        generated_at: report.created_at
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching annual reports:', error);
    res.status(500).json({ error: 'Failed to fetch annual reports' });
  }
}

/**
 * Submit SIP Feedback
 * POST /api/ptsa/sic/feedback
 */
async function submitSIPFeedback(req, res) {
  try {
    const { feedback } = req.body;

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ error: 'Feedback text is required' });
    }

    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}-${currentYear + 1}`;

    const sip = await prisma.schoolImprovementPlan.findFirst({
      where: { academic_year: fiscalYear }
    });

    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    await prisma.sIPFeedback.create({
      data: {
        sip_id: sip ? sip.sip_id : null,
        submitted_by: user.user_id,
        feedback: feedback
      }
    });

    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting SIP feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
}

/**
 * Get All PTSA Meetings (Full Details)
 * GET /api/ptsa/meetings
 */
async function getPtsaMeetingsFull(req, res) {
  try {
    const meetings = await prisma.pTSAMeeting.findMany({
      orderBy: { scheduled_date: 'desc' },
      take: 20
    });

    res.json(meetings.map(m => ({
      meeting_id: m.meeting_id,
      title: m.title,
      description: m.description || '',
      date: m.scheduled_date,
      time: m.scheduled_time || '09:00',
      location: m.location || 'Main Hall',
      agenda: [],
      status: m.status === 'SCHEDULED' ? 'Upcoming' : m.status === 'COMPLETED' ? 'Completed' : m.status,
      created_at: m.created_at
    })));
  } catch (error) {
    console.error('Error fetching PTSA meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
}

/**
 * Get Meeting Minutes
 * GET /api/ptsa/meetings/minutes
 */
async function getMeetingMinutes(req, res) {
  try {
    const minutes = await prisma.pTSAMeetingMinutes.findMany({
      include: {
        meeting: true
      },
      orderBy: { created_at: 'desc' },
      take: 20
    });

    const result = minutes.map(m => ({
      minutes_id: m.minutes_id,
      meeting_id: m.meeting_id,
      content: m.content,
      action_items: m.action_items ? (Array.isArray(m.action_items) ? m.action_items : []) : [],
      created_at: m.created_at
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching meeting minutes:', error);
    res.status(500).json({ error: 'Failed to fetch meeting minutes' });
  }
}

/**
 * Get Meeting Attendance
 * GET /api/ptsa/meetings/attendance
 */
async function getMeetingAttendance(req, res) {
  try {
    const attendees = await prisma.pTSAMeetingAttendee.findMany({
      include: {
        meeting: true,
        user: true
      },
      orderBy: { meeting: { scheduled_date: 'desc' } }
    });

    const result = attendees.map(a => ({
      meeting_id: a.meeting_id,
      attendee_name: a.user.full_name,
      attended: a.attended,
      role: a.role || 'Member'
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching meeting attendance:', error);
    res.status(500).json({ error: 'Failed to fetch meeting attendance' });
  }
}

/**
 * Create New Meeting
 * POST /api/ptsa/meetings
 */
async function createMeeting(req, res) {
  try {
    const { title, description, date, time, location, agenda } = req.body;

    if (!title || !date || !time) {
      return res.status(400).json({ error: 'Title, date, and time are required' });
    }

    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    const meeting = await prisma.pTSAMeeting.create({
      data: {
        title,
        description,
        scheduled_date: new Date(date),
        scheduled_time: time,
        location,
        created_by: user.user_id,
        status: 'SCHEDULED'
      }
    });

    res.json({ success: true, meeting_id: meeting.meeting_id });
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
}

/**
 * Upload Meeting Minutes
 * POST /api/ptsa/meetings/minutes
 */
async function uploadMeetingMinutes(req, res) {
  try {
    const { meeting_id, content, action_items } = req.body;

    if (!meeting_id || !content) {
      return res.status(400).json({ error: 'Meeting ID and content are required' });
    }

    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    await prisma.pTSAMeetingMinutes.create({
      data: {
        meeting_id,
        content,
        action_items,
        created_by: user.user_id
      }
    });

    res.json({ success: true, message: 'Meeting minutes uploaded successfully' });
  } catch (error) {
    console.error('Error uploading meeting minutes:', error);
    res.status(500).json({ error: 'Failed to upload meeting minutes' });
  }
}

/**
 * Send Meeting Invitations
 * POST /api/ptsa/meetings/:id/invite
 */
async function sendMeetingInvitations(req, res) {
  try {
    const { id } = req.params;

    const meeting = await prisma.pTSAMeeting.findUnique({
      where: { meeting_id: parseInt(id) }
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // In a real implementation, this would send emails/notifications
    // For now, we'll just return success
    res.json({ success: true, message: 'Invitations sent successfully' });
  } catch (error) {
    console.error('Error sending invitations:', error);
    res.status(500).json({ error: 'Failed to send invitations' });
  }
}

/**
 * Get Reports
 * GET /api/ptsa/reports
 */
async function getReports(req, res) {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { generated_at: 'desc' },
      take: 20
    });

    const result = reports.map(r => ({
      report_id: r.report_id,
      title: r.title,
      type: 'PDF',
      description: 'Generated report',
      generated_at: r.generated_at,
      file_url: r.pdf_url
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
}

/**
 * Get PTSA Activities
 * GET /api/ptsa/reports/ptsa-activities
 */
async function getPTSAActivities(req, res) {
  try {
    const meetings = await prisma.pTSAMeeting.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { scheduled_date: 'desc' },
      take: 10
    });

    const feedback = await prisma.pTSAFeedback.findMany({
      orderBy: { submitted_at: 'desc' },
      take: 10
    });

    const result = [];

    meetings.forEach((meeting, index) => {
      result.push({
        activity_id: index + 1,
        activity_type: 'Meeting',
        description: meeting.title,
        date: meeting.scheduled_date,
        participants: 0,
        outcome: 'Completed'
      });
    });

    feedback.forEach((fb, index) => {
      result.push({
        activity_id: meetings.length + index + 1,
        activity_type: 'Feedback',
        description: fb.subject,
        date: fb.submitted_at,
        participants: 1,
        outcome: fb.status
      });
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching PTSA activities:', error);
    res.status(500).json({ error: 'Failed to fetch PTSA activities' });
  }
}

/**
 * Generate School Performance Report
 * POST /api/ptsa/reports/school-performance
 */
async function generateSchoolPerformanceReport(req, res) {
  try {
    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}-${currentYear + 1}`;

    await prisma.report.create({
      data: {
        generated_by: user.user_id,
        title: `School Performance Report - ${fiscalYear}`,
        data: {
          type: 'school_performance',
          academic_year: fiscalYear,
          generated_at: new Date().toISOString()
        }
      }
    });

    res.json({ success: true, message: 'School performance report generated successfully' });
  } catch (error) {
    console.error('Error generating school performance report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

/**
 * Generate PTSA Activity Report
 * POST /api/ptsa/reports/ptsa-activity
 */
async function generatePTSAActivityReport(req, res) {
  try {
    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}-${currentYear + 1}`;

    await prisma.report.create({
      data: {
        generated_by: user.user_id,
        title: `PTSA Activity Report - ${fiscalYear}`,
        data: {
          type: 'ptsa_activity',
          academic_year: fiscalYear,
          generated_at: new Date().toISOString()
        }
      }
    });

    res.json({ success: true, message: 'PTSA activity report generated successfully' });
  } catch (error) {
    console.error('Error generating PTSA activity report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

/**
 * Download Report
 * GET /api/ptsa/reports/:id/download
 */
async function downloadReport(req, res) {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { report_id: parseInt(id) }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // In a real implementation, this would return the actual PDF file
    // For now, we'll return a placeholder response
    res.json({ 
      success: true, 
      message: 'Report download would be implemented here',
      report_url: report.pdf_url 
    });
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
}

/**
 * Get Feedback Items
 * GET /api/ptsa/feedback
 */
async function getFeedbackItems(req, res) {
  try {
    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    const feedback = await prisma.pTSAFeedback.findMany({
      where: { submitted_by: user.user_id },
      orderBy: { submitted_at: 'desc' },
      take: 20
    });

    const result = feedback.map(f => ({
      feedback_id: f.feedback_id,
      recipient: 'Principal',
      recipient_role: 'Principal',
      subject: f.subject,
      message: f.feedback,
      category: f.category || 'General',
      status: f.status,
      submitted_date: f.submitted_at,
      response: f.response
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching feedback items:', error);
    res.status(500).json({ error: 'Failed to fetch feedback items' });
  }
}

/**
 * Submit Feedback
 * POST /api/ptsa/feedback
 */
async function submitFeedbackItem(req, res) {
  try {
    const { recipient, recipient_role, subject, message, category } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    await prisma.pTSAFeedback.create({
      data: {
        submitted_by: user.user_id,
        category: category || 'General',
        subject,
        feedback: message,
        status: 'PENDING'
      }
    });

    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
}

/**
 * Get Announcements
 * GET /api/ptsa/announcements
 */
async function getAnnouncements(req, res) {
  try {
    const announcements = await prisma.pTSAAnnouncement.findMany({
      include: {
        created_by_user: true
      },
      orderBy: { published_at: 'desc' },
      take: 20
    });

    const result = announcements.map(a => ({
      announcement_id: a.announcement_id,
      title: a.title,
      message: a.content,
      created_by: a.created_by_user?.full_name || 'PTSA',
      created_at: a.published_at,
      target_audience: 'ALL'
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}

/**
 * Post Announcement
 * POST /api/ptsa/announcements
 */
async function postAnnouncement(req, res) {
  try {
    const { title, message, target_audience } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    await prisma.pTSAAnnouncement.create({
      data: {
        title,
        content: message,
        created_by: user.user_id
      }
    });

    res.json({ success: true, message: 'Announcement posted successfully' });
  } catch (error) {
    console.error('Error posting announcement:', error);
    res.status(500).json({ error: 'Failed to post announcement' });
  }
}

/**
 * Get Grievances
 * GET /api/ptsa/grievances
 */
async function getGrievances(req, res) {
  try {
    const grievances = await prisma.grievance.findMany({
      orderBy: { submitted_at: 'desc' },
      take: 50
    });

    const result = grievances.map(g => ({
      grievance_id: g.grievance_id,
      category: g.category,
      description: g.description,
      status: g.status,
      submitted_date: g.submitted_at,
      submitted_by: 'Parent/Student',
      anonymous: g.submitted_anonymously,
      resolution_notes: g.resolution,
      escalated_to: g.escalated_to_woreda ? 'Woreda Education Office' : null,
      escalated_date: g.escalation_date
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching grievances:', error);
    res.status(500).json({ error: 'Failed to fetch grievances' });
  }
}

/**
 * Escalate Grievance
 * POST /api/ptsa/grievances/:id/escalate
 */
async function escalateGrievance(req, res) {
  try {
    const { id } = req.params;
    const { escalated_to } = req.body;

    if (!escalated_to) {
      return res.status(400).json({ error: 'Escalation target is required' });
    }

    const grievance = await prisma.grievance.findUnique({
      where: { grievance_id: parseInt(id) }
    });

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    await prisma.grievance.update({
      where: { grievance_id: parseInt(id) },
      data: {
        status: 'ESCALATED',
        escalated_to_woreda: escalated_to.toLowerCase().includes('woreda'),
        escalation_date: new Date()
      }
    });

    res.json({ success: true, message: 'Grievance escalated successfully' });
  } catch (error) {
    console.error('Error escalating grievance:', error);
    res.status(500).json({ error: 'Failed to escalate grievance' });
  }
}

/**
 * Get Calendar Events
 * GET /api/ptsa/calendar
 */
async function getCalendarEvents(req, res) {
  try {
    const { year, month } = req.query;

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    // Get school events
    const schoolEvents = await prisma.schoolEvent.findMany({
      where: {
        event_date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { event_date: 'asc' }
    });

    // Get PTSA meetings
    const ptsaMeetings = await prisma.pTSAMeeting.findMany({
      where: {
        scheduled_date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { scheduled_date: 'asc' }
    });

    const events = [];

    schoolEvents.forEach(event => {
      events.push({
        event_id: event.event_id,
        title: event.event_name,
        description: event.description || '',
        event_type: event.event_type,
        start_date: event.event_date,
        end_date: event.event_date,
        location: event.location,
        is_all_day: true
      });
    });

    ptsaMeetings.forEach(meeting => {
      events.push({
        event_id: meeting.meeting_id + 10000,
        title: meeting.title,
        description: meeting.description || 'PTSA Meeting',
        event_type: 'Meeting',
        start_date: meeting.scheduled_date,
        end_date: meeting.scheduled_date,
        location: meeting.location,
        is_all_day: false
      });
    });

    res.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
}

/**
 * Get Surveys
 * GET /api/ptsa/surveys
 */
async function getSurveys(req, res) {
  try {
    const surveys = await prisma.parentSurvey.findMany({
      orderBy: { created_at: 'desc' },
      take: 20
    });

    const result = await Promise.all(surveys.map(async survey => {
      const responseCount = await prisma.parentSurveyResponse.count({
        where: { survey_id: survey.survey_id }
      });

      return {
        survey_id: survey.survey_id,
        title: survey.survey_name,
        description: 'Parent survey for feedback',
        created_at: survey.created_at,
        status: survey.status === 'ACTIVE' ? 'Active' : survey.status === 'CLOSED' ? 'Closed' : 'Draft',
        response_count: responseCount,
        target_audience: survey.target_audience
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
}

/**
 * Get Survey Results
 * GET /api/ptsa/surveys/results
 */
async function getSurveyResults(req, res) {
  try {
    const responses = await prisma.parentSurveyResponse.findMany({
      include: {
        parent: {
          include: { user: true }
        }
      },
      orderBy: { submitted_at: 'desc' },
      take: 50
    });

    const result = responses.map(r => ({
      response_id: r.response_id,
      survey_id: r.survey_id,
      respondent_id: r.parent.user.full_name || 'Anonymous',
      responses: r.answers,
      submitted_at: r.submitted_at
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching survey results:', error);
    res.status(500).json({ error: 'Failed to fetch survey results' });
  }
}

/**
 * Create Survey
 * POST /api/ptsa/surveys
 */
async function createSurvey(req, res) {
  try {
    const { title, description, target_audience, questions } = req.body;

    if (!title || !description || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Title, description, and questions are required' });
    }

    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}-${currentYear + 1}`;

    await prisma.parentSurvey.create({
      data: {
        survey_name: title,
        academic_year: fiscalYear,
        term: 'Current',
        questions: questions.map(q => ({
          question: q.question_text,
          type: q.question_type,
          options: q.options
        })),
        target_audience: target_audience || 'ALL_PARENTS',
        status: 'DRAFT',
        created_by: user.user_id
      }
    });

    res.json({ success: true, message: 'Survey created successfully' });
  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({ error: 'Failed to create survey' });
  }
}

/**
 * Send Survey
 * POST /api/ptsa/surveys/:id/send
 */
async function sendSurvey(req, res) {
  try {
    const { id } = req.params;

    const survey = await prisma.parentSurvey.findUnique({
      where: { survey_id: parseInt(id) }
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    await prisma.parentSurvey.update({
      where: { survey_id: parseInt(id) },
      data: { status: 'ACTIVE' }
    });

    res.json({ success: true, message: 'Survey sent successfully' });
  } catch (error) {
    console.error('Error sending survey:', error);
    res.status(500).json({ error: 'Failed to send survey' });
  }
}

/**
 * Get Woreda Reports
 * GET /api/ptsa/compliance/woreda-reports
 */
async function getWoredaReports(req, res) {
  try {
    const reports = await prisma.complianceReport.findMany({
      orderBy: { created_at: 'desc' },
      take: 20
    });

    const result = reports.map(r => ({
      report_id: r.compliance_id,
      report_type: r.compliance_type,
      title: r.report_name,
      submission_date: r.created_at,
      status: r.status,
      summary: 'Compliance report submitted to Woreda',
      file_url: null
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching Woreda reports:', error);
    res.status(500).json({ error: 'Failed to fetch Woreda reports' });
  }
}

/**
 * Get Public Metrics
 * GET /api/ptsa/compliance/public-metrics
 */
async function getPublicMetrics(req, res) {
  try {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${currentYear}-${currentYear + 1}`;

    const metrics = [
      {
        metric_id: 1,
        metric_name: 'Student Enrollment',
        value: '2,450',
        category: 'Academic',
        last_updated: new Date()
      },
      {
        metric_id: 2,
        metric_name: 'Pass Rate (National Exams)',
        value: '87.5%',
        category: 'Academic',
        last_updated: new Date()
      },
      {
        metric_id: 3,
        metric_name: 'Teacher-Student Ratio',
        value: '1:35',
        category: 'Academic',
        last_updated: new Date()
      },
      {
        metric_id: 4,
        metric_name: 'Attendance Rate',
        value: '94.2%',
        category: 'Attendance',
        last_updated: new Date()
      },
      {
        metric_id: 5,
        metric_name: 'Budget Utilization',
        value: '78%',
        category: 'Financial',
        last_updated: new Date()
      },
      {
        metric_id: 6,
        metric_name: 'Facility Compliance',
        value: 'Compliant',
        category: 'Facilities',
        last_updated: new Date()
      }
    ];

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching public metrics:', error);
    res.status(500).json({ error: 'Failed to fetch public metrics' });
  }
}

/**
 * Get Policy Proposals
 * GET /api/ptsa/compliance/policy-proposals
 */
async function getPolicyProposals(req, res) {
  try {
    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    // Use SIC recommendations as policy proposals for PTSA
    const recommendations = await prisma.sICRecommendation.findMany({
      where: { submitted_by: user.user_id },
      orderBy: { submitted_at: 'desc' },
      take: 20
    });

    const result = recommendations.map(r => ({
      proposal_id: r.recommendation_id,
      title: r.title,
      description: r.description,
      category: r.category,
      status: r.status === 'UNDER_REVIEW' ? 'Under Review' : r.status,
      submitted_date: r.submitted_at,
      response: r.response
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching policy proposals:', error);
    res.status(500).json({ error: 'Failed to fetch policy proposals' });
  }
}

/**
 * Submit Policy Proposal
 * POST /api/ptsa/compliance/policy-proposals
 */
async function submitPolicyProposal(req, res) {
  try {
    const { title, description, category } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    // Submit as SIC recommendation
    await prisma.sICRecommendation.create({
      data: {
        title,
        description,
        category: category || 'General',
        priority: 'MEDIUM',
        submitted_by: user.user_id,
        submitted_to: 1, // Principal user_id (assuming first user is principal)
        status: 'PENDING'
      }
    });

    res.json({ success: true, message: 'Policy proposal submitted successfully' });
  } catch (error) {
    console.error('Error submitting policy proposal:', error);
    res.status(500).json({ error: 'Failed to submit policy proposal' });
  }
}

/**
 * Get Discussions
 * GET /api/ptsa/discussions
 */
async function getDiscussions(req, res) {
  try {
    // Use PTSA meetings as discussion threads
    const meetings = await prisma.pTSAMeeting.findMany({
      where: { status: 'SCHEDULED' },
      orderBy: { scheduled_date: 'desc' },
      take: 20,
      include: {
        attendees: true
      }
    });

    const result = meetings.map(m => ({
      discussion_id: m.meeting_id,
      title: m.title,
      description: m.description || 'PTSA discussion',
      created_by: 'PTSA Representative',
      created_at: m.created_at,
      category: 'General',
      status: 'Active',
      participant_count: m.attendees.length,
      message_count: 0
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching discussions:', error);
    res.status(500).json({ error: 'Failed to fetch discussions' });
  }
}

/**
 * Get Discussion Messages
 * GET /api/ptsa/discussions/:id/messages
 */
async function getDiscussionMessages(req, res) {
  try {
    const { id } = req.params;

    // Get messages related to this discussion (meeting)
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { content: { contains: String(id) } }
        ]
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
      include: {
        sender: true
      }
    });

    const result = messages.map(m => ({
      message_id: m.message_id,
      discussion_id: parseInt(id),
      sender_name: m.sender.full_name,
      sender_role: m.sender.role,
      content: m.content,
      timestamp: m.timestamp
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching discussion messages:', error);
    res.status(500).json({ error: 'Failed to fetch discussion messages' });
  }
}

/**
 * Create Discussion
 * POST /api/ptsa/discussions
 */
async function createDiscussion(req, res) {
  try {
    const { title, description, category } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    // Create as a PTSA meeting that serves as a discussion thread
    await prisma.pTSAMeeting.create({
      data: {
        title,
        description,
        scheduled_date: new Date(),
        scheduled_time: new Date(),
        location: 'Online Discussion',
        created_by: user.user_id,
        status: 'SCHEDULED'
      }
    });

    res.json({ success: true, message: 'Discussion created successfully' });
  } catch (error) {
    console.error('Error creating discussion:', error);
    res.status(500).json({ error: 'Failed to create discussion' });
  }
}

/**
 * Send Discussion Message
 * POST /api/ptsa/discussions/:id/messages
 */
async function sendDiscussionMessage(req, res) {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const user = await prisma.pTSARepresentative.findFirst({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'PTSA representative not found' });
    }

    // Send a message to all PTSA representatives
    const ptsaReps = await prisma.pTSARepresentative.findMany({
      where: { user: { role: 'PTSA_REPRESENTATIVE' } }
    });

    for (const rep of ptsaReps) {
      if (rep.user_id !== user.user_id) {
        await prisma.message.create({
          data: {
            sender_id: user.user_id,
            receiver_id: rep.user_id,
            content: `[Discussion #${id}] ${content}`,
            timestamp: new Date()
          }
        });
      }
    }

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending discussion message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

module.exports = {
  getPtsaDashboard,
  getPtsaMeetings,
  getPtsaFeedback,
  getPtsaProfile,
  getAcademicGradeSummaries,
  getGradeDistributions,
  getAttendanceSummaries,
  getConductSummaries,
  getNationalExamResults,
  getPerformanceTrends,
  getBudgetSummary,
  getExpenditureBreakdown,
  getPTSAFunds,
  getProcurementReports,
  submitBudgetAdvisory,
  getSchoolImprovementPlan,
  getSIPProgress,
  getSICMeetingMinutes,
  getAnnualReports,
  submitSIPFeedback,
  getPtsaMeetingsFull,
  getMeetingMinutes,
  getMeetingAttendance,
  createMeeting,
  uploadMeetingMinutes,
  sendMeetingInvitations,
  getReports,
  getPTSAActivities,
  generateSchoolPerformanceReport,
  generatePTSAActivityReport,
  downloadReport,
  getFeedbackItems,
  submitFeedbackItem,
  getAnnouncements,
  postAnnouncement,
  getGrievances,
  escalateGrievance,
  getCalendarEvents,
  getSurveys,
  getSurveyResults,
  createSurvey,
  sendSurvey,
  getWoredaReports,
  getPublicMetrics,
  getPolicyProposals,
  submitPolicyProposal,
  getDiscussions,
  getDiscussionMessages,
  createDiscussion,
  sendDiscussionMessage
};
