const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addUrgentConges() {
  try {
    console.log('👥 Récupération des utilisateurs...');
    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    });
    
    const maintenant = new Date();
    
    // Simuler un congé "Nouveau" en modifiant manuellement la base si possible
    // ou créer des congés qui déclencheront "Urgent" après modification manuelle
    
    // Ajoutons 2 congés supplémentaires pour les tests
    const nouveauxConges = [
      // Ce congé sera "Nouveau" si on simule qu'il a été créé récemment
      {
        userId: users[10]?.id || users[0]?.id,
        type: "Congé formation",
        dateDebut: new Date(maintenant.getTime() + 8 * 24 * 60 * 60 * 1000), // Dans 8 jours
        dateFin: new Date(maintenant.getTime() + 9 * 24 * 60 * 60 * 1000),   // Dans 9 jours
        statut: "en attente"
      },
      
      // Ce congé sera "Urgent" si on simule qu'il a été créé il y a longtemps
      {
        userId: users[11]?.id || users[0]?.id,
        type: "Congé familial",
        dateDebut: new Date(maintenant.getTime() + 50 * 24 * 60 * 60 * 1000), // Dans 50 jours
        dateFin: new Date(maintenant.getTime() + 52 * 24 * 60 * 60 * 1000),   // Dans 52 jours
        statut: "en attente"
      }
    ];
    
    console.log('📝 Ajout de 2 congés supplémentaires...');
    
    for (const conge of nouveauxConges) {
      if (conge.userId) {
        const created = await prisma.conge.create({ data: conge });
        console.log(`✅ Congé ajouté : ${conge.type} - ID: ${created.id}`);
      }
    }
    
    console.log('\n🎯 INSTRUCTIONS POUR TESTER LES BADGES :');
    console.log('==========================================');
    console.log('📋 Tu as maintenant 12 congés de test avec :');
    console.log('  ⚡ 4 congés EXPRESS (< 7 jours) qui auront le badge EXPRESS');
    console.log('  ⚪ 4 congés normaux en attente');
    console.log('  ✅ 2 congés approuvés');
    console.log('  ❌ 2 congés refusés');
    console.log('\n🧪 POUR TESTER LES AUTRES BADGES :');
    console.log('  • Badge "Nouveau" : Crée une nouvelle demande via l\'interface');
    console.log('  • Badge "Urgent" : Modifie manuellement une demande pour simuler ancienneté');
    
    console.log('\n🚀 Va maintenant sur l\'interface admin pour voir :');
    console.log('   1️⃣ Le tri automatique (urgents en haut)');
    console.log('   2️⃣ Les badges EXPRESS sur les 4 premiers');
    console.log('   3️⃣ La bordure rouge gauche sur toutes les demandes en attente');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addUrgentConges();
