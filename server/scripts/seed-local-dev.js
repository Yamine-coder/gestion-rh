/**
 * Seed minimal pour la base de DEV LOCALE (gestion_rh_dev).
 * Crée 1 admin + 2 employés de test avec le schéma actuel.
 *
 * Usage : node scripts/seed-local-dev.js
 * ⚠️ À n'exécuter QUE sur la base locale (jamais en prod).
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL || '';
  if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
    console.error('❌ ABANDON : DATABASE_URL ne pointe pas vers une base locale.');
    console.error('   URL actuelle :', url.slice(0, 40) + '...');
    process.exit(1);
  }

  console.log('🌱 Seed base locale de dev...');
  const password = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@local.fr' },
    update: {},
    create: {
      email: 'admin@local.fr',
      password,
      role: 'admin',
      nom: 'Local',
      prenom: 'Dev',
      telephone: '0600000000',
      categories: JSON.stringify(['Manager']),
      dateEmbauche: new Date('2023-01-01'),
      statut: 'actif',
      firstLoginDone: true,
    },
  });

  const employes = [
    { email: 'jean@local.fr', nom: 'Dupont', prenom: 'Jean', cats: ['Service'] },
    { email: 'marie@local.fr', nom: 'Martin', prenom: 'Marie', cats: ['Cuisine'] },
  ];

  for (const e of employes) {
    await prisma.user.upsert({
      where: { email: e.email },
      update: {},
      create: {
        email: e.email,
        password,
        role: 'employee',
        nom: e.nom,
        prenom: e.prenom,
        telephone: '0601020304',
        categories: JSON.stringify(e.cats),
        dateEmbauche: new Date('2023-06-01'),
        statut: 'actif',
        firstLoginDone: true,
      },
    });
  }

  const total = await prisma.user.count();
  console.log('✅ Seed terminé.');
  console.log('   Admin   : admin@local.fr / admin123');
  console.log('   Employés: jean@local.fr, marie@local.fr / admin123');
  console.log('   Total utilisateurs en base :', total);
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
