const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jordan = await prisma.user.findUnique({ where: { email: 'yjordan496@gmail.com' } });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Supprimer SEULEMENT les pointages (pas les anomalies)
  await prisma.pointage.deleteMany({ where: { userId: jordan.id, horodatage: { gte: today, lt: tomorrow } } });
  
  console.log('🧹 Pointages nettoyés\n');
  
  /**
   * SCÉNARIO : Retard + Départ anticipé
   * 
   * Shift prévu:
   *   09:00 - 12:00 (travail)
   *   12:00 - 13:00 (pause)
   *   13:00 - 17:00 (travail)
   * 
   * Pointages réels:
   *   09:20 - Arrivée (20 min de retard)
   *   12:00 - Sortie pause
   *   13:00 - Retour pause
   *   16:00 - Départ (1h avant)
   */
  
  const p1 = new Date(today); p1.setHours(9, 20, 0, 0);   // Retard 20 min
  const p2 = new Date(today); p2.setHours(12, 0, 0, 0);   // Pause OK
  const p3 = new Date(today); p3.setHours(13, 0, 0, 0);   // Retour OK
  const p4 = new Date(today); p4.setHours(16, 0, 0, 0);   // Départ anticipé 1h
  
  await prisma.pointage.createMany({
    data: [
      { userId: jordan.id, type: 'arrivee', horodatage: p1 },
      { userId: jordan.id, type: 'depart', horodatage: p2 },
      { userId: jordan.id, type: 'arrivee', horodatage: p3 },
      { userId: jordan.id, type: 'depart', horodatage: p4 }
    ]
  });
  
  console.log('✅ 4 pointages créés:\n');
  console.log('   09:20 → Arrivée (RETARD 20 min)');
  console.log('   12:00 → Pause');
  console.log('   13:00 → Retour');
  console.log('   16:00 → Départ (ANTICIPÉ 1h)');
  console.log('');
  console.log('📊 Heures travaillées: 2h40 + 3h = 5h40');
  console.log('   Prévu: 7h → Manque 1h20');
}

main().finally(() => prisma.$disconnect());
