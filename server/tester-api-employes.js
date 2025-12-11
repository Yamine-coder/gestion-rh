const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testerAPIEmployes() {
  console.log('\n🧪 TEST DE L\'API /admin/employes\n');
  console.log('=' .repeat(70));

  try {
    // Simuler ce que l'API retourne maintenant
    console.log('\n📊 CE QUE L\'API /admin/employes RETOURNE MAINTENANT:\n');

    const utilisateurs = await prisma.user.findMany({
      where: {
        role: 'employee' // Uniquement les employés
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        categorie: true,
        statut: true,
        dateSortie: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`   Total retourné: ${utilisateurs.length} employés`);
    console.log('');
    console.log('   Détail:');
    
    const actifs = utilisateurs.filter(u => u.statut === 'actif' && !u.dateSortie);
    const inactifs = utilisateurs.filter(u => u.statut === 'inactif' || u.dateSortie);

    console.log(`   ├─ Actifs: ${actifs.length}`);
    actifs.forEach(u => {
      console.log(`   │  ✅ ${u.prenom} ${u.nom} [${u.categorie}]`);
    });
    
    console.log(`   └─ Inactifs: ${inactifs.length}`);
    inactifs.forEach(u => {
      console.log(`      ❌ ${u.prenom} ${u.nom} [${u.categorie}] (${u.dateSortie ? 'sorti le ' + u.dateSortie.toLocaleDateString() : 'inactif'})`);
    });

    // Ce que le dashboard va afficher
    console.log('\n' + '─'.repeat(70));
    console.log('\n📱 CE QUE LE DASHBOARD VA AFFICHER:\n');
    console.log(`   EMPLOYÉS ACTIFS (employes.length): ${utilisateurs.length}`);
    console.log(`   EN SERVICE (filter statut actif): ${actifs.length}`);
    console.log(`   RÉSULTATS AFFICHÉS (filteredEmployes): ${utilisateurs.length} (sans recherche)`);

    // Vérification
    console.log('\n' + '─'.repeat(70));
    console.log('\n✅ VÉRIFICATION:\n');
    
    if (utilisateurs.length === 17) {
      console.log('   ✅ Nombre total correct: 17 employés (15 actifs + 2 inactifs)');
    } else {
      console.log(`   ❌ Problème: ${utilisateurs.length} employés au lieu de 17`);
    }

    if (actifs.length === 15) {
      console.log('   ✅ Nombre actifs correct: 15 employés en service');
    } else {
      console.log(`   ❌ Problème: ${actifs.length} actifs au lieu de 15`);
    }

    // Vérifier que managers et RH ne sont pas inclus
    const managers = await prisma.user.count({ where: { role: 'manager' } });
    const rh = await prisma.user.count({ where: { role: 'rh' } });
    const admins = await prisma.user.count({ where: { role: 'admin' } });

    console.log('\n   📊 Utilisateurs EXCLUS du rapport:');
    console.log(`      - Admins: ${admins}`);
    console.log(`      - Managers: ${managers}`);
    console.log(`      - RH: ${rh}`);
    console.log(`      Total exclu: ${admins + managers + rh} utilisateurs`);

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 RÉSULTAT ATTENDU DANS LE DASHBOARD:\n');
    console.log('   ┌──────────────────────────────────┐');
    console.log('   │ EMPLOYÉS ACTIFS          17      │');
    console.log('   │ EN SERVICE               15      │');
    console.log('   │ RÉSULTATS AFFICHÉS       17      │');
    console.log('   └──────────────────────────────────┘');
    console.log('\n   Note: "Employés actifs" affiche le TOTAL (actifs + inactifs)');
    console.log('         car c\'est employes.length');
    console.log('         Le label devrait plutôt être "Total employés"');
    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testerAPIEmployes();
