const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testHeuresSuppDetaille() {
  console.log('🧪 TEST DÉTAILLÉ HEURES SUPPLÉMENTAIRES\n');
  console.log('=' .repeat(70));

  try {
    // 1. Période du mois actuel
    const today = new Date();
    const debutMois = new Date(today.getFullYear(), today.getMonth(), 1);
    debutMois.setHours(0, 0, 0, 0);
    
    console.log('\n📅 PÉRIODE TESTÉE');
    console.log(`   Début: ${debutMois.toLocaleString('fr-FR')}`);
    console.log(`   Fin: ${today.toLocaleString('fr-FR')}`);

    // 2. Nombre d'employés
    const nbEmployes = await prisma.user.count({
      where: { role: 'employee' }
    });
    console.log(`\n👥 Employés actifs: ${nbEmployes}`);

    // 3. Test de calculerTotalHeures sur le mois
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST 1: CALCUL HEURES DU MOIS COMPLET');
    console.log('='.repeat(70));

    const pointagesMois = await prisma.pointage.findMany({
      where: {
        horodatage: {
          gte: debutMois,
          lte: today
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`   Pointages trouvés: ${pointagesMois.length}`);

    // Grouper par employé et par jour
    const pointagesParEmploye = {};
    pointagesMois.forEach(p => {
      if (!pointagesParEmploye[p.userId]) {
        pointagesParEmploye[p.userId] = {};
      }
      const dateStr = p.horodatage.toISOString().split('T')[0];
      if (!pointagesParEmploye[p.userId][dateStr]) {
        pointagesParEmploye[p.userId][dateStr] = [];
      }
      pointagesParEmploye[p.userId][dateStr].push(p);
    });

    let totalHeuresMois = 0;
    let joursTravailles = 0;

    for (const [userId, jours] of Object.entries(pointagesParEmploye)) {
      for (const [date, pointages] of Object.entries(jours)) {
        const entrees = pointages.filter(p => p.type === 'ENTRÉE').sort((a, b) => a.horodatage - b.horodatage);
        const sorties = pointages.filter(p => p.type === 'SORTIE').sort((a, b) => a.horodatage - b.horodatage);

        if (entrees.length > 0 && sorties.length > 0) {
          const firstEntree = entrees[0].horodatage;
          const lastSortie = sorties[sorties.length - 1].horodatage;
          const heuresJour = (lastSortie - firstEntree) / (1000 * 60 * 60);
          totalHeuresMois += heuresJour;
          joursTravailles++;
        }
      }
    }

    console.log(`   Total heures travaillées: ${totalHeuresMois.toFixed(2)}h`);
    console.log(`   Jours travaillés: ${joursTravailles}`);
    console.log(`   Moyenne par jour: ${(totalHeuresMois / joursTravailles).toFixed(2)}h`);

    const heures = Math.floor(totalHeuresMois);
    const minutes = Math.round((totalHeuresMois - heures) * 60);
    const formatHeures = `${heures}h${minutes.toString().padStart(2, '0')}`;
    console.log(`   Format "XXhYY": ${formatHeures}`);

    // 4. Test des 4 dernières semaines
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST 2: HEURES SUPPLÉMENTAIRES (4 semaines)');
    console.log('='.repeat(70));

    for (let i = 3; i >= 0; i--) {
      const semaineDebut = new Date();
      semaineDebut.setDate(semaineDebut.getDate() - (i * 7 + 7));
      semaineDebut.setHours(0, 0, 0, 0);
      
      const semaineFin = new Date(semaineDebut);
      semaineFin.setDate(semaineFin.getDate() + 7);

      console.log(`\n   🗓️  Semaine ${4 - i} (${semaineDebut.toLocaleDateString('fr-FR')} → ${semaineFin.toLocaleDateString('fr-FR')})`);

      const pointagesSemaine = await prisma.pointage.findMany({
        where: {
          horodatage: {
            gte: semaineDebut,
            lt: semaineFin
          }
        },
        orderBy: { horodatage: 'asc' }
      });

      console.log(`      Pointages: ${pointagesSemaine.length}`);

      // Calculer heures de la semaine
      const pointagesParEmpSemaine = {};
      pointagesSemaine.forEach(p => {
        if (!pointagesParEmpSemaine[p.userId]) {
          pointagesParEmpSemaine[p.userId] = {};
        }
        const dateStr = p.horodatage.toISOString().split('T')[0];
        if (!pointagesParEmpSemaine[p.userId][dateStr]) {
          pointagesParEmpSemaine[p.userId][dateStr] = [];
        }
        pointagesParEmpSemaine[p.userId][dateStr].push(p);
      });

      let heuresSemaine = 0;
      for (const [userId, jours] of Object.entries(pointagesParEmpSemaine)) {
        for (const [date, pointages] of Object.entries(jours)) {
          const entrees = pointages.filter(p => p.type === 'ENTRÉE').sort((a, b) => a.horodatage - b.horodatage);
          const sorties = pointages.filter(p => p.type === 'SORTIE').sort((a, b) => a.horodatage - b.horodatage);

          if (entrees.length > 0 && sorties.length > 0) {
            const firstEntree = entrees[0].horodatage;
            const lastSortie = sorties[sorties.length - 1].horodatage;
            const heuresJour = (lastSortie - firstEntree) / (1000 * 60 * 60);
            heuresSemaine += heuresJour;
          }
        }
      }

      const heuresTheoriques = nbEmployes * 35;
      const heuresSup = Math.max(0, heuresSemaine - heuresTheoriques);

      console.log(`      Heures réelles: ${heuresSemaine.toFixed(2)}h`);
      console.log(`      Heures théoriques: ${heuresTheoriques}h (${nbEmployes} × 35h)`);
      console.log(`      Heures supplémentaires: ${heuresSup.toFixed(2)}h → Arrondi: ${Math.round(heuresSup)}h`);
    }

    // 5. Simulation du code actuel du controller
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST 3: SIMULATION CODE CONTROLLER ACTUEL');
    console.log('='.repeat(70));

    // Simulation du calcul actuel
    const heuresMatch = formatHeures.match(/(\d+)h(\d+)/);
    if (heuresMatch) {
      const heuresNum = parseInt(heuresMatch[1]) + parseInt(heuresMatch[2]) / 60;
      console.log(`\n   Format "${formatHeures}" →`);
      console.log(`      Heures: ${heuresMatch[1]}`);
      console.log(`      Minutes: ${heuresMatch[2]}`);
      console.log(`      Converti en décimal: ${heuresNum}h`);
      console.log(`      Divisé par 20 jours: ${(heuresNum / 20).toFixed(2)}h par jour`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST TERMINÉ');
    console.log('='.repeat(70));

    console.log('\n🔍 DIAGNOSTIC:');
    console.log('   1. Total heures mois:', totalHeuresMois.toFixed(2), 'h');
    console.log('   2. Jours travaillés:', joursTravailles);
    console.log('   3. Moyenne réelle:', (totalHeuresMois / joursTravailles).toFixed(2), 'h/jour');
    console.log('   4. Formule correcte: totalHeures / joursTravailes (pas / 20)');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testHeuresSuppDetaille();
