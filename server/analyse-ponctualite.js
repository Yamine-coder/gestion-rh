// Analyse détaillée du calcul de ponctualité

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyseRetards() {
  console.log('='.repeat(70));
  console.log('📊 ANALYSE DU CALCUL DE PONCTUALITÉ');
  console.log('='.repeat(70));

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);

  // 1. Compter les pointages d'entrée
  const totalEntrees = await prisma.pointage.count({
    where: { 
      horodatage: { gte: startDate }, 
      type: 'ENTRÉE',
      user: { role: 'employee' }
    }
  });

  // 2. Récupérer les shifts avec les bons types
  const shifts = await prisma.shift.findMany({
    where: { 
      date: { gte: startDate, lte: today }, 
      type: { in: ['présence', 'NORMAL', 'matin', 'soir', 'coupure', 'travail'] },
      employe: { role: 'employee' }
    }
  });

  // 3. Récupérer les pointages d'entrée
  const pointages = await prisma.pointage.findMany({
    where: { 
      horodatage: { gte: startDate }, 
      type: 'ENTRÉE',
      user: { role: 'employee' }
    },
    include: { user: { select: { id: true, prenom: true, nom: true } } }
  });

  console.log(`\n📈 DONNÉES:`);
  console.log(`   Total pointages ENTRÉE: ${totalEntrees}`);
  console.log(`   Shifts planifiés: ${shifts.length}`);

  // 4. Calculer les retards
  let retards = 0;
  let sansShift = 0;
  let exemples = [];

  for (const p of pointages) {
    const dateP = new Date(p.horodatage);
    const dateStr = dateP.toISOString().split('T')[0];
    
    const shift = shifts.find(s => 
      s.employeId === p.userId && 
      new Date(s.date).toISOString().split('T')[0] === dateStr
    );

    if (shift && shift.segments && shift.segments[0] && shift.segments[0].start) {
      const [h, m] = shift.segments[0].start.split(':').map(Number);
      const prevues = h * 60 + m;
      const reelles = dateP.getHours() * 60 + dateP.getMinutes();
      const enRetard = reelles > prevues + 5;
      
      if (enRetard) {
        retards++;
        if (exemples.length < 5) {
          exemples.push({
            nom: `${p.user.prenom} ${p.user.nom}`,
            arrivee: `${dateP.getHours()}:${String(dateP.getMinutes()).padStart(2, '0')}`,
            prevu: shift.segments[0].start,
            retardMin: reelles - prevues
          });
        }
      }
    } else {
      sansShift++;
    }
  }

  // 5. Calculer les taux
  const tauxRetards = totalEntrees > 0 ? ((retards / totalEntrees) * 100).toFixed(1) : 0;
  const tauxPonctualite = (100 - parseFloat(tauxRetards)).toFixed(1);

  console.log(`\n📊 RÉSULTATS:`);
  console.log(`   Pointages AVEC shift correspondant: ${totalEntrees - sansShift}`);
  console.log(`   Pointages SANS shift correspondant: ${sansShift}`);
  console.log(`   Retards détectés: ${retards}`);
  console.log(`\n   🎯 Taux de retards: ${tauxRetards}%`);
  console.log(`   🎯 PONCTUALITÉ: ${tauxPonctualite}%`);

  if (exemples.length > 0) {
    console.log(`\n📝 EXEMPLES DE RETARDS:`);
    exemples.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.nom}: arrivé ${e.arrivee} vs prévu ${e.prevu} (+${e.retardMin} min)`);
    });
  }

  console.log(`\n📐 FORMULE UTILISÉE:`);
  console.log(`   tauxRetards = (retards / totalEntrées) × 100`);
  console.log(`   tauxRetards = (${retards} / ${totalEntrees}) × 100 = ${tauxRetards}%`);
  console.log(`   ponctualité = 100 - tauxRetards = 100 - ${tauxRetards} = ${tauxPonctualite}%`);

  console.log(`\n✅ CRITÈRES DE RETARD:`);
  console.log(`   - Compare heure d'arrivée (pointage ENTRÉE) vs heure début shift`);
  console.log(`   - Tolérance: +5 minutes`);
  console.log(`   - Retard si: arrivée > heurePrévue + 5min`);

  console.log('\n' + '='.repeat(70));

  await prisma.$disconnect();
}

analyseRetards().catch(e => {
  console.error('Erreur:', e);
  prisma.$disconnect();
});
