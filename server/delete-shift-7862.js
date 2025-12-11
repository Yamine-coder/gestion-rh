const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteShift7862() {
  try {
    console.log('🗑️ Suppression du shift 7862...');
    
    // Supprimer les dépendances d'abord
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

deleteShift7862();
