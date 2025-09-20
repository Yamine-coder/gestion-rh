 const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectShift() {
  const shift = await prisma.shift.findFirst({
    where: { employeId: 86 }
  });
  
  console.log('📋 Structure du shift:');
  console.log(JSON.stringify(shift, null, 2));
  
  await prisma.$disconnect();
}

inspectShift();
