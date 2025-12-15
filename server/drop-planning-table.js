const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function dropPlanningTable() {
  try {
    // Vérifier si la table existe
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'Planning'
    `;
    
    if (tables.length === 0) {
      console.log('✓ Table Planning n\'existe pas ou déjà supprimée');
      return;
    }
    
    // Supprimer la table
    await prisma.$executeRaw`DROP TABLE IF EXISTS "Planning" CASCADE`;
    
    console.log('✓ Table Planning supprimée avec succès');
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

dropPlanningTable();
