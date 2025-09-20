const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestPointages() {
  try {
    // Créer des pointages de test pour aujourd'hui
    const today = new Date();
    today.setHours(8, 0, 0, 0); // 8h00
    
    const depart = new Date();
    depart.setHours(17, 0, 0, 0); // 17h00
    
    // Trouver le premier utilisateur
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('Aucun utilisateur trouvé');
      return;
    }
    
    console.log('Utilisateur trouvé:', user.email, user.nom, user.prenom);
    
    // Créer pointage arrivée
    const arrivee = await prisma.pointage.create({
      data: {
        type: 'arrivee',
        userId: user.id,
        horodatage: today
      }
    });
    
    // Créer pointage départ
    const departPointage = await prisma.pointage.create({
      data: {
        type: 'depart',
        userId: user.id,
        horodatage: depart
      }
    });
    
    console.log('Pointages créés:', arrivee.id, departPointage.id);
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPointages();
