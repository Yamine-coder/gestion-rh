// Script pour créer des employés de test avec différentes catégories
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createTestEmployees() {
  console.log("👥 Création d'employés de test pour les scénarios de conflits...");

  try {
    // Nettoyer les employés existants (sauf admin)
    await prisma.user.deleteMany({
      where: { role: 'employe' }
    });

    const hashedPassword = await bcrypt.hash('test123', 10);

    const employesToCreate = [
      // Équipe Cuisine
      { nom: 'Dupont', prenom: 'Pierre', email: 'pierre.dupont@test.com', categorie: 'cuisine' },
      { nom: 'Martin', prenom: 'Sophie', email: 'sophie.martin@test.com', categorie: 'cuisine' },
      { nom: 'Bernard', prenom: 'Luc', email: 'luc.bernard@test.com', categorie: 'cuisine' },
      { nom: 'Moreau', prenom: 'Claire', email: 'claire.moreau@test.com', categorie: 'cuisine' },
      
      // Équipe Service
      { nom: 'Durand', prenom: 'Marie', email: 'marie.durand@test.com', categorie: 'service' },
      { nom: 'Leroy', prenom: 'Jean', email: 'jean.leroy@test.com', categorie: 'service' },
      { nom: 'Garcia', prenom: 'Ana', email: 'ana.garcia@test.com', categorie: 'service' },
      { nom: 'Roux', prenom: 'Paul', email: 'paul.roux@test.com', categorie: 'service' },
      
      // Management
      { nom: 'Petit', prenom: 'Sylvie', email: 'sylvie.petit@test.com', categorie: 'management' },
      { nom: 'Laurent', prenom: 'David', email: 'david.laurent@test.com', categorie: 'management' },
      
      // Polyvalents
      { nom: 'Simon', prenom: 'Alex', email: 'alex.simon@test.com', categorie: 'polyvalent' },
      { nom: 'Michel', prenom: 'Lucie', email: 'lucie.michel@test.com', categorie: 'polyvalent' }
    ];

    for (const emp of employesToCreate) {
      const user = await prisma.user.create({
        data: {
          nom: emp.nom,
          prenom: emp.prenom,
          email: emp.email,
          password: hashedPassword,
          role: 'employe',
          categorie: emp.categorie
        }
      });

      console.log(`✅ Créé: ${emp.prenom} ${emp.nom} (${emp.categorie})`);
    }

    // Afficher le résumé par catégorie
    const categoryCounts = await prisma.user.groupBy({
      by: ['categorie'],
      where: { role: 'employe' },
      _count: { categorie: true }
    });

    console.log("\n📊 RÉSUMÉ PAR CATÉGORIE:");
    categoryCounts.forEach(cat => {
      console.log(`   ${cat.categorie}: ${cat._count.categorie} employés`);
    });

    console.log(`\n🎉 Total: ${employesToCreate.length} employés créés !`);
    console.log("Vous pouvez maintenant exécuter create-test-conflicts.js");

  } catch (error) {
    console.error("❌ Erreur lors de la création des employés:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestEmployees();
