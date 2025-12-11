const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateShiftTypes() {
  console.log('='.repeat(60));
  console.log('🔄 MIGRATION DES TYPES DE SHIFTS VERS "travail"');
  console.log('='.repeat(60));
  
  // Types à migrer vers "travail"
  const typesToMigrate = ['présence', 'NORMAL', 'matin', 'soir', 'coupure'];
  
  // Comptage avant migration
  console.log('\n📊 AVANT MIGRATION:');
  for (const type of typesToMigrate) {
    const count = await prisma.shift.count({ where: { type } });
    console.log(`   - "${type}": ${count} shifts`);
  }
  
  const existingTravail = await prisma.shift.count({ where: { type: 'travail' } });
  console.log(`   - "travail" (déjà): ${existingTravail} shifts`);
  
  // Migration
  console.log('\n🔄 MIGRATION EN COURS...');
  
  const result = await prisma.shift.updateMany({
    where: {
      type: { in: typesToMigrate }
    },
    data: {
      type: 'travail'
    }
  });
  
  console.log(`✅ ${result.count} shifts migrés vers "travail"`);
  
  // Comptage après migration
  console.log('\n📊 APRÈS MIGRATION:');
  const allTypes = await prisma.$queryRaw`
    SELECT type, COUNT(*) as count
    FROM "Shift"
    GROUP BY type
    ORDER BY count DESC
  `;
  
  allTypes.forEach(t => {
    console.log(`   - "${t.type}": ${t.count} shifts`);
  });
  
  console.log('\n✅ Migration terminée !');
  console.log('   Types valides restants: "travail", "repos", "absence"');
  
  await prisma.$disconnect();
}

migrateShiftTypes().catch(console.error);
