const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  await prisma.anomalie.update({
    where: { id: 474 },
    data: { statut: 'en_attente' }
  });
  console.log('✅ Anomalie 474 corrigée: statut = en_attente');
  await prisma.$disconnect();
}

fix();
