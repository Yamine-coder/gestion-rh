const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Toutes les anomalies missing en_attente (toutes dates)
  const anomalies = await prisma.anomalie.findMany({
    where: {
      type: { startsWith: 'missing' },
      statut: 'en_attente'
    },
    include: { employe: { select: { nom: true, prenom: true } } },
    orderBy: { date: 'desc' }
  });

  console.log(`Total missing en_attente: ${anomalies.length}\n`);
  
  const fausses = [];
  
  for (const a of anomalies) {
    // Déterminer la date business pour chercher les pointages
    const dateStr = a.date.toISOString().split('T')[0];
    const dateObj = new Date(dateStr);
    const startSearch = new Date(dateObj.getTime() - 8 * 60 * 60 * 1000); // -8h
    const endSearch = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000); // +24h
    
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: a.employeId,
        horodatage: { gte: startSearch, lt: endSearch }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    const entrees = pointages.filter(p => ['arrivee', 'entree', 'clock_in'].includes(p.type));
    const sorties = pointages.filter(p => ['depart', 'sortie', 'clock_out'].includes(p.type));
    const isFausse = entrees.length > 0 && entrees.length <= sorties.length;
    
    console.log(`${a.employe.prenom} ${a.employe.nom} - ID:${a.id} type:${a.type} date:${dateStr}`);
    console.log(`  Pointages: ${entrees.length}in / ${sorties.length}out - Fausse? ${isFausse}`);
    
    if (isFausse) fausses.push(a.id);
  }
  
  if (fausses.length > 0) {
    const result = await prisma.anomalie.updateMany({
      where: { id: { in: fausses } },
      data: {
        statut: 'auto_resolue',
        commentaire: 'Auto-résolu: sortie détectée après vérification rétrospective',
        traiteAt: new Date()
      }
    });
    console.log(`\n✅ ${result.count} fausses anomalies auto-résolues (IDs: ${fausses.join(', ')})`);
  } else {
    console.log('\nAucune fausse anomalie trouvée parmi les missing en_attente');
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
