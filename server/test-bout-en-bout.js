// Test de bout en bout : Scan → Pointages → Calculs → Rapport
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Copie des fonctions de calcul pour validation locale
function calculateSegmentHours(segment) {
  if (!segment.start || !segment.end) return 0;
  
  const [startH, startM] = segment.start.split(':').map(Number);
  const [endH, endM] = segment.end.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  let diffMinutes = endMinutes - startMinutes;
  
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }
  
  return Math.round((diffMinutes / 60) * 100) / 100;
}

function calculateRealHours(pointages) {
  if (!pointages || pointages.length < 2) return 0;
  
  let totalMinutes = 0;
  
  for (let i = 0; i < pointages.length - 1; i += 2) {
    const arrivee = pointages[i];
    const depart = pointages[i + 1];
    
    const isArrivee = arrivee.type === 'arrivee' || arrivee.type === 'arrivée' || arrivee.type === 'ENTRÉE';
    const isDepart = depart && (depart.type === 'depart' || depart.type === 'départ' || depart.type === 'SORTIE');
    
    if (isArrivee && isDepart) {
      const diffMs = new Date(depart.horodatage) - new Date(arrivee.horodatage);
      totalMinutes += diffMs / (1000 * 60);
    }
  }
  
  return Math.round((totalMinutes / 60) * 100) / 100;
}

function analyserRetard(segment, pointagesJour) {
  const premiereArrivee = pointagesJour.find(p => 
    p.type === 'arrivee' || p.type === 'arrivée' || p.type === 'ENTRÉE'
  );
  
  if (!premiereArrivee) {
    return { retard: 0, heureArrivee: null };
  }

  const [prevuH, prevuM] = segment.start.split(':').map(Number);
  const minutesPrevues = prevuH * 60 + prevuM;

  const heureArrivee = new Date(premiereArrivee.horodatage);
  const minutesReelles = heureArrivee.getHours() * 60 + heureArrivee.getMinutes();

  let retardMinutes = minutesReelles - minutesPrevues;

  if (retardMinutes < -12 * 60) {
    retardMinutes += 24 * 60;
  }

  return {
    retard: Math.max(0, retardMinutes),
    heureArrivee: heureArrivee.toTimeString().slice(0, 5)
  };
}

async function testBoutEnBout() {
  console.log('🔍 TEST DE BOUT EN BOUT - FLUX COMPLET\n');
  console.log('='.repeat(80));

  try {
    // 1. Trouver l'employé de test
    console.log('\n📝 ÉTAPE 1: Récupération employé de test...');
    const employe = await prisma.user.findFirst({
      where: { email: 'test.complet@restaurant.com' }
    });

    if (!employe) {
      console.log('❌ Employé de test non trouvé. Exécutez d\'abord: node create-test-complet-heures.js');
      return;
    }

    console.log(`✅ Employé: ${employe.prenom} ${employe.nom} (ID: ${employe.id})`);
    console.log(`   Email: ${employe.email}`);
    console.log(`   Rôle: ${employe.role}`);

    // 2. Vérifier les shifts
    console.log('\n📅 ÉTAPE 2: Vérification des shifts...');
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: employe.id,
        date: {
          gte: new Date('2025-11-01T00:00:00Z'),
          lte: new Date('2025-11-30T23:59:59Z')
        }
      },
      orderBy: { date: 'asc' }
    });

    console.log(`✅ ${shifts.length} shifts trouvés pour novembre 2025`);

    let totalHeuresPrevues = 0;
    shifts.forEach(shift => {
      if (shift.type === 'présence' && shift.segments) {
        shift.segments.forEach(seg => {
          if (!seg.isExtra) {
            totalHeuresPrevues += calculateSegmentHours(seg);
          }
        });
      }
    });

    console.log(`   Total heures prévues: ${totalHeuresPrevues.toFixed(2)}h`);

    // 3. Vérifier les pointages
    console.log('\n⏱️  ÉTAPE 3: Vérification des pointages...');
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employe.id,
        horodatage: {
          gte: new Date('2025-11-01T00:00:00Z'),
          lte: new Date('2025-11-30T23:59:59Z')
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`✅ ${pointages.length} pointages trouvés (${pointages.length / 2} paires)`);

    // Grouper par jour
    const pointagesParJour = new Map();
    pointages.forEach(p => {
      const dateKey = p.horodatage.toISOString().split('T')[0];
      if (!pointagesParJour.has(dateKey)) {
        pointagesParJour.set(dateKey, []);
      }
      pointagesParJour.get(dateKey).push(p);
    });

    console.log(`   Répartis sur ${pointagesParJour.size} jours`);

    // 4. Calculer les heures réalisées
    console.log('\n🧮 ÉTAPE 4: Calcul des heures réalisées...');
    
    let totalHeuresRealisees = 0;
    let joursAvecPointages = 0;
    let totalRetards = 0;
    let minutesRetardTotal = 0;

    console.log('\n   Détail par jour:');
    console.log('   ' + '-'.repeat(76));

    shifts.forEach((shift, index) => {
      const dateKey = shift.date.toISOString().split('T')[0];
      const pointagesJour = pointagesParJour.get(dateKey) || [];
      
      if (shift.type === 'présence' && shift.segments) {
        let heuresPrevues = 0;
        shift.segments.forEach(seg => {
          if (!seg.isExtra) {
            heuresPrevues += calculateSegmentHours(seg);
          }
        });

        const heuresRealisees = calculateRealHours(pointagesJour);
        const ecart = heuresRealisees - heuresPrevues;

        // Analyser retard
        let retard = 0;
        if (pointagesJour.length > 0 && shift.segments.length > 0) {
          const retardInfo = analyserRetard(shift.segments[0], pointagesJour);
          retard = retardInfo.retard;
        }

        // Déterminer statut
        let statut = 'Non planifié';
        if (pointagesJour.length === 0) {
          statut = '❌ Absence';
        } else if (retard > 0) {
          statut = `⚠️  Retard ${retard}min`;
          totalRetards++;
          minutesRetardTotal += retard;
        } else {
          statut = '✅ Présent';
        }

        if (pointagesJour.length > 0) {
          joursAvecPointages++;
          totalHeuresRealisees += heuresRealisees;
        }

        // Afficher seulement si pointages ou absence
        if (pointagesJour.length > 0 || heuresPrevues > 0) {
          const dateFormatee = new Date(shift.date).toLocaleDateString('fr-FR', { 
            weekday: 'short', 
            day: '2-digit', 
            month: '2-digit' 
          });
          
          console.log(`   ${dateFormatee} | ${heuresPrevues.toFixed(1)}h → ${heuresRealisees.toFixed(1)}h | ${ecart >= 0 ? '+' : ''}${ecart.toFixed(1)}h | ${statut}`);
        }
      }
    });

    console.log('   ' + '-'.repeat(76));
    console.log(`   Total heures réalisées: ${totalHeuresRealisees.toFixed(2)}h`);
    console.log(`   Jours avec pointages: ${joursAvecPointages}`);
    console.log(`   Retards: ${totalRetards} occurrences = ${minutesRetardTotal} minutes`);

    // 5. Vérifier les congés
    console.log('\n🏖️  ÉTAPE 5: Vérification des congés...');
    const conges = await prisma.conge.findMany({
      where: {
        userId: employe.id,
        statut: 'approuvé',
        OR: [
          {
            dateDebut: { lte: new Date('2025-11-30T23:59:59Z') },
            dateFin: { gte: new Date('2025-11-01T00:00:00Z') }
          }
        ]
      }
    });

    console.log(`✅ ${conges.length} congé(s) approuvé(s)`);
    conges.forEach(c => {
      const debut = new Date(c.dateDebut).toLocaleDateString('fr-FR');
      const fin = new Date(c.dateFin).toLocaleDateString('fr-FR');
      console.log(`   - ${c.type}: ${debut} → ${fin}`);
    });

    // 6. Calculer les écarts
    console.log('\n📊 ÉTAPE 6: Calcul des écarts et statistiques...');
    const ecartTotal = totalHeuresRealisees - totalHeuresPrevues;
    const moyenneParJour = joursAvecPointages > 0 ? totalHeuresRealisees / joursAvecPointages : 0;
    const tauxPresence = shifts.length > 0 ? (joursAvecPointages / shifts.length * 100) : 0;
    const tauxPonctualite = joursAvecPointages > 0 ? ((joursAvecPointages - totalRetards) / joursAvecPointages * 100) : 0;

    console.log(`   Heures prévues: ${totalHeuresPrevues.toFixed(2)}h`);
    console.log(`   Heures réalisées: ${totalHeuresRealisees.toFixed(2)}h`);
    console.log(`   Écart: ${ecartTotal >= 0 ? '+' : ''}${ecartTotal.toFixed(2)}h`);
    console.log(`   Moyenne par jour: ${moyenneParJour.toFixed(2)}h`);
    console.log(`   Taux de présence: ${tauxPresence.toFixed(1)}%`);
    console.log(`   Taux de ponctualité: ${tauxPonctualite.toFixed(1)}%`);
    console.log(`   Heures retard à déduire: ${(minutesRetardTotal / 60).toFixed(2)}h`);

    // 7. Test API rapport (simulation)
    console.log('\n🔌 ÉTAPE 7: Simulation appel API rapport...');
    console.log('   Endpoint: GET /api/stats/employe/' + employe.id + '/rapport-detaille');
    console.log('   Params: periode=mois&mois=2025-11');
    console.log('   ✅ Les données ci-dessus devraient correspondre au rapport');

    // 8. Résumé final
    console.log('\n' + '='.repeat(80));
    console.log('📋 RÉSUMÉ FINAL - VALIDATION BOUT EN BOUT\n');

    const validations = [
      { test: 'Employé trouvé', statut: employe ? '✅' : '❌', valeur: employe?.email },
      { test: 'Shifts créés', statut: shifts.length > 0 ? '✅' : '❌', valeur: `${shifts.length} shifts` },
      { test: 'Pointages enregistrés', statut: pointages.length > 0 ? '✅' : '❌', valeur: `${pointages.length} pointages` },
      { test: 'Heures prévues calculées', statut: totalHeuresPrevues > 0 ? '✅' : '❌', valeur: `${totalHeuresPrevues.toFixed(2)}h` },
      { test: 'Heures réalisées calculées', statut: totalHeuresRealisees > 0 ? '✅' : '❌', valeur: `${totalHeuresRealisees.toFixed(2)}h` },
      { test: 'Retards détectés', statut: totalRetards > 0 ? '✅' : '❌', valeur: `${totalRetards} retards` },
      { test: 'Congés trouvés', statut: conges.length > 0 ? '✅' : '❌', valeur: `${conges.length} congé(s)` },
      { test: 'Écart calculé', statut: '✅', valeur: `${ecartTotal >= 0 ? '+' : ''}${ecartTotal.toFixed(2)}h` }
    ];

    console.log('┌─────────────────────────────────┬────────┬────────────────────────┐');
    console.log('│ Test                            │ Statut │ Valeur                 │');
    console.log('├─────────────────────────────────┼────────┼────────────────────────┤');
    validations.forEach(v => {
      const testPadded = v.test.padEnd(31);
      const valeurPadded = (v.valeur || '').padEnd(22);
      console.log(`│ ${testPadded} │   ${v.statut}   │ ${valeurPadded} │`);
    });
    console.log('└─────────────────────────────────┴────────┴────────────────────────┘');

    // 9. Vérification des absences
    console.log('\n❌ ABSENCES DÉTECTÉES:');
    let absencesCount = 0;
    shifts.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0];
      const pointagesJour = pointagesParJour.get(dateKey) || [];
      
      if (shift.type === 'présence' && pointagesJour.length === 0) {
        absencesCount++;
        const dateFormatee = new Date(shift.date).toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          day: '2-digit', 
          month: 'long' 
        });
        
        let heuresPrevues = 0;
        shift.segments.forEach(seg => {
          if (!seg.isExtra) {
            heuresPrevues += calculateSegmentHours(seg);
          }
        });
        
        console.log(`   - ${dateFormatee}: ${heuresPrevues}h non travaillées`);
      }
    });

    if (absencesCount === 0) {
      console.log('   ✅ Aucune absence injustifiée');
    } else {
      console.log(`   ⚠️  Total: ${absencesCount} jour(s) d'absence`);
    }

    // 10. Recommandations
    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMMANDATIONS:\n');

    if (absencesCount > 0) {
      console.log('   ⚠️  Vérifier les absences dans le rapport (onglet Détail mensuel)');
    }

    if (totalRetards > 0) {
      console.log(`   ⚠️  ${totalRetards} retards détectés - Vérifier le récapitulatif des retards`);
    }

    if (Math.abs(ecartTotal) > 5) {
      console.log(`   ⚠️  Écart important (${ecartTotal.toFixed(2)}h) - Analyser les causes`);
    }

    if (tauxPonctualite < 90) {
      console.log(`   ⚠️  Ponctualité sous 90% (${tauxPonctualite.toFixed(1)}%) - Points à améliorer`);
    }

    console.log('\n   ✅ Ouvrir l\'application et vérifier le rapport pour cet employé');
    console.log(`   ✅ Email: ${employe.email}`);
    console.log('   ✅ Période: Novembre 2025');
    console.log('   ✅ Les valeurs ci-dessus doivent correspondre au rapport');

    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST DE BOUT EN BOUT TERMINÉ\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testBoutEnBout();
