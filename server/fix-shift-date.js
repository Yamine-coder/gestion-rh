const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Créer la date pour aujourd'hui 9 décembre 2025
    const today = new Date('2025-12-09T12:00:00.000Z');
    console.log('📅 Date cible:', today.toISOString());
    
    // Trouver l'employé test
    const employe = await prisma.user.findFirst({
      where: { email: 'test.extra@restaurant.com' }
    });
    
    if (!employe) {
      console.log('❌ Employé non trouvé');
      return;
    }
    
    console.log('👤 Employé:', employe.id, employe.prenom, employe.nom);
    
    // Supprimer les anciens shifts de cet employé
    const deleted = await prisma.shift.deleteMany({
      where: { employeId: employe.id }
    });
    console.log('🗑️ Anciens shifts supprimés:', deleted.count);
    
    // Créer le shift pour aujourd'hui 9 décembre
    const shift = await prisma.shift.create({
      data: {
        employeId: employe.id,
        date: today,
        type: 'présence',
        segments: [
          { start: '09:00', end: '14:00', isExtra: false, commentaire: 'Service midi - Normal' },
          { start: '18:00', end: '22:00', isExtra: true, commentaire: 'Renfort soir - EXTRA' }
        ]
      }
    });
    
    console.log('✅ Shift créé:', shift.id);
    console.log('📅 Date du shift:', shift.date.toISOString());
    console.log('📊 Segments:', JSON.stringify(shift.segments, null, 2));
    
    // Supprimer aussi les anomalies existantes pour cet employé aujourd'hui
    const anomaliesDeleted = await prisma.anomalie.deleteMany({
      where: { 
        employeId: employe.id,
        date: {
          gte: new Date('2025-12-09T00:00:00.000Z'),
          lt: new Date('2025-12-10T00:00:00.000Z')
        }
      }
    });
    console.log('🗑️ Anomalies supprimées:', anomaliesDeleted.count);
    
    console.log('\n🎯 Rafraîchissez la page frontend pour voir le shift !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
