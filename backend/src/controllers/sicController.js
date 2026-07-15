const prisma = require('../config/prisma');

/**
 * SIC (School Improvement Committee) MEMBER CONTROLLER
 * Comprehensive controller for SIC Member operations
 */

// ==================== DASHBOARD & OVERVIEW ====================

/**
 * Get SIC Dashboard Data
 * GET /api/sic/dashboard
 */
async function getSICDashboard(req, res) {
  try {
    const userId = req.user?.user_id;
    
    // Get current academic year
    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true }
    });

    // Get active SIP
    const activeSIP = await prisma.schoolImprovementPlan.findFirst({
      where: {
        academic_year: currentYear?.year_name || '2024-2025',
        status: { in: ['APPROVED', 'IN_PROGRESS'] }
      },
      include: {
        progress_items: true
      }
    });

    // Calculate SIP progress
    let sipProgress = 0;
    let sipStatus = 'Not Started';
    if (activeSIP && activeSIP.progress_items.length > 0) {
      const totalProgress = activeSIP.progress_items.reduce((sum, item) => sum + item.progress_percentage, 0);
      sipProgress = Math.round(totalProgress / activeSIP.progress_items.length);
      
      const completedItems = activeSIP.progress_items.filter(item => item.status === 'COMPLETED').length;
      const totalItems = activeSIP.progress_items.length;
      if (completedItems === totalItems) sipStatus = 'Completed';
      else if (sipProgress >= 75) sipStatus = 'On Track';
      else if (sipProgress >= 50) sipStatus = 'In Progress';
      else sipStatus = 'Behind';
    }

    // Get upcoming SIC meetings
    const upcomingMeetings = await prisma.sICMeeting.findMany({
      where: {
        status: 'SCHEDULED',
        scheduled_date: { gte: new Date() }
      },
      orderBy: { scheduled_date: 'asc' },
      take: 3,
      include: {
        attendees: {
          where: { user_id: userId },
          take: 1
        }
      }
    });

    // Get recent committee actions
    const recentActions = await prisma.sICActionLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 5
    });

    // Get KPI summary (mock data for now)
    const kpiSummary = {
      student_pass_rate: 78.5,
      teacher_attendance_rate: 92.3,
      student_retention_rate: 95.2,
      community_satisfaction: 4.2
    };

    // Get budget allocated for improvements
    const budget = await prisma.budget.findFirst({
      where: {
        academic_year: currentYear?.year_name || '2024-2025',
        status: 'ACTIVE'
      }
    });

    const improvementBudget = budget ? {
      allocated: Number(budget.total_amount) * 0.15, // 15% for improvements
      spent: Number(budget.spent_amount) * 0.15,
      remaining: Number(budget.remaining_amount) * 0.15
    } : null;

    return res.json({
      sip: {
        plan_name: activeSIP?.plan_name || 'No Active SIP',
        progress: sipProgress,
        status: sipStatus,
        goals_count: activeSIP?.goals?.length || 0
      },
      upcoming_meetings: upcomingMeetings.map(m => ({
        meeting_id: m.meeting_id,
        title: m.title,
        scheduled_date: m.scheduled_date,
        scheduled_time: m.scheduled_time,
        location: m.location,
        is_attending: m.attendees.length > 0
      })),
      recent_actions: recentActions,
      kpi_summary: kpiSummary,
      improvement_budget: improvementBudget,
      academic_year: currentYear?.year_name || '2024-2025'
    });
  } catch (error) {
    console.error('SIC Dashboard error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== SIP MANAGEMENT ====================

/**
 * Get Current School Improvement Plan
 * GET /api/sic/sip/current
 */
async function getCurrentSIP(req, res) {
  try {
    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true }
    });

    const sip = await prisma.schoolImprovementPlan.findFirst({
      where: {
        academic_year: currentYear?.year_name || '2024-2025',
        status: { in: ['APPROVED', 'IN_PROGRESS'] }
      },
      include: {
        progress_items: true,
        feedback: {
          include: {
            sip: false
          }
        }
      }
    });

    if (!sip) {
      return res.json({ message: 'No active SIP found' });
    }

    return res.json(sip);
  } catch (error) {
    console.error('Get SIP error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get SIP Progress Dashboard
 * GET /api/sic/sip/progress
 */
async function getSIPProgress(req, res) {
  try {
    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true }
    });

    const sip = await prisma.schoolImprovementPlan.findFirst({
      where: {
        academic_year: currentYear?.year_name || '2024-2025',
        status: { in: ['APPROVED', 'IN_PROGRESS'] }
      },
      include: {
        progress_items: true
      }
    });

    if (!sip) {
      return res.json({ message: 'No active SIP found' });
    }

    // Group progress by status
    const statusCounts = {
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      ON_TRACK: 0,
      DELAYED: 0,
      COMPLETED: 0
    };

    sip.progress_items.forEach(item => {
      if (statusCounts[item.status] !== undefined) {
        statusCounts[item.status]++;
      }
    });

    const totalItems = sip.progress_items.length;
    const overallProgress = sip.progress_items.reduce((sum, item) => sum + item.progress_percentage, 0) / (totalItems || 1);

    return res.json({
      sip_id: sip.sip_id,
      plan_name: sip.plan_name,
      overall_progress: Math.round(overallProgress),
      status_breakdown: statusCounts,
      total_items: totalItems,
      progress_items: sip.progress_items
    });
  } catch (error) {
    console.error('Get SIP Progress error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Submit SIP Feedback
 * POST /api/sic/sip/feedback
 */
async function submitSIPFeedback(req, res) {
  try {
    const { sip_id, feedback } = req.body;
    const userId = req.user?.user_id;

    if (!sip_id || !feedback) {
      return res.status(400).json({ error: 'SIP ID and feedback are required' });
    }

    const sipFeedback = await prisma.sIPFeedback.create({
      data: {
        sip_id: parseInt(sip_id),
        submitted_by: userId,
        feedback: feedback
      }
    });

    return res.status(201).json(sipFeedback);
  } catch (error) {
    console.error('Submit SIP Feedback error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Propose SIP Amendment
 * POST /api/sic/sip/amendments
 */
async function proposeSIPAmendment(req, res) {
  try {
    const { sip_id, amendment_title, amendment_description, priority } = req.body;
    const userId = req.user?.user_id;

    if (!sip_id || !amendment_title || !amendment_description) {
      return res.status(400).json({ error: 'SIP ID, title, and description are required' });
    }

    // Create as a recommendation
    const amendment = await prisma.sICRecommendation.create({
      data: {
        title: amendment_title,
        description: amendment_description,
        category: 'ACADEMIC',
        priority: priority || 'MEDIUM',
        submitted_by: userId,
        submitted_to: 1, // Principal (would need to get actual principal ID)
        status: 'PENDING'
      }
    });

    return res.status(201).json(amendment);
  } catch (error) {
    console.error('Propose SIP Amendment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== MONITORING & EVALUATION ====================

/**
 * Get KPIs and Trends
 * GET /api/sic/monitoring/kpis
 */
async function getKPIs(req, res) {
  try {
    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true }
    });

    // Mock KPI data - in production, this would come from actual calculations
    const kpis = {
      academic_performance: {
        student_pass_rate: 78.5,
        grade_10_pass_rate: 82.3,
        grade_12_pass_rate: 74.7,
        year_over_year_change: 3.2
      },
      attendance: {
        student_attendance_rate: 92.3,
        teacher_attendance_rate: 95.8,
        year_over_year_change: 1.5
      },
      retention: {
        student_retention_rate: 95.2,
        teacher_retention_rate: 88.5,
        year_over_year_change: 2.1
      },
      community: {
        parent_satisfaction: 4.2,
        student_satisfaction: 4.0,
        community_engagement_score: 3.8
      }
    };

    return res.json(kpis);
  } catch (error) {
    console.error('Get KPIs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Academic Performance Data
 * GET /api/sic/monitoring/academic-performance
 */
async function getAcademicPerformance(req, res) {
  try {
    // Mock aggregated academic performance data
    const performanceData = {
      grade_9: {
        total_students: 245,
        average_score: 78.5,
        pass_rate: 82.3,
        subject_breakdown: {
          Mathematics: 76.2,
          English: 81.5,
          Physics: 74.8,
          Chemistry: 77.3,
          Biology: 82.1
        }
      },
      grade_10: {
        total_students: 238,
        average_score: 75.2,
        pass_rate: 79.8,
        subject_breakdown: {
          Mathematics: 72.5,
          English: 80.2,
          Physics: 71.8,
          Chemistry: 75.6,
          Biology: 78.9
        }
      },
      grade_11: {
        total_students: 195,
        average_score: 72.8,
        pass_rate: 76.5,
        subject_breakdown: {
          Mathematics: 70.2,
          English: 78.5,
          Physics: 69.8,
          Chemistry: 73.4,
          Biology: 76.1
        }
      },
      grade_12: {
        total_students: 182,
        average_score: 74.1,
        pass_rate: 78.2,
        subject_breakdown: {
          Mathematics: 71.5,
          English: 79.2,
          Physics: 72.3,
          Chemistry: 74.8,
          Biology: 77.5
        }
      }
    };

    return res.json(performanceData);
  } catch (error) {
    console.error('Get Academic Performance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Financial Progress
 * GET /api/sic/monitoring/financial-progress
 */
async function getFinancialProgress(req, res) {
  try {
    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true }
    });

    const budget = await prisma.budget.findFirst({
      where: {
        academic_year: currentYear?.year_name || '2024-2025',
        status: 'ACTIVE'
      }
    });

    if (!budget) {
      return res.json({ message: 'No active budget found' });
    }

    const expenditures = await prisma.expenditure.findMany({
      where: { budget_id: budget.budget_id },
      orderBy: { expenditure_date: 'desc' },
      take: 10
    });

    return res.json({
      budget_summary: {
        total_amount: Number(budget.total_amount),
        allocated_amount: Number(budget.allocated_amount),
        spent_amount: Number(budget.spent_amount),
        remaining_amount: Number(budget.remaining_amount),
        utilization_rate: ((Number(budget.spent_amount) / Number(budget.total_amount)) * 100).toFixed(1)
      },
      recent_expenditures: expenditures,
      breakdown: budget.breakdown
    });
  } catch (error) {
    console.error('Get Financial Progress error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== MEETING MANAGEMENT ====================

/**
 * Get SIC Meeting Schedule
 * GET /api/sic/meetings
 */
async function getSICMeetings(req, res) {
  try {
    const meetings = await prisma.sICMeeting.findMany({
      orderBy: { scheduled_date: 'desc' },
      include: {
        attendees: {
          include: {
            user: {
              select: {
                full_name: true,
                email: true
              }
            }
          }
        },
        minutes: true,
        agenda_items: true
      }
    });

    return res.json(meetings);
  } catch (error) {
    console.error('Get SIC Meetings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Meeting Agenda
 * GET /api/sic/meetings/:meetingId/agenda
 */
async function getMeetingAgenda(req, res) {
  try {
    const { meetingId } = req.params;

    const agendaItems = await prisma.sICAgendaItem.findMany({
      where: { meeting_id: parseInt(meetingId) },
      orderBy: { order: 'asc' }
    });

    return res.json(agendaItems);
  } catch (error) {
    console.error('Get Meeting Agenda error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Meeting Minutes
 * GET /api/sic/meetings/:meetingId/minutes
 */
async function getMeetingMinutes(req, res) {
  try {
    const { meetingId } = req.params;

    const minutes = await prisma.sICMeetingMinutes.findUnique({
      where: { meeting_id: parseInt(meetingId) }
    });

    if (!minutes) {
      return res.json({ message: 'No minutes available for this meeting' });
    }

    return res.json(minutes);
  } catch (error) {
    console.error('Get Meeting Minutes error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Submit Agenda Item
 * POST /api/sic/meetings/agenda-items
 */
async function submitAgendaItem(req, res) {
  try {
    const { meeting_id, title, description, priority } = req.body;
    const userId = req.user?.user_id;

    if (!meeting_id || !title) {
      return res.status(400).json({ error: 'Meeting ID and title are required' });
    }

    const agendaItem = await prisma.sICAgendaItem.create({
      data: {
        meeting_id: parseInt(meeting_id),
        title,
        description,
        priority: priority || 'MEDIUM',
        submitted_by: userId
      }
    });

    return res.status(201).json(agendaItem);
  } catch (error) {
    console.error('Submit Agenda Item error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Vote on Resolution
 * POST /api/sic/meetings/resolutions/:resolutionId/vote
 */
async function voteOnResolution(req, res) {
  try {
    const { resolutionId } = req.params;
    const { vote } = req.body; // 'for', 'against', 'abstain'
    const userId = req.user?.user_id;

    if (!vote || !['for', 'against', 'abstain'].includes(vote)) {
      return res.status(400).json({ error: 'Invalid vote' });
    }

    // In a real implementation, you would track individual votes
    // For now, we'll just update the counts
    const resolution = await prisma.sICResolution.findUnique({
      where: { resolution_id: parseInt(resolutionId) }
    });

    if (!resolution) {
      return res.status(404).json({ error: 'Resolution not found' });
    }

    const updateData = {};
    if (vote === 'for') updateData.vote_for = resolution.vote_for + 1;
    if (vote === 'against') updateData.vote_against = resolution.vote_against + 1;
    if (vote === 'abstain') updateData.vote_abstain = resolution.vote_abstain + 1;

    const updatedResolution = await prisma.sICResolution.update({
      where: { resolution_id: parseInt(resolutionId) },
      data: updateData
    });

    return res.json(updatedResolution);
  } catch (error) {
    console.error('Vote on Resolution error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== NEEDS ASSESSMENT & SURVEYS ====================

/**
 * Get Needs Assessments
 * GET /api/sic/needs-assessments
 */
async function getNeedsAssessments(req, res) {
  try {
    const assessments = await prisma.sICNeedsAssessment.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        responses: true
      }
    });

    return res.json(assessments);
  } catch (error) {
    console.error('Get Needs Assessments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Create Needs Assessment
 * POST /api/sic/needs-assessments
 */
async function createNeedsAssessment(req, res) {
  try {
    const { assessment_name, academic_year, assessment_type, questions, target_audience } = req.body;
    const userId = req.user?.user_id;

    if (!assessment_name || !assessment_type || !questions) {
      return res.status(400).json({ error: 'Assessment name, type, and questions are required' });
    }

    const assessment = await prisma.sICNeedsAssessment.create({
      data: {
        assessment_name,
        academic_year: academic_year || '2024-2025',
        assessment_type,
        questions,
        target_audience: target_audience || 'ALL',
        created_by: userId,
        status: 'DRAFT'
      }
    });

    return res.status(201).json(assessment);
  } catch (error) {
    console.error('Create Needs Assessment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get School Self-Assessment
 * GET /api/sic/self-assessment
 */
async function getSelfAssessment(req, res) {
  try {
    const currentYear = await prisma.academicYear.findFirst({
      where: { is_current: true }
    });

    const assessment = await prisma.sICSelfAssessment.findFirst({
      where: { academic_year: currentYear?.year_name || '2024-2025' }
    });

    if (!assessment) {
      return res.json({ message: 'No self-assessment found for current year' });
    }

    return res.json(assessment);
  } catch (error) {
    console.error('Get Self Assessment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== PARTNERSHIPS & RESOURCES ====================

/**
 * Get Partnerships
 * GET /api/sic/partnerships
 */
async function getPartnerships(req, res) {
  try {
    const partnerships = await prisma.schoolPartnership.findMany({
      orderBy: { created_at: 'desc' }
    });

    return res.json(partnerships);
  } catch (error) {
    console.error('Get Partnerships error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Partnership Tracking
 * GET /api/sic/partnerships/:partnershipId/tracking
 */
async function getPartnershipTracking(req, res) {
  try {
    const { partnershipId } = req.params;

    const tracking = await prisma.sICPartnershipTracking.findMany({
      where: { partnership_id: parseInt(partnershipId) },
      orderBy: { tracking_date: 'desc' }
    });

    return res.json(tracking);
  } catch (error) {
    console.error('Get Partnership Tracking error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Suggest New Partner
 * POST /api/sic/partnerships/suggest
 */
async function suggestPartner(req, res) {
  try {
    const { partner_name, partner_type, partnership_type, description, contact_person, contact_email, contact_phone } = req.body;

    if (!partner_name || !partner_type) {
      return res.status(400).json({ error: 'Partner name and type are required' });
    }

    const partnership = await prisma.schoolPartnership.create({
      data: {
        partner_name,
        partner_type,
        partnership_type: partnership_type || 'COMMUNITY',
        description,
        contact_person,
        contact_email,
        contact_phone,
        start_date: new Date(),
        status: 'PENDING'
      }
    });

    return res.status(201).json(partnership);
  } catch (error) {
    console.error('Suggest Partner error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== ACCOUNTABILITY & TRANSPARENCY ====================

/**
 * Get Action Log
 * GET /api/sic/action-log
 */
async function getActionLog(req, res) {
  try {
    const actionLog = await prisma.sICActionLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 50
    });

    return res.json(actionLog);
  } catch (error) {
    console.error('Get Action Log error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get Inspection Reports
 * GET /api/sic/inspection-reports
 */
async function getInspectionReports(req, res) {
  try {
    const reports = await prisma.sICInspectionReport.findMany({
      orderBy: { inspection_date: 'desc' }
    });

    return res.json(reports);
  } catch (error) {
    console.error('Get Inspection Reports error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Submit Annual SIC Report
 * POST /api/sic/annual-report
 */
async function submitAnnualReport(req, res) {
  try {
    const { academic_year, report_data, achievements, recommendations } = req.body;
    const userId = req.user?.user_id;

    if (!academic_year || !report_data) {
      return res.status(400).json({ error: 'Academic year and report data are required' });
    }

    const report = await prisma.sICAnnualReport.create({
      data: {
        academic_year,
        report_data,
        achievements,
        recommendations,
        submitted_by: userId,
        submitted_to_board: false
      }
    });

    return res.status(201).json(report);
  } catch (error) {
    console.error('Submit Annual Report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== COMMUNICATION ====================

/**
 * Get Recommendations
 * GET /api/sic/recommendations
 */
async function getRecommendations(req, res) {
  try {
    const userId = req.user?.user_id;

    const recommendations = await prisma.sICRecommendation.findMany({
      where: { submitted_by: userId },
      orderBy: { submitted_at: 'desc' }
    });

    return res.json(recommendations);
  } catch (error) {
    console.error('Get Recommendations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Submit Recommendation
 * POST /api/sic/recommendations
 */
async function submitRecommendation(req, res) {
  try {
    const { title, description, category, priority } = req.body;
    const userId = req.user?.user_id;

    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Title, description, and category are required' });
    }

    const recommendation = await prisma.sICRecommendation.create({
      data: {
        title,
        description,
        category,
        priority: priority || 'MEDIUM',
        submitted_by: userId,
        submitted_to: 1, // Principal (would need to get actual principal ID)
        status: 'PENDING'
      }
    });

    return res.status(201).json(recommendation);
  } catch (error) {
    console.error('Submit Recommendation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get School Announcements
 * GET /api/sic/announcements
 */
async function getAnnouncements(req, res) {
  try {
    const announcements = await prisma.schoolAnnouncement.findMany({
      where: {
        status: 'PUBLISHED',
        target_audience: { in: ['ALL', 'STAFF'] }
      },
      orderBy: { publish_date: 'desc' },
      take: 20
    });

    return res.json(announcements);
  } catch (error) {
    console.error('Get Announcements error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Post SIC Announcement
 * POST /api/sic/announcements
 */
async function postAnnouncement(req, res) {
  try {
    const { title, content, announcement_type, target_audience } = req.body;
    const userId = req.user?.user_id;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const announcement = await prisma.schoolAnnouncement.create({
      data: {
        title,
        content,
        announcement_type: announcement_type || 'GENERAL',
        target_audience: target_audience || 'ALL',
        created_by: userId,
        status: 'PENDING',
        publish_date: new Date()
      }
    });

    return res.status(201).json(announcement);
  } catch (error) {
    console.error('Post Announcement error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== TRAINING & CAPACITY BUILDING ====================

/**
 * Get Training Calendar
 * GET /api/sic/training
 */
async function getTraining(req, res) {
  try {
    const trainings = await prisma.sICTraining.findMany({
      orderBy: { scheduled_date: 'asc' },
      include: {
        completions: {
          where: { user_id: req.user?.user_id }
        }
      }
    });

    return res.json(trainings);
  } catch (error) {
    console.error('Get Training error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Mark Training as Completed
 * POST /api/sic/training/:trainingId/complete
 */
async function completeTraining(req, res) {
  try {
    const { trainingId } = req.params;
    const { feedback, rating } = req.body;
    const userId = req.user?.user_id;

    const completion = await prisma.sICTrainingCompletion.create({
      data: {
        training_id: parseInt(trainingId),
        user_id: userId,
        feedback,
        rating
      }
    });

    return res.status(201).json(completion);
  } catch (error) {
    console.error('Complete Training error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ==================== SETTINGS & PROFILE ====================

/**
 * Get SIC Member Profile
 * GET /api/sic/profile
 */
async function getProfile(req, res) {
  try {
    const userId = req.user?.user_id;

    const sicMember = await prisma.sICMember.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            full_name: true,
            email: true,
            phone_number: true,
            profile_picture_url: true
          }
        }
      }
    });

    if (!sicMember) {
      return res.status(404).json({ error: 'SIC Member profile not found' });
    }

    return res.json(sicMember);
  } catch (error) {
    console.error('Get Profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update SIC Member Profile
 * PUT /api/sic/profile
 */
async function updateProfile(req, res) {
  try {
    const { full_name, phone_number, profile_picture_url } = req.body;
    const userId = req.user?.user_id;

    const updatedUser = await prisma.user.update({
      where: { user_id: userId },
      data: {
        full_name,
        phone_number,
        profile_picture_url
      }
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error('Update Profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  // Dashboard
  getSICDashboard,
  
  // SIP Management
  getCurrentSIP,
  getSIPProgress,
  submitSIPFeedback,
  proposeSIPAmendment,
  
  // Monitoring & Evaluation
  getKPIs,
  getAcademicPerformance,
  getFinancialProgress,
  
  // Meeting Management
  getSICMeetings,
  getMeetingAgenda,
  getMeetingMinutes,
  submitAgendaItem,
  voteOnResolution,
  
  // Needs Assessment
  getNeedsAssessments,
  createNeedsAssessment,
  getSelfAssessment,
  
  // Partnerships
  getPartnerships,
  getPartnershipTracking,
  suggestPartner,
  
  // Accountability
  getActionLog,
  getInspectionReports,
  submitAnnualReport,
  
  // Communication
  getRecommendations,
  submitRecommendation,
  getAnnouncements,
  postAnnouncement,
  
  // Training
  getTraining,
  completeTraining,
  
  // Settings
  getProfile,
  updateProfile
};
