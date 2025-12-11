const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const userId = 110;
  const today = '2025-12-06';
  
  // Nettoyer
  await prisma.anomalie.deleteMany({ where: { employeId: userId, date: { gte: new Date(today + 'T00:00:00Z'), lt: new Date(today + 'T23:59:59Z') } } });
  await prisma.pointage.deleteMany({ where: { userId, horodatage: { gte: new Date(today + 'T00:00:00Z'), lt: new Date(today + 'T23:59:59Z') } } });
  await prisma.shift.deleteMany({ where: { employeId: userId, date: { gte: new Date(today + 'T00:00:00Z'), lt: new Date(today + 'T23:59:59Z') } } });
  
  // Shift avec pause
  await prisma.shift.create({
    data: {
      employeId: userId,
      date: new Date(today + 'T00:00:00Z'),
      heureDebut: '09:00',
      heureFin: '17:00',
      statut: 'confirme',
      segments: [
        { type: 'travail', start: '09:00', end: '12:00' },
        { type: 'pause', start: '12:00', end: '13:00' },
        { type: 'travail', start: '13:00', end: '17:00' }
      ]
    }
  });
  
  // Arrivée 09:00 + Départ pause 12:00
  await prisma.pointage.create({ data: { userId, type: 'arrivee', horodatage: new Date(today + 'T08:00:00Z'), source: 'qr_code' } });
  await prisma.pointage.create({ data: { userId, type: 'depart', horodatage: new Date(today + 'T11:00:00Z'), source: 'qr_code' } });
  
  console.log('✅ Shift: 09:00-17:00 avec pause 12:00-13:00');
  console.log('✅ Pointages: Arrivée 09:00, Départ pause 12:00');
  console.log('');
  console.log('👉 Jordan peut maintenant scanner son QR pour revenir de pause !');
  console.log('   Il est actuellement ' + new Date().toLocaleTimeString('fr-FR', {timeZone: 'Europe/Paris'}));
  console.log('   Si > 13:05 → Pause excessive sera détectée');
  
  await prisma.$disconnect();
})();
