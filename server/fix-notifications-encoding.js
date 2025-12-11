const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixNotificationsEncoding() {
  console.log('=== Correction encodage notifications ===\n');

  try {
    // Recuperer toutes les notifications
    const notifications = await prisma.notifications.findMany();
    console.log(`Nombre de notifications: ${notifications.length}`);

    let fixed = 0;

    for (const notif of notifications) {
      let newTitre = notif.titre;
      let newMessage = notif.message;
      let needsUpdate = false;

      // Supprimer les emojis et caracteres speciaux au debut du titre
      if (newTitre) {
        const cleanTitre = newTitre.replace(/^[^\w\sA-Za-z]+/u, '').trim();
        if (cleanTitre !== newTitre) {
          newTitre = cleanTitre;
          needsUpdate = true;
        }
      }

      // Remplacer les caracteres accentues par leurs equivalents simples
      const accentMap = {
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'à': 'a', 'â': 'a', 'ä': 'a',
        'ù': 'u', 'û': 'u', 'ü': 'u',
        'î': 'i', 'ï': 'i',
        'ô': 'o', 'ö': 'o',
        'ç': 'c',
        'É': 'E', 'È': 'E', 'Ê': 'E',
        'À': 'A', 'Â': 'A',
        'Ù': 'U', 'Û': 'U',
        'Î': 'I',
        'Ô': 'O',
        'Ç': 'C'
      };

      // Note: On ne change pas les accents dans le message car ils s'affichent bien
      // On ne corrige que les caracteres casses

      if (needsUpdate) {
        await prisma.notifications.update({
          where: { id: notif.id },
          data: { titre: newTitre }
        });
        console.log(`  Corrige: "${notif.titre}" -> "${newTitre}"`);
        fixed++;
      }
    }

    console.log(`\n${fixed} notification(s) corrigee(s)`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixNotificationsEncoding();
