/*
  Warnings:

  - Added the required column `eligible_grade_levels` to the `scholarships` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add column with default value first
ALTER TABLE "scholarships" ADD COLUMN "eligible_grade_levels" TEXT NOT NULL DEFAULT '';

-- Update existing scholarships with appropriate grade levels
-- INTERNAL SCHOLARSHIPS
UPDATE "scholarships" SET "eligible_grade_levels" = 'JUNIOR_HIGH,SENIOR_HIGH' WHERE "scholarship_name" = 'Employees Ward (BED/SHS)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'Employees Ward (HIED)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'JUNIOR_HIGH,SENIOR_HIGH' WHERE "scholarship_name" = 'Academic Scholar (BED/SHS)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH,COLLEGE' WHERE "scholarship_name" = 'Working Scholars';
UPDATE "scholarships" SET "eligible_grade_levels" = 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH,COLLEGE' WHERE "scholarship_name" = 'Athletic Scholars';
UPDATE "scholarships" SET "eligible_grade_levels" = 'GRADE_SCHOOL,JUNIOR_HIGH' WHERE "scholarship_name" = 'School Grant (GS/JHS)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'SENIOR_HIGH' WHERE "scholarship_name" = 'School Grant (SHS)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'School Grant (HiEd)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH,COLLEGE' WHERE "scholarship_name" = 'Faculty & Staff';

-- EXTERNAL SCHOLARSHIPS - BED (Basic Education)
UPDATE "scholarships" SET "eligible_grade_levels" = 'GRADE_SCHOOL,JUNIOR_HIGH' WHERE "scholarship_name" = 'PAEB (GS/JHS)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH' WHERE "scholarship_name" = 'Alumni (BED)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH' WHERE "scholarship_name" = 'Yearbook (BED)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'SENIOR_HIGH' WHERE "scholarship_name" = 'Yearbook (SHS)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'JUNIOR_HIGH' WHERE "scholarship_name" = 'ESC (JHS)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'JUNIOR_HIGH,SENIOR_HIGH' WHERE "scholarship_name" = 'LGU (JHS/SHS)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'SENIOR_HIGH' WHERE "scholarship_name" = 'LGU (SHS)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'SENIOR_HIGH' WHERE "scholarship_name" = 'OLSSEF (SHS)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'SENIOR_HIGH' WHERE "scholarship_name" = 'EVS (SHS)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'JUNIOR_HIGH,SENIOR_HIGH' WHERE "scholarship_name" = 'INDIVIDUAL SPONSORSHIP (JHS/SHS)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH' WHERE "scholarship_name" = 'UTFI (BED)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'SENIOR_HIGH' WHERE "scholarship_name" = 'Anonymous/SHS';

-- EXTERNAL SCHOLARSHIPS - HIED (Higher Education)
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'UTFI (HIED)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'OLSSEF (HIED)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'Alay ng Probinsya';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'TES';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'Acevedo Grant';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'StuFAPs';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'CMSP';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'INDIVIDUAL SPONSORSHIP (HIED)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'Alumni (HIED)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'COSCHO';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'Tulong Dunong';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'LGU (HIED)';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'CHED-CSP Scholars';
UPDATE "scholarships" SET "eligible_grade_levels" = 'COLLEGE' WHERE "scholarship_name" = 'UAQTEA (DIPLOMA PROGRAM)';

-- Set default for any remaining scholarships
UPDATE "scholarships" SET "eligible_grade_levels" = 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH,COLLEGE' WHERE "eligible_grade_levels" = '';

-- CreateIndex
CREATE INDEX "scholarships_type_idx" ON "scholarships"("type");

-- CreateIndex
CREATE INDEX "scholarships_source_idx" ON "scholarships"("source");

-- CreateIndex
CREATE INDEX "scholarships_status_idx" ON "scholarships"("status");

-- CreateIndex
CREATE INDEX "student_scholarships_student_id_idx" ON "student_scholarships"("student_id");

-- CreateIndex
CREATE INDEX "student_scholarships_scholarship_id_idx" ON "student_scholarships"("scholarship_id");

-- CreateIndex
CREATE INDEX "student_scholarships_scholarship_status_idx" ON "student_scholarships"("scholarship_status");

-- CreateIndex
CREATE INDEX "students_last_name_first_name_idx" ON "students"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "students_grade_level_status_idx" ON "students"("grade_level", "status");

-- CreateIndex
CREATE INDEX "students_program_idx" ON "students"("program");
