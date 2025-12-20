const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanEmojis() {
  // Regex pour supprimer tous les emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
  
  const notifs = await prisma.notifications.findMany();
  console.log('Total notifications:', notifs.length);
  
  let updated = 0;
  for (const n of notifs) {
    const newTitre = n.titre.replace(emojiRegex, '').trim();
    
    if (newTitre !== n.titre) {
      await prisma.notifications.update({
        where: { id: n.id },
        data: { titre: newTitre }
      });
      updated++;
      console.log(`"${n.titre}" -> "${newTitre}"`);
    }
  }
  
  console.log('\n✅ Notifications mises à jour:', updated);
  await prisma.$disconnect();
}

cleanEmojis().catch(console.error);
