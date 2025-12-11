const prisma = require('./server/prisma/client');

async function check() {
  console.log('=== DEMANDES DE REMPLACEMENT EN ATTENTE ===\n');
  
  const demandes = await prisma.demandeRemplacement.findMany({
    where: { statut: 'en_attente' },
    include: {
      employeAbsent: { select: { id: true, nom: true, prenom: true, categorie: true } },
      shift: true
    }
  });
  
  demandes.forEach(d => {
    const date = new Date(d.shift.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    console.log(`- ${d.employeAbsent.prenom} ${d.employeAbsent.nom}`);
    console.log(`  Catégorie: ${d.employeAbsent.categorie || 'AUCUNE'}`);
    console.log(`  Date shift: ${date}`);
    console.log(`  Motif: ${d.motif || 'N/A'}`);
    console.log('');
  });
  
  console.log('\n=== TOUS LES EMPLOYES ACTIFS ===\n');
  const users = await prisma.user.findMany({
    where: { role: 'employee', statut: 'actif' },
    select: { id: true, nom: true, prenom: true, categorie: true, email: true },
    orderBy: { categorie: 'asc' }
  });
  
  users.forEach(u => {
    console.log(`${u.id} | ${u.prenom} ${u.nom} | ${u.categorie || 'AUCUNE'} | ${u.email}`);
  });
  
  await prisma.$disconnect();
}

check().catch(console.error);
