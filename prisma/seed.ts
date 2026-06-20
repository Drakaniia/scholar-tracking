import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { Pool } from 'pg';

// Create adapter for Prisma v7 with connection pooling
const pool = new Pool({
  connectionString: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

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

async function main() {
  const adminPassword = await bcrypt.hash(getRequiredSeedPassword('SEED_ADMIN_PASSWORD', 'admin'), 12);
  const userPassword = await bcrypt.hash(getRequiredSeedPassword('SEED_STAFF_PASSWORD', 'staff'), 12);

  console.log('🌱 Starting seed...');

  // Clear existing data (in reverse order of dependencies)
  await prisma.session.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.scholarship.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  // Create Users
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@scholartrack.com',
      passwordHash: adminPassword,
      firstName: 'ADMIN',
      lastName: 'USER',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const regularUser = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      email: 'user@scholartrack.com',
      passwordHash: userPassword,
      firstName: 'REGULAR',
      lastName: 'USER',
      role: 'STAFF',
      status: 'ACTIVE',
    },
  });

  const users = [adminUser, regularUser];
  console.log(`✅ Created ${users.length} users`);

  // Create Scholarships
  const scholarships = await Promise.all([
    // ============================================
    // INTERNALLY FUNDED SCHOLARSHIPS
    // ============================================
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Employees Ward (BED/SHS)',
        sponsor: 'School Administration',
        type: 'EMPLOYEES_WARD',
        source: 'INTERNAL',
        eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH',
        amount: new Prisma.Decimal(8000),
        requirements: 'Dependent of school employee',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Employees Ward (HIED)',
        sponsor: 'School Administration',
        type: 'EMPLOYEES_WARD',
        source: 'INTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(10000),
        requirements: 'Dependent of school employee',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Academic Scholar (BED/SHS)',
        sponsor: 'School Administration',
        type: 'ACADEMIC_SCHOLAR',
        source: 'INTERNAL',
        eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH,COLLEGE',
        amount: new Prisma.Decimal(12000),
        requirements: 'Minimum GWA of 1.5',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Working Scholars',
        sponsor: 'School Administration',
        type: 'WORKING_SCHOLARS',
        source: 'INTERNAL',
        eligibleGradeLevels: 'SENIOR_HIGH,COLLEGE',
        amount: new Prisma.Decimal(7000),
        requirements: 'Part-time work arrangement with school',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Athletic Scholars',
        sponsor: 'School Athletics Department',
        type: 'ATHLETIC_SCHOLARS',
        source: 'INTERNAL',
        eligibleGradeLevels: 'JUNIOR_HIGH,SENIOR_HIGH,COLLEGE',
        amount: new Prisma.Decimal(15000),
        requirements: 'Member of school athletic team',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'School Grant (GS/JHS)',
        sponsor: 'School Administration',
        type: 'SCHOOL_GRANT',
        source: 'INTERNAL',
        eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH',
        amount: new Prisma.Decimal(5000),
        requirements: 'Financial need-based',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'School Grant (SHS)',
        sponsor: 'School Administration',
        type: 'SCHOOL_GRANT',
        source: 'INTERNAL',
        eligibleGradeLevels: 'SENIOR_HIGH',
        amount: new Prisma.Decimal(8000),
        requirements: 'Financial need-based',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'School Grant (HiEd)',
        sponsor: 'School Administration',
        type: 'SCHOOL_GRANT',
        source: 'INTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(10000),
        requirements: 'Financial need-based',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Faculty & Staff',
        sponsor: 'School Administration',
        type: 'FACULTY_STAFF',
        source: 'INTERNAL',
        eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH,COLLEGE',
        amount: new Prisma.Decimal(10000),
        requirements: 'School employee or dependent',
        status: 'Active',
      },
    }),

    // ============================================
    // EXTERNALLY FUNDED SCHOLARSHIPS - BED
    // ============================================
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Parents Association Executive Board (PAEB) (GS/JHS)',
        sponsor: 'Parents Association Executive Board',
        type: 'PAEB',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH',
        amount: new Prisma.Decimal(15000),
        requirements: 'Minimum GWA of 1.5',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Alumni (BED)',
        sponsor: 'Alumni Association',
        type: 'ALUMNI',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH',
        amount: new Prisma.Decimal(8000),
        requirements: 'Recommended by alumni member',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Yearbook (BED)',
        sponsor: 'Yearbook Committee',
        type: 'YEARBOOK',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH',
        amount: new Prisma.Decimal(5000),
        requirements: 'Yearbook participation',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Yearbook (SHS)',
        sponsor: 'Yearbook Committee',
        type: 'YEARBOOK',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'SENIOR_HIGH',
        amount: new Prisma.Decimal(6000),
        requirements: 'Yearbook participation',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Education Service Contracting (ESC) (JHS)',
        sponsor: 'Department of Education',
        type: 'ESC',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'JUNIOR_HIGH',
        amount: new Prisma.Decimal(12000),
        requirements: 'ESC voucher holder',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Local Government Unit (LGU) (JHS/SHS)',
        sponsor: 'Local Government Unit',
        type: 'LGU',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'JUNIOR_HIGH,SENIOR_HIGH',
        amount: new Prisma.Decimal(10000),
        requirements: 'Resident of the city/municipality',
        status: 'Active',
        coveredTerms: '1ST,2ND,3RD',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Local Government Unit (LGU) (SHS)',
        sponsor: 'Local Government Unit',
        type: 'LGU',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'SENIOR_HIGH',
        amount: new Prisma.Decimal(12000),
        requirements: 'Resident of the city/municipality',
        status: 'Active',
        coveredTerms: '1ST,2ND,3RD',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'OLSSEF (SHS)',
        sponsor: 'OLSSEF Foundation',
        type: 'OLSSEF',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'SENIOR_HIGH',
        amount: new Prisma.Decimal(8000),
        requirements: 'Financial need and academic merit',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'EVS (SHS)',
        sponsor: 'EVS Program',
        type: 'EVS',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'SENIOR_HIGH',
        amount: new Prisma.Decimal(7000),
        requirements: 'Vocational track student',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'INDIVIDUAL SPONSORSHIP (JHS/SHS)',
        sponsor: 'Private Sponsor',
        type: 'INDIVIDUAL_SPONSORSHIP',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'JUNIOR_HIGH,SENIOR_HIGH',
        amount: new Prisma.Decimal(10000),
        requirements: 'Sponsored by individual donor',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'UTFI (BED)',
        sponsor: 'UTFI Foundation',
        type: 'UTFI',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH',
        amount: new Prisma.Decimal(9000),
        requirements: 'Financial need-based',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Anonymous/SHS',
        sponsor: 'Anonymous Donor',
        type: 'ANONYMOUS',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'SENIOR_HIGH',
        amount: new Prisma.Decimal(8000),
        requirements: 'Financial need and good standing',
        status: 'Active',
      },
    }),

    // ============================================
    // EXTERNALLY FUNDED SCHOLARSHIPS - HIED
    // ============================================
    prisma.scholarship.create({
      data: {
        scholarshipName: 'UTFI (HIED)',
        sponsor: 'UTFI Foundation',
        type: 'UTFI',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(15000),
        requirements: 'Financial need-based',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'OLSSEF (HIED)',
        sponsor: 'OLSSEF Foundation',
        type: 'OLSSEF',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(12000),
        requirements: 'Financial need and academic merit',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Alay ng Probinsya',
        sponsor: 'Provincial Government',
        type: 'ALAY_NG_PROBINSYA',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(12000),
        requirements: 'Provincial resident scholarship',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Tertiary Education Subsidy (TES)',
        sponsor: 'Commission on Higher Education',
        type: 'TES',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(20000),
        requirements: 'Qualified TES applicant',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Acevedo Grant',
        sponsor: 'Acevedo Foundation',
        type: 'ACEVEDO_GRANT',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        eligiblePrograms: 'BS Education',
        amount: new Prisma.Decimal(18000),
        requirements: 'Academic excellence and financial need',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'CHED Student Financial Assistance Program (StuFAPs)',
        sponsor: 'Commission on Higher Education',
        type: 'STUFAPS',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(25000),
        requirements: 'CHED StuFAPs qualified',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'CHED Merit Scholarship Program (CMSP)',
        sponsor: 'CMSP Foundation',
        type: 'CMSP',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(15000),
        requirements: 'Academic merit and leadership',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'INDIVIDUAL SPONSORSHIP (HIED)',
        sponsor: 'Private Sponsor',
        type: 'INDIVIDUAL_SPONSORSHIP',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(20000),
        requirements: 'Sponsored by individual donor',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Alumni (HIED)',
        sponsor: 'Alumni Association',
        type: 'ALUMNI',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(10000),
        requirements: 'Recommended by alumni member',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Confederation of School Associations, Inc. (COSCHO)',
        sponsor: 'COSCHO Foundation',
        type: 'COSCHO',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(12000),
        requirements: 'Financial need and academic standing',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Tulong Dunong Program (TDP)',
        sponsor: 'DILG Tulong Dunong Program',
        type: 'TULONG_DUNONG',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(22000),
        requirements: 'Financial need and academic merit',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'Local Government Unit (LGU) (HIED)',
        sponsor: 'Local Government Unit',
        type: 'LGU',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(15000),
        requirements: 'Resident of the city/municipality',
        status: 'Active',
        coveredTerms: '1ST,2ND,3RD',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName: 'CHED CSP (Commission on Higher Education Student Program) Scholars',
        sponsor: 'Commission on Higher Education',
        type: 'CHED_CSP',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(30000),
        requirements: 'CHED CSP qualified student',
        status: 'Active',
      },
    }),
    prisma.scholarship.create({
      data: {
        scholarshipName:
          'University Association of Quezon City Technological Educational Association (UAQTEA) (DIPLOMA PROGRAM)',
        sponsor: 'UAQTEA Foundation',
        type: 'UAQTEA',
        source: 'EXTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        amount: new Prisma.Decimal(18000),
        requirements: 'Diploma program student',
        status: 'Active',
      },
    }),
  ]);

  console.log(`✅ Created ${scholarships.length} scholarships`);
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📋 Login Credentials:');
  console.log('   Admin: username: "admin", password: (from SEED_ADMIN_PASSWORD)');
  console.log('   Staff: username: "user",  password: (from SEED_STAFF_PASSWORD)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
