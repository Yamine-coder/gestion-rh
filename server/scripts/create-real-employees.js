// Template pour créer plusieurs employés en une fois
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 👥 LISTE DES EMPLOYÉS RÉELS À CRÉER
// Adapter cette liste selon vos besoins
const EMPLOYEES_DATA = [
  {
    email: 'marie.dupont@entreprise.com',
    nom: 'Dupont',
    prenom: 'Marie',
    telephone: '01 23 45 67 90',
    categorie: 'Manager',
    role: 'admin' // Si c'est un manager
  },
  {
    email: 'pierre.martin@entreprise.com',  
    nom: 'Martin',
    prenom: 'Pierre',
    telephone: '01 23 45 67 91',
    categorie: 'Chef équipe',
    role: 'employee'
  },
  {
    email: 'sophie.durand@entreprise.com',
    nom: 'Durand', 
    prenom: 'Sophie',
    telephone: '01 23 45 67 92',
    categorie: 'Serveur',
    role: 'employee'
  },
  {
    email: 'lucas.bernard@entreprise.com',
    nom: 'Bernard',
    prenom: 'Lucas', 
    telephone: '01 23 45 67 93',
    categorie: 'Cuisine',
    role: 'employee'
  }
  // ✏️ AJOUTER VOS EMPLOYÉS ICI
];

async function createRealEmployees() {
  console.log('👥 Création des employés réels...');
  
  const defaultPassword = 'TempPass2024!'; // Mot de passe temporaire
  
  try {
    for (const empData of EMPLOYEES_DATA) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      const employee = await prisma.user.upsert({
        where: { email: empData.email },
        update: {
          // Mettre à jour si existe déjà
          ...empData,
          statut: 'actif'
        },
        create: {
          ...empData,
          password: hashedPassword,
          statut: 'actif',
          firstLoginDone: false, // Devra changer le mot de passe
          dateEmbauche: new Date(),
          createdAt: new Date()
        }
      });

      console.log(`✅ ${employee.prenom} ${employee.nom} - ${employee.email}`);
    }

    console.log('');
    console.log(`🎉 ${EMPLOYEES_DATA.length} employés créés/mis à jour !`);
    console.log('📧 Mot de passe temporaire:', defaultPassword);
    console.log('⚠️  Ils devront le changer au 1er login');

    // Afficher un résumé
    const totalUsers = await prisma.user.count();
    const admins = await prisma.user.count({ where: { role: 'admin' } });
    const employees = await prisma.user.count({ where: { role: 'employee' } });

    console.log('');
    console.log('📊 RÉSUMÉ BASE DE DONNÉES:');
    console.log(`   Total utilisateurs: ${totalUsers}`);
    console.log(`   Administrateurs: ${admins}`);
    console.log(`   Employés: ${employees}`);

  } catch (error) {
    console.error('❌ Erreur lors de la création:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  createRealEmployees();
}

module.exports = { createRealEmployees, EMPLOYEES_DATA };
