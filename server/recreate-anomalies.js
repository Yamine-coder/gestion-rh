// Recréer les anomalies avec la bonne date
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recreate() {
  const userId = 93;
  
  // Utiliser une date explicite sans timezone
  const today = new Date('2025-12-04T12:00:00.000Z');
  
  console.log('📅 Date utilisée:', today.toISOString());
  
  // Supprimer les anciennes anomalies
  await prisma.anomalie.deleteMany({
    where: { employeId: userId }
  });
  console.log('🧹 Anciennes anomalies supprimées');
  
  // Créer les nouvelles anomalies
  const anomalies = [
    {
      employeId: userId,
      date: today,
      type: 'retard_modere',
      description: 'Arrivée à 09:23 au lieu de 09:00 (retard de 23 minutes)',
      details: {
        heurePrevue: '09:00',
        heureReelle: '09:23',
        ecartMinutes: 23
      },
      statut: 'en_attente',
      gravite: 'moyenne'
    },
    {
      employeId: userId,
      date: today,
      type: 'heures_sup_a_valider',
      description: 'Départ à 18:15 au lieu de 17:00 (1h15 supplémentaires)',
      details: {
        heurePrevue: '17:00',
        heureReelle: '18:15',
        heuresSupp: 1.25,
        ecartMinutes: 75
      },
      statut: 'en_attente',
      gravite: 'faible'
    }
  ];
  
  for (const a of anomalies) {
    await prisma.anomalie.create({ data: a });
    console.log('✅ Créée:', a.type);
  }
  
  // Vérifier
  const check = await prisma.anomalie.findMany({
    where: { employeId: userId }
  });
  console.log('\n📊 Total anomalies:', check.length);
  check.forEach(a => {
    console.log(`   - ${a.type} | date: ${a.date.toISOString()}`);
  });
  
  await prisma.$disconnect();
}

recreate().catch(console.error);
