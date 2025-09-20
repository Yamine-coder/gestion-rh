const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createRealisticWorkday() {
  try {
    console.log('📅 Création d\'une journée de travail réaliste...');
    
    // 1. Trouver l'utilisateur test@Mouss.com
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });
    
    if (!user) {
      console.log('❌ Utilisateur test@Mouss.com non trouvé');
      return;
    }
    
    console.log(`👤 Utilisateur: ${user.nom} ${user.prenom} (ID: ${user.id})`);
    
    // 2. Définir les horaires d'une journée type
    const today = new Date();
    today.setSeconds(0, 0); // Reset seconds and milliseconds
    
    const workSchedule = [
      { type: 'arrivee', hour: 8, minute: 30, description: 'Arrivée matinale' },
      { type: 'depart', hour: 12, minute: 15, description: 'Pause déjeuner' },
      { type: 'arrivee', hour: 13, minute: 45, description: 'Retour de pause' },
      { type: 'depart', hour: 18, minute: 0, description: 'Fin de journée' }
    ];
    
    console.log('\n⏰ Horaires planifiés:');
    workSchedule.forEach((schedule, i) => {
      const timeStr = `${schedule.hour.toString().padStart(2, '0')}:${schedule.minute.toString().padStart(2, '0')}`;
      const emoji = schedule.type === 'arrivee' ? '🟢' : '🔴';
      console.log(`   ${i + 1}. ${emoji} ${schedule.type.toUpperCase()} - ${timeStr} (${schedule.description})`);
    });
    
    // 3. Supprimer les anciens pointages
    const deletedCount = await prisma.pointage.deleteMany({
      where: { userId: user.id }
    });
    console.log(`\n🗑️ ${deletedCount.count} anciens pointages supprimés`);
    
    // 4. Créer les nouveaux pointages avec horaires réalistes
    console.log('\n🔄 Création des pointages...');
    
    const createdPointages = [];
    
    for (let i = 0; i < workSchedule.length; i++) {
      const schedule = workSchedule[i];
      
      // Créer la date avec l'horaire spécifique
      const pointageTime = new Date(today);
      pointageTime.setHours(schedule.hour, schedule.minute, 0, 0);
      
      console.log(`\n${i + 1}. 📍 ${schedule.description}...`);
      
      const pointage = await prisma.pointage.create({
        data: {
          userId: user.id,
          type: schedule.type,
          horodatage: pointageTime
        }
      });
      
      createdPointages.push(pointage);
      
      const timeStr = pointageTime.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      console.log(`✅ ${schedule.type.toUpperCase()} créé à ${timeStr}`);
    }
    
    // 5. Calculer le temps travaillé manuellement
    console.log('\n📊 Calcul des temps de travail:');
    
    // Période matinale: 08:30 → 12:15
    const matinStart = new Date(today);
    matinStart.setHours(8, 30, 0, 0);
    const matinEnd = new Date(today);
    matinEnd.setHours(12, 15, 0, 0);
    const tempsMatin = (matinEnd - matinStart) / (1000 * 60 * 60); // en heures
    
    // Période après-midi: 13:45 → 18:00
    const apremStart = new Date(today);
    apremStart.setHours(13, 45, 0, 0);
    const apremEnd = new Date(today);
    apremEnd.setHours(18, 0, 0, 0);
    const tempsAprem = (apremEnd - apremStart) / (1000 * 60 * 60); // en heures
    
    const totalHeures = tempsMatin + tempsAprem;
    const heures = Math.floor(totalHeures);
    const minutes = Math.round((totalHeures - heures) * 60);
    
    console.log(`   🌅 Matin: ${tempsMatin}h (08:30 → 12:15)`);
    console.log(`   🌇 Après-midi: ${tempsAprem}h (13:45 → 18:00)`);
    console.log(`   ⏳ Total travaillé: ${heures}h${minutes.toString().padStart(2, '0')}`);
    console.log(`   🍽️ Pause déjeuner: 1h30 (12:15 → 13:45)`);
    
    // 6. Afficher l'historique final
    console.log('\n📋 Historique créé:');
    const finalPointages = await prisma.pointage.findMany({
      where: { userId: user.id },
      orderBy: { horodatage: 'asc' }
    });
    
    finalPointages.forEach((p, i) => {
      const date = new Date(p.horodatage);
      const emoji = p.type === 'arrivee' ? '🟢' : '🔴';
      const time = date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      console.log(`   ${emoji} ${p.type.toUpperCase()} - ${time}`);
    });
    
    console.log('\n🎉 Journée de travail réaliste créée avec succès !');
    console.log('\n📱 Test sur l\'interface web:');
    console.log('   👤 Email: test@Mouss.com');
    console.log('   🔑 Mot de passe: 7704154915Ym@!!');
    console.log('   📈 Temps affiché: ~8h00 de travail effectif');
    console.log('   📊 4 pointages avec horaires professionnels');
    console.log('   🎯 Page Pointage entièrement fonctionnelle');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la création
createRealisticWorkday();
