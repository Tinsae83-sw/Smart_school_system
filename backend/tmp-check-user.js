const prisma = require('./src/config/prisma');

async function main() {
  const u = await prisma.user.findUnique({ where: { email: 'registration@school.edu' } });
  console.log('registration user:', u ? `${u.user_id} role=${u.role} active=${u.is_active}` : 'NOT FOUND');
  console.log('total users:', await prisma.user.count());
  console.log('vehicles:', await prisma.vehicle.count());
  console.log('students:', await prisma.student.count());
}

main()
  .catch((e) => { console.error('ERR:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
