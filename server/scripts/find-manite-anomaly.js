const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Chercher TOUTES les anomalies missing pour aujourd'hui et hier (tout statut)
  const anomalies = await prisma.anomalie.findMany({
    where: {
      type: { startsWith: 'missing' },
      date: { gte: new Date('2026-02-22T00:00:00Z'), lt: new Date('2026-02-24T00:00:00Z') }
    },
    include: { employe: { select: { nom: true, prenom: true } } },
    orderBy: { date: 'desc' }
  });

  console.log(`Total missing anomalies (22-23 fev):`, anomalies.length);
  for (const a of anomalies) {
    console.log(`  ${a.employe.prenom} ${a.employe.nom} - ID:${a.id} type:${a.type} statut:${a.statut} date:${a.date.toISOString()}`);
  }

  // Chercher aussi celle de Manite spécifiquement
  const manite = await prisma.anomalie.findMany({
    where: {
      employe: { prenom: { contains: 'Manite' } },
      date: { gte: new Date('2026-02-22T00:00:00Z'), lt: new Date('2026-02-24T00:00:00Z') }
    },
    orderBy: { date: 'desc' }
  });

  console.log(`\nAnomalies Manite (22-23 fev):`, manite.length);
  for (const a of manite) {
    console.log(`  ID:${a.id} type:${a.type} statut:${a.statut} desc:${a.description}`);
  }

  // Compter toutes les anomalies en_attente de type missing
  const total = await prisma.anomalie.count({
    where: { type: { startsWith: 'missing' }, statut: 'en_attente' }
  });
  console.log(`\nTotal missing en_attente (toutes dates):`, total);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
