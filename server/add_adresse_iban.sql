-- Ajouter les colonnes adresse et iban à la table User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adresse" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "iban" TEXT;
