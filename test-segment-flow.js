const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function testSegmentFlow() {
  // 1. Trouver un shift avec segment extra
  const shift = await prisma.shift.findFirst({
    where: {
      segments: {
        path: [],
        not: { equals: [] }
      }
    },
    include: {
      employe: { select: { nom: true, prenom: true } }
    },
    orderBy: { date: 'desc' }
  });

  if (!shift) {
    console.log('Aucun shift avec segments trouvé');
    await prisma.$disconnect();
    return;
  }

  console.log('Shift trouvé:', shift.id);
  console.log('Employé:', shift.employe?.prenom, shift.employe?.nom);
  console.log('Date:', shift.date);
  console.log('Segments actuels:', JSON.stringify(shift.segments, null, 2));

  // Trouver le segment extra
  const segments = shift.segments;
  const extraSegment = segments.find(s => s.isExtra);
  
  if (extraSegment) {
    console.log('\nSegment Extra trouvé:');
    console.log('  - Start:', extraSegment.start);
    console.log('  - End:', extraSegment.end);
    console.log('  - Type:', extraSegment.type);
    
    // Vérifier le paiement associé
    const paiement = await prisma.paiementExtra.findFirst({
      where: {
        employe: shift.employe_id,
        date: shift.date
      }
    });
    
    if (paiement) {
      console.log('\nPaiement Extra associé:');
      console.log('  - ID:', paiement.id);
      console.log('  - Heures:', paiement.heures);
      console.log('  - Montant:', paiement.montant);
      console.log('  - Heures initiales:', paiement.heuresInitiales);
      console.log('  - Montant initial:', paiement.montantInitial);
      console.log('  - Segment initial:', paiement.segmentInitial);
      console.log('  - Commentaire:', paiement.commentaire);
    } else {
      console.log('\nPas de paiement extra trouvé pour ce shift');
    }
  } else {
    console.log('\nAucun segment extra dans ce shift');
    console.log('Segments:', segments.map(s => `${s.type}: ${s.start}-${s.end}`).join(', '));
  }

  await prisma.$disconnect();
}

testSegmentFlow().catch(console.error);
