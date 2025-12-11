const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTypes() {
  const conges = await prisma.conge.findMany({
    select: { id: true, type: true }
  });
  
  const types = [...new Set(conges.map(c => c.type))];
  console.log('Types uniques en base:', types);
  console.log('\nDétail par type:');
  types.forEach(t => {
    const count = conges.filter(c => c.type === t).length;
    console.log(`  - "${t}" : ${count} congés`);
  });
  
  await prisma.$disconnect();
}

checkTypes();
