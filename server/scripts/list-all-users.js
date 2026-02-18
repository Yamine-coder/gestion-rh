require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const count = await p.user.count();
  console.log('Total users:', count);
  const users = await p.user.findMany({ select: { email: true, prenom: true, nom: true }, orderBy: { nom: 'asc' } });
  users.forEach(u => console.log(`  ${u.prenom} ${u.nom} - ${u.email}`));
  await p.$disconnect();
}
run();
