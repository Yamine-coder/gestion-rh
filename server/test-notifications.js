const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNotifications() {
  // Trouver l'admin
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  console.log('Admin:', admin.email, '- ID:', admin.id);

  // Compter les notifications
  const notifs = await prisma.notifications.findMany({
    where: { employe_id: admin.id },
    orderBy: { date_creation: 'desc' }
  });
  
  console.log('\n📋 Total notifications pour admin:', notifs.length);
  notifs.forEach(n => {
    console.log('---');
    console.log('ID:', n.id, '| Lue:', n.lue);
    console.log('Titre:', n.titre);
    console.log('Message:', n.message);
  });

  await prisma.$disconnect();
}

checkNotifications().catch(console.error);
