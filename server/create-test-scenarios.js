const prisma = require('./prisma/client');

async function createTestScenarios() {
  try {
    console.log('🎭 Création de scénarios de test pour Timeline...\n');

    // Trouver l'utilisateur Jordan
    const user = await prisma.user.findFirst({
      where: { email: 'yjordan496@gmail.com' }
    });

    if (!user) {
      console.log('❌ Utilisateur yjordan496@gmail.com non trouvé');
      return;
    }

    console.log(`✅ Utilisateur: ${user.prenom} ${user.nom} (ID: ${user.id})\n`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Nettoyer les données du jour
    console.log('🧹 Nettoyage des données du jour...');
    await prisma.pointage.deleteMany({
      where: { userId: user.id, horodatage: { gte: today } }
    });
    await prisma.anomalie.deleteMany({
      where: { employeId: user.id, date: { gte: today } }
    });

    // SCÉNARIO: Journée avec 2 shifts + anomalies variées
    console.log('\n📍 Création des pointages (2 shifts)...');
    
    const pointages = [
      { type: 'arrivee', h: 8, m: 15 },   // Retard 15 min (prévu 8h)
      { type: 'depart', h: 12, m: 0 },    // Pause déjeuner
      { type: 'arrivee', h: 13, m: 30 },  // Retour pause
      { type: 'depart', h: 18, m: 45 },   // Fin + heures sup (prévu 18h)
    ];
    
    for (const p of pointages) {
      const d = new Date(today);
      d.setHours(p.h, p.m, 0, 0);
      await prisma.pointage.create({
        data: {
          userId: user.id,
          type: p.type,
          horodatage: d
        }
      });
      console.log(`  ✓ ${p.type} à ${p.h}:${p.m.toString().padStart(2, '0')}`);
    }

    // Anomalies avec différents statuts
    console.log('\n⚠️ Création des anomalies...');
    
    const anomalies = [
      {
        type: 'retard',
        statut: 'validee',
        details: { heureReelle: '08:15', heurePrevue: '08:00', ecartMinutes: 15 }
      },
      {
        type: 'heures_supplementaires',
        statut: 'en_attente',
        details: { heureReelle: '18:45', heurePrevue: '18:00', heuresSupp: 0.75, ecartMinutes: 45 }
      },
      {
        type: 'depart_anticipe',
        statut: 'refusee',
        details: { heureReelle: '12:30', heurePrevue: '13:00', ecartMinutes: 30 }
      }
    ];
    
    for (const a of anomalies) {
      await prisma.anomalie.create({
        data: {
          employeId: user.id,
          type: a.type,
          date: today,
          statut: a.statut,
          details: a.details,
          description: `Test ${a.type}`,
          gravite: 'moyenne'
        }
      });
      console.log(`  ✓ ${a.type} [${a.statut}]`);
    }

    console.log('\n✅ Scénario de test créé avec succès!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Résumé:');
    console.log('  • 4 pointages (2 shifts)');
    console.log('  • Shift 1: 08:15 → 12:00 (3h45)');
    console.log('  • Shift 2: 13:30 → 18:45 (5h15)');
    console.log('  • Total: ~9h de travail');
    console.log('  • 3 anomalies:');
    console.log('    - Retard 15 min [VALIDÉE ✓]');
    console.log('    - Heures sup +45 min [EN ATTENTE ⏳]');
    console.log('    - Départ anticipé 30 min [REFUSÉE ✗]');
    console.log('\n👉 Connectez-vous avec yjordan496@gmail.com / Test1234!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestScenarios();