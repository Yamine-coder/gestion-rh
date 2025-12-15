const prisma = require('./prisma/client');

async function findForeignKeys() {
  const userId = 110;
  
  console.log('\n=== RECHERCHE DES FK PostgreSQL VERS User ===\n');
  
  // Requête SQL brute pour trouver toutes les FK vers la table User
  const fks = await prisma.$queryRaw`
    SELECT 
      tc.table_name, 
      kcu.column_name,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = 'User'
    ORDER BY tc.table_name
  `;
  
  console.log('FK trouvées:');
  for (const fk of fks) {
    console.log(`\n📌 ${fk.table_name}.${fk.column_name}`);
    
    // Vérifier si cette colonne a des données pour cet user
    try {
      const result = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM "${fk.table_name}" WHERE "${fk.column_name}" = ${userId}`
      );
      if (result[0].count > 0) {
        console.log(`   ⚠️  ${result[0].count} enregistrement(s) référençant user ${userId}!`);
      } else {
        console.log(`   ✓ Aucune référence`);
      }
    } catch (e) {
      console.log(`   (erreur: ${e.message})`);
    }
  }
  
  await prisma.$disconnect();
}

findForeignKeys();
