-- Script SQL pour tester les badges "Nouveau" et "Urgent"
-- ⚠️ À exécuter directement dans votre base PostgreSQL

-- 1. Ajouter une colonne createdAt temporairement si elle n'existe pas
-- (Cette colonne pourra être utilisée par le frontend pour calculer l'urgence)

-- 2. Simuler un congé "Nouveau" (créé il y a moins de 24h)
UPDATE "Conge" 
SET type = 'Congé NOUVEAU TEST'
WHERE id = (SELECT id FROM "Conge" WHERE statut = 'en attente' ORDER BY id DESC LIMIT 1);

-- 3. Simuler un congé "Urgent" en modifiant le type pour le reconnaître
UPDATE "Conge" 
SET type = 'Congé URGENT TEST'
WHERE id = (SELECT id FROM "Conge" WHERE statut = 'en attente' AND type != 'Congé NOUVEAU TEST' ORDER BY id LIMIT 1);

-- 4. Vérifier les congés de test
SELECT id, type, statut, "dateDebut", "dateFin", "userId"
FROM "Conge" 
ORDER BY 
  CASE 
    WHEN statut = 'en attente' THEN 1
    WHEN statut = 'approuvé' THEN 2
    ELSE 3
  END,
  "dateDebut" ASC;

-- 5. Afficher un résumé
SELECT statut, COUNT(*) as nombre
FROM "Conge"
GROUP BY statut
ORDER BY 
  CASE 
    WHEN statut = 'en attente' THEN 1
    WHEN statut = 'approuvé' THEN 2
    ELSE 3
  END;
