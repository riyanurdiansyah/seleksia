/*
  Warnings:

  - A unique constraint covering the columns `[companyId,displayId]` on the table `candidates` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,email]` on the table `candidates` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,displayId]` on the table `tests` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `companyId` to the `candidates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `instructions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `tests` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "candidates_displayId_key";

-- DropIndex
DROP INDEX "candidates_email_key";

-- DropIndex
DROP INDEX "tests_displayId_key";

-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "instructions" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tests" ADD COLUMN     "companyId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_companyId_displayId_key" ON "candidates"("companyId", "displayId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_companyId_email_key" ON "candidates"("companyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "tests_companyId_displayId_key" ON "tests"("companyId", "displayId");

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructions" ADD CONSTRAINT "instructions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
