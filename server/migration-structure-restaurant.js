const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script de migration pour adapter la base aux vraies catégories du restaurant
 * 
 * STRUCTURE RÉELLE:
 * - Pizzaiolo
 * - Pastaiolo  
 * - Agent d'entretien
 * - Employé polyvalent (caisse et service)
 * - Développeur/Manager (Moussa)
 * - Assistante RH
 * - Gérante (Leila)
 */

const CATEGORIES = {
  PIZZAIOLO: 'pizzaiolo',
  PASTAIOLO: 'pastaiolo',
  AGENT_ENTRETIEN: 'agent_entretien',
  EMPLOYE_POLYVALENT: 'employe_polyvalent',
  DEV_MANAGER: 'dev_manager',
  ASSISTANTE_RH: 'assistante_rh',
  GERANTE: 'gerante'
};

const ROLES = {
  ADMIN: 'admin',        // Système uniquement
  MANAGER: 'manager',    // Moussa (dev/manager) + Leila (gérante)
  RH: 'rh',             // Assistante RH
  EMPLOYEE: 'employee'   // Tous les autres (pizzaiolo, pastaiolo, etc.)
};

async function migrerStructure() {
  console.log('\n🏢 MIGRATION STRUCTURE RESTAURANT\n');
  console.log('=' .repeat(60));

  try {
    // 1. Afficher la structure actuelle
    console.log('\n📊 STRUCTURE ACTUELLE:\n');
    
    const users = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        categorie: true,
        statut: true
      },
      orderBy: { nom: 'asc' }
    });

    const parRole = users.reduce((acc, u) => {
      if (!acc[u.role]) acc[u.role] = [];
      acc[u.role].push(u);
      return acc;
    }, {});

    Object.entries(parRole).forEach(([role, users]) => {
      console.log(`   ${role.toUpperCase()}: ${users.length} utilisateurs`);
      users.forEach(u => {
        const cat = u.categorie || 'non défini';
        console.log(`      - ${u.nom} ${u.prenom} [${cat}]`);
      });
    });

    // 2. Propositions de migration
    console.log('\n' + '─'.repeat(60));
    console.log('\n💡 STRUCTURE RECOMMANDÉE:\n');
    
    console.log('   ROLES:');
    console.log('   ├─ admin: Compte système uniquement');
    console.log('   ├─ manager: Moussa (dev) + Leila (gérante)');
    console.log('   ├─ rh: Assistante RH');
    console.log('   └─ employee: Pizzaiolo, Pastaiolo, Agent entretien, Polyvalent');
    
    console.log('\n   CATÉGORIES (pour les employees):');
    console.log('   ├─ pizzaiolo: Spécialiste pizza');
    console.log('   ├─ pastaiolo: Spécialiste pâtes');
    console.log('   ├─ agent_entretien: Nettoyage et entretien');
    console.log('   └─ employe_polyvalent: Caisse et service');
    
    console.log('\n   CATÉGORIES (pour management):');
    console.log('   ├─ dev_manager: Développeur/Manager (Moussa)');
    console.log('   ├─ assistante_rh: Assistante RH');
    console.log('   └─ gerante: Gérante (Leila)');

    // 3. Exemple de mise à jour
    console.log('\n' + '─'.repeat(60));
    console.log('\n🔧 EXEMPLES DE COMMANDES DE MISE À JOUR:\n');
    
    console.log('   // Pour Moussa (vous):');
    console.log('   await prisma.user.update({');
    console.log('     where: { email: "votre.email@restaurant.com" },');
    console.log('     data: {');
    console.log(`       role: "${ROLES.MANAGER}",`);
    console.log(`       categorie: "${CATEGORIES.DEV_MANAGER}"`);
    console.log('     }');
    console.log('   });');

    console.log('\n   // Pour Leila (gérante):');
    console.log('   await prisma.user.update({');
    console.log('     where: { email: "leila@restaurant.com" },');
    console.log('     data: {');
    console.log(`       role: "${ROLES.MANAGER}",`);
    console.log(`       categorie: "${CATEGORIES.GERANTE}"`);
    console.log('     }');
    console.log('   });');

    console.log('\n   // Pour l\'assistante RH:');
    console.log('   await prisma.user.update({');
    console.log('     where: { email: "rh@restaurant.com" },');
    console.log('     data: {');
    console.log(`       role: "${ROLES.RH}",`);
    console.log(`       categorie: "${CATEGORIES.ASSISTANTE_RH}"`);
    console.log('     }');
    console.log('   });');

    console.log('\n   // Pour les pizzaiolos:');
    console.log('   await prisma.user.updateMany({');
    console.log('     where: { email: { in: ["pizza1@restaurant.com", "pizza2@restaurant.com"] } },');
    console.log('     data: {');
    console.log(`       role: "${ROLES.EMPLOYEE}",`);
    console.log(`       categorie: "${CATEGORIES.PIZZAIOLO}"`);
    console.log('     }');
    console.log('   });');

    // 4. Demander confirmation
    console.log('\n' + '─'.repeat(60));
    console.log('\n⚠️  PROCHAINES ÉTAPES:\n');
    console.log('   1. Identifier les emails exacts de chaque personne');
    console.log('   2. Créer un script de migration avec les bonnes données');
    console.log('   3. Exécuter la migration');
    console.log('   4. Vérifier les accès et permissions');

    console.log('\n💾 Voulez-vous que je génère le script de migration personnalisé ?');
    console.log('   → Indiquez-moi les emails de:');
    console.log('     - Moussa (dev/manager)');
    console.log('     - Leila (gérante)');
    console.log('     - Assistante RH');
    console.log('     - Et les catégories des 20 employés actuels');

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrerStructure();
