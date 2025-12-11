const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLea() {
  const lea = await prisma.user.findFirst({
    where: { 
      nom: 'Garcia',
      prenom: { contains: 'Léa' }
    }
  });
  
  console.log('Léa Garcia:', lea ? `ID = ${lea.id}, Email = ${lea.email}` : 'NON TROUVÉE');
  
  if (lea) {
    const shifts = await prisma.shift.count({
      where: { 
        employeId: lea.id,
        date: { gte: new Date('2025-12-01'), lt: new Date('2025-12-08') }
      }
    });
    console.log(`Shifts semaine 1-7 déc: ${shifts}`);
  }
  
  await prisma.$disconnect();
}

checkLea();
