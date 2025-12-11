const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Paiements annulés récemment
  const paiements = await prisma.paiementExtra.findMany({
    where: { statut: 'annule' },
    orderBy: { updatedAt: 'desc' },
    take: 3
  });
  
  console.log('=== Paiements annulés récemment ===\n');
  for (const p of paiements) {
    console.log('Paiement ID:', p.id);
    console.log('  Date:', p.date);
    console.log('  Source:', p.source);
    console.log('  EmployeId:', p.employeId);
    console.log('  Commentaire:', p.commentaire);
    
    // Vérifier le shift associé
    const shift = await prisma.shift.findFirst({
      where: {
        employeId: p.employeId,
        date: p.date
      }
    });
    
    if (shift) {
      console.log('  Shift trouvé:', shift.id);
      const extraSegments = shift.segments?.filter(s => s.isExtra) || [];
      console.log('  Segments extra dans shift:', extraSegments.length);
      if (extraSegments.length > 0) {
        extraSegments.forEach(s => console.log('    -', s.start, '-', s.end));
      }
    } else {
      console.log('  Pas de shift trouvé');
    }
    console.log('');
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);
