/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SCRIPT D'INITIALISATION PRODUCTION - Chez Antoine
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Ce script crée le premier compte admin lors du déploiement initial.
 * À exécuter UNE SEULE FOIS après la création de la base de données.
 * 
 * Usage:
 *   node scripts/init-production.js
 * 
 * Variables d'environnement requises:
 *   - DATABASE_URL : URL de la base PostgreSQL
 *   - ADMIN_EMAIL : Email du premier admin
 *   - ADMIN_PASSWORD : Mot de passe du premier admin
 *   - ADMIN_NOM : Nom de famille
 *   - ADMIN_PRENOM : Prénom
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Configuration par défaut (à surcharger via variables d'environnement)
const DEFAULT_ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@chezantoine.fr',
  password: process.env.ADMIN_PASSWORD || 'ChezAntoine2024!',
  nom: process.env.ADMIN_NOM || 'Admin',
  prenom: process.env.ADMIN_PRENOM || 'Restaurant'
};

// Catégories par défaut pour un restaurant
const DEFAULT_CATEGORIES = [
  { nom: 'Service', description: 'Personnel de salle', couleur: '#3b82f6' },
  { nom: 'Cuisine', description: 'Personnel de cuisine', couleur: '#ef4444' },
  { nom: 'Bar', description: 'Personnel du bar', couleur: '#8b5cf6' },
  { nom: 'Plonge', description: 'Plongeurs', couleur: '#6b7280' },
  { nom: 'Caisse', description: 'Caissiers/Caissières', couleur: '#f59e0b' },
  { nom: 'Manager', description: 'Responsables', couleur: '#10b981' }
];

async function initProduction() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('    🚀 INITIALISATION PRODUCTION - Chez Antoine');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // 1. Vérifier si un admin existe déjà
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('⚠️  Un compte admin existe déjà:');
      console.log(`   📧 Email: ${existingAdmin.email}`);
      console.log(`   👤 Nom: ${existingAdmin.prenom} ${existingAdmin.nom}`);
      console.log('\n❌ Initialisation annulée (déjà fait).\n');
      return;
    }

    // 2. Créer les catégories par défaut
    console.log('📂 Création des catégories...');
    for (const cat of DEFAULT_CATEGORIES) {
      const existing = await prisma.categorie.findFirst({
        where: { nom: cat.nom }
      });
      
      if (!existing) {
        await prisma.categorie.create({ data: cat });
        console.log(`   ✅ ${cat.nom}`);
      } else {
        console.log(`   ⏭️  ${cat.nom} (existe déjà)`);
      }
    }

    // 3. Créer le compte admin
    console.log('\n👤 Création du compte administrateur...');
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
    
    const admin = await prisma.user.create({
      data: {
        email: DEFAULT_ADMIN.email.toLowerCase().trim(),
        password: hashedPassword,
        nom: DEFAULT_ADMIN.nom,
        prenom: DEFAULT_ADMIN.prenom,
        role: 'admin',
        telephone: '',
        categorie: 'Manager',
        dateEmbauche: new Date(),
        statut: 'actif',
        firstLoginDone: false // Force le changement de mdp à la première connexion
      }
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('    ✅ INITIALISATION TERMINÉE AVEC SUCCÈS');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('🔐 IDENTIFIANTS ADMINISTRATEUR:');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log(`│  Email:     ${DEFAULT_ADMIN.email.padEnd(45)} │`);
    console.log(`│  Mot de passe: ${DEFAULT_ADMIN.password.padEnd(42)} │`);
    console.log('└─────────────────────────────────────────────────────────────┘');
    
    console.log('\n⚠️  IMPORTANT: Changez ce mot de passe dès la première connexion!\n');
    
    console.log('📋 PROCHAINES ÉTAPES:');
    console.log('   1. Connectez-vous avec ces identifiants');
    console.log('   2. Changez votre mot de passe');
    console.log('   3. Créez les employés (un par un ou import CSV)');
    console.log('   4. Configurez les plannings');
    console.log('   5. Installez la badgeuse sur la tablette\n');

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    
    if (error.code === 'P2002') {
      console.log('\n💡 Un utilisateur avec cet email existe déjà.');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initProduction();
