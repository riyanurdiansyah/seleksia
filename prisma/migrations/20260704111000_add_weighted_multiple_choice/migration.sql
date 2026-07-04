-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'multiple_choice_weighted';

-- AlterTable
ALTER TABLE "questions" ADD COLUMN "optionWeights" JSONB;
