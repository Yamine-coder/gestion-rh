const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('⏰ Création de pointages pour le 20 octobre 2025\n');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Supprimer les pointages d'aujourd'hui
  await prisma.pointage.deleteMany({
    where: {
      horodatage: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 3600000)
      }
    }
  });
  
  // Récupérer les employés
  const employes = await prisma.user.findMany({
    where: { role: 'employee' },
    orderBy: { id: 'asc' }
  });
  
  console.log(`👥 ${employes.length} employés trouvés\n`);
  
  // Jean Dupont - Entrée 08:05, Sortie 16:00
  const e1 = employes[0];
  const entree1 = new Date(today);
  entree1.setHours(8, 5, 0, 0);
  await prisma.pointage.create({
    data: {
      userId: e1.id,
      type: 'entrée',
      horodatage: entree1
    }
  });
  console.log(`✅ ${e1.prenom} ${e1.nom} - Entrée: 08:05`);
  
  const sortie1 = new Date(today);
  sortie1.setHours(16, 0, 0, 0);
  await prisma.pointage.create({
    data: {
      userId: e1.id,
      type: 'sortie',
      horodatage: sortie1
    }
  });
  console.log(`✅ ${e1.prenom} ${e1.nom} - Sortie: 16:00`);
  
  // Marie Martin - Entrée 14:10
  if (employes[1]) {
    const e2 = employes[1];
    const entree2 = new Date(today);
    entree2.setHours(14, 10, 0, 0);
    await prisma.pointage.create({
      data: {
        userId: e2.id,
        type: 'entrée',
        horodatage: entree2
      }
    });
    console.log(`✅ ${e2.prenom} ${e2.nom} - Entrée: 14:10`);
  }
  
  console.log('\n🎉 Pointages créés pour aujourd\'hui !');
  console.log('\n💡 Rechargez la vue journalière pour voir les données');
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
