const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNotifications() {
  const notifications = await prisma.notifications.findMany({
    where: { employe_id: 110 },
    orderBy: { date_creation: 'desc' }
  });

  console.log(`\n✅ Total notifications: ${notifications.length}\n`);
  
  notifications.forEach((notif, i) => {
    console.log(`${i+1}. [${notif.type}] ${notif.titre}`);
    console.log(`   Status: ${notif.lue ? '✓ LUE' : '○ NON LUE'}`);
    console.log(`   Date: ${notif.date_creation.toLocaleString('fr-FR')}`);
    console.log('');
  });

  const unreadCount = notifications.filter(n => !n.lue).length;
  console.log(`📊 Statistiques: ${unreadCount} non lues / ${notifications.length} total\n`);

  await prisma.$disconnect();
}

checkNotifications();
