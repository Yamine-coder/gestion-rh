-- =====================================================
-- SYSTÈME DE SCORING EMPLOYÉS - Tables et données (Prisma compatible)
-- =====================================================

-- Table des règles de scoring (définition des points possibles)
CREATE TABLE IF NOT EXISTS scoring_rules (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(150) NOT NULL,
  description TEXT,
  points INTEGER NOT NULL,
  categorie VARCHAR(30) NOT NULL,
  type VARCHAR(20) DEFAULT 'auto' CHECK (type IN ('auto', 'manuel')),
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table historique des points attribués aux employés
CREATE TABLE IF NOT EXISTS employe_points (
  id SERIAL PRIMARY KEY,
  employe_id INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  rule_id INTEGER REFERENCES scoring_rules(id) ON DELETE SET NULL,
  rule_code VARCHAR(50),
  points INTEGER NOT NULL,
  motif TEXT,
  date_evenement DATE DEFAULT CURRENT_DATE,
  reference_type VARCHAR(30),
  reference_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES "User"(id) ON DELETE SET NULL
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_scoring_rules_code ON scoring_rules(code);
CREATE INDEX IF NOT EXISTS idx_scoring_rules_categorie ON scoring_rules(categorie);
CREATE INDEX IF NOT EXISTS idx_employe_points_employe ON employe_points(employe_id);
CREATE INDEX IF NOT EXISTS idx_employe_points_date ON employe_points(date_evenement);
CREATE INDEX IF NOT EXISTS idx_employe_points_rule ON employe_points(rule_id);

-- Vue pour le score total par employé (12 derniers mois)
CREATE OR REPLACE VIEW employe_scores AS
SELECT 
  employe_id,
  SUM(points) as score_total,
  SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as total_bonus,
  ABS(SUM(CASE WHEN points < 0 THEN points ELSE 0 END)) as total_malus,
  COUNT(*) as nb_evenements,
  COUNT(CASE WHEN points > 0 THEN 1 END) as nb_bonus,
  COUNT(CASE WHEN points < 0 THEN 1 END) as nb_malus
FROM employe_points
WHERE date_evenement >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY employe_id;

-- =====================================================
-- RÈGLES DE SCORING PAR DÉFAUT
-- =====================================================

-- CATÉGORIE: POINTAGE
INSERT INTO scoring_rules (code, label, description, points, categorie, type) VALUES
('POINTAGE_PONCTUEL', 'Pointage ponctuel', 'Arrivée à l''heure ou en avance', 2, 'pointage', 'auto'),
('RETARD_LEGER', 'Retard léger', 'Retard de moins de 15 minutes', -3, 'pointage', 'auto'),
('RETARD_MODERE', 'Retard modéré', 'Retard entre 15 et 30 minutes', -7, 'pointage', 'auto'),
('RETARD_GRAVE', 'Retard grave', 'Retard de plus de 30 minutes', -15, 'pointage', 'auto'),
('OUBLI_POINTAGE', 'Oubli de pointage', 'N''a pas pointé son arrivée ou départ', -5, 'pointage', 'auto')
ON CONFLICT (code) DO NOTHING;

-- CATÉGORIE: PRÉSENCE
INSERT INTO scoring_rules (code, label, description, points, categorie, type) VALUES
('SEMAINE_COMPLETE', 'Semaine complète', 'Présent tous les jours prévus de la semaine', 10, 'presence', 'auto'),
('ABSENCE_JUSTIFIEE', 'Absence justifiée', 'Absence avec justificatif valide', 0, 'presence', 'auto'),
('ABSENCE_NON_JUSTIFIEE', 'Absence non justifiée', 'Absence sans justificatif', -25, 'presence', 'auto'),
('MOIS_SANS_ABSENCE', 'Mois exemplaire', 'Aucune absence sur le mois', 20, 'presence', 'auto')
ON CONFLICT (code) DO NOTHING;

-- CATÉGORIE: ANOMALIES
INSERT INTO scoring_rules (code, label, description, points, categorie, type) VALUES
('SEMAINE_SANS_ANOMALIE', 'Semaine sans anomalie', 'Aucune anomalie détectée sur la semaine', 5, 'anomalie', 'auto'),
('ANOMALIE_NON_RESOLUE', 'Anomalie non résolue', 'Anomalie en attente depuis plus de 48h', -10, 'anomalie', 'auto'),
('ANOMALIE_RECURRENTE', 'Anomalie récurrente', '3+ anomalies du même type ce mois', -15, 'anomalie', 'auto')
ON CONFLICT (code) DO NOTHING;

-- CATÉGORIE: REMPLACEMENTS & EXTRAS
INSERT INTO scoring_rules (code, label, description, points, categorie, type) VALUES
('REMPLACEMENT_ACCEPTE', 'Remplacement accepté', 'A accepté de remplacer un collègue', 15, 'remplacement', 'auto'),
('REMPLACEMENT_REFUSE', 'Remplacement refusé', 'A refusé un remplacement demandé', -3, 'remplacement', 'auto'),
('EXTRA_EFFECTUE', 'Extra effectué', 'A effectué un shift extra', 20, 'extra', 'auto'),
('EXTRA_ANNULE_TARDIF', 'Annulation tardive extra', 'A annulé un extra moins de 24h avant', -20, 'extra', 'auto')
ON CONFLICT (code) DO NOTHING;

-- CATÉGORIE: CONGÉS
INSERT INTO scoring_rules (code, label, description, points, categorie, type) VALUES
('CONGE_DELAI_RESPECTE', 'Demande dans les délais', 'Congé demandé avec préavis suffisant', 3, 'conge', 'auto'),
('CONGE_TARDIF', 'Demande tardive', 'Congé demandé moins de 48h avant', -5, 'conge', 'auto')
ON CONFLICT (code) DO NOTHING;

-- CATÉGORIE: COMPORTEMENT (MANUEL)
INSERT INTO scoring_rules (code, label, description, points, categorie, type) VALUES
('ATTITUDE_CLIENT_POS', 'Excellente attitude client', 'Retour positif d''un client', 15, 'comportement', 'manuel'),
('ATTITUDE_CLIENT_NEG', 'Problème attitude client', 'Plainte ou retour négatif client', -20, 'comportement', 'manuel'),
('ESPRIT_EQUIPE_POS', 'Esprit d''équipe', 'Aide spontanée aux collègues', 10, 'comportement', 'manuel'),
('ESPRIT_EQUIPE_NEG', 'Problème équipe', 'Conflit ou mauvaise ambiance créée', -15, 'comportement', 'manuel'),
('INITIATIVE', 'Initiative remarquable', 'A pris une initiative positive', 20, 'comportement', 'manuel'),
('HYGIENE_TENUE_NEG', 'Problème hygiène/tenue', 'Non-respect des normes', -10, 'comportement', 'manuel'),
('FELICITATIONS', 'Félicitations', 'Reconnaissance spéciale du manager', 25, 'comportement', 'manuel'),
('AVERTISSEMENT_VERBAL', 'Avertissement verbal', 'Rappel à l''ordre oral', -15, 'comportement', 'manuel'),
('AVERTISSEMENT_ECRIT', 'Avertissement écrit', 'Avertissement formel écrit', -40, 'comportement', 'manuel'),
('FORMATION_SUIVIE', 'Formation suivie', 'A complété une formation', 15, 'comportement', 'manuel')
ON CONFLICT (code) DO NOTHING;

-- CATÉGORIE: BONUS SPÉCIAUX
INSERT INTO scoring_rules (code, label, description, points, categorie, type) VALUES
('BONUS_MANAGER', 'Bonus manager', 'Bonus discrétionnaire attribué par le manager', 0, 'special', 'manuel'),
('MALUS_MANAGER', 'Malus manager', 'Malus discrétionnaire attribué par le manager', 0, 'special', 'manuel')
ON CONFLICT (code) DO NOTHING;
