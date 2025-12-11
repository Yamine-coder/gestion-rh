const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    console.log('🔍 Vérification des données Léa Garcia...\n');
    
    // Trouver Léa
    const lea = await prisma.user.findFirst({
      where: {
        prenom: 'Léa',
        nom: 'Garcia'
      }
    });
    
    if (!lea) {
      console.log('❌ Léa Garcia non trouvée!');
      return;
    }
    
    console.log('✅ Léa Garcia trouvée:', {
      id: lea.id,
      prenom: lea.prenom,
      nom: lea.nom
    });
    
    // Chercher ses shifts
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: lea.id,
        date: {
          gte: new Date('2025-11-28T00:00:00.000Z'),
          lte: new Date('2025-11-30T23:59:59.999Z')
        }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log('\n📅 Shifts trouvés:', shifts.length);
    shifts.forEach(s => {
      console.log(`   - ${s.date.toISOString().split('T')[0]} (ID: ${s.id})`);
      console.log(`     Segments:`, JSON.stringify(s.segments));
    });
    
    // Chercher ses pointages
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: lea.id,
        horodatage: {
          gte: new Date('2025-11-28T00:00:00.000Z'),
          lte: new Date('2025-11-30T23:59:59.999Z')
        }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    console.log('\n⏰ Pointages:', pointages.length);
    pointages.forEach(p => {
      const date = p.horodatage.toISOString().split('T')[0];
      const heure = p.horodatage.toISOString().split('T')[1].slice(0, 5);
      console.log(`   - ${date} ${heure} (${p.type})`);
    });
    
    // Vérifier le schéma de la table Shift
    console.log('\n🔍 Inspection du modèle Shift...');
    const sampleShift = await prisma.shift.findFirst();
    if (sampleShift) {
      console.log('Colonnes disponibles:', Object.keys(sampleShift));
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
