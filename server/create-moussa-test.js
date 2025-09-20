// Création manuelle des données pour test@Mouss.com
const bcrypt = require('bcrypt');
const prisma = require('./prisma/client');

async function createMoussaTestData() {
  try {
    console.log('🚀 Création des données de test pour Moussa');
    console.log('==========================================\n');

    // 1. Créer l'employé test@Mouss.com
    console.log('👤 1. Création de l\'employé...');
    
    // Vérifier si l'employé existe (utiliser User au lieu d'employe)
    let employe = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });

    if (employe) {
      console.log('✅ Employé existant trouvé (ID: ' + employe.id + ')');
      
      // Nettoyer les anciennes données
      console.log('🧹 Nettoyage des anciennes données...');
      await prisma.pointage.deleteMany({ where: { userId: employe.id } });
      await prisma.shift.deleteMany({ where: { employeId: employe.id } });
      
    } else {
      const hashedPassword = await bcrypt.hash('7704154915Ym@!!', 10);
      
      employe = await prisma.user.create({
        data: {
          email: 'test@Mouss.com',
          password: hashedPassword,
          prenom: 'Moussa',
          nom: 'Test',
          telephone: '0123456789',
          role: 'employee',
          statut: 'actif',
          categorie: 'Serveur',
          dateEmbauche: new Date('2025-08-01')
        }
      });
      
      console.log('✅ Employé créé avec ID: ' + employe.id);
    }

    // 2. Créer les shifts de test (dates récentes)
    console.log('\n📅 2. Création des shifts...');
    
    // Shift 1: 26/08 - Normal (il y a 2 jours)
    const shift1 = await prisma.shift.create({
      data: {
        employeId: employe.id,
        date: new Date('2025-08-26'),
        type: 'présence',
        segments: [
          {
            start: '18:00',
            end: '22:00',
            commentaire: 'Service soir - Test normal'
          }
        ]
      }
    });
    console.log('✅ Shift 26/08: 18:00-22:00 créé');

    // Shift 2: 27/08 - Critique (hier)
    const shift2a = await prisma.shift.create({
      data: {
        employeId: employe.id,
        date: new Date('2025-08-27'),
        type: 'présence',
        segments: [
          {
            start: '12:00',
            end: '16:00',
            commentaire: 'Service midi - Test critique'
          }
        ]
      }
    });
    
    const shift2b = await prisma.shift.create({
      data: {
        employeId: employe.id,
        date: new Date('2025-08-27'),
        type: 'présence',
        segments: [
          {
            start: '19:00',
            end: '23:00',
            commentaire: 'Service soir - Test critique'
          }
        ]
      }
    });
    console.log('✅ Shift 27/08: 12:00-16:00 et 19:00-23:00 créés');

    // Shift 3: 28/08 - Hors-plage (aujourd'hui)
    const shift3 = await prisma.shift.create({
      data: {
        employeId: employe.id,
        date: new Date('2025-08-28'),
        type: 'présence',
        segments: [
          {
            start: '20:00',
            end: '00:00',
            commentaire: 'Service nuit - Test hors-plage'
          }
        ]
      }
    });
    console.log('✅ Shift 28/08: 20:00-00:00 créé');

    // 3. Créer les pointages de test avec dates passées
    console.log('\n📍 3. Création des pointages...');
    
    // Pointages 26/08 - Scénario normal
    await prisma.pointage.create({
      data: {
        userId: employe.id,
        type: 'arrivee',
        horodatage: new Date('2025-08-26T17:45:00.000Z')
      }
    });
    
    await prisma.pointage.create({
      data: {
        userId: employe.id,
        type: 'depart',
        horodatage: new Date('2025-08-26T22:30:00.000Z')
      }
    });
    console.log('✅ Pointages 26/08: ARRIVEE 17:45, DEPART 22:30');

    // Pointages 27/08 - Scénario critique
    await prisma.pointage.create({
      data: {
        userId: employe.id,
        type: 'arrivee',
        horodatage: new Date('2025-08-27T12:25:00.000Z')
      }
    });
    
    await prisma.pointage.create({
      data: {
        userId: employe.id,
        type: 'depart',
        horodatage: new Date('2025-08-27T15:30:00.000Z')
      }
    });
    
    await prisma.pointage.create({
      data: {
        userId: employe.id,
        type: 'arrivee',
        horodatage: new Date('2025-08-27T19:08:00.000Z')
      }
    });
    
    await prisma.pointage.create({
      data: {
        userId: employe.id,
        type: 'depart',
        horodatage: new Date('2025-08-27T23:45:00.000Z')
      }
    });
    console.log('✅ Pointages 27/08: ARRIVEE 12:25, DEPART 15:30, ARRIVEE 19:08, DEPART 23:45');

    // Pointages 28/08 - Scénario hors-plage (aujourd'hui - pas de contrainte jusqu'à maintenant)
    await prisma.pointage.create({
      data: {
        userId: employe.id,
        type: 'arrivee',
        horodatage: new Date('2025-08-28T19:00:00.000Z')
      }
    });
    
    console.log('✅ Pointages 28/08: ARRIVEE 19:00 (départ à créer plus tard)');

    console.log('\n🎯 DONNÉES CRÉÉES AVEC SUCCÈS!');
    console.log('=============================');
    console.log('');
    console.log('📧 Email: test@Mouss.com');
    console.log('🔐 Mot de passe: 7704154915Ym@!!');
    console.log('');
    console.log('📅 Scénarios créés:');
    console.log('  • 26/08: 🟢 Normal (18:00-22:00, pointé 17:45-22:30)');
    console.log('  • 27/08: 🔴 Critique (retards et départs anticipés)'); 
    console.log('  • 28/08: 🟣 Hors-plage (shift 20:00-00:00, arrivé 19:00)');
    console.log('');
    console.log('🎮 Pour tester:');
    console.log('  1. Démarrez le serveur: npm start');
    console.log('  2. Démarrez le client: cd ../client && npm start');
    console.log('  3. Connectez-vous avec les identifiants ci-dessus');
    console.log('  4. Activez "Comparaison Planning vs Réalité" dans le planning');
    console.log('  5. Regardez la semaine du 26-28 août pour voir les badges colorés');
    console.log('  6. Les écarts devraient apparaître selon les nouveaux barèmes de tolérance');
    console.log('');
    console.log('🎯 ÉCARTS ATTENDUS:');
    console.log('  📅 26/08: Arrivée 15min tôt (🟢 acceptable), départ 30min tard (🟢 acceptable)');
    console.log('  📅 27/08: Retard 25min (🔴 critique), départ 30min tôt (🔴 critique)');
    console.log('  📅 28/08: Arrivée 60min tôt (🟣 hors-plage)');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMoussaTestData();
