/**
 * Test simple : pointages + shift uniquement
 * Le système doit réagir naturellement
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const jordan = await prisma.user.findUnique({ where: { email: 'yjordan496@gmail.com' } });
  if (!jordan) { console.log('❌ Jordan non trouvé'); return; }
  
  console.log(`✅ Utilisateur: ${jordan.prenom} ${jordan.nom} (ID: ${jordan.id})`);
  
  // Nettoyage du jour
  const startOfDay = new Date(today);
  const endOfDay = new Date(today); 
  endOfDay.setHours(23, 59, 59, 999);
  
  await prisma.anomalie.deleteMany({ where: { employeId: jordan.id, date: { gte: startOfDay, lte: endOfDay } } });
  await prisma.pointage.deleteMany({ where: { userId: jordan.id, horodatage: { gte: startOfDay, lte: endOfDay } } });
  await prisma.shift.deleteMany({ where: { employeId: jordan.id, date: { gte: startOfDay, lte: endOfDay } } });
  
  console.log('🧹 Données nettoyées');
  
  // Shift prévu: 09:00 - 17:00 (7h travail + 1h pause)
  await prisma.shift.create({
    data: {
      employeId: jordan.id,
      date: today,
      type: 'travail',
      segments: [
        { debut: '09:00', fin: '12:00', type: 'travail' },
        { debut: '12:00', fin: '13:00', type: 'pause' },
        { debut: '13:00', fin: '17:00', type: 'travail' }
      ],
      version: 1
    }
  });
  console.log('📅 Shift créé: 09:00 - 17:00 (7h travail prévu)');
  
  // Pointages: arrivée 09:15, départ 14:30 (heures incomplètes)
  const arrivee = new Date(today); arrivee.setHours(9, 15, 0, 0);
  const depart = new Date(today); depart.setHours(14, 30, 0, 0);
  
  await prisma.pointage.createMany({
    data: [
      { userId: jordan.id, type: 'arrivee', horodatage: arrivee },
      { userId: jordan.id, type: 'depart', horodatage: depart }
    ]
  });
  
  console.log('⏰ Pointages créés:');
  console.log('   - 09:15 → Arrivée (15 min de retard)');
  console.log('   - 14:30 → Départ (2h30 avant la fin)');
  console.log('');
  console.log('📊 Résultat attendu:');
  console.log('   - Heures travaillées: 5h15');
  console.log('   - Heures prévues: 7h');
  console.log('   - Manquantes: 1h45');
  console.log('');
  console.log('🔄 Rafraîchis la page Pointage pour voir le résultat !');
}

main().catch(console.error).finally(() => prisma.$disconnect());
