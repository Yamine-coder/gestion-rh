const prisma = require('./server/prisma/client');

async function checkShifts7Dec() {
  const shifts = await prisma.shift.findMany({
    where: {
      date: {
        gte: new Date('2025-12-07T00:00:00Z'),
        lte: new Date('2025-12-07T23:59:59Z')
      }
    },
    include: {
      employe: { select: { id: true, prenom: true, nom: true, categorie: true } }
    }
  });
  
  console.log('📅 Shifts du 7 décembre 2025:');
  shifts.forEach(s => {
    console.log(`  - ${s.employe.prenom} ${s.employe.nom} (ID:${s.employe.id})`);
    console.log(`    Type: ${s.type}, Catégorie: ${s.employe.categorie}`);
    console.log(`    Motif: ${s.motif || '(aucun)'}`);
    console.log(`    Segments: ${JSON.stringify(s.segments)}`);
    console.log('');
  });
  
  await prisma.$disconnect();
}

checkShifts7Dec();
