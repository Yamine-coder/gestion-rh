const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugEmploye19() {
  try {
    console.log('=== DEBUG EMPLOYÉ ID 19 - BASE DE DONNÉES ===');
    
    const employeId = 19;
    const maintenant = new Date();
    const dateDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const dateFin = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59, 999);
    
    console.log('Période analysée:', dateDebut.toISOString().split('T')[0], 'au', dateFin.toISOString().split('T')[0]);
    
    // 1. Vérifier l'employé existe
    const user = await prisma.user.findUnique({
      where: { id: employeId }
    });
    
    if (!user) {
      console.log('❌ Employé ID 19 n\'existe pas');
      return;
    }
    
    console.log('✅ Employé trouvé:', user.prenom, user.nom);
    
    // 2. Vérifier les shifts (planifications)
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: employeId,
        date: {
          gte: dateDebut,
          lte: dateFin
        }
      }
    });
    
    console.log('\n📅 SHIFTS (Planifications):');
    console.log('Nombre de shifts:', shifts.length);
    
    if (shifts.length === 0) {
      console.log('⚠️  PROBLÈME: Aucun shift trouvé pour l\'employé 19');
      console.log('   -> Sans planning, aucun retard ne peut être calculé');
    } else {
      shifts.slice(0, 3).forEach((shift, index) => {
        console.log(`Shift ${index + 1}:`, {
          date: shift.date.toISOString().split('T')[0],
          segments: shift.segments?.length || 0
        });
        if (shift.segments && shift.segments.length > 0) {
          shift.segments.forEach((segment, i) => {
            console.log(`  Segment ${i + 1}: ${segment.heureDebut || segment.start} - ${segment.heureFin || segment.end}`);
          });
        }
      });
    }
    
    // 3. Vérifier les pointages
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employeId,
        horodatage: {
          gte: dateDebut,
          lte: dateFin
        }
      }
    });
    
    console.log('\n⏰ POINTAGES:');
    console.log('Nombre de pointages:', pointages.length);
    
    if (pointages.length > 0) {
      // Grouper par date
      const pointagesParDate = {};
      pointages.forEach(p => {
        const date = p.horodatage.toISOString().split('T')[0];
        if (!pointagesParDate[date]) pointagesParDate[date] = [];
        pointagesParDate[date].push(p);
      });
      
      console.log('Dates avec pointages:');
      Object.keys(pointagesParDate).slice(0, 3).forEach(date => {
        const points = pointagesParDate[date];
        points.sort((a, b) => new Date(a.horodatage) - new Date(b.horodatage));
        const premier = points[0];
        const dernier = points[points.length - 1];
        
        console.log(`${date}: ${premier.horodatage.toLocaleTimeString('fr-FR')} -> ${dernier.horodatage.toLocaleTimeString('fr-FR')} (${points.length} pointages)`);
      });
    } else {
      console.log('⚠️  Aucun pointage trouvé');
    }
    
    // 4. Simulation du calcul de retard pour un jour donné
    if (shifts.length > 0 && pointages.length > 0) {
      console.log('\n🧮 SIMULATION CALCUL RETARD:');
      
      const pointagesParDate = {};
      pointages.forEach(p => {
        const date = p.horodatage.toISOString().split('T')[0];
        if (!pointagesParDate[date]) pointagesParDate[date] = [];
        pointagesParDate[date].push(p);
      });
      
      let retardsCalcules = 0;
      Object.entries(pointagesParDate).slice(0, 2).forEach(([date, pointagesJour]) => {
        const shiftJour = shifts.find(s => s.date.toISOString().split('T')[0] === date);
        
        if (pointagesJour.length >= 2 && shiftJour && shiftJour.segments && shiftJour.segments[0]) {
          pointagesJour.sort((a, b) => new Date(a.horodatage) - new Date(b.horodatage));
          const premier = pointagesJour[0];
          const premierSegment = shiftJour.segments[0];
          
          if (premierSegment.heureDebut) {
            const heureDebut = new Date(premier.horodatage);
            const [heures, minutes] = premierSegment.heureDebut.split(':').map(Number);
            const heurePreveueDebut = new Date(heureDebut);
            heurePreveueDebut.setHours(heures, minutes, 0, 0);
            
            if (heureDebut > heurePreveueDebut) {
              const retardMinutes = (heureDebut - heurePreveueDebut) / (1000 * 60);
              console.log(`${date}: Retard de ${Math.round(retardMinutes)} min`);
              console.log(`  Prévu: ${premierSegment.heureDebut}, Arrivé: ${heureDebut.toLocaleTimeString('fr-FR')}`);
              retardsCalcules++;
            } else {
              console.log(`${date}: À l'heure`);
            }
          }
        } else {
          console.log(`${date}: Impossible de calculer (pas de shift ou segments)`);
        }
      });
      
      console.log(`Total retards calculés: ${retardsCalcules}`);
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugEmploye19();
