-- Ajouter les colonnes pour les documents administratifs
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "justificatifDomicile" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "justificatifRIB" TEXT;
