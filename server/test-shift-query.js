const p = require('./prisma/client');

(async () => {
  // Simuler ce que fait le frontend
  const now = new Date();
  console.log('🕐 Heure actuelle:', now.toISOString(), '→ heure locale:', now.getHours() + 'h');
  
  const workDayDate = new Date(now);
  if (now.getHours() < 6) {
    workDayDate.setDate(workDayDate.getDate() - 1);
  }
  const workDay = workDayDate.toISOString().split('T')[0];
  console.log('📅 workDay calculé:', workDay);
  
  // Simuler la conversion côté frontend
  const shiftDateStr = '2025-12-05T00:00:00.000Z';
  const shiftDateObj = new Date(shiftDateStr);
  const shiftDateLocal = shiftDateObj.toLocaleDateString('fr-CA');
  
  console.log('\n🔍 Test conversion frontend:');
  console.log('   Shift date brute:', shiftDateStr);
  console.log('   Date locale (fr-CA):', shiftDateLocal);
  console.log('   workDay attendu:', workDay);
  console.log('   Match?', shiftDateLocal === workDay ? '✅ OUI' : '❌ NON');
  
  // Test avec date du 6 décembre aussi
  const workDay6Dec = '2025-12-06';
  console.log('\n   Si workDay était 2025-12-06:');
  console.log('   Match?', shiftDateLocal === workDay6Dec ? '✅ OUI' : '❌ NON');
  
  // Recherche dans la DB
  const start = '2025-12-05';
  const end = '2025-12-05';
  
  const startD = new Date(start + 'T00:00:00.000Z');
  startD.setHours(startD.getHours() - 2);
  
  const endD = new Date(end + 'T23:59:59.999Z');
  endD.setHours(endD.getHours() + 2);
  
  console.log('\n🔍 Recherche shifts Jordan (ID 110)');
  console.log('   Date demandée:', start);
  console.log('   Range DB:', startD.toISOString(), '→', endD.toISOString());
  
  const shifts = await p.shift.findMany({ 
    where: { 
      employeId: 110, 
      date: { gte: startD, lte: endD } 
    } 
  });
  
  console.log('\n📋 Shifts trouvés:', shifts.length);
  shifts.forEach(s => {
    const sDateLocal = s.date.toLocaleDateString('fr-CA');
    console.log('   ID:', s.id, 'Date UTC:', s.date.toISOString(), 'Date locale:', sDateLocal, 'Type:', s.type);
  });
  
  await p.$disconnect();
})();
