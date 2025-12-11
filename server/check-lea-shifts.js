const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const lea = await prisma.user.findFirst({ 
    where: { prenom: 'Léa', nom: 'Garcia' } 
  });
  
  if (!lea) {
    console.log('❌ Léa non trouvée');
    process.exit(1);
  }
  
  console.log('👤 Léa Garcia - ID:', lea.id);
  console.log('');
  
  const shifts = await prisma.shift.findMany({ 
    where: { 
      employeId: lea.id,
      date: { 
        gte: new Date('2025-11-28T00:00:00Z'),
        lte: new Date('2025-11-30T00:00:00Z')
      }
    },
    orderBy: { date: 'asc' }
  });
  
  console.log('📅 Shifts de Léa Garcia (28-30 nov):');
  if (shifts.length === 0) {
    console.log('   Aucun shift trouvé');
  } else {
    shifts.forEach(s => {
      console.log(`   - ${s.date.toISOString().split('T')[0]} (ID: ${s.id})`);
      console.log(`     Segments:`, JSON.stringify(s.segments, null, 2));
    });
  }
  
  console.log('');
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: lea.id,
      horodatage: {
        gte: new Date('2025-11-28T00:00:00Z'),
        lte: new Date('2025-11-30T00:00:00Z')
      }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  console.log('⏰ Pointages de Léa Garcia (28-30 nov):');
  if (pointages.length === 0) {
    console.log('   Aucun pointage trouvé');
  } else {
    pointages.forEach(p => {
      const dateStr = p.horodatage.toISOString();
      console.log(`   - ${dateStr.split('T')[0]} ${dateStr.split('T')[1].split('.')[0]} (${p.type})`);
    });
  }
  
  await prisma.$disconnect();
})();
