const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const users = await p.user.findMany({ 
    take: 10, 
    select: { id: true, nom: true, prenom: true, role: true, statut: true } 
  });
  console.log('Users:', users);
  await p.$disconnect();
}

check();
