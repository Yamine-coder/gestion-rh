const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatus() {
  const pointages = await prisma.pointage.count();
  const plannings = await prisma.planning.count();
  const employees = await prisma.user.count({ where: { role: 'employee' } });
  
  console.log('\n📊 STATUS ACTUEL:');
  console.log(`   - Employés: ${employees}`);
  console.log(`   - Plannings: ${plannings}`);
  console.log(`   - Pointages: ${pointages}\n`);
  
  await prisma.$disconnect();
}

checkStatus();
