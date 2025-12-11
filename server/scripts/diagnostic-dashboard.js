const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnosticDashboard() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 DIAGNOSTIC COMPLET DU DASHBOARD');
  console.log('═══════════════════════════════════════════════════\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  console.log(`📅 Date analysée: ${today.toLocaleDateString('fr-FR')}\n`);

  // 1. EMPLOYÉS
  const employes = await prisma.user.findMany({
    where: { role: 'employee' },
    select: { id: true, email: true, nom: true, prenom: true }
  });
  
  console.log(`👥 EMPLOYÉS: ${employes.length} total\n`);

  // 2. POINTAGES AUJOURD'HUI
  const pointagesToday = await prisma.pointage.findMany({
    where: {
      horodatage: {
        gte: today,
        lt: tomorrow
      }
    },
    include: {
      user: {
        select: { id: true, email: true, nom: true, prenom: true }
      }
    },
    orderBy: [
      { userId: 'asc' },
      { horodatage: 'asc' }
    ]
  });

  // Grouper par utilisateur
  const pointagesParUser = {};
  pointagesToday.forEach(p => {
    if (!pointagesParUser[p.userId]) {
      pointagesParUser[p.userId] = {
        user: p.user,
        pointages: []
      };
    }
    pointagesParUser[p.userId].pointages.push(p);
  });

  const presentSet = new Set(pointagesToday.map(p => p.userId));
  console.log(`✅ EMPLOYÉS QUI ONT POINTÉ: ${presentSet.size}/${employes.length}\n`);

  Object.values(pointagesParUser).forEach(({ user, pointages }) => {
    const entrees = pointages.filter(p => p.type === 'ENTRÉE');
    const sorties = pointages.filter(p => p.type === 'SORTIE');
    const premiereEntree = entrees.length > 0 
      ? new Date(entrees[0].horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '❌';
    const derniereSortie = sorties.length > 0
      ? new Date(sorties[sorties.length - 1].horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '❌';
    
    console.log(`   ${user.prenom} ${user.nom}:`);
    console.log(`      - Entrées: ${entrees.length} | Sorties: ${sorties.length}`);
    console.log(`      - Première entrée: ${premiereEntree} | Dernière sortie: ${derniereSortie}`);
  });

  // 3. CONGÉS ACTIFS AUJOURD'HUI
  const congesActifs = await prisma.conge.findMany({
    where: {
      statut: 'APPROUVÉ',
      dateDebut: { lte: tomorrow },
      dateFin: { gte: today }
    },
    include: {
      user: {
        select: { id: true, prenom: true, nom: true }
      }
    }
  });

  console.log(`\n🏖️ CONGÉS ACTIFS AUJOURD'HUI: ${congesActifs.length}\n`);
  congesActifs.forEach(c => {
    console.log(`   ${c.user.prenom} ${c.user.nom}: ${c.dateDebut.toLocaleDateString('fr-FR')} - ${c.dateFin.toLocaleDateString('fr-FR')}`);
  });

  const enCongeSet = new Set(congesActifs.map(c => c.userId));

  // 4. PLANNINGS AUJOURD'HUI
  const plannings = await prisma.planning.findMany({
    where: {
      date: {
        gte: today,
        lt: tomorrow
      }
    },
    include: {
      user: {
        select: { id: true, prenom: true, nom: true }
      }
    }
  });

  console.log(`\n📋 PLANNINGS AUJOURD'HUI: ${plannings.length}\n`);
  
  const planningsParUser = {};
  plannings.forEach(p => {
    planningsParUser[p.userId] = p;
  });

  // 5. ANALYSE EMPLOYÉ PAR EMPLOYÉ
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📊 ANALYSE DÉTAILLÉE PAR EMPLOYÉ');
  console.log('═══════════════════════════════════════════════════\n');

  const stats = {
    total: employes.length,
    ontPointe: 0,
    enConge: 0,
    avecPlanning: 0,
    sansPlanning: 0,
    absentsNonPlanifies: 0,
    retards: 0,
    horsPlage: 0
  };

  employes.forEach(emp => {
    const aPointe = presentSet.has(emp.id);
    const estEnConge = enCongeSet.has(emp.id);
    const planning = planningsParUser[emp.id];
    const pointages = pointagesParUser[emp.id]?.pointages || [];

    console.log(`\n👤 ${emp.prenom} ${emp.nom} (ID: ${emp.id})`);
    console.log(`   Email: ${emp.email}`);
    
    // Statut
    if (estEnConge) {
      console.log(`   📍 Statut: 🏖️ EN CONGÉ`);
      stats.enConge++;
    } else if (aPointe) {
      console.log(`   📍 Statut: ✅ A POINTÉ`);
      stats.ontPointe++;
    } else {
      console.log(`   📍 Statut: ❌ NON POINTÉ`);
      if (!estEnConge) {
        stats.absentsNonPlanifies++;
      }
    }

    // Planning
    if (planning) {
      const debut = new Date(planning.heureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const fin = new Date(planning.heureFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      console.log(`   📅 Planning: ${debut} - ${fin}`);
      stats.avecPlanning++;

      // Vérifier les pointages par rapport au planning
      if (pointages.length > 0) {
        const premiereEntree = pointages.find(p => p.type === 'ENTRÉE');
        if (premiereEntree) {
          const heureEntree = new Date(premiereEntree.horodatage);
          const heurePlanningDebut = new Date(planning.heureDebut);
          const diffMinutes = Math.round((heureEntree - heurePlanningDebut) / 60000);
          
          if (diffMinutes > 5) {
            console.log(`   ⚠️ RETARD: ${diffMinutes} minutes`);
            stats.retards++;
          } else if (diffMinutes < -5) {
            console.log(`   ⚡ EN AVANCE: ${Math.abs(diffMinutes)} minutes`);
          } else {
            console.log(`   ✅ À L'HEURE`);
          }

          // Vérifier hors plage (arrivée très tôt ou très tard)
          const heureEntreeHM = heureEntree.getHours() * 60 + heureEntree.getMinutes();
          const heurePlanningDebutHM = heurePlanningDebut.getHours() * 60 + heurePlanningDebut.getMinutes();
          
          if (Math.abs(heureEntreeHM - heurePlanningDebutHM) > 180) { // Plus de 3h de décalage
            console.log(`   🔴 HORS PLAGE: Arrivée à ${heureEntree.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} pour planning ${debut}`);
            stats.horsPlage++;
          }
        }
      }
    } else {
      console.log(`   📅 Planning: ❌ AUCUN`);
      stats.sansPlanning++;
    }

    // Pointages
    if (pointages.length > 0) {
      console.log(`   🔍 Pointages: ${pointages.length} total`);
      pointages.forEach(p => {
        const heure = new Date(p.horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const typeEmoji = p.type === 'ENTRÉE' ? '🟢' : '🔴';
        console.log(`      ${typeEmoji} ${p.type} à ${heure}`);
      });
    } else if (!estEnConge) {
      console.log(`   🔍 Pointages: ❌ AUCUN`);
    }
  });

  // 6. RÉSUMÉ GLOBAL
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📈 RÉSUMÉ GLOBAL');
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`   Total employés: ${stats.total}`);
  console.log(`   Ont pointé: ${stats.ontPointe} (${Math.round(stats.ontPointe / stats.total * 100)}%)`);
  console.log(`   En congé: ${stats.enConge}`);
  console.log(`   Absents non planifiés: ${stats.absentsNonPlanifies}`);
  console.log(`   Avec planning: ${stats.avecPlanning}`);
  console.log(`   Sans planning: ${stats.sansPlanning}`);
  console.log(`   Retards détectés: ${stats.retards}`);
  console.log(`   Hors plage horaire: ${stats.horsPlage}`);

  // 7. CALCUL ATTENDU POUR LE DASHBOARD
  const nonPointes = Math.max(0, stats.total - stats.ontPointe - stats.enConge);
  const tauxPresence = stats.total > 0 ? Math.round(stats.ontPointe / stats.total * 100) : 0;

  console.log('\n═══════════════════════════════════════════════════');
  console.log('🎯 VALEURS ATTENDUES POUR LE DASHBOARD');
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`   📊 PRÉSENCE: ${tauxPresence}% (${stats.ontPointe}/${stats.total})`);
  console.log(`   ❌ NON POINTÉS: ${nonPointes}`);
  console.log(`   🚨 ABS. NON PLANIF.: ${stats.absentsNonPlanifies}`);
  console.log(`   ✅ EFFECTIF: ${stats.total}`);
  console.log(`   🏖️ CONGÉS: ${stats.enConge}`);
  console.log(`   📋 DEMANDES: (à valider séparément)`);

  console.log('\n═══════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}

diagnosticDashboard().catch(console.error);
