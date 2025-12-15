-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "commentaireDepart" TEXT,
ADD COLUMN     "dateSortie" TIMESTAMP(3),
ADD COLUMN     "motifDepart" TEXT;
