// Script de debug pour vérifier les catégories des employés
const prisma = require('../prisma/client');

async function debugEmployes() {
  try {
    const employes = await prisma.user.findMany({
      where: { role: 'employee' },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        categorie: true,
        role: true,
        statut: true
      }
    });

    console.log('🔍 DEBUG EMPLOYÉS ET CATÉGORIES:');
    console.log('='.repeat(50));
    
    employes.forEach(emp => {
      console.log(`👤 ${emp.prenom} ${emp.nom} (ID: ${emp.id})`);
      console.log(`   📧 Email: ${emp.email}`);
      console.log(`   🏷️  Catégorie: "${emp.categorie || 'NULL'}"`);
      console.log(`   🎭 Rôle: "${emp.role}"`);
      console.log(`   📊 Statut: "${emp.statut}"`);
      console.log('   ' + '-'.repeat(40));
    });

    console.log(`\n📊 Total: ${employes.length} employés trouvés`);
    
    // Regroupement par catégorie
    const parCategorie = employes.reduce((acc, emp) => {
      const cat = emp.categorie || 'Non défini';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📈 RÉPARTITION PAR CATÉGORIE:');
    Object.entries(parCategorie).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} employé(s)`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugEmployes();
