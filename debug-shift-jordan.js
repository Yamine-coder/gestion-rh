const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const now = new Date();
    console.log('🕐 Heure actuelle:', now.toISOString());
    console.log('   En heure Paris:', now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));
    
    // Récupérer le shift de Jordan
    const shift = await prisma.shift.findFirst({
      where: {
        employeId: 110,
        date: {
          gte: new Date('2025-12-05T00:00:00Z'),
          lt: new Date('2025-12-06T00:00:00Z')
        }
      },
      include: {
        employe: { select: { nom: true, prenom: true } }
      }
    });
    
    if (!shift) {
      console.log('❌ Aucun shift trouvé pour Jordan le 5 décembre');
      return;
    }
    
    console.log('\n📅 Shift de Jordan:');
    console.log('   Date:', shift.date);
    console.log('   Heure début:', shift.heureDebut);
    console.log('   Heure fin:', shift.heureFin);
    console.log('   Segments:', JSON.stringify(shift.segments, null, 2));
    
    // Créer la date de fin du shift
    const dateStr = shift.date.toISOString().split('T')[0];
    const [endH, endM] = shift.heureFin.split(':').map(Number);
    const shiftEndDate = new Date(`${dateStr}T${shift.heureFin}:00+01:00`); // Paris
    console.log('\n   Fin du shift (Paris):', shiftEndDate.toISOString());
    console.log('   Shift terminé?', now > shiftEndDate ? 'OUI' : 'NON');
    
    // Récupérer les pointages
    const pointages = await prisma.pointage.findMany({
      where: {
        employeId: 110,
        horodatage: {
          gte: new Date('2025-12-05T00:00:00Z'),
          lt: new Date('2025-12-06T00:00:00Z')
        }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    console.log('\n📍 Pointages:');
    pointages.forEach(p => {
      const heureParis = new Date(p.horodatage).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
      console.log(`   - ${p.type}: ${heureParis}`);
    });
    
    // Check si le scheduler voit ce shift
    console.log('\n🔍 Test des conditions du scheduler:');
    const shiftDate = shift.date.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    console.log('   Date du shift:', shiftDate);
    console.log('   Date aujourd\'hui:', today);
    console.log('   Même jour?', shiftDate === today);
    
    // Le scheduler ne check que les shifts du jour actuel
    // Si on est le 6 décembre, le shift du 5 n'est plus vérifié
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
