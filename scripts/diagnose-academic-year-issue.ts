import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

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

async function diagnoseIssue() {
  console.log('🔍 Diagnosing Academic Year Filter Issue\n');

  // Get academic years
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { year: 'desc' },
  });

  console.log('📅 Academic Years:');
  academicYears.forEach((ay) => {
    console.log(`  - ID: ${ay.id}, Year: ${ay.year}, Active: ${ay.isActive}`);
  });

  const targetAcademicYear = academicYears.find((ay) => ay.year === '2024-2025');
  if (!targetAcademicYear) {
    console.log('\n❌ Academic Year 2024-2025 not found!');
    return;
  }

  console.log(`\n🎯 Target Academic Year: ${targetAcademicYear.year} (ID: ${targetAcademicYear.id})`);

  // Find students with scholarships for this academic year
  const studentsWithScholarships = await prisma.student.findMany({
    where: {
      isArchived: false,
      status: 'Active',
      scholarships: {
        some: {
          academicYearId: targetAcademicYear.id,
        },
      },
    },
    include: {
      scholarships: {
        include: {
          scholarship: {
            select: {
              scholarshipName: true,
              type: true,
            },
          },
        },
      },
      fees: true,
    },
  });

  console.log(`\n👥 Students with scholarships for ${targetAcademicYear.year}: ${studentsWithScholarships.length}`);

  studentsWithScholarships.slice(0, 5).forEach((student) => {
    console.log(`\n  📝 ${student.lastName}, ${student.firstName} (ID: ${student.id})`);
    
    // Scholarships
    const scholarshipsForYear = student.scholarships.filter(
      (s) => s.academicYearId === targetAcademicYear.id
    );
    console.log(`     Scholarships for ${targetAcademicYear.year}:`);
    scholarshipsForYear.forEach((s) => {
      console.log(`       - ${s.scholarship.scholarshipName} (AY ID: ${s.academicYearId})`);
    });

    // Fees
    const feesForYear = student.fees.filter(
      (f) => f.academicYearId === targetAcademicYear.id || f.academicYear === targetAcademicYear.year
    );
    console.log(`     Fees for ${targetAcademicYear.year}:`);
    if (feesForYear.length === 0) {
      console.log(`       ❌ NO FEES for this academic year`);
    } else {
      feesForYear.forEach((f) => {
        console.log(
          `       - Term: ${f.term}, AY: ${f.academicYear}, AY ID: ${f.academicYearId}, Tuition: ${f.tuitionFee}`
        );
      });
    }

    // All fees
    if (student.fees.length > 0) {
      console.log(`     All fees (${student.fees.length}):`);
      student.fees.forEach((f) => {
        console.log(
          `       - Term: ${f.term}, AY: ${f.academicYear}, AY ID: ${f.academicYearId}`
        );
      });
    } else {
      console.log(`     ⚠️  No fees recorded at all`);
    }
  });

  // Find students with fees for this academic year
  const studentsWithFees = await prisma.student.findMany({
    where: {
      isArchived: false,
      status: 'Active',
      fees: {
        some: {
          OR: [
            { academicYearId: targetAcademicYear.id },
            { academicYear: targetAcademicYear.year },
          ],
        },
      },
    },
    include: {
      fees: true,
      scholarships: {
        include: {
          scholarship: {
            select: {
              scholarshipName: true,
            },
          },
        },
      },
    },
  });

  console.log(`\n\n💰 Students with fees for ${targetAcademicYear.year}: ${studentsWithFees.length}`);

  // Check for mismatches
  const studentsInBoth = studentsWithScholarships.filter((s) =>
    studentsWithFees.some((f) => f.id === s.id)
  );
  const studentsOnlyInScholarships = studentsWithScholarships.filter(
    (s) => !studentsWithFees.some((f) => f.id === s.id)
  );

  console.log(
    `\n📊 Overlap: ${studentsInBoth.length} students have both scholarships and fees for ${targetAcademicYear.year}`
  );
  console.log(
    `⚠️  Mismatch: ${studentsOnlyInScholarships.length} students have scholarships but NO fees for ${targetAcademicYear.year}`
  );

  if (studentsOnlyInScholarships.length > 0) {
    console.log('\n❗ Students with scholarships but no fees:');
    studentsOnlyInScholarships.slice(0, 10).forEach((s) => {
      console.log(`  - ${s.lastName}, ${s.firstName} (ID: ${s.id})`);
      console.log(`    Scholarships: ${s.scholarships.map((sc) => sc.scholarship.scholarshipName).join(', ')}`);
      if (s.fees.length > 0) {
        console.log(`    But has fees for: ${[...new Set(s.fees.map((f) => f.academicYear))].join(', ')}`);
      } else {
        console.log(`    No fees recorded at all`);
      }
    });
  }

  await prisma.$disconnect();
}

diagnoseIssue().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
