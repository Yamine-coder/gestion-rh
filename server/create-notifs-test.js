const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestNotifications() {
  try {
    // Utiliser l'utilisateur Jordan (ID 110) qui est connecté
    const user = await prisma.user.findFirst({ 
      where: { id: 110 } 
    });
    
    if (!user) {
      console.log('❌ Pas d\'employé trouvé');
      return;
    }
    
    console.log('📧 Création de notifications pour:', user.prenom, user.nom, '(ID:', user.id, ')');
    
    // Supprimer les anciennes notifs de test
    const deleted = await prisma.notifications.deleteMany({ 
      where: { employe_id: user.id } 
    });
    console.log('🗑️ Anciennes notifications supprimées:', deleted.count);
    
    // Créer des notifications variées
    const notifs = [
      {
        employe_id: user.id,
        type: 'conge_approuve',
        titre: 'Congé approuvé',
        message: 'Votre demande de congés payés du 20/12 au 27/12 a été approuvée.',
        lue: false
      },
      {
        employe_id: user.id,
        type: 'planning_modifie',
        titre: 'Planning mis à jour',
        message: 'Votre planning de la semaine prochaine a été modifié.',
        lue: false
      },
      {
        employe_id: user.id,
        type: 'nouvelle_consigne',
        titre: 'Nouvelle consigne RH',
        message: 'Fermeture exceptionnelle le 25 décembre - Joyeuses fêtes !',
        lue: true
      },
      {
        employe_id: user.id,
        type: 'anomalie_detectee',
        titre: 'Anomalie de pointage',
        message: 'Une anomalie a été détectée sur votre pointage du 05/12.',
        lue: false
      },
      {
        employe_id: user.id,
        type: 'modification_approuvee',
        titre: 'Modification approuvée',
        message: 'Votre demande de modification de pointage a été approuvée.',
        lue: false
      }
    ];
    
    for (const notif of notifs) {
      await prisma.notifications.create({ data: notif });
    }
    
    console.log('✅', notifs.length, 'notifications créées');
    console.log('📊 Non lues:', notifs.filter(n => !n.lue).length);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestNotifications();
