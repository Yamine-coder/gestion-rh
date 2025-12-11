const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestCongesNotifications() {
  try {
    console.log('🔍 Vérification des demandes de congé existantes...');
    
    // Récupérer les congés de l'utilisateur de test (ID 110)
    const conges = await prisma.conge.findMany({
      where: {
        userId: 110
      },
      orderBy: {
        dateDebut: 'desc'
      },
      take: 3
    });

    console.log(`✅ ${conges.length} demande(s) de congé trouvée(s) pour l'utilisateur 110`);

    if (conges.length === 0) {
      console.log('⚠️  Aucun congé trouvé. Création d\'une demande de congé de test...');
      
      // Créer une demande de congé de test
      const nouveauConge = await prisma.conge.create({
        data: {
          userId: 110,
          type: 'CP',
          dateDebut: new Date('2024-12-15'),
          dateFin: new Date('2024-12-20'),
          statut: 'en attente',
          vu: false
        }
      });

      console.log('✅ Demande de congé créée:', nouveauConge);
      conges.push(nouveauConge);
    }

    console.log('\n🔔 Création de notifications de test...\n');

    // 1. Notification de congé approuvé
    if (conges.length > 0) {
      const notif1 = await prisma.notifications.create({
        data: {
          employe_id: 110,
          type: 'conge_approuve',
          titre: 'Demande de congé approuvée',
          message: `Votre demande de congé (CP) du ${new Date(conges[0].dateDebut).toLocaleDateString('fr-FR')} au ${new Date(conges[0].dateFin).toLocaleDateString('fr-FR')} a été approuvée.`,
          lue: false,
          date_creation: new Date('2024-12-02T10:30:00')
        }
      });
      console.log('✅ Notification 1 créée (congé approuvé - non lue):', notif1.titre);
    }

    // 2. Notification de congé refusé
    const notif2 = await prisma.notifications.create({
      data: {
        employe_id: 110,
        type: 'conge_rejete',
        titre: 'Demande de congé refusée',
        message: `Votre demande de congé (RTT) du 10/12/2024 au 12/12/2024 a été refusée. Raison: Période de forte activité`,
        lue: false,
        date_creation: new Date('2024-12-02T09:15:00')
      }
    });
    console.log('✅ Notification 2 créée (congé refusé - non lue):', notif2.titre);

    // 3. Notification de congé approuvé (ancienne, lue)
    const notif3 = await prisma.notifications.create({
      data: {
        employe_id: 110,
        type: 'conge_approuve',
        titre: 'Demande de congé approuvée',
        message: `Votre demande de congé (Maladie) du 25/11/2024 au 27/11/2024 a été approuvée.`,
        lue: true,
        date_creation: new Date('2024-11-24T14:20:00'),
        date_lecture: new Date('2024-11-24T16:30:00')
      }
    });
    console.log('✅ Notification 3 créée (congé approuvé - lue):', notif3.titre);

    console.log('\n✨ Test terminé! 3 notifications de congé créées pour l\'utilisateur 110');
    console.log('📊 2 non lues (approuvé + refusé) et 1 lue (approuvé ancien)');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestCongesNotifications();
