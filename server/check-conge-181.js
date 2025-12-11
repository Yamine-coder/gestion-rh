const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConge181() {
  try {
    // Vérifier le congé ID 181
    const conge = await prisma.conge.findUnique({
      where: { id: 181 },
      include: { user: true }
    });

    console.log('Congé ID 181:');
    console.log(JSON.stringify(conge, null, 2));

    if (conge) {
      // Vérifier tous les congés pour cet employé (via le champ utilisé)
      const employeId = conge.userId || conge.employeId;
      const allConges = await prisma.conge.findMany({
        where: { userId: employeId },
        orderBy: { dateDebut: 'desc' }
      });

      console.log('\nTous les congés de cet employé (userId=' + employeId + '):');
      console.log(JSON.stringify(allConges, null, 2));
    }
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConge181();
