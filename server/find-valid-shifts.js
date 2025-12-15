const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Trouver des employés avec des shifts de travail valides
  const shifts = await p.shift.findMany({
    where: {
      date: { gte: new Date('2025-12-01'), lte: new Date('2025-12-15') },
      type: 'travail'
    },
    take: 20,
    include: { employe: { select: { id: true, nom: true, prenom: true } } }
  });

  console.log('📋 Shifts de travail trouvés:');
  const employesUniques = new Map();
  
  shifts.forEach(sh => {
    if (sh.segments && Array.isArray(sh.segments) && sh.segments.length > 0) {
      if (!employesUniques.has(sh.employe.id)) {
        employesUniques.set(sh.employe.id, {
          ...sh.employe,
          shiftsCount: 0
        });
      }
      employesUniques.get(sh.employe.id).shiftsCount++;
    }
  });

  console.log('\nEmployés avec shifts valides:');
  employesUniques.forEach(e => {
    console.log(`   ${e.prenom} ${e.nom} (ID: ${e.id}) - ${e.shiftsCount} shifts`);
  });

  await p.$disconnect();
})();
