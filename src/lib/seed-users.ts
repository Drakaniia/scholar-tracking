import { hashPassword } from './auth';
import { prisma } from './prisma';

function getRequiredSeedPassword(envName: string, label: string) {
  const password = process.env[envName];

  if (!password) {
    throw new Error(`${envName} must be set before seeding the ${label} user.`);
  }

  if (password.length < 12) {
    throw new Error(`${envName} must be at least 12 characters long.`);
  }

  return password;
}

export async function seedUsers() {
  console.log('🌱 Seeding users...');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists');
    return;
  }

  // Create initial admin user
  const adminPassword = await hashPassword(getRequiredSeedPassword('SEED_ADMIN_PASSWORD', 'admin'));

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@scholarship.edu',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created admin user:', admin.username);

  // Create initial staff user
  const staffPassword = await hashPassword(getRequiredSeedPassword('SEED_STAFF_PASSWORD', 'staff'));

  const staff = await prisma.user.create({
    data: {
      username: 'staff',
      email: 'staff@scholarship.edu',
      passwordHash: staffPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'STAFF',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created staff user:', staff.username);

  console.log('🎉 User seeding completed!');
  console.log('');
  console.log('Initial user passwords were read from seed environment variables.');
}

// Run this script directly
if (require.main === module) {
  seedUsers()
    .catch((e) => {
      console.error('❌ Error seeding users:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
