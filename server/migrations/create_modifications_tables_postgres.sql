-- ================================================================
-- MIGRATION POSTGRESQL - SYSTÈME DE MODIFICATION DES DONNÉES EMPLOYÉS
-- ================================================================
-- Version: 1.0.0
-- Date: 2025-12-01
-- Description: Tables pour gestion des modifications directes et workflow de validation
-- ================================================================

-- Table 1: Historique des modifications directes
-- Enregistre toutes les modifications faites directement sans validation
CREATE TABLE IF NOT EXISTS historique_modifications (
  id SERIAL PRIMARY KEY,
  employe_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  champ_modifie VARCHAR(100) NOT NULL,
  ancienne_valeur TEXT,
  nouvelle_valeur TEXT,
  date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  adresse_ip VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX idx_historique_employe ON historique_modifications(employe_id);
CREATE INDEX idx_historique_date ON historique_modifications(date_modification DESC);
CREATE INDEX idx_historique_champ ON historique_modifications(champ_modifie);

-- Table 2: Demandes de modification nécessitant validation
CREATE TABLE IF NOT EXISTS demandes_modification (
  id SERIAL PRIMARY KEY,
  employe_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  champ_modifie VARCHAR(100) NOT NULL,
  ancienne_valeur TEXT,
  nouvelle_valeur TEXT NOT NULL,
  motif TEXT,
  statut VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuve', 'rejete')),
  date_demande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_traitement TIMESTAMP,
  valide_par INTEGER REFERENCES "User"(id),
  commentaire_validation TEXT,
  adresse_ip VARCHAR(45)
);

CREATE INDEX idx_demandes_employe ON demandes_modification(employe_id);
CREATE INDEX idx_demandes_statut ON demandes_modification(statut);
CREATE INDEX idx_demandes_date ON demandes_modification(date_demande DESC);
CREATE INDEX idx_demandes_validateur ON demandes_modification(valide_par);

-- Table 3: Configuration des champs modifiables
CREATE TABLE IF NOT EXISTS champs_modifiables_config (
  nom_champ VARCHAR(100) PRIMARY KEY,
  type_modification VARCHAR(20) NOT NULL CHECK (type_modification IN ('direct', 'validation', 'verrouille')),
  description TEXT,
  actif BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_config_type ON champs_modifiables_config(type_modification);

-- Insertion des configurations par défaut
INSERT INTO champs_modifiables_config (nom_champ, type_modification, description) VALUES
-- Champs modifiables directement (pas de validation requise)
('telephone', 'direct', 'Numéro de téléphone personnel'),
('adresse', 'direct', 'Adresse postale'),
('photo', 'direct', 'Photo de profil'),

-- Champs nécessitant validation (sensibles)
('email', 'validation', 'Adresse email (affecte la connexion)'),
('iban', 'validation', 'Coordonnées bancaires RIB/IBAN'),

-- Champs verrouillés (modifiable uniquement par admin)
('nom', 'verrouille', 'Nom de famille'),
('prenom', 'verrouille', 'Prénom'),
('date_naissance', 'verrouille', 'Date de naissance'),
('categorie', 'verrouille', 'Catégorie/Poste'),
('dateEmbauche', 'verrouille', 'Date d''embauche'),
('salaire', 'verrouille', 'Salaire de base'),
('statut', 'verrouille', 'Statut du contrat (actif/inactif)'),
('role', 'verrouille', 'Rôle dans l''application (admin/employee)')
ON CONFLICT (nom_champ) DO NOTHING;

-- Vue 1: Modifications récentes (union historique + demandes)
CREATE OR REPLACE VIEW modifications_recentes AS
SELECT 
  h.id,
  h.employe_id,
  u.prenom || ' ' || u.nom AS employe_nom,
  h.champ_modifie,
  h.ancienne_valeur,
  h.nouvelle_valeur,
  'directe' AS type_modification,
  'N/A' AS statut,
  h.date_modification AS date_action,
  NULL AS valide_par,
  NULL AS commentaire_validation
FROM historique_modifications h
JOIN "User" u ON h.employe_id = u.id

UNION ALL

SELECT 
  d.id,
  d.employe_id,
  u.prenom || ' ' || u.nom AS employe_nom,
  d.champ_modifie,
  d.ancienne_valeur,
  d.nouvelle_valeur,
  'demande' AS type_modification,
  d.statut,
  COALESCE(d.date_traitement, d.date_demande) AS date_action,
  d.valide_par,
  d.commentaire_validation
FROM demandes_modification d
JOIN "User" u ON d.employe_id = u.id
ORDER BY date_action DESC;

-- Vue 2: Demandes en attente avec informations du manager
CREATE OR REPLACE VIEW demandes_en_attente AS
SELECT 
  d.id,
  d.employe_id,
  u.prenom || ' ' || u.nom AS employe_nom,
  u.email AS employe_email,
  u.categorie AS employe_poste,
  d.champ_modifie,
  d.ancienne_valeur,
  d.nouvelle_valeur,
  d.motif,
  d.date_demande,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - d.date_demande))::INTEGER AS jours_attente,
  d.adresse_ip,
  NULL AS manager_id,
  NULL AS manager_nom
FROM demandes_modification d
JOIN "User" u ON d.employe_id = u.id
WHERE d.statut = 'en_attente'
ORDER BY d.date_demande ASC;

-- Trigger: Créer notification automatique lors d'une nouvelle demande
CREATE OR REPLACE FUNCTION notify_nouvelle_demande()
RETURNS TRIGGER AS $$
BEGIN
  -- Ici on pourrait insérer dans une table notifications si elle existe
  -- Pour l'instant on log juste
  RAISE NOTICE 'Nouvelle demande de modification: employé %, champ %', NEW.employe_id, NEW.champ_modifie;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_demande_modification_insert ON demandes_modification;
CREATE TRIGGER after_demande_modification_insert
  AFTER INSERT ON demandes_modification
  FOR EACH ROW
  EXECUTE FUNCTION notify_nouvelle_demande();

-- Procédure: Approuver une demande de modification
CREATE OR REPLACE FUNCTION sp_approuver_demande(
  p_demande_id INTEGER,
  p_admin_id INTEGER,
  p_commentaire TEXT DEFAULT NULL
)
RETURNS TABLE(succes BOOLEAN, message TEXT) AS $$
DECLARE
  v_demande RECORD;
  v_ancien_email TEXT;
BEGIN
  -- Récupérer la demande
  SELECT * INTO v_demande
  FROM demandes_modification
  WHERE id = p_demande_id AND statut = 'en_attente';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Demande introuvable ou déjà traitée'::TEXT;
    RETURN;
  END IF;

  -- Commencer la transaction
  BEGIN
    -- Sauvegarder l'ancienne valeur email si c'est une modification d'email
    IF v_demande.champ_modifie = 'email' THEN
      SELECT email INTO v_ancien_email FROM "User" WHERE id = v_demande.employe_id;
    END IF;

    -- Appliquer la modification sur la table User
    EXECUTE format('UPDATE "User" SET %I = $1 WHERE id = $2', v_demande.champ_modifie)
    USING v_demande.nouvelle_valeur, v_demande.employe_id;

    -- Mettre à jour le statut de la demande
    UPDATE demandes_modification
    SET 
      statut = 'approuve',
      date_traitement = CURRENT_TIMESTAMP,
      valide_par = p_admin_id,
      commentaire_validation = p_commentaire
    WHERE id = p_demande_id;

    -- Créer une notification pour l'employé (si table notifications existe)
    -- INSERT INTO notifications (user_id, type, message, created_at) VALUES ...

    RETURN QUERY SELECT TRUE, 'Demande approuvée et appliquée avec succès'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
  END;
END;
$$ LANGUAGE plpgsql;

-- Procédure: Rejeter une demande de modification
CREATE OR REPLACE FUNCTION sp_rejeter_demande(
  p_demande_id INTEGER,
  p_admin_id INTEGER,
  p_commentaire TEXT
)
RETURNS TABLE(succes BOOLEAN, message TEXT) AS $$
DECLARE
  v_demande_exists BOOLEAN;
BEGIN
  -- Vérifier que la demande existe et est en attente
  SELECT EXISTS(
    SELECT 1 FROM demandes_modification 
    WHERE id = p_demande_id AND statut = 'en_attente'
  ) INTO v_demande_exists;

  IF NOT v_demande_exists THEN
    RETURN QUERY SELECT FALSE, 'Demande introuvable ou déjà traitée'::TEXT;
    RETURN;
  END IF;

  -- Mettre à jour le statut
  UPDATE demandes_modification
  SET 
    statut = 'rejete',
    date_traitement = CURRENT_TIMESTAMP,
    valide_par = p_admin_id,
    commentaire_validation = p_commentaire
  WHERE id = p_demande_id;

  -- Créer une notification pour l'employé (si table notifications existe)
  -- INSERT INTO notifications (user_id, type, message, created_at) VALUES ...

  RETURN QUERY SELECT TRUE, 'Demande rejetée'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- COMMENTAIRES & DOCUMENTATION
-- ================================================================

COMMENT ON TABLE historique_modifications IS 'Historique de toutes les modifications directes des données employés (sans validation requise)';
COMMENT ON TABLE demandes_modification IS 'Demandes de modification nécessitant validation RH/Manager avant application';
COMMENT ON TABLE champs_modifiables_config IS 'Configuration définissant quel champ peut être modifié et comment (direct/validation/verrouillé)';

COMMENT ON COLUMN historique_modifications.adresse_ip IS 'Adresse IP de l''utilisateur pour audit RGPD';
COMMENT ON COLUMN demandes_modification.motif IS 'Justification fournie par l''employé pour la demande de modification';
COMMENT ON COLUMN champs_modifiables_config.type_modification IS 'Type: direct (auto), validation (manager), verrouille (admin only)';

-- ================================================================
-- FIN DE LA MIGRATION
-- ================================================================
