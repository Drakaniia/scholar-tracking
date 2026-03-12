#!/usr/bin/env node
/**
 * Script to add optimized database indexes
 * Run with: npx tsx scripts/add-indexes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addIndexes() {
  console.log('Adding optimized database indexes...\n');

  try {
    // Use raw SQL to create indexes
    await prisma.$executeRawUnsafe(`
      -- Composite index for students filtering (most common query pattern)
      CREATE INDEX IF NOT EXISTS "students_filtered_list_idx" 
      ON "students"("is_archived", "grade_level", "program", "status");
    `);
    console.log('✓ Created students_filtered_list_idx');

    await prisma.$executeRawUnsafe(`
      -- Composite index for scholarship filtering
      CREATE INDEX IF NOT EXISTS "student_scholarships_composite_idx" 
      ON "student_scholarships"("student_id", "scholarship_id", "scholarship_status");
    `);
    console.log('✓ Created student_scholarships_composite_idx');

    await prisma.$executeRawUnsafe(`
      -- Index for scholarship queries with status and archive flag
      CREATE INDEX IF NOT EXISTS "scholarships_active_idx" 
      ON "scholarships"("status", "is_archived");
    `);
    console.log('✓ Created scholarships_active_idx');

    await prisma.$executeRawUnsafe(`
      -- Index for student fees by term and academic year
      CREATE INDEX IF NOT EXISTS "student_fees_term_year_idx" 
      ON "student_fees"("student_id", "term", "academic_year");
    `);
    console.log('✓ Created student_fees_term_year_idx');

    await prisma.$executeRawUnsafe(`
      -- Index for disbursements by student and date
      CREATE INDEX IF NOT EXISTS "disbursements_student_date_idx" 
      ON "disbursements"("student_id", "disbursement_date");
    `);
    console.log('✓ Created disbursements_student_date_idx');

    // Update query planner statistics
    await prisma.$executeRawUnsafe(`ANALYZE "students"`);
    await prisma.$executeRawUnsafe(`ANALYZE "student_scholarships"`);
    await prisma.$executeRawUnsafe(`ANALYZE "scholarships"`);
    await prisma.$executeRawUnsafe(`ANALYZE "student_fees"`);
    await prisma.$executeRawUnsafe(`ANALYZE "disbursements"`);
    console.log('✓ Updated query planner statistics (ANALYZE)');

    console.log('\n✅ All indexes created successfully!');
    console.log('\nNote: Index creation may take some time on large tables.');
    console.log('Query performance should improve significantly after indexes are built.\n');
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addIndexes();
