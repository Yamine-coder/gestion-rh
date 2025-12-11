const { PrismaClient } = require('./server/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function createTestNotifications() {
  try {
    console.log('🔍 Recherche de l\'utilisateur de test...');
    
    const user = await prisma.user.findFirst({
      where: { email: 'yjordan496@gmail.com' }
    });

    if (!user) {
      console.log('❌ Utilisateur yjordan496@gmail.com non trouvé');
      return;
    }

    console.log(`✅ Utilisateur trouvé: ${user.prenom} ${user.nom} (ID: ${user.id})`);

    // Créer des notifications de test
    const notificationsData = [
      {
        employe_id: user.id,
        type: 'modification_approuvee',
        titre: 'Demande de modification approuvée',
        message: 'Votre demande de modification du champ "prenom" a été approuvée.',
        lue: false,
        date_creation: new Date('2024-12-01T10:30:00')
      },
      {
        employe_id: user.id,
        type: 'modification_rejetee',
        titre: 'Demande de modification rejetée',
        message: 'Votre demande de modification du champ "email" a été rejetée. Raison: Format invalide',
        lue: false,
        date_creation: new Date('2024-12-02T09:15:00')
      },
      {
        employe_id: user.id,
        type: 'modification_approuvee',
        titre: 'Demande de modification approuvée',
        message: 'Votre demande de modification du champ "telephone" a été approuvée.',
        lue: false,
        date_creation: new Date('2024-12-02T14:00:00')
      },
      {
        employe_id: user.id,
        type: 'modification_approuvee',
        titre: 'Demande de modification approuvée',
        message: 'Votre demande de modification du champ "adresse" a été approuvée.',
        lue: true,
        date_lecture: new Date('2024-12-01T11:00:00'),
        date_creation: new Date('2024-11-30T16:45:00')
      }
    ];

    console.log('📝 Création des notifications de test...');

    for (const data of notificationsData) {
      const notif = await prisma.notifications.create({ data });
      console.log(`✅ Créé: ${data.titre} (${data.lue ? 'lue' : 'non lue'})`);
    }

    const unreadCount = notificationsData.filter(n => !n.lue).length;

    console.log('');
    console.log('✨ Test terminé avec succès!');
    console.log(`📊 ${notificationsData.length} notifications créées pour ${user.prenom} ${user.nom}`);
    console.log(`   - ${unreadCount} notifications non lues`);
    console.log(`   - ${notificationsData.length - unreadCount} notification lue`);
    console.log('');
    console.log('🎯 Types de notifications:');
    console.log('   - 3 approuvées');
    console.log('   - 1 rejetée');
    console.log('');
    console.log('💡 Connecte-toi avec yjordan496@gmail.com pour voir les notifications');
    console.log('   Un badge apparaîtra dans la navbar avec le nombre de notifications non lues');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestNotifications();
