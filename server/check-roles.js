const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.groupBy({ 
    by: ['role'], 
    _count: { id: true } 
  });
  
  console.log('📊 Répartition des rôles:');
  users.forEach(u => console.log(`   - ${u.role}: ${u._count.id} users`));
  
  const total = await prisma.user.count();
  console.log(`\n✅ Total: ${total} users`);
  
  await prisma.$disconnect();
})();
