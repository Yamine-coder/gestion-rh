const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function findExtraShifts() {
  const shifts = await prisma.shift.findMany({
    where: {
      segments: {
        path: [],
        not: { equals: [] }
      }
    },
    include: {
      employe: { select: { nom: true, prenom: true } }
    },
    orderBy: { date: 'desc' },
    take: 20
  });

  console.log('Recherche de shifts avec segments extra...\n');

  for (const shift of shifts) {
    const segments = shift.segments;
    if (!segments || !Array.isArray(segments)) continue;
    
    const extraSegment = segments.find(s => s.isExtra === true);
    if (extraSegment) {
      console.log('--- Shift ID:', shift.id, '---');
      console.log('  Employé:', shift.employe?.prenom, shift.employe?.nom);
      console.log('  Date:', shift.date);
      console.log('  Segment Extra:', extraSegment.start, '-', extraSegment.end);
      console.log('');
    }
  }

  // Aussi vérifier les paiements extras existants
  console.log('\n=== Paiements Extras récents ===\n');
  const paiements = await prisma.paiementExtra.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { employe: { select: { nom: true, prenom: true } } }
  });

  paiements.forEach(p => {
    console.log('Paiement ID:', p.id);
    console.log('  Employé:', p.employe?.prenom, p.employe?.nom);
    console.log('  Date:', p.date);
    console.log('  Heures:', p.heures, '- Montant:', p.montant, '€');
    console.log('  Heures initiales:', p.heuresInitiales);
    console.log('  Segment initial:', p.segmentInitial);
    console.log('  Commentaire:', p.commentaire);
    console.log('');
  });

  await prisma.$disconnect();
}

findExtraShifts().catch(console.error);
