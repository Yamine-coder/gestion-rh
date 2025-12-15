/**
 * Script d'initialisation de la base de données en production
 * Crée le premier compte administrateur
 * 
 * Usage: node init-production.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initialisation de la base de données production...\n');

  // Vérifier si un admin existe déjà
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'admin' }
  });

  if (existingAdmin) {
    console.log('⚠️  Un administrateur existe déjà:', existingAdmin.email);
    console.log('   Aucune action nécessaire.\n');
    return;
  }

  // Créer l'administrateur principal
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  
  const admin = await prisma.user.create({
    data: {
      nom: 'Admin',
      prenom: 'Système',
      email: 'admin@chezantoine.fr',
      password: hashedPassword,
      role: 'admin',
      telephone: '0600000000',
      categorie: 'direction',
      statut: 'actif',
      dateEmbauche: new Date(),
      congesAnnuels: 25,
      congesRestants: 25,
      rpiRestants: 2,
    }
  });

  console.log('✅ Administrateur créé avec succès !');
  console.log('');
  console.log('📧 Email:    admin@chezantoine.fr');
  console.log('🔑 Mot de passe: Admin123!');
  console.log('');
  console.log('⚠️  IMPORTANT: Changez ce mot de passe après la première connexion !');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
