const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConges() {
  const user = await prisma.user.findFirst({ where: { email: 'yjordan496@gmail.com' } });
  
  console.log('👤 Utilisateur:', user.prenom, user.nom, '- ID:', user.id);
  
  // Vérifier les congés
  const conges = await prisma.conge.findMany({
    where: { userId: user.id },
    orderBy: { dateDebut: 'desc' }
  });
  
  console.log('\n📅 Congés trouvés:', conges.length);
  console.log('═══════════════════════════════════════');
  
  conges.forEach(c => {
    const debut = new Date(c.dateDebut).toLocaleDateString('fr-FR');
    const fin = new Date(c.dateFin).toLocaleDateString('fr-FR');
    console.log(`\n  ${debut} -> ${fin}`);
    console.log(`  Type: ${c.type} | Statut: ${c.statut}`);
    
    // Vérifier si le 7 décembre est dans cette période
    const date7dec = new Date('2025-12-07');
    if (date7dec >= new Date(c.dateDebut) && date7dec <= new Date(c.dateFin)) {
      console.log('  ⚠️ INCLUT LE 7 DÉCEMBRE !');
    }
  });
  
  // Vérifier le shift du 7 décembre
  console.log('\n\n📌 Shift du 7 décembre:');
  const shift7 = await prisma.shift.findFirst({
    where: {
      employeId: user.id,
      date: {
        gte: new Date('2025-12-07T00:00:00'),
        lt: new Date('2025-12-08T00:00:00')
      }
    }
  });
  
  if (shift7) {
    console.log('  ID:', shift7.id);
    console.log('  Date:', shift7.date);
    console.log('  Type:', shift7.type);
    console.log('  Segments:', JSON.stringify(shift7.segments));
  } else {
    console.log('  Aucun shift trouvé');
  }
  
  await prisma.$disconnect();
}

checkConges().catch(console.error);
