const prisma = require('./src/config/prisma');

/**
 * Fix script to correct student-user email mismatch
 * This script will update the student record to link to the correct user
 */

async function fixStudentEmailMismatch() {
  try {
    console.log('Starting student email mismatch fix...\n');

    // Find both users
    const user12 = await prisma.user.findUnique({
      where: { email: 'abera12asdaw@gmail.com' },
      include: { student: true }
    });

    const user02 = await prisma.user.findUnique({
      where: { email: 'abera02asdaw@gmail.com' },
      include: { student: true }
    });

    console.log('User with abera12asdaw@gmail.com:', {
      user_id: user12?.user_id,
      has_student: !!user12?.student,
      student_id: user12?.student?.student_id
    });

    console.log('User with abera02asdaw@gmail.com:', {
      user_id: user02?.user_id,
      has_student: !!user02?.student,
      student_id: user02?.student?.student_id
    });

    if (!user12 || !user02) {
      console.error('One or both users not found in database');
      return;
    }

    // Scenario 1: user12 has no student, user02 has student - move student to user12
    if (!user12.student && user02.student) {
      console.log('\nScenario detected: abera12asdaw has no student, abera02asdaw has student');
      console.log('Moving student record from abera02asdaw to abera12asdaw...\n');

      // Update the student record to link to user12
      const updatedStudent = await prisma.student.update({
        where: { student_id: user02.student.student_id },
        data: { user_id: user12.user_id },
        include: { user: true }
      });

      console.log('Student record updated successfully!');
      console.log('Student now linked to:', {
        user_id: updatedStudent.user_id,
        email: updatedStudent.user.email,
        full_name: updatedStudent.user.full_name
      });

      // Check if user02 now has no student (should be the case)
      const user02After = await prisma.user.findUnique({
        where: { email: 'abera02asdaw@gmail.com' },
        include: { student: true }
      });

      console.log('\nUser abera02asdaw@gmail.com now has student:', !!user02After.student);

    } else if (user12.student && !user02.student) {
      console.log('\nScenario detected: abera12asdaw already has student, abera02asdaw has no student');
      console.log('No action needed - abera12asdaw@gmail.com is correctly linked to a student');

    } else if (user12.student && user02.student) {
      console.log('\nScenario detected: Both users have student records');
      console.log('This requires manual intervention - please check which student record should be kept');

    } else {
      console.log('\nScenario detected: Neither user has a student record');
      console.log('No student records to fix');
    }

    console.log('\nFix completed successfully!');
  } catch (error) {
    console.error('Error during fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixStudentEmailMismatch();
