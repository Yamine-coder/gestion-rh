// Script pour TOUT nettoyer et créer des données de test pour AUJOURD'HUI
// Usage: node scripts/reset-and-seed-today.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Employés réalistes avec catégories
const employesData = [
  { nom: 'Dupont', prenom: 'Marie', email: 'marie.dupont@restaurant.com', categorie: 'Cuisine', role: 'employee' },
  { nom: 'Martin', prenom: 'Pierre', email: 'pierre.martin@restaurant.com', categorie: 'Service', role: 'employee' },
  { nom: 'Bernard', prenom: 'Sophie', email: 'sophie.bernard@restaurant.com', categorie: 'Service', role: 'employee' },
  { nom: 'Dubois', prenom: 'Jean', email: 'jean.dubois@restaurant.com', categorie: 'Cuisine', role: 'employee' },
  { nom: 'Moreau', prenom: 'Claire', email: 'claire.moreau@restaurant.com', categorie: 'Bar', role: 'employee' },
  { nom: 'Laurent', prenom: 'Thomas', email: 'thomas.laurent@restaurant.com', categorie: 'Cuisine', role: 'employee' },
  { nom: 'Simon', prenom: 'Emma', email: 'emma.simon@restaurant.com', categorie: 'Service', role: 'employee' },
  { nom: 'Michel', prenom: 'Lucas', email: 'lucas.michel@restaurant.com', categorie: 'Bar', role: 'employee' },
  { nom: 'Garcia', prenom: 'Léa', email: 'lea.garcia@restaurant.com', categorie: 'Administration', role: 'employee' },
  { nom: 'David', prenom: 'Hugo', email: 'hugo.david@restaurant.com', categorie: 'Service', role: 'employee' },
  { nom: 'Richard', prenom: 'Camille', email: 'camille.richard@restaurant.com', categorie: 'Cuisine', role: 'employee' },
  { nom: 'Petit', prenom: 'Antoine', email: 'antoine.petit@restaurant.com', categorie: 'Plonge', role: 'employee' }
];

async function resetAndSeed() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔄 RESET COMPLET ET SEED POUR AUJOURD\'HUI');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // ÉTAPE 1: NETTOYAGE COMPLET
    console.log('📋 ÉTAPE 1/6: Nettoyage des données existantes...\n');
    
    console.log('   🗑️  Suppression des anomalies...');
    const deletedAnomalies = await prisma.anomalie.deleteMany();
    console.log(`      ✅ ${deletedAnomalies.count} anomalies supprimées`);
    
    console.log('   🗑️  Suppression des pointages...');
    const deletedPointages = await prisma.pointage.deleteMany();
    console.log(`      ✅ ${deletedPointages.count} pointages supprimés`);
    
    console.log('   🗑️  Suppression des congés...');
    const deletedConges = await prisma.conge.deleteMany();
    console.log(`      ✅ ${deletedConges.count} congés supprimés`);
    
    console.log('   🗑️  Suppression des plannings...');
    const deletedPlannings = await prisma.planning.deleteMany();
    console.log(`      ✅ ${deletedPlannings.count} plannings supprimés`);
    
    console.log('   🗑️  Suppression des shifts...');
    const deletedShifts = await prisma.shift.deleteMany();
    console.log(`      ✅ ${deletedShifts.count} shifts supprimés`);
    
    console.log('   🗑️  Suppression des employés (gardant les admins)...');
    const deletedUsers = await prisma.user.deleteMany({
      where: { role: 'employee' }
    });
    console.log(`      ✅ ${deletedUsers.count} employés supprimés\n`);

    // ÉTAPE 2: CRÉATION DES EMPLOYÉS
    console.log('📋 ÉTAPE 2/6: Création des employés...\n');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const employes = [];
    for (const employeData of employesData) {
      const employe = await prisma.user.create({
        data: {
          ...employeData,
          password: hashedPassword,
          dateEmbauche: new Date('2024-01-01'),
          statut: 'actif'
        }
      });
      employes.push(employe);
      console.log(`   ✅ ${employe.prenom} ${employe.nom} (${employe.categorie})`);
    }
    console.log(`\n   📊 Total: ${employes.length} employés créés\n`);

    // ÉTAPE 3: CRÉER DES POINTAGES AUJOURD'HUI
    console.log('📋 ÉTAPE 3/6: Création des pointages pour AUJOURD\'HUI...\n');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Scénario: 
    // - 4 employés ont pointé (ENTRÉE + SORTIE)
    // - 2 employés en congé approuvé
    // - 6 employés absents non planifiés
    
    const employesQuiPointent = employes.slice(0, 4); // Les 4 premiers pointent
    const employesEnConge = employes.slice(4, 6);     // 2 en congé
    // Les 6 restants (6-11) n'ont pas pointé et ne sont pas en congé
    
    for (const employe of employesQuiPointent) {
      // Pointage ENTRÉE le matin
      const heureEntree = new Date(today);
      heureEntree.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
      
      await prisma.pointage.create({
        data: {
          type: 'ENTRÉE',
          horodatage: heureEntree,
          userId: employe.id
        }
      });
      
      // Pointage SORTIE l'après-midi
      const heureSortie = new Date(today);
      heureSortie.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
      
      await prisma.pointage.create({
        data: {
          type: 'SORTIE',
          horodatage: heureSortie,
          userId: employe.id
        }
      });
      
      console.log(`   ✅ ${employe.prenom} ${employe.nom} - Pointé (${heureEntree.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})} → ${heureSortie.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})})`);
    }
    
    console.log(`\n   📊 ${employesQuiPointent.length} employés ont pointé aujourd'hui\n`);

    // ÉTAPE 4: CRÉER DES CONGÉS APPROUVÉS AUJOURD'HUI
    console.log('📋 ÉTAPE 4/6: Création des congés approuvés pour AUJOURD\'HUI...\n');
    
    for (const employe of employesEnConge) {
      const dateDebut = new Date(today);
      const dateFin = new Date(today);
      dateFin.setDate(dateFin.getDate() + Math.floor(Math.random() * 3)); // 0-2 jours supplémentaires
      
      await prisma.conge.create({
        data: {
          type: 'Congés payés',
          statut: 'Approuvé',
          dateDebut,
          dateFin,
          userId: employe.id,
          vu: true
        }
      });
      
      console.log(`   ✅ ${employe.prenom} ${employe.nom} - En congé (${dateDebut.toLocaleDateString('fr-FR')} → ${dateFin.toLocaleDateString('fr-FR')})`);
    }
    
    console.log(`\n   📊 ${employesEnConge.length} employés en congé approuvé\n`);

    // ÉTAPE 5: CRÉER DES PLANNINGS POUR AUJOURD'HUI
    console.log('📋 ÉTAPE 5/6: Création des plannings pour AUJOURD\'HUI...\n');
    
    // Créer des plannings pour 8 employés (les 4 qui ont pointé + 4 parmi ceux qui n'ont pas pointé)
    const employesAvecPlanning = [...employesQuiPointent, ...employes.slice(6, 10)];
    
    for (const employe of employesAvecPlanning) {
      const heureDebut = new Date(today);
      heureDebut.setHours(9, 0, 0, 0);
      const heureFin = new Date(today);
      heureFin.setHours(18, 0, 0, 0);
      
      await prisma.planning.create({
        data: {
          date: today,
          heureDebut,
          heureFin,
          userId: employe.id
        }
      });
      
      const aPointe = employesQuiPointent.includes(employe);
      console.log(`   ✅ ${employe.prenom} ${employe.nom} - Planning 09:00-18:00 ${aPointe ? '(a pointé ✓)' : '(ABSENT ✗)'}`);
    }
    
    console.log(`\n   📊 ${employesAvecPlanning.length} plannings créés\n`);

    // ÉTAPE 6: CRÉER DES DEMANDES DE CONGÉS EN ATTENTE
    console.log('📋 ÉTAPE 6/6: Création de demandes de congés en attente...\n');
    
    const employesPourDemandesConges = employes.slice(0, 3);
    for (const employe of employesPourDemandesConges) {
      const dateDebut = new Date(today);
      dateDebut.setDate(dateDebut.getDate() + 7 + Math.floor(Math.random() * 14)); // Dans 1-3 semaines
      const dateFin = new Date(dateDebut);
      dateFin.setDate(dateFin.getDate() + Math.floor(Math.random() * 5) + 1); // 1-5 jours
      
      await prisma.conge.create({
        data: {
          type: 'Congés payés',
          statut: 'en attente',
          dateDebut,
          dateFin,
          userId: employe.id,
          vu: false
        }
      });
      
      console.log(`   ✅ ${employe.prenom} ${employe.nom} - Demande en attente (${dateDebut.toLocaleDateString('fr-FR')} → ${dateFin.toLocaleDateString('fr-FR')})`);
    }

    // RÉSUMÉ FINAL
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ SEED TERMINÉ AVEC SUCCÈS !');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📊 RÉSUMÉ DE LA SITUATION AUJOURD\'HUI:\n');
    console.log(`   👥 Total employés:                  ${employes.length}`);
    console.log(`   ✅ Ont pointé:                      ${employesQuiPointent.length}`);
    console.log(`   🏖️  En congé approuvé:              ${employesEnConge.length}`);
    console.log(`   ❌ Absents non planifiés:           ${employes.length - employesQuiPointent.length - employesEnConge.length}`);
    console.log(`   📅 Plannings créés:                 ${employesAvecPlanning.length}`);
    console.log(`   📋 Demandes en attente:             ${employesPourDemandesConges.length}\n`);
    
    console.log('💡 Détails des absences:\n');
    const employesAbsents = employes.filter(e => 
      !employesQuiPointent.includes(e) && !employesEnConge.includes(e)
    );
    employesAbsents.forEach((e, idx) => {
      const aPlanning = employesAvecPlanning.includes(e);
      console.log(`   ${idx + 1}. ${e.prenom} ${e.nom} ${aPlanning ? '(a un planning ⚠️)' : '(pas de planning)'}`);
    });
    
    console.log('\n🔐 Identifiants de connexion:');
    console.log('   Email: admin@gestionrh.com');
    console.log('   Pass:  (votre mot de passe admin)\n');
    console.log('   Employés: [prenom.nom]@restaurant.com');
    console.log('   Pass:  password123\n');
    
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERREUR lors du seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetAndSeed()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
