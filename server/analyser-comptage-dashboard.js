const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyserComptageEmployes() {
  console.log('\n🔍 ANALYSE DU COMPTAGE DES EMPLOYÉS\n');
  console.log('=' .repeat(70));

  try {
    const now = new Date();

    // 1. Ce que compte le dashboard actuellement
    console.log('\n📊 COMPTAGES ACTUELS:\n');

    // Tous les employés (role = employee)
    const allEmployees = await prisma.user.findMany({
      where: { role: 'employee' },
      select: { 
        id: true, 
        nom: true, 
        prenom: true, 
        email: true,
        statut: true, 
        dateSortie: true 
      }
    });

    console.log(`1️⃣  Tous les users avec role='employee': ${allEmployees.length}`);
    allEmployees.forEach(e => {
      const status = e.statut === 'actif' ? '✅' : '❌';
      const sortie = e.dateSortie ? ` (sortie: ${e.dateSortie.toLocaleDateString()})` : '';
      console.log(`    ${status} ${e.prenom} ${e.nom}${sortie}`);
    });

    // Employés actifs
    const actifs = await prisma.user.findMany({
      where: {
        role: 'employee',
        statut: 'actif',
        OR: [
          { dateSortie: null },
          { dateSortie: { gt: now } }
        ]
      }
    });

    console.log(`\n2️⃣  Employés ACTIFS (statut='actif' ET pas de dateSortie): ${actifs.length}`);

    // 2. Tous les utilisateurs par rôle
    console.log('\n' + '─'.repeat(70));
    console.log('\n👥 RÉPARTITION PAR RÔLE:\n');

    const allUsers = await prisma.user.findMany({
      select: {
        role: true,
        statut: true,
        nom: true,
        prenom: true,
        categorie: true
      }
    });

    const parRole = allUsers.reduce((acc, u) => {
      if (!acc[u.role]) acc[u.role] = { actifs: 0, inactifs: 0, users: [] };
      if (u.statut === 'actif') {
        acc[u.role].actifs++;
      } else {
        acc[u.role].inactifs++;
      }
      acc[u.role].users.push(u);
      return acc;
    }, {});

    Object.entries(parRole).forEach(([role, data]) => {
      console.log(`   ${role.toUpperCase()}:`);
      console.log(`      Actifs: ${data.actifs}`);
      console.log(`      Inactifs: ${data.inactifs}`);
      console.log(`      Total: ${data.actifs + data.inactifs}`);
      console.log(`      Détail:`);
      data.users.forEach(u => {
        const status = u.statut === 'actif' ? '✅' : '❌';
        console.log(`         ${status} ${u.prenom} ${u.nom} [${u.categorie || 'N/A'}]`);
      });
      console.log('');
    });

    // 3. Analyse du problème
    console.log('─'.repeat(70));
    console.log('\n🎯 ANALYSE DU PROBLÈME:\n');

    const employeesCount = allEmployees.length;
    const actifsCount = actifs.length;
    const managersCount = parRole['manager']?.actifs || 0;
    const rhCount = parRole['rh']?.actifs || 0;
    const adminsCount = parRole['admin']?.actifs || 0;

    console.log(`   Dashboard affiche "EMPLOYÉS ACTIFS": probablement ${employeesCount}`);
    console.log(`   Dashboard affiche "EN SERVICE": probablement ${actifsCount}`);
    console.log('');
    console.log(`   ❌ PROBLÈME: Le comptage inclut TOUS les role='employee'`);
    console.log(`      même ceux qui sont inactifs ou partis`);
    console.log('');
    console.log(`   ✅ SOLUTION: Le code actuel est correct mais les chiffres`);
    console.log(`      affichés dans l'image suggèrent que le frontend`);
    console.log(`      ou le cache montre d'anciennes données`);
    console.log('');
    console.log(`   📊 CHIFFRES ATTENDUS:`);
    console.log(`      - Employés actifs (operationnels): ${actifsCount}`);
    console.log(`      - Managers: ${managersCount}`);
    console.log(`      - RH: ${rhCount}`);
    console.log(`      - Admins: ${adminsCount}`);
    console.log(`      - Total personnel: ${actifsCount + managersCount + rhCount + adminsCount}`);

    // 4. Vérifier s'il y a des anciennes données
    console.log('\n' + '─'.repeat(70));
    console.log('\n🔄 VÉRIFICATION CACHE/ANCIENNES DONNÉES:\n');

    const totalUsers = await prisma.user.count();
    console.log(`   Total utilisateurs en DB: ${totalUsers}`);
    console.log('');
    console.log('   Si le dashboard affiche 21 employés:');
    console.log('   → Il utilise peut-être un ancien cache');
    console.log('   → Ou le frontend n\'a pas été rafraîchi');
    console.log('   → Ou il compte managers + RH + employés');

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyserComptageEmployes();
