// Script pour lister les pointages de la journée (fenêtre étendue +6h)
const prisma = require('../prisma/client');

(async () => {
  try {
    const start = new Date();
    start.setHours(0,0,0,0);
    const now = new Date();
    const tomorrow = new Date(start);
    tomorrow.setDate(tomorrow.getDate()+1);
    const finEtendue = new Date(tomorrow);
    finEtendue.setHours(6,0,0,0);

    console.log('Fenêtre locale :', start.toString(), '->', now.toString(), '(étendue jusqu\'à', finEtendue.toString(), ')');
    console.log('Fenêtre ISO :', start.toISOString(), '->', now.toISOString(), '(étendue', finEtendue.toISOString(), ')');

    const pts = await prisma.pointage.findMany({
      where: { horodatage: { gte: start, lte: finEtendue } },
      orderBy: { horodatage: 'asc' }
    });

    console.log('\nTotal pointages dans la fenêtre étendue:', pts.length);
    const parUser = {};
    for (const p of pts) {
      if(!parUser[p.userId]) parUser[p.userId] = [];
      parUser[p.userId].push(p);
    }
    for (const [u, arr] of Object.entries(parUser)) {
      console.log(`\nUtilisateur ${u} => ${arr.length} pointages`);
      arr.forEach(p => console.log('  ', p.type, '->', p.horodatage.toISOString()));
    }

    // Derniers pointages tout confondu
    const last10 = await prisma.pointage.findMany({ take: 10, orderBy: { horodatage: 'desc' } });
    console.log('\nDerniers 10 pointages (tous):');
    last10.forEach(p => console.log(p.userId, p.type, p.horodatage.toISOString()));
  } catch (e) {
    console.error('Erreur script list-pointages-today:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
