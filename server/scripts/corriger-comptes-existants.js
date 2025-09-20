// Script pour corriger les comptes existants
// Marque tous les comptes existants comme ayant complété l'onboarding

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function corrigerComptesExistants() {
  try {
    console.log('🔄 Correction des comptes existants...');
    
    // Mettre à jour tous les comptes existants qui n'ont pas encore fait l'onboarding
    const result = await prisma.user.updateMany({
      where: {
        firstLoginDone: false,
        // On peut aussi ajouter une condition sur la date de création
        // pour ne traiter que les anciens comptes
      },
      data: {
        firstLoginDone: true,
        lastLoginAt: new Date(), // Optionnel : marquer comme connecté récemment
      }
    });
    
    console.log(`✅ ${result.count} compte(s) corrigé(s)`);
    console.log('📋 Les comptes existants ne seront plus redirigés vers l\'onboarding');
    
    // Afficher la liste des comptes pour vérification
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        firstLoginDone: true,
        createdAt: true
      }
    });
    
    console.log('\n📊 État des comptes après correction :');
    console.table(users);
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction :', error);
  } finally {
    await prisma.$disconnect();
  }
}

corrigerComptesExistants();
