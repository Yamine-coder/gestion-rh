const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const anomalies = await prisma.anomalie.findMany({
    where: { id: { in: [127, 132] } },
    select: { 
      id: true, 
      type: true, 
      statut: true, 
      heuresExtra: true, 
      montantExtra: true, 
      details: true, 
      description: true,
      date: true,
      employeId: true
    }
  });
  
  console.log('=== ANOMALIES HEURES SUP ===\n');
  anomalies.forEach(a => {
    console.log(`ID: ${a.id}`);
    console.log(`Type: ${a.type}`);
    console.log(`Statut: ${a.statut}`);
    console.log(`Date: ${a.date}`);
    console.log(`EmployeId: ${a.employeId}`);
    console.log(`Description: ${a.description}`);
    console.log(`heuresExtra: ${a.heuresExtra}`);
    console.log(`montantExtra: ${a.montantExtra}`);
    console.log(`Details:`, JSON.stringify(a.details, null, 2));
    console.log('\n---\n');
  });
  
  await prisma.$disconnect();
}

check();
