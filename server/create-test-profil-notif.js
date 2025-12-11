const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Créer une notification de test avec le type profil_modification_approuvee
  const notif = await prisma.notifications.create({
    data: {
      employe_id: 110,
      type: 'profil_modification_approuvee',
      titre: 'Modification de profil approuvée',
      message: 'Votre demande de modification du champ "email" a été approuvée.||champ:email||nouvelleValeur:nouveau@email.com'
    }
  });
  
  console.log('✅ Notification créée:', notif.id, notif.type);
  console.log('Message:', notif.message);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
