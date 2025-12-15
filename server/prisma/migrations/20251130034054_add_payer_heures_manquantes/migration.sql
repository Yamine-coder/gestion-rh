-- AlterTable
ALTER TABLE "public"."Anomalie" ADD COLUMN     "heuresARecuperer" DECIMAL(65,30),
ADD COLUMN     "payerHeuresManquantes" BOOLEAN NOT NULL DEFAULT false;
