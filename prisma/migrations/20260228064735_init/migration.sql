-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin', 'proctor');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('range', 'permanent');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('registered', 'testing', 'completed', 'flagged');

-- CreateEnum
CREATE TYPE "TestCategory" AS ENUM ('intelligence', 'personality', 'aptitude', 'projective');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('multiple_choice', 'true_false', 'likert_scale', 'forced_choice', 'number_series', 'image_pattern', 'essay');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "displayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'user',
    "batch" TEXT,
    "password" TEXT NOT NULL,
    "accessType" "AccessType" NOT NULL DEFAULT 'range',
    "accessStart" TIMESTAMP(3),
    "accessEnd" TIMESTAMP(3),
    "status" "CandidateStatus" NOT NULL DEFAULT 'registered',
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests" (
    "id" TEXT NOT NULL,
    "displayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TestCategory" NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "status" "TestStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "displayId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT[],
    "correctAnswer" TEXT,
    "imageUrl" TEXT,
    "timeLimit" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "testId" TEXT NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidates_displayId_key" ON "candidates"("displayId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_email_key" ON "candidates"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tests_displayId_key" ON "tests"("displayId");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
