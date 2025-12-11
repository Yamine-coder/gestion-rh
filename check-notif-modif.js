const prisma = require('./server/prismaClient');

async function checkNotifications() {
  try {
    // Vérifier les notifications de type modification
    const notifs = await prisma.notifications.findMany({
      where: {
        type: { contains: 'modification' }
      },
      orderBy: { date_creation: 'desc' },
      take: 10
    });
    
    console.log(`\n📨 ${notifs.length} notification(s) de modification trouvée(s):\n`);
    
    for (const n of notifs) {
      console.log(`- ID: ${n.id}`);
      console.log(`  Type: ${n.type}`);
      console.log(`  Titre: ${n.titre}`);
      console.log(`  Message: ${n.message?.substring(0, 80)}...`);
      console.log(`  Pour employe_id: ${n.employe_id}`);
      console.log(`  Lue: ${n.lue}`);
      console.log(`  Date: ${n.date_creation}`);
      console.log('');
    }
    
    // Vérifier qui sont les admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin', 'rh'] } },
      select: { id: true, email: true, role: true }
    });
    
    console.log('\n👤 Admins/RH dans le système:');
    admins.forEach(a => console.log(`  - ID: ${a.id}, Email: ${a.email}, Role: ${a.role}`));
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNotifications();
