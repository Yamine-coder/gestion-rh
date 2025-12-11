const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyserIndicateurs() {
  console.log('🔍 ANALYSE DES INDICATEURS POTENTIELS\n');
  console.log('=' .repeat(70));

  try {
    const today = new Date();
    const debutMois = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const nbEmployes = await prisma.user.count({ where: { role: 'employee' } });
    console.log(`👥 Employés actifs: ${nbEmployes}\n`);

    // 1. PRODUCTIVITÉ : Heures moyennes par employé
    console.log('📊 OPTION 1: PRODUCTIVITÉ (Heures par employé)');
    console.log('='.repeat(70));
    
    const pointagesMois = await prisma.pointage.findMany({
      where: { horodatage: { gte: debutMois, lte: today } }
    });

    const heuresParEmploye = {};
    pointagesMois.forEach(p => {
      if (!heuresParEmploye[p.userId]) {
        heuresParEmploye[p.userId] = { jours: {}, totalHeures: 0 };
      }
      const dateStr = p.horodatage.toISOString().split('T')[0];
      if (!heuresParEmploye[p.userId].jours[dateStr]) {
        heuresParEmploye[p.userId].jours[dateStr] = [];
      }
      heuresParEmploye[p.userId].jours[dateStr].push(p);
    });

    for (const [userId, data] of Object.entries(heuresParEmploye)) {
      for (const [date, pointages] of Object.entries(data.jours)) {
        const entrees = pointages.filter(p => p.type === 'ENTRÉE').sort((a, b) => a.horodatage - b.horodatage);
        const sorties = pointages.filter(p => p.type === 'SORTIE').sort((a, b) => a.horodatage - b.horodatage);
        if (entrees.length > 0 && sorties.length > 0) {
          data.totalHeures += (sorties[sorties.length - 1].horodatage - entrees[0].horodatage) / (1000 * 60 * 60);
        }
      }
    }

    const productivites = Object.entries(heuresParEmploye)
      .map(([userId, data]) => ({
        userId: parseInt(userId),
        heures: data.totalHeures,
        jours: Object.keys(data.jours).length,
        moyenne: data.totalHeures / Object.keys(data.jours).length
      }))
      .sort((a, b) => b.heures - a.heures);

    console.log('\nTop 5 employés les plus productifs (heures totales):');
    for (let i = 0; i < Math.min(5, productivites.length); i++) {
      const emp = productivites[i];
      const user = await prisma.user.findUnique({ where: { id: emp.userId }, select: { prenom: true, nom: true } });
      console.log(`   ${i + 1}. ${user.prenom} ${user.nom}: ${emp.heures.toFixed(1)}h (${emp.jours} jours, moy: ${emp.moyenne.toFixed(1)}h/j)`);
    }

    // 2. TAUX DE PRÉSENCE : Présence vs absences
    console.log('\n\n📊 OPTION 2: TAUX DE PRÉSENCE (Présent vs Absent)');
    console.log('='.repeat(70));

    const joursOuvresMois = Math.floor((today - debutMois) / (1000 * 60 * 60 * 24));
    const presences = productivites.map(p => ({
      userId: p.userId,
      joursPresents: p.jours,
      tauxPresence: (p.jours / joursOuvresMois) * 100
    })).sort((a, b) => b.tauxPresence - a.tauxPresence);

    console.log(`\nJours ouvrés depuis début du mois: ${joursOuvresMois}`);
    console.log('\nTop 5 meilleurs taux de présence:');
    for (let i = 0; i < Math.min(5, presences.length); i++) {
      const emp = presences[i];
      const user = await prisma.user.findUnique({ where: { id: emp.userId }, select: { prenom: true, nom: true } });
      console.log(`   ${i + 1}. ${user.prenom} ${user.nom}: ${emp.tauxPresence.toFixed(1)}% (${emp.joursPresents}/${joursOuvresMois} jours)`);
    }

    // 3. PONCTUALITÉ : % d'arrivées à l'heure
    console.log('\n\n📊 OPTION 3: PONCTUALITÉ (Arrivées avant 9h)');
    console.log('='.repeat(70));

    const pontualites = [];
    for (const emp of productivites) {
      const entreesEmp = await prisma.pointage.findMany({
        where: {
          userId: emp.userId,
          type: 'ENTRÉE',
          horodatage: { gte: debutMois, lte: today }
        }
      });

      const entreesAHeure = entreesEmp.filter(p => {
        const heure = new Date(p.horodatage).getHours();
        return heure < 9;
      }).length;

      const tauxPonctualite = entreesEmp.length > 0 ? (entreesAHeure / entreesEmp.length) * 100 : 0;
      pontualites.push({
        userId: emp.userId,
        totalEntrees: entreesEmp.length,
        entreesAHeure,
        tauxPonctualite
      });
    }

    pontualites.sort((a, b) => b.tauxPonctualite - a.tauxPonctualite);

    console.log('\nTop 5 meilleurs ponctualités:');
    for (let i = 0; i < Math.min(5, pontualites.length); i++) {
      const emp = pontualites[i];
      const user = await prisma.user.findUnique({ where: { id: emp.userId }, select: { prenom: true, nom: true } });
      console.log(`   ${i + 1}. ${user.prenom} ${user.nom}: ${emp.tauxPonctualite.toFixed(1)}% (${emp.entreesAHeure}/${emp.totalEntrees} à l'heure)`);
    }

    // 4. EFFICACITÉ : Heures travaillées vs heures théoriques
    console.log('\n\n📊 OPTION 4: EFFICACITÉ (Heures réelles vs théoriques)');
    console.log('='.repeat(70));

    const heuresTheoriques = 35 * 4; // 35h/semaine × 4 semaines
    const efficacites = productivites.map(p => ({
      userId: p.userId,
      heuresReelles: p.heures,
      heuresTheoriques,
      tauxEfficacite: (p.heures / heuresTheoriques) * 100
    })).sort((a, b) => b.tauxEfficacite - a.tauxEfficacite);

    console.log(`\nHeures théoriques par employé: ${heuresTheoriques}h/mois`);
    console.log('\nTop 5 meilleurs taux d\'efficacité:');
    for (let i = 0; i < Math.min(5, efficacites.length); i++) {
      const emp = efficacites[i];
      const user = await prisma.user.findUnique({ where: { id: emp.userId }, select: { prenom: true, nom: true } });
      console.log(`   ${i + 1}. ${user.prenom} ${user.nom}: ${emp.tauxEfficacite.toFixed(1)}% (${emp.heuresReelles.toFixed(1)}h/${heuresTheoriques}h)`);
    }

    // 5. RÉGULARITÉ : Variance des heures quotidiennes
    console.log('\n\n📊 OPTION 5: RÉGULARITÉ (Constance des horaires)');
    console.log('='.repeat(70));

    const regularites = [];
    for (const emp of productivites.slice(0, 10)) {
      const heuresQuotidiennes = [];
      for (const [date, pointages] of Object.entries(heuresParEmploye[emp.userId].jours)) {
        const entrees = pointages.filter(p => p.type === 'ENTRÉE').sort((a, b) => a.horodatage - b.horodatage);
        const sorties = pointages.filter(p => p.type === 'SORTIE').sort((a, b) => a.horodatage - b.horodatage);
        if (entrees.length > 0 && sorties.length > 0) {
          const heures = (sorties[sorties.length - 1].horodatage - entrees[0].horodatage) / (1000 * 60 * 60);
          heuresQuotidiennes.push(heures);
        }
      }

      if (heuresQuotidiennes.length > 1) {
        const moyenne = heuresQuotidiennes.reduce((a, b) => a + b, 0) / heuresQuotidiennes.length;
        const variance = heuresQuotidiennes.reduce((acc, h) => acc + Math.pow(h - moyenne, 2), 0) / heuresQuotidiennes.length;
        const ecartType = Math.sqrt(variance);
        
        regularites.push({
          userId: emp.userId,
          moyenne: moyenne.toFixed(1),
          ecartType: ecartType.toFixed(2),
          score: 100 - (ecartType * 10) // Score basé sur l'écart-type (plus faible = plus régulier)
        });
      }
    }

    regularites.sort((a, b) => b.score - a.score);

    console.log('\nTop 5 horaires les plus réguliers:');
    for (let i = 0; i < Math.min(5, regularites.length); i++) {
      const emp = regularites[i];
      const user = await prisma.user.findUnique({ where: { id: emp.userId }, select: { prenom: true, nom: true } });
      console.log(`   ${i + 1}. ${user.prenom} ${user.nom}: ${emp.moyenne}h/j (±${emp.ecartType}h) - Score: ${emp.score.toFixed(1)}`);
    }

    // RECOMMANDATION
    console.log('\n\n' + '='.repeat(70));
    console.log('💡 RECOMMANDATIONS');
    console.log('='.repeat(70));
    console.log('\n1. ⭐ TAUX DE PRÉSENCE (RECOMMANDÉ)');
    console.log('   - Simple à comprendre');
    console.log('   - Montre l\'assiduité des employés');
    console.log('   - Évolution sur 4 semaines visible');
    console.log('   - Complète bien le taux d\'absentéisme');
    
    console.log('\n2. 🎯 PONCTUALITÉ');
    console.log('   - Déjà affiché dans le taux de retards');
    console.log('   - Peut être une métrique secondaire');
    
    console.log('\n3. 📈 PRODUCTIVITÉ (Heures par employé)');
    console.log('   - Intéressant pour voir qui travaille le plus');
    console.log('   - Peut encourager le présentéisme');
    
    console.log('\n4. ✅ EFFICACITÉ (Heures vs théoriques)');
    console.log('   - Bon indicateur de performance');
    console.log('   - Compare à un objectif clair (35h/semaine)');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyserIndicateurs();
