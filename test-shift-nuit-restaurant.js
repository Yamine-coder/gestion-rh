const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function testShiftNuitRestaurant() {
  console.log('🍽️ === TEST SHIFT NUIT RESTAURANT ===\n');
  
  try {
    // 1. Trouver un employé test
    const employe = await prisma.user.findFirst({
      where: { role: 'employee', statut: 'actif' }
    });
    
    if (!employe) {
      console.log('❌ Aucun employé trouvé');
      return;
    }
    
    console.log(`👤 Employé test: ${employe.prenom} ${employe.nom} (ID: ${employe.id})\n`);
    
    // 2. Date du test (aujourd'hui)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const dateObj = new Date(dateStr + 'T00:00:00.000Z');
    
    console.log(`📅 Date du test: ${dateStr}\n`);
    
    // 3. Supprimer les shifts/pointages existants pour cette date
    await prisma.pointage.deleteMany({
      where: {
        userId: employe.id,
        horodatage: {
          gte: dateObj,
          lt: new Date(dateObj.getTime() + 48 * 60 * 60 * 1000) // +2 jours
        }
      }
    });
    
    await prisma.shift.deleteMany({
      where: {
        employeId: employe.id,
        date: {
          gte: dateObj,
          lt: new Date(dateObj.getTime() + 48 * 60 * 60 * 1000)
        }
      }
    });
    
    console.log('🧹 Données précédentes nettoyées\n');
    
    // 4. Créer un shift de fermeture (19:00 → 00:30)
    const shift = await prisma.shift.create({
      data: {
        employeId: employe.id,
        date: dateObj,
        type: 'présence',
        segments: [
          {
            id: require('crypto').randomUUID(),
            start: '19:00',
            end: '00:30',
            commentaire: 'Service dîner + fermeture',
            isExtra: false,
            aValider: false,
            extraMontant: '',
            paymentStatus: 'à_payer',
            paymentMethod: '',
            paymentDate: '',
            paymentNote: ''
          }
        ]
      }
    });
    
    console.log('✅ Shift créé:');
    console.log(`   📋 ID: ${shift.id}`);
    console.log(`   📅 Date: ${dateStr}`);
    console.log(`   🕐 Horaire: 19:00 → 00:30 (5.5h - FRANCHIT MINUIT)`);
    console.log(`   💬 ${shift.segments[0].commentaire}\n`);
    
    // 5. Créer les pointages (arrivée J, départ J+1)
    const tomorrow = new Date(dateObj);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const pointageIn = await prisma.pointage.create({
      data: {
        userId: employe.id,
        type: 'arrivee',
        horodatage: new Date(dateStr + 'T19:05:00.000Z') // +5 min de retard
      }
    });
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const pointageOut = await prisma.pointage.create({
      data: {
        userId: employe.id,
        type: 'depart',
        horodatage: new Date(tomorrowStr + 'T00:35:00.000Z') // +5 min heures sup
      }
    });
    
    console.log('✅ Pointages créés:');
    console.log(`   🟢 IN:  ${dateStr} 19:05 (ID: ${pointageIn.id})`);
    console.log(`   🔴 OUT: ${tomorrowStr} 00:35 (ID: ${pointageOut.id}) ← Date suivante !`);
    console.log('');
    
    // 6. Tester la comparaison
    console.log('🔍 Test de la comparaison planning vs réalité...\n');
    
    const response = await fetch(`http://localhost:5000/api/comparison/planning-vs-realite?employeId=${employe.id}&date=${dateStr}`, {
      headers: {
        'Authorization': 'Bearer test' // À adapter selon votre auth
      }
    }).catch(() => {
      console.log('⚠️ Serveur non démarré, lancez-le puis testez via l\'interface\n');
      return null;
    });
    
    if (response && response.ok) {
      const data = await response.json();
      console.log('📊 Résultat de la comparaison:');
      console.log(JSON.stringify(data, null, 2));
    }
    
    // 7. Instructions pour tester
    console.log('\n🎯 COMMENT TESTER:');
    console.log('=====================================');
    console.log('1. Démarrez le serveur backend (cd server && npm start)');
    console.log('2. Démarrez le frontend (cd client && npm start)');
    console.log('3. Connectez-vous comme admin');
    console.log('4. Allez dans "Planning RH"');
    console.log(`5. Sélectionnez l'employé: ${employe.prenom} ${employe.nom}`);
    console.log(`6. Regardez la date: ${dateStr}`);
    console.log('');
    console.log('✅ RÉSULTATS ATTENDUS:');
    console.log('  - Le shift affiche: 19:00 → 00:30 (5.5h)');
    console.log('  - Les 2 pointages sont associés au même shift');
    console.log('  - Écarts détectés:');
    console.log('    🟡 Retard modéré: +5 min (19:05 au lieu de 19:00)');
    console.log('    🟢 Heures sup: +5 min (00:35 au lieu de 00:30)');
    console.log('  - PAS d\'anomalie "présence non prévue" le lendemain');
    console.log('  - PAS d\'anomalie "départ manquant" aujourd\'hui');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testShiftNuitRestaurant();
