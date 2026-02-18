require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const u = await p.user.findMany({ where: { email: { contains: 'fandino' } } });
  if (u.length) {
    console.log('Trouvée:', u[0].prenom, u[0].nom, '-', u[0].email, '- ID:', u[0].id);
  } else {
    console.log('Pas trouvée avec "fandino"');
    // Chercher large
    const all = await p.user.findMany({ where: { prenom: { contains: 'Angie' } } });
    console.log('Recherche Angie:', all.map(x => `${x.prenom} ${x.nom} - ${x.email}`));
  }
  const total = await p.user.count();
  console.log('Total users:', total);
  await p.$disconnect();
}
run();
