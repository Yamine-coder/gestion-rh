const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Vérifier tous les pointages de Jordan
    const pts = await prisma.pointage.findMany({ where: { userId: 110 } });
    console.log('Tous les pointages de Jordan:', pts.length);
    pts.forEach(p => console.log(`  ${p.horodatage.toISOString()} - ${p.type}`));
    
    // S'il n'y a pas de pointages, les recréer
    if (pts.length === 0) {
      console.log('\n🔧 Recréation des pointages pour le 5 décembre...');
      
      // Entrée à 09:00 Paris = 08:00 UTC
      await prisma.pointage.create({
        data: {
          userId: 110,
          type: 'entree',
          horodatage: new Date('2025-12-05T08:00:00.000Z'),
          source: 'qr_code'
        }
      });
      console.log('  ✅ Entrée créée: 09:00 Paris');
      
      // Sortie à 17:00 Paris = 16:00 UTC
      await prisma.pointage.create({
        data: {
          userId: 110,
          type: 'sortie',
          horodatage: new Date('2025-12-05T16:00:00.000Z'),
          source: 'qr_code'
        }
      });
      console.log('  ✅ Sortie créée: 17:00 Paris');
    }
    
  } finally {
    await prisma.$disconnect();
  }
})();
