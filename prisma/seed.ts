import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.studentScholarship.deleteMany();
  await prisma.student.deleteMany();
  await prisma.scholarship.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@scholartrack.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email} (password: admin123)`);

  // Create Staff User
  const staffPassword = await bcrypt.hash('staff123', 12);
  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@scholartrack.com',
      password: staffPassword,
      firstName: 'Staff',
      lastName: 'User',
      role: 'staff',
      isActive: true,
    },
  });

  console.log(`✅ Created staff user: ${staffUser.email} (password: staff123)`);

  // Create Scholarships
  const scholarships = await Promise.all([
    // Internal Scholarships
    prisma.scholarship.create({
      data: {
        name: 'Academic Excellence Award',
        description: 'For students with outstanding academic performance',
        type: 'Internal',
        amount: 15000,
        eligibility: 'Minimum GWA of 1.5',
        isActive: true,
      },
    }),
    prisma.scholarship.create({
      data: {
        name: 'Financial Assistance Program',
        description: 'Cash assistance for financially challenged students',
        type: 'Internal',
        amount: 10000,
        eligibility: 'Family income below poverty threshold',
        isActive: true,
      },
    }),
    prisma.scholarship.create({
      data: {
        name: 'Athletic Scholarship',
        description: 'For varsity athletes',
        type: 'Internal',
        amount: 20000,
        eligibility: 'Member of varsity team',
        isActive: true,
      },
    }),
    // External Scholarships
    prisma.scholarship.create({
      data: {
        name: 'CHED Merit Scholarship',
        description: 'Commission on Higher Education scholarship program',
        type: 'External',
        category: 'CHED',
        amount: 30000,
        eligibility: 'Top 10% of graduating class',
        applicationStart: new Date('2026-01-01'),
        applicationEnd: new Date('2026-03-31'),
        isActive: true,
      },
    }),
    prisma.scholarship.create({
      data: {
        name: 'TESDA Technical Training',
        description: 'Skills development scholarship',
        type: 'External',
        category: 'TESDA',
        amount: 25000,
        eligibility: 'Enrolled in technical-vocational courses',
        isActive: true,
      },
    }),
    prisma.scholarship.create({
      data: {
        name: 'TDP Grant',
        description: 'Tertiary Development Program grant',
        type: 'External',
        category: 'TDP',
        amount: 40000,
        eligibility: 'Enrolled in priority courses',
        applicationStart: new Date('2026-02-01'),
        applicationEnd: new Date('2026-04-30'),
        isActive: true,
      },
    }),
    prisma.scholarship.create({
      data: {
        name: 'City Government Scholarship',
        description: 'Local government unit scholarship',
        type: 'External',
        category: 'LGU',
        amount: 15000,
        eligibility: 'Resident of the city for at least 3 years',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${scholarships.length} scholarships`);

  // Create Students
  const students = await Promise.all([
    prisma.student.create({
      data: {
        firstName: 'Juan',
        middleName: 'Santos',
        lastName: 'Dela Cruz',
        yearLevel: '3rd Year',
        course: 'Bachelor of Science in Computer Science',
        tuitionFee: 45000,
        educationLevel: 'College',
      },
    }),
    prisma.student.create({
      data: {
        firstName: 'Maria',
        middleName: 'Garcia',
        lastName: 'Reyes',
        yearLevel: '2nd Year',
        course: 'Bachelor of Science in Nursing',
        tuitionFee: 55000,
        educationLevel: 'College',
      },
    }),
    prisma.student.create({
      data: {
        firstName: 'Pedro',
        lastName: 'Santos',
        yearLevel: '4th Year',
        course: 'Bachelor of Science in Information Technology',
        tuitionFee: 42000,
        educationLevel: 'College',
      },
    }),
    prisma.student.create({
      data: {
        firstName: 'Ana',
        middleName: 'Lopez',
        lastName: 'Gonzales',
        yearLevel: '1st Year',
        course: 'Bachelor of Science in Business Administration',
        tuitionFee: 38000,
        educationLevel: 'College',
      },
    }),
    prisma.student.create({
      data: {
        firstName: 'Jose',
        lastName: 'Ramos',
        yearLevel: 'Grade 11',
        course: 'STEM Strand',
        tuitionFee: 25000,
        educationLevel: 'Senior High',
      },
    }),
  ]);

  console.log(`✅ Created ${students.length} students`);

  // Create Student Users with Login Credentials
  const studentPassword = await bcrypt.hash('student123', 12);
  const studentUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'juan.delacruz@student.com',
        password: studentPassword,
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        role: 'student',
        isActive: true,
        studentId: students[0].id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'maria.reyes@student.com',
        password: studentPassword,
        firstName: 'Maria',
        lastName: 'Reyes',
        role: 'student',
        isActive: true,
        studentId: students[1].id,
      },
    }),
    prisma.user.create({
      data: {
        email: 'pedro.santos@student.com',
        password: studentPassword,
        firstName: 'Pedro',
        lastName: 'Santos',
        role: 'student',
        isActive: true,
        studentId: students[2].id,
      },
    }),
  ]);

  console.log(
    `✅ Created ${studentUsers.length} student users (password: student123)`
  );

  // Create Applications
  const applications = await Promise.all([
    prisma.studentScholarship.create({
      data: {
        studentId: students[0].id,
        scholarshipId: scholarships[0].id,
        status: 'Approved',
        dateApproved: new Date(),
        remarks: 'Excellent academic record',
      },
    }),
    prisma.studentScholarship.create({
      data: {
        studentId: students[0].id,
        scholarshipId: scholarships[3].id,
        status: 'Pending',
      },
    }),
    prisma.studentScholarship.create({
      data: {
        studentId: students[1].id,
        scholarshipId: scholarships[1].id,
        status: 'Approved',
        dateApproved: new Date(),
      },
    }),
    prisma.studentScholarship.create({
      data: {
        studentId: students[2].id,
        scholarshipId: scholarships[4].id,
        status: 'Pending',
      },
    }),
    prisma.studentScholarship.create({
      data: {
        studentId: students[3].id,
        scholarshipId: scholarships[6].id,
        status: 'Approved',
        dateApproved: new Date(),
      },
    }),
  ]);

  console.log(`✅ Created ${applications.length} applications`);
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
