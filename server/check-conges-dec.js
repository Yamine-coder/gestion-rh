const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConges() {
  try {
    // Tous les congés de novembre 2025
    const conges = await prisma.conge.findMany({
      where: {
        OR: [
          { dateDebut: { gte: new Date('2025-11-01'), lte: new Date('2025-11-30') } },
          { dateFin: { gte: new Date('2025-11-01'), lte: new Date('2025-11-30') } }
        ]
      },
      select: {
        id: true,
        userId: true,
        type: true,
        statut: true,
        dateDebut: true,
        dateFin: true
      },
      take: 20
    });

    console.log('📅 Congés novembre 2025 (tous statuts):');
    console.log(JSON.stringify(conges, null, 2));
    console.log('\n📊 Total:', conges.length);
    
    // Compter par statut
    const parStatut = {};
    conges.forEach(c => {
      parStatut[c.statut] = (parStatut[c.statut] || 0) + 1;
    });
    console.log('\n📋 Par statut:', parStatut);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConges();
