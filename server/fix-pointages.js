const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Vérification après test de régularisation pour Marco
  const marcoId = 93;
  const testDate = new Date('2026-01-28T12:00:00.000Z');
  
  console.log('=== VÉRIFICATION RÉSULTAT TEST MARCO ===\n');
  
  // 1. Vérifier l'anomalie
  const anomalie = await prisma.anomalie.findFirst({
    where: { employeId: marcoId, type: 'pointage_hors_planning' },
    orderBy: { id: 'desc' }
  });
  
  if (anomalie) {
    console.log(`📋 Anomalie #${anomalie.id}:`);
    console.log(`   Statut: ${anomalie.statut}`);
    console.log(`   Details: ${anomalie.details}`);
  } else {
    console.log('❌ Aucune anomalie trouvée');
  }
  
  // 2. Vérifier les shifts de Marco
  console.log('\n📅 Shifts de Marco:');
  const shifts = await prisma.shift.findMany({
    where: { employeId: marcoId },
    orderBy: { date: 'desc' },
    take: 5
  });
  
  if (shifts.length === 0) {
    console.log('   ❌ AUCUN SHIFT !');
  } else {
    shifts.forEach(s => {
      console.log(`   ✅ Shift #${s.id}: ${s.date.toISOString().split('T')[0]} | ${s.type}`);
      console.log(`      Segments: ${s.segments}`);
      console.log(`      Motif: ${s.motif}`);
    });
  }
  
  // 3. Vérifier les pointages
  console.log('\n⏰ Pointages de Marco le 28/01:');
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: marcoId,
      horodatage: {
        gte: new Date('2026-01-28T00:00:00.000Z'),
        lt: new Date('2026-01-29T00:00:00.000Z')
      }
    }
  });
  pointages.forEach(p => {
    console.log(`   ${p.type}: ${p.horodatage.toISOString()}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
