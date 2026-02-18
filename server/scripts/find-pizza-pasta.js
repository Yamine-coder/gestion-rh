require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const users = await p.user.findMany({
    where: {
      OR: [
        { categories: { contains: 'Pizzaiolo' } },
        { categories: { contains: 'Pastaiolo' } },
        { prenom: { contains: 'Adam' } },
        { prenom: { contains: 'Rafique' } },
        { prenom: { contains: 'Souleyman' } },
      ]
    },
    select: { id: true, nom: true, prenom: true, email: true, categorie: true, categories: true }
  });
  
  users.forEach(u => {
    console.log(`${u.prenom.padEnd(20)} ${u.nom.padEnd(25)} | ${u.email.padEnd(40)} | ${u.categories}`);
  });
  
  console.log('\nTotal:', users.length);
  await p.$disconnect();
}
run();
