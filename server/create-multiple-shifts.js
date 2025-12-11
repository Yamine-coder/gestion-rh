const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const employe = await prisma.user.findFirst({
      where: { email: 'test.extra@restaurant.com' }
    });
    
    console.log('👤 Employé ID:', employe.id);
    
    // Supprimer tous les shifts existants
    await prisma.shift.deleteMany({
      where: { employeId: employe.id }
    });
    
    // Créer plusieurs shifts pour différentes dates pour être sûr
    const dates = [
      new Date('2025-12-08T00:00:00.000Z'), // 8 décembre UTC
      new Date('2025-12-08T12:00:00.000Z'), // 8 décembre midi UTC
      new Date('2025-12-09T00:00:00.000Z'), // 9 décembre UTC  
      new Date('2025-12-09T12:00:00.000Z'), // 9 décembre midi UTC
      new Date('2025-12-10T00:00:00.000Z'), // 10 décembre UTC
    ];
    
    for (const date of dates) {
      const shift = await prisma.shift.create({
        data: {
          employeId: employe.id,
          date: date,
          type: 'présence',
          segments: [
            { start: '09:00', end: '14:00', isExtra: false, commentaire: 'Service midi - Normal' },
            { start: '18:00', end: '22:00', isExtra: true, commentaire: 'Renfort soir - EXTRA' }
          ]
        }
      });
      console.log('✅ Shift créé:', shift.id, '- Date:', shift.date.toISOString());
    }
    
    console.log('\n🎯 5 shifts créés pour différentes dates. Rafraîchissez le frontend !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
