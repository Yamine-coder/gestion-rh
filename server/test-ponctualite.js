// Test du calcul du taux de ponctualité
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testerPonctualite() {
  console.log('🔍 TEST DU CALCUL DU TAUX DE PONCTUALITÉ\n');
  console.log('='.repeat(80));

  try {
    const employeTest = await prisma.user.findFirst({
      where: { email: 'test.complet@restaurant.com' },
      include: {
        pointages: {
          where: {
            horodatage: {
              gte: new Date('2025-11-01'),
              lt: new Date('2025-12-01')
            }
          },
          orderBy: { horodatage: 'asc' }
        },
        shifts: {
          where: {
            date: {
              gte: new Date('2025-11-01'),
              lt: new Date('2025-12-01')
            }
          },
          orderBy: { date: 'asc' }
        }
      }
    });

    if (!employeTest) {
      console.log('❌ Employé test non trouvé');
      return;
    }

    console.log(`\n📊 Employé: ${employeTest.nom} ${employeTest.prenom}`);
    console.log(`   Email: ${employeTest.email}`);
    console.log(`   Période: Novembre 2025\n`);

    // Grouper les pointages par jour
    const pointagesParJour = new Map();
    employeTest.pointages.forEach(p => {
      const dateKey = p.horodatage.toISOString().split('T')[0];
      if (!pointagesParJour.has(dateKey)) {
        pointagesParJour.set(dateKey, []);
      }
      pointagesParJour.get(dateKey).push(p);
    });

    // Fonction pour calculer les retards
    function analyserRetard(segment, pointagesJour, shiftDate) {
      const arrivee = pointagesJour.find(p => 
        p.type === 'arrivee' || p.type === 'arrivée' || p.type === 'ENTRÉE'
      );

      if (!arrivee) return { retard: 0 };

      const heureArrivee = new Date(arrivee.horodatage);
      const [heureDebut, minutesDebut] = segment.start.split(':').map(Number);
      
      const debutPrevu = new Date(shiftDate);
      debutPrevu.setUTCHours(heureDebut, minutesDebut, 0, 0);

      // Tolérance de 5 minutes
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

    // Analyser les shifts avec retards
    let joursPresents = 0;
    let nombreRetards = 0;
    const detailsRetards = [];

    employeTest.shifts.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0];
      const pointagesJour = pointagesParJour.get(dateKey) || [];

      if (shift.type === 'présence' && shift.segments) {
        const hasPointages = pointagesJour.some(p => 
          p.type === 'arrivee' || p.type === 'arrivée' || p.type === 'ENTRÉE'
        );

        if (hasPointages) {
          joursPresents++;

          // Vérifier les retards pour chaque segment
          shift.segments.forEach(segment => {
            if (segment.start && segment.end && !segment.isExtra) {
              const retardInfo = analyserRetard(segment, pointagesJour, shift.date);
              
              if (retardInfo.retard > 0) {
                nombreRetards++;
                detailsRetards.push({
                  date: dateKey,
                  heureDebut: retardInfo.heureDebut,
                  heureArrivee: retardInfo.heureArrivee,
                  retard: retardInfo.retard
                });
              }
            }
          });
        }
      }
    });

    console.log('📈 RÉSULTATS:\n');
    console.log(`   Jours présents: ${joursPresents}`);
    console.log(`   Nombre de retards: ${nombreRetards}`);
    
    if (detailsRetards.length > 0) {
      console.log('\n   Détails des retards:');
      detailsRetards.forEach((r, i) => {
        console.log(`      ${i + 1}. ${r.date}: Prévu ${r.heureDebut}, Arrivé ${r.heureArrivee} → ${r.retard}min de retard`);
      });
    }

    // CALCUL DU TAUX DE PONCTUALITÉ
    const tauxPonctualiteActuel = joursPresents > 0 
      ? Math.max(0, Math.round(((joursPresents - nombreRetards) / joursPresents) * 100)) 
      : 100;

    console.log('\n🎯 CALCUL DU TAUX DE PONCTUALITÉ:\n');
    console.log(`   Formule: ((joursPresents - nombreRetards) / joursPresents) * 100`);
    console.log(`   Calcul: (${joursPresents} - ${nombreRetards}) / ${joursPresents} * 100`);
    console.log(`   Résultat: ${tauxPonctualiteActuel}%\n`);

    // ANALYSE DE LA LOGIQUE
    console.log('='.repeat(80));
    console.log('\n🔍 ANALYSE DE LA LOGIQUE:\n');

    console.log('✅ POINTS CORRECTS:');
    console.log('   1. On compte 1 retard par SEGMENT en retard (pas par jour)');
    console.log('   2. Tolérance de 5 minutes appliquée');
    console.log('   3. Seuls les jours avec pointages sont comptés');
    console.log('   4. Math.max(0, ...) empêche les valeurs négatives');

    console.log('\n⚠️  PROBLÈME POTENTIEL IDENTIFIÉ:');
    console.log('   ❌ Si un employé a 2 segments par jour (ex: 08:00-12:00 et 14:00-18:00)');
    console.log('   ❌ Et arrive en retard aux 2 segments le même jour');
    console.log('   ❌ On compte 2 retards alors qu\'il n\'y a qu\'1 jour présent');
    console.log('   ❌ Résultat possible: (1 - 2) / 1 = -100% → Math.max(0, ...) = 0%');
    console.log('   ❌ Ce qui donne un taux de ponctualité de 0% pour 1 jour avec retards!\n');

    console.log('📝 EXEMPLE CONCRET:');
    console.log('   Semaine de travail: 5 jours');
    console.log('   - Lundi: 2 segments, en retard aux 2 → 2 retards comptés');
    console.log('   - Mardi: À l\'heure');
    console.log('   - Mercredi: À l\'heure');
    console.log('   - Jeudi: 2 segments, en retard à 1 → 1 retard compté');
    console.log('   - Vendredi: À l\'heure');
    console.log('   Total: 5 jours présents, 3 retards comptés');
    console.log('   Calcul actuel: (5 - 3) / 5 = 40% de ponctualité');
    console.log('   ❌ PROBLÈME: Seuls 2 jours avaient des retards, pas 3!\n');

    console.log('✅ LOGIQUE CORRECTE (par jour):');
    console.log('   - Lundi: En retard → 1 jour avec retard');
    console.log('   - Mardi: À l\'heure');
    console.log('   - Mercredi: À l\'heure');
    console.log('   - Jeudi: En retard → 1 jour avec retard');
    console.log('   - Vendredi: À l\'heure');
    console.log('   Total: 5 jours présents, 2 JOURS avec retard');
    console.log('   Calcul correct: (5 - 2) / 5 = 60% de ponctualité\n');

    console.log('='.repeat(80));
    console.log('\n💡 RECOMMANDATION:\n');
    console.log('Le taux de ponctualité devrait être calculé PAR JOUR, pas PAR SEGMENT.');
    console.log('Un employé en retard 2 fois le même jour = 1 JOUR NON PONCTUEL\n');

    console.log('🔧 CORRECTION PROPOSÉE:');
    console.log(`
    // Au lieu de compter chaque retard de segment:
    const joursAvecRetard = new Set();
    
    shift.segments.forEach(segment => {
      const retardInfo = analyserRetard(segment, pointagesJour, shift.date);
      if (retardInfo.retard > 0) {
        joursAvecRetard.add(dateKey); // Marquer le JOUR comme ayant un retard
      }
    });
    
    // Puis à la fin:
    const nombreJoursAvecRetard = joursAvecRetard.size;
    const tauxPonctualite = joursPresents > 0 
      ? Math.round(((joursPresents - nombreJoursAvecRetard) / joursPresents) * 100)
      : 100;
    `);

    console.log('\n='.repeat(80));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testerPonctualite();
