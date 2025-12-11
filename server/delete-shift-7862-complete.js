const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteShift7862Complete() {
  try {
    console.log('🔍 Recherche des DemandeRemplacement liées au shift 7862...');
    
    // Trouver les demandes de remplacement liées
    const demandes = await prisma.demandeRemplacement.findMany({
      where: { shiftId: 7862 }
    });
    
    console.log(`📋 ${demandes.length} demande(s) de remplacement trouvée(s)`);
    
    for (const d of demandes) {
      console.log(`  - ID: ${d.id}, Statut: ${d.statut}`);
    }
    
    // Supprimer les demandes de remplacement
    if (demandes.length > 0) {
      const deleted = await prisma.demandeRemplacement.deleteMany({
        where: { shiftId: 7862 }
      });
      console.log(`🗑️ ${deleted.count} demande(s) de remplacement supprimée(s)`);
    }
    
    // Maintenant supprimer les autres dépendances
    const logs = await prisma.extraPaymentLog.deleteMany({ where: { shiftId: 7862 } });
    console.log(`  - ${logs.count} extraPaymentLog supprimés`);
    
    const paiements = await prisma.paiementExtra.deleteMany({ where: { shiftId: 7862 } });
    console.log(`  - ${paiements.count} paiementExtra supprimés`);
    
    // Supprimer le shift
    await prisma.shift.delete({ where: { id: 7862 } });
    console.log('✅ Shift 7862 supprimé avec succès !');
    
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  }
  
  await prisma.$disconnect();
}

deleteShift7862Complete();
