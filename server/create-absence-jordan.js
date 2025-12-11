/**
 * Crée l'anomalie d'absence pour Jordan (simulation de ce que ferait l'endpoint admin)
 */
const prisma = require('./prisma/client');

async function main() {
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`\n🚨 CRÉATION ANOMALIE ABSENCE - Jordan - ${today}`);
  
  // Vérifier s'il n'y a pas déjà une anomalie
  const existing = await prisma.anomalie.findFirst({
    where: {
      employeId: 110,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });
  
  if (existing) {
    console.log('⚠️ Anomalie existe déjà:', existing.type);
    return;
  }
  
  // Créer l'anomalie d'absence
  const anomalie = await prisma.anomalie.create({
    data: {
      employeId: 110,
      date: new Date(`${today}T12:00:00.000Z`),
      type: 'absence_non_justifiee',
      gravite: 'critique',
      statut: 'en_attente',
      details: {
        motif: 'Absence complète - aucun pointage enregistré',
        heuresPrevues: 7,
        heuresTravaillees: 0,
        ecartMinutes: -420, // 7h en minutes
        detecteAutomatiquement: true
      },
      description: 'Absence non justifiée - 7h prévues, aucun pointage'
    }
  });
  
  console.log('✅ Anomalie créée:', anomalie.type);
  console.log('   Description:', anomalie.description);
  console.log('\n📱 Rafraîchissez la page Pointage de Jordan!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
