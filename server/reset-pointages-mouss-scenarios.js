const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetPointagesMouss() {
  try {
    console.log('🧪 RESET ET CRÉATION DE SCÉNARIOS DE TEST POUR test@Mouss.com...\n');

    // 1. Trouver l'utilisateur test@Mouss.com
    const moussUser = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });

    if (!moussUser) {
      console.log('❌ Utilisateur test@Mouss.com non trouvé');
      return;
    }

    console.log('✅ Utilisateur trouvé:', {
      id: moussUser.id,
      email: moussUser.email,
      nom: moussUser.nom,
      prenom: moussUser.prenom
    });

    // 2. Supprimer tous les pointages existants pour cet utilisateur
    console.log('\n🗑️ Suppression des pointages existants...');
    const deleteResult = await prisma.pointage.deleteMany({
      where: { userId: moussUser.id }
    });
    console.log(`✅ ${deleteResult.count} pointages supprimés`);

    // 3. Créer des scénarios de test variés
    await createScenarios(moussUser);

    console.log('\n🎉 SCÉNARIOS DE TEST CRÉÉS AVEC SUCCÈS !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createScenarios(user) {
  const scenarios = [
    {
      name: "Scénario 1: Journée normale (25 août)",
      date: "2025-08-25",
      pointages: [
        { type: "arrivee", heure: "09:05" },
        { type: "depart", heure: "17:03" }
      ]
    },
    {
      name: "Scénario 2: Travail de nuit (26 août)",
      date: "2025-08-26", 
      pointages: [
        { type: "arrivee", heure: "17:15" },
        { type: "depart", heure: "23:30" }
      ]
    },
    {
      name: "Scénario 3: Journée avec pauses multiples (27 août)",
      date: "2025-08-27",
      pointages: [
        { type: "arrivee", heure: "10:25" },
        { type: "depart", heure: "13:45" },
        { type: "arrivee", heure: "16:10" },
        { type: "depart", heure: "20:15" }
      ]
    },
    {
      name: "Scénario 4: Horaires décalés vs planning (28 août)",
      date: "2025-08-28",
      pointages: [
        { type: "arrivee", heure: "09:05" }, // Prévu: 18:06
        { type: "depart", heure: "17:00" }   // Prévu: 21:06
      ]
    },
    {
      name: "Scénario 5: Retards et départ anticipé (29 août)",
      date: "2025-08-29",
      pointages: [
        { type: "arrivee", heure: "09:30" }, // 30 min de retard
        { type: "depart", heure: "16:45" }   // 15 min plus tôt
      ]
    },
    {
      name: "Scénario 6: Heures supplémentaires (30 août)",
      date: "2025-08-30",
      pointages: [
        { type: "arrivee", heure: "08:00" }, // 1h plus tôt
        { type: "depart", heure: "19:30" }   // 1h30 d'heures sup
      ]
    },
    {
      name: "Scénario 7: Pointage partiel - arrivée sans départ (31 août)",
      date: "2025-08-31",
      pointages: [
        { type: "arrivee", heure: "08:45" }
        // Pas de départ (oubli)
      ]
    },
    {
      name: "Scénario 8: Journée avec multiples erreurs de pointage (1er septembre)",
      date: "2025-09-01",
      pointages: [
        { type: "arrivee", heure: "09:00" },
        { type: "arrivee", heure: "09:02" }, // Doublon (sera filtré)
        { type: "depart", heure: "12:30" },
        { type: "arrivee", heure: "14:00" },
        { type: "depart", heure: "18:00" },
        { type: "depart", heure: "18:01" }   // Doublon (sera filtré)
      ]
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n📅 ${scenario.name}`);
    
    for (const pointage of scenario.pointages) {
      const dateTime = createDateTime(scenario.date, pointage.heure);
      
      const nouveauPointage = await prisma.pointage.create({
        data: {
          userId: user.id,
          type: pointage.type,
          horodatage: dateTime
        }
      });

      console.log(`   ✅ ${pointage.type.toUpperCase()} à ${pointage.heure} (ID: ${nouveauPointage.id})`);
    }
  }
}

function createDateTime(dateStr, heureStr) {
  // dateStr format: "2025-08-25"
  // heureStr format: "09:05"
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = heureStr.split(':').map(Number);
  
  // Créer la date en heure locale Paris (UTC+2 en été)
  const date = new Date(year, month - 1, day, hour, minute);
  return date;
}

// Exécuter le script
resetPointagesMouss();
