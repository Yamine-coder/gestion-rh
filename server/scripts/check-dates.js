const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDates() {
  console.log('\n🗓️ VÉRIFICATION DES DATES\n');
  
  const today = new Date();
  console.log('Date système:', today);
  console.log('Date système ISO:', today.toISOString());
  console.log('Date système locale:', today.toLocaleString('fr-FR'));
  
  // Vérifier tous les pointages
  const allPointages = await prisma.pointage.findMany({
    select: {
      id: true,
      type: true,
      horodatage: true,
      user: {
        select: { prenom: true, nom: true }
      }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  console.log(`\n📊 TOUS LES POINTAGES (${allPointages.length}):\n`);
  
  allPointages.forEach(p => {
    const heure = p.horodatage.toLocaleString('fr-FR');
    console.log(`   ${p.type} - ${p.user.prenom} ${p.user.nom} - ${heure}`);
  });
  
  await prisma.$disconnect();
}

checkDates().catch(console.error);
