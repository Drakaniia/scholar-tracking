-- Optimized indexes for ScholarTrack database
-- Run this SQL directly or create a Prisma migration

-- Composite index for students filtering (most common query pattern)
-- Covers: isArchived, gradeLevel, program, status
CREATE INDEX IF NOT EXISTS "students_filtered_list_idx" 
ON "students"("is_archived", "grade_level", "program", "status");

-- Composite index for scholarship filtering
CREATE INDEX IF NOT EXISTS "student_scholarships_composite_idx" 
ON "student_scholarships"("student_id", "scholarship_id", "scholarship_status");

-- Index for scholarship queries with status and archive flag
CREATE INDEX IF NOT EXISTS "scholarships_active_idx" 
ON "scholarships"("status", "is_archived") 
WHERE status = 'ACTIVE' AND is_archived = false;

-- Index for student fees by term and academic year
CREATE INDEX IF NOT EXISTS "student_fees_term_year_idx" 
ON "student_fees"("student_id", "term", "academic_year");

-- Index for disbursements by student and date
CREATE INDEX IF NOT EXISTS "disbursements_student_date_idx" 
ON "disbursements"("student_id", "disbursement_date");

-- Note: Run ANALYZE after creating indexes to update query planner statistics
ANALYZE "students";
ANALYZE "student_scholarships";
ANALYZE "scholarships";
ANALYZE "student_fees";
ANALYZE "disbursements";
