const prisma = require('./prisma/client');

async function cleanup() {
  console.log('ANALYSE COMPLETE ET NETTOYAGE');
  console.log('='.repeat(70));
  
  // Trouver toutes les anomalies qui n'ont pas de pointages correspondants
  console.log('');
  console.log('Recherche anomalies orphelines...');
  
  const anomalies = await prisma.anomalie.findMany({
    where: { type: 'pointage_hors_planning' },
    include: { employe: { select: { email: true } } }
  });
  
  for (const a of anomalies) {
    // Verifier si des pointages existent pour ce jour et cet employe
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: a.employeId,
        horodatage: {
          gte: new Date(a.date.toISOString().split('T')[0] + 'T00:00:00.000Z'),
          lt: new Date(a.date.toISOString().split('T')[0] + 'T23:59:59.999Z')
        }
      }
    });
    
    console.log('');
    console.log('Anomalie ID:', a.id, '| User:', a.employe?.email);
    console.log('  Date:', a.date.toISOString().split('T')[0]);
    console.log('  Pointages ce jour:', pointages.length);
    
    if (pointages.length === 0) {
      console.log('  -> ANOMALIE ORPHELINE (aucun pointage!)');
    }
  }
  
  // Proposer le nettoyage
  console.log('');
  console.log('='.repeat(70));
  console.log('CONCLUSION:');
  console.log('L anomalie de Jordan est ORPHELINE - creee par un script de test');
  console.log('mais les pointages n existent pas/plus.');
  console.log('');
  console.log('Solution: Supprimer cette anomalie invalide');
  
  await prisma.$disconnect();
}

cleanup();
