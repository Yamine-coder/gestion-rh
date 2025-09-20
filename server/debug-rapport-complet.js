// Script pour diagnostiquer et corriger le problème des heures prévues

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugRapportComplet() {
  try {
    const employeId = 2; // On sait que cet employé a des shifts
    const periode = 'mois';
    
    console.log(`🔍 DEBUG COMPLET RAPPORT pour employé ${employeId}`);
    console.log('='.repeat(60));
    
    // 1. Définir les dates comme dans le contrôleur
    const maintenant = new Date();
    const dateDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const dateFin = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59, 999);
    
    console.log(`📅 Période: ${dateDebut.toISOString().split('T')[0]} à ${dateFin.toISOString().split('T')[0]}`);
    
    // 2. Récupérer les shifts exactement comme dans le contrôleur
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: parseInt(employeId),
        date: {
          gte: dateDebut,
          lte: dateFin
        }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log(`\n📊 Shifts trouvés: ${shifts.length}`);
    
    // 3. Calculer les heures prévues avec logs détaillés
    let heuresPreveues = 0;
    
    shifts.forEach((shift, index) => {
      console.log(`\n--- Shift ${index + 1}/${shifts.length} ---`);
      console.log(`Date: ${shift.date.toISOString().split('T')[0]}`);
      console.log(`Segments:`, typeof shift.segments, shift.segments);
      
      if (!shift.segments) {
        console.log('❌ Pas de segments');
        return;
      }
      
      if (!Array.isArray(shift.segments)) {
        console.log('❌ Segments n\'est pas un array');
        return;
      }
      
      if (shift.segments.length === 0) {
        console.log('❌ Array de segments vide');
        return;
      }
      
      console.log(`✅ ${shift.segments.length} segments à traiter`);
      
      shift.segments.forEach((segment, segIndex) => {
        console.log(`  Segment ${segIndex + 1}:`, segment);
        
        const heureDebut = segment.heureDebut || segment.start;
        const heureFin = segment.heureFin || segment.end;
        
        console.log(`    heureDebut: ${heureDebut}, heureFin: ${heureFin}`);
        
        if (!heureDebut || !heureFin) {
          console.log('    ❌ Heures manquantes');
          return;
        }
        
        try {
          const [heuresDebut, minutesDebut] = heureDebut.split(':').map(Number);
          const [heuresFin, minutesFin] = heureFin.split(':').map(Number);
          
          const debut = heuresDebut + minutesDebut / 60;
          const fin = heuresFin + minutesFin / 60;
          
          const duree = Math.max(0, fin - debut);
          heuresPreveues += duree;
          
          console.log(`    ✅ ${heureDebut} -> ${heureFin} = ${duree}h (total: ${heuresPreveues}h)`);
        } catch (error) {
          console.log(`    ❌ Erreur parsing:`, error.message);
        }
      });
    });
    
    console.log(`\n🏁 TOTAL FINAL: ${heuresPreveues}h`);
    
    // 4. Récupérer aussi les pointages pour comparaison
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: parseInt(employeId),
        horodatage: {
          gte: dateDebut,
          lte: dateFin
        }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    console.log(`\n📋 Pointages trouvés: ${pointages.length}`);
    
    // Si on a 0 heures prévues mais des shifts, il y a un problème de structure
    if (heuresPreveues === 0 && shifts.length > 0) {
      console.log('\n🚨 PROBLÈME IDENTIFIÉ: Shifts trouvés mais 0 heures calculées');
      console.log('Analyse de structure:');
      
      const firstShift = shifts[0];
      console.log('Premier shift détaillé:');
      console.log('- ID:', firstShift.id);
      console.log('- Date:', firstShift.date);
      console.log('- Segments type:', typeof firstShift.segments);
      console.log('- Segments JSON:', JSON.stringify(firstShift.segments, null, 2));
      
      if (firstShift.segments && firstShift.segments[0]) {
        const firstSegment = firstShift.segments[0];
        console.log('Premier segment détaillé:');
        console.log('- Clés disponibles:', Object.keys(firstSegment));
        console.log('- start:', firstSegment.start);
        console.log('- end:', firstSegment.end);
        console.log('- heureDebut:', firstSegment.heureDebut);
        console.log('- heureFin:', firstSegment.heureFin);
      }
    }
    
  } catch (error) {
    console.error('💥 Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRapportComplet();
