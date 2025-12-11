const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function refuseConge181() {
  const updated = await prisma.conge.update({
    where: { id: 181 },
    data: { statut: 'refusé' }
  });
  
  console.log('✅ Congé 181 mis à jour:');
  console.log(`  Statut: ${updated.statut}`);
  
  await prisma.$disconnect();
}

refuseConge181();
