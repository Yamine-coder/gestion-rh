const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestConges() {
  try {
    console.log('🗑️  Suppression des anciens congés...');
    await prisma.conge.deleteMany({});
    
    console.log('👥 Récupération des utilisateurs...');
    const users = await prisma.user.findMany({
      select: { id: true, email: true, nom: true, prenom: true }
    });
    
    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé');
      return;
    }
    
    console.log(`✅ ${users.length} utilisateurs trouvés`);
    
    const maintenant = new Date();
    
    // Congés de test avec différentes conditions d'urgence
    const testConges = [
      // ⚡ EXPRESS - Demain (TRÈS URGENT)
      {
        userId: users[0]?.id,
        type: "Congé exceptionnel",
        dateDebut: new Date(maintenant.getTime() + 1 * 24 * 60 * 60 * 1000), // Demain !
        dateFin: new Date(maintenant.getTime() + 2 * 24 * 60 * 60 * 1000),   // Après-demain
        statut: "en attente"
      },
      
      // ⚡ EXPRESS - Dans 2 jours
      {
        userId: users[1]?.id || users[0]?.id,
        type: "Congés payés",
        dateDebut: new Date(maintenant.getTime() + 2 * 24 * 60 * 60 * 1000), // Dans 2 jours
        dateFin: new Date(maintenant.getTime() + 4 * 24 * 60 * 60 * 1000),   // Dans 4 jours
        statut: "en attente"
      },
      
      // ⚡ EXPRESS - Dans 3 jours
      {
        userId: users[2]?.id || users[0]?.id,
        type: "RTT",
        dateDebut: new Date(maintenant.getTime() + 3 * 24 * 60 * 60 * 1000), // Dans 3 jours
        dateFin: new Date(maintenant.getTime() + 5 * 24 * 60 * 60 * 1000),   // Dans 5 jours
        statut: "en attente"
      },
      
      // ⚡ EXPRESS - Dans 6 jours
      {
        userId: users[3]?.id || users[0]?.id,
        type: "Congés payés",
        dateDebut: new Date(maintenant.getTime() + 6 * 24 * 60 * 60 * 1000), // Dans 6 jours
        dateFin: new Date(maintenant.getTime() + 10 * 24 * 60 * 60 * 1000),  // Dans 10 jours
        statut: "en attente"
      },
      
      // ⚪ En attente normale - Dans 15 jours
      {
        userId: users[4]?.id || users[0]?.id,
        type: "RTT",
        dateDebut: new Date(maintenant.getTime() + 15 * 24 * 60 * 60 * 1000), // Dans 15 jours
        dateFin: new Date(maintenant.getTime() + 16 * 24 * 60 * 60 * 1000),   // Dans 16 jours
        statut: "en attente"
      },
      
      // ⚪ En attente normale - Dans 30 jours
      {
        userId: users[5]?.id || users[0]?.id,
        type: "Congés payés",
        dateDebut: new Date(maintenant.getTime() + 30 * 24 * 60 * 60 * 1000), // Dans 30 jours
        dateFin: new Date(maintenant.getTime() + 35 * 24 * 60 * 60 * 1000),   // Dans 35 jours
        statut: "en attente"
      },
      
      // ✅ Approuvé récent
      {
        userId: users[6]?.id || users[0]?.id,
        type: "RTT",
        dateDebut: new Date(maintenant.getTime() + 45 * 24 * 60 * 60 * 1000), // Dans 45 jours
        dateFin: new Date(maintenant.getTime() + 47 * 24 * 60 * 60 * 1000),   // Dans 47 jours
        statut: "approuvé"
      },
      
      // ✅ Approuvé historique
      {
        userId: users[7]?.id || users[0]?.id,
        type: "Congés payés",
        dateDebut: new Date(maintenant.getTime() + 60 * 24 * 60 * 60 * 1000), // Dans 60 jours
        dateFin: new Date(maintenant.getTime() + 65 * 24 * 60 * 60 * 1000),   // Dans 65 jours
        statut: "approuvé"
      },
      
      // ❌ Refusé
      {
        userId: users[8]?.id || users[0]?.id,
        type: "Congé maladie",
        dateDebut: new Date(maintenant.getTime() + 20 * 24 * 60 * 60 * 1000), // Dans 20 jours
        dateFin: new Date(maintenant.getTime() + 22 * 24 * 60 * 60 * 1000),   // Dans 22 jours
        statut: "refusé"
      },
      
      // ❌ Refusé
      {
        userId: users[9]?.id || users[0]?.id,
        type: "RTT",
        dateDebut: new Date(maintenant.getTime() + 25 * 24 * 60 * 60 * 1000), // Dans 25 jours
        dateFin: new Date(maintenant.getTime() + 26 * 24 * 60 * 60 * 1000),   // Dans 26 jours
        statut: "refusé"
      }
    ];
    
    console.log('📝 Création des congés de test...');
    
    for (let i = 0; i < testConges.length; i++) {
      const conge = testConges[i];
      if (conge.userId) {
        await prisma.conge.create({ data: conge });
        const joursAvant = Math.ceil((conge.dateDebut - maintenant) / (1000 * 60 * 60 * 24));
        console.log(`✅ Congé ${i + 1}/10 créé - ${conge.statut} - ${conge.type} (dans ${joursAvant} jours)`);
      }
    }
    
    console.log('\n🎯 RÉCAPITULATIF DES CONGÉS CRÉÉS :');
    console.log('=====================================');
    console.log('🔴 PRIORITÉ 1 - EN ATTENTE EXPRESS :');
    console.log('  ⚡ Demain (J+1) : 1 congé');
    console.log('  ⚡ J+2 : 1 congé');  
    console.log('  ⚡ J+3 : 1 congé');
    console.log('  ⚡ J+6 : 1 congé');
    console.log('\n🟡 PRIORITÉ 2 - EN ATTENTE NORMAL :');
    console.log('  ⚪ J+15 : 1 congé');
    console.log('  ⚪ J+30 : 1 congé');
    console.log('\n� PRIORITÉ 3 - TRAITÉS :');
    console.log('  ✅ Approuvé J+45 : 1 congé');
    console.log('  ✅ Approuvé J+60 : 1 congé');
    console.log('  ❌ Refusé J+20 : 1 congé');
    console.log('  ❌ Refusé J+25 : 1 congé');
    console.log('\n🚀 TOTAL : 10 congés de test créés !');
    console.log('\n💡 ORDRE ATTENDU DANS L\'INTERFACE :');
    console.log('   1️⃣ Demain (BADGE EXPRESS) ⚡');
    console.log('   2️⃣ J+2 (BADGE EXPRESS) ⚡');
    console.log('   3️⃣ J+3 (BADGE EXPRESS) ⚡');
    console.log('   4️⃣ J+6 (BADGE EXPRESS) ⚡');
    console.log('   5️⃣ J+15 (pas de badge)');
    console.log('   6️⃣ J+30 (pas de badge)');
    console.log('   7️⃣ Approuvés/Refusés en bas');
    console.log('\n🎯 Maintenant va sur l\'interface pour voir le tri intelligent !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestConges();
