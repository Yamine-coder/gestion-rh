const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createShiftsForToday() {
  console.log('📅 Création de shifts pour AUJOURD\'HUI (détection automatique)\n');
  
  // Utiliser la vraie date système
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  
  console.log(`📆 Date système: ${now.toLocaleDateString('fr-FR')}`);
  console.log(`📆 Date cible (minuit): ${today.toISOString()}`);
  console.log(`📆 Format BD: ${today.toISOString().slice(0, 10)}\n`);
  
  // Supprimer les shifts existants pour cette date
  const deleted = await prisma.shift.deleteMany({
    where: { 
      date: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 3600 * 1000)
      }
    }
  });
  console.log(`🗑️  ${deleted.count} shift(s) existant(s) supprimé(s)\n`);
  
  // Récupérer les employés
  const employes = await prisma.user.findMany({
    where: { role: 'employee' },
    orderBy: { id: 'asc' }
  });
  
  if (employes.length === 0) {
    console.log('❌ Aucun employé trouvé');
    return;
  }
  
  console.log(`👥 ${employes.length} employé(s) trouvé(s):\n`);
  
  // Créer des shifts variés pour chaque employé
  const shifts = [];
  
  for (let i = 0; i < employes.length; i++) {
    const employe = employes[i];
    const nom = employe.nom && employe.prenom ? `${employe.prenom} ${employe.nom}` : employe.email;
    
    let shiftData;
    
    if (i === 0) {
      // Shift du matin (en cours maintenant si on est dans la journée)
      const currentHour = now.getHours();
      const isOngoing = currentHour >= 8 && currentHour < 17;
      
      shiftData = {
        employeId: employe.id,
        date: today,
        type: 'jour',
        segments: [
          { debut: '08:00', fin: '12:00', type: 'normal' },
          { debut: '13:00', fin: '17:00', type: 'normal' }
        ],
        version: 1
      };
      console.log(`   ✅ ${nom} - Matin (08:00-17:00) ${isOngoing ? '🟢 EN COURS' : ''}`);
    } else if (i === 1) {
      // Shift de l'après-midi/soir
      const currentHour = now.getHours();
      const isOngoing = currentHour >= 14 && currentHour < 22;
      
      shiftData = {
        employeId: employe.id,
        date: today,
        type: 'soir',
        segments: [
          { debut: '14:00', fin: '18:00', type: 'normal' },
          { debut: '18:00', fin: '22:00', type: 'soir' }
        ],
        version: 1
      };
      console.log(`   ✅ ${nom} - Après-midi/Soir (14:00-22:00) ${isOngoing ? '🟢 EN COURS' : ''}`);
    } else {
      // Shift journée complète
      const currentHour = now.getHours();
      const isOngoing = currentHour >= 9 && currentHour < 18;
      
      shiftData = {
        employeId: employe.id,
        date: today,
        type: 'jour',
        segments: [
          { debut: '09:00', fin: '13:00', type: 'normal' },
          { debut: '14:00', fin: '18:00', type: 'normal' }
        ],
        version: 1
      };
      console.log(`   ✅ ${nom} - Journée (09:00-18:00) ${isOngoing ? '🟢 EN COURS' : ''}`);
    }
    
    const created = await prisma.shift.create({ data: shiftData });
    shifts.push(created);
  }
  
  console.log(`\n✅ ${shifts.length} shift(s) créé(s) pour aujourd'hui !`);
  
  // Vérifier la récupération
  console.log('\n🔍 Vérification de la récupération...');
  const todayStr = today.toISOString().slice(0, 10);
  const retrieved = await prisma.shift.findMany({
    where: {
      date: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 3600 * 1000)
      }
    },
    include: {
      employe: {
        select: { nom: true, prenom: true, email: true }
      }
    }
  });
  
  console.log(`   Trouvés avec date >= ${todayStr}: ${retrieved.length} shift(s)`);
  retrieved.forEach(s => {
    const nom = s.employe?.nom && s.employe?.prenom ? `${s.employe.prenom} ${s.employe.nom}` : s.employe?.email;
    console.log(`      - ${nom}: ${s.date.toISOString()}`);
  });
  
  return shifts;
}

createShiftsForToday()
  .then(() => {
    console.log('\n🎉 Succès !');
    console.log('\n💡 Étapes suivantes:');
    console.log('   1. Le serveur doit être démarré (node index.js)');
    console.log('   2. Le client doit être démarré (npm start)');
    console.log('   3. Connectez-vous: admin@gestionrh.com / password123');
    console.log('   4. Le Dashboard devrait afficher les 3 shifts');
  })
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
