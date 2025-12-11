const prisma = require('./prisma/client');

async function fixTimes() {
  const jordanId = 110;
  const today = new Date().toISOString().split('T')[0];
  
  // Mettre les pointages aux bonnes heures (simuler 09:00 et 17:00)
  const pointages = await prisma.pointage.findMany({ where: { userId: jordanId }, orderBy: { horodatage: 'asc' } });
  
  // Premier = arrivee à 09:00 Paris = 08:00 UTC
  await prisma.pointage.update({
    where: { id: pointages[0].id },
    data: { horodatage: new Date(today + 'T08:00:00Z') }
  });
  
  // Deuxieme = depart à 17:00 Paris = 16:00 UTC
  await prisma.pointage.update({
    where: { id: pointages[1].id },
    data: { horodatage: new Date(today + 'T16:00:00Z') }
  });
  
  console.log('Pointages mis a jour:');
  console.log('  09:00 Paris - arrivee');
  console.log('  17:00 Paris - depart');
  console.log('');
  console.log('Scenario: Jordan a travaille 8h continu SANS pause!');
  console.log('(pause prevue 12:00-13:00 mais jamais pointee)');
  
  await prisma['$'+'disconnect']();
}

fixTimes();
