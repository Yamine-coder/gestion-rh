const prisma = require('./prisma/client');
const { creerPaiementDepuisShiftExtra } = require('./services/paiementExtrasService');

async function fixDesync() {
  console.log('🔧 CORRECTION DÉSYNCHRONISATION EXTRAS\n');
  
  // Trouver tous les shifts avec segments isExtra mais sans PaiementExtra
  const shifts = await prisma.shift.findMany({
    where: { segments: { not: null } },
    include: { employe: { select: { nom: true, prenom: true } } }
  });
  
  let fixed = 0;
  let skipped = 0;
  
  for (const shift of shifts) {
    // Parser les segments si c'est une string JSON
    let segments = shift.segments;
    if (typeof segments === 'string') {
      try { segments = JSON.parse(segments); } catch (e) { segments = []; }
    }
    if (!Array.isArray(segments)) segments = [];
    
    const extras = segments.filter(seg => seg.isExtra) || [];
    
    for (let i = 0; i < extras.length; i++) {
      // Trouver l'index réel du segment extra
      const segmentIndex = segments.findIndex((s, idx) => 
        s.isExtra && segments.slice(0, idx).filter(x => x.isExtra).length === i
      );
      
      // Vérifier si un PaiementExtra existe déjà
      const existing = await prisma.paiementExtra.findFirst({
        where: { 
          shiftId: shift.id,
          segmentIndex: segmentIndex
        }
      });
      
      if (existing) {
        console.log(`⏭️ Shift ${shift.id} segment ${segmentIndex}: PaiementExtra existe déjà (ID:${existing.id})`);
        skipped++;
        continue;
      }
      
      // Créer le PaiementExtra
      try {
        const paiement = await creerPaiementDepuisShiftExtra(shift, segmentIndex, 1);
        if (paiement) {
          console.log(`✅ Shift ${shift.id} (${shift.employe?.prenom} ${shift.employe?.nom}) segment ${segmentIndex}: PaiementExtra créé (ID:${paiement.id})`);
          fixed++;
        }
      } catch (error) {
        console.error(`❌ Erreur shift ${shift.id} segment ${segmentIndex}:`, error.message);
      }
    }
  }
  
  console.log(`\n📊 Résultat: ${fixed} créé(s), ${skipped} déjà existant(s)`);
  
  await prisma.$disconnect();
}

fixDesync().catch(e => {
  console.error('❌ Erreur:', e);
  prisma.$disconnect();
});
