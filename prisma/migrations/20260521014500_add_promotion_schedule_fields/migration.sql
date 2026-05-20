-- AlterTable
ALTER TABLE "academic_years"
ADD COLUMN "promotion_date" TIMESTAMP(3),
ADD COLUMN "promotion_processed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "academic_years_promotion_date_promotion_processed_at_idx"
ON "academic_years"("promotion_date", "promotion_processed_at");
