const prisma = require('./prisma/client');

async function switchScenario(scenarioNumber) {
  try {
    const scenarios = {
      1: {
        name: 'REPOS COMPLET',
        description: 'Aucun shift, aucun pointage - journée de repos',
        action: async () => {
          // Supprimer shifts et pointages
          await prisma.shift.deleteMany({ where: { employeId: 86 } });
          await prisma.pointage.deleteMany({ where: { userId: 86 } });
          console.log('✅ Repos total configuré');
        }
      },
      
      2: {
        name: 'TRAVAIL NON PLANIFIÉ - EN COURS',
        description: 'Aucun shift mais employé au travail depuis ce matin',
        action: async () => {
          await prisma.shift.deleteMany({ where: { employeId: 86 } });
          
          // Nettoyer pointages d'aujourd'hui
          const aujourd = new Date();
          await prisma.pointage.deleteMany({
            where: {
              userId: 86,
              horodatage: {
                gte: new Date(aujourd.getFullYear(), aujourd.getMonth(), aujourd.getDate()),
                lt: new Date(aujourd.getFullYear(), aujourd.getMonth(), aujourd.getDate() + 1)
              }
            }
          });
          
          // Arrivée ce matin
          const arrivee = new Date();
          arrivee.setHours(8, 45, 0, 0);
          
          await prisma.pointage.create({
            data: { userId: 86, type: 'arrivee', horodatage: arrivee }
          });
          
          console.log('✅ Employé au travail depuis 8h45 (non planifié)');
        }
      },
      
      3: {
        name: 'TRAVAIL NON PLANIFIÉ - SESSION TERMINÉE',
        description: 'Aucun shift mais session de travail complète aujourd\'hui',
        action: async () => {
          await prisma.shift.deleteMany({ where: { employeId: 86 } });
          
          // Nettoyer pointages d'aujourd'hui
          const aujourd = new Date();
          await prisma.pointage.deleteMany({
            where: {
              userId: 86,
              horodatage: {
                gte: new Date(aujourd.getFullYear(), aujourd.getMonth(), aujourd.getDate()),
                lt: new Date(aujourd.getFullYear(), aujourd.getMonth(), aujourd.getDate() + 1)
              }
            }
          });
          
          // Session complète 9h-17h
          const arrivee = new Date();
          arrivee.setHours(9, 0, 0, 0);
          const depart = new Date();
          depart.setHours(17, 0, 0, 0);
          
          await prisma.pointage.createMany({
            data: [
              { userId: 86, type: 'arrivee', horodatage: arrivee },
              { userId: 86, type: 'depart', horodatage: depart }
            ]
          });
          
          console.log('✅ Session terminée 9h-17h (8h de travail non planifié)');
        }
      },
      
      4: {
        name: 'PRÉSENCE PLANIFIÉE - NORMALE',
        description: 'Shift planifié 7h, pas encore commencé',
        action: async () => {
          // Supprimer anciens shifts et pointages
          await prisma.shift.deleteMany({ where: { employeId: 86 } });
          await prisma.pointage.deleteMany({ where: { userId: 86 } });
          
          // Créer un shift pour aujourd'hui
          const aujourdhui = new Date();
          await prisma.shift.create({
            data: {
              employeId: 86,
              date: aujourdhui,
              type: 'présence',
              segments: [
                {
                  id: require('crypto').randomUUID(),
                  start: '10:00',
                  end: '14:00',
                  commentaire: 'Service midi',
                  aValider: false,
                  isExtra: false
                },
                {
                  id: require('crypto').randomUUID(),
                  start: '18:00',
                  end: '21:00',
                  commentaire: 'Service soir',
                  aValider: false,
                  isExtra: false
                }
              ]
            }
          });
          
          console.log('✅ Shift planifié créé (7h: 10h-14h + 18h-21h)');
        }
      },
      
      5: {
        name: 'ABSENCE PLANIFIÉE',
        description: 'Shift d\'absence, aucun pointage',
        action: async () => {
          await prisma.shift.deleteMany({ where: { employeId: 86 } });
          await prisma.pointage.deleteMany({ where: { userId: 86 } });
          
          const aujourdhui = new Date();
          await prisma.shift.create({
            data: {
              employeId: 86,
              date: aujourdhui,
              type: 'absence',
              motif: 'Congé personnel',
              segments: []
            }
          });
          
          console.log('✅ Absence planifiée configurée (congé personnel)');
        }
      },
      
      6: {
        name: 'ANOMALIE: ABSENCE + POINTAGE',
        description: 'Shift d\'absence mais employé pointe quand même',
        action: async () => {
          await prisma.shift.deleteMany({ where: { employeId: 86 } });
          
          // Nettoyer pointages d'aujourd'hui
          const aujourdhui = new Date();
          await prisma.pointage.deleteMany({
            where: {
              userId: 86,
              horodatage: {
                gte: new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate()),
                lt: new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() + 1)
              }
            }
          });
          
          // Créer absence
          await prisma.shift.create({
            data: {
              employeId: 86,
              date: aujourdhui,
              type: 'absence',
              motif: 'Congé maladie',
              segments: []
            }
          });
          
          // Mais créer un pointage quand même (anomalie)
          const arrivee = new Date();
          arrivee.setHours(14, 30, 0, 0);
          
          await prisma.pointage.create({
            data: { userId: 86, type: 'arrivee', horodatage: arrivee }
          });
          
          console.log('✅ ANOMALIE: Absence planifiée mais pointage à 14h30 !');
        }
      }
    };
    
    const scenario = scenarios[scenarioNumber];
    if (!scenario) {
      console.log('❌ Scénario invalide. Choisissez 1-6:');
      Object.keys(scenarios).forEach(key => {
        console.log(`${key}. ${scenarios[key].name} - ${scenarios[key].description}`);
      });
      return;
    }
    
    console.log(`🎬 Configuration du scénario ${scenarioNumber}: ${scenario.name}`);
    console.log(`📝 ${scenario.description}\n`);
    
    await scenario.action();
    
    console.log('\n🎯 RÉSULTATS ATTENDUS:');
    console.log('=====================');
    
    switch(scenarioNumber) {
      case 1:
        console.log('• Interface: 😴 "Journée de repos"');
        console.log('• Message: "Profitez bien de votre repos !"');
        console.log('• Pas de barre de progression');
        break;
      case 2:
        console.log('• Interface: ⚡ "Travail non planifié"');
        console.log('• Badge: "Anomalie"');
        console.log('• Encadré orange avec message extra');
        console.log('• Timeline avec session en cours');
        break;
      case 3:
        console.log('• Interface: ⚡ "Travail non planifié"');
        console.log('• 8h de travail comptées comme extra');
        console.log('• Barre de progression > 100%');
        break;
      case 4:
        console.log('• Interface: 📅 "Selon planning"');
        console.log('• Segments affichés (10h-14h, 18h-21h)');
        console.log('• Objectif: 7.0h');
        console.log('• Status: "Service pas encore commencé"');
        break;
      case 5:
        console.log('• Interface: 🚫 "Absence planifiée"');
        console.log('• Motif: "Congé personnel"');
        console.log('• Encadré rouge');
        break;
      case 6:
        console.log('• Interface: 🚫 "Absence planifiée" + Badge "Anomalie"');
        console.log('• Message: "Pointage inattendu (absence prévue)"');
        console.log('• Encadré rouge avec alerte');
        break;
    }
    
    console.log('\n🌐 Testez maintenant sur http://localhost:3000');
    console.log('📧 Connexion: test@Mouss.com / password123');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Récupération du numéro de scénario depuis les arguments
const scenarioNumber = parseInt(process.argv[2]);
if (!scenarioNumber) {
  console.log('Usage: node switch-scenario.js <numéro_scénario>');
  console.log('\nScénarios disponibles:');
  console.log('1. REPOS COMPLET');
  console.log('2. TRAVAIL NON PLANIFIÉ - EN COURS');
  console.log('3. TRAVAIL NON PLANIFIÉ - SESSION TERMINÉE');
  console.log('4. PRÉSENCE PLANIFIÉE - NORMALE');
  console.log('5. ABSENCE PLANIFIÉE');
  console.log('6. ANOMALIE: ABSENCE + POINTAGE');
} else {
  switchScenario(scenarioNumber);
}
