// Script de vérification du flux complet Shift Extra → PaiementExtra
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFluxExtras() {
  console.log('=== FLUX SHIFT EXTRA MANUEL PLANNING ===\n');
  
  // 1. Trouver les shifts avec segments extras
  const shiftsAvecExtras = await prisma.shift.findMany({
    where: { type: 'présence' },
    orderBy: { id: 'desc' },
    take: 10,
    include: { 
      employe: { select: { id: true, prenom: true, nom: true } }
    }
  });
  
  const shiftsFiltered = shiftsAvecExtras.filter(s => 
    s.segments?.some(seg => seg.isExtra)
  );
  
  console.log(`1. SHIFTS AVEC SEGMENTS EXTRAS: ${shiftsFiltered.length}\n`);
  
  for (const shift of shiftsFiltered.slice(0, 3)) {
    const extraSegs = shift.segments.filter(s => s.isExtra);
    console.log(`   Shift #${shift.id} - ${shift.employe?.prenom} ${shift.employe?.nom}`);
    console.log(`   Date: ${shift.date.toLocaleDateString('fr-FR')}`);
    
    for (let i = 0; i < extraSegs.length; i++) {
      const seg = extraSegs[i];
      console.log(`   → Segment extra: ${seg.start} - ${seg.end} (${seg.paymentStatus || 'à_payer'})`);
    }
    
    // Vérifier paiement associé
    const paiements = await prisma.paiementExtra.findMany({
      where: { shiftId: shift.id }
    });
    
    if (paiements.length > 0) {
      console.log(`   ✅ Paiements liés: ${paiements.length}`);
      paiements.forEach(p => {
        console.log(`      - ID ${p.id}: ${p.heures}h | Prévu: ${p.heuresPrevues || '-'}h | Réel: ${p.heuresReelles || '-'}h | Écart: ${p.ecartHeures || '-'}h`);
        console.log(`        Pointage: ${p.arriveeReelle || '-'} → ${p.departReelle || '-'} | Validé: ${p.pointageValide ? 'Oui' : 'Non'}`);
      });
    } else {
      console.log(`   ⚠️  AUCUN PAIEMENT LIÉ`);
    }
    console.log('');
  }
  
  // 2. Statistiques globales
  console.log('=== STATISTIQUES ===\n');
  
  const totalPaiements = await prisma.paiementExtra.count();
  const paiementsShiftExtra = await prisma.paiementExtra.count({
    where: { source: 'shift_extra' }
  });
  const paiementsAnomalie = await prisma.paiementExtra.count({
    where: { source: 'anomalie_heures_sup' }
  });
  const paiementsAPayer = await prisma.paiementExtra.count({
    where: { statut: 'a_payer' }
  });
  const paiementsPayes = await prisma.paiementExtra.count({
    where: { statut: 'paye' }
  });
  const paiementsAvecPointage = await prisma.paiementExtra.count({
    where: { pointageValide: true }
  });
  
  console.log(`Total PaiementExtra: ${totalPaiements}`);
  console.log(`  - Source shift_extra: ${paiementsShiftExtra}`);
  console.log(`  - Source anomalie: ${paiementsAnomalie}`);
  console.log(`  - Statut à_payer: ${paiementsAPayer}`);
  console.log(`  - Statut payé: ${paiementsPayes}`);
  console.log(`  - Avec pointage validé: ${paiementsAvecPointage}`);
  
  // 3. Vérifier désynchronisation
  console.log('\n=== VÉRIFICATION SYNCHRONISATION ===\n');
  
  const allPaiementsShift = await prisma.paiementExtra.findMany({
    where: { source: 'shift_extra' }
  });
  
  let orphelins = 0;
  let desync = [];
  
  for (const p of allPaiementsShift) {
    const shift = await prisma.shift.findUnique({ 
      where: { id: p.shiftId },
      include: { employe: { select: { prenom: true, nom: true } } }
    });
    
    if (!shift) {
      orphelins++;
      desync.push({ paiementId: p.id, shiftId: p.shiftId, raison: 'Shift supprimé' });
    } else {
      const segment = shift.segments?.[p.segmentIndex];
      if (!segment?.isExtra) {
        orphelins++;
        desync.push({ 
          paiementId: p.id, 
          shiftId: p.shiftId, 
          raison: segment ? 'Segment plus marqué extra' : 'Segment inexistant',
          employe: `${shift.employe?.prenom} ${shift.employe?.nom}`
        });
      }
    }
  }
  
  if (orphelins === 0) {
    console.log('✅ Tous les paiements sont synchronisés avec leurs shifts');
  } else {
    console.log(`⚠️  ${orphelins} paiement(s) orphelin(s) trouvé(s):`);
    desync.forEach(d => {
      console.log(`   - Paiement #${d.paiementId} → Shift #${d.shiftId}: ${d.raison} ${d.employe ? `(${d.employe})` : ''}`);
    });
  }
  
  await prisma.$disconnect();
  console.log('\n✅ Vérification terminée');
}

checkFluxExtras().catch(console.error);
