/*
  Warnings:

  - You are about to drop the `student_scholarships` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "student_scholarships" DROP CONSTRAINT "student_scholarships_scholarship_id_fkey";

-- DropForeignKey
ALTER TABLE "student_scholarships" DROP CONSTRAINT "student_scholarships_student_id_fkey";

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "award_date" TIMESTAMP(3),
ADD COLUMN     "end_term" TEXT,
ADD COLUMN     "grant_amount" DECIMAL(10,2),
ADD COLUMN     "scholarship_id" INTEGER,
ADD COLUMN     "scholarship_status" TEXT,
ADD COLUMN     "start_term" TEXT;

-- DropTable
DROP TABLE "student_scholarships";

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_scholarship_id_fkey" FOREIGN KEY ("scholarship_id") REFERENCES "scholarships"("scholarship_id") ON DELETE SET NULL ON UPDATE CASCADE;
