/**
 * 📊 GÉNÉRATEUR DE DONNÉES DE TEST RÉALISTES
 * Crée des scénarios de pointage variés pour tester le système
 */

const { PrismaClient } = require('@prisma/client');
const { getWorkDayBounds } = require('./config/workDayConfig');

const prisma = new PrismaClient();

// 🎯 Profils d'employés réalistes
const PROFILS_EMPLOYES = {
  bureau_standard: {
    nom: "Marie",
    prenom: "Dupont", 
    email: "marie.dupont@test.com",
    heures: { debut: 9, fin: 17 }, // 9h-17h
    variante: 15, // ±15 min de variation
    pauseDejeunee: true
  },
  equipe_matin: {
    nom: "Pierre",
    prenom: "Martin",
    email: "pierre.martin@test.com", 
    heures: { debut: 6, fin: 14 }, // 6h-14h
    variante: 10,
    pauseDejeunee: false
  },
  equipe_nuit: {
    nom: "Sophie",
    prenom: "Bernard",
    email: "sophie.bernard@test.com",
    heures: { debut: 22, fin: 6 }, // 22h-6h+1 (nuit)
    variante: 20,
    pauseDejeunee: false
  },
  temps_partiel: {
    nom: "Ahmed",
    prenom: "Benali", 
    email: "ahmed.benali@test.com",
    heures: { debut: 14, fin: 18 }, // 14h-18h (4h/jour)
    variante: 5,
    pauseDejeunee: false
  },
  manager: {
    nom: "Julie",
    prenom: "Leroy",
    email: "julie.leroy@test.com",
    heures: { debut: 8, fin: 19 }, // 8h-19h (longue journée)
    variante: 30,
    pauseDejeunee: true
  }
};

async function genererDonneesTest() {
  console.log('📊 === GÉNÉRATION DONNÉES DE TEST RÉALISTES ===\n');

  try {
    // 🧹 Nettoyer seulement les pointages de test existants
    console.log('🧹 Nettoyage des pointages de test existants...');
    
    // Supprimer les pointages des utilisateurs de test existants
    const pointagesSupprimes = await prisma.pointage.deleteMany({
      where: {
        user: {
          email: { endsWith: '@test.com' }
        }
      }
    });
    console.log(`  📍 ${pointagesSupprimes.count} pointages supprimés`);

    // 👥 Créer ou réutiliser les utilisateurs de test
    console.log('\n👥 Création/récupération des utilisateurs de test...');
    const utilisateurs = {};
    
    for (const [profil, data] of Object.entries(PROFILS_EMPLOYES)) {
      // Vérifier si l'utilisateur existe déjà
      let user = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (!user) {
        // Créer le nouvel utilisateur
        user = await prisma.user.create({
          data: {
            nom: data.nom,
            prenom: data.prenom,
            email: data.email,
            password: '$2b$10$hashedpassword', // Password hashé bidon
            role: 'employee',
            statut: 'actif',
            categorie: profil,
            dateEmbauche: new Date('2024-01-15'),
            firstLoginDone: true
          }
        });
        console.log(`  ✅ ${data.prenom} ${data.nom} créé (${profil}) - ID: ${user.id}`);
      } else {
        console.log(`  ♻️  ${data.prenom} ${data.nom} réutilisé (${profil}) - ID: ${user.id}`);
      }
      
      utilisateurs[profil] = user;
    }

    // 📅 Générer des pointages pour les 7 derniers jours
    console.log('\n📅 Génération des pointages (7 derniers jours)...');
    
    for (let jourOffset = 6; jourOffset >= 0; jourOffset--) {
      const dateJour = new Date();
      dateJour.setDate(dateJour.getDate() - jourOffset);
      
      console.log(`\n📊 Jour ${dateJour.toLocaleDateString('fr-FR')}:`);
      
      for (const [profil, data] of Object.entries(PROFILS_EMPLOYES)) {
        const user = utilisateurs[profil];
        
        // 🎲 Probabilité de présence (simuler absences)
        const probabilitePresence = jourOffset === 0 ? 1.0 : // Aujourd'hui: toujours présent
                                   jourOffset <= 2 ? 0.95 : // 2 derniers jours: 95%
                                   0.85; // Plus ancien: 85%
        
        if (Math.random() > probabilitePresence) {
          console.log(`    😴 ${data.prenom} absent`);
          continue;
        }

        await genererPointagesJour(user, profil, data, dateJour);
      }
    }

    // 📊 Générer un rapport de synthèse
    await genererRapportTest();

    console.log('\n🎉 Génération terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function genererPointagesJour(user, profil, config, dateBase) {
  try {
    const { heures, variante, pauseDejeunee } = config;
    
    // 📅 Calculer les heures d'arrivée et départ avec variation
    const variationArrivee = (Math.random() - 0.5) * 2 * variante; // ±variante minutes
    const variationDepart = (Math.random() - 0.5) * 2 * variante;

    let heureArrivee, heureDepart;

    if (profil === 'equipe_nuit') {
      // 🌙 Gestion spéciale pour l'équipe de nuit (22h → 6h+1)
      heureArrivee = new Date(dateBase);
      heureArrivee.setHours(heures.debut, Math.floor(variationArrivee), 0, 0);
      
      heureDepart = new Date(dateBase);
      heureDepart.setDate(heureDepart.getDate() + 1); // Lendemain
      heureDepart.setHours(heures.fin, Math.floor(variationDepart), 0, 0);
    } else {
      // 🌅 Horaires normaux (même jour)
      heureArrivee = new Date(dateBase);
      heureArrivee.setHours(heures.debut, Math.floor(variationArrivee), 0, 0);
      
      heureDepart = new Date(dateBase);
      heureDepart.setHours(heures.fin, Math.floor(variationDepart), 0, 0);
    }

    // 📍 Créer le pointage d'arrivée
    const pointageArrivee = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'arrivee',
        horodatage: heureArrivee
      }
    });

    let pointages = [pointageArrivee];

    // 🍽️ Gestion pause déjeuner si nécessaire
    if (pauseDejeunee && Math.random() > 0.2) { // 80% prennent une pause
      const heureSortiePause = new Date(dateBase);
      const heureRetourPause = new Date(dateBase);
      
      // Pause entre 12h et 14h
      const debutPause = 12 + Math.random() * 1; // 12h-13h
      const dureePause = 30 + Math.random() * 60; // 30-90 min
      
      heureSortiePause.setHours(Math.floor(debutPause), (debutPause % 1) * 60, 0, 0);
      heureRetourPause.setTime(heureSortiePause.getTime() + dureePause * 60000);

      const sortiePause = await prisma.pointage.create({
        data: {
          userId: user.id,
          type: 'depart',
          horodatage: heureSortiePause
        }
      });

      const retourPause = await prisma.pointage.create({
        data: {
          userId: user.id,
          type: 'arrivee', 
          horodatage: heureRetourPause
        }
      });

      pointages.push(sortiePause, retourPause);
    }

    // 📍 Créer le pointage de départ final
    const pointageDepart = await prisma.pointage.create({
      data: {
        userId: user.id,
        type: 'depart',
        horodatage: heureDepart
      }
    });

    pointages.push(pointageDepart);

    // 📊 Calculer et afficher le temps de travail
    let totalMinutes = 0;
    for (let i = 0; i < pointages.length - 1; i++) {
      const debut = pointages[i];
      const fin = pointages[i + 1];
      
      if (debut.type === 'arrivee' && fin.type === 'depart') {
        const diffMs = new Date(fin.horodatage) - new Date(debut.horodatage);
        totalMinutes += Math.floor(diffMs / 60000);
        i++; // Skip next (déjà utilisé comme fin)
      }
    }

    const heuresTravaillees = (totalMinutes / 60).toFixed(1);
    const emoji = profil === 'equipe_nuit' ? '🌙' : 
                  profil === 'equipe_matin' ? '🌅' : 
                  profil === 'temps_partiel' ? '⏰' :
                  profil === 'manager' ? '💼' : '🏢';
    
    console.log(`    ${emoji} ${config.prenom}: ${heuresTravaillees}h (${pointages.length} pointages)`);

  } catch (error) {
    console.error(`❌ Erreur génération ${config.prenom}:`, error.message);
  }
}

async function genererRapportTest() {
  console.log('\n📊 === RAPPORT DE SYNTHÈSE ===');

  try {
    // 📈 Statistiques utilisateurs
    const nbUtilisateurs = await prisma.user.count({
      where: { email: { endsWith: '@test.com' } }
    });

    // 📈 Statistiques pointages
    const nbPointages = await prisma.pointage.count({
      where: {
        user: { email: { endsWith: '@test.com' } }
      }
    });

    // 📊 Pointages par utilisateur
    const pointagesParUser = await prisma.pointage.groupBy({
      by: ['userId'],
      where: {
        user: { email: { endsWith: '@test.com' } }
      },
      _count: { id: true },
      _max: { horodatage: true },
      _min: { horodatage: true }
    });

    console.log(`👥 Utilisateurs créés: ${nbUtilisateurs}`);
    console.log(`📍 Pointages générés: ${nbPointages}`);
    console.log(`📊 Moyenne pointages/user: ${Math.round(nbPointages / nbUtilisateurs)}`);

    // 📅 Test de la logique journée de travail
    const { debutJournee, finJournee } = getWorkDayBounds();
    const pointagesAujourdhui = await prisma.pointage.count({
      where: {
        user: { email: { endsWith: '@test.com' } },
        horodatage: { gte: debutJournee, lt: finJournee }
      }
    });

    console.log(`\n🗓️  Pointages dans la journée de travail actuelle: ${pointagesAujourdhui}`);
    console.log(`⏰ Période: ${debutJournee.toLocaleString()} → ${finJournee.toLocaleString()}`);

    // 🌙 Vérification spéciale équipe de nuit
    const equipeNuitUser = await prisma.user.findFirst({
      where: { 
        email: 'sophie.bernard@test.com',
        categorie: 'equipe_nuit'
      }
    });

    if (equipeNuitUser) {
      const pointagesNuit = await prisma.pointage.findMany({
        where: {
          userId: equipeNuitUser.id,
          horodatage: { gte: debutJournee, lt: finJournee }
        },
        orderBy: { horodatage: 'asc' }
      });

      console.log(`\n🌙 Test équipe de nuit (Sophie):`);
      console.log(`   Pointages dans journée actuelle: ${pointagesNuit.length}`);
      
      if (pointagesNuit.length > 0) {
        const premier = pointagesNuit[0];
        const dernier = pointagesNuit[pointagesNuit.length - 1];
        console.log(`   Premier: ${premier.horodatage.toLocaleString()} (${premier.type})`);
        console.log(`   Dernier: ${dernier.horodatage.toLocaleString()} (${dernier.type})`);
        
        // Calcul temps travaillé pour équipe de nuit
        let totalMinutesNuit = 0;
        for (let i = 0; i < pointagesNuit.length - 1; i++) {
          if (pointagesNuit[i].type === 'arrivee' && pointagesNuit[i + 1].type === 'depart') {
            const diffMs = new Date(pointagesNuit[i + 1].horodatage) - new Date(pointagesNuit[i].horodatage);
            totalMinutesNuit += Math.floor(diffMs / 60000);
            i++;
          }
        }
        console.log(`   Temps travaillé: ${(totalMinutesNuit / 60).toFixed(1)}h`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur génération rapport:', error);
  }
}

// 🚀 Lancer la génération
if (require.main === module) {
  genererDonneesTest().catch(console.error);
}

module.exports = { genererDonneesTest };
