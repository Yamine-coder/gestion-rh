// Script pour nettoyer toutes les données de test
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanData() {
  console.log('🧹 Nettoyage des données de test...');

  try {
    // Supprimer dans l'ordre des dépendances
    console.log('   🗑️ Suppression des pointages...');
    await prisma.pointage.deleteMany();
    
    console.log('   🗑️ Suppression des congés...');
    await prisma.conge.deleteMany();
    
    console.log('   🗑️ Suppression des shifts...');
    await prisma.shift.deleteMany();
    
    console.log('   🗑️ Suppression des employés de test...');
    await prisma.user.deleteMany({
      where: { 
        AND: [
          { role: 'employee' },
          { email: { contains: '@entreprise.com' } }
        ]
      }
    });

    console.log('✅ Données nettoyées !');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanData();
