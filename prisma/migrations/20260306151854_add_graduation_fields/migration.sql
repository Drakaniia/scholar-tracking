-- AlterTable
ALTER TABLE "scholarships" ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "start_date" TIMESTAMP(3),
ALTER COLUMN "eligible_grade_levels" DROP DEFAULT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "graduated_at" TIMESTAMP(3),
ADD COLUMN     "graduation_status" TEXT DEFAULT 'Active',
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "scholarships_start_date_idx" ON "scholarships"("start_date");

-- CreateIndex
CREATE INDEX "scholarships_end_date_idx" ON "scholarships"("end_date");

-- CreateIndex
CREATE INDEX "scholarships_is_archived_idx" ON "scholarships"("is_archived");

-- CreateIndex
CREATE INDEX "students_is_archived_idx" ON "students"("is_archived");

-- CreateIndex
CREATE INDEX "students_graduation_status_idx" ON "students"("graduation_status");
