-- Add explicit year-end decision and separated-registry fields to students.
ALTER TABLE "students"
ADD COLUMN "transition_decision" TEXT,
ADD COLUMN "transition_decision_at" TIMESTAMP(3),
ADD COLUMN "transition_decision_by" INTEGER,
ADD COLUMN "separated_at" TIMESTAMP(3),
ADD COLUMN "separation_reason" TEXT;

-- Store durable academic-year snapshots so promotion history does not depend on
-- the mutable current grade/year fields on students.
CREATE TABLE "student_academic_records" (
  "student_academic_record_id" SERIAL NOT NULL,
  "student_id" INTEGER NOT NULL,
  "academic_year_id" INTEGER,
  "academic_year" TEXT NOT NULL,
  "grade_level" TEXT NOT NULL,
  "year_level" TEXT NOT NULL,
  "program" TEXT NOT NULL,
  "term_type" TEXT NOT NULL DEFAULT 'SEMESTER',
  "status" TEXT NOT NULL DEFAULT 'Active',
  "outcome" TEXT,
  "decision" TEXT,
  "next_grade_level" TEXT,
  "next_year_level" TEXT,
  "next_program" TEXT,
  "next_term_type" TEXT,
  "is_current" BOOLEAN NOT NULL DEFAULT false,
  "started_at" TIMESTAMP(3),
  "ended_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "student_academic_records_pkey" PRIMARY KEY ("student_academic_record_id")
);

CREATE INDEX "student_academic_records_student_id_idx"
ON "student_academic_records"("student_id");

CREATE INDEX "student_academic_records_academic_year_id_outcome_idx"
ON "student_academic_records"("academic_year_id", "outcome");

CREATE INDEX "student_academic_records_outcome_idx"
ON "student_academic_records"("outcome");

CREATE INDEX "student_academic_records_is_current_idx"
ON "student_academic_records"("is_current");

ALTER TABLE "student_academic_records"
ADD CONSTRAINT "student_academic_records_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_academic_records"
ADD CONSTRAINT "student_academic_records_academic_year_id_fkey"
FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("academic_year_id") ON DELETE SET NULL ON UPDATE CASCADE;
