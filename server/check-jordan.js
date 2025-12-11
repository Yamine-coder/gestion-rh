const p = require('./prisma/client');

(async () => {
  const user = await p.user.findUnique({
    where: { email: 'yjordan496@gmail.com' }
  });
  
  console.log('Jordan User:');
  console.log('  - User ID:', user?.id);
  console.log('  - Email:', user?.email);
  console.log('  - employeId:', user?.employeId);
  
  const employe = await p.employe.findUnique({
    where: { id: 110 }
  });
  
  console.log('\nJordan Employé (ID 110):');
  console.log('  - Nom:', employe?.nom);
  console.log('  - Prénom:', employe?.prenom);
  console.log('  - userId:', employe?.userId);
  
  await p.$disconnect();
})();
