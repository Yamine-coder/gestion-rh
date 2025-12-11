// Test direct du calcul avec les nouvelles données
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Copie des fonctions de calcul de statsRoutes.js
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
    return { 
      retard: retardMinutes,
      heureDebut: segment.start,
      heureArrivee: heureArrivee.toISOString().substring(11, 16)
    };
  }

  return { retard: 0 };
}

async function testerCalculDirect() {
  console.log('🧪 TEST DIRECT DU CALCUL DE PONCTUALITÉ\n');
  console.log('='.repeat(80));

  try {
    const employeTest = await prisma.user.findFirst({
      where: { email: 'test.double.segment@restaurant.com' },
      include: {
        shifts: {
          where: {
            date: {
              gte: new Date('2025-11-24'),
              lte: new Date('2025-11-28')
            }
          },
          orderBy: { date: 'asc' }
        },
        pointages: {
          where: {
            horodatage: {
              gte: new Date('2025-11-24'),
              lt: new Date('2025-11-29')
            }
          },
          orderBy: { horodatage: 'asc' }
        }
      }
    });

    if (!employeTest) {
      console.log('❌ Employé test non trouvé');
      return;
    }

    console.log(`✅ Employé: ${employeTest.nom} ${employeTest.prenom}\n`);

    // Grouper pointages par jour
    const pointagesParJour = new Map();
    employeTest.pointages.forEach(p => {
      const dateKey = p.horodatage.toISOString().split('T')[0];
      if (!pointagesParJour.has(dateKey)) {
        pointagesParJour.set(dateKey, []);
      }
      pointagesParJour.get(dateKey).push(p);
    });

    // NOUVEAU CALCUL avec Set pour les jours
    const joursAvecRetard = new Set();
    let heuresPrevues = 0;
    let heuresTravaillees = 0;

    console.log('📊 ANALYSE PAR JOUR:\n');

    employeTest.shifts.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0];
      const pointagesJour = pointagesParJour.get(dateKey) || [];
      const dateStr = new Date(dateKey).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

      console.log(`   ${dateStr}:`);

      if (shift.type === 'présence' && shift.segments) {
        // Calculer heures
        shift.segments.forEach(segment => {
          if (segment.start && segment.end && !segment.isExtra) {
            heuresPrevues += calculateSegmentHours(segment);
          }
        });

        heuresTravaillees += calculateRealHours(pointagesJour);

        // Vérifier retards par segment
        if (pointagesJour.length > 0) {
          const retardsSegments = [];
          
          shift.segments.forEach(segment => {
            if (segment.start && segment.end && !segment.isExtra) {
              const retardInfo = analyserRetard(segment, pointagesJour, shift.date);
              if (retardInfo.retard > 0) {
                retardsSegments.push({
                  segment: segment.start,
                  retard: retardInfo.retard
                });
                joursAvecRetard.add(dateKey); // Marquer le JOUR
              }
            }
          });

          if (retardsSegments.length > 0) {
            console.log(`      ❌ RETARD: ${retardsSegments.map(r => `${r.segment} (+${r.retard}min)`).join(', ')}`);
            console.log(`      → 1 JOUR avec retard ajouté au compteur`);
          } else {
            console.log(`      ✅ Ponctuel`);
          }
        }
      }

      console.log();
    });

    const joursPresents = pointagesParJour.size;
    const nombreJoursAvecRetard = joursAvecRetard.size;

    console.log('='.repeat(80));
    console.log('\n📈 RÉSULTATS FINAUX:\n');
    console.log(`   Jours présents: ${joursPresents}`);
    console.log(`   Jours avec retard: ${nombreJoursAvecRetard}`);
    console.log(`   Liste des jours avec retard: [${Array.from(joursAvecRetard).join(', ')}]`);
    console.log(`\n   Formule: (joursPresents - nombreJoursAvecRetard) / joursPresents * 100`);
    console.log(`   Calcul: (${joursPresents} - ${nombreJoursAvecRetard}) / ${joursPresents} * 100`);
    
    const tauxPonctualite = joursPresents > 0 
      ? Math.round(((joursPresents - nombreJoursAvecRetard) / joursPresents) * 100)
      : 100;

    console.log(`   Taux de ponctualité: ${tauxPonctualite}%\n`);

    console.log('='.repeat(80));
    console.log('\n🎯 VALIDATION:\n');

    if (nombreJoursAvecRetard === 2) {
      console.log('   ✅ Nombre de jours avec retard: 2 (CORRECT)');
    } else {
      console.log(`   ❌ Nombre de jours avec retard: ${nombreJoursAvecRetard} (ATTENDU: 2)`);
    }

    if (tauxPonctualite === 60) {
      console.log('   ✅ Taux de ponctualité: 60% (CORRECT)');
    } else {
      console.log(`   ❌ Taux de ponctualité: ${tauxPonctualite}% (ATTENDU: 60%)`);
    }

    console.log('\n' + '='.repeat(80));

    if (nombreJoursAvecRetard === 2 && tauxPonctualite === 60) {
      console.log('\n🎉 SUCCÈS ! La correction fonctionne parfaitement\n');
      console.log('✅ Le bug est corrigé:');
      console.log('   - Lundi avec 2 retards = 1 JOUR compté');
      console.log('   - Jeudi avec 1 retard = 1 JOUR compté');
      console.log('   - Total: 2 jours (pas 3 segments)\n');
    } else {
      console.log('\n⚠️  Il semble y avoir encore un problème\n');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testerCalculDirect();
