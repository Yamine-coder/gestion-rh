const prisma = require('../prisma/client');

/**
 * Seed des règles de scoring dans la table scoring_rules
 * Utilise upsert pour être idempotent (peut être relancé sans doublons)
 */
const RULES = [
  // POINTAGE (auto)
  { code: 'POINTAGE_PONCTUEL', label: 'Pointage ponctuel', description: "Arrivée à l'heure ou en avance", points: 2, categorie: 'pointage', type: 'auto' },
  { code: 'RETARD_LEGER', label: 'Retard léger', description: 'Retard de moins de 15 minutes', points: -3, categorie: 'pointage', type: 'auto' },
  { code: 'RETARD_MODERE', label: 'Retard modéré', description: 'Retard entre 15 et 30 minutes', points: -7, categorie: 'pointage', type: 'auto' },
  { code: 'RETARD_GRAVE', label: 'Retard grave', description: 'Retard de plus de 30 minutes', points: -15, categorie: 'pointage', type: 'auto' },
  { code: 'OUBLI_POINTAGE', label: 'Oubli de pointage', description: "N'a pas pointé son arrivée ou départ", points: -5, categorie: 'pointage', type: 'auto' },

  // PRÉSENCE (auto)
  { code: 'SEMAINE_COMPLETE', label: 'Semaine complète', description: 'Présent tous les jours prévus de la semaine', points: 10, categorie: 'presence', type: 'auto' },
  { code: 'ABSENCE_JUSTIFIEE', label: 'Absence justifiée', description: 'Absence avec justificatif valide', points: 0, categorie: 'presence', type: 'auto' },
  { code: 'ABSENCE_NON_JUSTIFIEE', label: 'Absence non justifiée', description: 'Absence sans justificatif', points: -25, categorie: 'presence', type: 'auto' },
  { code: 'MOIS_SANS_ABSENCE', label: 'Mois exemplaire', description: 'Aucune absence sur le mois', points: 20, categorie: 'presence', type: 'auto' },

  // ANOMALIES (auto)
  { code: 'SEMAINE_SANS_ANOMALIE', label: 'Semaine sans anomalie', description: 'Aucune anomalie détectée sur la semaine', points: 5, categorie: 'anomalie', type: 'auto' },
  { code: 'ANOMALIE_NON_RESOLUE', label: 'Anomalie non résolue', description: 'Anomalie en attente depuis plus de 48h', points: -10, categorie: 'anomalie', type: 'auto' },
  { code: 'ANOMALIE_RECURRENTE', label: 'Anomalie récurrente', description: '3+ anomalies du même type ce mois', points: -15, categorie: 'anomalie', type: 'auto' },

  // REMPLACEMENTS & EXTRAS (auto)
  { code: 'REMPLACEMENT_ACCEPTE', label: 'Remplacement accepté', description: 'A accepté de remplacer un collègue', points: 15, categorie: 'remplacement', type: 'auto' },
  { code: 'REMPLACEMENT_REFUSE', label: 'Remplacement refusé', description: 'A refusé un remplacement demandé', points: -3, categorie: 'remplacement', type: 'auto' },
  { code: 'EXTRA_EFFECTUE', label: 'Extra effectué', description: 'A effectué un shift extra', points: 20, categorie: 'extra', type: 'auto' },
  { code: 'EXTRA_ANNULE_TARDIF', label: 'Annulation tardive extra', description: 'A annulé un extra moins de 24h avant', points: -20, categorie: 'extra', type: 'auto' },

  // CONGÉS (auto)
  { code: 'CONGE_DELAI_RESPECTE', label: 'Demande dans les délais', description: 'Congé demandé avec préavis suffisant', points: 3, categorie: 'conge', type: 'auto' },
  { code: 'CONGE_TARDIF', label: 'Demande tardive', description: 'Congé demandé moins de 48h avant', points: -5, categorie: 'conge', type: 'auto' },

  // COMPORTEMENT (manuel - attribuable par le manager)
  { code: 'ATTITUDE_CLIENT_POS', label: 'Excellente attitude client', description: "Retour positif d'un client", points: 15, categorie: 'comportement', type: 'manuel' },
  { code: 'ATTITUDE_CLIENT_NEG', label: 'Problème attitude client', description: 'Plainte ou retour négatif client', points: -20, categorie: 'comportement', type: 'manuel' },
  { code: 'ESPRIT_EQUIPE_POS', label: "Esprit d'équipe", description: 'Aide spontanée aux collègues', points: 10, categorie: 'comportement', type: 'manuel' },
  { code: 'ESPRIT_EQUIPE_NEG', label: 'Problème équipe', description: 'Conflit ou mauvaise ambiance créée', points: -15, categorie: 'comportement', type: 'manuel' },
  { code: 'INITIATIVE', label: 'Initiative remarquable', description: 'A pris une initiative positive', points: 20, categorie: 'comportement', type: 'manuel' },
  { code: 'HYGIENE_TENUE_NEG', label: 'Problème hygiène/tenue', description: 'Non-respect des normes', points: -10, categorie: 'comportement', type: 'manuel' },
  { code: 'FELICITATIONS', label: 'Félicitations', description: 'Reconnaissance spéciale du manager', points: 25, categorie: 'comportement', type: 'manuel' },
  { code: 'AVERTISSEMENT_VERBAL', label: 'Avertissement verbal', description: "Rappel à l'ordre oral", points: -15, categorie: 'comportement', type: 'manuel' },
  { code: 'AVERTISSEMENT_ECRIT', label: 'Avertissement écrit', description: 'Avertissement formel écrit', points: -40, categorie: 'comportement', type: 'manuel' },
  { code: 'FORMATION_SUIVIE', label: 'Formation suivie', description: 'A complété une formation', points: 15, categorie: 'comportement', type: 'manuel' },

  // BONUS SPÉCIAUX (manuel - points custom)
  { code: 'BONUS_CUSTOM', label: 'Bonus personnalisé', description: 'Bonus discrétionnaire', points: 0, categorie: 'special', type: 'manuel' },
  { code: 'MALUS_CUSTOM', label: 'Malus personnalisé', description: 'Malus discrétionnaire', points: 0, categorie: 'special', type: 'manuel' },
];

(async () => {
  try {
    console.log('=== Seed des règles de scoring ===\n');
    
    let created = 0;
    let updated = 0;
    
    for (const rule of RULES) {
      const existing = await prisma.scoringRule.findUnique({ where: { code: rule.code } });
      if (existing) {
        await prisma.scoringRule.update({ where: { code: rule.code }, data: rule });
        updated++;
      } else {
        await prisma.scoringRule.create({ data: { ...rule, actif: true } });
        created++;
      }
    }
    
    console.log(`Créées: ${created}`);
    console.log(`Mises à jour: ${updated}`);
    
    // Résumé
    const byCategorie = {};
    const byType = {};
    for (const r of RULES) {
      byCategorie[r.categorie] = (byCategorie[r.categorie] || 0) + 1;
      byType[r.type] = (byType[r.type] || 0) + 1;
    }
    
    console.log('\nPar catégorie:');
    Object.entries(byCategorie).forEach(([k, v]) => console.log(`  ${k}: ${v} règles`));
    console.log('\nPar type:');
    Object.entries(byType).forEach(([k, v]) => console.log(`  ${k}: ${v} règles`));
    console.log(`\nTotal: ${RULES.length} règles (dont ${byType.manuel} manuelles pour le manager)`);
    
  } catch (err) {
    console.error('ERREUR:', err);
  } finally {
    await prisma.$disconnect();
  }
})();
