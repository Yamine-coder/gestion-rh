const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkPaiement() {
  const paiements = await prisma.paiementExtra.findMany({
    where: { montantInitial: { not: null } },
    orderBy: { derniereModif: 'desc' },
    take: 3,
    include: { employe: { select: { nom: true, prenom: true } } }
  });
  
  console.log('Paiements avec historique de modification:');
  paiements.forEach(p => {
    console.log('\n--- Paiement ID:', p.id, '---');
    console.log('Employé:', p.employe?.prenom, p.employe?.nom);
    console.log('Heures:', p.heures, '(initial:', p.heuresInitiales, ')');
    console.log('Montant:', p.montant, '€ (initial:', p.montantInitial, '€)');
    console.log('Segment initial:', p.segmentInitial);
    console.log('Commentaire:', p.commentaire);
    console.log('Dernière modif:', p.derniereModif);
  });
  
  await prisma.$disconnect();
}

checkPaiement().catch(console.error);
