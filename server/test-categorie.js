const prisma = require('./prisma/client');

async function test() {
  // 1. Chercher Yamine dans la base
  const users = await prisma.user.findMany({
    where: { 
      OR: [
        { prenom: { contains: 'Yamine', mode: 'insensitive' } },
        { nom: { contains: 'Moussaoui', mode: 'insensitive' } }
      ]
    },
    select: { id: true, nom: true, prenom: true, categorie: true, email: true }
  });
  console.log('👤 Utilisateurs trouvés:', users);
  
  const yamine = users[0];
  console.log('👤 Utilisateur sélectionné:', yamine);
  
  // 2. Voir toutes les demandes en attente avec catégorie
  const demandes = await prisma.demandeRemplacement.findMany({
    where: { statut: 'en_attente' },
    include: {
      employeAbsent: { select: { id: true, nom: true, prenom: true, categorie: true } },
      shift: { select: { date: true } }
    }
  });
  
  console.log('\n📋 Toutes les demandes en attente:');
  demandes.forEach(d => {
    console.log('  -', d.employeAbsent.prenom, d.employeAbsent.nom, '| Catégorie:', d.employeAbsent.categorie);
  });
  
  // 3. Filtrer par catégorie de Yamine
  const demandesEquipe = demandes.filter(d => d.employeAbsent.categorie === yamine?.categorie);
  console.log('\n✅ Demandes de son équipe (' + yamine?.categorie + '):', demandesEquipe.length);
  
  if (demandesEquipe.length === 0) {
    console.log('   → Aucune demande de Caisse/Service, le filtrage fonctionne !');
  }
  
  await prisma.$disconnect();
}

test();
