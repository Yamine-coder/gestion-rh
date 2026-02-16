/**
 * Script pour ajouter ALEJANDRA (FANDINO AVENDANO Angie Alejandra)
 * Usage: cd server && node scripts/ajouter-alejandra.js [--send-email]
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const SEND_EMAIL = process.argv.includes('--send-email');

function genererMotDePasse() {
  const consonnes = 'bcdfghjklmnpqrstvwxyz';
  const voyelles = 'aeiou';
  const chiffres = '0123456789';
  let mdp = '';
  for (let i = 0; i < 3; i++) {
    mdp += consonnes[Math.floor(Math.random() * consonnes.length)];
    mdp += voyelles[Math.floor(Math.random() * voyelles.length)];
  }
  for (let i = 0; i < 4; i++) {
    mdp += chiffres[Math.floor(Math.random() * chiffres.length)];
  }
  return mdp;
}

async function main() {
  const emp = {
    nom: 'FANDINO AVENDANO',
    prenom: 'Angie Alejandra',
    email: 'fandinoavendanoalejandra@gmail.com',
    categories: ['Caisse/Service'],
    dateEmbauche: '2026-02-01',
    role: 'employee',
  };

  // Vérifier si elle existe déjà
  const existing = await prisma.user.findUnique({ where: { email: emp.email } });
  if (existing) {
    console.log(`⚠️  ${emp.prenom} ${emp.nom} existe déjà (ID: ${existing.id})`);
    await prisma.$disconnect();
    return;
  }

  const motDePasse = genererMotDePasse();
  const hashedPassword = await bcrypt.hash(motDePasse, 10);

  const user = await prisma.user.create({
    data: {
      email: emp.email.toLowerCase().trim(),
      password: hashedPassword,
      nom: emp.nom,
      prenom: emp.prenom,
      categorie: emp.categories[0],
      categories: JSON.stringify(emp.categories),
      dateEmbauche: new Date(emp.dateEmbauche),
      role: emp.role,
      firstLoginDone: false,
      statut: 'actif',
    },
  });

  // Créer le mouvement d'entrée pour le turnover
  await prisma.mouvementEffectif.create({
    data: {
      userId: user.id,
      type: 'entree',
      date: new Date(emp.dateEmbauche),
      nom: emp.nom,
      prenom: emp.prenom,
      categories: JSON.stringify(emp.categories),
    }
  });

  console.log(`\n✅ ${emp.prenom} ${emp.nom} créée avec succès !`);
  console.log(`   ID    : ${user.id}`);
  console.log(`   Email : ${emp.email}`);
  console.log(`   MdP   : ${motDePasse}`);
  console.log(`   Poste : ${emp.categories.join(', ')}`);
  console.log(`   Embauche : ${emp.dateEmbauche}\n`);

  // Envoi email bienvenue si --send-email
  if (SEND_EMAIL) {
    try {
      const { envoyerIdentifiants } = require('../utils/emailService');
      console.log('📧 Envoi de l\'email de bienvenue...');
      await envoyerIdentifiants({
        email: emp.email,
        prenom: emp.prenom,
        nom: emp.nom,
        motDePasse,
      });
      console.log('✅ Email envoyé !\n');
    } catch (e) {
      console.log(`❌ Erreur envoi email: ${e.message}\n`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ Erreur:', e);
  process.exit(1);
});
