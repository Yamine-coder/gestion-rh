const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTodayData() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    console.log('🗓️ Date du jour:', todayStr);
    
    // Chercher les pointages d'aujourd'hui pour Moussa
    const pointages = await prisma.pointage.findMany({
      where: {
        user: { email: 'test@Mouss.com' },
        date: {
          gte: new Date(todayStr + 'T00:00:00.000Z'),
          lt: new Date(todayStr + 'T23:59:59.999Z')
        }
      },
      include: { user: true },
      orderBy: { heure: 'asc' }
    });
    
    // Chercher les plannings d'aujourd'hui pour Moussa
    const plannings = await prisma.plannedShift.findMany({
      where: {
        user: { email: 'test@Mouss.com' },
        date: new Date(todayStr + 'T00:00:00.000Z')
      },
      include: { user: true }
    });
    
    console.log('\n📊 DONNÉES D\'AUJOURD\'HUI pour test@Mouss.com:');
    console.log('   Pointages:', pointages.length);
    console.log('   Plannings:', plannings.length);
    
    if (pointages.length > 0) {
      console.log('\n⏰ Pointages:');
      pointages.forEach((p, i) => {
        console.log(`   ${i+1}. ${p.type} à ${p.heure}`);
      });
    }
    
    if (plannings.length > 0) {
      console.log('\n📋 Plannings:');
      plannings.forEach((p, i) => {
        console.log(`   ${i+1}. ${p.heureDebut} - ${p.heureFin}`);
      });
    }
    
    if (pointages.length === 0 && plannings.length === 0) {
      console.log('\n⚠️ Aucune donnée pour aujourd\'hui - créons des données de test...');
      
      // Créer un planning simple
      const planning = await prisma.plannedShift.create({
        data: {
          userId: 86, // test@Mouss.com
          date: new Date(todayStr + 'T00:00:00.000Z'),
          heureDebut: '09:00',
          heureFin: '17:00'
        }
      });
      
      // Créer des pointages avec anomalies
      const pointageArrivee = await prisma.pointage.create({
        data: {
          userId: 86,
          date: new Date(todayStr + 'T00:00:00.000Z'),
          heure: '09:25', // 25 min de retard -> critique
          type: 'arrivee'
        }
      });
      
      const pointageDepart = await prisma.pointage.create({
        data: {
          userId: 86,
          date: new Date(todayStr + 'T00:00:00.000Z'),
          heure: '16:30', // 30 min d'avance -> attention
          type: 'depart'
        }
      });
      
      console.log('✅ Données créées:');
      console.log('   📋 Planning: 09:00 - 17:00');
      console.log('   🔴 Arrivée: 09:25 (25 min de retard = critique)');
      console.log('   🟡 Départ: 16:30 (30 min d\'avance = attention)');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTodayData();
