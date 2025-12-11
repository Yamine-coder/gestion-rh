const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const userId = 110;
  
  // Nettoyer TOUT pour Jordan
  await prisma.anomalie.deleteMany({ where: { employeId: userId } });
  await prisma.pointage.deleteMany({ where: { userId } });
  await prisma.shift.deleteMany({ where: { employeId: userId } });
  
  // IMPORTANT: Avant 6h du matin, on est dans la journée de travail de la VEILLE
  // Il est ~04:30 le 6 décembre → journée de travail = 5 décembre
  // Le shift doit donc être daté du 5 décembre
  const shiftDate = '2025-12-05';
  
  // Shift de NUIT du 5 décembre: 22:00-06:00 avec pause 02:00-02:30
  await prisma.shift.create({
    data: {
      employeId: userId,
      date: new Date(shiftDate + 'T00:00:00.000Z'),
      type: 'nuit',
      segments: [
        { type: 'travail', start: '22:00', end: '02:00' },
        { type: 'pause', start: '02:00', end: '02:30' },
        { type: 'travail', start: '02:30', end: '06:00' }
      ]
    }
  });
  
  // Pointages:
  // 1. Arrivée à 22:00 le 5/12 (21:00 UTC)
  // 2. Départ pause à 02:00 le 6/12 (01:00 UTC)
  await prisma.pointage.create({ data: { userId, type: 'arrivee', horodatage: new Date('2025-12-05T21:00:00.000Z') } });
  await prisma.pointage.create({ data: { userId, type: 'depart', horodatage: new Date('2025-12-06T01:00:00.000Z') } });
  
  console.log('✅ Données recréées pour Jordan');
  console.log('');
  console.log('📋 Shift du 5 décembre (journée de travail actuelle car avant 6h):');
  console.log('   22:00 → 06:00 avec pause 02:00-02:30 (30min)');
  console.log('');
  console.log('📍 Pointages:');
  console.log('   1. Arrivée: 22:00 (5 déc)');
  console.log('   2. Départ pause: 02:00 (6 déc)');
  console.log('');
  console.log('⏳ Jordan est "en pause" depuis 02:00');
  console.log('   Il est ~04:30 → Pause de ~2h30 au lieu de 30min');
  console.log('   Dépassement: ~120min = CRITIQUE');
  
  await prisma.$disconnect();
})();
