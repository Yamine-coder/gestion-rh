const prisma = require('./prisma/client');

async function createCoherentTest() {
  const jordanId = 110;
  const hier = '2025-12-05';
  
  console.log('=== CREATION TEST COHERENT ===');
  console.log('');
  
  // 1. Supprimer tout
  await prisma.anomalie.deleteMany({ where: { employeId: jordanId } });
  await prisma.pointage.deleteMany({ where: { userId: jordanId } });
  await prisma.shift.deleteMany({ where: { employeId: jordanId, date: { gte: new Date(hier + 'T00:00:00Z'), lt: new Date('2025-12-06T23:59:59Z') } } });
  console.log('1. Nettoyage OK');
  
  // 2. Créer un shift prévu 09:00-17:00
  await prisma.shift.create({
    data: {
      employeId: jordanId,
      date: new Date(hier + 'T00:00:00Z'),
      type: 'travail',
      segments: [
        { type: 'travail', start: '09:00', end: '12:00' },
        { type: 'pause', start: '12:00', end: '13:00' },
        { type: 'travail', start: '13:00', end: '17:00' }
      ]
    }
  });
  console.log('2. Shift cree: 09:00-12:00 + 13:00-17:00 (pause 12:00-13:00)');
  
  // 3. Créer les VRAIS pointages (arrivée en retard à 09:15)
  await prisma.pointage.create({ 
    data: { 
      userId: jordanId, 
      type: 'arrivee', 
      horodatage: new Date(hier + 'T08:15:00Z')  // 09:15 Paris (UTC+1)
    } 
  });
  await prisma.pointage.create({ 
    data: { 
      userId: jordanId, 
      type: 'depart', 
      horodatage: new Date(hier + 'T16:00:00Z')  // 17:00 Paris
    } 
  });
  console.log('3. Pointages: 09:15 arrivee (15min retard!), 17:00 depart');
  
  // 4. Créer l'anomalie COHERENTE avec les pointages
  await prisma.anomalie.create({
    data: {
      employeId: jordanId,
      type: 'retard_modere',
      gravite: 'moyenne',
      statut: 'en_attente',
      date: new Date(hier + 'T08:15:00Z'),
      description: 'Retard de 15 minutes - Arrivée à 09:15 au lieu de 09:00',
      details: { ecartMinutes: 15, heurePrevue: '09:00', heureReelle: '09:15' }
    }
  });
  console.log('4. Anomalie coherente: retard 15min');
  
  console.log('');
  console.log('=== RESULTAT ATTENDU ===');
  console.log('  09:15  Arrivée');
  console.log('         [Retard de 15 minutes - Arrivée à 09:15 au lieu de 09:00]');
  console.log('  17:00  Départ');
  
  await prisma['$'+'disconnect']();
}

createCoherentTest();
