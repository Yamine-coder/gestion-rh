// Script de sauvegarde avant migration
// Exécuter AVANT de faire la migration demain

const prisma = require('../prisma/client');
const fs = require('fs');
const path = require('path');

async function sauvegarderDonnees() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dossierSauvegarde = path.join(__dirname, '..', 'sauvegardes', `backup-${timestamp}`);
  
  // Créer le dossier de sauvegarde
  if (!fs.existsSync(path.dirname(dossierSauvegarde))) {
    fs.mkdirSync(path.dirname(dossierSauvegarde), { recursive: true });
  }
  fs.mkdirSync(dossierSauvegarde, { recursive: true });
  
  console.log(`💾 Création de la sauvegarde dans: ${dossierSauvegarde}`);
  
  try {
    // 1. Sauvegarder tous les utilisateurs
    const users = await prisma.user.findMany();
    fs.writeFileSync(
      path.join(dossierSauvegarde, 'users.json'),
      JSON.stringify(users, null, 2)
    );
    console.log(`✅ ${users.length} utilisateurs sauvegardés`);
    
    // 2. Sauvegarder tous les shifts
    const shifts = await prisma.shift.findMany({
      include: {
        employe: {
          select: { nom: true, prenom: true, email: true }
        }
      }
    });
    fs.writeFileSync(
      path.join(dossierSauvegarde, 'shifts.json'),
      JSON.stringify(shifts, null, 2)
    );
    console.log(`✅ ${shifts.length} shifts sauvegardés`);
    
    // 3. Sauvegarder tous les congés
    const conges = await prisma.conge.findMany({
      include: {
        user: {
          select: { nom: true, prenom: true, email: true }
        }
      }
    });
    fs.writeFileSync(
      path.join(dossierSauvegarde, 'conges.json'),
      JSON.stringify(conges, null, 2)
    );
    console.log(`✅ ${conges.length} congés sauvegardés`);
    
    // 4. Sauvegarder tous les pointages
    const pointages = await prisma.pointage.findMany({
      include: {
        user: {
          select: { nom: true, prenom: true, email: true }
        }
      }
    });
    fs.writeFileSync(
      path.join(dossierSauvegarde, 'pointages.json'),
      JSON.stringify(pointages, null, 2)
    );
    console.log(`✅ ${pointages.length} pointages sauvegardés`);
    
    // 5. Sauvegarder les plannings anciens
    const plannings = await prisma.planning.findMany({
      include: {
        user: {
          select: { nom: true, prenom: true, email: true }
        }
      }
    });
    fs.writeFileSync(
      path.join(dossierSauvegarde, 'plannings.json'),
      JSON.stringify(plannings, null, 2)
    );
    console.log(`✅ ${plannings.length} plannings sauvegardés`);
    
    // 6. Créer un résumé de la sauvegarde
    const resume = {
      timestamp: new Date().toISOString(),
      donnees: {
        users: users.length,
        shifts: shifts.length,
        conges: conges.length,
        pointages: pointages.length,
        plannings: plannings.length
      },
      statistiques: {
        employes: users.filter(u => u.role === 'employee').length,
        admins: users.filter(u => u.role === 'admin').length,
        comptesActifs: users.filter(u => u.statut === 'actif').length,
        derniereConnexion: users.reduce((latest, user) => {
          if (user.lastLoginAt && (!latest || user.lastLoginAt > latest)) {
            return user.lastLoginAt;
          }
          return latest;
        }, null)
      }
    };
    
    fs.writeFileSync(
      path.join(dossierSauvegarde, 'resume.json'),
      JSON.stringify(resume, null, 2)
    );
    
    // 7. Créer un script de restauration
    const scriptRestauration = `
// Script de restauration automatique
// Généré le ${new Date().toLocaleString('fr-FR')}

const prisma = require('../prisma/client');
const fs = require('fs');
const path = require('path');

async function restaurer() {
  console.log('🔄 Restauration des données...');
  
  try {
    // Nettoyer les tables
    await prisma.extraPaymentLog.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.conge.deleteMany();
    await prisma.pointage.deleteMany();
    await prisma.planning.deleteMany();
    await prisma.passwordReset.deleteMany();
    await prisma.user.deleteMany();
    
    // Restaurer les utilisateurs
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8'));
    for (const user of users) {
      delete user.id; // Laisser l'auto-increment
      await prisma.user.create({ data: user });
    }
    console.log(\`✅ \${users.length} utilisateurs restaurés\`);
    
    // Restaurer les congés
    const conges = JSON.parse(fs.readFileSync(path.join(__dirname, 'conges.json'), 'utf8'));
    for (const conge of conges) {
      delete conge.id;
      delete conge.user; // Supprimer l'include
      await prisma.conge.create({ data: conge });
    }
    console.log(\`✅ \${conges.length} congés restaurés\`);
    
    // Restaurer les pointages
    const pointages = JSON.parse(fs.readFileSync(path.join(__dirname, 'pointages.json'), 'utf8'));
    for (const pointage of pointages) {
      delete pointage.id;
      delete pointage.user;
      await prisma.pointage.create({ data: pointage });
    }
    console.log(\`✅ \${pointages.length} pointages restaurés\`);
    
    // Restaurer les shifts
    const shifts = JSON.parse(fs.readFileSync(path.join(__dirname, 'shifts.json'), 'utf8'));
    for (const shift of shifts) {
      delete shift.id;
      delete shift.employe;
      await prisma.shift.create({ data: shift });
    }
    console.log(\`✅ \${shifts.length} shifts restaurés\`);
    
    // Restaurer les plannings
    const plannings = JSON.parse(fs.readFileSync(path.join(__dirname, 'plannings.json'), 'utf8'));
    for (const planning of plannings) {
      delete planning.id;
      delete planning.user;
      await prisma.planning.create({ data: planning });
    }
    console.log(\`✅ \${plannings.length} plannings restaurés\`);
    
    console.log('✅ RESTAURATION TERMINÉE!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la restauration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  restaurer();
}

module.exports = { restaurer };
`;
    
    fs.writeFileSync(
      path.join(dossierSauvegarde, 'restaurer.js'),
      scriptRestauration
    );
    
    console.log('\n📊 RÉSUMÉ DE LA SAUVEGARDE:');
    console.log('============================');
    console.log(`📁 Dossier: ${dossierSauvegarde}`);
    console.log(`👥 Utilisateurs: ${resume.donnees.users}`);
    console.log(`📅 Shifts: ${resume.donnees.shifts}`);
    console.log(`🏖️  Congés: ${resume.donnees.conges}`);
    console.log(`⏰ Pointages: ${resume.donnees.pointages}`);
    console.log(`📋 Plannings: ${resume.donnees.plannings}`);
    console.log('\n✅ SAUVEGARDE TERMINÉE!');
    console.log('\n🔄 Pour restaurer en cas de problème:');
    console.log(`   cd ${dossierSauvegarde}`);
    console.log(`   node restaurer.js`);
    
    return dossierSauvegarde;
    
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export pour utilisation dans d'autres scripts
module.exports = { sauvegarderDonnees };

// Exécuter si appelé directement
if (require.main === module) {
  console.log('💾 SCRIPT DE SAUVEGARDE');
  console.log('========================');
  console.log('🚀 Début de la sauvegarde...');
  
  sauvegarderDonnees().then((dossier) => {
    console.log(`\n🎉 Sauvegarde réussie dans: ${dossier}`);
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Échec de la sauvegarde:', error);
    process.exit(1);
  });
}
