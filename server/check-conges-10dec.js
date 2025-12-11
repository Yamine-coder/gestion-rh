const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConges10Dec() {
  const userId = 110;
  const targetDate = new Date('2025-12-10');
  
  // Tous les congés de l'employé
  const conges = await prisma.conge.findMany({
    where: { userId }
  });
  
  console.log(`Congés couvrant le 10 décembre 2025 pour userId ${userId}:\n`);
  
  conges.forEach(c => {
    const debut = new Date(c.dateDebut);
    const fin = new Date(c.dateFin);
    
    // Vérifier si le 10 décembre est dans la plage
    if (debut <= targetDate && fin >= targetDate) {
      console.log(`ID: ${c.id}`);
      console.log(`  Type: ${c.type}`);
      console.log(`  Statut: ${c.statut}`);
      console.log(`  Du: ${c.dateDebut}`);
      console.log(`  Au: ${c.dateFin}`);
      console.log('');
    }
  });
  
  await prisma.$disconnect();
}

checkConges10Dec();
