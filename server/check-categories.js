const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const users = await p.user.findMany({ 
    select: { id: true, nom: true, prenom: true, categorie: true, role: true }
  });
  
  console.log('\n📊 CATÉGORIES DANS LA BASE DE DONNÉES:\n');
  
  const cats = {};
  users.forEach(u => {
    const c = u.categorie || 'NULL';
    cats[c] = (cats[c] || 0) + 1;
  });
  
  Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(20)} : ${v} employé(s)`));
  
  console.log('\n📋 DÉTAIL PAR EMPLOYÉ:\n');
  users.forEach(u => {
    console.log(`  ${u.prenom} ${u.nom} (${u.role}) → "${u.categorie || 'NULL'}"`);
  });
  
  await p.$disconnect();
}
check();
