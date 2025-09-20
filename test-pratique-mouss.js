// Test pratique complet pour l'employé test@Mouss.com
// Ce script va créer des données réalistes et tester le système de tolérance

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Configuration de l'employé de test
const EMPLOYE_TEST = {
  email: 'test@Mouss.com',
  password: '7704154915Ym@!!',
  prenom: 'Moussa',
  nom: 'Test',
  telephone: '0123456789',
  poste: 'Serveur'
};

// Scénarios de test réalistes
const SCENARIOS_TEST = [
  {
    date: '2025-08-28', // Aujourd'hui
    description: '🎯 JOURNÉE TYPE - Scénarios mixtes',
    shifts: [
      { debut: '18:00', fin: '22:00' } // Service du soir
    ],
    pointages: [
      { type: 'IN', heure: '17:45', scenario: '15 min trop tôt (acceptable)' },
      { type: 'OUT', heure: '22:30', scenario: '30 min heures sup (acceptable)' }
    ]
  },
  {
    date: '2025-08-29', // Demain
    description: '🔴 JOUR CRITIQUE - Retards importants',
    shifts: [
      { debut: '12:00', fin: '16:00' }, // Service midi
      { debut: '19:00', fin: '23:00' }  // Service soir
    ],
    pointages: [
      { type: 'IN', heure: '12:25', scenario: '25 min de retard (CRITIQUE)' },
      { type: 'OUT', heure: '15:30', scenario: '30 min trop tôt (CRITIQUE)' },
      { type: 'IN', heure: '19:08', scenario: '8 min de retard (modéré)' },
      { type: 'OUT', heure: '23:45', scenario: '45 min heures sup (limite)' }
    ]
  },
  {
    date: '2025-08-30', // Après-demain
    description: '🟣 HORS-PLAGE - Pointages extrêmes',
    shifts: [
      { debut: '20:00', fin: '00:00' } // Service de nuit
    ],
    pointages: [
      { type: 'IN', heure: '19:00', scenario: '60 min trop tôt (HORS-PLAGE)' },
      { type: 'OUT', heure: '01:30', scenario: '90 min heures sup (HORS-PLAGE)' }
    ]
  }
];

async function main() {
  console.log('🚀 DÉMARRAGE DU TEST PRATIQUE POUR MOUSSA');
  console.log('=====================================\n');

  try {
    // 1. Vérifier/créer l'employé de test
    console.log('👤 1. Vérification de l\'employé test@Mouss.com...');
    
    let employe = await prisma.employe.findUnique({
      where: { email: EMPLOYE_TEST.email }
    });

    if (!employe) {
      console.log('   ➕ Création de l\'employé...');
      const hashedPassword = await bcrypt.hash(EMPLOYE_TEST.password, 10);
      
      employe = await prisma.employe.create({
        data: {
          email: EMPLOYE_TEST.email,
          password: hashedPassword,
          prenom: EMPLOYE_TEST.prenom,
          nom: EMPLOYE_TEST.nom,
          telephone: EMPLOYE_TEST.telephone,
          poste: EMPLOYE_TEST.poste,
          role: 'EMPLOYEE',
          statut: 'ACTIF'
        }
      });
      console.log(`   ✅ Employé créé avec l'ID: ${employe.id}`);
    } else {
      console.log(`   ✅ Employé existant trouvé (ID: ${employe.id})`);
    }

    // 2. Nettoyer les anciennes données de test
    console.log('\n🧹 2. Nettoyage des anciennes données...');
    
    await prisma.pointage.deleteMany({
      where: { userId: employe.id }
    });
    
    await prisma.segment.deleteMany({
      where: {
        shift: { employeId: employe.id }
      }
    });
    
    await prisma.shift.deleteMany({
      where: { employeId: employe.id }
    });
    
    console.log('   ✅ Anciennes données supprimées');

    // 3. Créer les scénarios de test
    console.log('\n📅 3. Création des scénarios de test...');
    
    for (const scenario of SCENARIOS_TEST) {
      console.log(`\n   📍 ${scenario.description}`);
      console.log(`   📅 Date: ${scenario.date}`);
      
      // Créer les shifts planifiés
      for (const [index, shiftData] of scenario.shifts.entries()) {
        const shift = await prisma.shift.create({
          data: {
            employeId: employe.id,
            date: new Date(scenario.date),
            type: 'présence',
            segments: {
              create: [{
                start: shiftData.debut,
                end: shiftData.fin,
                commentaire: `Shift ${index + 1} - Test automatique`
              }]
            }
          },
          include: {
            segments: true
          }
        });
        
        console.log(`   ⏰ Shift planifié: ${shiftData.debut}-${shiftData.fin} (ID: ${shift.id})`);
      }
      
      // Créer les pointages simulés
      for (const pointageData of scenario.pointages) {
        const dateTime = new Date(`${scenario.date}T${pointageData.heure}:00.000Z`);
        
        // Ajustement pour les heures après minuit
        if (pointageData.heure.startsWith('0') && pointageData.heure !== '00:00') {
          dateTime.setDate(dateTime.getDate() + 1);
        }
        
        const pointage = await prisma.pointage.create({
          data: {
            userId: employe.id,
            type: pointageData.type,
            horodatage: dateTime,
            methode: 'TEST_AUTO',
            statut: 'VALIDE'
          }
        });
        
        console.log(`   📍 Pointage ${pointageData.type}: ${pointageData.heure} - ${pointageData.scenario} (ID: ${pointage.id})`);
      }
    }

    // 4. Test de l'API de comparaison
    console.log('\n🔍 4. Test de l\'API de comparaison...');
    
    const dateDebut = '2025-08-28';
    const dateFin = '2025-08-30';
    
    // Simuler l'appel API (en utilisant directement Prisma car on est dans le même environnement)
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: employe.id,
        date: {
          gte: new Date(dateDebut),
          lte: new Date(dateFin)
        }
      },
      include: {
        segments: true
      },
      orderBy: { date: 'asc' }
    });
    
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employe.id,
        horodatage: {
          gte: new Date(dateDebut),
          lte: new Date(`${dateFin}T23:59:59.999Z`)
        }
      },
      orderBy: { horodatage: 'asc' }
    });
    
    console.log(`   📊 Shifts trouvés: ${shifts.length}`);
    console.log(`   📊 Pointages trouvés: ${pointages.length}`);
    
    // 5. Analyser les écarts (logique simplifiée)
    console.log('\n📈 5. Analyse des écarts détectés...');
    
    for (const shift of shifts) {
      const dateStr = shift.date.toISOString().split('T')[0];
      const pointagesJour = pointages.filter(p => 
        p.horodatage.toISOString().split('T')[0] === dateStr ||
        (p.horodatage.getHours() < 6 && p.horodatage.toISOString().split('T')[0] === new Date(new Date(dateStr).getTime() + 24*60*60*1000).toISOString().split('T')[0])
      );
      
      if (shift.segments.length > 0 && pointagesJour.length > 0) {
        const premierSegment = shift.segments[0];
        const dernierSegment = shift.segments[shift.segments.length - 1];
        
        const pointageIn = pointagesJour.find(p => p.type === 'IN');
        const pointageOut = pointagesJour.find(p => p.type === 'OUT');
        
        console.log(`\n   📅 ${dateStr}:`);
        console.log(`   🎯 Shift planifié: ${premierSegment.start}-${dernierSegment.end}`);
        
        if (pointageIn) {
          const heureIn = pointageIn.horodatage.toTimeString().slice(0, 5);
          console.log(`   📍 Arrivée réelle: ${heureIn}`);
          
          // Calcul simplifié de l'écart
          const [hPrevu, mPrevu] = premierSegment.start.split(':').map(Number);
          const [hReel, mReel] = heureIn.split(':').map(Number);
          const ecart = (hPrevu * 60 + mPrevu) - (hReel * 60 + mReel);
          
          let typeEcart = '';
          if (ecart > 30) typeEcart = '🟣 HORS-PLAGE IN';
          else if (ecart >= -5) typeEcart = '🟢 ACCEPTABLE';
          else if (ecart >= -20) typeEcart = '🟡 RETARD MODÉRÉ';
          else typeEcart = '🔴 RETARD CRITIQUE';
          
          console.log(`   📊 Écart arrivée: ${ecart} min → ${typeEcart}`);
        }
        
        if (pointageOut) {
          const heureOut = pointageOut.horodatage.toTimeString().slice(0, 5);
          console.log(`   📍 Départ réel: ${heureOut}`);
          
          // Calcul simplifié de l'écart (avec gestion minuit)
          const [hPrevu, mPrevu] = dernierSegment.end.split(':').map(Number);
          let [hReel, mReel] = heureOut.split(':').map(Number);
          
          let minutesPrevu = hPrevu * 60 + mPrevu;
          let minutesReel = hReel * 60 + mReel;
          
          // Gestion passage minuit
          if (minutesReel < 240 && minutesPrevu > 1200) {
            minutesReel += 24 * 60;
          }
          
          const ecart = minutesPrevu - minutesReel;
          
          let typeEcart = '';
          if (ecart > 30) typeEcart = '🔴 DÉPART PRÉMATURÉ CRITIQUE';
          else if (ecart > 15) typeEcart = '🟡 DÉPART ANTICIPÉ';
          else if (ecart >= -45) typeEcart = '🟢 ACCEPTABLE';
          else if (ecart >= -90) typeEcart = '🟡 HEURES SUP';
          else typeEcart = '🟣 HORS-PLAGE OUT';
          
          console.log(`   📊 Écart départ: ${ecart} min → ${typeEcart}`);
        }
      }
    }

    // 6. Instructions pour tester dans l'interface
    console.log('\n🎯 6. INSTRUCTIONS POUR TESTER DANS L\'INTERFACE');
    console.log('=============================================');
    console.log('');
    console.log('1️⃣ Démarrez le serveur backend:');
    console.log('   cd server && npm start');
    console.log('');
    console.log('2️⃣ Démarrez le client frontend:');
    console.log('   cd client && npm start');
    console.log('');
    console.log('3️⃣ Connectez-vous avec:');
    console.log(`   📧 Email: ${EMPLOYE_TEST.email}`);
    console.log(`   🔐 Mot de passe: ${EMPLOYE_TEST.password}`);
    console.log('');
    console.log('4️⃣ Dans le planning:');
    console.log('   • Activez le mode "Comparaison Planning vs Réalité"');
    console.log('   • Regardez les dates 28, 29, 30 août 2025');
    console.log('   • Vérifiez les badges colorés 🟣🟢🟡🔴');
    console.log('');
    console.log('5️⃣ Attendez-vous à voir:');
    console.log('   📅 28/08: Badges verts (situation normale)');
    console.log('   📅 29/08: Badges rouges/jaunes (retards/départs)');
    console.log('   📅 30/08: Badges violets (hors-plage extrême)');
    
    console.log('\n✅ TEST PRATIQUE CRÉÉ AVEC SUCCÈS!');
    console.log('📊 Données prêtes pour validation dans l\'interface');

  } catch (error) {
    console.error('❌ Erreur lors du test pratique:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction helper pour afficher les résultats
function afficherResume() {
  console.log('\n📋 RÉSUMÉ DES SCÉNARIOS CRÉÉS:');
  SCENARIOS_TEST.forEach((scenario, index) => {
    console.log(`\n${index + 1}. ${scenario.description}`);
    console.log(`   📅 ${scenario.date}`);
    scenario.shifts.forEach(shift => {
      console.log(`   ⏰ Planifié: ${shift.debut}-${shift.fin}`);
    });
    scenario.pointages.forEach(pointage => {
      console.log(`   📍 ${pointage.type} ${pointage.heure}: ${pointage.scenario}`);
    });
  });
}

// Exécuter le test
if (require.main === module) {
  main()
    .then(() => {
      afficherResume();
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { main, EMPLOYE_TEST, SCENARIOS_TEST };
