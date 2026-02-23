/**
 * Script de nettoyage: Supprime la fausse anomalie "missing_out_prolonge" 
 * pour Meer Murshed ALAM du 2026-02-19 causée par le bug midnight-crossing.
 * 
 * Le bug: shiftEndMinutes = 0 pour un shift 17:00→00:00 au lieu de 1440.
 * → Le scheduler pensait que 12:10 était 730 min après la fin du shift.
 */

const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = "postgresql://neondb_owner:npg_lesV3MUriL8c@ep-fancy-heart-agongvt3-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } }
});

async function cleanup() {
  try {
    // Trouver les anomalies missing_out_prolonge du 19 février
    const anomalies = await prisma.anomalie.findMany({
      where: {
        date: new Date('2026-02-19T00:00:00.000Z'),
        type: 'missing_out_prolonge'
      },
      include: {
        employe: { select: { id: true, nom: true, prenom: true } }
      }
    });

    console.log(`\n📋 Anomalies missing_out_prolonge du 2026-02-19 trouvées: ${anomalies.length}`);
    
    for (const a of anomalies) {
      const details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
      console.log(`  - ID ${a.id}: ${a.employe?.prenom} ${a.employe?.nom} | ${details?.description || 'N/A'}`);
      console.log(`    Détails: finPrévue=${details?.heurePrevueFin}, minutesApres=${details?.minutesApresFinShift}`);
      
      // Vérifier si c'est une fausse anomalie (minutesApresFinShift aberrant)
      if (details?.minutesApresFinShift > 600) {
        console.log(`    ⚠️ FAUX POSITIF détecté (${details.minutesApresFinShift} min = bug midnight)`);
      }
    }

    // Supprimer les fausses anomalies
    const toDelete = anomalies.filter(a => {
      const details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
      return details?.minutesApresFinShift > 600; // > 10h = clairement faux
    });

    if (toDelete.length > 0) {
      const ids = toDelete.map(a => a.id);
      const result = await prisma.anomalie.deleteMany({
        where: { id: { in: ids } }
      });
      console.log(`\n✅ ${result.count} fausse(s) anomalie(s) supprimée(s) (IDs: ${ids.join(', ')})`);
    } else {
      console.log('\n✅ Aucune fausse anomalie à supprimer');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
