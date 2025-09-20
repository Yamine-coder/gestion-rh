// Vérifier la structure des pointages

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPointages() {
  try {
    // Récupérer quelques pointages récents
    const pointages = await prisma.pointage.findMany({
      take: 10,
      orderBy: { horodatage: 'desc' }
    });
    
    console.log(`📊 Pointages trouvés: ${pointages.length}`);
    
    pointages.forEach((p, index) => {
      console.log(`Pointage ${index + 1}:`, {
        id: p.id,
        userId: p.userId,
        type: p.type,
        horodatage: p.horodatage,
        date: p.horodatage?.toISOString().split('T')[0]
      });
    });
    
    // Compter par employé
    const countByUser = await prisma.pointage.groupBy({
      by: ['userId'],
      _count: true
    });
    
    console.log('\n👥 Pointages par employé:');
    countByUser.forEach(group => {
      console.log(`  Employé ${group.userId}: ${group._count} pointages`);
    });
    
    // Tester le calcul pour aujourd'hui
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const todayPointages = await prisma.pointage.findMany({
      where: {
        horodatage: {
          gte: startOfDay,
          lte: today
        }
      }
    });
    
    console.log(`\n📅 Pointages d'aujourd'hui: ${todayPointages.length}`);
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPointages();
