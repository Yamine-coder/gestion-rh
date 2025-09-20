// Script pour ajouter des pointages (arrivée/départ) dans la base de données
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ajouterPointages() {
  try {
    // ID de l'employé pour lequel ajouter des pointages (à remplacer par un ID valide)
    const userId = 1; // Remplacez par un ID valide de votre base
    
    // Date d'aujourd'hui
    const aujourdhui = new Date();
    
    // Pointage d'arrivée (8h du matin)
    const heureArrivee = new Date(aujourdhui);
    heureArrivee.setHours(8, 0, 0, 0); // 8h00
    
    // Pointage de départ (17h)
    const heureDepart = new Date(aujourdhui);
    heureDepart.setHours(17, 0, 0, 0); // 17h00
    
    // Ajouter pointage d'arrivée
    const arrivee = await prisma.pointage.create({
      data: {
        type: 'arrivee',
        horodatage: heureArrivee,
        userId: userId,
      }
    });
    
    console.log('✅ Pointage arrivée ajouté:', arrivee);
    
    // Ajouter pointage de départ
    const depart = await prisma.pointage.create({
      data: {
        type: 'depart',
        horodatage: heureDepart,
        userId: userId,
      }
    });
    
    console.log('✅ Pointage départ ajouté:', depart);
    
    // Afficher tous les pointages de cet utilisateur aujourd'hui
    const pointagesDuJour = await prisma.pointage.findMany({
      where: {
        userId,
        horodatage: {
          gte: new Date(aujourdhui.setHours(0, 0, 0, 0)),
        }
      },
      orderBy: {
        horodatage: 'asc'
      }
    });
    
    console.log('\n📊 Pointages du jour pour utilisateur', userId, ':');
    pointagesDuJour.forEach(p => {
      console.log(`- ${p.type.padEnd(8)} : ${p.horodatage.toLocaleTimeString()}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des pointages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la fonction
ajouterPointages()
  .then(() => console.log('✨ Script terminé'));
