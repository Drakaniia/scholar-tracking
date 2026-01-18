/*
  Warnings:

  - You are about to drop the column `award_id` on the `disbursements` table. All the data in the column will be lost.
  - You are about to drop the column `full_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the `applications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `awards` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[student_no]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `scholarship_id` to the `disbursements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `student_id` to the `disbursements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `grade_level` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_scholarship_id_fkey";

-- DropForeignKey
ALTER TABLE "applications" DROP CONSTRAINT "applications_student_id_fkey";

-- DropForeignKey
ALTER TABLE "awards" DROP CONSTRAINT "awards_application_id_fkey";

-- DropForeignKey
ALTER TABLE "disbursements" DROP CONSTRAINT "disbursements_award_id_fkey";

-- AlterTable
ALTER TABLE "disbursements" DROP COLUMN "award_id",
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "scholarship_id" INTEGER NOT NULL,
ADD COLUMN     "student_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "full_name",
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "grade_level" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "middle_initial" TEXT;

-- DropTable
DROP TABLE "applications";

-- DropTable
DROP TABLE "awards";

-- CreateTable
CREATE TABLE "student_scholarships" (
    "student_scholarship_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "scholarship_id" INTEGER NOT NULL,
    "award_date" TIMESTAMP(3) NOT NULL,
    "start_term" TEXT NOT NULL,
    "end_term" TEXT NOT NULL,
    "grant_amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_scholarships_pkey" PRIMARY KEY ("student_scholarship_id")
);

-- CreateTable
CREATE TABLE "student_fees" (
    "fees_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "tuition_fee" DECIMAL(10,2) NOT NULL,
    "other_fee" DECIMAL(10,2) NOT NULL,
    "miscellaneous_fee" DECIMAL(10,2) NOT NULL,
    "laboratory_fee" DECIMAL(10,2) NOT NULL,
    "amount_subsidy" DECIMAL(10,2) NOT NULL,
    "percent_subsidy" DECIMAL(5,2) NOT NULL,
    "term" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_fees_pkey" PRIMARY KEY ("fees_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_scholarships_student_id_scholarship_id_start_term_key" ON "student_scholarships"("student_id", "scholarship_id", "start_term");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_no_key" ON "students"("student_no");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- AddForeignKey
ALTER TABLE "student_scholarships" ADD CONSTRAINT "student_scholarships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_scholarships" ADD CONSTRAINT "student_scholarships_scholarship_id_fkey" FOREIGN KEY ("scholarship_id") REFERENCES "scholarships"("scholarship_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_scholarship_id_fkey" FOREIGN KEY ("scholarship_id") REFERENCES "scholarships"("scholarship_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fees" ADD CONSTRAINT "student_fees_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
