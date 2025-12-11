const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testHeuresKPIs() {
  console.log('🧪 TEST DES KPIs HEURES SUPPLÉMENTAIRES & TEMPS MOYEN\n');
  console.log('=' .repeat(70));

  try {
    // 1. Compter les employés
    const nbEmployes = await prisma.user.count({
      where: { role: 'employe' }
    });
    console.log(`\n👥 Nombre d'employés: ${nbEmployes}`);

    // 2. Compter les pointages du mois actuel
    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);

    const finMois = new Date(debutMois);
    finMois.setMonth(finMois.getMonth() + 1);

    const pointagesMois = await prisma.pointage.findMany({
      where: {
        horodatage: {
          gte: debutMois,
          lt: finMois
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`📅 Période testée: ${debutMois.toLocaleDateString('fr-FR')} au ${finMois.toLocaleDateString('fr-FR')}`);
    console.log(`📊 Pointages trouvés: ${pointagesMois.length}`);

    // 3. Calculer le temps moyen par jour
    console.log('\n' + '='.repeat(70));
    console.log('⏱️  KPI 1: TEMPS MOYEN PAR JOUR');
    console.log('='.repeat(70));

    // Grouper les pointages par employé et par jour
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

    let totalHeures = 0;
    let joursComptes = 0;
    let detailsParEmploye = [];

    for (const [userId, jours] of Object.entries(pointagesParEmploye)) {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: { nom: true, prenom: true }
      });

      let heuresEmploye = 0;
      let joursEmploye = 0;

      for (const [date, pointages] of Object.entries(jours)) {
        const entrees = pointages.filter(p => p.type === 'ENTRÉE').sort((a, b) => a.horodatage - b.horodatage);
        const sorties = pointages.filter(p => p.type === 'SORTIE').sort((a, b) => a.horodatage - b.horodatage);

        if (entrees.length > 0 && sorties.length > 0) {
          const firstEntree = entrees[0].horodatage;
          const lastSortie = sorties[sorties.length - 1].horodatage;
          const heuresJour = (lastSortie - firstEntree) / (1000 * 60 * 60);

          heuresEmploye += heuresJour;
          totalHeures += heuresJour;
          joursEmploye++;
          joursComptes++;
        }
      }

      if (joursEmploye > 0) {
        const moyenneEmploye = heuresEmploye / joursEmploye;
        detailsParEmploye.push({
          nom: `${user.prenom} ${user.nom}`,
          joursTravailes: joursEmploye,
          totalHeures: heuresEmploye.toFixed(2),
          moyenne: moyenneEmploye.toFixed(2)
        });
      }
    }

    // Trier par moyenne décroissante
    detailsParEmploye.sort((a, b) => parseFloat(b.moyenne) - parseFloat(a.moyenne));

    console.log(`\n📊 Résumé global:`);
    console.log(`   - Total heures travaillées: ${totalHeures.toFixed(2)}h`);
    console.log(`   - Jours comptabilisés: ${joursComptes}`);
    const tempsMoyen = joursComptes > 0 ? totalHeures / joursComptes : 0;
    const heures = Math.floor(tempsMoyen);
    const minutes = Math.round((tempsMoyen - heures) * 60);
    console.log(`   - Temps moyen par jour: ${heures}h${minutes.toString().padStart(2, '0')}`);

    console.log(`\n📋 Détail par employé (top 5):`);
    detailsParEmploye.slice(0, 5).forEach((emp, i) => {
      const h = Math.floor(parseFloat(emp.moyenne));
      const m = Math.round((parseFloat(emp.moyenne) - h) * 60);
      console.log(`   ${i + 1}. ${emp.nom.padEnd(25)} | ${emp.joursTravailes} jours | Total: ${emp.totalHeures}h | Moy: ${h}h${m.toString().padStart(2, '0')}`);
    });

    // 4. Calculer les heures supplémentaires (sur les 4 dernières semaines)
    console.log('\n' + '='.repeat(70));
    console.log('⚡ KPI 2: HEURES SUPPLÉMENTAIRES (4 dernières semaines)');
    console.log('='.repeat(70));

    const evolutionHeuresSup = [];
    
    for (let i = 3; i >= 0; i--) {
      const finSemaine = new Date();
      finSemaine.setDate(finSemaine.getDate() - (i * 7));
      finSemaine.setHours(23, 59, 59, 999);

      const debutSemaine = new Date(finSemaine);
      debutSemaine.setDate(debutSemaine.getDate() - 6);
      debutSemaine.setHours(0, 0, 0, 0);

      const pointagesSemaine = await prisma.pointage.findMany({
        where: {
          horodatage: {
            gte: debutSemaine,
            lte: finSemaine
          }
        }
      });

      // Calculer les heures travaillées pour cette semaine
      const pointagesParEmployeSemaine = {};
      
      pointagesSemaine.forEach(p => {
        if (!pointagesParEmployeSemaine[p.userId]) {
          pointagesParEmployeSemaine[p.userId] = {};
        }
        
        const dateStr = p.horodatage.toISOString().split('T')[0];
        if (!pointagesParEmployeSemaine[p.userId][dateStr]) {
          pointagesParEmployeSemaine[p.userId][dateStr] = [];
        }
        
        pointagesParEmployeSemaine[p.userId][dateStr].push(p);
      });

      let heuresSemaine = 0;

      for (const [userId, jours] of Object.entries(pointagesParEmployeSemaine)) {
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

      // Heures théoriques = nombre d'employés × 35h
      const heuresTheoriques = nbEmployes * 35;
      const heuresSup = Math.max(0, heuresSemaine - heuresTheoriques);

      const nomSemaine = `S${4 - i}`;
      
      evolutionHeuresSup.push({
        jour: nomSemaine,
        heures: Math.round(heuresSup),
        heuresReelles: heuresSemaine.toFixed(2),
        heuresTheoriques: heuresTheoriques
      });

      console.log(`\n   ${nomSemaine} (${debutSemaine.toLocaleDateString('fr-FR')} → ${finSemaine.toLocaleDateString('fr-FR')})`);
      console.log(`      - Heures théoriques: ${heuresTheoriques}h (${nbEmployes} employés × 35h)`);
      console.log(`      - Heures réelles: ${heuresSemaine.toFixed(2)}h`);
      console.log(`      - Heures supplémentaires: ${Math.round(heuresSup)}h`);
    }

    console.log('\n📈 Résumé heures supplémentaires:');
    const totalSup = evolutionHeuresSup.reduce((acc, s) => acc + s.heures, 0);
    const moyenneSup = totalSup / 4;
    console.log(`   - Total sur 4 semaines: ${totalSup}h`);
    console.log(`   - Moyenne par semaine: ${moyenneSup.toFixed(0)}h`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST TERMINÉ AVEC SUCCÈS');
    console.log('='.repeat(70));

    // Afficher ce que le frontend devrait recevoir
    console.log('\n📦 Données à envoyer au frontend:');
    console.log('\nKPI: dureeMoyenneJour =', tempsMoyen.toFixed(2));
    console.log('KPI: evolutionHeuresSup =', JSON.stringify(evolutionHeuresSup.map(s => ({ jour: s.jour, heures: s.heures })), null, 2));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testHeuresKPIs();
