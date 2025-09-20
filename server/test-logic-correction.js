// Test de la logique corrigée de comparaison
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLogicCorrection() {
  try {
    console.log('🧪 TEST DE LA LOGIQUE CORRIGÉE\n');
    
    // Simuler les données que nous connaissons
    const testData = [
      {
        nom: "Arrivée 19:40 vs prévu 18:00 (100 min de retard)",
        ecart: 18*60 + 0 - (19*60 + 40), // prévu - réel = 1080 - 1180 = -100
        type: 'arrivee',
        attendu: 'retard_critique'
      },
      {
        nom: "Départ 22:00 vs prévu 22:00 (0 min d'écart)",
        ecart: 22*60 + 0 - (22*60 + 0), // prévu - réel = 1320 - 1320 = 0
        type: 'depart',
        attendu: 'depart_acceptable'
      },
      {
        nom: "Arrivée 08:50 vs prévu 09:00 (10 min d'avance)",
        ecart: 9*60 + 0 - (8*60 + 50), // prévu - réel = 540 - 530 = +10
        type: 'arrivee',
        attendu: 'arrivee_acceptable'
      },
      {
        nom: "Arrivée 09:25 vs prévu 09:00 (25 min de retard)",
        ecart: 9*60 + 0 - (9*60 + 25), // prévu - réel = 540 - 565 = -25
        type: 'arrivee',
        attendu: 'retard_critique'
      }
    ];
    
    console.log('📊 TESTS DE SEUILS:\n');
    
    testData.forEach((test, i) => {
      console.log(`${i+1}. ${test.nom}`);
      console.log(`   Écart calculé: ${test.ecart} minutes`);
      
      let resultat = 'ERREUR';
      const mins = Math.abs(test.ecart);
      
      if (test.type === 'arrivee') {
        if (test.ecart > 30) {
          resultat = 'hors_plage_in';
        } else if (test.ecart >= -5) {
          resultat = 'arrivee_acceptable';
        } else if (test.ecart >= -20) {
          resultat = 'retard_modere';
        } else {
          resultat = 'retard_critique';
        }
      } else if (test.type === 'depart') {
        if (test.ecart > 30) {
          resultat = 'depart_premature_critique';
        } else if (test.ecart > 15) {
          resultat = 'depart_anticipe';
        } else if (test.ecart >= -45) {
          resultat = 'depart_acceptable';
        } else if (test.ecart >= -90) {
          resultat = 'heures_supplementaires';
        } else {
          resultat = 'hors_plage_out';
        }
      }
      
      const correct = resultat === test.attendu;
      console.log(`   Résultat: ${resultat} ${correct ? '✅' : '❌'}`);
      console.log(`   Attendu: ${test.attendu}`);
      console.log('');
    });
    
    // Test avec les vraies données de la base
    console.log('🔍 TEST AVEC DONNÉES RÉELLES:\n');
    
    const pointages = await prisma.pointage.findMany({
      where: {
        user: { email: 'test@Mouss.com' },
        horodatage: {
          gte: new Date('2025-08-25T00:00:00.000Z'),
          lt: new Date('2025-08-25T23:59:59.999Z')
        }
      },
      include: { user: true },
      orderBy: { horodatage: 'asc' }
    });
    
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: 86, // test@Mouss.com
        date: new Date('2025-08-25T00:00:00.000Z')
      }
    });
    
    console.log(`Pointages trouvés: ${pointages.length}`);
    console.log(`Shifts trouvés: ${shifts.length}`);
    
    if (pointages.length > 0 && shifts.length > 0) {
      const arrivees = pointages.filter(p => p.type === 'arrivee');
      const departs = pointages.filter(p => p.type === 'depart');
      const shift = shifts[0];
      
      console.log(`\nArrivées: ${arrivees.length}, Départs: ${departs.length}`);
      
      if (arrivees.length > 0 && shift.segments && shift.segments.length > 0) {
        const premierArrivee = arrivees[0];
        const heureArrivee = premierArrivee.horodatage.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        const segment = shift.segments[0];
        
        console.log(`\nTest réel:`);
        console.log(`Arrivée réelle: ${heureArrivee}`);
        console.log(`Arrivée prévue: ${segment.start}`);
        
        // Calculer l'écart comme le fait le controller
        const [hPrevu, mPrevu] = segment.start.split(':').map(Number);
        const minutesPrevu = hPrevu * 60 + mPrevu;
        
        const [hReel, mReel] = heureArrivee.split(':').map(Number);
        const minutesReel = hReel * 60 + mReel;
        
        const ecart = minutesPrevu - minutesReel;
        console.log(`Écart calculé: ${ecart} minutes`);
        
        let type = 'ERREUR';
        if (ecart > 30) {
          type = 'hors_plage_in';
        } else if (ecart >= -5) {
          type = 'arrivee_acceptable';
        } else if (ecart >= -20) {
          type = 'retard_modere';
        } else {
          type = 'retard_critique';
        }
        
        console.log(`Type détecté: ${type}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testLogicCorrection();
