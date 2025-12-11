const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Tous les congés avec leurs types et motifs
  const conges = await prisma.conge.findMany({
    select: { id: true, type: true, motifEmploye: true }
  });
  
  console.log('Types uniques en base:', [...new Set(conges.map(c => c.type))]);
  
  console.log('\n=== Tous les congés ===\n');
  conges.forEach(c => {
    console.log(`ID: ${c.id}, Type: "${c.type}", Motif: "${c.motifEmploye || 'N/A'}"`);
  });
  
  await prisma.$disconnect();
}

check();
