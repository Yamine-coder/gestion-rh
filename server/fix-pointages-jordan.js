const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jordan = await prisma.user.findUnique({ where: { email: 'yjordan496@gmail.com' } });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Supprimer les pointages existants
  await prisma.pointage.deleteMany({ where: { userId: jordan.id, horodatage: { gte: today, lt: tomorrow } } });
  
  // Créer 4 pointages (journée complète avec pause)
  const p1 = new Date(today); p1.setHours(9, 15, 0, 0);   // Arrivée matin (retard)
  const p2 = new Date(today); p2.setHours(12, 0, 0, 0);   // Sortie pause
  const p3 = new Date(today); p3.setHours(13, 0, 0, 0);   // Retour pause
  const p4 = new Date(today); p4.setHours(14, 30, 0, 0);  // Départ anticipé
  
  await prisma.pointage.createMany({
    data: [
      { userId: jordan.id, type: 'arrivee', horodatage: p1 },
      { userId: jordan.id, type: 'depart', horodatage: p2 },
      { userId: jordan.id, type: 'arrivee', horodatage: p3 },
      { userId: jordan.id, type: 'depart', horodatage: p4 }
    ]
  });
  
  console.log('✅ 4 pointages créés:');
  console.log('  09:15 → Arrivée (retard 15min)');
  console.log('  12:00 → Sortie pause');
  console.log('  13:00 → Retour pause');
  console.log('  14:30 → Départ (anticipé 2h30)');
  console.log('');
  console.log('📊 Heures travaillées: 2h45 + 1h30 = 4h15 sur 7h prévues');
}

main().finally(() => prisma.$disconnect());
