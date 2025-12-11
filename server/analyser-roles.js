const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyserRoles() {
  console.log('\n🔍 ANALYSE DES RÔLES ET STATUTS\n');
  console.log('=' .repeat(60));

  try {
    // 1. Tous les utilisateurs groupés par rôle
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        statut: true,
        dateSortie: true
      }
    });

    const parRole = users.reduce((acc, user) => {
      if (!acc[user.role]) acc[user.role] = [];
      acc[user.role].push(user);
      return acc;
    }, {});

    console.log('📊 RÉPARTITION PAR RÔLE:');
    Object.entries(parRole).forEach(([role, users]) => {
      console.log(`\n   ${role.toUpperCase()}: ${users.length} utilisateurs`);
      users.forEach(u => {
        const statusLabel = u.statut === 'actif' ? '✅ actif' : '❌ inactif';
        const dateLabel = u.dateSortie ? ` (sortie: ${u.dateSortie.toLocaleDateString('fr-FR')})` : '';
        console.log(`      - ${u.nom} ${u.prenom} ${statusLabel}${dateLabel}`);
      });
    });

    // 2. Test de la requête d'export
    console.log('\n' + '─'.repeat(60));
    console.log('\n🧪 TEST DE LA REQUÊTE D\'EXPORT:\n');

    const dateFin = new Date('2025-11-30T23:59:59');

    const employes = await prisma.user.findMany({
      where: {
        role: { not: 'admin' },
        statut: 'actif',
        OR: [
          { dateSortie: null },
          { dateSortie: { gt: dateFin } }
        ]
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        statut: true,
        dateSortie: true
      }
    });

    console.log(`   Requête: role != 'admin' AND statut = 'actif' AND (dateSortie IS NULL OR dateSortie > 30/11/2025)`);
    console.log(`   Résultat: ${employes.length} utilisateurs\n`);

    employes.forEach((u, i) => {
      const dateLabel = u.dateSortie ? ` | sortie: ${u.dateSortie.toLocaleDateString('fr-FR')}` : '';
      console.log(`   ${(i+1).toString().padStart(2)}. [${u.role}] ${u.nom} ${u.prenom}${dateLabel}`);
    });

    // 3. Comparaison avec employee seulement
    const employesOnly = await prisma.user.findMany({
      where: {
        role: 'employee',
        statut: 'actif',
        OR: [
          { dateSortie: null },
          { dateSortie: { gt: dateFin } }
        ]
      }
    });

    console.log('\n' + '─'.repeat(60));
    console.log(`\n🎯 COMPARAISON:\n`);
    console.log(`   role != 'admin': ${employes.length} utilisateurs`);
    console.log(`   role = 'employee': ${employesOnly.length} utilisateurs`);
    console.log(`   Différence: ${employes.length - employesOnly.length} utilisateurs`);

    if (employes.length !== employesOnly.length) {
      console.log('\n   ❌ Il y a des utilisateurs avec d\'autres rôles que "employee"!');
      const autresRoles = employes.filter(e => e.role !== 'employee');
      console.log(`   Utilisateurs avec rôle différent de "employee":`);
      autresRoles.forEach(u => {
        console.log(`      - ${u.nom} ${u.prenom} (role: ${u.role})`);
      });
    } else {
      console.log('\n   ✅ Tous les utilisateurs non-admin ont le rôle "employee"');
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyserRoles();
