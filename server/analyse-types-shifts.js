// Analyse des types de shifts utilisés dans le calcul d'assiduité

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyseShifts() {
  console.log('='.repeat(60));
  console.log('📊 ANALYSE DES TYPES DE SHIFTS');
  console.log('='.repeat(60));

  // 1. Tous les types de shifts dans la base
  const tousTypes = await prisma.shift.groupBy({
    by: ['type'],
    _count: { id: true }
  });

  console.log('\n📋 TOUS LES TYPES DE SHIFTS DANS LA BASE:');
  tousTypes.forEach(t => {
    console.log(`   - ${t.type}: ${t._count.id} shifts`);
  });

  // 2. Types inclus dans le calcul d'assiduité
  const typesInclus = ['présence', 'NORMAL', 'matin', 'soir', 'coupure', 'travail'];
  
  console.log('\n✅ TYPES INCLUS DANS LE CALCUL D\'ASSIDUITÉ:');
  typesInclus.forEach(t => console.log(`   - ${t}`));

  // 3. Types EXCLUS du calcul
  const typesExclus = tousTypes
    .map(t => t.type)
    .filter(t => !typesInclus.includes(t));

  console.log('\n❌ TYPES EXCLUS DU CALCUL:');
  if (typesExclus.length === 0) {
    console.log('   (aucun)');
  } else {
    typesExclus.forEach(t => {
      const count = tousTypes.find(x => x.type === t)._count.id;
      console.log(`   - ${t}: ${count} shifts NON comptés`);
    });
  }

  // 4. Comparaison
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);

  const shiftsInclus = await prisma.shift.count({
    where: {
      date: { gte: startDate, lte: today },
      type: { in: typesInclus }
    }
  });

  const shiftsExclus = await prisma.shift.count({
    where: {
      date: { gte: startDate, lte: today },
      type: { notIn: typesInclus }
    }
  });

  console.log('\n📈 SUR LES 30 DERNIERS JOURS:');
  console.log(`   Shifts INCLUS dans le calcul: ${shiftsInclus}`);
  console.log(`   Shifts EXCLUS du calcul: ${shiftsExclus}`);

  // 5. Détail des shifts exclus
  if (shiftsExclus > 0) {
    const detailExclus = await prisma.shift.findMany({
      where: {
        date: { gte: startDate, lte: today },
        type: { notIn: typesInclus }
      },
      include: { employe: { select: { prenom: true, nom: true } } },
      take: 10
    });

    console.log('\n📝 EXEMPLES DE SHIFTS EXCLUS:');
    detailExclus.forEach(s => {
      console.log(`   - ${s.employe?.prenom} ${s.employe?.nom}: type="${s.type}" le ${new Date(s.date).toLocaleDateString('fr-FR')}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 CONCLUSION:');
  console.log('   Le calcul d\'assiduité prend en compte uniquement les shifts');
  console.log('   de type: ' + typesInclus.join(', '));
  console.log('   Les shifts de type "repos" ou "absence" sont exclus car');
  console.log('   ce ne sont pas des heures de travail planifiées.');
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

analyseShifts();
