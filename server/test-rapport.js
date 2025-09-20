// Test de l'endpoint rapport pour voir ce qui se passe

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRapport() {
  try {
    // Prendre un employé qui a des shifts
    const employeId = 2; // D'après les logs, l'employé 2 a 14 shifts
    
    console.log(`🧪 Test rapport pour employé ${employeId}`);
    
    // Définir les dates (mois actuel)
    const maintenant = new Date();
    const dateDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const dateFin = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59, 999);
    
    console.log(`Période: ${dateDebut.toISOString()} à ${dateFin.toISOString()}`);
    
    // Récupérer les shifts (même requête que dans le contrôleur)
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
    
    console.log(`Shifts trouvés: ${shifts.length}`);
    
    let heuresPreveues = 0;
    shifts.forEach((shift, index) => {
      console.log(`\nShift ${index + 1}:`);
      console.log(`  Date: ${shift.date}`);
      console.log(`  Segments:`, shift.segments);
      
      if (shift.segments && Array.isArray(shift.segments) && shift.segments.length > 0) {
        shift.segments.forEach((segment, segIndex) => {
          const heureDebut = segment.heureDebut || segment.start;
          const heureFin = segment.heureFin || segment.end;
          
          console.log(`    Segment ${segIndex + 1}: ${heureDebut} -> ${heureFin}`);
          
          if (heureDebut && heureFin) {
            try {
              const [heuresDebut, minutesDebut] = heureDebut.split(':').map(Number);
              const [heuresFin, minutesFin] = heureFin.split(':').map(Number);
              
              const debut = heuresDebut + minutesDebut / 60;
              const fin = heuresFin + minutesFin / 60;
              
              const duree = Math.max(0, fin - debut);
              heuresPreveues += duree;
              
              console.log(`      -> Durée: ${duree}h`);
            } catch (error) {
              console.error(`      -> Erreur:`, error);
            }
          }
        });
      }
    });
    
    console.log(`\n📊 TOTAL HEURES PRÉVUES: ${heuresPreveues}h`);
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRapport();
