-- AlterTable
ALTER TABLE "scholarships" ADD COLUMN     "eligible_programs" TEXT;

-- CreateTable
CREATE TABLE "backups" (
    "backup_id" SERIAL NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "old_value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performed_by" INTEGER,
    "operation_context" TEXT NOT NULL,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("backup_id")
);

-- CreateIndex
CREATE INDEX "backups_table_name_idx" ON "backups"("table_name");

-- CreateIndex
CREATE INDEX "backups_record_id_idx" ON "backups"("record_id");

-- CreateIndex
CREATE INDEX "backups_created_at_idx" ON "backups"("created_at");

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
