// Vérification détaillée du taux de retards

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifierRetards() {
  console.log('='.repeat(70));
  console.log('🔍 VÉRIFICATION DÉTAILLÉE DU TAUX DE RETARDS');
  console.log('='.repeat(70));

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);

  // Récupérer TOUS les pointages d'entrée avec leurs shifts correspondants
  const pointages = await prisma.pointage.findMany({
    where: { 
      horodatage: { gte: startDate }, 
      type: 'ENTRÉE',
      user: { role: 'employee' }
    },
    include: { 
      user: { select: { id: true, prenom: true, nom: true } } 
    },
    orderBy: { horodatage: 'asc' }
  });

  const shifts = await prisma.shift.findMany({
    where: { 
      date: { gte: startDate, lte: today }, 
      type: { in: ['présence', 'NORMAL', 'matin', 'soir', 'coupure', 'travail'] },
      employe: { role: 'employee' }
    }
  });

  console.log(`\n📊 DONNÉES BRUTES:`);
  console.log(`   Pointages ENTRÉE (30 jours): ${pointages.length}`);
  console.log(`   Shifts planifiés: ${shifts.length}`);

  // Analyser chaque pointage
  let retardsDetails = [];
  let ponctuels = 0;
  let sansShift = 0;

  for (const p of pointages) {
    const dateP = new Date(p.horodatage);
    const dateStr = dateP.toISOString().split('T')[0];
    
    // Trouver le shift correspondant
    const shift = shifts.find(s => 
      s.employeId === p.userId && 
      new Date(s.date).toISOString().split('T')[0] === dateStr
    );

    if (!shift || !shift.segments || !shift.segments[0] || !shift.segments[0].start) {
      sansShift++;
      continue;
    }

    const [hPrevu, mPrevu] = shift.segments[0].start.split(':').map(Number);
    const minutesPrevues = hPrevu * 60 + mPrevu;
    const minutesReelles = dateP.getHours() * 60 + dateP.getMinutes();
    const diff = minutesReelles - minutesPrevues;

    if (diff > 5) {
      // RETARD (plus de 5 min après l'heure prévue)
      retardsDetails.push({
        nom: `${p.user.prenom} ${p.user.nom}`,
        date: dateStr,
        heureArrivee: `${dateP.getHours()}:${String(dateP.getMinutes()).padStart(2, '0')}`,
        heurePrevu: shift.segments[0].start,
        retardMin: diff
      });
    } else {
      ponctuels++;
    }
  }

  // Trier les retards par durée
  retardsDetails.sort((a, b) => b.retardMin - a.retardMin);

  console.log(`\n📈 RÉSULTATS DE L'ANALYSE:`);
  console.log(`   ✅ Ponctuels (arrivée <= heure prévue + 5min): ${ponctuels}`);
  console.log(`   ⚠️  En retard (arrivée > heure prévue + 5min): ${retardsDetails.length}`);
  console.log(`   ❓ Sans shift correspondant: ${sansShift}`);

  const totalAnalyses = ponctuels + retardsDetails.length;
  const tauxRetards = totalAnalyses > 0 ? ((retardsDetails.length / pointages.length) * 100).toFixed(1) : 0;
  const tauxPonctualite = (100 - parseFloat(tauxRetards)).toFixed(1);

  console.log(`\n🎯 CALCUL:`);
  console.log(`   Total pointages analysés: ${pointages.length}`);
  console.log(`   Retards: ${retardsDetails.length}`);
  console.log(`   Taux de retards: ${retardsDetails.length} / ${pointages.length} × 100 = ${tauxRetards}%`);
  console.log(`   PONCTUALITÉ: 100 - ${tauxRetards} = ${tauxPonctualite}%`);

  // Afficher les 10 plus gros retards
  console.log(`\n📝 TOP 10 DES PLUS GROS RETARDS:`);
  retardsDetails.slice(0, 10).forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.nom} le ${r.date}: arrivé ${r.heureArrivee} au lieu de ${r.heurePrevu} (+${r.retardMin} min)`);
  });

  // Statistiques par employé
  const retardsParEmploye = {};
  retardsDetails.forEach(r => {
    if (!retardsParEmploye[r.nom]) retardsParEmploye[r.nom] = 0;
    retardsParEmploye[r.nom]++;
  });

  console.log(`\n👥 RETARDS PAR EMPLOYÉ:`);
  Object.entries(retardsParEmploye)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([nom, count]) => {
      console.log(`   - ${nom}: ${count} retard(s)`);
    });

  // Vérifier la cohérence avec ce que l'API devrait retourner
  console.log(`\n✅ VÉRIFICATION:`);
  console.log(`   Le taux affiché (89.8%) correspond à:`);
  console.log(`   - 10.2% de retards`);
  console.log(`   - Soit environ ${Math.round(pointages.length * 0.102)} retards sur ${pointages.length} pointages`);
  console.log(`   - Notre calcul trouve: ${retardsDetails.length} retards`);
  
  const ecart = Math.abs(retardsDetails.length - Math.round(pointages.length * 0.102));
  if (ecart < 5) {
    console.log(`   ✅ COHÉRENT (écart de ${ecart} retards)`);
  } else {
    console.log(`   ⚠️  ÉCART de ${ecart} retards - à vérifier`);
  }

  console.log('\n' + '='.repeat(70));

  await prisma.$disconnect();
}

verifierRetards().catch(e => {
  console.error('Erreur:', e);
  prisma.$disconnect();
});
