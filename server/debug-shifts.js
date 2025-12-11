const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Vérifier l'employé test
    const employe = await prisma.user.findFirst({
      where: { email: 'test.extra@restaurant.com' }
    });
    
    console.log('👤 Employe ID:', employe.id);
    console.log('📧 Email:', employe.email);
    
    // Vérifier tous les shifts
    const shifts = await prisma.shift.findMany({
      where: { employeId: employe.id }
    });
    
    console.log('\n📅 Shifts trouvés:', shifts.length);
    shifts.forEach(s => {
      console.log('  Shift', s.id);
      console.log('    Date brute:', s.date);
      console.log('    Date ISO:', s.date.toISOString());
      console.log('    Segments:', JSON.stringify(s.segments));
    });
    
    // Vérifier la date côté serveur
    const now = new Date();
    console.log('\n⏰ Date serveur maintenant:');
    console.log('  ISO:', now.toISOString());
    console.log('  Locale FR:', now.toLocaleDateString('fr-FR'));
    
    // Tester la requête comme le frontend
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    console.log('\n🔍 Recherche shifts entre:');
    console.log('  Début:', todayStart.toISOString());
    console.log('  Fin:', todayEnd.toISOString());
    
    const shiftsToday = await prisma.shift.findMany({
      where: {
        employeId: employe.id,
        date: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });
    
    console.log('\n✅ Shifts trouvés pour aujourd\'hui:', shiftsToday.length);
    shiftsToday.forEach(s => {
      console.log('  -', s.id, s.date.toISOString());
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
