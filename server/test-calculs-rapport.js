// Test des calculs du rapport détaillé
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Copie des fonctions utilitaires de statsRoutes.js
function calculateSegmentHours(segment) {
  if (!segment.start || !segment.end) return 0;
  
  const [startH, startM] = segment.start.split(':').map(Number);
  const [endH, endM] = segment.end.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  let diffMinutes = endMinutes - startMinutes;
  
  // Gérer le passage à minuit
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
    
    // Gérer les variantes avec et sans accent
    const isArrivee = arrivee.type === 'arrivee' || arrivee.type === 'arrivée' || arrivee.type === 'ENTRÉE';
    const isDepart = depart && (depart.type === 'depart' || depart.type === 'départ' || depart.type === 'SORTIE');
    
    if (isArrivee && isDepart) {
      const diffMs = new Date(depart.horodatage) - new Date(arrivee.horodatage);
      totalMinutes += diffMs / (1000 * 60);
    }
  }
  
  return Math.round((totalMinutes / 60) * 100) / 100;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function testCalculsRapport() {
  console.log('🧪 Test des calculs du rapport détaillé\n');
  console.log('='.repeat(80));

  try {
    // Rechercher l'employé de test
    const employe = await prisma.user.findFirst({
      where: { email: 'test.horaires@restaurant.com' }
    });

    if (!employe) {
      console.log('❌ Employé de test non trouvé (test.horaires@restaurant.com)');
      return;
    }

    console.log(`✅ Employé trouvé: ${employe.prenom} ${employe.nom} (ID: ${employe.id})\n`);

    // Période de test : Novembre 2025
    const dateDebut = new Date('2025-11-01T00:00:00Z');
    const dateFin = new Date('2025-11-30T23:59:59Z');

    console.log(`📅 Période: ${dateDebut.toISOString().split('T')[0]} → ${dateFin.toISOString().split('T')[0]}\n`);

    // Récupérer les données
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: employe.id,
        date: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { date: 'asc' }
    });

    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employe.id,
        horodatage: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`📊 Données récupérées:`);
    console.log(`   - ${shifts.length} shifts`);
    console.log(`   - ${pointages.length} pointages\n`);

    // Grouper les pointages par jour
    const pointagesParJour = new Map();
    pointages.forEach(p => {
      const dateKey = p.horodatage.toISOString().split('T')[0];
      if (!pointagesParJour.has(dateKey)) {
        pointagesParJour.set(dateKey, []);
      }
      pointagesParJour.get(dateKey).push(p);
    });

    console.log('='.repeat(80));
    console.log('📋 ANALYSE DÉTAILLÉE PAR JOUR\n');

    let totalHeuresPrevues = 0;
    let totalHeuresRealisees = 0;
    let joursAvecShifts = 0;
    let joursAvecPointages = 0;

    // Analyser chaque shift
    shifts.forEach((shift, index) => {
      const dateKey = shift.date.toISOString().split('T')[0];
      const pointagesJour = pointagesParJour.get(dateKey) || [];

      console.log(`\n${index + 1}. ${dateKey} (${shift.type})`);
      console.log('-'.repeat(60));

      if (shift.type === 'présence' && shift.segments) {
        let heuresPrevues = 0;
        
        console.log('   Segments planifiés:');
        shift.segments.forEach((seg, i) => {
          if (!seg.isExtra) {
            const duree = calculateSegmentHours(seg);
            heuresPrevues += duree;
            console.log(`     ${i + 1}. ${seg.start} → ${seg.end} = ${duree}h`);
          }
        });

        console.log(`   ✅ Total prévu: ${heuresPrevues}h`);

        const heuresRealisees = calculateRealHours(pointagesJour);
        console.log(`   Pointages (${pointagesJour.length}):`)
        pointagesJour.forEach(p => {
          const heure = p.horodatage.toTimeString().slice(0, 8);
          console.log(`     - ${p.type}: ${heure}`);
        });
        console.log(`   ✅ Total réalisé: ${heuresRealisees}h`);

        const ecart = heuresRealisees - heuresPrevues;
        console.log(`   ${ecart >= 0 ? '📈' : '📉'} Écart: ${ecart >= 0 ? '+' : ''}${ecart.toFixed(2)}h`);

        totalHeuresPrevues += heuresPrevues;
        totalHeuresRealisees += heuresRealisees;
        joursAvecShifts++;
        
        if (pointagesJour.length > 0) {
          joursAvecPointages++;
        }
      } else {
        console.log(`   ℹ️  Type: ${shift.type} ${shift.motif ? `(${shift.motif})` : ''}`);
      }
    });

    // Vérifier les pointages orphelins (sans shift)
    console.log('\n' + '='.repeat(80));
    console.log('🔍 POINTAGES HORS PLANNING\n');

    let pointagesOrphelins = 0;
    let heuresOrphelines = 0;

    pointagesParJour.forEach((pointagesJour, dateKey) => {
      const shiftCeJour = shifts.find(s => s.date.toISOString().split('T')[0] === dateKey);
      if (!shiftCeJour) {
        const heures = calculateRealHours(pointagesJour);
        if (heures > 0) {
          console.log(`   ${dateKey}: ${pointagesJour.length} pointages = ${heures}h`);
          pointagesOrphelins++;
          heuresOrphelines += heures;
        }
      }
    });

    if (pointagesOrphelins === 0) {
      console.log('   ✅ Aucun pointage hors planning');
    } else {
      console.log(`   ⚠️  ${pointagesOrphelins} jour(s) avec pointages hors planning = ${heuresOrphelines.toFixed(2)}h`);
    }

    // Synthèse globale
    console.log('\n' + '='.repeat(80));
    console.log('📊 SYNTHÈSE GLOBALE\n');

    console.log(`   Jours avec shifts planifiés: ${joursAvecShifts}`);
    console.log(`   Jours avec pointages effectifs: ${joursAvecPointages}`);
    console.log(`   Jours avec pointages hors planning: ${pointagesOrphelins}`);
    console.log('');
    console.log(`   ⏰ Heures prévues totales: ${totalHeuresPrevues.toFixed(2)}h`);
    console.log(`   ✅ Heures réalisées totales: ${totalHeuresRealisees.toFixed(2)}h`);
    console.log(`   ${totalHeuresRealisees >= totalHeuresPrevues ? '📈' : '📉'} Écart: ${(totalHeuresRealisees >= totalHeuresPrevues ? '+' : '')}${(totalHeuresRealisees - totalHeuresPrevues).toFixed(2)}h`);
    
    if (joursAvecPointages > 0) {
      console.log(`   📊 Moyenne par jour travaillé: ${(totalHeuresRealisees / joursAvecPointages).toFixed(2)}h`);
    }

    // Calcul du taux de présence
    const tauxPresence = joursAvecShifts > 0 ? ((joursAvecPointages / joursAvecShifts) * 100).toFixed(1) : 0;
    console.log(`   📈 Taux de présence: ${tauxPresence}%`);

    // Analyser les absences
    const absences = shifts.filter(s => s.type === 'absence' || (s.type === 'présence' && !pointagesParJour.has(s.date.toISOString().split('T')[0])));
    console.log(`   ❌ Jours d'absence: ${absences.length}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Test terminé avec succès!\n');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test
testCalculsRapport();
