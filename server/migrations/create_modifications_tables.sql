-- ================================================================
-- SYSTÈME DE MODIFICATION DES DONNÉES EMPLOYÉS
-- ================================================================
-- Tables pour gérer les modifications directes et les demandes de validation
-- Créé le: 2025-12-01
-- ================================================================

-- Table: historique_modifications (toutes les modifications directes)
CREATE TABLE IF NOT EXISTS historique_modifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employe_id INT NOT NULL,
  champ_modifie VARCHAR(100) NOT NULL COMMENT 'telephone, adresse, photo',
  ancienne_valeur TEXT,
  nouvelle_valeur TEXT,
  date_modification DATETIME DEFAULT CURRENT_TIMESTAMP,
  adresse_ip VARCHAR(45),
  user_agent TEXT,
  
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE,
  INDEX idx_employe_date (employe_id, date_modification),
  INDEX idx_champ (champ_modifie)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historique de toutes les modifications effectuées par les employés';

-- Table: demandes_modification (modifications nécessitant validation)
CREATE TABLE IF NOT EXISTS demandes_modification (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employe_id INT NOT NULL,
  champ_modifie VARCHAR(100) NOT NULL COMMENT 'email, iban',
  ancienne_valeur TEXT,
  nouvelle_valeur TEXT NOT NULL,
  motif TEXT COMMENT 'Raison de la demande',
  statut ENUM('en_attente', 'approuve', 'rejete') DEFAULT 'en_attente',
  
  -- Dates
  date_demande DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_traitement DATETIME,
  
  -- Validation
  valide_par INT COMMENT 'ID du manager/admin qui a validé',
  commentaire_validation TEXT,
  
  -- Métadonnées
  adresse_ip VARCHAR(45),
  
  FOREIGN KEY (employe_id) REFERENCES employes(id) ON DELETE CASCADE,
  FOREIGN KEY (valide_par) REFERENCES employes(id) ON DELETE SET NULL,
  INDEX idx_employe_statut (employe_id, statut),
  INDEX idx_statut_date (statut, date_demande),
  INDEX idx_valide_par (valide_par)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Demandes de modification nécessitant validation RH/Manager';

-- Table: champs_modifiables_config (configuration des permissions)
CREATE TABLE IF NOT EXISTS champs_modifiables_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nom_champ VARCHAR(100) NOT NULL UNIQUE,
  type_modification ENUM('direct', 'validation', 'verrouille') NOT NULL,
  description VARCHAR(255),
  actif BOOLEAN DEFAULT TRUE,
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modification DATETIME ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_type (type_modification),
  INDEX idx_actif (actif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Configuration des champs modifiables et leur niveau de permission';

-- Insertion de la configuration par défaut
INSERT INTO champs_modifiables_config (nom_champ, type_modification, description) VALUES
-- Champs modifiables directement
('telephone', 'direct', 'Numéro de téléphone personnel'),
('adresse', 'direct', 'Adresse postale complète'),
('photo', 'direct', 'Photo de profil'),

-- Champs nécessitant validation
('email', 'validation', 'Adresse email (affecte la connexion)'),
('iban', 'validation', 'Coordonnées bancaires (RIB/IBAN)'),

-- Champs verrouillés (lecture seule pour employé)
('nom', 'verrouille', 'Nom de famille'),
('prenom', 'verrouille', 'Prénom'),
('date_naissance', 'verrouille', 'Date de naissance'),
('numero_securite_sociale', 'verrouille', 'Numéro de sécurité sociale'),
('categorie', 'verrouille', 'Catégorie/Poste'),
('salaire', 'verrouille', 'Salaire'),
('date_embauche', 'verrouille', 'Date d\'embauche'),
('type_contrat', 'verrouille', 'Type de contrat (CDI/CDD)');

-- ================================================================
-- VUES PRATIQUES POUR LES REQUÊTES FRÉQUENTES
-- ================================================================

-- Vue: modifications_recentes (pour le dashboard admin)
CREATE OR REPLACE VIEW modifications_recentes AS
SELECT 
  hm.id,
  hm.employe_id,
  CONCAT(e.prenom, ' ', e.nom) as employe_nom,
  e.categorie,
  hm.champ_modifie,
  hm.ancienne_valeur,
  hm.nouvelle_valeur,
  hm.date_modification,
  'direct' as type_operation
FROM historique_modifications hm
JOIN employes e ON hm.employe_id = e.id
UNION ALL
SELECT 
  dm.id,
  dm.employe_id,
  CONCAT(e.prenom, ' ', e.nom) as employe_nom,
  e.categorie,
  dm.champ_modifie,
  dm.ancienne_valeur,
  dm.nouvelle_valeur,
  dm.date_demande as date_modification,
  CONCAT('demande_', dm.statut) as type_operation
FROM demandes_modification dm
JOIN employes e ON dm.employe_id = e.id
ORDER BY date_modification DESC;

-- Vue: demandes_en_attente (pour notifications)
CREATE OR REPLACE VIEW demandes_en_attente AS
SELECT 
  dm.id,
  dm.employe_id,
  CONCAT(e.prenom, ' ', e.nom) as employe_nom,
  e.email as employe_email,
  e.categorie,
  dm.champ_modifie,
  dm.ancienne_valeur,
  dm.nouvelle_valeur,
  dm.motif,
  dm.date_demande,
  DATEDIFF(NOW(), dm.date_demande) as jours_attente,
  r.manager_id
FROM demandes_modification dm
JOIN employes e ON dm.employe_id = e.id
LEFT JOIN restaurants r ON e.restaurant_id = r.id
WHERE dm.statut = 'en_attente'
ORDER BY dm.date_demande ASC;

-- ================================================================
-- TRIGGERS POUR NOTIFICATIONS AUTOMATIQUES
-- ================================================================

-- Trigger: Après insertion d'une demande de modification
DELIMITER //
CREATE TRIGGER after_demande_modification_insert
AFTER INSERT ON demandes_modification
FOR EACH ROW
BEGIN
  -- Insérer une notification pour les admins/managers
  -- (à adapter selon votre table de notifications existante)
  INSERT INTO notifications (
    employe_id,
    type,
    titre,
    message,
    date_creation,
    lu
  )
  SELECT 
    id,
    'demande_modification',
    'Nouvelle demande de modification',
    CONCAT(
      (SELECT CONCAT(prenom, ' ', nom) FROM employes WHERE id = NEW.employe_id),
      ' demande à modifier son ',
      NEW.champ_modifie
    ),
    NOW(),
    FALSE
  FROM employes 
  WHERE role IN ('admin', 'manager');
END//
DELIMITER ;

-- ================================================================
-- PROCÉDURES STOCKÉES UTILES
-- ================================================================

-- Procédure: Approuver une demande de modification
DELIMITER //
CREATE PROCEDURE sp_approuver_demande(
  IN p_demande_id INT,
  IN p_valide_par INT,
  IN p_commentaire TEXT
)
BEGIN
  DECLARE v_employe_id INT;
  DECLARE v_champ VARCHAR(100);
  DECLARE v_nouvelle_valeur TEXT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Erreur lors de l\'approbation';
  END;
  
  START TRANSACTION;
  
  -- Récupérer les infos de la demande
  SELECT employe_id, champ_modifie, nouvelle_valeur
  INTO v_employe_id, v_champ, v_nouvelle_valeur
  FROM demandes_modification
  WHERE id = p_demande_id AND statut = 'en_attente';
  
  -- Mettre à jour la demande
  UPDATE demandes_modification
  SET statut = 'approuve',
      date_traitement = NOW(),
      valide_par = p_valide_par,
      commentaire_validation = p_commentaire
  WHERE id = p_demande_id;
  
  -- Appliquer la modification sur l'employé
  IF v_champ = 'email' THEN
    UPDATE employes SET email = v_nouvelle_valeur WHERE id = v_employe_id;
  ELSEIF v_champ = 'iban' THEN
    UPDATE employes SET iban = v_nouvelle_valeur WHERE id = v_employe_id;
  END IF;
  
  -- Notification à l'employé
  INSERT INTO notifications (employe_id, type, titre, message, date_creation, lu)
  VALUES (
    v_employe_id,
    'demande_approuvee',
    'Demande approuvée',
    CONCAT('Votre demande de modification de ', v_champ, ' a été approuvée'),
    NOW(),
    FALSE
  );
  
  COMMIT;
END//
DELIMITER ;

-- Procédure: Rejeter une demande de modification
DELIMITER //
CREATE PROCEDURE sp_rejeter_demande(
  IN p_demande_id INT,
  IN p_valide_par INT,
  IN p_commentaire TEXT
)
BEGIN
  DECLARE v_employe_id INT;
  DECLARE v_champ VARCHAR(100);
  
  SELECT employe_id, champ_modifie
  INTO v_employe_id, v_champ
  FROM demandes_modification
  WHERE id = p_demande_id AND statut = 'en_attente';
  
  UPDATE demandes_modification
  SET statut = 'rejete',
      date_traitement = NOW(),
      valide_par = p_valide_par,
      commentaire_validation = p_commentaire
  WHERE id = p_demande_id;
  
  -- Notification à l'employé
  INSERT INTO notifications (employe_id, type, titre, message, date_creation, lu)
  VALUES (
    v_employe_id,
    'demande_rejetee',
    'Demande rejetée',
    CONCAT('Votre demande de modification de ', v_champ, ' a été rejetée. Raison: ', p_commentaire),
    NOW(),
    FALSE
  );
END//
DELIMITER ;

-- ================================================================
-- INDEXES SUPPLÉMENTAIRES POUR PERFORMANCES
-- ================================================================
ALTER TABLE historique_modifications 
  ADD INDEX idx_date (date_modification DESC);

ALTER TABLE demandes_modification 
  ADD INDEX idx_date_statut (date_demande DESC, statut);

-- ================================================================
-- FIN DU SCRIPT
-- ================================================================
