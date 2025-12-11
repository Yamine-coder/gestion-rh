const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('='.repeat(60));
  console.log('✅ VÉRIFICATION POST-MIGRATION');
  console.log('='.repeat(60));
  
  // Comptage final des types
  const types = await prisma.$queryRaw`
    SELECT type, COUNT(*) as count
    FROM "Shift"
    GROUP BY type
    ORDER BY count DESC
  `;
  
  console.log('\n📊 TYPES DE SHIFTS EN BASE:');
  types.forEach(t => {
    const icon = t.type === 'travail' ? '✅' : 
                 t.type === 'repos' ? '😴' : 
                 t.type === 'absence' ? '🏥' : '⚠️';
    console.log(`   ${icon} "${t.type}": ${t.count} shifts`);
  });
  
  // Vérifier qu'il n'y a plus d'anciens types
  const oldTypes = await prisma.shift.count({
    where: {
      type: { in: ['présence', 'NORMAL', 'matin', 'soir', 'coupure'] }
    }
  });
  
  if (oldTypes > 0) {
    console.log(`\n⚠️ ATTENTION: ${oldTypes} shifts avec anciens types trouvés !`);
  } else {
    console.log('\n✅ Aucun ancien type trouvé - migration réussie !');
  }
  
  // Stats sur les extras
  const shifts = await prisma.shift.findMany({ select: { segments: true } });
  let extraCount = 0;
  shifts.forEach(s => {
    let segs = s.segments || [];
    if (typeof segs === 'string') try { segs = JSON.parse(segs); } catch {}
    if (Array.isArray(segs)) {
      segs.forEach(seg => { if (seg.isExtra) extraCount++; });
    }
  });
  console.log(`\n💰 Segments EXTRA (heures au noir): ${extraCount}`);
  
  console.log('\n📋 RÉSUMÉ:');
  console.log('   - Type "travail" = jour de travail planifié');
  console.log('   - Type "repos" = jour de repos');
  console.log('   - Type "absence" = absence planifiée');
  console.log('   - segment.isExtra = true → heures au noir (exclus des stats)');
  
  await prisma.$disconnect();
}

verifyMigration().catch(console.error);
