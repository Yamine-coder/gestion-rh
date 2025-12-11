const prisma = require('./prisma/client');

async function updateForToday() {
  const jordanId = 110;
  
  // La journée de travail côté front: si l'heure < 6h, on prend hier
  // Il est 01h35 Paris = 00h35 UTC le 6 décembre
  // Donc la journée de travail = 5 décembre
  
  // Vérifions les dates
  const now = new Date();
  console.log('Now UTC:', now.toISOString());
  console.log('Now Paris:', now.toLocaleString('fr-FR', {timeZone: 'Europe/Paris'}));
  
  // La journée de travail devrait être le 5 décembre
  const workDay = '2025-12-05';
  console.log('Journée de travail:', workDay);
  
  // Récupérer les anomalies
  const anomalies = await prisma.anomalie.findMany({
    where: { employeId: jordanId },
    orderBy: { date: 'desc' }
  });
  
  console.log('');
  console.log('Anomalies de Jordan:');
  anomalies.forEach(a => {
    const dateStr = a.date.toISOString().split('T')[0];
    console.log('  -', a.type, 'date:', dateStr, '| statut:', a.statut);
  });
  
  await prisma['$'+'disconnect']();
}

updateForToday();
