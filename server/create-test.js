const prisma = require('./prisma/client');

async function createTestAnomalie() {
  const jordanId = 110;
  
  // Supprimer les anciennes anomalies légales
  await prisma.anomalie.deleteMany({
    where: { 
      employeId: jordanId,
      type: { in: ['pause_non_prise', 'depassement_amplitude'] }
    }
  });
  console.log('Anomalies legales supprimees (pause/amplitude)');
  
  // Créer une anomalie de test gérable (ex: retard)
  await prisma.anomalie.create({
    data: {
      employeId: jordanId,
      type: 'retard_modere',
      gravite: 'moyenne',
      statut: 'en_attente',
      date: new Date('2025-12-05T09:15:00Z'),
      description: 'Retard de 15 minutes - Arrivée à 09:15 au lieu de 09:00',
      details: { ecartMinutes: 15, heurePrevue: '09:00', heureReelle: '09:15' }
    }
  });
  console.log('Anomalie retard_modere creee');
  
  // Vérifier
  const anomalies = await prisma.anomalie.findMany({
    where: { employeId: jordanId },
    orderBy: { date: 'desc' }
  });
  
  console.log('');
  console.log('Anomalies Jordan:');
  anomalies.forEach(a => console.log('  -', a.type, ':', a.description.substring(0, 50) + '...'));
  
  await prisma['$'+'disconnect']();
}

createTestAnomalie();
