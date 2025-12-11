const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createShiftsForDate(dateStr) {
  console.log(`📅 Création de shifts pour ${dateStr}\n`);
  
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  
  console.log(`Date cible: ${targetDate.toISOString().slice(0, 10)}`);
  
  // Supprimer les shifts existants pour cette date (éviter les doublons)
  const deleted = await prisma.shift.deleteMany({
    where: { date: targetDate }
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
  
  console.log(`👥 ${employes.length} employé(s):\n`);
  
  // Créer des shifts variés
  const shifts = [];
  
  for (let i = 0; i < employes.length; i++) {
    const employe = employes[i];
    const nom = employe.nom && employe.prenom ? `${employe.prenom} ${employe.nom}` : employe.email;
    
    let shiftData;
    
    // Varier les types de shifts
    if (i === 0) {
      // Shift du matin (8h-17h)
      shiftData = {
        employeId: employe.id,
        date: targetDate,
        type: 'jour',
        segments: [
          { debut: '08:00', fin: '12:00', type: 'normal' },
          { debut: '13:00', fin: '17:00', type: 'normal' }
        ],
        version: 1
      };
      console.log(`   ✅ ${nom} - Matin (08:00-17:00)`);
    } else if (i === 1) {
      // Shift de l'après-midi (14h-22h)
      shiftData = {
        employeId: employe.id,
        date: targetDate,
        type: 'soir',
        segments: [
          { debut: '14:00', fin: '18:00', type: 'normal' },
          { debut: '18:00', fin: '22:00', type: 'soir' }
        ],
        version: 1
      };
      console.log(`   ✅ ${nom} - Après-midi/Soir (14:00-22:00)`);
    } else {
      // Shift complet (9h-18h)
      shiftData = {
        employeId: employe.id,
        date: targetDate,
        type: 'jour',
        segments: [
          { debut: '09:00', fin: '13:00', type: 'normal' },
          { debut: '14:00', fin: '18:00', type: 'normal' }
        ],
        version: 1
      };
      console.log(`   ✅ ${nom} - Journée (09:00-18:00)`);
    }
    
    const created = await prisma.shift.create({ data: shiftData });
    shifts.push(created);
  }
  
  console.log(`\n✅ ${shifts.length} shift(s) créé(s) !`);
  
  return shifts;
}

// Créer pour aujourd'hui (20 octobre 2025)
createShiftsForDate('2025-10-20')
  .then(() => {
    console.log('\n🎉 Shifts pour le 20 octobre créés avec succès !');
    console.log('\n💡 Testez maintenant:');
    console.log('   1. Connectez-vous: admin@gestionrh.com / password123');
    console.log('   2. Vérifiez le Dashboard');
    console.log('   3. La section "Planning du jour" devrait afficher 3 shifts');
  })
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
