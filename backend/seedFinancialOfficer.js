require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('./src/config/prisma');

async function main() {
  const password = 'Password123!';
  const password_hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email: 'finance@school.edu' },
    update: {
      full_name: 'Finance Officer',
      phone_number: '+251911000004',
      password_hash,
      role: 'FINANCIAL_OFFICER',
      is_active: true,
      preferred_language: 'en',
    },
    create: {
      full_name: 'Finance Officer',
      email: 'finance@school.edu',
      phone_number: '+251911000004',
      password_hash,
      role: 'FINANCIAL_OFFICER',
      is_active: true,
      preferred_language: 'en',
    },
  });

  console.log('Financial Officer login: finance@school.edu / Password123!');
}

main()
  .catch((error) => {
    console.error('Financial Officer seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
