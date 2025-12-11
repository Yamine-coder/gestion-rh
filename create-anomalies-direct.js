// Script pour créer un admin temporaire et des anomalies de test
const prisma = require('./server/prisma/client');

async function createTestAnomalies() {
  try {
    console.log('\n🎯 Création d\'anomalies de test\n');
    console.log('='.repeat(60));

    // Vérifier ou créer un admin
    console.log('\n1️⃣  Vérification admin...');
    let admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!admin) {
      console.log('   Création d\'un compte admin...');
      admin = await prisma.user.create({
        data: {
          email: 'admin@test.com',
          password: '$2b$10$K8qhXqD.N8Lq5qD0E.xbLuVrHZ1n.mF.8b3hDzT/Kc9d8F5X6Y7Z8', // 'admin'
          role: 'admin',
          prenom: 'Admin',
          nom: 'Test'
        }
      });
      console.log('   ✓ Admin créé');
    } else {
      console.log(`   ✓ Admin trouvé: ${admin.email}`);
    }

    // Récupérer les employés (User avec role employee)
    const employes = await prisma.user.findMany({
      where: { role: { in: ['employee', 'manager'] } },
      take: 6,
      select: { id: true, prenom: true, nom: true }
    });

    if (employes.length === 0) {
      console.log('\n❌ Aucun employé trouvé dans la base');
      return;
    }

    console.log(`   ✓ ${employes.length} employé(s) trouvé(s)`);

    // Dates pour les anomalies
    const dates = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }

    // Scénarios d'anomalies
    const scenarios = [
      { type: 'retard_simple', gravite: 'info', desc: 'Retard de 7 minutes', emoji: '🔵' },
      { type: 'retard_modere', gravite: 'attention', desc: 'Retard de 22 minutes', emoji: '🟡' },
      { type: 'retard_critique', gravite: 'critique', desc: 'Retard de 1h10', emoji: '🔴' },
      { type: 'depart_anticipe', gravite: 'attention', desc: 'Départ 30min plus tôt', emoji: '🟡' },
      { type: 'depart_premature_critique', gravite: 'critique', desc: 'Départ 2h plus tôt', emoji: '🔴' },
      { type: 'heures_sup_auto_validees', gravite: 'ok', desc: 'Heures sup 40min', emoji: '🔵' },
      { type: 'heures_sup_a_valider', gravite: 'a_valider', desc: 'Heures sup 2h30', emoji: '🟠' },
      { type: 'hors_plage_in', gravite: 'hors_plage', desc: 'Arrivée 5h15', emoji: '🟣' },
      { type: 'missing_in', gravite: 'attention', desc: 'Pointage IN manquant', emoji: '🟡' },
      { type: 'missing_out', gravite: 'attention', desc: 'Pointage OUT manquant', emoji: '🟡' },
      { type: 'presence_non_prevue', gravite: 'attention', desc: 'Pointage sans shift', emoji: '🟡' },
      { type: 'hors_plage_out', gravite: 'hors_plage', desc: 'Départ 23h45', emoji: '🟣' }
    ];

    console.log('\n2️⃣  Création des anomalies...\n');

    let created = 0;

    for (let i = 0; i < scenarios.length && i < 12; i++) {
      const scenario = scenarios[i];
      const employe = employes[i % employes.length];
      const date = dates[i % dates.length];

      try {
        const anomalie = await prisma.anomalie.create({
          data: {
            employe: { connect: { id: employe.id } },
            date: date,
            type: scenario.type,
            gravite: scenario.gravite,
            description: `🧪 TEST - ${scenario.desc}`,
            statut: 'en_attente',
            details: {
              heurePrevue: '09:00',
              heureReelle: '09:15',
              ecartMinutes: 15
            }
          }
        });

        created++;
        console.log(`   ${scenario.emoji} ${employe.prenom} ${employe.nom} - ${scenario.type}`);
        console.log(`      ${scenario.desc} (${date.toISOString().split('T')[0]})`);

      } catch (error) {
        console.log(`   ✗ Échec: ${employe.prenom} - ${error.message}`);
      }
    }

    // Statistiques finales
    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ ${created} anomalie(s) créée(s)`);

    const stats = await prisma.anomalie.groupBy({
      by: ['statut'],
      _count: true
    });

    console.log('\n📊 Statistiques:');
    stats.forEach(s => {
      console.log(`   ${s.statut}: ${s._count} anomalie(s)`);
    });

    const byGravite = await prisma.anomalie.groupBy({
      by: ['gravite'],
      where: { statut: 'en_attente' },
      _count: true
    });

    console.log('\n🎯 En attente par gravité:');
    byGravite.forEach(g => {
      const emoji = g.gravite === 'critique' ? '🔴' :
                    g.gravite === 'attention' ? '🟡' :
                    g.gravite === 'hors_plage' ? '🟣' :
                    g.gravite === 'a_valider' ? '🟠' : '🔵';
      console.log(`   ${emoji} ${g.gravite}: ${g._count}`);
    });

    console.log('\n💡 Activez "Mode Comparaison" dans le planning web');
    console.log('   pour voir les badges d\'anomalies !\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAnomalies();
