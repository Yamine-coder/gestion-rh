const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createPointagesTest() {
  const employeId = 99; // Aminata Diop
  const date = new Date('2026-01-27');
  
  // Supprimer les anciens pointages de test s'ils existent
  await prisma.pointage.deleteMany({
    where: {
      userId: employeId,
      horodatage: {
        gte: new Date('2026-01-27T00:00:00Z'),
        lte: new Date('2026-01-27T23:59:59Z')
      }
    }
  });
  
  // Créer arrivée à 09:10 (50 min en avance par rapport à 10:00)
  const arrivee = await prisma.pointage.create({
    data: {
      userId: employeId,
      type: 'arrivee',
      horodatage: new Date('2026-01-27T08:10:00Z') // 09:10 heure Paris (UTC+1)
    }
  });
  console.log('✅ Pointage arrivée créé:', arrivee.horodatage, '(09:10 Paris)');
  
  // Créer départ à 18:00 (à l'heure)
  const depart = await prisma.pointage.create({
    data: {
      userId: employeId,
      type: 'depart',
      horodatage: new Date('2026-01-27T17:00:00Z') // 18:00 heure Paris (UTC+1)
    }
  });
  console.log('✅ Pointage départ créé:', depart.horodatage, '(18:00 Paris)');
  
  // Calculer le temps travaillé
  const minutesTravaillees = (17 * 60) - (8 * 60 + 10); // 17:00 - 08:10 en UTC = 530 min = 8h50
  console.log('\n📊 Résumé:');
  console.log('   Prévu: 10:00 → 18:00 = 8h');
  console.log('   Réel: 09:10 → 18:00 = 8h50');
  console.log('   Arrivée anticipée: 50 min');
  console.log('   Solde net: +50 min (positif !)');
  
  await prisma.$disconnect();
}

createPointagesTest().catch(e => { console.error(e); prisma.$disconnect(); });
