const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanOrphanExtraSegments() {
  console.log('🔍 Recherche des segments extra orphelins...');
  
  // Trouver tous les shifts avec des segments
  const shifts = await prisma.shift.findMany({
    where: {
      segments: { not: null }
    }
  });
  
  let cleaned = 0;
  
  for (const shift of shifts) {
    let segments = typeof shift.segments === 'string' 
      ? JSON.parse(shift.segments) 
      : shift.segments;
    
    if (!Array.isArray(segments)) continue;
    
    const hasExtra = segments.some(s => s.isExtra);
    if (!hasExtra) continue;
    
    // Pour chaque segment extra, vérifier si le paiement associé est annulé
    const segmentsToKeep = [];
    for (const seg of segments) {
      if (seg.isExtra) {
        // Vérifier si le paiement existe et son statut
        if (seg.paiementExtraId) {
          const paiement = await prisma.paiementExtra.findUnique({
            where: { id: seg.paiementExtraId }
          });
          if (paiement && paiement.statut === 'annule') {
            console.log(`🗑️ Segment orphelin trouvé - shift ${shift.id}, paiement #${seg.paiementExtraId} (annulé)`);
            cleaned++;
            continue; // Ne pas garder ce segment
          }
        }
        // Segment extra sans paiementExtraId - vérifier s'il y a un paiement annulé pour ce shift/date
        const paiementAnnule = await prisma.paiementExtra.findFirst({
          where: {
            shiftId: shift.id,
            statut: 'annule'
          }
        });
        if (paiementAnnule) {
          console.log(`🗑️ Segment extra sans ID trouvé - shift ${shift.id}, paiement annulé #${paiementAnnule.id}`);
          cleaned++;
          continue;
        }
      }
      segmentsToKeep.push(seg);
    }
    
    if (segmentsToKeep.length !== segments.length) {
      await prisma.shift.update({
        where: { id: shift.id },
        data: { segments: segmentsToKeep }
      });
      console.log(`✅ Shift ${shift.id} nettoyé (${segments.length} → ${segmentsToKeep.length} segments)`);
    }
  }
  
  console.log(`\n✨ Nettoyage terminé: ${cleaned} segment(s) orphelin(s) retiré(s)`);
  await prisma.$disconnect();
}

cleanOrphanExtraSegments().catch(err => {
  console.error('Erreur:', err);
  prisma.$disconnect();
});
