const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const anomalies = await prisma.anomalie.findMany({
    where: { type: 'missing_out_prolonge' },
    include: { employe: { select: { nom: true, prenom: true } } }
  });

  let deleted = 0;
  for (const a of anomalies) {
    const d = typeof a.details === 'string' ? JSON.parse(a.details) : (a.details || {});
    if (d.heurePrevueFin) {
      const [h, m] = d.heurePrevueFin.split(':').map(Number);
      if (h * 60 + m < 360 && d.minutesApresFinShift > 500) {
        console.log(`Suppression: ${a.employe?.prenom} ${a.employe?.nom} | ${d.heurePrevueFin} | +${d.minutesApresFinShift}min`);
        await prisma.anomalie.delete({ where: { id: a.id } });
        deleted++;
      }
    }
  }

  console.log(`${deleted} fausse(s) anomalie(s) supprimée(s)`);
  await prisma.$disconnect();
}

main().catch(console.error);
