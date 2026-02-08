const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reactivateAnomalie() {
  // Remettre l'anomalie 474 en a_traiter
  const anomalie = await prisma.anomalie.findUnique({
    where: { id: 474 }
  });
  
  if (!anomalie) {
    console.log('Anomalie 474 non trouvée');
    return;
  }
  
  console.log('Anomalie actuelle:', anomalie.statut);
  
  // Nettoyer les détails
  const details = typeof anomalie.details === 'object' ? { ...anomalie.details } : {};
  delete details.payeEnExtra;
  delete details.paiementExtraId;
  delete details.segmentIndexExtra;
  delete details.heuresPayeesExtra;
  delete details.montantExtra;
  delete details.tauxHoraire;
  details.paiementAnnuleLe = new Date().toISOString();
  details.paiementAnnuleRaison = 'Correction manuelle';
  
  await prisma.anomalie.update({
    where: { id: 474 },
    data: {
      statut: 'a_traiter',
      details
    }
  });
  
  console.log('✅ Anomalie #474 remise en "a_traiter"');
  
  await prisma.$disconnect();
}

reactivateAnomalie();
