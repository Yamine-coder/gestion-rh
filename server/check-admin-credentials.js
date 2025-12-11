const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('🔍 Recherche des comptes admin...\n');
  
  const admins = await prisma.user.findMany({ 
    where: { role: 'admin' }, 
    select: { 
      id: true, 
      email: true, 
      nom: true, 
      prenom: true, 
      role: true 
    } 
  });
  
  console.log('👤 Comptes admin trouvés:\n');
  admins.forEach(a => {
    console.log(`   ID: ${a.id}`);
    console.log(`   Email: ${a.email}`);
    console.log(`   Nom: ${a.prenom} ${a.nom}`);
    console.log(`   Role: ${a.role}`);
    console.log('   ' + '-'.repeat(50));
  });
  
  console.log(`\n✅ Total: ${admins.length} admin(s)`);
  console.log('\n💡 Pour tester l\'API, utilisez:');
  if (admins.length > 0) {
    console.log(`   Email: ${admins[0].email}`);
    console.log(`   Password: (le mot de passe que vous avez défini)`);
  }
  
  await prisma.$disconnect();
})();
