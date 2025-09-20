// scripts/add-pointages.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPointages() {
  try {
    // Récupérer un employé aléatoire (ou le premier)
    const employe = await prisma.user.findFirst({
      where: { role: 'employee' },
      select: { id: true, email: true }
    });

    if (!employe) {
      console.error("❌ Aucun employé trouvé dans la base de données");
      return;
    }

    console.log(`🧑‍💼 Création de pointages pour : ${employe.email} (ID: ${employe.id})`);

    // Date d'aujourd'hui à 9h du matin
    const now = new Date();
    const arrivee = new Date(now);
    arrivee.setHours(9, 0, 0, 0); // 9:00:00

    // Date d'aujourd'hui maintenant (ou heure fixe pour test)
    const depart = new Date(now); 
    // Si vous voulez une durée fixe, décommentez la ligne ci-dessous
    // depart.setHours(17, 30, 0, 0); // 17:30:00

    // Créer pointage arrivée
    const pointageArrivee = await prisma.pointage.create({
      data: {
        type: 'arrivee',
        horodatage: arrivee,
        userId: employe.id
      }
    });

    // Créer pointage départ
    const pointageDepart = await prisma.pointage.create({
      data: {
        type: 'depart',
        horodatage: depart,
        userId: employe.id
      }
    });

    console.log("✅ Pointages créés avec succès!");
    console.log(`📍 Arrivée: ${pointageArrivee.horodatage}`);
    console.log(`📍 Départ : ${pointageDepart.horodatage}`);

    // Calculer durée
    const dureeMs = pointageDepart.horodatage - pointageArrivee.horodatage;
    const dureeHeures = Math.floor(dureeMs / (1000 * 60 * 60));
    const dureeMinutes = Math.floor((dureeMs % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log(`⏱️ Durée: ${dureeHeures}h${dureeMinutes.toString().padStart(2, '0')}`);

  } catch (error) {
    console.error("❌ Erreur lors de la création des pointages:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
addPointages();
