const prisma = require('../config/prisma');

// Configuration
const PERIODS_PER_DAY = 7;
const DAYS_PER_WEEK = 5;
const PERIOD_DURATION_MINUTES = 45;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * Generate automatic timetable based on credit hours
 */
async function generateTimetable(req, res) {
  try {
    // Get all class-subject assignments
    const classSubjects = await prisma.classSubject.findMany({
      include: {
        school_class: true,
        subject: true,
        teacher: {
          include: {
            user: true
          }
        }
      }
    });

    if (classSubjects.length === 0) {
      return res.status(400).json({ error: 'No class-subject assignments found. Please assign subjects to classes first.' });
    }

    // Clear existing schedules
    await prisma.classSchedule.deleteMany({});

    // Generate timetable
    const result = generateTimetableAlgorithm(classSubjects);

    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        warnings: result.warnings || []
      });
    }

    // Save generated schedules to database
    const schedules = [];
    for (const schedule of result.schedules) {
      // Skip study periods from database save (they're computed on the fly)
      if (schedule.is_study_period) {
        schedules.push(schedule);
        continue;
      }
      
      const created = await prisma.classSchedule.create({
        data: {
          class_id: schedule.class_id,
          subject_id: schedule.subject_id,
          teacher_id: schedule.teacher_id,
          day_of_week: schedule.day_of_week,
          period: schedule.period,
          room_number: schedule.room_number,
          start_time: schedule.start_time,
          end_time: schedule.end_time
        }
      });
      schedules.push(created);
    }

    return res.status(201).json({
      message: 'Timetable generated successfully',
      schedules: schedules,
      summary: result.summary,
      warnings: result.warnings || []
    });

  } catch (error) {
    console.error('Error generating timetable:', error);
    return res.status(500).json({ error: 'Unable to generate timetable' });
  }
}

/**
 * Core timetable generation algorithm
 */
function generateTimetableAlgorithm(classSubjects) {
  const schedules = [];
  const warnings = [];
  
  // Track occupied slots for conflict detection
  const classSlots = {}; // class_id -> Set of "day-period" keys
  const teacherSlots = {}; // teacher_id -> Set of "day-period" keys
  const roomSlots = {}; // room_number -> Set of "day-period" keys
  const classSubjectPerDay = {}; // class_id -> Map of day -> Set of subject_ids (to prevent repetition)
  
  // Initialize tracking
  classSubjects.forEach(cs => {
    classSlots[cs.class_id] = new Set();
    teacherSlots[cs.teacher_id] = new Set();
    classSubjectPerDay[cs.class_id] = {};
    DAYS.forEach(day => {
      classSubjectPerDay[cs.class_id][day] = new Set();
    });
  });

  // Calculate required periods for each class-subject
  const subjectRequirements = classSubjects.map(cs => ({
    class_id: cs.class_id,
    class_name: cs.school_class.class_name,
    subject_id: cs.subject_id,
    subject_name: cs.subject.subject_name,
    teacher_id: cs.teacher_id,
    teacher_name: cs.teacher.user.full_name,
    credit_hour: cs.subject.credit_hour || 3,
    required_periods: cs.subject.credit_hour || 3
  }));

  // Calculate total required periods vs available slots
  const totalRequiredPeriods = subjectRequirements.reduce((sum, req) => sum + req.required_periods, 0);
  const totalAvailableSlots = classSubjects.length * PERIODS_PER_DAY * DAYS_PER_WEEK;
  
  if (totalRequiredPeriods > totalAvailableSlots) {
    return {
      success: false,
      error: `Required periods (${totalRequiredPeriods}) exceed available slots (${totalAvailableSlots}). Please reduce credit hours or increase periods per day.`
    };
  }

  // Sort subjects by credit hour (higher credit hours first for better distribution)
  subjectRequirements.sort((a, b) => b.required_periods - a.required_periods);

  // Assign periods to each subject
  for (const requirement of subjectRequirements) {
    const assignedPeriods = assignPeriods(
      requirement,
      classSlots,
      teacherSlots,
      roomSlots,
      classSubjectPerDay,
      schedules,
      warnings
    );

    if (assignedPeriods < requirement.required_periods) {
      warnings.push(`Could only assign ${assignedPeriods}/${requirement.required_periods} periods for ${requirement.subject_name} in ${requirement.class_name}`);
    }
  }

  // Fill remaining free periods with Study Periods
  fillFreePeriods(classSlots, schedules);

  // Generate summary
  const summary = {
    total_classes: new Set(subjectRequirements.map(r => r.class_id)).size,
    total_subjects: new Set(subjectRequirements.map(r => r.subject_id)).size,
    total_teachers: new Set(subjectRequirements.map(r => r.teacher_id)).size,
    total_periods_scheduled: schedules.length,
    periods_per_day: PERIODS_PER_DAY,
    days_per_week: DAYS_PER_WEEK
  };

  return {
    success: true,
    schedules,
    summary,
    warnings
  };
}

/**
 * Fill remaining free periods with Study Periods
 */
function fillFreePeriods(classSlots, schedules) {
  // Get all unique class IDs
  const classIds = Object.keys(classSlots).map(id => parseInt(id));
  
  // For each class, fill remaining free periods
  classIds.forEach(class_id => {
    DAYS.forEach(day => {
      for (let period = 1; period <= PERIODS_PER_DAY; period++) {
        const slotKey = `${day}-${period}`;
        
        // If this slot is not occupied, add a Study Period
        if (!classSlots[class_id].has(slotKey)) {
          const { start_time, end_time } = calculateTime(period);
          
          schedules.push({
            class_id: class_id,
            subject_id: null, // Study period has no subject
            teacher_id: null, // Study period has no teacher
            day_of_week: day,
            period: period,
            room_number: 'Study Hall',
            start_time,
            end_time,
            is_study_period: true // Flag to identify study periods
          });
          
          // Mark as occupied
          classSlots[class_id].add(slotKey);
        }
      }
    });
  });
}

/**
 * Assign periods for a specific class-subject with conflict detection
 */
function assignPeriods(requirement, classSlots, teacherSlots, roomSlots, classSubjectPerDay, schedules, warnings) {
  let assignedCount = 0;
  const periodsToAssign = requirement.required_periods;
  
  // Try to distribute periods evenly across the week
  const dayPriority = [...DAYS]; // Copy days array
  
  // Shuffle days for better distribution
  shuffleArray(dayPriority);
  
  for (let attempt = 0; attempt < 100 && assignedCount < periodsToAssign; attempt++) {
    for (const day of dayPriority) {
      if (assignedCount >= periodsToAssign) break;
      
      // Check if this subject is already assigned to this class on this day
      if (classSubjectPerDay[requirement.class_id][day].has(requirement.subject_id)) {
        continue; // Skip this day to prevent subject repetition
      }
      
      // Try each period
      const periodOrder = shuffleArray([...Array(PERIODS_PER_DAY).keys()].map(p => p + 1));
      
      for (const period of periodOrder) {
        if (assignedCount >= periodsToAssign) break;
        
        const slotKey = `${day}-${period}`;
        
        // Check conflicts
        if (classSlots[requirement.class_id].has(slotKey)) continue;
        if (teacherSlots[requirement.teacher_id].has(slotKey)) continue;
        
        // Find available room
        const roomNumber = findAvailableRoom(roomSlots, slotKey);
        
        // Assign the slot
        classSlots[requirement.class_id].add(slotKey);
        teacherSlots[requirement.teacher_id].add(slotKey);
        roomSlots[roomNumber] = roomSlots[roomNumber] || new Set();
        roomSlots[roomNumber].add(slotKey);
        
        // Mark this subject as assigned for this class on this day
        classSubjectPerDay[requirement.class_id][day].add(requirement.subject_id);
        
        // Calculate time
        const { start_time, end_time } = calculateTime(period);
        
        schedules.push({
          class_id: requirement.class_id,
          subject_id: requirement.subject_id,
          teacher_id: requirement.teacher_id,
          day_of_week: day,
          period: period,
          room_number: roomNumber,
          start_time,
          end_time
        });
        
        assignedCount++;
        
        // Move to next day after assigning one period for this subject
        break;
      }
    }
  }
  
  return assignedCount;
}

/**
 * Find an available room for a time slot
 */
function findAvailableRoom(roomSlots, slotKey) {
  const totalRooms = 20; // Assume 20 available rooms
  for (let roomNum = 1; roomNum <= totalRooms; roomNum++) {
    const roomName = `Room ${roomNum}`;
    if (!roomSlots[roomName] || !roomSlots[roomName].has(slotKey)) {
      return roomName;
    }
  }
  return `Room ${Math.floor(Math.random() * totalRooms) + 1}`; // Fallback
}

/**
 * Calculate start and end time for a period
 */
function calculateTime(period) {
  const startHour = 8; // School starts at 8:00 AM
  const startMinute = (period - 1) * PERIOD_DURATION_MINUTES;
  const endMinute = startMinute + PERIOD_DURATION_MINUTES;
  
  const startTime = formatTime(startHour, startMinute);
  const endTime = formatTime(startHour, endMinute);
  
  return { start_time: startTime, end_time: endTime };
}

/**
 * Format time as ISO-8601 DateTime string
 */
function formatTime(hour, minutes) {
  const totalMinutes = hour * 60 + minutes;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  // Return as ISO-8601 DateTime format for a date (using today's date)
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  return date.toISOString();
}

/**
 * Shuffle array in place
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = {
  generateTimetable
};
