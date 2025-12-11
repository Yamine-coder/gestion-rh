const prisma = require('./prisma/client');

async function checkSource() {
  console.log('RECHERCHE SOURCE ANOMALIE');
  console.log('='.repeat(70));
  
  // Verifier si d'autres users ont des anomalies pointage_hors_planning le 5 dec
  const anomalies5dec = await prisma.anomalie.findMany({
    where: {
      date: {
        gte: new Date('2025-12-05T00:00:00.000Z'),
        lt: new Date('2025-12-06T00:00:00.000Z')
      },
      type: 'pointage_hors_planning'
    },
    include: {
      employe: { select: { email: true, nom: true, prenom: true } }
    }
  });
  
  console.log('');
  console.log('Anomalies pointage_hors_planning du 5 dec:');
  anomalies5dec.forEach(a => {
    console.log('  - ID:', a.id, '|', a.employe?.email, '|', a.description);
  });
  
  // Verifier les pointages du 5 dec pour TOUS les users
  console.log('');
  console.log('TOUS les pointages du 5 dec:');
  const pointages5dec = await prisma.pointage.findMany({
    where: {
      horodatage: {
        gte: new Date('2025-12-05T00:00:00.000Z'),
        lt: new Date('2025-12-06T00:00:00.000Z')
      }
    },
    include: {
      user: { select: { id: true, email: true } }
    }
  });
  
  console.log('  Nombre total:', pointages5dec.length);
  pointages5dec.forEach(p => {
    console.log('  - userId:', p.userId, '|', p.user?.email, '|', p.type, '|', p.horodatage.toISOString());
  });
  
  // Chercher des scripts de test qui auraient pu creer ca
  console.log('');
  console.log('CONCLUSION:');
  if (pointages5dec.length === 0) {
    console.log('  AUCUN pointage le 5 dec -> anomalie creee par erreur ou script de test');
  }
  
  await prisma.$disconnect();
}

checkSource();
