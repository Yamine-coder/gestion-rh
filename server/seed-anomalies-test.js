const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Création des données de test...');

  // 1. Créer des employés de test
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const employes = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'admin',
        nom: 'Admin',
        prenom: 'Super',
        categorie: 'Management',
        statut: 'actif',
        firstLoginDone: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'mouss@test.com',
        password: hashedPassword,
        role: 'employee',
        nom: 'Mouss',
        prenom: 'Test',
        categorie: 'Employé',
        statut: 'actif',
        firstLoginDone: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'sarah@test.com',
        password: hashedPassword,
        role: 'employee',
        nom: 'Dupont',
        prenom: 'Sarah',
        categorie: 'Employé',
        statut: 'actif',
        firstLoginDone: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'jean@test.com',
        password: hashedPassword,
        role: 'employee',
        nom: 'Martin',
        prenom: 'Jean',
        categorie: 'Cadre',
        statut: 'actif',
        firstLoginDone: true
      }
    })
  ]);

  console.log(`✅ ${employes.length} employés créés`);

  // 2. Créer des pointages de test pour aujourd'hui et hier
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const pointages = [];

  // Pointages pour Mouss (retard)
  pointages.push(
    await prisma.pointage.create({
      data: {
        type: 'arrivee',
        horodatage: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 45), // Retard de 45 min
        userId: employes[1].id
      }
    }),
    await prisma.pointage.create({
      data: {
        type: 'depart',
        horodatage: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0),
        userId: employes[1].id
      }
    })
  );

  // Pointages pour Sarah (départ anticipé)
  pointages.push(
    await prisma.pointage.create({
      data: {
        type: 'arrivee',
        horodatage: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0),
        userId: employes[2].id
      }
    }),
    await prisma.pointage.create({
      data: {
        type: 'depart',
        horodatage: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30), // Départ anticipé
        userId: employes[2].id
      }
    })
  );

  // Pointages pour Jean (heures sup)
  pointages.push(
    await prisma.pointage.create({
      data: {
        type: 'arrivee',
        horodatage: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 8, 0),
        userId: employes[3].id
      }
    }),
    await prisma.pointage.create({
      data: {
        type: 'depart',
        horodatage: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 19, 30), // 2h30 sup
        userId: employes[3].id
      }
    })
  );

  // Pointages supplémentaires pour hier (plus de diversité)
  // Mouss hier - ponctuel
  pointages.push(
    await prisma.pointage.create({
      data: {
        type: 'arrivee',
        horodatage: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 8, 0),
        userId: employes[1].id
      }
    }),
    await prisma.pointage.create({
      data: {
        type: 'depart',
        horodatage: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 17, 0),
        userId: employes[1].id
      }
    })
  );

  // Admin avec des pointages normaux aujourd'hui
  pointages.push(
    await prisma.pointage.create({
      data: {
        type: 'arrivee',
        horodatage: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 45),
        userId: employes[0].id
      }
    }),
    await prisma.pointage.create({
      data: {
        type: 'depart',
        horodatage: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 15),
        userId: employes[0].id
      }
    })
  );

  console.log(`✅ ${pointages.length} pointages créés`);

  // 3. Créer des shifts/plannings de référence
  const shifts = await Promise.all([
    // Shift pour l'admin (aujourd'hui)
    prisma.shift.create({
      data: {
        employeId: employes[0].id,
        date: today,
        type: 'travail',
        segments: [
          {
            debut: '08:00',
            fin: '18:00',
            type: 'travail',
            pause: false
          }
        ]
      }
    }),
    // Shift pour Mouss (8h-17h aujourd'hui)
    prisma.shift.create({
      data: {
        employeId: employes[1].id,
        date: today,
        type: 'travail',
        segments: [
          {
            debut: '08:00',
            fin: '17:00',
            type: 'travail',
            pause: false
          }
        ]
      }
    }),
    // Shift pour Mouss (hier - normal)
    prisma.shift.create({
      data: {
        employeId: employes[1].id,
        date: yesterday,
        type: 'travail',
        segments: [
          {
            debut: '08:00',
            fin: '17:00',
            type: 'travail',
            pause: false
          }
        ]
      }
    }),
    // Shift pour Sarah (8h-17h aujourd'hui)
    prisma.shift.create({
      data: {
        employeId: employes[2].id,
        date: today,
        type: 'travail',
        segments: [
          {
            debut: '08:00',
            fin: '17:00',
            type: 'travail',
            pause: false
          }
        ]
      }
    }),
    // Shift pour Jean (8h-17h hier)
    prisma.shift.create({
      data: {
        employeId: employes[3].id,
        date: yesterday,
        type: 'travail',
        segments: [
          {
            debut: '08:00',
            fin: '17:00',
            type: 'travail',
            pause: false
          }
        ]
      }
    })
  ]);

  console.log(`✅ ${shifts.length} shifts créés`);

  // 4. Créer des anomalies de test
  const anomalies = await Promise.all([
    // Retard de Mouss
    prisma.anomalie.create({
      data: {
        employeId: employes[1].id,
        date: today,
        type: 'retard',
        gravite: 'attention',
        description: 'Retard de 45 minutes à l\'arrivée',
        details: {
          ecartMinutes: 45,
          heureAttendue: '08:00',
          heureReelle: '08:45'
        },
        statut: 'en_attente'
      }
    }),
    // Départ anticipé de Sarah
    prisma.anomalie.create({
      data: {
        employeId: employes[2].id,
        date: today,
        type: 'depart_anticipe',
        gravite: 'critique',
        description: 'Départ anticipé de 1h30',
        details: {
          ecartMinutes: -90,
          heureAttendue: '17:00',
          heureReelle: '15:30'
        },
        statut: 'en_attente'
      }
    }),
    // Heures supplémentaires de Jean
    prisma.anomalie.create({
      data: {
        employeId: employes[3].id,
        date: yesterday,
        type: 'heures_sup',
        gravite: 'info',
        description: 'Heures supplémentaires: 2h30',
        details: {
          heuresSupplementaires: 2.5,
          heureAttendue: '17:00',
          heureReelle: '19:30'
        },
        statut: 'en_attente',
        heuresExtra: 2.5
      }
    }),
    // Anomalie déjà traitée (validée)
    prisma.anomalie.create({
      data: {
        employeId: employes[1].id,
        date: yesterday,
        type: 'retard',
        gravite: 'info',
        description: 'Petit retard de 15 minutes',
        details: {
          ecartMinutes: 15,
          heureAttendue: '08:00',
          heureReelle: '08:15'
        },
        statut: 'validee',
        traitePar: employes[0].id, // Traité par l'admin
        traiteAt: new Date(),
        commentaire: 'Retard justifié par les transports'
      }
    }),
    // Absence totale (non prévu)
    prisma.anomalie.create({
      data: {
        employeId: employes[2].id,
        date: yesterday,
        type: 'absence_totale',
        gravite: 'critique',
        description: 'Absence complète non signalée',
        details: {
          raisonAbsence: 'Non signalée'
        },
        statut: 'refusee',
        traitePar: employes[0].id,
        traiteAt: new Date(Date.now() - 3600000), // Traité il y a 1h
        commentaire: 'Absence non justifiée - sanction appliquée'
      }
    })
  ]);

  console.log(`✅ ${anomalies.length} anomalies créées`);

  console.log('\n🎉 Données de test créées avec succès !');
  console.log('\n📊 Résumé des données :');
  console.log(`- ${employes.length} employés (1 admin + 3 employés)`);
  console.log(`- ${pointages.length} pointages (arrivées/départs avec types corrects)`);
  console.log(`- ${shifts.length} shifts/plannings`);
  console.log(`- ${anomalies.length} anomalies (3 en attente, 2 traitées)`);
  
  console.log('\n👥 Comptes créés :');
  console.log('- admin@test.com (mot de passe: password123) - Rôle: admin');
  console.log('- mouss@test.com (mot de passe: password123) - Rôle: employee');
  console.log('- sarah@test.com (mot de passe: password123) - Rôle: employee');
  console.log('- jean@test.com (mot de passe: password123) - Rôle: employee');
  
  console.log('\n🔄 Vous pouvez maintenant tester :');
  console.log('1. La connexion avec admin@test.com');
  console.log('2. La visualisation des anomalies dans le planning');
  console.log('3. Le traitement des anomalies en attente');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
