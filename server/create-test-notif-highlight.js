const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestNotification() {
  console.log('=== Creation notification de test pour highlight ===\n');

  try {
    // Trouver un conge existant
    const conge = await prisma.conge.findFirst({
      include: { user: true },
      orderBy: { id: 'desc' }
    });

    if (!conge) {
      console.log('Aucun conge trouve. Creez d\'abord une demande de conge.');
      return;
    }

    console.log('Conge trouve:', {
      id: conge.id,
      type: conge.type,
      user: conge.user?.email
    });

    // Trouver l'admin
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!admin) {
      console.log('Aucun admin trouve.');
      return;
    }

    const employeName = conge.user?.prenom && conge.user?.nom 
      ? `${conge.user.prenom} ${conge.user.nom}` 
      : conge.user?.email || 'Un employe';

    // Creer la notification avec le format JSON
    const notif = await prisma.notifications.create({
      data: {
        employe_id: admin.id,
        type: 'nouvelle_demande_conge',
        titre: 'Nouvelle demande de conge',
        message: JSON.stringify({
          text: `${employeName} demande un ${conge.type} du ${new Date(conge.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(conge.dateFin).toLocaleDateString('fr-FR')}`,
          congeId: conge.id,
          employeNom: employeName
        }),
        lue: false
      }
    });

    console.log('\n✅ Notification creee avec succes!');
    console.log('ID notification:', notif.id);
    console.log('ID conge cible:', conge.id);
    console.log('Message:', notif.message);
    console.log('\n👉 Rafraichissez la page admin et cliquez sur la notification pour tester le highlight!');

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestNotification();
