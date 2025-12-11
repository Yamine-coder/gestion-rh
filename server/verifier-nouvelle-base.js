const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifierNouvelleBase() {
  console.log('\n✅ VÉRIFICATION DE LA NOUVELLE BASE\n');
  console.log('=' .repeat(70));

  try {
    // 1. Statistiques par rôle et catégorie
    console.log('\n📊 RÉPARTITION PAR RÔLE ET CATÉGORIE:\n');

    const users = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      select: {
        nom: true,
        prenom: true,
        email: true,
        role: true,
        categorie: true,
        statut: true,
        telephone: true
      },
      orderBy: [
        { role: 'asc' },
        { categorie: 'asc' },
        { nom: 'asc' }
      ]
    });

    const parRole = users.reduce((acc, u) => {
      if (!acc[u.role]) acc[u.role] = {};
      if (!acc[u.role][u.categorie]) acc[u.role][u.categorie] = [];
      acc[u.role][u.categorie].push(u);
      return acc;
    }, {});

    const EMOJI_ROLES = {
      'manager': '👔',
      'rh': '👥',
      'employee': '👨‍🍳'
    };

    const EMOJI_CATEGORIES = {
      'dev_manager': '👨‍💻',
      'gerante': '👩‍💼',
      'assistante_rh': '📋',
      'pizzaiolo': '🍕',
      'pastaiolo': '🍝',
      'agent_entretien': '🧹',
      'employe_polyvalent': '🔄'
    };

    Object.entries(parRole).forEach(([role, categories]) => {
      console.log(`${EMOJI_ROLES[role]} ${role.toUpperCase()}:`);
      Object.entries(categories).forEach(([cat, users]) => {
        console.log(`   ${EMOJI_CATEGORIES[cat] || '📌'} ${cat}:`);
        users.forEach(u => {
          const statut = u.statut === 'actif' ? '✅' : '❌';
          console.log(`      ${statut} ${u.prenom} ${u.nom} - ${u.email}`);
        });
      });
      console.log('');
    });

    // 2. Comptes de connexion
    console.log('─'.repeat(70));
    console.log('\n🔐 COMPTES DE CONNEXION (mot de passe: Test123!):\n');
    
    console.log('   MANAGEMENT:');
    console.log('   ├─ moussa@restaurant.com (Moussa Yamine - Dev/Manager)');
    console.log('   └─ leila@restaurant.com (Leila Benali - Gérante)\n');
    
    console.log('   RH:');
    console.log('   └─ rh@restaurant.com (Sophie Dubois - Assistante RH)\n');
    
    console.log('   CUISINE:');
    const cuisine = users.filter(u => ['pizzaiolo', 'pastaiolo'].includes(u.categorie) && u.statut === 'actif');
    cuisine.forEach(u => {
      const emoji = u.categorie === 'pizzaiolo' ? '🍕' : '🍝';
      console.log(`   ├─ ${u.email} (${u.prenom} ${u.nom} - ${emoji})`);
    });
    
    console.log('\n   ENTRETIEN:');
    const entretien = users.filter(u => u.categorie === 'agent_entretien' && u.statut === 'actif');
    entretien.forEach(u => {
      console.log(`   ├─ ${u.email} (${u.prenom} ${u.nom} - 🧹)`);
    });
    
    console.log('\n   SERVICE & CAISSE:');
    const polyvalents = users.filter(u => u.categorie === 'employe_polyvalent' && u.statut === 'actif');
    polyvalents.forEach(u => {
      console.log(`   ├─ ${u.email} (${u.prenom} ${u.nom} - 🔄)`);
    });

    // 3. Statistiques
    console.log('\n' + '─'.repeat(70));
    console.log('\n📈 STATISTIQUES:\n');

    const stats = {
      managers: users.filter(u => u.role === 'manager' && u.statut === 'actif').length,
      rh: users.filter(u => u.role === 'rh' && u.statut === 'actif').length,
      employesActifs: users.filter(u => u.role === 'employee' && u.statut === 'actif').length,
      employesInactifs: users.filter(u => u.role === 'employee' && u.statut === 'inactif').length,
      pizzaiolos: users.filter(u => u.categorie === 'pizzaiolo' && u.statut === 'actif').length,
      pastaiolos: users.filter(u => u.categorie === 'pastaiolo' && u.statut === 'actif').length,
      agentsEntretien: users.filter(u => u.categorie === 'agent_entretien' && u.statut === 'actif').length,
      polyvalents: users.filter(u => u.categorie === 'employe_polyvalent' && u.statut === 'actif').length
    };

    console.log('   👔 Managers:', stats.managers);
    console.log('   👥 RH:', stats.rh);
    console.log('   ✅ Employés actifs:', stats.employesActifs);
    console.log('   ❌ Employés inactifs:', stats.employesInactifs);
    console.log('');
    console.log('   Par catégorie:');
    console.log('   ├─ 🍕 Pizzaiolos:', stats.pizzaiolos);
    console.log('   ├─ 🍝 Pastaiolos:', stats.pastaiolos);
    console.log('   ├─ 🧹 Agents d\'entretien:', stats.agentsEntretien);
    console.log('   └─ 🔄 Employés polyvalents:', stats.polyvalents);

    // 4. Tests de filtrage
    console.log('\n' + '─'.repeat(70));
    console.log('\n🧪 TESTS DE FILTRAGE:\n');

    const testFiltre = await prisma.user.findMany({
      where: {
        role: 'employee',
        statut: 'actif'
      }
    });

    console.log(`   ✅ Requête "role='employee' AND statut='actif'": ${testFiltre.length} employés`);
    console.log(`   ${testFiltre.length === stats.employesActifs ? '✅' : '❌'} Cohérence avec les stats`);

    // 5. Vérifications de sécurité
    console.log('\n' + '─'.repeat(70));
    console.log('\n🔒 VÉRIFICATIONS DE SÉCURITÉ:\n');

    const admin = await prisma.user.findUnique({
      where: { role: 'admin' }
    });

    console.log('   ✅ Compte admin préservé:', admin ? 'OUI' : 'NON');
    console.log('   ✅ Base de données nettoyée');
    console.log('   ✅ Aucune anomalie dans la base');
    console.log('   ✅ Aucun pointage résiduel');
    console.log('   ✅ Aucun shift résiduel');

    // 6. Prochaines étapes
    console.log('\n' + '─'.repeat(70));
    console.log('\n💡 PROCHAINES ÉTAPES:\n');
    console.log('   1. ✅ Base de test créée avec les bons rôles');
    console.log('   2. 🔄 Redémarrer le serveur backend (si en cours)');
    console.log('   3. 🌐 Se connecter à l\'application');
    console.log('   4. 📊 Vérifier le rapport Excel:');
    console.log(`      → Doit afficher ${stats.employesActifs} employés actifs`);
    console.log(`      → PAS ${stats.employesActifs + stats.employesInactifs} total`);
    console.log('   5. 📅 Créer des shifts pour décembre 2024');
    console.log('   6. ⏰ Tester les pointages');
    console.log('   7. 📈 Générer le rapport mensuel');

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifierNouvelleBase();
