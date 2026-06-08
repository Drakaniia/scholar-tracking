ALTER TABLE "student_scholarships"
ADD COLUMN IF NOT EXISTS "academic_year_id" INTEGER;

UPDATE "student_scholarships" ss
SET "academic_year_id" = ay."academic_year_id"
FROM "academic_years" ay
WHERE ss."academic_year_id" IS NULL
  AND ss."award_date" >= ay."start_date"
  AND ss."award_date" <= ay."end_date";

UPDATE "student_scholarships" ss
SET "academic_year_id" = s."academic_year_id"
FROM "scholarships" s
WHERE ss."academic_year_id" IS NULL
  AND ss."scholarship_id" = s."scholarship_id"
  AND s."academic_year_id" IS NOT NULL;

UPDATE "student_scholarships" ss
SET "academic_year_id" = ay."academic_year_id"
FROM "academic_years" ay
WHERE ss."academic_year_id" IS NULL
  AND ay."is_active" = true;

DROP INDEX IF EXISTS "student_scholarships_student_id_scholarship_id_key";
DROP INDEX IF EXISTS "student_scholarships_student_id_scholarship_id_start_term_key";

CREATE INDEX IF NOT EXISTS "student_scholarships_academic_year_id_idx"
ON "student_scholarships"("academic_year_id");

CREATE UNIQUE INDEX IF NOT EXISTS "student_scholarships_student_id_scholarship_id_academic_year_id_key"
ON "student_scholarships"("student_id", "scholarship_id", "academic_year_id");

ALTER TABLE "student_scholarships"
DROP CONSTRAINT IF EXISTS "student_scholarships_academic_year_id_fkey";

ALTER TABLE "student_scholarships"
ADD CONSTRAINT "student_scholarships_academic_year_id_fkey"
FOREIGN KEY ("academic_year_id")
REFERENCES "academic_years"("academic_year_id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "scholarships"
DROP CONSTRAINT IF EXISTS "scholarships_academic_year_id_fkey";

DROP INDEX IF EXISTS "scholarships_academic_year_id_idx";

ALTER TABLE "scholarships"
DROP COLUMN IF EXISTS "academic_year_id";
