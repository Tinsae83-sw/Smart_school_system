const bcrypt = require('bcrypt');
const prisma = require('./src/config/prisma');

async function main() {
  console.log('Seeding sample data...');

  const password = 'Password123!';
  const password_hash = await bcrypt.hash(password, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@school.edu' },
    update: {
      full_name: 'Admin User',
      phone_number: '+251911000001',
      password_hash,
      role: 'SUPER_ADMIN',
      is_active: true,
      preferred_language: 'en'
    },
    create: {
      full_name: 'Admin User',
      email: 'admin@school.edu',
      phone_number: '+251911000001',
      password_hash,
      role: 'SUPER_ADMIN',
      is_active: true,
      preferred_language: 'en'
    }
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: 'jane.doe@school.edu' },
    update: {
      full_name: 'Jane Doe',
      phone_number: '+251911000002',
      password_hash,
      role: 'TEACHER',
      is_active: true,
      preferred_language: 'en'
    },
    create: {
      full_name: 'Jane Doe',
      email: 'jane.doe@school.edu',
      phone_number: '+251911000002',
      password_hash,
      role: 'TEACHER',
      is_active: true,
      preferred_language: 'en'
    }
  });

  const teacher = await prisma.teacher.upsert({
    where: { employee_id: 'TCH-1001' },
    update: {
      user_id: teacherUser.user_id,
      department: 'Mathematics',
      hire_date: new Date('2020-09-01')
    },
    create: {
      user_id: teacherUser.user_id,
      employee_id: 'TCH-1001',
      department: 'Mathematics',
      hire_date: new Date('2020-09-01')
    }
  });

  const classNames = [
    'Grade 9A', 'Grade 9B',
    'Grade 10A', 'Grade 10B',
    'Grade 11A', 'Grade 11B',
    'Grade 12A', 'Grade 12B'
  ];

  let schoolClass = null;
  for (const className of classNames) {
    let existingClass = await prisma.schoolClass.findFirst({
      where: {
        class_name: className,
        academic_year: '2025/2026'
      }
    });

    if (!existingClass) {
      existingClass = await prisma.schoolClass.create({
        data: {
          class_name: className,
          academic_year: '2025/2026',
          homeroom_teacher_id: teacher.teacher_id
        }
      });
    }

    if (className === 'Grade 10B') {
      schoolClass = existingClass;
    }
  }

  if (!schoolClass) {
    schoolClass = await prisma.schoolClass.findFirst({
      where: {
        class_name: 'Grade 10',
        academic_year: '2025/2026'
      }
    });
  }

  // Create subjects with departments
  const naturalSubjects = [
    { name: 'Physics', code: 'PHY', department: 'Natural' },
    { name: 'Chemistry', code: 'CHE', department: 'Natural' },
    { name: 'Biology', code: 'BIO', department: 'Natural' },
    { name: 'Mathematics', code: 'MAT', department: 'Natural' },
    { name: 'Advanced Mathematics', code: 'ADM', department: 'Natural' }
  ];

  const socialSubjects = [
    { name: 'History', code: 'HIS', department: 'Social' },
    { name: 'Geography', code: 'GEO', department: 'Social' },
    { name: 'Civics', code: 'CIV', department: 'Social' },
    { name: 'Economics', code: 'ECO', department: 'Social' }
  ];

  const generalSubjects = [
    { name: 'English', code: 'ENG', department: 'General' },
    { name: 'Amharic', code: 'AMH', department: 'General' },
    { name: 'Physical Education', code: 'PE', department: 'General' },
    { name: 'Information Technology', code: 'IT', department: 'General' }
  ];

  const allSubjects = [...naturalSubjects, ...socialSubjects, ...generalSubjects];
  const createdSubjects = {};

  for (const subj of allSubjects) {
    const subject = await prisma.subject.upsert({
      where: { subject_code: subj.code },
      update: {
        subject_name: subj.name,
        department: subj.department
      },
      create: {
        subject_name: subj.name,
        subject_code: subj.code,
        department: subj.department
      }
    });
    createdSubjects[subj.code] = subject;
  }

  // Create class subjects for each grade and subject
  const grades = [9, 10, 11, 12];
  const sections = ['A', 'B'];

  for (const grade of grades) {
    for (const section of sections) {
      const className = `Grade ${grade}${section}`;
      const schoolClass = await prisma.schoolClass.findFirst({
        where: {
          class_name: className,
          academic_year: '2025/2026'
        }
      });

      if (schoolClass) {
        // Assign subjects based on grade level
        let subjectsForGrade = [];
        
        if (grade >= 11) {
          // Grades 11-12: Advanced subjects
          subjectsForGrade = [
            createdSubjects['ADM'], // Advanced Math
            createdSubjects['PHY'], // Physics
            createdSubjects['CHE'], // Chemistry
            createdSubjects['BIO'], // Biology
            createdSubjects['HIS'], // History
            createdSubjects['GEO'], // Geography
            createdSubjects['ECO'], // Economics
            createdSubjects['ENG'], // English
            createdSubjects['AMH'], // Amharic
          ];
        } else {
          // Grades 9-10: General subjects
          subjectsForGrade = [
            createdSubjects['MAT'], // Mathematics
            createdSubjects['PHY'], // Physics
            createdSubjects['CHE'], // Chemistry
            createdSubjects['BIO'], // Biology
            createdSubjects['HIS'], // History
            createdSubjects['GEO'], // Geography
            createdSubjects['CIV'], // Civics
            createdSubjects['ENG'], // English
            createdSubjects['AMH'], // Amharic
            createdSubjects['PE'], // PE
            createdSubjects['IT'], // IT
          ];
        }

        for (const subject of subjectsForGrade) {
          const existingClassSubject = await prisma.classSubject.findFirst({
            where: {
              class_id: schoolClass.class_id,
              subject_id: subject.subject_id
            }
          });

          if (!existingClassSubject) {
            await prisma.classSubject.create({
              data: {
                class_id: schoolClass.class_id,
                subject_id: subject.subject_id,
                teacher_id: teacher.teacher_id
              }
            });
          }
        }
      }
    }
  }

  // Use Mathematics for the exam example
  const subject = createdSubjects['MAT'];

  const classSubject = await prisma.classSubject.findFirst({
    where: {
      class_id: schoolClass.class_id,
      subject_id: subject.subject_id
    }
  });

  if (!classSubject) {
    await prisma.classSubject.create({
      data: {
        class_id: schoolClass.class_id,
        subject_id: subject.subject_id,
        teacher_id: teacher.teacher_id
      }
    });
  }

  const studentUser = await prisma.user.upsert({
    where: { email: 'john.student@school.edu' },
    update: {
      full_name: 'John Student',
      phone_number: '+251911000003',
      password_hash,
      role: 'STUDENT',
      is_active: true,
      preferred_language: 'en'
    },
    create: {
      full_name: 'John Student',
      email: 'john.student@school.edu',
      phone_number: '+251911000003',
      password_hash,
      role: 'STUDENT',
      is_active: true,
      preferred_language: 'en'
    }
  });

  const student = await prisma.student.upsert({
    where: { student_number: 'STU-2026-0001' },
    update: {
      user_id: studentUser.user_id,
      enrollment_date: new Date('2026-06-01'),
      current_class_id: schoolClass.class_id,
      date_of_birth: new Date('2008-05-01'),
      gender: 'M'
    },
    create: {
      user_id: studentUser.user_id,
      student_number: 'STU-2026-0001',
      enrollment_date: new Date('2026-06-01'),
      current_class_id: schoolClass.class_id,
      date_of_birth: new Date('2008-05-01'),
      gender: 'M'
    }
  });

  const parentUser = await prisma.user.upsert({
    where: { email: 'mary.parent@school.edu' },
    update: {
      full_name: 'Mary Parent',
      phone_number: '+251911000004',
      password_hash,
      role: 'PARENT',
      is_active: true,
      preferred_language: 'en'
    },
    create: {
      full_name: 'Mary Parent',
      email: 'mary.parent@school.edu',
      phone_number: '+251911000004',
      password_hash,
      role: 'PARENT',
      is_active: true,
      preferred_language: 'en'
    }
  });

  const parent = await prisma.parent.upsert({
    where: { user_id: parentUser.user_id },
    update: {
      relationship: 'Mother',
      address: '123 School Lane, Addis Ababa',
      preferred_language: 'en'
    },
    create: {
      user_id: parentUser.user_id,
      relationship: 'Mother',
      address: '123 School Lane, Addis Ababa',
      preferred_language: 'en'
    }
  });

  const studentParentLink = await prisma.studentParent.findFirst({
    where: {
      student_id: student.student_id,
      parent_id: parent.parent_id
    }
  });

  if (!studentParentLink) {
    await prisma.studentParent.create({
      data: {
        student_id: student.student_id,
        parent_id: parent.parent_id,
        relationship: 'Mother'
      }
    });
  }

  // Seed Principal
  const principalUser = await prisma.user.upsert({
    where: { email: 'principal@school.edu' },
    update: {
      full_name: 'Dr. Abraham Tekle',
      phone_number: '+251911000010',
      password_hash,
      role: 'PRINCIPAL',
      is_active: true,
      preferred_language: 'en'
    },
    create: {
      full_name: 'Dr. Abraham Tekle',
      email: 'principal@school.edu',
      phone_number: '+251911000010',
      password_hash,
      role: 'PRINCIPAL',
      is_active: true,
      preferred_language: 'en'
    }
  });

  await prisma.principal.upsert({
    where: { employee_id: 'PRIN-001' },
    update: {
      user_id: principalUser.user_id,
      appointment_date: new Date('2020-09-01')
    },
    create: {
      user_id: principalUser.user_id,
      employee_id: 'PRIN-001',
      appointment_date: new Date('2020-09-01')
    }
  });

  // Seed VP Academic
  const vpAcademicUser = await prisma.user.upsert({
    where: { email: 'vp.academic@school.edu' },
    update: {
      full_name: 'Dr. Sara Mohammed',
      phone_number: '+251911000011',
      password_hash,
      role: 'VP_ACADEMIC',
      is_active: true,
      preferred_language: 'en'
    },
    create: {
      full_name: 'Dr. Sara Mohammed',
      email: 'vp.academic@school.edu',
      phone_number: '+251911000011',
      password_hash,
      role: 'VP_ACADEMIC',
      is_active: true,
      preferred_language: 'en'
    }
  });

  await prisma.vPAcademic.upsert({
    where: { employee_id: 'VPA-001' },
    update: {
      user_id: vpAcademicUser.user_id,
      appointment_date: new Date('2021-09-01')
    },
    create: {
      user_id: vpAcademicUser.user_id,
      employee_id: 'VPA-001',
      appointment_date: new Date('2021-09-01')
    }
  });

  // Seed VP Administration
  const vpAdminUser = await prisma.user.upsert({
    where: { email: 'vp.admin@school.edu' },
    update: {
      full_name: 'Mr. Kebede Alemu',
      phone_number: '+251911000012',
      password_hash,
      role: 'VP_ADMINISTRATION',
      is_active: true,
      preferred_language: 'en'
    },
    create: {
      full_name: 'Mr. Kebede Alemu',
      email: 'vp.admin@school.edu',
      phone_number: '+251911000012',
      password_hash,
      role: 'VP_ADMINISTRATION',
      is_active: true,
      preferred_language: 'en'
    }
  });

  await prisma.vPAdministration.upsert({
    where: { employee_id: 'VPA-002' },
    update: {
      user_id: vpAdminUser.user_id,
      appointment_date: new Date('2021-09-01')
    },
    create: {
      user_id: vpAdminUser.user_id,
      employee_id: 'VPA-002',
      appointment_date: new Date('2021-09-01')
    }
  });

  // Seed Department Head
  const deptHeadUser = await prisma.user.upsert({
    where: { email: 'dept.head@school.edu' },
    update: {
      full_name: 'Mrs. Tirunesh Bekele',
      phone_number: '+251911000013',
      password_hash,
      role: 'DEPARTMENT_HEAD',
      is_active: true,
      preferred_language: 'en'
    },
    create: {
      full_name: 'Mrs. Tirunesh Bekele',
      email: 'dept.head@school.edu',
      phone_number: '+251911000013',
      password_hash,
      role: 'DEPARTMENT_HEAD',
      is_active: true,
      preferred_language: 'en'
    }
  });

  await prisma.departmentHead.upsert({
    where: { employee_id: 'DH-001' },
    update: {
      user_id: deptHeadUser.user_id,
      department: 'Mathematics',
      appointment_date: new Date('2022-09-01')
    },
    create: {
      user_id: deptHeadUser.user_id,
      employee_id: 'DH-001',
      department: 'Mathematics',
      appointment_date: new Date('2022-09-01')
    }
  });

  // Seed PTSA Representative
  const ptsaRepUser = await prisma.user.upsert({
    where: { email: 'ptsa.rep@school.edu' },
    update: {
      full_name: 'Mr. Haile Gebreselassie',
      phone_number: '+251911000014',
      password_hash,
      role: 'PTSA_REPRESENTATIVE',
      is_active: true,
      preferred_language: 'en'
    },
    create: {
      full_name: 'Mr. Haile Gebreselassie',
      email: 'ptsa.rep@school.edu',
      phone_number: '+251911000014',
      password_hash,
      role: 'PTSA_REPRESENTATIVE',
      is_active: true,
      preferred_language: 'en'
    }
  });

  await prisma.pTSARepresentative.upsert({
    where: { user_id: ptsaRepUser.user_id },
    update: {
      term_start: new Date('2024-09-01'),
      term_end: new Date('2026-08-31'),
      position: 'Chairperson'
    },
    create: {
      user_id: ptsaRepUser.user_id,
      term_start: new Date('2024-09-01'),
      term_end: new Date('2026-08-31'),
      position: 'Chairperson'
    }
  });

  // Seed SIC Member
  const sicMemberUser = await prisma.user.upsert({
    where: { email: 'sic.member@school.edu' },
    update: {
      full_name: 'Prof. Almaz Ayana',
      phone_number: '+251911000015',
      password_hash,
      role: 'SIC_MEMBER',
      is_active: true,
      preferred_language: 'en'
    },
    create: {
      full_name: 'Prof. Almaz Ayana',
      email: 'sic.member@school.edu',
      phone_number: '+251911000015',
      password_hash,
      role: 'SIC_MEMBER',
      is_active: true,
      preferred_language: 'en'
    }
  });

  await prisma.sICMember.upsert({
    where: { user_id: sicMemberUser.user_id },
    update: {
      role: 'Academic Advisor',
      term_start: new Date('2024-09-01'),
      term_end: new Date('2027-08-31')
    },
    create: {
      user_id: sicMemberUser.user_id,
      role: 'Academic Advisor',
      term_start: new Date('2024-09-01'),
      term_end: new Date('2027-08-31')
    }
  });

  // Seed Attendance Records
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    await prisma.attendanceRecord.upsert({
      where: {
        student_id_class_id_date: {
          student_id: student.student_id,
          class_id: schoolClass.class_id,
          date: date
        }
      },
      update: {
        status: i === 0 ? 'PRESENT' : (i === 1 ? 'PRESENT' : (i === 2 ? 'LATE' : 'PRESENT')),
        remarks: i === 2 ? 'Arrived 10 minutes late' : null,
        recorded_by: teacher.teacher_id
      },
      create: {
        student_id: student.student_id,
        class_id: schoolClass.class_id,
        date: date,
        status: i === 0 ? 'PRESENT' : (i === 1 ? 'PRESENT' : (i === 2 ? 'LATE' : 'PRESENT')),
        remarks: i === 2 ? 'Arrived 10 minutes late' : null,
        recorded_by: teacher.teacher_id
      }
    });
  }

  // Seed Assignment
  const assignment = await prisma.assignment.upsert({
    where: { assignment_id: 1 },
    update: {},
    create: {
      class_subject_id: classSubject.class_subject_id,
      title: 'Algebra Homework - Chapter 5',
      description: 'Complete exercises 5.1 to 5.10 from the textbook',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      max_score: 100,
      attachments: ['https://example.com/homework.pdf'],
      allow_resubmission: true,
      resubmission_deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      max_resubmissions: 2
    }
  });

  // Seed Submission
  const submission = await prisma.submission.upsert({
    where: {
      assignment_id_student_id_resubmission_number: {
        assignment_id: assignment.assignment_id,
        student_id: student.student_id,
        resubmission_number: 0
      }
    },
    update: {},
    create: {
      assignment_id: assignment.assignment_id,
      student_id: student.student_id,
      submitted_at: new Date(),
      file_url: 'https://example.com/submission.pdf',
      is_late: false
    }
  });

  // Seed Grade
  await prisma.grade.upsert({
    where: { submission_id: submission.submission_id },
    update: {
      score: 85.50,
      letter_grade: 'A',
      feedback: 'Excellent work! Showed good understanding of the concepts.',
      graded_by: teacher.teacher_id
    },
    create: {
      submission_id: submission.submission_id,
      score: 85.50,
      letter_grade: 'A',
      feedback: 'Excellent work! Showed good understanding of the concepts.',
      graded_by: teacher.teacher_id
    }
  });

  // Seed Class Schedule
  await prisma.classSchedule.upsert({
    where: {
      class_id_day_of_week_period: {
        class_id: schoolClass.class_id,
        day_of_week: 'MONDAY',
        period: 1
      }
    },
    update: {
      subject_id: subject.subject_id,
      teacher_id: teacher.teacher_id,
      room_number: 'Room 101',
      start_time: new Date('2024-01-01T08:00:00'),
      end_time: new Date('2024-01-01T08:50:00')
    },
    create: {
      class_id: schoolClass.class_id,
      day_of_week: 'MONDAY',
      period: 1,
      subject_id: subject.subject_id,
      teacher_id: teacher.teacher_id,
      room_number: 'Room 101',
      start_time: new Date('2024-01-01T08:00:00'),
      end_time: new Date('2024-01-01T08:50:00')
    }
  });

  await prisma.classSchedule.upsert({
    where: {
      class_id_day_of_week_period: {
        class_id: schoolClass.class_id,
        day_of_week: 'WEDNESDAY',
        period: 2
      }
    },
    update: {
      subject_id: subject.subject_id,
      teacher_id: teacher.teacher_id,
      room_number: 'Room 101',
      start_time: new Date('2024-01-01T09:00:00'),
      end_time: new Date('2024-01-01T09:50:00')
    },
    create: {
      class_id: schoolClass.class_id,
      day_of_week: 'WEDNESDAY',
      period: 2,
      subject_id: subject.subject_id,
      teacher_id: teacher.teacher_id,
      room_number: 'Room 101',
      start_time: new Date('2024-01-01T09:00:00'),
      end_time: new Date('2024-01-01T09:50:00')
    }
  });

  // Seed Announcement
  await prisma.announcement.create({
    data: {
      title: 'Midterm Exam Schedule',
      message: 'Midterm exams will be held from November 15-20. Please check the detailed schedule posted on the notice board.',
      target_class_id: schoolClass.class_id,
      target_roles: 'ALL',
      published_at: new Date(),
      is_active: true
    }
  });

  // Seed Message
  await prisma.message.create({
    data: {
      sender_id: teacherUser.user_id,
      receiver_id: parentUser.user_id,
      content: 'Hello, I wanted to discuss your child\'s progress in mathematics.',
      timestamp: new Date(),
      is_read: false
    }
  });

  // Seed Notification
  await prisma.notification.create({
    data: {
      user_id: studentUser.user_id,
      type: 'ASSIGNMENT',
      content: 'New assignment posted: Algebra Homework - Chapter 5',
      is_sent: true,
      metadata: { assignment_id: assignment.assignment_id }
    }
  });

  // Seed Report
  await prisma.report.create({
    data: {
      generated_by: adminUser.user_id,
      title: 'Monthly Attendance Report - October 2024',
      data: {
        total_students: 150,
        average_attendance: 92.5,
        present_days: 22,
        absent_days: 2
      }
    }
  });

  // Seed Dashboard
  await prisma.dashboard.upsert({
    where: { user_id: teacherUser.user_id },
    update: {
      widget_config: {
        widgets: [
          { type: 'attendance', position: 'top-left' },
          { type: 'grades', position: 'top-right' },
          { type: 'assignments', position: 'bottom-left' }
        ]
      }
    },
    create: {
      user_id: teacherUser.user_id,
      widget_config: {
        widgets: [
          { type: 'attendance', position: 'top-left' },
          { type: 'grades', position: 'top-right' },
          { type: 'assignments', position: 'bottom-left' }
        ]
      }
    }
  });

  // Seed Performance Prediction
  await prisma.performancePrediction.create({
    data: {
      student_id: student.student_id,
      predicted_grade: 'A-',
      risk_level: 'LOW',
      recommendation: 'Continue current study habits. Consider advanced math courses.'
    }
  });

  // Seed User Session
  await prisma.userSession.create({
    data: {
      user_id: studentUser.user_id,
      token: 'sample_session_token_' + Date.now(),
      login_time: new Date(),
      last_activity: new Date(),
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0'
    }
  });

  // Seed Audit Log
  await prisma.auditLog.create({
    data: {
      user_id: adminUser.user_id,
      action: 'USER_CREATED',
      ip_address: '192.168.1.1',
      details: { target_user: 'john.student@school.edu' }
    }
  });

  // Seed Payment
  await prisma.payment.create({
    data: {
      parent_id: parent.parent_id,
      student_id: student.student_id,
      amount: 5000.00,
      currency: 'ETB',
      status: 'COMPLETED',
      transaction_id: 'TXN' + Date.now(),
      payment_method: 'BANK_TRANSFER',
      receipt_url: 'https://example.com/receipt.pdf'
    }
  });

  // Seed Lesson Plan
  await prisma.lessonPlan.create({
    data: {
      teacher_id: teacher.teacher_id,
      class_subject_id: classSubject.class_subject_id,
      title: 'Introduction to Quadratic Equations',
      objectives: ['Understand quadratic equations', 'Learn to solve basic quadratic equations'],
      materials: ['Textbook Chapter 6', 'Graphing calculator', 'Whiteboard'],
      activities: ['Lecture', 'Group practice', 'Individual exercises'],
      assessment: 'Quiz at end of class',
      submitted_at: new Date(),
      reviewed_by: deptHeadUser.user_id,
      reviewed_at: new Date(),
      status: 'APPROVED',
      week_number: 5,
      term: 'Term 1'
    }
  });

  // Seed Resource
  const resource = await prisma.resource.create({
    data: {
      name: 'Graphing Calculator',
      type: 'LAB_EQUIPMENT',
      description: 'TI-84 graphing calculators for mathematics classes',
      quantity: 30,
      department: 'Mathematics',
      status: 'AVAILABLE'
    }
  });

  // Seed Resource Allocation
  await prisma.resourceAllocation.create({
    data: {
      resource_id: resource.resource_id,
      teacher_id: teacher.teacher_id,
      quantity: 15,
      notes: 'Allocated for Grade 10 mathematics class'
    }
  });

  // Seed Exam
  const exam = await prisma.exam.create({
    data: {
      class_subject_id: classSubject.class_subject_id,
      title: 'Midterm Examination - Mathematics',
      exam_type: 'MIDTERM',
      exam_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      duration_minutes: 90,
      total_marks: 100,
      created_by: teacherUser.user_id,
      approved_by: deptHeadUser.user_id,
      status: 'APPROVED',
      approved_at: new Date()
    }
  });

  // Seed Exam Invigilator
  await prisma.examInvigilator.create({
    data: {
      exam_id: exam.exam_id,
      teacher_id: teacher.teacher_id
    }
  });

  // Seed Exam Result
  await prisma.examResult.create({
    data: {
      exam_id: exam.exam_id,
      student_id: student.student_id,
      score: 88.00,
      letter_grade: 'A',
      remarks: 'Excellent performance'
    }
  });

  // Seed Department Meeting
  const meeting = await prisma.departmentMeeting.create({
    data: {
      department: 'Mathematics',
      title: 'Monthly Department Meeting',
      description: 'Discuss curriculum updates and student performance',
      scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      scheduled_time: new Date('2024-01-01T14:00:00'),
      location: 'Mathematics Department Office',
      created_by: deptHeadUser.user_id,
      status: 'SCHEDULED'
    }
  });

  // Seed Meeting Attendee
  await prisma.meetingAttendee.create({
    data: {
      meeting_id: meeting.meeting_id,
      user_id: teacherUser.user_id,
      attended: false
    }
  });

  // Seed Meeting Minutes
  await prisma.meetingMinutes.create({
    data: {
      meeting_id: meeting.meeting_id,
      content: 'Meeting agenda: 1. Curriculum review 2. Student performance analysis 3. Resource allocation',
      action_items: [
        { task: 'Review curriculum', deadline: '2024-11-30', assigned_to: 'Jane Doe' }
      ],
      created_by: deptHeadUser.user_id
    }
  });

  // Seed Intervention Plan
  await prisma.interventionPlan.create({
    data: {
      student_id: student.student_id,
      created_by: teacherUser.user_id,
      type: 'ACADEMIC',
      description: 'Additional support for algebra concepts',
      actions: ['Weekly tutoring sessions', 'Extra practice worksheets', 'Parent-teacher conference'],
      start_date: new Date(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      progress_notes: 'Student showing improvement'
    }
  });

  // Seed Curriculum Map
  await prisma.curriculumMap.upsert({
    where: {
      subject_id_grade_level_term: {
        subject_id: subject.subject_id,
        grade_level: 10,
        term: 'Term 1'
      }
    },
    update: {
      topics: [
        { week: 1, topic: 'Linear Equations' },
        { week: 2, topic: 'Quadratic Equations' },
        { week: 3, topic: 'Functions' }
      ],
      learning_objectives: ['Solve linear equations', 'Understand quadratic functions', 'Graph functions'],
      alignment_standards: ['Ethiopian National Curriculum - Mathematics Grade 10'],
      created_by: deptHeadUser.user_id
    },
    create: {
      subject_id: subject.subject_id,
      grade_level: 10,
      term: 'Term 1',
      topics: [
        { week: 1, topic: 'Linear Equations' },
        { week: 2, topic: 'Quadratic Equations' },
        { week: 3, topic: 'Functions' }
      ],
      learning_objectives: ['Solve linear equations', 'Understand quadratic functions', 'Graph functions'],
      alignment_standards: ['Ethiopian National Curriculum - Mathematics Grade 10'],
      created_by: deptHeadUser.user_id
    }
  });

  // Seed School Profile
  await prisma.schoolProfile.upsert({
    where: { school_code: 'AASS-001' },
    update: {},
    create: {
      school_name: 'Addis Ababa Smart School',
      address: 'Bole Road, Addis Ababa, Ethiopia',
      phone_number: '+251118888888',
      email: 'info@smart-school.edu',
      motto: 'Excellence in Education',
      school_code: 'AASS-001',
      woreda: 'Bole',
      zone: 'Addis Ababa',
      region: 'Addis Ababa',
      established_date: new Date('2010-09-01'),
      principal_name: 'Dr. Abraham Tekle'
    }
  });

  // Seed Academic Year
  await prisma.academicYear.upsert({
    where: { year_name: '2024/2025' },
    update: {},
    create: {
      year_name: '2024/2025',
      start_date: new Date('2024-09-01'),
      end_date: new Date('2025-07-15'),
      is_current: true,
      terms: [
        { name: 'Term 1', start: '2024-09-01', end: '2024-11-30' },
        { name: 'Term 2', start: '2024-12-01', end: '2025-03-15' },
        { name: 'Term 3', start: '2025-03-16', end: '2025-07-15' }
      ],
      breaks: [
        { name: 'Christmas Break', start: '2024-12-20', end: '2025-01-05' }
      ]
    }
  });

  // Seed Grading Scale
  await prisma.gradingScale.upsert({
    where: { scale_name: 'Standard Grade 10 Scale' },
    update: {},
    create: {
      scale_name: 'Standard Grade 10 Scale',
      grade_level: 10,
      min_pass_score: 50.00,
      grading_criteria: [
        { min: 90, max: 100, letter: 'A', description: 'Excellent' },
        { min: 80, max: 89, letter: 'B', description: 'Very Good' },
        { min: 70, max: 79, letter: 'C', description: 'Good' },
        { min: 60, max: 69, letter: 'D', description: 'Satisfactory' },
        { min: 50, max: 59, letter: 'E', description: 'Pass' },
        { min: 0, max: 49, letter: 'F', description: 'Fail' }
      ]
    }
  });

  // Seed School Fee
  await prisma.schoolFee.upsert({
    where: { fee_id: 1 },
    update: {},
    create: {
      fee_name: 'Grade 10 Tuition Fee',
      fee_type: 'TUITION',
      grade_level: 10,
      amount: 15000.00,
      currency: 'ETB',
      description: 'Annual tuition fee for Grade 10 students',
      academic_year: '2024/2025',
      is_active: true
    }
  });

  // Seed Academic Policy
  await prisma.academicPolicy.upsert({
    where: { policy_id: 1 },
    update: {},
    create: {
      policy_name: 'Attendance Policy',
      policy_type: 'ATTENDANCE',
      content: 'Students must maintain a minimum of 85% attendance to be eligible for final examinations.',
      effective_date: new Date('2024-09-01'),
      is_active: true
    }
  });

  // Seed Budget
  const budget = await prisma.budget.upsert({
    where: { budget_id: 1 },
    update: {},
    create: {
      budget_name: 'Annual Budget 2024/2025',
      academic_year: '2024/2025',
      total_amount: 5000000.00,
      allocated_amount: 4500000.00,
      spent_amount: 1200000.00,
      remaining_amount: 3300000.00,
      status: 'ACTIVE',
      breakdown: {
        salaries: 3000000,
        materials: 800000,
        infrastructure: 700000,
        maintenance: 500000
      }
    }
  });

  // Seed Expenditure
  await prisma.expenditure.create({
    data: {
      budget_id: budget.budget_id,
      category: 'MATERIALS',
      description: 'Purchase of mathematics textbooks and lab equipment',
      amount: 150000.00,
      expenditure_date: new Date(),
      approved_by: principalUser.user_id,
      status: 'APPROVED'
    }
  });

  // Seed Asset Inventory
  await prisma.assetInventory.upsert({
    where: { asset_code: 'PRJ-001' },
    update: {},
    create: {
      asset_name: 'Projector - Epson EB-X41',
      asset_code: 'PRJ-001',
      category: 'PROJECTORS',
      quantity: 5,
      unit_cost: 25000.00,
      purchase_date: new Date('2024-01-15'),
      location: 'Mathematics Department',
      condition: 'GOOD',
      status: 'AVAILABLE',
      assigned_to: 'Mathematics Department'
    }
  });

  // Seed Facility
  const facility = await prisma.facility.create({
    data: {
      facility_name: 'Main Science Laboratory',
      facility_type: 'LAB',
      capacity: 40,
      location: 'Building A, Ground Floor',
      building: 'Building A',
      floor: 0,
      amenities: ['Microscopes', 'Chemicals', 'Safety Equipment', 'Computers'],
      status: 'AVAILABLE'
    }
  });

  // Seed Facility Booking
  await prisma.facilityBooking.create({
    data: {
      facility_id: facility.facility_id,
      booking_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      start_time: new Date('2024-01-01T09:00:00'),
      end_time: new Date('2024-01-01T11:00:00'),
      purpose: 'Chemistry practical examination',
      booked_by: teacherUser.user_id,
      approved_by: vpAdminUser.user_id,
      status: 'APPROVED'
    }
  });

  // Seed School Improvement Plan
  const sip = await prisma.schoolImprovementPlan.upsert({
    where: { sip_id: 1 },
    update: {},
    create: {
      plan_name: 'Academic Year 2024/2025 Improvement Plan',
      academic_year: '2024/2025',
      goals: [
        { id: 1, goal: 'Improve mathematics pass rate by 10%', target: '85%' },
        { id: 2, goal: 'Increase student attendance to 95%', target: '95%' }
      ],
      action_items: [
        { id: 1, action: 'Implement after-school tutoring', deadline: '2024-11-30', status: 'IN_PROGRESS' },
        { id: 2, action: 'Upgrade laboratory equipment', deadline: '2024-12-31', status: 'PENDING' }
      ],
      submitted_by: principalUser.user_id,
      approved_by: principalUser.user_id,
      status: 'APPROVED',
      submitted_at: new Date(),
      approved_at: new Date()
    }
  });

  // Seed SIP Progress
  await prisma.sIPProgress.create({
    data: {
      sip_id: sip.sip_id,
      action_item_id: '1',
      status: 'IN_PROGRESS',
      progress_percentage: 60,
      notes: 'Tutoring program running successfully',
      updated_by: principalUser.user_id
    }
  });

  // Seed SIP Feedback
  await prisma.sIPFeedback.create({
    data: {
      sip_id: sip.sip_id,
      submitted_by: deptHeadUser.user_id,
      feedback: 'Good progress on tutoring program. Consider extending to other subjects.'
    }
  });

  // Seed PTSA Executive
  await prisma.pTSAExecutive.create({
    data: {
      user_id: ptsaRepUser.user_id,
      position: 'PRESIDENT',
      term_start: new Date('2024-09-01'),
      term_end: new Date('2026-08-31'),
      is_active: true,
      recognized_by: principalUser.user_id,
      recognized_at: new Date('2024-09-15')
    }
  });

  // Seed PTSA Feedback
  await prisma.pTSAFeedback.create({
    data: {
      submitted_by: ptsaRepUser.user_id,
      category: 'ACADEMIC',
      subject: 'Mathematics Curriculum',
      feedback: 'Parents appreciate the new mathematics curriculum. Request more practical examples.',
      status: 'REVIEWED',
      response: 'Thank you for the feedback. We will incorporate more practical examples.',
      responded_by: principalUser.user_id,
      responded_at: new Date()
    }
  });

  // Seed Budget Advisory
  await prisma.budgetAdvisory.create({
    data: {
      submitted_by: ptsaRepUser.user_id,
      budget_id: budget.budget_id,
      recommendation: 'Allocate additional funds for library books and reading materials',
      priority: 'HIGH',
      status: 'REVIEWED',
      reviewed_by: vpAdminUser.user_id,
      reviewed_at: new Date()
    }
  });

  // Seed PTSA Meeting
  const ptsaMeeting = await prisma.pTSAMeeting.create({
    data: {
      title: 'Monthly PTSA Meeting',
      description: 'Discuss school activities and parent concerns',
      scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      scheduled_time: new Date('2024-01-01T18:00:00'),
      location: 'School Auditorium',
      created_by: ptsaRepUser.user_id,
      approved_by: principalUser.user_id,
      status: 'APPROVED'
    }
  });

  // Seed PTSA Meeting Attendee
  await prisma.pTSAMeetingAttendee.create({
    data: {
      meeting_id: ptsaMeeting.meeting_id,
      user_id: parentUser.user_id,
      attended: false,
      role: 'MEMBER'
    }
  });

  // Seed PTSA Meeting Minutes
  await prisma.pTSAMeetingMinutes.create({
    data: {
      meeting_id: ptsaMeeting.meeting_id,
      content: 'Meeting discussed upcoming school events and budget allocation for the term.',
      action_items: [
        { task: 'Organize science fair', deadline: '2024-12-15' },
        { task: 'Review budget proposal', deadline: '2024-11-30' }
      ],
      created_by: ptsaRepUser.user_id
    }
  });

  // Seed PTSA Announcement
  await prisma.pTSAAnnouncement.create({
    data: {
      meeting_id: ptsaMeeting.meeting_id,
      title: 'Science Fair Registration Open',
      content: 'Registration for the annual science fair is now open. Please contact the PTSA office.',
      created_by: ptsaRepUser.user_id,
      is_active: true
    }
  });

  // Seed PTSA Fund Transaction
  await prisma.pTSAFundTransaction.create({
    data: {
      transaction_type: 'CONTRIBUTION',
      amount: 50000.00,
      description: 'Monthly contribution from parents',
      created_by: ptsaRepUser.user_id
    }
  });

  // Seed Grievance
  await prisma.grievance.create({
    data: {
      submitted_by: parentUser.user_id,
      category: 'ACADEMIC',
      subject: 'Concern about grading',
      description: 'Parent has concerns about the grading methodology in mathematics class.',
      priority: 'MEDIUM',
      status: 'UNDER_REVIEW',
      assigned_to: vpAcademicUser.user_id
    }
  });

  // Seed SIC Meeting
  const sicMeeting = await prisma.sICMeeting.create({
    data: {
      title: 'Quarterly SIC Meeting',
      description: 'Review school improvement progress and plan next steps',
      scheduled_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      scheduled_time: new Date('2024-01-01T10:00:00'),
      location: 'School Conference Room',
      meeting_type: 'REGULAR',
      created_by: sicMemberUser.user_id,
      status: 'SCHEDULED'
    }
  });

  // Seed SIC Meeting Attendee
  await prisma.sICMeetingAttendee.create({
    data: {
      meeting_id: sicMeeting.meeting_id,
      user_id: principalUser.user_id,
      attended: false,
      role: 'MEMBER'
    }
  });

  // Seed SIC Meeting Minutes
  await prisma.sICMeetingMinutes.create({
    data: {
      meeting_id: sicMeeting.meeting_id,
      content: 'Meeting focused on reviewing SIP progress and identifying areas for improvement.',
      action_items: [
        { task: 'Complete curriculum review', deadline: '2024-12-31' },
        { task: 'Organize teacher training', deadline: '2025-01-31' }
      ],
      decisions: [
        { decision: 'Approve new mathematics curriculum', vote: 'unanimous' }
      ],
      created_by: sicMemberUser.user_id
    }
  });

  // Seed SIC Agenda Item
  await prisma.sICAgendaItem.create({
    data: {
      meeting_id: sicMeeting.meeting_id,
      title: 'Curriculum Review',
      description: 'Review and approve updated curriculum for mathematics department',
      submitted_by: sicMemberUser.user_id,
      priority: 'HIGH',
      order: 1,
      status: 'PENDING'
    }
  });

  // Seed SIC Resolution
  await prisma.sICResolution.create({
    data: {
      meeting_id: sicMeeting.meeting_id,
      title: 'Approval of New Mathematics Curriculum',
      description: 'Approve the updated mathematics curriculum for Grade 10',
      proposed_by: sicMemberUser.user_id,
      vote_for: 8,
      vote_against: 0,
      vote_abstain: 1,
      status: 'APPROVED',
      passed_at: new Date()
    }
  });

  // Seed SIC Needs Assessment
  const assessment = await prisma.sICNeedsAssessment.create({
    data: {
      assessment_name: 'School Self-Assessment 2024',
      academic_year: '2024/2025',
      assessment_type: 'SCHOOL_SELF',
      questions: [
        { id: 1, question: 'How satisfied are you with the current curriculum?', type: 'rating' },
        { id: 2, question: 'What areas need improvement?', type: 'open' }
      ],
      target_audience: 'ALL',
      status: 'ACTIVE',
      created_by: sicMemberUser.user_id
    }
  });

  // Seed SIC Assessment Response
  await prisma.sICAssessmentResponse.create({
    data: {
      assessment_id: assessment.assessment_id,
      respondent_type: 'TEACHER',
      respondent_id: teacherUser.user_id,
      answers: [
        { question_id: 1, answer: 4 },
        { question_id: 2, answer: 'Need more laboratory equipment' }
      ],
      submitted_anonymously: false
    }
  });

  // Seed SIC Training
  const training = await prisma.sICTraining.create({
    data: {
      title: 'SIP Planning Workshop',
      description: 'Training on effective School Improvement Plan development and monitoring',
      training_type: 'SIP_PLANNING',
      scheduled_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      scheduled_time: new Date('2024-01-01T09:00:00'),
      location: 'School Training Room',
      duration_hours: 4,
      instructor: 'External Consultant',
      max_participants: 20,
      status: 'SCHEDULED'
    }
  });

  // Seed SIC Training Completion
  await prisma.sICTrainingCompletion.create({
    data: {
      training_id: training.training_id,
      user_id: principalUser.user_id,
      feedback: 'Excellent training, very informative',
      rating: 5
    }
  });

  // Seed SIC Annual Report
  await prisma.sICAnnualReport.create({
    data: {
      academic_year: '2023/2024',
      report_data: {
        total_meetings: 12,
        action_items_completed: 45,
        improvement_goals_achieved: 8
      },
      achievements: [
        'Improved student attendance by 5%',
        'Successfully implemented new curriculum',
        'Established parent-teacher communication system'
      ],
      recommendations: [
        'Continue focus on academic improvement',
        'Expand professional development programs'
      ],
      submitted_by: sicMemberUser.user_id,
      submitted_to_board: true,
      submission_date: new Date()
    }
  });

  // Seed SIC Action Log
  await prisma.sICActionLog.create({
    data: {
      action_type: 'MEETING_HELD',
      description: 'Quarterly SIC meeting held to review SIP progress',
      action_taken_by: sicMemberUser.user_id,
      related_meeting_id: sicMeeting.meeting_id
    }
  });

  // Seed SIC Inspection Report
  await prisma.sICInspectionReport.create({
    data: {
      inspection_type: 'WOREDA',
      inspection_date: new Date('2024-06-15'),
      inspector_name: 'Abebe Kebede',
      inspector_agency: 'Bole Woreda Education Office',
      findings: [
        { area: 'Curriculum', status: 'COMPLIANT', notes: 'Curriculum meets national standards' },
        { area: 'Facilities', status: 'PARTIALLY_COMPLIANT', notes: 'Some equipment needs upgrading' }
      ],
      recommendations: [
        'Upgrade laboratory equipment',
        'Increase library resources'
      ],
      compliance_status: 'PARTIALLY_COMPLIANT',
      action_required: true,
      response_deadline: new Date('2024-12-31'),
      reviewed_by: principalUser.user_id,
      reviewed_at: new Date()
    }
  });

  // Seed SIC Self Assessment
  await prisma.sICSelfAssessment.create({
    data: {
      academic_year: '2023/2024',
      strengths: ['Experienced teaching staff', 'Strong parent involvement', 'Good facilities'],
      weaknesses: ['Limited resources', 'Need for more professional development'],
      opportunities: ['Community partnerships', 'Government grants', 'Technology integration'],
      threats: ['Budget constraints', 'Changing curriculum requirements'],
      priority_areas: ['Curriculum enhancement', 'Resource acquisition', 'Staff development'],
      conducted_by: sicMemberUser.user_id,
      approved_by: principalUser.user_id,
      approved_at: new Date()
    }
  });

  // Seed SIC Recommendation
  await prisma.sICRecommendation.create({
    data: {
      title: 'Upgrade Science Laboratory Equipment',
      description: 'Recommend upgrading science laboratory equipment to meet modern teaching standards',
      category: 'INFRASTRUCTURE',
      priority: 'HIGH',
      submitted_by: sicMemberUser.user_id,
      submitted_to: principalUser.user_id,
      status: 'UNDER_REVIEW'
    }
  });

  // Seed Non-Academic Staff User
  const nonAcademicStaffUser = await prisma.user.upsert({
    where: { email: 'librarian@school.edu' },
    update: {
      full_name: 'Alemitu Bekele',
      phone_number: '+251911000020',
      password_hash,
      role: 'NON_ACADEMIC_STAFF',
      is_active: true,
      preferred_language: 'en'
    },
    create: {
      full_name: 'Alemitu Bekele',
      email: 'librarian@school.edu',
      phone_number: '+251911000020',
      password_hash,
      role: 'NON_ACADEMIC_STAFF',
      is_active: true,
      preferred_language: 'en'
    }
  });

  // Seed Non-Academic Staff
  const nonAcademicStaff = await prisma.nonAcademicStaff.upsert({
    where: { user_id: nonAcademicStaffUser.user_id },
    update: {
      employee_id: 'NAS-001',
      role: 'LIBRARIAN',
      department: 'Library',
      hire_date: new Date('2019-03-15'),
      salary: 15000.00,
      is_active: true
    },
    create: {
      user_id: nonAcademicStaffUser.user_id,
      employee_id: 'NAS-001',
      role: 'LIBRARIAN',
      department: 'Library',
      hire_date: new Date('2019-03-15'),
      salary: 15000.00,
      is_active: true
    }
  });

  // Seed Staff Attendance
  await prisma.staffAttendance.upsert({
    where: {
      staff_id_date: {
        staff_id: nonAcademicStaff.staff_id,
        date: new Date()
      }
    },
    update: {
      status: 'PRESENT',
      check_in_time: new Date('2024-01-01T08:00:00'),
      check_out_time: new Date('2024-01-01T17:00:00'),
      recorded_by: vpAdminUser.user_id
    },
    create: {
      staff_id: nonAcademicStaff.staff_id,
      date: new Date(),
      status: 'PRESENT',
      check_in_time: new Date('2024-01-01T08:00:00'),
      check_out_time: new Date('2024-01-01T17:00:00'),
      recorded_by: vpAdminUser.user_id
    }
  });

  // Seed Facility Maintenance
  await prisma.facilityMaintenance.create({
    data: {
      facility_id: facility.facility_id,
      issue_type: 'REPAIR',
      description: 'Repair broken microscope',
      priority: 'MEDIUM',
      status: 'PENDING',
      reported_by: teacherUser.user_id,
      assigned_to: nonAcademicStaffUser.user_id
    }
  });

  // Seed Supplier
  const supplier = await prisma.supplier.create({
    data: {
      supplier_name: 'Ethio Educational Supplies',
      contact_person: 'Dawit Abebe',
      email: 'dawit@ethiosupplies.com',
      phone_number: '+251911111111',
      address: 'Bole Subcity, Addis Ababa',
      products_services: ['Laboratory Equipment', 'Textbooks', 'Stationery'],
      is_approved: true,
      rating: 4
    }
  });

  // Seed Purchase Request
  await prisma.purchaseRequest.upsert({
    where: { request_number: 'PR-2024-001' },
    update: {
      item_name: 'Microscope Slides',
      item_description: 'Pack of 100 microscope slides for biology laboratory',
      quantity: 50,
      unit_cost: 500.00,
      total_cost: 25000.00,
      category: 'EQUIPMENT',
      priority: 'MEDIUM',
      requested_by: teacherUser.user_id,
      supplier_id: supplier.supplier_id,
      justification: 'Current stock depleted, needed for upcoming practical exams',
      status: 'PENDING'
    },
    create: {
      request_number: 'PR-2024-001',
      item_name: 'Microscope Slides',
      item_description: 'Pack of 100 microscope slides for biology laboratory',
      quantity: 50,
      unit_cost: 500.00,
      total_cost: 25000.00,
      category: 'EQUIPMENT',
      priority: 'MEDIUM',
      requested_by: teacherUser.user_id,
      supplier_id: supplier.supplier_id,
      justification: 'Current stock depleted, needed for upcoming practical exams',
      status: 'PENDING'
    }
  });

  // Seed Inventory
  const inventory = await prisma.inventory.upsert({
    where: { item_code: 'INV-001' },
    update: {
      item_name: 'Laboratory Gloves',
      category: 'LAB_CHEMICALS',
      description: 'Disposable latex gloves for laboratory use',
      unit_of_measure: 'PAIRS',
      current_stock: 200,
      reorder_level: 50,
      max_stock: 500,
      unit_cost: 25.00,
      location: 'Science Laboratory Storage',
      supplier_id: supplier.supplier_id
    },
    create: {
      item_name: 'Laboratory Gloves',
      item_code: 'INV-001',
      category: 'LAB_CHEMICALS',
      description: 'Disposable latex gloves for laboratory use',
      unit_of_measure: 'PAIRS',
      current_stock: 200,
      reorder_level: 50,
      max_stock: 500,
      unit_cost: 25.00,
      location: 'Science Laboratory Storage',
      supplier_id: supplier.supplier_id
    }
  });

  // Seed Inventory Transaction
  await prisma.inventoryTransaction.create({
    data: {
      inventory_id: inventory.inventory_id,
      transaction_type: 'IN',
      quantity: 100,
      remaining_stock: 200,
      unit_cost: 25.00,
      total_cost: 2500.00,
      reference: 'PR-2024-001',
      performed_by: nonAcademicStaffUser.user_id
    }
  });

  // Seed Incident
  await prisma.incident.create({
    data: {
      incident_type: 'FACILITY_ISSUE',
      reported_by: teacherUser.user_id,
      incident_date: new Date(),
      incident_time: new Date('2024-01-01T10:30:00'),
      involved_person_id: studentUser.user_id,
      involved_person_type: 'STUDENT',
      description: 'Student accidentally broke laboratory equipment',
      location: 'Science Laboratory',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      action_taken: 'Equipment replaced, student counseled',
      resolved_by: vpAdminUser.user_id,
      resolved_at: new Date()
    }
  });

  // Seed Income Transaction
  await prisma.incomeTransaction.create({
    data: {
      budget_id: budget.budget_id,
      income_source: 'SCHOOL_FEES',
      amount: 15000.00,
      description: 'Tuition fee payment from parent',
      income_date: new Date(),
      received_by: vpAdminUser.user_id,
      reference: 'TXN-FEE-001'
    }
  });

  // Seed Vehicle
  const vehicle = await prisma.vehicle.create({
    data: {
      vehicle_number: 'AA-1234',
      vehicle_type: 'BUS',
      capacity: 40,
      make: 'Toyota',
      model: 'Coaster',
      year: 2020,
      fuel_type: 'DIESEL',
      condition: 'GOOD',
      status: 'AVAILABLE',
      purchase_date: new Date('2020-06-01'),
      last_service: new Date('2024-06-01'),
      next_service: new Date('2024-12-01')
    }
  });

  // Seed Vehicle Maintenance
  await prisma.vehicleMaintenance.create({
    data: {
      vehicle_id: vehicle.vehicle_id,
      maintenance_type: 'ROUTINE_SERVICE',
      description: 'Regular oil change and inspection',
      service_date: new Date('2024-06-01'),
      odometer_reading: 50000,
      cost: 5000.00,
      performed_by: 'Authorized Service Center',
      service_provider: 'Toyota Ethiopia',
      next_service_date: new Date('2024-12-01')
    }
  });

  // Seed Transport Schedule
  await prisma.transportSchedule.create({
    data: {
      vehicle_id: vehicle.vehicle_id,
      route_name: 'Bole to Megenagna',
      route_description: 'Morning pickup route from Bole area',
      pickup_points: [
        { location: 'Bole Medhanialem', time: '07:00' },
        { location: 'Megenagna', time: '07:30' }
      ],
      dropoff_points: [
        { location: 'School', time: '08:00' }
      ],
      start_time: new Date('2024-01-01T07:00:00'),
      end_time: new Date('2024-01-01T08:00:00'),
      days_of_week: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      academic_year: '2024/2025',
      is_active: true
    }
  });

  // Seed Meal Plan
  await prisma.mealPlan.create({
    data: {
      plan_name: 'Weekly Lunch Menu - Week 5',
      meal_type: 'LUNCH',
      academic_year: '2024/2025',
      week_number: 5,
      day_of_week: 'MONDAY',
      menu_items: [
        { item: 'Injera with Doro Wat', description: 'Traditional Ethiopian dish' },
        { item: 'Shiro', description: 'Chickpea stew' },
        { item: 'Salad', description: 'Fresh vegetable salad' }
      ],
      nutritional_info: {
        calories: 650,
        protein: '25g',
        carbohydrates: '80g'
      },
      is_active: true
    }
  });

  // Seed Food Inventory
  const foodInventory = await prisma.foodInventory.create({
    data: {
      item_name: 'Injera',
      item_code: 'FOOD-001',
      category: 'GRAINS',
      unit_of_measure: 'PIECES',
      current_quantity: 500.00,
      reorder_level: 100.00,
      max_quantity: 1000.00,
      unit_cost: 15.00,
      storage_location: 'Kitchen Storage',
      supplier_id: supplier.supplier_id
    }
  });

  // Seed Food Transaction
  await prisma.foodTransaction.create({
    data: {
      food_id: foodInventory.food_id,
      transaction_type: 'CONSUMPTION',
      quantity: 200.00,
      remaining_quantity: 300.00,
      unit_cost: 15.00,
      total_cost: 3000.00,
      performed_by: nonAcademicStaffUser.user_id,
      meal_date: new Date()
    }
  });

  // Seed Conduct Grade
  const conductGrade = await prisma.conductGrade.create({
    data: {
      student_id: student.student_id,
      term: 'Term 1',
      academic_year: '2024/2025',
      grade: 'GOOD',
      rating: 4.00,
      teacher_id: teacher.teacher_id,
      comments: 'Student demonstrates good behavior and participation in class'
    }
  });

  // Seed Conduct Comment
  await prisma.conductComment.create({
    data: {
      conduct_id: conductGrade.conduct_id,
      teacher_id: teacher.teacher_id,
      comment: 'Excellent teamwork during group activities',
      subject: 'Mathematics'
    }
  });

  // Seed Conduct Incident
  await prisma.conductIncident.create({
    data: {
      student_id: student.student_id,
      incident_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      incident_type: 'MINOR',
      description: 'Late arrival to class on multiple occasions',
      resolution: 'Counseled by teacher, improvement noted',
      status: 'RESOLVED',
      reported_by: teacherUser.user_id,
      resolved_by: teacherUser.user_id
    }
  });

  // Seed Parent Teacher Conference
  const conference = await prisma.parentTeacherConference.create({
    data: {
      title: 'Term 1 Parent-Teacher Conference',
      conference_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      start_time: new Date('2024-01-01T09:00:00'),
      end_time: new Date('2024-01-01T17:00:00'),
      location: 'School Auditorium',
      academic_year: '2024/2025',
      term: 'Term 1',
      status: 'SCHEDULED'
    }
  });

  // Seed Conference Booking
  await prisma.conferenceBooking.create({
    data: {
      conference_id: conference.conference_id,
      parent_id: parent.parent_id,
      student_id: student.student_id,
      teacher_id: teacher.teacher_id,
      status: 'CONFIRMED'
    }
  });

  // Seed Parent Notification Preference
  await prisma.parentNotificationPreference.create({
    data: {
      parent_id: parent.parent_id,
      email_grades: true,
      email_attendance: true,
      email_conduct: true,
      email_assignments: true,
      email_announcements: true,
      sms_grades: false,
      sms_attendance: false,
      sms_conduct: false,
      sms_assignments: false,
      sms_announcements: false,
      in_app_grades: true,
      in_app_attendance: true,
      in_app_conduct: true,
      in_app_assignments: true,
      in_app_announcements: true
    }
  });

  // Seed Parent Login History
  await prisma.parentLoginHistory.create({
    data: {
      parent_id: parent.parent_id,
      login_time: new Date(),
      logout_time: new Date(Date.now() + 30 * 60 * 1000),
      ip_address: '192.168.1.50',
      user_agent: 'Mozilla/5.0',
      device_type: 'DESKTOP',
      login_status: 'SUCCESS'
    }
  });

  // Seed National Exam Result
  await prisma.nationalExamResult.create({
    data: {
      student_id: student.student_id,
      exam_type: 'EGSECE',
      academic_year: '2023/2024',
      exam_year: 2024,
      subjects: [
        { subject: 'Mathematics', score: 85, grade: 'A' },
        { subject: 'English', score: 78, grade: 'B' },
        { subject: 'Science', score: 82, grade: 'A' },
        { subject: 'Social Studies', score: 75, grade: 'B' }
      ],
      overall_grade: 'A',
      division: 1,
      total_score: 320.00,
      max_score: 400.00,
      percentage: 80.00,
      school_rank: 15,
      region_rank: 45,
      verified: true
    }
  });

  // Seed Student Note
  await prisma.studentNote.create({
    data: {
      student_id: student.student_id,
      title: 'Mathematics Formulas',
      content: 'Key formulas for quadratic equations: ax² + bx + c = 0',
      subject: 'Mathematics',
      tags: ['formulas', 'algebra', 'quadratic']
    }
  });

  // Seed AI Book
  const aiBook = await prisma.aIBook.create({
    data: {
      title: 'Mathematics Grade 10 - Complete Guide',
      subject_id: subject.subject_id,
      grade_level: 10,
      description: 'Comprehensive mathematics textbook covering all Grade 10 topics',
      content: {
        chapters: [
          { title: 'Linear Equations', pages: 50 },
          { title: 'Quadratic Equations', pages: 60 },
          { title: 'Functions', pages: 45 }
        ]
      },
      author: 'Dr. Abraham Tekle',
      is_active: true
    }
  });

  // Seed Book Progress
  await prisma.bookProgress.create({
    data: {
      book_id: aiBook.book_id,
      student_id: student.student_id,
      current_page: 25,
      total_pages: 155,
      completion_percentage: 16.13
    }
  });

  // Seed Book Bookmark
  await prisma.bookBookmark.create({
    data: {
      book_id: aiBook.book_id,
      student_id: student.student_id,
      page_number: 25,
      section_title: 'Quadratic Equations - Introduction',
      note: 'Important chapter for midterm exam'
    }
  });

  // Seed Book Highlight
  await prisma.bookHighlight.create({
    data: {
      book_id: aiBook.book_id,
      student_id: student.student_id,
      page_number: 30,
      text_content: 'The quadratic formula is x = (-b ± √(b²-4ac)) / 2a',
      color: 'yellow',
      note: 'Memorize this formula'
    }
  });

  // Seed Book Annotation
  await prisma.bookAnnotation.create({
    data: {
      book_id: aiBook.book_id,
      student_id: student.student_id,
      page_number: 35,
      annotation_type: 'NOTE',
      content: 'Need to practice more problems using the quadratic formula'
    }
  });

  // Seed Book Quiz
  const bookQuiz = await prisma.bookQuiz.create({
    data: {
      book_id: aiBook.book_id,
      title: 'Quadratic Equations Quiz',
      questions: [
        { question: 'What is the quadratic formula?', options: ['x = (-b ± √(b²-4ac)) / 2a', 'x = (-b + √(b²-4ac)) / 2a', 'x = (b ± √(b²-4ac)) / 2a'], correct: 0 },
        { question: 'What is the discriminant?', options: ['b²-4ac', 'b²+4ac', '4ac-b²'], correct: 0 }
      ],
      passing_score: 70.00
    }
  });

  // Seed Quiz Attempt
  await prisma.quizAttempt.create({
    data: {
      quiz_id: bookQuiz.quiz_id,
      student_id: student.student_id,
      answers: [0, 0],
      score: 100.00,
      percentage: 100.00,
      passed: true
    }
  });

  // Seed Student Notification Preference
  await prisma.studentNotificationPreference.create({
    data: {
      student_id: student.student_id,
      email_grades: true,
      email_attendance: true,
      email_conduct: true,
      email_assignments: true,
      email_announcements: true,
      sms_grades: false,
      sms_attendance: false,
      sms_conduct: false,
      sms_assignments: false,
      sms_announcements: false,
      in_app_grades: true,
      in_app_attendance: true,
      in_app_conduct: true,
      in_app_assignments: true,
      in_app_announcements: true
    }
  });

  // Seed Student Login History
  await prisma.studentLoginHistory.create({
    data: {
      student_id: student.student_id,
      login_time: new Date(),
      logout_time: new Date(Date.now() + 45 * 60 * 1000),
      ip_address: '192.168.1.75',
      user_agent: 'Mozilla/5.0',
      device_type: 'DESKTOP',
      login_status: 'SUCCESS'
    }
  });

  // Seed Student Profile
  await prisma.studentProfile.create({
    data: {
      student_id: student.student_id,
      phone_number: '+251911000003',
      email_address: 'john.student@school.edu',
      home_address: '123 Bole Street, Addis Ababa',
      bio: 'Grade 10 student interested in mathematics and science',
      interests: ['Mathematics', 'Science', 'Basketball', 'Reading']
    }
  });

  // Seed Virtual Class
  const virtualClass = await prisma.virtualClass.create({
    data: {
      class_subject_id: classSubject.class_subject_id,
      title: 'Online Mathematics Tutorial',
      description: 'Weekly online tutorial for additional mathematics support',
      meeting_link: 'https://zoom.us/j/123456789',
      meeting_id: '123456789',
      meeting_password: 'math2024',
      is_recurring: true,
      recurring_pattern: 'WEEKLY',
      max_participants: 50,
      is_active: true,
      created_by: teacherUser.user_id
    }
  });

  // Seed Live Session
  const liveSession = await prisma.liveSession.create({
    data: {
      virtual_class_id: virtualClass.virtual_class_id,
      title: 'Quadratic Equations - Live Session',
      scheduled_start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      scheduled_end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      status: 'SCHEDULED',
      chat_enabled: true,
      recording_enabled: false
    }
  });

  // Seed Session Attendance
  await prisma.sessionAttendance.create({
    data: {
      session_id: liveSession.session_id,
      student_id: student.student_id,
      attended: false
    }
  });

  // Seed Course Material
  const courseMaterial = await prisma.courseMaterial.create({
    data: {
      class_subject_id: classSubject.class_subject_id,
      title: 'Introduction to Quadratic Equations',
      description: 'Video lecture introducing quadratic equations',
      material_type: 'VIDEO',
      file_url: 'https://example.com/quadratic-intro.mp4',
      file_size: 52428800,
      duration_minutes: 45,
      order: 1,
      is_published: true,
      created_by: teacherUser.user_id
    }
  });

  // Seed Material Progress
  await prisma.materialProgress.create({
    data: {
      material_id: courseMaterial.material_id,
      student_id: student.student_id,
      completed: true,
      completion_percentage: 100.00,
      time_spent_minutes: 45
    }
  });

  // Seed Discussion Forum
  const discussionForum = await prisma.discussionForum.create({
    data: {
      class_subject_id: classSubject.class_subject_id,
      title: 'Mathematics Discussion Forum',
      description: 'Forum for discussing mathematics topics and asking questions',
      is_active: true,
      created_by: teacherUser.user_id
    }
  });

  // Seed Forum Post
  await prisma.forumPost.create({
    data: {
      forum_id: discussionForum.forum_id,
      student_id: student.student_id,
      content: 'Can someone explain how to solve quadratic equations using the formula?',
      created_at: new Date()
    }
  });

  // Seed Teacher Settings
  await prisma.teacherSettings.create({
    data: {
      teacher_id: teacher.teacher_id,
      grading_rubric: {
        default_scale: 'standard',
        custom_scales: []
      },
      assignment_defaults: {
        default_max_score: 100,
        default_allow_resubmission: true
      },
      notification_preferences: {
        email_notifications: true,
        in_app_notifications: true
      },
      teaching_preferences: {
        style: 'interactive',
        preferred_methods: ['lectures', 'group_work', 'practical_exercises']
      },
      timezone: 'Africa/Addis_Ababa',
      language: 'en'
    }
  });

  console.log('Sample data seeded successfully.');
  console.log('Admin login: admin@school.edu / Password123!');
  console.log('Principal login: principal@school.edu / Password123!');
  console.log('VP Academic login: vp.academic@school.edu / Password123!');
  console.log('VP Administration login: vp.admin@school.edu / Password123!');
  console.log('Department Head login: dept.head@school.edu / Password123!');
  console.log('Teacher login: jane.doe@school.edu / Password123!');
  console.log('Student login: john.student@school.edu / Password123!');
  console.log('Parent login: mary.parent@school.edu / Password123!');
  console.log('PTSA Representative login: ptsa.rep@school.edu / Password123!');
  console.log('SIC Member login: sic.member@school.edu / Password123!');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });