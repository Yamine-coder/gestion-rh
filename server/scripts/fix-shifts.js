// Script pour corriger les données de shift existantes
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixShifts() {
  try {
    console.log('🔧 Correction des shifts existants...');
    
    // Récupérer tous les shifts
    const shifts = await prisma.shift.findMany();
    console.log(`   Trouvé ${shifts.length} shifts à corriger`);
    
    for (const shift of shifts) {
      let needsUpdate = false;
      let newData = {};
      
      // Corriger le type si nécessaire
      if (shift.type === 'travail') {
        newData.type = 'présence';
        needsUpdate = true;
        console.log(`   ✅ Correction du type pour shift ID ${shift.id}: "travail" -> "présence"`);
      }
      
      // Corriger la structure des segments si nécessaire
      if (shift.segments) {
        let segments = shift.segments;
        
        // Si c'est une string JSON, la parser
        if (typeof segments === 'string') {
          try {
            segments = JSON.parse(segments);
          } catch (e) {
            console.log(`   ⚠️  Erreur parsing segments pour shift ${shift.id}`);
            continue;
          }
        }
        
        // Si c'est l'ancienne structure, la convertir
        if (Array.isArray(segments) && segments.length > 0) {
          const segment = segments[0];
          
          if (segment.heureDebut && segment.heureFin) {
            // Ancienne structure détectée, convertir vers nouvelle
            const newSegments = [
              {
                id: require('crypto').randomUUID(),
                start: segment.heureDebut,
                end: segment.heureFin,
                commentaire: segment.commentaire || '',
                aValider: false,
                isExtra: false,
                extraMontant: '',
                paymentStatus: 'à_payer'
              }
            ];
            
            newData.segments = newSegments;
            needsUpdate = true;
            console.log(`   ✅ Conversion segments pour shift ID ${shift.id}: ${segment.heureDebut}-${segment.heureFin}`);
          }
        }
      }
      
      // Supprimer le motif s'il existe et que c'est une présence
      if (shift.motif && (shift.type === 'travail' || newData.type === 'présence')) {
        newData.motif = null;
        needsUpdate = true;
        console.log(`   ✅ Suppression du motif pour shift ID ${shift.id} (présence)`);
      }
      
      // Mettre à jour si nécessaire
      if (needsUpdate) {
        await prisma.shift.update({
          where: { id: shift.id },
          data: newData
        });
      }
    }
    
    console.log('🎉 Correction des shifts terminée !');
    
    // Afficher un résumé
    const updatedShifts = await prisma.shift.findMany({
      select: {
        id: true,
        type: true,
        segments: true,
        motif: true
      }
    });
    
    console.log('\n📊 Résumé après correction:');
    const typeCount = {};
    let segmentStructureOk = 0;
    
    updatedShifts.forEach(shift => {
      typeCount[shift.type] = (typeCount[shift.type] || 0) + 1;
      
      if (shift.segments && Array.isArray(shift.segments)) {
        const segment = shift.segments[0];
        if (segment && segment.start && segment.end) {
          segmentStructureOk++;
        }
      }
    });
    
    console.log(`   Types: ${JSON.stringify(typeCount)}`);
    console.log(`   Segments avec nouvelle structure: ${segmentStructureOk}/${updatedShifts.length}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
if (require.main === module) {
  fixShifts();
}

module.exports = { fixShifts };
