const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('=== DONNÉES JORDAN (ID 110) ===\n');
  
  // Shifts
  const shifts = await prisma.shift.findMany({ where: { employeId: 110 } });
  console.log('📋 Shifts:', shifts.length);
  shifts.forEach(s => {
    console.log(`   ID ${s.id} - Date: ${s.date.toISOString().split('T')[0]} - Type: ${s.type}`);
    console.log(`   Segments: ${JSON.stringify(s.segments)}`);
  });
  
  // Pointages
  const pointages = await prisma.pointage.findMany({ where: { userId: 110 }, orderBy: { horodatage: 'asc' } });
  console.log('\n📍 Pointages:', pointages.length);
  pointages.forEach(p => {
    console.log(`   ${p.type} - ${p.horodatage.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
  });
  
  // Anomalies
  const anomalies = await prisma.anomalie.findMany({ where: { employeId: 110 }, orderBy: { createdAt: 'desc' } });
  console.log('\n🚨 Anomalies:', anomalies.length);
  anomalies.forEach(a => {
    console.log(`   ID ${a.id} - ${a.type} (${a.gravite}) - ${a.date.toISOString().split('T')[0]}`);
    console.log(`   "${a.description}"`);
  });
  
  await prisma.$disconnect();
})();
