-- CreateTable
CREATE TABLE "promotion_runs" (
  "promotion_run_id" SERIAL NOT NULL,
  "academic_year_id" INTEGER NOT NULL,
  "academic_year" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "requested_by" INTEGER,
  "total_students" INTEGER NOT NULL DEFAULT 0,
  "promoted_count" INTEGER NOT NULL DEFAULT 0,
  "graduated_count" INTEGER NOT NULL DEFAULT 0,
  "skipped_count" INTEGER NOT NULL DEFAULT 0,
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "errors" JSONB,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "promotion_runs_pkey" PRIMARY KEY ("promotion_run_id")
);

-- CreateIndex
CREATE INDEX "promotion_runs_academic_year_id_status_idx"
ON "promotion_runs"("academic_year_id", "status");

-- CreateIndex
CREATE INDEX "promotion_runs_status_started_at_idx"
ON "promotion_runs"("status", "started_at");
