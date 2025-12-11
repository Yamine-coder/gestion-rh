const prisma = require('./server/prisma/client');

async function fixCamilleCategorie() {
  try {
    // Trouver Camille
    const camille = await prisma.user.findFirst({
      where: { email: { contains: 'camille' } },
      select: { id: true, prenom: true, nom: true, categorie: true, role: true, email: true }
    });
    
    console.log('👤 Camille actuelle:', camille);
    
    if (!camille) {
      console.log('❌ Camille non trouvée');
      return;
    }
    
    // Lister les catégories existantes dans le système
    const categories = await prisma.user.groupBy({
      by: ['categorie'],
      _count: true
    });
    
    console.log('\n📋 Catégories existantes:');
    categories.forEach(c => console.log(`   - "${c.categorie}" (${c._count} employés)`));
    
    // Corriger la catégorie de Camille vers "Caisse/Service" (catégorie existante)
    const nouvelleCategorie = 'Caisse/Service';
    
    await prisma.user.update({
      where: { id: camille.id },
      data: { categorie: nouvelleCategorie }
    });
    
    console.log(`\n✅ Catégorie de Camille mise à jour: "${camille.categorie}" → "${nouvelleCategorie}"`);
    
    // Vérifier
    const camilleUpdated = await prisma.user.findUnique({
      where: { id: camille.id },
      select: { prenom: true, nom: true, categorie: true }
    });
    
    console.log('\n👤 Camille après correction:', camilleUpdated);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCamilleCategorie();
