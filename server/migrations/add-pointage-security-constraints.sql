-- Migration pour ajouter des contraintes de sécurité au système de pointage
-- À exécuter dans PostgreSQL pour sécuriser la base de données

-- 1. Contrainte sur les types de pointage (seulement 'arrivee' ou 'depart')
ALTER TABLE "Pointage" 
ADD CONSTRAINT pointage_type_check 
CHECK (type IN ('arrivee', 'depart'));

-- 2. Contrainte pour empêcher les horodatages futurs (max +1 heure pour tolérer les décalages)
ALTER TABLE "Pointage"
ADD CONSTRAINT pointage_futur_check
CHECK (horodatage <= NOW() + INTERVAL '1 hour');

-- 3. Contrainte pour empêcher les horodatages trop anciens (max 7 jours)
ALTER TABLE "Pointage"
ADD CONSTRAINT pointage_ancien_check
CHECK (horodatage >= NOW() - INTERVAL '7 days');

-- 4. Index unique pour empêcher les doublons exacts (même user, type, timestamp à la seconde près)
CREATE UNIQUE INDEX pointage_unique_idx 
ON "Pointage" (
    "userId", 
    "type", 
    date_trunc('second', "horodatage")
);

-- 5. Index optimisé pour les requêtes par journée de travail
CREATE INDEX pointage_journee_travail_idx 
ON "Pointage" ("userId", "horodatage" DESC);

-- 6. Index pour les requêtes admin par date
CREATE INDEX pointage_date_admin_idx 
ON "Pointage" (date_trunc('day', "horodatage"), "userId");

-- 7. Contrainte pour vérifier que userId existe et est valide
ALTER TABLE "Pointage"
ADD CONSTRAINT pointage_userid_positive_check
CHECK ("userId" > 0);
