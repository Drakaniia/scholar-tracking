/*
  Warnings:

  - You are about to drop the column `award_date` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `end_term` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `grant_amount` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `scholarship_id` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `scholarship_status` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `start_term` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `student_no` on the `students` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_scholarship_id_fkey";

-- DropIndex
DROP INDEX "students_student_no_key";

-- AlterTable
ALTER TABLE "scholarships" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'INTERNAL';

-- AlterTable
ALTER TABLE "students" DROP COLUMN "award_date",
DROP COLUMN "end_term",
DROP COLUMN "grant_amount",
DROP COLUMN "scholarship_id",
DROP COLUMN "scholarship_status",
DROP COLUMN "start_term",
DROP COLUMN "student_no";

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "last_login" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "session_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "log_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" INTEGER,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "student_scholarships" (
    "student_scholarship_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "scholarship_id" INTEGER NOT NULL,
    "award_date" TIMESTAMP(3) NOT NULL,
    "start_term" TEXT NOT NULL,
    "end_term" TEXT NOT NULL,
    "grant_amount" DECIMAL(10,2) NOT NULL,
    "scholarship_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_scholarships_pkey" PRIMARY KEY ("student_scholarship_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_scholarships_student_id_scholarship_id_key" ON "student_scholarships"("student_id", "scholarship_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_scholarships" ADD CONSTRAINT "student_scholarships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_scholarships" ADD CONSTRAINT "student_scholarships_scholarship_id_fkey" FOREIGN KEY ("scholarship_id") REFERENCES "scholarships"("scholarship_id") ON DELETE RESTRICT ON UPDATE CASCADE;
