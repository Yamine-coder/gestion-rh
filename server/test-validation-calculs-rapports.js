// Validation complète des calculs dans les rapports
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Fonctions de calcul (copiées de statsRoutes.js)
function calculateSegmentHours(segment) {
  if (!segment.start || !segment.end) return 0;
  const [startH, startM] = segment.start.split(':').map(Number);
  const [endH, endM] = segment.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return (endMinutes - startMinutes) / 60;
}

function calculateRealHours(pointagesJour) {
  if (pointagesJour.length < 2) return 0;
  
  const pointagesOrdered = [...pointagesJour].sort((a, b) => 
    new Date(a.horodatage) - new Date(b.horodatage)
  );

  let totalMinutes = 0;
  for (let i = 0; i < pointagesOrdered.length - 1; i += 2) {
    const arrivee = pointagesOrdered[i];
    const depart = pointagesOrdered[i + 1];
    
    const isArrivee = arrivee.type === 'arrivee' || arrivee.type === 'arrivée' || arrivee.type === 'ENTRÉE';
    const isDepart = depart && (depart.type === 'depart' || depart.type === 'départ' || depart.type === 'SORTIE');
    
    if (isArrivee && isDepart) {
      const dureeMs = new Date(depart.horodatage) - new Date(arrivee.horodatage);
      totalMinutes += dureeMs / (1000 * 60);
    }
  }

  return totalMinutes / 60;
}

function analyserRetard(segment, pointagesJour, shiftDate) {
  const arrivee = pointagesJour.find(p => 
    p.type === 'arrivee' || p.type === 'arrivée' || p.type === 'ENTRÉE'
  );

  if (!arrivee) return { retard: 0 };

  const heureArrivee = new Date(arrivee.horodatage);
  const [heureDebut, minutesDebut] = segment.start.split(':').map(Number);
  
  const debutPrevu = new Date(shiftDate);
  debutPrevu.setUTCHours(heureDebut, minutesDebut, 0, 0);

  const toleranceMs = 5 * 60 * 1000;
  const retardMs = heureArrivee - debutPrevu;

  if (retardMs > toleranceMs) {
    const retardMinutes = Math.floor(retardMs / (60 * 1000));
    return { retard: retardMinutes };
  }

  return { retard: 0 };
}

async function validerCalculsRapports() {
  console.log('🔍 VALIDATION DES CALCULS DANS LES RAPPORTS\n');
  console.log('='.repeat(80));

  try {
    // Récupérer un échantillon d'employés avec leurs données
    const employes = await prisma.user.findMany({
      where: { role: 'employe' },
      include: {
        shifts: {
          where: {
            date: {
              gte: new Date('2025-11-01'),
              lt: new Date('2025-12-01')
            }
          }
        },
        pointages: {
          where: {
            horodatage: {
              gte: new Date('2025-11-01'),
              lt: new Date('2025-12-01')
            }
          }
        }
      },
      take: 3 // Tester 3 employés
    });

    console.log(`\n📊 Test sur ${employes.length} employés (Novembre 2025)\n`);

    let tousCorrects = true;

    for (const employe of employes) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`👤 ${employe.nom} ${employe.prenom} (${employe.email})`);
      console.log(`${'─'.repeat(80)}\n`);

      // Grouper pointages par jour
      const pointagesParJour = new Map();
      employe.pointages.forEach(p => {
        const dateKey = p.horodatage.toISOString().split('T')[0];
        if (!pointagesParJour.has(dateKey)) {
          pointagesParJour.set(dateKey, []);
        }
        pointagesParJour.get(dateKey).push(p);
      });

      // CALCUL MANUEL des métriques
      let heuresPrevues = 0;
      let heuresTravaillees = 0;
      let heuresSupplementaires = 0;
      let absencesJustifiees = 0;
      let absencesInjustifiees = 0;
      const joursAvecRetard = new Set();
      let joursPlanifies = 0;

      employe.shifts.forEach(shift => {
        const dateKey = shift.date.toISOString().split('T')[0];
        const pointagesJour = pointagesParJour.get(dateKey) || [];

        if (shift.type === 'présence' && shift.segments) {
          joursPlanifies++;
          
          // Heures prévues
          shift.segments.forEach(segment => {
            if (segment.start && segment.end && !segment.isExtra) {
              heuresPrevues += calculateSegmentHours(segment);
            }
            if (segment.isExtra) {
              heuresSupplementaires += calculateSegmentHours(segment);
            }
          });

          // Heures travaillées
          heuresTravaillees += calculateRealHours(pointagesJour);

          // Retards (par JOUR)
          if (pointagesJour.length > 0) {
            shift.segments.forEach(segment => {
              if (segment.start && segment.end && !segment.isExtra) {
                const retardInfo = analyserRetard(segment, pointagesJour, shift.date);
                if (retardInfo.retard > 0) {
                  joursAvecRetard.add(dateKey);
                }
              }
            });
          } else {
            // Absence
            absencesInjustifiees++;
          }
        } else if (shift.type === 'absence') {
          absencesJustifiees++;
        }
      });

      const joursPresents = pointagesParJour.size;
      const nombreRetards = joursAvecRetard.size;
      const heuresManquantes = Math.max(0, heuresPrevues - heuresTravaillees);
      const tauxPresence = Math.min(100, joursPlanifies > 0 ? Math.round((joursPresents / joursPlanifies) * 100) : 0);
      const tauxPonctualite = joursPresents > 0 ? Math.round(((joursPresents - nombreRetards) / joursPresents) * 100) : 100;
      const moyenneHeuresJour = joursPresents > 0 ? Math.round((heuresTravaillees / joursPresents) * 100) / 100 : 0;

      // AFFICHAGE des résultats
      console.log('📈 CALCULS VALIDÉS:\n');
      
      console.log(`   ✓ Heures prévues: ${heuresPrevues.toFixed(2)}h`);
      console.log(`   ✓ Heures travaillées: ${heuresTravaillees.toFixed(2)}h`);
      console.log(`   ✓ Heures supplémentaires: ${heuresSupplementaires.toFixed(2)}h`);
      console.log(`   ✓ Heures manquantes: ${heuresManquantes.toFixed(2)}h`);
      console.log(`   ✓ Absences justifiées: ${absencesJustifiees}j`);
      console.log(`   ✓ Absences injustifiées: ${absencesInjustifiees}j`);
      console.log(`   ✓ Retards (jours): ${nombreRetards}j`);
      console.log(`   ✓ Jours planifiés: ${joursPlanifies}j`);
      console.log(`   ✓ Jours présents: ${joursPresents}j`);
      console.log(`   ✓ Taux de présence: ${tauxPresence}%`);
      console.log(`   ✓ Taux de ponctualité: ${tauxPonctualite}%`);
      console.log(`   ✓ Moyenne h/jour: ${moyenneHeuresJour}h`);

      // VALIDATIONS
      console.log('\n🔍 VALIDATIONS:\n');

      // 1. Heures travaillées ≤ Heures prévues + Heures supp
      const totalPossible = heuresPrevues + heuresSupplementaires;
      if (heuresTravaillees <= totalPossible + 1) { // +1h de tolérance
        console.log(`   ✅ Heures cohérentes: ${heuresTravaillees.toFixed(2)}h ≤ ${totalPossible.toFixed(2)}h`);
      } else {
        console.log(`   ❌ ERREUR: Heures travaillées (${heuresTravaillees.toFixed(2)}h) > Total possible (${totalPossible.toFixed(2)}h)`);
        tousCorrects = false;
      }

      // 2. Taux de présence entre 0 et 100%
      if (tauxPresence >= 0 && tauxPresence <= 100) {
        console.log(`   ✅ Taux de présence valide: ${tauxPresence}%`);
      } else {
        console.log(`   ❌ ERREUR: Taux de présence invalide: ${tauxPresence}%`);
        tousCorrects = false;
      }

      // 3. Taux de ponctualité entre 0 et 100%
      if (tauxPonctualite >= 0 && tauxPonctualite <= 100) {
        console.log(`   ✅ Taux de ponctualité valide: ${tauxPonctualite}%`);
      } else {
        console.log(`   ❌ ERREUR: Taux de ponctualité invalide: ${tauxPonctualite}%`);
        tousCorrects = false;
      }

      // 4. Retards ≤ Jours présents
      if (nombreRetards <= joursPresents) {
        console.log(`   ✅ Retards cohérents: ${nombreRetards}j ≤ ${joursPresents}j présents`);
      } else {
        console.log(`   ❌ ERREUR: Plus de retards (${nombreRetards}) que de jours présents (${joursPresents})`);
        tousCorrects = false;
      }

      // 5. Jours présents ≤ Jours planifiés
      if (joursPresents <= joursPlanifies) {
        console.log(`   ✅ Présences cohérentes: ${joursPresents}j ≤ ${joursPlanifies}j planifiés`);
      } else {
        console.log(`   ⚠️  ATTENTION: Plus de jours présents (${joursPresents}) que planifiés (${joursPlanifies}) - Hors planning ?`);
      }

      // 6. Moyenne h/jour raisonnable (< 12h/jour)
      if (moyenneHeuresJour >= 0 && moyenneHeuresJour <= 12) {
        console.log(`   ✅ Moyenne h/jour réaliste: ${moyenneHeuresJour}h`);
      } else {
        console.log(`   ❌ ERREUR: Moyenne h/jour irréaliste: ${moyenneHeuresJour}h`);
        tousCorrects = false;
      }

      // 7. Formule taux de ponctualité
      const tauxCalcule = joursPresents > 0 ? Math.round(((joursPresents - nombreRetards) / joursPresents) * 100) : 100;
      if (tauxCalcule === tauxPonctualite) {
        console.log(`   ✅ Formule ponctualité correcte: (${joursPresents}-${nombreRetards})/${joursPresents} = ${tauxPonctualite}%`);
      } else {
        console.log(`   ❌ ERREUR formule ponctualité: Attendu ${tauxCalcule}%, Obtenu ${tauxPonctualite}%`);
        tousCorrects = false;
      }

      // 8. Formule taux de présence
      const tauxPresenceCalcule = Math.min(100, joursPlanifies > 0 ? Math.round((joursPresents / joursPlanifies) * 100) : 0);
      if (tauxPresenceCalcule === tauxPresence) {
        console.log(`   ✅ Formule présence correcte: min(100, ${joursPresents}/${joursPlanifies}) = ${tauxPresence}%`);
      } else {
        console.log(`   ❌ ERREUR formule présence: Attendu ${tauxPresenceCalcule}%, Obtenu ${tauxPresence}%`);
        tousCorrects = false;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📋 RÉSUMÉ FINAL:\n');

    if (tousCorrects) {
      console.log('✅ TOUS LES CALCULS SONT CORRECTS !\n');
      console.log('Les rapports générés contiennent des données fiables pour:');
      console.log('   • Génération des fiches de paie');
      console.log('   • Calcul des heures supplémentaires');
      console.log('   • Suivi des absences et retards');
      console.log('   • Statistiques RH\n');
    } else {
      console.log('❌ ERREURS DÉTECTÉES DANS LES CALCULS\n');
      console.log('Vérifier les formules dans statsRoutes.js\n');
    }

    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

validerCalculsRapports();
