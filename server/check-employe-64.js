const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const employe64 = await prisma.user.findUnique({
      where: { id: 64 }
    });
    
    const lea = await prisma.user.findFirst({
      where: { prenom: 'Léa', nom: 'Garcia' }
    });
    
    console.log('👤 Employé ID 64:', employe64 ? `${employe64.prenom} ${employe64.nom}` : 'NON TROUVÉ');
    console.log('👤 Léa Garcia:', lea ? `ID ${lea.id}` : 'NON TROUVÉE');
    
    if (lea) {
      const shifts = await prisma.shift.count({
        where: { employeId: lea.id }
      });
      const pointages = await prisma.pointage.count({
        where: { userId: lea.id }
      });
      console.log(`   Shifts: ${shifts}, Pointages: ${pointages}`);
    }
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
