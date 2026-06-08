ALTER TABLE "scholarships" ADD COLUMN "academic_year_id" INTEGER;

CREATE INDEX "scholarships_academic_year_id_idx" ON "scholarships"("academic_year_id");

ALTER TABLE "scholarships"
ADD CONSTRAINT "scholarships_academic_year_id_fkey"
FOREIGN KEY ("academic_year_id")
REFERENCES "academic_years"("academic_year_id")
ON DELETE SET NULL
ON UPDATE CASCADE;
