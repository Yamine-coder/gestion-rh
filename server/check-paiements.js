const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const paiements = await prisma.paiementExtra.findMany({
      include: {
        employe: { select: { id: true, nom: true, prenom: true } }
      }
    });
    console.log('Nombre de paiements extras:', paiements.length);
    console.log('Paiements:', JSON.stringify(paiements, null, 2));
  } catch (e) {
    console.error('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
