// Script pour alimenter la base de données avec des données de test pour les statistiques RH
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Fonction utilitaire pour générer une date aléatoire dans une plage
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Fonction utilitaire pour générer une heure aléatoire
function randomHour(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedStatsData() {
  console.log('🌱 Début de l\'alimentation de la base de données pour les statistiques...\n');

  try {
    // 1. Créer 15 employés de test
    console.log('👥 Création de 15 employés...');
    const employesData = [
      { prenom: 'Sophie', nom: 'Martin', email: 'sophie.martin@example.com', categorie: 'cadre' },
      { prenom: 'Thomas', nom: 'Dubois', email: 'thomas.dubois@example.com', categorie: 'employe' },
      { prenom: 'Emma', nom: 'Bernard', email: 'emma.bernard@example.com', categorie: 'employe' },
      { prenom: 'Lucas', nom: 'Petit', email: 'lucas.petit@example.com', categorie: 'technicien' },
      { prenom: 'Léa', nom: 'Robert', email: 'lea.robert@example.com', categorie: 'employe' },
      { prenom: 'Hugo', nom: 'Richard', email: 'hugo.richard@example.com', categorie: 'cadre' },
      { prenom: 'Chloé', nom: 'Durand', email: 'chloe.durand@example.com', categorie: 'employe' },
      { prenom: 'Nathan', nom: 'Moreau', email: 'nathan.moreau@example.com', categorie: 'technicien' },
      { prenom: 'Camille', nom: 'Simon', email: 'camille.simon@example.com', categorie: 'employe' },
      { prenom: 'Louis', nom: 'Laurent', email: 'louis.laurent@example.com', categorie: 'employe' },
      { prenom: 'Marie', nom: 'Lefevre', email: 'marie.lefevre@example.com', categorie: 'cadre' },
      { prenom: 'Alexandre', nom: 'Michel', email: 'alexandre.michel@example.com', categorie: 'employe' },
      { prenom: 'Julie', nom: 'Garcia', email: 'julie.garcia@example.com', categorie: 'employe' },
      { prenom: 'Maxime', nom: 'Martinez', email: 'maxime.martinez@example.com', categorie: 'technicien' },
      { prenom: 'Laura', nom: 'David', email: 'laura.david@example.com', categorie: 'employe' }
    ];

    const hashedPassword = await bcrypt.hash('Test123!', 10);
    const employes = [];

    for (const emp of employesData) {
      // Vérifier si l'email existe déjà
      const existing = await prisma.user.findUnique({
        where: { email: emp.email }
      });

      if (existing) {
        console.log(`  ⏭️  ${emp.prenom} ${emp.nom} existe déjà`);
        employes.push(existing);
      } else {
        const dateEmbauche = randomDate(
          new Date(2023, 0, 1),
          new Date(2024, 11, 31)
        );

        const employe = await prisma.user.create({
          data: {
            email: emp.email,
            password: hashedPassword,
            nom: emp.nom,
            prenom: emp.prenom,
            telephone: `06${Math.floor(10000000 + Math.random() * 90000000)}`,
            categorie: emp.categorie,
            dateEmbauche,
            role: 'employee',
            statut: 'actif',
            firstLoginDone: true
          }
        });
        console.log(`  ✅ ${emp.prenom} ${emp.nom} créé(e)`);
        employes.push(employe);
      }
    }

    console.log(`\n✅ ${employes.length} employés prêts\n`);

    // 2. Créer des pointages sur les 30 derniers jours
    console.log('⏰ Création de pointages (30 derniers jours)...');
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    let pointagesCount = 0;

    for (let day = 0; day < 30; day++) {
      const currentDate = new Date(thirtyDaysAgo);
      currentDate.setDate(thirtyDaysAgo.getDate() + day);
      
      // Ignorer les weekends
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;

      for (const employe of employes) {
        // 85% de chance de venir travailler
        if (Math.random() > 0.15) {
          // Heure d'arrivée : entre 7h et 10h (avec pics de retards pour certains)
          const heureArrivee = employe.nom === 'Dupont' || employe.nom === 'Lambert' 
            ? randomHour(8, 10) // Retards fréquents
            : randomHour(7, 9);  // Ponctuel
          
          const minuteArrivee = Math.floor(Math.random() * 60);
          const dateArrivee = new Date(currentDate);
          dateArrivee.setHours(heureArrivee, minuteArrivee, 0);

          // Créer pointage d'entrée
          await prisma.pointage.create({
            data: {
              userId: employe.id,
              type: 'ENTRÉE',
              horodatage: dateArrivee
            }
          });

          // Heure de départ : entre 16h et 19h
          const heureDepart = randomHour(16, 19);
          const minuteDepart = Math.floor(Math.random() * 60);
          const dateDepart = new Date(currentDate);
          dateDepart.setHours(heureDepart, minuteDepart, 0);

          // Créer pointage de sortie
          await prisma.pointage.create({
            data: {
              userId: employe.id,
              type: 'SORTIE',
              horodatage: dateDepart
            }
          });

          pointagesCount += 2;
        }
      }
    }

    console.log(`✅ ${pointagesCount} pointages créés\n`);

    // 3. Créer des congés sur les 6 derniers mois
    console.log('🏖️  Création de congés (6 derniers mois)...');
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    const typesConges = ['Congés payés', 'Maladie', 'RTT', 'Sans solde', 'Autres'];
    const statuts = ['approuvé', 'en attente', 'refusé'];
    let congesCount = 0;

    for (const employe of employes) {
      // Chaque employé a entre 2 et 8 congés
      const nbConges = Math.floor(Math.random() * 7) + 2;
      
      for (let i = 0; i < nbConges; i++) {
        const dateDebut = randomDate(sixMonthsAgo, today);
        const dateFin = new Date(dateDebut);
        dateFin.setDate(dateDebut.getDate() + Math.floor(Math.random() * 10) + 1);

        const type = typesConges[Math.floor(Math.random() * typesConges.length)];
        const statut = i === 0 ? 'en attente' : statuts[Math.floor(Math.random() * statuts.length)];

        await prisma.conge.create({
          data: {
            userId: employe.id,
            type,
            dateDebut,
            dateFin,
            statut
          }
        });

        congesCount++;
      }
    }

    console.log(`✅ ${congesCount} congés créés\n`);

    // 4. Créer quelques employés "problématiques" (pour tester les alertes)
    console.log('⚠️  Ajout d\'employés problématiques pour tests...');
    
    // Employé avec beaucoup d'absences
    const jeanDupont = await prisma.user.findFirst({
      where: { nom: 'Dupont' }
    });

    if (!jeanDupont) {
      const jean = await prisma.user.create({
        data: {
          email: 'jean.dupont@example.com',
          password: hashedPassword,
          nom: 'Dupont',
          prenom: 'Jean',
          telephone: '0612345678',
          categorie: 'employe',
          dateEmbauche: new Date(2023, 5, 1),
          role: 'employee',
          statut: 'actif',
          firstLoginDone: true
        }
      });

      // Ajouter 10 absences récentes
      for (let i = 0; i < 10; i++) {
        const dateDebut = randomDate(thirtyDaysAgo, today);
        const dateFin = new Date(dateDebut);
        dateFin.setDate(dateDebut.getDate() + 1);

        await prisma.conge.create({
          data: {
            userId: jean.id,
            type: 'Maladie',
            dateDebut,
            dateFin,
            statut: 'approuvé'
          }
        });
      }

      console.log('  ✅ Jean Dupont créé avec 10 absences (critical)');
    }

    // Employé avec retards modérés
    const marieLambert = await prisma.user.findFirst({
      where: { nom: 'Lambert' }
    });

    if (!marieLambert) {
      const marie = await prisma.user.create({
        data: {
          email: 'marie.lambert@example.com',
          password: hashedPassword,
          nom: 'Lambert',
          prenom: 'Marie',
          telephone: '0698765432',
          categorie: 'employe',
          dateEmbauche: new Date(2023, 8, 1),
          role: 'employee',
          statut: 'actif',
          firstLoginDone: true
        }
      });

      // Ajouter 7 retards (arrivées après 9h)
      for (let i = 0; i < 7; i++) {
        const dateRetard = new Date(thirtyDaysAgo);
        dateRetard.setDate(thirtyDaysAgo.getDate() + i * 4);
        dateRetard.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0);

        await prisma.pointage.create({
          data: {
            userId: marie.id,
            type: 'ENTRÉE',
            horodatage: dateRetard
          }
        });

        // Sortie
        const dateSortie = new Date(dateRetard);
        dateSortie.setHours(17, 30, 0);
        
        await prisma.pointage.create({
          data: {
            userId: marie.id,
            type: 'SORTIE',
            horodatage: dateSortie
          }
        });
      }

      // Ajouter 6 absences
      for (let i = 0; i < 6; i++) {
        const dateDebut = randomDate(thirtyDaysAgo, today);
        const dateFin = new Date(dateDebut);
        dateFin.setDate(dateDebut.getDate() + 1);

        await prisma.conge.create({
          data: {
            userId: marie.id,
            type: Math.random() > 0.5 ? 'Maladie' : 'Congés payés',
            dateDebut,
            dateFin,
            statut: 'approuvé'
          }
        });
      }

      console.log('  ✅ Marie Lambert créée avec 6 absences et 7 retards (warning)');
    }

    console.log('\n🎉 Alimentation terminée avec succès!\n');
    console.log('📊 Résumé:');
    console.log(`   - ${employes.length} employés`);
    console.log(`   - ${pointagesCount} pointages`);
    console.log(`   - ${congesCount} congés`);
    console.log(`   - 2 employés problématiques\n`);
    console.log('✅ Vous pouvez maintenant tester la page statistiques!\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'alimentation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
seedStatsData()
  .catch((error) => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });
