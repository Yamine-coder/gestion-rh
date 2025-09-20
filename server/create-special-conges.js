const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSpecialConges() {
  try {
    console.log('🎯 Création des congés spéciaux pour tester les badges...');
    
    const users = await prisma.user.findMany({ take: 2 });
    const maintenant = new Date();
    
    // Congé NOUVEAU (simulé)
    await prisma.conge.create({
      data: {
        userId: users[0]?.id || 1,
        type: 'Congés payés NOUVEAU TEST',
        dateDebut: new Date(maintenant.getTime() + 12 * 24 * 60 * 60 * 1000),
        dateFin: new Date(maintenant.getTime() + 14 * 24 * 60 * 60 * 1000),
        statut: 'en attente'
      }
    });
    
    // Congé URGENT (simulé) 
    await prisma.conge.create({
      data: {
        userId: users[1]?.id || 1,
        type: 'RTT URGENT TEST',
        dateDebut: new Date(maintenant.getTime() + 25 * 24 * 60 * 60 * 1000),
        dateFin: new Date(maintenant.getTime() + 26 * 24 * 60 * 60 * 1000),
        statut: 'en attente'
      }
    });
    
    console.log('✅ Badge NOUVEAU créé : "Congés payés NOUVEAU TEST"');
    console.log('✅ Badge URGENT créé : "RTT URGENT TEST"');
    console.log('\n🎯 RÉSUMÉ COMPLET DES TESTS :');
    console.log('============================');
    console.log('🔴 Badge "Nouveau" : Congé avec "NOUVEAU TEST" dans le type');
    console.log('🟠 Badge "Urgent" : Congé avec "URGENT TEST" dans le type');  
    console.log('⚡ Badge "Express" : Congés dans moins de 7 jours');
    console.log('🔵 Bordure rouge : Toutes les demandes en attente');
    
    console.log('\n🚀 VA SUR L\'INTERFACE MAINTENANT !');
    console.log('Tu devrais voir un tri parfait avec tous les badges !');
    
  } catch(error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSpecialConges();
