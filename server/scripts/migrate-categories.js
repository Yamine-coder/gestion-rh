/**
 * Script de migration : categorie (String) → categories (JSON array)
 * 
 * Ce script :
 * 1. Lit tous les utilisateurs avec une categorie
 * 2. Convertit en tableau JSON et stocke dans categories
 * 3. Garde l'ancien champ categorie pour rétrocompatibilité
 * 
 * Usage: node server/scripts/migrate-categories.js
 */

const prisma = require('../prisma/client');

async function migrateCategories() {
  console.log('🚀 Migration des catégories en cours...\n');
  
  try {
    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        categorie: true,
        categories: true
      }
    });
    
    console.log(`📊 ${users.length} utilisateurs trouvés\n`);
    
    let migrated = 0;
    let skipped = 0;
    let alreadyMigrated = 0;
    
    for (const user of users) {
      const displayName = `${user.prenom || ''} ${user.nom || ''}`.trim() || `User #${user.id}`;
      
      // Déjà migré ?
      if (user.categories) {
        console.log(`⏭️  ${displayName}: déjà migré (${user.categories})`);
        alreadyMigrated++;
        continue;
      }
      
      // Pas de catégorie à migrer ?
      if (!user.categorie) {
        console.log(`⚪ ${displayName}: pas de catégorie`);
        skipped++;
        continue;
      }
      
      // Convertir en tableau JSON
      const categoriesArray = [user.categorie];
      const categoriesJson = JSON.stringify(categoriesArray);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { categories: categoriesJson }
      });
      
      console.log(`✅ ${displayName}: "${user.categorie}" → ${categoriesJson}`);
      migrated++;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📈 RÉSUMÉ DE LA MIGRATION');
    console.log('='.repeat(50));
    console.log(`✅ Migrés: ${migrated}`);
    console.log(`⏭️  Déjà migrés: ${alreadyMigrated}`);
    console.log(`⚪ Sans catégorie: ${skipped}`);
    console.log(`📊 Total: ${users.length}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateCategories();
