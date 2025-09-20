const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestCongesUrgence() {
  try {
    console.log('🔄 Création de congés de test avec différents niveaux d\'urgence...\n');

    // Récupérer les utilisateurs existants
    const users = await prisma.user.findMany({
      take: 5 // On prend 5 utilisateurs max
    });

    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé. Créez d\'abord des utilisateurs.');
      return;
    }

    const maintenant = new Date();
    const testConges = [];

    // 1. Congé DEMAIN (le plus urgent - badge rouge animé)
    const demain = new Date(maintenant);
    demain.setDate(maintenant.getDate() + 1);
    const finDemain = new Date(demain);
    finDemain.setDate(demain.getDate() + 2);

    testConges.push({
      userId: users[0].id,
      type: 'Congé payé',
      dateDebut: demain.toISOString(),
      dateFin: finDemain.toISOString(),
      statut: 'en attente'
    });

    // 2. Congé URGENT (2 jours - badge rouge)
    const urgent = new Date(maintenant);
    urgent.setDate(maintenant.getDate() + 2);
    const finUrgent = new Date(urgent);
    finUrgent.setDate(urgent.getDate() + 3);

    testConges.push({
      userId: users[1] ? users[1].id : users[0].id,
      type: 'RTT',
      dateDebut: urgent.toISOString(),
      dateFin: finUrgent.toISOString(),
      statut: 'en attente'
    });

    // 3. Congé EXPRESS (5 jours - badge brand)
    const express = new Date(maintenant);
    express.setDate(maintenant.getDate() + 5);
    const finExpress = new Date(express);
    finExpress.setDate(express.getDate() + 4);

    testConges.push({
      userId: users[2] ? users[2].id : users[0].id,
      type: 'Congé payé',
      dateDebut: express.toISOString(),
      dateFin: finExpress.toISOString(),
      statut: 'en attente'
    });

    // 4. Congé NORMAL (10 jours - pas de badge)
    const normal = new Date(maintenant);
    normal.setDate(maintenant.getDate() + 10);
    const finNormal = new Date(normal);
    finNormal.setDate(normal.getDate() + 5);

    testConges.push({
      userId: users[3] ? users[3].id : users[0].id,
      type: 'Congé sans solde',
      dateDebut: normal.toISOString(),
      dateFin: finNormal.toISOString(),
      statut: 'en attente'
    });

    // 5. Congé LOINTAIN (30 jours - pas de badge)
    const lointain = new Date(maintenant);
    lointain.setDate(maintenant.getDate() + 30);
    const finLointain = new Date(lointain);
    finLointain.setDate(lointain.getDate() + 7);

    testConges.push({
      userId: users[4] ? users[4].id : users[0].id,
      type: 'Congé maladie',
      dateDebut: lointain.toISOString(),
      dateFin: finLointain.toISOString(),
      statut: 'en attente'
    });

    // 6. Congé DÉJÀ APPROUVÉ (pour tester le tri)
    const approuve = new Date(maintenant);
    approuve.setDate(maintenant.getDate() + 3);
    const finApprouve = new Date(approuve);
    finApprouve.setDate(approuve.getDate() + 2);

    testConges.push({
      userId: users[0].id,
      type: 'RTT',
      dateDebut: approuve.toISOString(),
      dateFin: finApprouve.toISOString(),
      statut: 'approuvé'
    });

    // 7. Congé REFUSÉ (pour tester le tri)
    const refuse = new Date(maintenant);
    refuse.setDate(maintenant.getDate() + 1);
    const finRefuse = new Date(refuse);
    finRefuse.setDate(refuse.getDate() + 1);

    testConges.push({
      userId: users[1] ? users[1].id : users[0].id,
      type: 'Congé payé',
      dateDebut: refuse.toISOString(),
      dateFin: finRefuse.toISOString(),
      statut: 'refusé'
    });

    // Créer tous les congés de test
    for (let i = 0; i < testConges.length; i++) {
      const conge = testConges[i];
      try {
        const created = await prisma.conge.create({
          data: conge,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                nom: true,
                prenom: true
              }
            }
          }
        });

        const joursAvant = Math.ceil((new Date(created.dateDebut) - maintenant) / (1000 * 60 * 60 * 24));
        let badge = 'Aucun';
        
        if (created.statut === 'en attente') {
          if (joursAvant === 1) badge = '🚨 DEMAIN (rouge animé)';
          else if (joursAvant <= 3) badge = '🔥 URGENT (rouge)';
          else if (joursAvant <= 7) badge = '⚡ EXPRESS (brand)';
        }

        console.log(`✅ Congé créé: ${created.user.email}`);
        console.log(`   📅 Dates: ${created.dateDebut.toISOString().split('T')[0]} → ${created.dateFin.toISOString().split('T')[0]}`);
        console.log(`   ⏰ Jours avant: ${joursAvant}`);
        console.log(`   🏷️  Badge attendu: ${badge}`);
        console.log(`   📊 Statut: ${created.statut}`);
        console.log(`   🎯 Type: ${created.type}`);
        console.log('');

      } catch (error) {
        console.error(`❌ Erreur création congé ${i + 1}:`, error.message);
      }
    }

    console.log('🎉 CONGÉS DE TEST CRÉÉS AVEC SUCCÈS !');
    console.log('\n📋 ORDRE ATTENDU DANS L\'INTERFACE:');
    console.log('1. 🚨 DEMAIN (badge rouge animé)');
    console.log('2. 🔥 URGENT (badge rouge)');
    console.log('3. ⚡ EXPRESS (badge brand)');
    console.log('4. ✅ Normal (pas de badge)');
    console.log('5. 📅 Lointain (pas de badge)');
    console.log('6. ✅ Approuvé (après les en attente)');
    console.log('7. ❌ Refusé (en dernier)');
    console.log('\n🧪 Allez sur la page des congés pour vérifier le tri !');

  } catch (error) {
    console.error('❌ Erreur lors de la création des congés de test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  createTestCongesUrgence();
}

module.exports = { createTestCongesUrgence };
