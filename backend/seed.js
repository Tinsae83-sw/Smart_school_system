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

  const subject = await prisma.subject.upsert({
    where: { subject_code: 'MATH10' },
    update: {
      subject_name: 'Mathematics'
    },
    create: {
      subject_name: 'Mathematics',
      subject_code: 'MATH10'
    }
  });

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