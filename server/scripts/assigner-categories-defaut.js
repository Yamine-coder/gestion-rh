// Script pour assigner des catégories par défaut aux anciens employés
const prisma = require('../prisma/client');

async function assignerCategoriesParDefaut() {
  try {
    console.log('🔄 Assignation des catégories par défaut aux anciens employés...');
    
    // Récupérer tous les employés sans catégorie
    const employesSansCategorie = await prisma.user.findMany({
      where: { 
        role: 'employee',
        OR: [
          { categorie: null },
          { categorie: '' }
        ]
      }
    });

    console.log(`📊 Trouvé ${employesSansCategorie.length} employés sans catégorie`);

    if (employesSansCategorie.length === 0) {
      console.log('✅ Tous les employés ont déjà une catégorie assignée');
      return;
    }

    // Catégories possibles avec répartition équilibrée
    const categories = ['Service', 'Cuisine', 'Management', 'Entretien'];
    
    // Assigner des catégories de façon cyclique pour une répartition équilibrée
    const miseAJour = [];
    
    for (let i = 0; i < employesSansCategorie.length; i++) {
      const employe = employesSansCategorie[i];
      const categorieIndex = i % categories.length;
      const nouvelleCategorie = categories[categorieIndex];
      
      console.log(`🏷️  ${employe.prenom} ${employe.nom} → ${nouvelleCategorie}`);
      
      miseAJour.push(
        prisma.user.update({
          where: { id: employe.id },
          data: { categorie: nouvelleCategorie }
        })
      );
    }

    // Exécuter toutes les mises à jour
    await Promise.all(miseAJour);

    console.log('✅ Toutes les catégories ont été assignées avec succès !');
    
    // Afficher la répartition finale
    const repartition = await prisma.user.groupBy({
      by: ['categorie'],
      where: { role: 'employee' },
      _count: { categorie: true }
    });
    
    console.log('\n📈 RÉPARTITION FINALE:');
    repartition.forEach(r => {
      console.log(`   ${r.categorie}: ${r._count.categorie} employé(s)`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'assignation des catégories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignerCategoriesParDefaut();
