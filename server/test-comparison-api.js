const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testComparisonAPI() {
  try {
    console.log('🧪 TEST DE L\'API DE COMPARAISON\n');
    
    // Reproduire exactement ce que fait l'API de comparaison
    const date = new Date('2025-08-25'); // Date où nous avons des données
    const dateDebut = new Date(date);
    dateDebut.setHours(0, 0, 0, 0);
    
    const dateFin = new Date(date);
    dateFin.setHours(23, 59, 59, 999);
    
    console.log('📅 Recherche pour la date:', date.toISOString().split('T')[0]);
    console.log('🔍 Période:', dateDebut.toISOString(), '->', dateFin.toISOString());
    
    // Récupérer l'utilisateur Moussa
    const user = await prisma.user.findUnique({
      where: {
        email: 'test@Mouss.com'
      }
    });
    
    if (!user) {
      console.log('❌ Utilisateur test@Mouss.com non trouvé');
      return;
    }
    
    // Récupérer les pointages et shifts séparément comme dans le controller
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: user.id,
        horodatage: {
          gte: dateDebut,
          lte: dateFin
        }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: user.id,
        date: {
          gte: dateDebut,
          lt: dateFin
        }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log(`\n👤 Utilisateur: ${user.nom} ${user.prenom} (${user.email})`);
    console.log(`📊 Pointages: ${pointages.length}`);
    console.log(`📋 Shifts: ${shifts.length}`);
    
    // Afficher les pointages
    if (pointages.length > 0) {
      console.log('\n⏰ POINTAGES:');
      pointages.forEach((p, i) => {
        const heure = p.horodatage.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        console.log(`   ${i+1}. ${p.type} à ${heure} (${p.horodatage.toISOString()})`);
      });
    }
    
    // Afficher les shifts
    if (shifts.length > 0) {
      console.log('\n📋 SHIFTS:');
      shifts.forEach((s, i) => {
        console.log(`   ${i+1}. Type: ${s.type} | Segments: ${s.segments?.length || 0}`);
        if (s.segments) {
          s.segments.forEach((seg, j) => {
            console.log(`      Segment ${j+1}: ${seg.start} - ${seg.end} ${seg.commentaire ? '(' + seg.commentaire + ')' : ''}`);
          });
        }
      });
    }
    
    // Simuler la logique de calculerEcarts comme dans comparisonController.js
    if (pointages.length > 0 && shifts.length > 0) {
      console.log('\n🔍 SIMULATION DU CALCUL D\'ÉCARTS:');
      
      // Grouper les pointages par type
      const arrivees = pointages.filter(p => p.type === 'arrivee');
      const departs = pointages.filter(p => p.type === 'depart');
      
      console.log(`   Arrivées trouvées: ${arrivees.length}`);
      console.log(`   Départs trouvés: ${departs.length}`);
      
      const shift = shifts[0];
      if (shift.segments && shift.segments.length > 0) {
        const premierSegment = shift.segments[0];
        const dernierSegment = shift.segments[shift.segments.length - 1];
        
        if (arrivees.length > 0) {
          const premierArrivee = arrivees[0];
          const heureArrivee = premierArrivee.horodatage.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          });
          console.log(`   📍 Première arrivée: ${heureArrivee} (prévu: ${premierSegment.start})`);
        }
        
        if (departs.length > 0) {
          const dernierDepart = departs[departs.length - 1];
          const heureDepart = dernierDepart.horodatage.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          });
          console.log(`   📍 Dernier départ: ${heureDepart} (prévu: ${dernierSegment.end})`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testComparisonAPI();
