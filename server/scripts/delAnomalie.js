const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  await prisma.anomalie.delete({ where: { id: 492 } });
  console.log('Anomalie 492 supprimée');
  await prisma.$disconnect();
}

cleanup().catch(e => { console.error(e); prisma.$disconnect(); });
