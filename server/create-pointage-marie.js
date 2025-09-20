const axios = require('axios');

async function createPointageForMarie() {
  try {
    console.log('🔧 Création de pointages pour Marie Dupont...\n');
    
    // Créer un pointage directement via API interne (comme force-pointage-mouss.js)
    console.log('📍 Simulation de pointage pour Marie...');
    
    // D'abord récupérer l'ID de Marie
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const marie = await prisma.utilisateur.findUnique({
      where: { email: 'marie.dupont@entreprise.com' }
    });
    
    if (!marie) {
      console.log('❌ Marie Dupont non trouvée');
      return;
    }
    
    console.log('✅ Marie trouvée:', marie.id, marie.email);
    
    // Créer quelques pointages
    const maintenant = new Date();
    
    // Arrivée il y a 2 heures
    const arrivee = new Date(maintenant);
    arrivee.setHours(maintenant.getHours() - 2);
    
    const pointageArrivee = await prisma.pointage.create({
      data: {
        userId: marie.id,
        type: 'arrivee',
        horodatage: arrivee,
        date: arrivee.toISOString().split('T')[0]
      }
    });
    
    console.log('✅ Pointage arrivée créé:', pointageArrivee.id, arrivee.toLocaleString('fr-FR'));
    
    // Départ il y a 1 heure
    const depart = new Date(maintenant);
    depart.setHours(maintenant.getHours() - 1);
    
    const pointageDepart = await prisma.pointage.create({
      data: {
        userId: marie.id,
        type: 'depart', 
        horodatage: depart,
        date: depart.toISOString().split('T')[0]
      }
    });
    
    console.log('✅ Pointage départ créé:', pointageDepart.id, depart.toLocaleString('fr-FR'));
    
    // Nouvelle arrivée maintenant
    const nouvelleArrivee = await prisma.pointage.create({
      data: {
        userId: marie.id,
        type: 'arrivee',
        horodatage: maintenant,
        date: maintenant.toISOString().split('T')[0]
      }
    });
    
    console.log('✅ Nouvelle arrivée créée:', nouvelleArrivee.id, maintenant.toLocaleString('fr-FR'));
    
    // Vérifier les pointages créés
    const allPointages = await prisma.pointage.findMany({
      where: { userId: marie.id },
      orderBy: { horodatage: 'asc' }
    });
    
    console.log('\n📊 Récapitulatif des pointages pour Marie:');
    allPointages.forEach((p, i) => {
      console.log(`  ${i+1}. ${p.type.toUpperCase()} - ${new Date(p.horodatage).toLocaleString('fr-FR')}`);
    });
    
    await prisma.$disconnect();
    
    console.log('\n🎉 Pointages créés avec succès pour Marie Dupont !');
    console.log('📱 Tu peux maintenant tester le frontend avec marie.dupont@entreprise.com / 123456');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

createPointageForMarie();
