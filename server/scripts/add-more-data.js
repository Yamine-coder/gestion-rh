// Script pour ajouter des données supplémentaires
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addMoreData() {
  console.log('➕ Ajout de données supplémentaires...');

  try {
    // Récupérer tous les employés existants
    const employes = await prisma.user.findMany({
      where: { role: 'employee' }
    });

    if (employes.length === 0) {
      console.log('❌ Aucun employé trouvé. Exécutez d\'abord seed-data.js');
      return;
    }

    // Ajouter plus de pointages pour la semaine actuelle
    console.log('⏰ Ajout de pointages pour cette semaine...');
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lundi

    for (let day = 0; day < 5; day++) { // Lundi à Vendredi
      const workDay = new Date(startOfWeek);
      workDay.setDate(startOfWeek.getDate() + day);
      
      // Skip si c'est dans le futur
      if (workDay > today) continue;

      for (const employe of employes.slice(0, 8)) { // 8 premiers employés
        // Arrivée
        const arrivee = new Date(workDay);
        arrivee.setHours(8, Math.floor(Math.random() * 60), 0, 0);
        
        await prisma.pointage.create({
          data: {
            type: 'arrivée',
            horodatage: arrivee,
            userId: employe.id
          }
        });

        // Départ
        const depart = new Date(workDay);
        depart.setHours(17 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);
        
        await prisma.pointage.create({
          data: {
            type: 'départ',
            horodatage: depart,
            userId: employe.id
          }
        });
      }
    }

    // Ajouter quelques demandes de congés en attente
    console.log('🏖️ Ajout de nouvelles demandes de congés...');
    for (let i = 0; i < 5; i++) {
      const employe = employes[Math.floor(Math.random() * employes.length)];
      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() + Math.floor(Math.random() * 30) + 7); // 7-37 jours dans le futur
      
      const dateFin = new Date(dateDebut);
      dateFin.setDate(dateDebut.getDate() + Math.floor(Math.random() * 5) + 1);

      await prisma.conge.create({
        data: {
          type: ['Congés payés', 'RTT', 'Personnel'][Math.floor(Math.random() * 3)],
          statut: 'en attente',
          dateDebut,
          dateFin,
          userId: employe.id,
          vu: false
        }
      });
    }

    console.log('✅ Données supplémentaires ajoutées !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMoreData();
