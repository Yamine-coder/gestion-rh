const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const users = await p.user.findMany({ select: { id: true, role: true, statut: true }});
  console.log('Statuts:', [...new Set(users.map(x=>x.statut))]);
  console.log('Roles:', [...new Set(users.map(x=>x.role))]);
  console.log('Total:', users.length);
  console.log('Employés:', users.filter(u => u.role === 'employe').length);
  console.log('Actifs:', users.filter(u => u.statut === 'actif').length);
  await p.$disconnect();
}
check();
