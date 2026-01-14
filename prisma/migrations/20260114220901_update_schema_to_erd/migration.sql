/*
  Warnings:

  - The primary key for the `scholarships` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `applicationEnd` on the `scholarships` table. All the data in the column will be lost.
  - You are about to drop the column `applicationStart` on the `scholarships` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `scholarships` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `scholarships` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `scholarships` table. All the data in the column will be lost.
  - You are about to drop the column `eligibility` on the `scholarships` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `scholarships` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `scholarships` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `scholarships` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `scholarships` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `scholarships` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - The primary key for the `students` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `course` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `educationLevel` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `middleName` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `tuitionFee` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `yearLevel` on the `students` table. All the data in the column will be lost.
  - You are about to drop the `student_scholarships` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `scholarship_name` to the `scholarships` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sponsor` to the `scholarships` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `scholarships` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `scholarships` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `full_name` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `program` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `student_no` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year_level` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "student_scholarships" DROP CONSTRAINT "student_scholarships_scholarshipId_fkey";

-- DropForeignKey
ALTER TABLE "student_scholarships" DROP CONSTRAINT "student_scholarships_studentId_fkey";

-- AlterTable
ALTER TABLE "scholarships" DROP CONSTRAINT "scholarships_pkey",
DROP COLUMN "applicationEnd",
DROP COLUMN "applicationStart",
DROP COLUMN "category",
DROP COLUMN "createdAt",
DROP COLUMN "description",
DROP COLUMN "eligibility",
DROP COLUMN "id",
DROP COLUMN "isActive",
DROP COLUMN "name",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "requirements" TEXT,
ADD COLUMN     "scholarship_id" SERIAL NOT NULL,
ADD COLUMN     "scholarship_name" TEXT NOT NULL,
ADD COLUMN     "sponsor" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
ADD CONSTRAINT "scholarships_pkey" PRIMARY KEY ("scholarship_id");

-- AlterTable
ALTER TABLE "students" DROP CONSTRAINT "students_pkey",
DROP COLUMN "course",
DROP COLUMN "createdAt",
DROP COLUMN "educationLevel",
DROP COLUMN "firstName",
DROP COLUMN "id",
DROP COLUMN "lastName",
DROP COLUMN "middleName",
DROP COLUMN "tuitionFee",
DROP COLUMN "updatedAt",
DROP COLUMN "yearLevel",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "full_name" TEXT NOT NULL,
ADD COLUMN     "program" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "student_id" SERIAL NOT NULL,
ADD COLUMN     "student_no" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "year_level" TEXT NOT NULL,
ADD CONSTRAINT "students_pkey" PRIMARY KEY ("student_id");

-- DropTable
DROP TABLE "student_scholarships";

-- CreateTable
CREATE TABLE "applications" (
    "application_id" SERIAL NOT NULL,
    "application_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "remarks" TEXT,
    "student_id" INTEGER NOT NULL,
    "scholarship_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("application_id")
);

-- CreateTable
CREATE TABLE "awards" (
    "award_id" SERIAL NOT NULL,
    "award_date" TIMESTAMP(3) NOT NULL,
    "start_term" TEXT NOT NULL,
    "end_term" TEXT NOT NULL,
    "grant_amount" DECIMAL(10,2) NOT NULL,
    "application_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("award_id")
);

-- CreateTable
CREATE TABLE "disbursements" (
    "disbursement_id" SERIAL NOT NULL,
    "disbursement_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "term" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "award_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disbursements_pkey" PRIMARY KEY ("disbursement_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "awards_application_id_key" ON "awards"("application_id");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_scholarship_id_fkey" FOREIGN KEY ("scholarship_id") REFERENCES "scholarships"("scholarship_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_award_id_fkey" FOREIGN KEY ("award_id") REFERENCES "awards"("award_id") ON DELETE CASCADE ON UPDATE CASCADE;
