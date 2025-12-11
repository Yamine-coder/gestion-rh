const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTodayShifts() {
  console.log('📅 Création de shifts pour aujourd\'hui\n');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Minuit
  
  console.log(`Date: ${today.toISOString().slice(0, 10)}`);
  
  // Récupérer les employés
  const employes = await prisma.user.findMany({
    where: { role: 'employee' }
  });
  
  if (employes.length === 0) {
    console.log('❌ Aucun employé trouvé');
    return;
  }
  
  console.log(`\n👥 ${employes.length} employé(s) trouvé(s):\n`);
  
  // Créer des shifts pour chaque employé
  const shifts = [];
  
  for (let i = 0; i < employes.length; i++) {
    const employe = employes[i];
    const nom = employe.nom && employe.prenom ? `${employe.prenom} ${employe.nom}` : employe.email;
    
    // Alterner entre shift du matin et de l'après-midi
    const isMorning = i % 2 === 0;
    
    const shift = {
      employeId: employe.id,
      date: today,
      type: 'jour',
      segments: isMorning ? [
        { debut: '08:00', fin: '12:00', type: 'normal' },
        { debut: '13:00', fin: '17:00', type: 'normal' }
      ] : [
        { debut: '14:00', fin: '18:00', type: 'normal' },
        { debut: '18:00', fin: '22:00', type: 'soir' }
      ],
      version: 1
    };
    
    console.log(`   ${i + 1}. ${nom} - ${isMorning ? 'Matin (08:00-17:00)' : 'Après-midi (14:00-22:00)'}`);
    
    const created = await prisma.shift.create({
      data: shift
    });
    
    shifts.push(created);
  }
  
  console.log(`\n✅ ${shifts.length} shift(s) créé(s) pour aujourd'hui !`);
  
  // Créer aussi un shift non assigné pour tester
  console.log('\n📌 Création d\'un shift non assigné (pour tester les remplacements)...');
  
  // Trouver un employé admin ou créer un shift "fantôme"
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' }
  });
  
  if (admin) {
    const unassignedShift = await prisma.shift.create({
      data: {
        employeId: admin.id, // Temporairement assigné à admin
        date: today,
        type: 'jour',
        motif: 'Besoin de remplacement urgent',
        segments: [
          { debut: '10:00', fin: '14:00', type: 'normal' }
        ],
        version: 1
      }
    });
    
    console.log('✅ Shift non assigné créé (10:00-14:00)');
  }
  
  console.log('\n🎉 Terminé ! Vous pouvez maintenant tester le Dashboard.');
}

createTodayShifts()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
