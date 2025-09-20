// Script pour tester les conflits de congés
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestConflictScenarios() {
  console.log("🏗️ Création des scénarios de test pour les conflits de congés...");

  try {
    // D'abord, récupérer les employés existants
    const employes = await prisma.user.findMany({
      where: { role: 'employe' }
    });

    if (employes.length < 6) {
      console.log("❌ Pas assez d'employés pour créer des scénarios réalistes");
      return;
    }

    // Nettoyer les congés existants pour avoir un test propre
    await prisma.conge.deleteMany({});

    // Scénario 1: Conflit CRITIQUE - 3 personnes du même pôle en même temps
    console.log("📅 Scénario 1: Conflit CRITIQUE (3 cuisiniers absents le même jour)");
    
    const cuisiniers = employes.filter(e => e.categorie === 'cuisine').slice(0, 3);
    const dateConflitCritique = new Date('2024-12-20');
    const finConflitCritique = new Date('2024-12-22');

    for (let i = 0; i < cuisiniers.length; i++) {
      const cuisinier = cuisiniers[i];
      const statut = i === 0 ? 'en attente' : 'approuvé'; // Premier en attente, autres déjà approuvés
      
      await prisma.conge.create({
        data: {
          userId: cuisinier.id,
          type: i === 0 ? 'CP' : (i === 1 ? 'RTT' : 'CP'),
          dateDebut: dateConflitCritique,
          dateFin: finConflitCritique,
          statut: statut,
          vu: true
        }
      });

      console.log(`   ✅ ${cuisinier.nom} - ${statut}`);
    }

    // Scénario 2: Conflit ÉLEVÉ - 2 serveurs sur 3 absents
    console.log("📅 Scénario 2: Conflit ÉLEVÉ (2 serveurs sur 3)");
    
    const serveurs = employes.filter(e => e.categorie === 'service').slice(0, 3);
    const dateConflitEleve = new Date('2024-12-27');
    const finConflitEleve = new Date('2024-12-29');

    for (let i = 0; i < 2; i++) {
      const serveur = serveurs[i];
      const statut = i === 0 ? 'en attente' : 'approuvé';
      
      await prisma.conge.create({
        data: {
          userId: serveur.id,
          type: 'CP',
          dateDebut: dateConflitEleve,
          dateFin: finConflitEleve,
          statut: statut,
          vu: true
        }
      });

      console.log(`   ✅ ${serveur.nom} - ${statut}`);
    }

    // Scénario 3: Conflit MODÉRÉ - Chevauchement partiel
    console.log("📅 Scénario 3: Conflit MODÉRÉ (chevauchement partiel)");
    
    const management = employes.filter(e => e.categorie === 'management').slice(0, 2);
    if (management.length >= 2) {
      // Premier manager : 15-17 décembre (approuvé)
      await prisma.conge.create({
        data: {
          userId: management[0].id,
          type: 'RTT',
          dateDebut: new Date('2024-12-15'),
          dateFin: new Date('2024-12-17'),
          statut: 'approuvé',
          vu: true
        }
      });

      // Deuxième manager : 16-18 décembre (en attente - conflit partiel)
      await prisma.conge.create({
        data: {
          userId: management[1].id,
          type: 'CP',
          dateDebut: new Date('2024-12-16'),
          dateFin: new Date('2024-12-18'),
          statut: 'en attente',
          vu: true
        }
      });

      console.log(`   ✅ ${management[0].nom} - approuvé`);
      console.log(`   ✅ ${management[1].nom} - en attente`);
    }

    // Scénario 4: AUCUN conflit - Demande isolée
    console.log("📅 Scénario 4: AUCUN conflit (demande isolée)");
    
    const employeIsole = employes.find(e => !cuisiniers.includes(e) && !serveurs.includes(e) && !management.includes(e));
    if (employeIsole) {
      await prisma.conge.create({
        data: {
          userId: employeIsole.id,
          type: 'CP',
          dateDebut: new Date('2024-12-10'),
          dateFin: new Date('2024-12-12'),
          statut: 'en attente',
          vu: true
        }
      });

      console.log(`   ✅ ${employeIsole.nom} - en attente (sans conflit)`);
    }

    // Scénario 5: Demandes futures pour tester la prévision
    console.log("📅 Scénario 5: Demandes futures (prévision)");
    
    const dateFuture = new Date();
    dateFuture.setDate(dateFuture.getDate() + 30); // Dans 30 jours
    
    const employePrevision = employes.find(e => e.categorie === 'service' && !serveurs.slice(0, 2).includes(e));
    if (employePrevision) {
      await prisma.conge.create({
        data: {
          userId: employePrevision.id,
          type: 'RTT',
          dateDebut: dateFuture,
          dateFin: new Date(dateFuture.getTime() + 24 * 60 * 60 * 1000), // +1 jour
          statut: 'en attente',
          vu: false // Nouvelle demande non vue
        }
      });

      console.log(`   ✅ ${employePrevision.nom} - demande future`);
    }

    // Afficher le résumé
    const totalConges = await prisma.conge.count();
    const congesEnAttente = await prisma.conge.count({ where: { statut: 'en attente' } });
    const congesApprouves = await prisma.conge.count({ where: { statut: 'approuvé' } });

    console.log("\n📊 RÉSUMÉ DES SCÉNARIOS CRÉÉS:");
    console.log(`   Total congés: ${totalConges}`);
    console.log(`   En attente: ${congesEnAttente}`);
    console.log(`   Approuvés: ${congesApprouves}`);
    console.log("\n🎯 Test maintenant l'analyse des conflits dans l'interface !");

  } catch (error) {
    console.error("❌ Erreur lors de la création des scénarios:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestConflictScenarios();
