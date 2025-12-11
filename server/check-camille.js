const prisma = require('./prisma/client');

async function main() {
  // Chercher le paiement de Camille Lero
  const paiements = await prisma.paiementExtra.findMany({
    where: {
      employe: {
        prenom: { contains: 'Camille' }
      }
    },
    include: {
      employe: { select: { nom: true, prenom: true } }
    },
    orderBy: { id: 'desc' },
    take: 5
  });
  
  console.log('Paiements de Camille:');
  paiements.forEach(p => {
    console.log(`\nID:${p.id} | ${p.employe.prenom} ${p.employe.nom}`);
    console.log(`  Date: ${p.date}`);
    console.log(`  Heures: ${p.heures} | Montant: ${p.montant}€`);
    console.log(`  heuresInitiales: ${p.heuresInitiales}`);
    console.log(`  montantInitial: ${p.montantInitial}`);
    console.log(`  derniereModif: ${p.derniereModif}`);
    console.log(`  commentaire: ${p.commentaire}`);
  });
  
  await prisma.$disconnect();
}

main();
