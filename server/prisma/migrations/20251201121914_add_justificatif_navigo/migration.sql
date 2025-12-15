-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "eligibleNavigo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "justificatifNavigo" TEXT;
