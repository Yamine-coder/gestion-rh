// Script d'initialisation des tables de scoring
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // 1. Lister les tables existantes
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log('📋 Tables existantes:', tables.rows.map(x => x.table_name).join(', '));
    
    // 2. Trouver la table des employés
    const employeTable = tables.rows.find(t => 
      t.table_name === 'User' || 
      t.table_name === 'users' || 
      t.table_name === 'employes' || 
      t.table_name === 'employees'
    );
    
    const userTableName = employeTable ? employeTable.table_name : 'User';
    console.log('👤 Table employés:', userTableName);
    
    // 3. Créer la table scoring_rules
    await pool.query(`
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
      )
    `);
    console.log('✅ Table scoring_rules créée');
    
    // 4. Créer la table employe_points
    await pool.query(`
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
      )
    `);
    console.log('✅ Table employe_points créée');
    
    // 5. Créer les index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scoring_rules_code ON scoring_rules(code);
      CREATE INDEX IF NOT EXISTS idx_scoring_rules_categorie ON scoring_rules(categorie);
      CREATE INDEX IF NOT EXISTS idx_employe_points_employe ON employe_points(employe_id);
      CREATE INDEX IF NOT EXISTS idx_employe_points_date ON employe_points(date_evenement);
    `);
    console.log('✅ Index créés');
    
    // 6. Créer la vue
    await pool.query(`
      CREATE OR REPLACE VIEW employe_scores AS
      SELECT 
        employe_id,
        COALESCE(SUM(points), 0) as score_total,
        COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) as total_bonus,
        ABS(COALESCE(SUM(CASE WHEN points < 0 THEN points ELSE 0 END), 0)) as total_malus,
        COUNT(*) as nb_evenements,
        COUNT(CASE WHEN points > 0 THEN 1 END) as nb_bonus,
        COUNT(CASE WHEN points < 0 THEN 1 END) as nb_malus
      FROM employe_points
      WHERE date_evenement >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY employe_id
    `);
    console.log('✅ Vue employe_scores créée');
    
    // 7. Créer la table peer_feedbacks (système de feedback entre collègues)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS peer_feedbacks (
        id SERIAL PRIMARY KEY,
        from_employee_id INTEGER NOT NULL REFERENCES "User"(id),
        to_employee_id INTEGER NOT NULL REFERENCES "User"(id),
        message TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'entraide',
        points_proposed INTEGER DEFAULT 3,
        status VARCHAR(20) DEFAULT 'pending',
        validated_by INTEGER REFERENCES "User"(id),
        validated_at TIMESTAMP,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table peer_feedbacks créée');

    // 8. Créer la table employee_scores (scores agrégés par employé)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_scores (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL UNIQUE REFERENCES "User"(id),
        peer_feedback_points INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table employee_scores créée');

    // 9. Créer la table score_history (historique des points)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS score_history (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES "User"(id),
        points INTEGER NOT NULL,
        reason TEXT,
        category VARCHAR(50),
        source VARCHAR(50),
        created_by INTEGER REFERENCES "User"(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Table score_history créée');

    // 10. Index supplémentaires pour peer_feedbacks et score_history
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_peer_feedbacks_from ON peer_feedbacks(from_employee_id);
      CREATE INDEX IF NOT EXISTS idx_peer_feedbacks_to ON peer_feedbacks(to_employee_id);
      CREATE INDEX IF NOT EXISTS idx_peer_feedbacks_status ON peer_feedbacks(status);
      CREATE INDEX IF NOT EXISTS idx_score_history_employee ON score_history(employee_id);
      CREATE INDEX IF NOT EXISTS idx_score_history_source ON score_history(source);
      CREATE INDEX IF NOT EXISTS idx_employee_scores_employee ON employee_scores(employee_id);
    `);
    console.log('✅ Index peer_feedbacks/score_history créés');

    // 11. Insérer les règles par défaut
    const existingRules = await pool.query('SELECT COUNT(*) FROM scoring_rules');
    if (parseInt(existingRules.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO scoring_rules (code, label, description, points, categorie, type) VALUES
        -- POINTAGE
        ('POINTAGE_PONCTUEL', 'Pointage ponctuel', 'Arrivée à l''heure ou en avance', 2, 'pointage', 'auto'),
        ('RETARD_LEGER', 'Retard léger', 'Retard de moins de 15 minutes', -3, 'pointage', 'auto'),
        ('RETARD_MODERE', 'Retard modéré', 'Retard entre 15 et 30 minutes', -7, 'pointage', 'auto'),
        ('RETARD_GRAVE', 'Retard grave', 'Retard de plus de 30 minutes', -15, 'pointage', 'auto'),
        ('OUBLI_POINTAGE', 'Oubli de pointage', 'N''a pas pointé son arrivée ou départ', -5, 'pointage', 'auto'),
        
        -- PRÉSENCE
        ('SEMAINE_COMPLETE', 'Semaine complète', 'Présent tous les jours prévus de la semaine', 10, 'presence', 'auto'),
        ('ABSENCE_JUSTIFIEE', 'Absence justifiée', 'Absence avec justificatif valide', 0, 'presence', 'auto'),
        ('ABSENCE_NON_JUSTIFIEE', 'Absence non justifiée', 'Absence sans justificatif', -25, 'presence', 'auto'),
        ('MOIS_SANS_ABSENCE', 'Mois exemplaire', 'Aucune absence sur le mois', 20, 'presence', 'auto'),
        
        -- ANOMALIES
        ('SEMAINE_SANS_ANOMALIE', 'Semaine sans anomalie', 'Aucune anomalie détectée sur la semaine', 5, 'anomalie', 'auto'),
        ('ANOMALIE_NON_RESOLUE', 'Anomalie non résolue', 'Anomalie en attente depuis plus de 48h', -10, 'anomalie', 'auto'),
        ('ANOMALIE_RECURRENTE', 'Anomalie récurrente', '3+ anomalies du même type ce mois', -15, 'anomalie', 'auto'),
        
        -- REMPLACEMENTS & EXTRAS
        ('REMPLACEMENT_ACCEPTE', 'Remplacement accepté', 'A accepté de remplacer un collègue', 15, 'remplacement', 'auto'),
        ('REMPLACEMENT_REFUSE', 'Remplacement refusé', 'A refusé un remplacement demandé', -3, 'remplacement', 'auto'),
        ('EXTRA_EFFECTUE', 'Extra effectué', 'A effectué un shift extra', 20, 'extra', 'auto'),
        ('EXTRA_ANNULE_TARDIF', 'Annulation tardive extra', 'A annulé un extra moins de 24h avant', -20, 'extra', 'auto'),
        
        -- CONGÉS
        ('CONGE_DELAI_RESPECTE', 'Demande dans les délais', 'Congé demandé avec préavis suffisant', 3, 'conge', 'auto'),
        ('CONGE_TARDIF', 'Demande tardive', 'Congé demandé moins de 48h avant', -5, 'conge', 'auto'),
        
        -- COMPORTEMENT (MANUEL)
        ('ATTITUDE_CLIENT_POS', 'Excellente attitude client', 'Retour positif d''un client', 15, 'comportement', 'manuel'),
        ('ATTITUDE_CLIENT_NEG', 'Problème attitude client', 'Plainte ou retour négatif client', -20, 'comportement', 'manuel'),
        ('ESPRIT_EQUIPE_POS', 'Esprit d''équipe', 'Aide spontanée aux collègues', 10, 'comportement', 'manuel'),
        ('ESPRIT_EQUIPE_NEG', 'Problème équipe', 'Conflit ou mauvaise ambiance créée', -15, 'comportement', 'manuel'),
        ('INITIATIVE', 'Initiative remarquable', 'A pris une initiative positive', 20, 'comportement', 'manuel'),
        ('HYGIENE_TENUE_NEG', 'Problème hygiène/tenue', 'Non-respect des normes', -10, 'comportement', 'manuel'),
        ('FELICITATIONS', 'Félicitations', 'Reconnaissance spéciale du manager', 25, 'comportement', 'manuel'),
        ('AVERTISSEMENT_VERBAL', 'Avertissement verbal', 'Rappel à l''ordre oral', -15, 'comportement', 'manuel'),
        ('AVERTISSEMENT_ECRIT', 'Avertissement écrit', 'Avertissement formel écrit', -40, 'comportement', 'manuel'),
        ('FORMATION_SUIVIE', 'Formation suivie', 'A complété une formation', 15, 'comportement', 'manuel'),
        
        -- BONUS SPÉCIAUX
        ('BONUS_CUSTOM', 'Bonus personnalisé', 'Bonus discrétionnaire', 0, 'special', 'manuel'),
        ('MALUS_CUSTOM', 'Malus personnalisé', 'Malus discrétionnaire', 0, 'special', 'manuel')
      `);
      console.log('✅ Règles de scoring insérées (30 règles)');
    } else {
      console.log('ℹ️  Règles déjà existantes:', existingRules.rows[0].count);
    }
    
    // 12. Afficher le résumé
    const rules = await pool.query('SELECT categorie, COUNT(*) as nb FROM scoring_rules GROUP BY categorie ORDER BY categorie');
    console.log('\n📊 Résumé des règles par catégorie:');
    rules.rows.forEach(r => console.log(`   - ${r.categorie}: ${r.nb} règles`));
    
    console.log('\n🎉 Initialisation du système de scoring terminée!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

run();
