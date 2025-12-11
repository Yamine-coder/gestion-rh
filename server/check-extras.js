const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const paiements = await prisma.paiementExtra.findMany({
      include: {
        employe: { select: { nom: true, prenom: true } }
      }
    });
    
    console.log('=== Paiements Extras ===');
    console.log('Total:', paiements.length);
    
    if (paiements.length > 0) {
      paiements.forEach(p => {
        console.log(`- ID ${p.id}: ${p.employe?.prenom} ${p.employe?.nom} - ${p.heures}h - ${p.montant}€ - ${p.statut}`);
      });
    } else {
      console.log('Aucun paiement extra trouvé.');
    }
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
