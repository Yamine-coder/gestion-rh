const prisma = require('./prisma/client');

async function debug() {
  console.log('🔍 DEBUG SYNCHRONISATION EXTRAS\n');
  
  // 1. Voir les derniers shifts avec segments isExtra
  const shifts = await prisma.shift.findMany({
    where: { segments: { not: null } },
    orderBy: { id: 'desc' },
    take: 10,
    include: { employe: { select: { nom: true, prenom: true } } }
  });
  
  console.log('=== DERNIERS SHIFTS AVEC SEGMENTS ===');
  let shiftsAvecExtra = 0;
  shifts.forEach(s => {
    const extras = s.segments?.filter(seg => seg.isExtra) || [];
    if (extras.length > 0) {
      shiftsAvecExtra++;
      console.log(`\n📅 Shift ${s.id} - ${s.employe?.prenom} ${s.employe?.nom} - ${s.date.toISOString().split('T')[0]}`);
      extras.forEach((e, i) => {
        console.log(`   🟠 Segment Extra: ${e.start}-${e.end} | Montant: ${e.extraMontant || 'non défini'} | PaymentStatus: ${e.paymentStatus}`);
      });
    }
  });
  console.log(`\n📊 Total shifts avec isExtra: ${shiftsAvecExtra}`);
  
  // 2. Voir tous les PaiementExtra
  const paiements = await prisma.paiementExtra.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { employe: { select: { nom: true, prenom: true } } }
  });
  
  console.log('\n\n=== PAIEMENTS EXTRAS EN BASE ===');
  console.log(`📊 Total: ${paiements.length}\n`);
  
  if (paiements.length === 0) {
    console.log('❌ AUCUN PaiementExtra en base!');
  } else {
    paiements.forEach(p => {
      console.log(`💰 ID:${p.id} | ${p.employe?.prenom} ${p.employe?.nom} | ${p.source} | ${p.statut} | ${p.heures}h = ${p.montant}€ | ShiftId:${p.shiftId || 'N/A'}`);
    });
  }
  
  // 3. Vérifier les shifts avec isExtra mais sans PaiementExtra
  console.log('\n\n=== DIAGNOSTIC DÉSYNCHRONISATION ===');
  
  for (const shift of shifts) {
    const extras = shift.segments?.filter(seg => seg.isExtra) || [];
    if (extras.length > 0) {
      // Chercher les PaiementExtra associés
      const paiementsAssocies = await prisma.paiementExtra.findMany({
        where: { shiftId: shift.id }
      });
      
      if (paiementsAssocies.length === 0) {
        console.log(`⚠️ DÉSYNC: Shift ${shift.id} a ${extras.length} segment(s) isExtra mais 0 PaiementExtra`);
      } else if (paiementsAssocies.length !== extras.length) {
        console.log(`⚠️ PARTIEL: Shift ${shift.id} a ${extras.length} segment(s) isExtra mais ${paiementsAssocies.length} PaiementExtra`);
      } else {
        console.log(`✅ OK: Shift ${shift.id} - ${extras.length} segment(s) isExtra = ${paiementsAssocies.length} PaiementExtra`);
      }
    }
  }
  
  await prisma.$disconnect();
}

debug().catch(e => {
  console.error('❌ Erreur:', e);
  prisma.$disconnect();
});
