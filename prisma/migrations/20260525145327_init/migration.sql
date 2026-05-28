-- CreateEnum
CREATE TYPE "InstructionType" AS ENUM ('general', 'specific');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ViolationType" ADD VALUE 'cursor_leave';
ALTER TYPE "ViolationType" ADD VALUE 'fullscreen_exit';
ALTER TYPE "ViolationType" ADD VALUE 'multiple_displays';
ALTER TYPE "ViolationType" ADD VALUE 'network_disconnect';
ALTER TYPE "ViolationType" ADD VALUE 'audio_noise_detected';
ALTER TYPE "ViolationType" ADD VALUE 'rapid_click';

-- CreateTable
CREATE TABLE "instructions" (
    "id" TEXT NOT NULL,
    "type" "InstructionType" NOT NULL DEFAULT 'general',
    "content" TEXT NOT NULL,
    "testId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instructions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "instructions" ADD CONSTRAINT "instructions_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
