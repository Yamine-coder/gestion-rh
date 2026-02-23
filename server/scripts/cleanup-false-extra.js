const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Trouver les extra_potentiel du 19/02
    const anomalies = await prisma.anomalie.findMany({
      where: {
        date: { gte: new Date('2026-02-19T00:00:00Z'), lt: new Date('2026-02-20T00:00:00Z') },
        type: 'extra_potentiel'
      },
      include: { employe: { select: { nom: true, prenom: true } } }
    });

    console.log(`Found ${anomalies.length} extra_potentiel anomalies on 2026-02-19:\n`);

    const toDelete = [];
    for (const a of anomalies) {
      const d = typeof a.details === 'string' ? JSON.parse(a.details) : (a.details || {});
      const mins = d.minutesApres || d.minutesEnAvance || 0;
      const raison = d.raison || '?';
      console.log(`  ID=${a.id} | ${a.employe?.prenom} ${a.employe?.nom} | raison=${raison} | min=${mins} | ${a.description?.substring(0, 100)}`);

      // Faux positif: description contient un écart > 8h ET mentionne "au lieu de 00:00"
      const descMatch = a.description?.match(/(\d+)h(\d+)?min/);
      const heuresFromDesc = descMatch ? parseInt(descMatch[1]) : 0;
      const mentionMinuit = a.description?.includes('au lieu de 00:00');
      const isFalse = mins > 480 || (heuresFromDesc >= 8 && mentionMinuit);
      if (isFalse) {
        toDelete.push(a.id);
        console.log(`    -> FAUX POSITIF (${heuresFromDesc}h from desc, mentionMinuit=${mentionMinuit})`);
      }
    }

    if (toDelete.length > 0) {
      const result = await prisma.anomalie.deleteMany({ where: { id: { in: toDelete } } });
      console.log(`\n Deleted ${result.count} false anomaly(ies) (IDs: ${toDelete.join(', ')})`);
    } else {
      console.log('\nNo false positives to delete');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
