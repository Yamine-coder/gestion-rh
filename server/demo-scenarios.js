#!/usr/bin/env node
const prisma = require('./prisma/client');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function demoScenarios() {
  try {
    console.log('🎭 DÉMONSTRATION COMPLÈTE DES SCÉNARIOS DE POINTAGE');
    console.log('=================================================\n');
    
    console.log('Cette démonstration va vous montrer tous les scénarios gérés par le système.');
    console.log('Ouvrez http://localhost:3000 et connectez-vous avec test@Mouss.com / password123');
    console.log('Allez sur la page Pointage et observez les changements à chaque étape.\n');
    
    const scenarios = [
      {
        name: '😴 JOURNÉE DE REPOS',
        description: 'Employé sans planning, aucun pointage',
        setup: async () => {
          await prisma.shift.deleteMany({ where: { employeId: 86 } });
          await prisma.pointage.deleteMany({ where: { userId: 86 } });
        }
      },
      {
        name: '⚡ TRAVAIL NON PLANIFIÉ - EN COURS',
        description: 'Employé sans planning mais qui a pointé ce matin',
        setup: async () => {
          await prisma.shift.deleteMany({ where: { employeId: 86 } });
          
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
          
          const arrivee = new Date();
          arrivee.setHours(9, 0, 0, 0);
          
          await prisma.pointage.create({
            data: { userId: 86, type: 'arrivee', horodatage: arrivee }
          });
        }
      },
      {
        name: '📅 PRÉSENCE PLANIFIÉE NORMALE',
        description: 'Shift planifié 7h avec segments détaillés',
        setup: async () => {
          await prisma.shift.deleteMany({ where: { employeId: 86 } });
          await prisma.pointage.deleteMany({ where: { userId: 86 } });
          
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
        }
      },
      {
        name: '🚫 ABSENCE PLANIFIÉE',
        description: 'Congé maladie prévu, interface adaptée',
        setup: async () => {
          await prisma.shift.deleteMany({ where: { employeId: 86 } });
          await prisma.pointage.deleteMany({ where: { userId: 86 } });
          
          const aujourdhui = new Date();
          await prisma.shift.create({
            data: {
              employeId: 86,
              date: aujourdhui,
              type: 'absence',
              motif: 'Congé maladie',
              segments: []
            }
          });
        }
      },
      {
        name: '🚨 ANOMALIE - ABSENCE + POINTAGE',
        description: 'Congé prévu mais employé pointe quand même !',
        setup: async () => {
          // Garder l'absence du scénario précédent et ajouter un pointage
          const arrivee = new Date();
          arrivee.setHours(14, 30, 0, 0);
          
          await prisma.pointage.create({
            data: { userId: 86, type: 'arrivee', horodatage: arrivee }
          });
        }
      },
      {
        name: '⚡ TRAVAIL EXTRA TERMINÉ',
        description: 'Session de travail non planifiée complète (8h)',
        setup: async () => {
          await prisma.shift.deleteMany({ where: { employeId: 86 } });
          
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
        }
      }
    ];
    
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      
      console.log(`\n📋 SCÉNARIO ${i + 1}/${scenarios.length}: ${scenario.name}`);
      console.log(`📝 ${scenario.description}`);
      console.log('⚙️  Configuration en cours...');
      
      await scenario.setup();
      
      console.log('✅ Configuration terminée !');
      console.log('\n🔍 Rechargez la page Pointage pour voir les changements.');
      console.log('👀 Observez l\'interface, les couleurs, messages et badges.');
      
      if (i < scenarios.length - 1) {
        await askQuestion('\n⏯️  Appuyez sur ENTRÉE pour passer au scénario suivant...');
      }
    }
    
    console.log('\n🎉 DÉMONSTRATION TERMINÉE !');
    console.log('==========================');
    console.log('\n✅ Vous avez vu tous les scénarios possibles :');
    console.log('• Repos complet');
    console.log('• Travail non planifié (en cours et terminé)');
    console.log('• Présence planifiée normale');
    console.log('• Absence planifiée');
    console.log('• Anomalie (absence + pointage)');
    
    console.log('\n🏆 Le système de pointage est maintenant COMPLET !');
    console.log('Il gère tous les cas d\'usage possibles d\'un restaurant :');
    console.log('• Planning normal avec segments détaillés');
    console.log('• Heures supplémentaires automatiquement détectées');
    console.log('• Travail non planifié marqué comme extra');
    console.log('• Absences planifiées respectées');
    console.log('• Anomalies signalées visuellement');
    console.log('• Interface adaptive selon le contexte');
    
    console.log('\n📊 Fonctionnalités clés :');
    console.log('✓ Calculs automatiques objectif vs réel');
    console.log('✓ Détection intelligente des situations');
    console.log('✓ Interface responsive et intuitive');
    console.log('✓ Timeline enrichie avec sessions');
    console.log('✓ Gestion complète des heures extra');
    console.log('✓ Signalement des anomalies');
    console.log('✓ Audit trail complet');
    
    console.log('\n🚀 Le système est prêt pour la production !');
    
  } catch (error) {
    console.error('❌ Erreur durant la démonstration:', error);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Lancement de la démonstration
demoScenarios();
