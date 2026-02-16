require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  // Chercher Entretien + Sécurité
  const users = await p.user.findMany({
    where: {
      OR: [
        { categories: { contains: 'Entretien' } },
        { categories: { contains: 'Securite' } },
        { categories: { contains: 'curit' } },
        { nom: { contains: 'EBA' } },
        { nom: { contains: 'KOUADIO' } },
        { nom: { contains: 'DIARRA' } },
        { nom: { contains: 'MANITE' } },
        { prenom: { contains: 'Manite' } },
        { prenom: { contains: 'Sam' } },
        { prenom: { contains: 'Moussa' } },
        { nom: { contains: 'MOUSSA' } },
        { nom: { contains: 'FATIMA' } },
        { prenom: { contains: 'Fatima' } },
        { nom: { contains: 'SAMBOU' } },
      ]
    },
    select: { id: true, nom: true, prenom: true, email: true, categorie: true, categories: true }
  });
  
  users.forEach(u => {
    console.log(`${u.prenom} ${u.nom} | ${u.email} | ${u.categorie} | ${u.categories}`);
  });
  
  console.log('\nTotal:', users.length);
  await p.$disconnect();
}
run();
