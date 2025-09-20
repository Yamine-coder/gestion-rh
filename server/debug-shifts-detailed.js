// Debug des shifts pour comprendre le problème des heures prévues

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugShifts() {
  try {
    console.log('🔍 Analyse des shifts...');
    
    // Récupérer tous les shifts avec leurs segments
    const shifts = await prisma.shift.findMany({
      take: 5, // Prendre seulement les 5 premiers
      orderBy: { date: 'desc' }
    });
    
    console.log(`Total shifts trouvés: ${shifts.length}`);
    
    for (const shift of shifts) {
      console.log('\n=== SHIFT ===');
      console.log(`ID: ${shift.id}`);
      console.log(`Employee ID: ${shift.employeId}`);
      console.log(`Date: ${shift.date}`);
      console.log(`Segments (type ${typeof shift.segments}):`, shift.segments);
      
      if (shift.segments) {
        console.log('Segments détaillés:');
        if (Array.isArray(shift.segments)) {
          shift.segments.forEach((segment, index) => {
            console.log(`  Segment ${index}:`, segment);
            if (segment.start && segment.end) {
              const [hStart, mStart] = segment.start.split(':').map(Number);
              const [hEnd, mEnd] = segment.end.split(':').map(Number);
              const debut = hStart + mStart / 60;
              const fin = hEnd + mEnd / 60;
              const duree = fin - debut;
              console.log(`    -> Durée calculée: ${duree}h (${segment.start} à ${segment.end})`);
            }
          });
        } else {
          console.log('  ⚠️ Segments n\'est pas un array');
        }
      } else {
        console.log('  ⚠️ Pas de segments');
      }
    }
    
    // Compter les employés qui ont des shifts
    const employesAvecShifts = await prisma.shift.groupBy({
      by: ['employeId'],
      _count: true
    });
    
    console.log('\n📊 Employés avec des shifts:');
    employesAvecShifts.forEach(emp => {
      console.log(`  Employé ${emp.employeId}: ${emp._count} shifts`);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugShifts();
