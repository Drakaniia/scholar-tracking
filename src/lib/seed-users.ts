import { hashPassword } from './auth';
import { prisma } from './prisma';

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

  // Create default admin user
  const adminPassword = await hashPassword('admin123');

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

  // Create sample staff user
  const staffPassword = await hashPassword('staff123');

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
  console.log('📋 Default Login Credentials:');
  console.log('Admin - Username: admin, Password: admin123');
  console.log('Staff - Username: staff, Password: staff123');
  console.log('');
  console.log('⚠️  IMPORTANT: Change these passwords immediately in production!');
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
