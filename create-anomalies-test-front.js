const prisma = require('./server/prisma/client');

async function createAnomaliesTest() {
  try {
    console.log('🧪 Création d\'anomalies de test pour le front...\n');

    // Récupérer quelques employés
    const employes = await prisma.user.findMany({
      where: { role: 'employee' },
      take: 3
    });

    if (employes.length === 0) {
      console.log('❌ Aucun employé trouvé');
      return;
    }

    console.log(`✅ ${employes.length} employés trouvés`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const beforeYesterday = new Date(today);
    beforeYesterday.setDate(beforeYesterday.getDate() - 2);

    const anomaliesData = [];

    // Pour chaque employé, créer 3-4 anomalies variées
    for (let i = 0; i < employes.length; i++) {
      const employe = employes[i];
      const dates = [beforeYesterday, yesterday, today];
      
      // Retard simple
      anomaliesData.push({
        employeId: employe.id,
        date: dates[0],
        type: 'retard_simple',
        gravite: 'info',
        description: `🧪 TEST - Retard léger de 5 minutes`,
        details: {
          ecartMinutes: -5,
          heurePrevu: '09:00',
          heureReelle: '09:05',
          segment: 1
        },
        statut: 'en_attente',
        justificationEmploye: 'Bus en retard ce matin'
      });

      // Retard modéré
      anomaliesData.push({
        employeId: employe.id,
        date: dates[1],
        type: 'retard_modere',
        gravite: 'attention',
        description: `🧪 TEST - Retard de 15 minutes`,
        details: {
          ecartMinutes: -15,
          heurePrevu: '09:00',
          heureReelle: '09:15',
          segment: 1
        },
        statut: 'en_attente',
        justificationEmploye: null
      });

      // Retard critique
      anomaliesData.push({
        employeId: employe.id,
        date: dates[2],
        type: 'retard_critique',
        gravite: 'critique',
        description: `🧪 TEST - Retard important de 45 minutes`,
        details: {
          ecartMinutes: -45,
          heurePrevu: '09:00',
          heureReelle: '09:45',
          segment: 1
        },
        statut: 'en_attente',
        justificationEmploye: 'Rendez-vous médical urgent'
      });

      // Départ anticipé
      if (i % 2 === 0) {
        anomaliesData.push({
          employeId: employe.id,
          date: dates[1],
          type: 'depart_anticipe',
          gravite: 'attention',
          description: `🧪 TEST - Départ 20 min avant`,
          details: {
            ecartMinutes: 20,
            heurePrevu: '18:00',
            heureReelle: '17:40',
            segment: 2
          },
          statut: 'en_attente',
          justificationEmploye: null
        });
      }

      // Heures sup à valider
      if (i % 3 === 0) {
        anomaliesData.push({
          employeId: employe.id,
          date: dates[0],
          type: 'heures_sup_a_valider',
          gravite: 'ok',
          description: `🧪 TEST - 1h30 d'heures supplémentaires`,
          details: {
            dureeMinutes: 90,
            heureDebut: '18:00',
            heureFin: '19:30'
          },
          heuresExtra: 1.5,
          montantExtra: 18.75,
          statut: 'en_attente',
          justificationEmploye: 'Pic d\'activité - validation demandée'
        });
      }

      // Absence pointage IN
      if (i === 1) {
        anomaliesData.push({
          employeId: employe.id,
          date: yesterday,
          type: 'missing_in',
          gravite: 'attention',
          description: `🧪 TEST - Pointage arrivée manquant`,
          details: {
            segment: 1,
            heurePrevu: '09:00'
          },
          statut: 'en_attente',
          justificationEmploye: 'Badge défectueux - entrée manuelle requise'
        });
      }

      // Hors plage
      if (i === 2) {
        anomaliesData.push({
          employeId: employe.id,
          date: today,
          type: 'hors_plage_in',
          gravite: 'hors_plage',
          description: `🧪 TEST - Arrivée 2h trop tôt`,
          details: {
            ecartMinutes: 120,
            heurePrevu: '09:00',
            heureReelle: '07:00',
            segment: 1
          },
          statut: 'en_attente',
          justificationEmploye: 'Ouverture exceptionnelle du restaurant'
        });
      }
    }

    console.log(`\n📋 Création de ${anomaliesData.length} anomalies...\n`);

    // Supprimer les anciennes anomalies de test
    const deleted = await prisma.anomalie.deleteMany({
      where: {
        description: {
          startsWith: '🧪 TEST'
        }
      }
    });

    console.log(`🗑️  ${deleted.count} anciennes anomalies de test supprimées`);

    // Créer les nouvelles anomalies
    const created = [];
    for (const data of anomaliesData) {
      try {
        const anomalie = await prisma.anomalie.create({
          data,
          include: {
            employe: {
              select: { nom: true, prenom: true, email: true }
            }
          }
        });
        created.push(anomalie);
        
        const emoji = 
          anomalie.gravite === 'critique' ? '🔴' :
          anomalie.gravite === 'attention' ? '🟡' :
          anomalie.gravite === 'hors_plage' ? '🟣' :
          '🟢';
        
        console.log(`  ${emoji} ${anomalie.type.padEnd(25)} | ${anomalie.employe.prenom} ${anomalie.employe.nom} | ${new Date(anomalie.date).toLocaleDateString('fr-FR')}`);
      } catch (error) {
        console.error(`  ❌ Erreur création:`, error.message);
      }
    }

    console.log(`\n✅ ${created.length} anomalies créées avec succès !`);
    console.log(`\n📊 Répartition par gravité:`);
    
    const byGravite = created.reduce((acc, a) => {
      acc[a.gravite] = (acc[a.gravite] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(byGravite).forEach(([gravite, count]) => {
      const emoji = 
        gravite === 'critique' ? '🔴' :
        gravite === 'attention' ? '🟡' :
        gravite === 'hors_plage' ? '🟣' :
        '🟢';
      console.log(`  ${emoji} ${gravite.padEnd(15)}: ${count}`);
    });

    console.log(`\n📊 Répartition par type:`);
    const byType = created.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  • ${type.padEnd(25)}: ${count}`);
    });

    console.log(`\n🎯 Toutes les anomalies sont en statut "en_attente" et prêtes à être testées !`);
    console.log(`\n💡 Actions à tester:`);
    console.log(`   ✅ VALIDER   → Shift NON modifié, pénalité légère`);
    console.log(`   ❌ REFUSER   → Shift NON modifié, pénalité DOUBLE`);
    console.log(`   🔧 CORRIGER  → Shift MODIFIÉ, aucune pénalité`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createAnomaliesTest();
