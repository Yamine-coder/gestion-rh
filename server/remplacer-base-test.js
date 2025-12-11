const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

/**
 * Script pour remplacer la base de test actuelle par une nouvelle base cohérente
 * avec les vrais rôles et catégories du restaurant
 */

async function remplacerBaseTest() {
  console.log('\n🔄 REMPLACEMENT DE LA BASE DE TEST\n');
  console.log('=' .repeat(60));

  try {
    // 1. Supprimer toutes les données liées aux employés (dans le bon ordre)
    console.log('\n🗑️  Nettoyage de la base...');
    
    // Supprimer les audits d'anomalies en premier
    const audits = await prisma.anomalieAudit.deleteMany({});
    console.log(`   ✅ ${audits.count} audits d'anomalies supprimés`);
    
    // Supprimer les corrections de shifts
    const corrections = await prisma.shiftCorrection.deleteMany({});
    console.log(`   ✅ ${corrections.count} corrections de shifts supprimées`);
    
    // Supprimer les scores d'employés
    const scores = await prisma.employeScore.deleteMany({});
    console.log(`   ✅ ${scores.count} scores supprimés`);
    
    // Supprimer les anomalies
    const anomalies = await prisma.anomalie.deleteMany({});
    console.log(`   ✅ ${anomalies.count} anomalies supprimées`);
    
    // Supprimer les pointages
    const pointages = await prisma.pointage.deleteMany({});
    console.log(`   ✅ ${pointages.count} pointages supprimés`);
    
    // Supprimer les shifts
    const shifts = await prisma.shift.deleteMany({});
    console.log(`   ✅ ${shifts.count} shifts supprimés`);
    
    // Supprimer les congés
    const conges = await prisma.conge.deleteMany({});
    console.log(`   ✅ ${conges.count} congés supprimés`);
    
    // Supprimer les plannings
    const plannings = await prisma.planning.deleteMany({});
    console.log(`   ✅ ${plannings.count} plannings supprimés`);
    
    // Supprimer les extraPaymentLogs
    const extraLogs = await prisma.extraPaymentLog.deleteMany({});
    console.log(`   ✅ ${extraLogs.count} logs de paiement supprimés`);
    
    // Supprimer les resets de mot de passe
    const resets = await prisma.passwordReset.deleteMany({});
    console.log(`   ✅ ${resets.count} resets de mot de passe supprimés`);
    
    // Supprimer tous les employés (garder admin)
    const deleted = await prisma.user.deleteMany({
      where: {
        role: { not: 'admin' }
      }
    });
    console.log(`   ✅ ${deleted.count} utilisateurs supprimés\n`);

    // 2. Créer le mot de passe par défaut
    const defaultPassword = await bcrypt.hash('Test123!', 10);

    // 3. Créer les nouveaux utilisateurs avec les bons rôles
    console.log('\n👥 Création des nouveaux utilisateurs...\n');

    // === MANAGEMENT ===
    console.log('👔 MANAGEMENT:');
    
    // Moussa - Développeur/Manager (Admin)
    await prisma.user.create({
      data: {
        email: 'moussa@restaurant.com',
        password: defaultPassword,
        role: 'admin', // Admin avec tous les droits
        nom: 'Yamine',
        prenom: 'Moussa',
        telephone: '0601020304',
        categorie: 'dev_manager',
        statut: 'actif',
        dateEmbauche: new Date('2024-01-15'),
        firstLoginDone: true
      }
    });
    console.log('   ✅ Moussa Yamine (Développeur/Manager - Admin)');

    // Leila - Gérante
    await prisma.user.create({
      data: {
        email: 'leila@restaurant.com',
        password: defaultPassword,
        role: 'manager',
        nom: 'Benali',
        prenom: 'Leila',
        telephone: '0601020305',
        categorie: 'gerante',
        statut: 'actif',
        dateEmbauche: new Date('2023-06-01'),
        firstLoginDone: true
      }
    });
    console.log('   ✅ Leila Benali (Gérante)');

    // === RH ===
    console.log('\n👥 RESSOURCES HUMAINES:');
    
    await prisma.user.create({
      data: {
        email: 'rh@restaurant.com',
        password: defaultPassword,
        role: 'rh',
        nom: 'Dubois',
        prenom: 'Sophie',
        telephone: '0601020306',
        categorie: 'assistante_rh',
        statut: 'actif',
        dateEmbauche: new Date('2024-03-01'),
        firstLoginDone: true
      }
    });
    console.log('   ✅ Sophie Dubois (Assistante RH)');

    // === PIZZAIOLOS ===
    console.log('\n🍕 PIZZAIOLOS:');
    
    const pizzaiolos = [
      { nom: 'Romano', prenom: 'Marco', email: 'marco.romano@restaurant.com', tel: '0601020310' },
      { nom: 'Napoli', prenom: 'Giuseppe', email: 'giuseppe.napoli@restaurant.com', tel: '0601020311' },
      { nom: 'Ferrari', prenom: 'Antonio', email: 'antonio.ferrari@restaurant.com', tel: '0601020312' },
    ];

    for (const p of pizzaiolos) {
      await prisma.user.create({
        data: {
          email: p.email,
          password: defaultPassword,
          role: 'employee',
          nom: p.nom,
          prenom: p.prenom,
          telephone: p.tel,
          categorie: 'pizzaiolo',
          statut: 'actif',
          dateEmbauche: new Date('2024-02-01'),
          firstLoginDone: true
        }
      });
      console.log(`   ✅ ${p.prenom} ${p.nom}`);
    }

    // === PASTAIOLOS ===
    console.log('\n🍝 PASTAIOLOS:');
    
    const pastaiolos = [
      { nom: 'Rossi', prenom: 'Luigi', email: 'luigi.rossi@restaurant.com', tel: '0601020320' },
      { nom: 'Bianchi', prenom: 'Paolo', email: 'paolo.bianchi@restaurant.com', tel: '0601020321' },
    ];

    for (const p of pastaiolos) {
      await prisma.user.create({
        data: {
          email: p.email,
          password: defaultPassword,
          role: 'employee',
          nom: p.nom,
          prenom: p.prenom,
          telephone: p.tel,
          categorie: 'pastaiolo',
          statut: 'actif',
          dateEmbauche: new Date('2024-02-15'),
          firstLoginDone: true
        }
      });
      console.log(`   ✅ ${p.prenom} ${p.nom}`);
    }

    // === AGENTS D'ENTRETIEN ===
    console.log('\n🧹 AGENTS D\'ENTRETIEN:');
    
    const entretien = [
      { nom: 'Ndiaye', prenom: 'Fatou', email: 'fatou.ndiaye@restaurant.com', tel: '0601020330' },
      { nom: 'Diop', prenom: 'Aminata', email: 'aminata.diop@restaurant.com', tel: '0601020331' },
    ];

    for (const e of entretien) {
      await prisma.user.create({
        data: {
          email: e.email,
          password: defaultPassword,
          role: 'employee',
          nom: e.nom,
          prenom: e.prenom,
          telephone: e.tel,
          categorie: 'agent_entretien',
          statut: 'actif',
          dateEmbauche: new Date('2024-03-01'),
          firstLoginDone: true
        }
      });
      console.log(`   ✅ ${e.prenom} ${e.nom}`);
    }

    // === EMPLOYÉS POLYVALENTS (Caisse + Service) ===
    console.log('\n🔄 EMPLOYÉS POLYVALENTS (Caisse et Service):');
    
    const polyvalents = [
      { nom: 'Martin', prenom: 'Julie', email: 'julie.martin@restaurant.com', tel: '0601020340' },
      { nom: 'Bernard', prenom: 'Sarah', email: 'sarah.bernard@restaurant.com', tel: '0601020341' },
      { nom: 'Petit', prenom: 'Emma', email: 'emma.petit@restaurant.com', tel: '0601020342' },
      { nom: 'Durand', prenom: 'Léa', email: 'lea.durand@restaurant.com', tel: '0601020343' },
      { nom: 'Moreau', prenom: 'Clara', email: 'clara.moreau@restaurant.com', tel: '0601020344' },
      { nom: 'Simon', prenom: 'Chloé', email: 'chloe.simon@restaurant.com', tel: '0601020345' },
      { nom: 'Laurent', prenom: 'Marie', email: 'marie.laurent@restaurant.com', tel: '0601020346' },
      { nom: 'Leroy', prenom: 'Camille', email: 'camille.leroy@restaurant.com', tel: '0601020347' },
    ];

    for (const p of polyvalents) {
      await prisma.user.create({
        data: {
          email: p.email,
          password: defaultPassword,
          role: 'employee',
          nom: p.nom,
          prenom: p.prenom,
          telephone: p.tel,
          categorie: 'employe_polyvalent',
          statut: 'actif',
          dateEmbauche: new Date('2024-04-01'),
          firstLoginDone: true
        }
      });
      console.log(`   ✅ ${p.prenom} ${p.nom}`);
    }

    // === EMPLOYÉS INACTIFS (pour test de filtrage) ===
    console.log('\n❌ EMPLOYÉS INACTIFS (pour tests):');
    
    await prisma.user.create({
      data: {
        email: 'ancien.employe@restaurant.com',
        password: defaultPassword,
        role: 'employee',
        nom: 'Ancien',
        prenom: 'Employé',
        telephone: '0601020350',
        categorie: 'employe_polyvalent',
        statut: 'inactif',
        dateEmbauche: new Date('2023-01-01'),
        dateSortie: new Date('2024-10-15'),
        motifDepart: 'demission',
        firstLoginDone: true
      }
    });
    console.log('   ✅ Employé Ancien (démission - inactif)');

    await prisma.user.create({
      data: {
        email: 'parti.cdd@restaurant.com',
        password: defaultPassword,
        role: 'employee',
        nom: 'Parti',
        prenom: 'CDD',
        telephone: '0601020351',
        categorie: 'pizzaiolo',
        statut: 'inactif',
        dateEmbauche: new Date('2024-01-01'),
        dateSortie: new Date('2024-11-30'),
        motifDepart: 'fin_cdd',
        firstLoginDone: true
      }
    });
    console.log('   ✅ CDD Parti (fin CDD - inactif)');

    // === STATISTIQUES FINALES ===
    console.log('\n' + '─'.repeat(60));
    console.log('\n📊 STATISTIQUES FINALES:\n');

    const stats = await prisma.user.groupBy({
      by: ['role', 'categorie', 'statut'],
      _count: true,
      where: { role: { not: 'admin' } }
    });

    const parRole = {};
    stats.forEach(s => {
      const key = s.role;
      if (!parRole[key]) parRole[key] = { actifs: 0, inactifs: 0, categories: {} };
      
      if (s.statut === 'actif') {
        parRole[key].actifs += s._count;
      } else {
        parRole[key].inactifs += s._count;
      }
      
      if (!parRole[key].categories[s.categorie]) {
        parRole[key].categories[s.categorie] = 0;
      }
      parRole[key].categories[s.categorie] += s._count;
    });

    Object.entries(parRole).forEach(([role, data]) => {
      console.log(`   ${role.toUpperCase()}:`);
      console.log(`      Actifs: ${data.actifs}`);
      console.log(`      Inactifs: ${data.inactifs}`);
      console.log(`      Par catégorie:`);
      Object.entries(data.categories).forEach(([cat, count]) => {
        console.log(`         - ${cat}: ${count}`);
      });
      console.log('');
    });

    const totalActifs = await prisma.user.count({
      where: { role: 'employee', statut: 'actif' }
    });
    const totalInactifs = await prisma.user.count({
      where: { role: 'employee', statut: 'inactif' }
    });

    console.log('   📋 RÉSUMÉ EMPLOYÉS:');
    console.log(`      ✅ Employés actifs: ${totalActifs}`);
    console.log(`      ❌ Employés inactifs: ${totalInactifs}`);
    console.log(`      📊 Total: ${totalActifs + totalInactifs}`);

    console.log('\n' + '─'.repeat(60));
    console.log('\n✅ BASE DE TEST CRÉÉE AVEC SUCCÈS!\n');
    console.log('🔐 Mot de passe pour tous les comptes: Test123!\n');
    console.log('📧 Comptes disponibles:');
    console.log('   - moussa@restaurant.com (Développeur/Manager)');
    console.log('   - leila@restaurant.com (Gérante)');
    console.log('   - rh@restaurant.com (Assistante RH)');
    console.log('   - [prenom].[nom]@restaurant.com (Employés)\n');

    console.log('💡 Prochaines étapes:');
    console.log('   1. Redémarrer le serveur backend');
    console.log('   2. Se connecter avec un des comptes');
    console.log('   3. Vérifier le rapport Excel (doit montrer 15 employés actifs)');
    console.log('   4. Créer des shifts et pointages de test\n');

    console.log('=' .repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution avec confirmation
console.log('\n⚠️  ATTENTION: Ce script va SUPPRIMER tous les employés actuels!\n');
console.log('Appuyez sur Ctrl+C pour annuler dans les 3 secondes...\n');

setTimeout(() => {
  remplacerBaseTest().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}, 3000);
