const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixShiftMoussaoui() {
  const userId = 110; // Moussaoui Yami
  const targetDate = '2025-12-10';
  
  console.log(`🔍 Recherche des shifts pour userId ${userId} le ${targetDate}...\n`);
  
  // Trouver tous les shifts de cet employé pour cette date
  const shifts = await prisma.shift.findMany({
    where: {
      employeId: userId,
      date: {
        gte: new Date(targetDate + 'T00:00:00.000Z'),
        lt: new Date(targetDate + 'T23:59:59.999Z')
      }
    }
  });
  
  console.log(`📋 ${shifts.length} shift(s) trouvé(s):\n`);
  
  for (const shift of shifts) {
    console.log(`  ID: ${shift.id}`);
    console.log(`  Type: ${shift.type}`);
    console.log(`  Motif: ${shift.motif || 'Aucun'}`);
    console.log(`  Segments: ${JSON.stringify(shift.segments)}`);
    console.log('');
  }
  
  // Supprimer les shifts "remplacé" ou avec motif d'absence
  for (const shift of shifts) {
    const motifLower = (shift.motif || '').toLowerCase();
    if (motifLower.includes('remplacé') || shift.type === 'absence') {
      console.log(`🗑️ Suppression du shift ${shift.id} (${shift.motif || shift.type})...`);
      
      try {
        // D'abord supprimer les dépendances
        await prisma.extraPaymentLog.deleteMany({ where: { shiftId: shift.id } });
        await prisma.paiementExtra.deleteMany({ where: { shiftId: shift.id } });
        
        // Puis supprimer le shift
        await prisma.shift.delete({ where: { id: shift.id } });
        console.log(`✅ Shift ${shift.id} supprimé avec succès`);
      } catch (err) {
        console.error(`❌ Erreur suppression shift ${shift.id}:`, err.message);
      }
    }
  }
  
  await prisma.$disconnect();
}

fixShiftMoussaoui();
