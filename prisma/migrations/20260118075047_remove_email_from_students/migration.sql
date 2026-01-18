/*
  Warnings:

  - You are about to drop the column `email` on the `students` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "students_email_key";

-- AlterTable
ALTER TABLE "students" DROP COLUMN "email";
