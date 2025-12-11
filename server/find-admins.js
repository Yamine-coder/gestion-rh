const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Trouver les admins
  const admins = await prisma.user.findMany({
    where: { role: 'admin' },
    select: { id: true, email: true, nom: true, prenom: true, password: true }
  });
  
  console.log('=== ADMINS DISPONIBLES ===');
  admins.forEach(a => {
    console.log(`- ID ${a.id}: ${a.prenom} ${a.nom} (${a.email})`);
    console.log(`  Password hash: ${a.password?.substring(0, 20)}...`);
  });
  
  if (admins.length === 0) {
    console.log('\n❌ Aucun admin trouvé ! Création d\'un admin de test...');
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('Admin2025!', 10);
    
    const newAdmin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: hashedPassword,
        nom: 'Admin',
        prenom: 'Test',
        role: 'admin',
        telephone: '0600000000',
        firstLoginDone: true
      }
    });
    
    console.log('✅ Admin créé:', newAdmin.email);
  }
  
  await prisma.$disconnect();
}

main();
