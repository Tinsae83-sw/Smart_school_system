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

module.exports = {
  getPtsaDashboard,
  getPtsaMeetings,
  getPtsaFeedback,
  getPtsaProfile
};
