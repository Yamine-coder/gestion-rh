const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function getRandomMinutes(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function resetWithRandomWorkday() {
  try {
    console.log('🎲 RESET AVEC JOURNÉE ALÉATOIRE');
    console.log('=' .repeat(50));
    
    // 1. Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });
    
    if (!user) {
      console.log('❌ Utilisateur test@Mouss.com non trouvé');
      return;
    }
    
    console.log(`👤 Utilisateur: ${user.nom} ${user.prenom}`);
    
    // 2. NETTOYAGE
    console.log('\n🗑️ Nettoyage...');
    const deleted = await prisma.pointage.deleteMany({
      where: { userId: user.id }
    });
    console.log(`✅ ${deleted.count} anciens pointages supprimés`);
    
    // 3. GÉNÉRATION D'HORAIRES ALÉATOIRES
    console.log('\n🎲 Génération d\'horaires aléatoires...');
    
    const today = new Date();
    today.setSeconds(0, 0);
    
    // Horaires avec variations aléatoires
    const arriveeHeure = 8;
    const arriveeMinute = getRandomMinutes(15, 45); // Entre 8h15 et 8h45
    
    const departMidiHeure = 12;
    const departMidiMinute = getRandomMinutes(0, 30); // Entre 12h00 et 12h30
    
    const retourHeure = 13;
    const retourMinute = getRandomMinutes(30, 59); // Entre 13h30 et 13h59
    
    const finHeure = getRandomMinutes(17, 18); // Entre 17h et 18h
    const finMinute = getRandomMinutes(30, 59); // Entre 30 et 59 minutes
    
    const workSchedule = [
      { 
        type: 'arrivee', 
        hour: arriveeHeure, 
        minute: arriveeMinute, 
        description: 'Arrivée matinale' 
      },
      { 
        type: 'depart', 
        hour: departMidiHeure, 
        minute: departMidiMinute, 
        description: 'Pause déjeuner' 
      },
      { 
        type: 'arrivee', 
        hour: retourHeure, 
        minute: retourMinute, 
        description: 'Retour de pause' 
      },
      { 
        type: 'depart', 
        hour: finHeure, 
        minute: finMinute, 
        description: 'Fin de journée' 
      }
    ];
    
    console.log('⏰ Horaires générés:');
    workSchedule.forEach((s, i) => {
      const time = `${s.hour.toString().padStart(2, '0')}:${s.minute.toString().padStart(2, '0')}`;
      const emoji = s.type === 'arrivee' ? '🟢' : '🔴';
      console.log(`   ${i + 1}. ${emoji} ${s.type.toUpperCase()} - ${time} (${s.description})`);
    });
    
    // 4. CRÉATION DES POINTAGES
    console.log('\n🔄 Création des pointages...');
    
    for (const schedule of workSchedule) {
      const pointageTime = new Date(today);
      pointageTime.setHours(schedule.hour, schedule.minute, 0, 0);
      
      await prisma.pointage.create({
        data: {
          userId: user.id,
          type: schedule.type,
          horodatage: pointageTime
        }
      });
      
      const timeStr = pointageTime.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      console.log(`✅ ${schedule.type.toUpperCase()} - ${timeStr}`);
    }
    
    // 5. CALCULS
    console.log('\n📊 Calculs des temps...');
    
    const pointages = await prisma.pointage.findMany({
      where: { userId: user.id },
      orderBy: { horodatage: 'asc' }
    });
    
    // Temps matin
    const matinMs = new Date(pointages[1].horodatage) - new Date(pointages[0].horodatage);
    const matinMin = Math.round(matinMs / (1000 * 60));
    
    // Temps après-midi  
    const apremMs = new Date(pointages[3].horodatage) - new Date(pointages[2].horodatage);
    const apremMin = Math.round(apremMs / (1000 * 60));
    
    // Pause
    const pauseMs = new Date(pointages[2].horodatage) - new Date(pointages[1].horodatage);
    const pauseMin = Math.round(pauseMs / (1000 * 60));
    
    const totalMin = matinMin + apremMin;
    const totalH = Math.floor(totalMin / 60);
    const totalM = totalMin % 60;
    
    console.log(`🌅 Matin: ${Math.floor(matinMin / 60)}h${(matinMin % 60).toString().padStart(2, '0')}`);
    console.log(`🌇 Après-midi: ${Math.floor(apremMin / 60)}h${(apremMin % 60).toString().padStart(2, '0')}`);
    console.log(`🍽️ Pause: ${Math.floor(pauseMin / 60)}h${(pauseMin % 60).toString().padStart(2, '0')}`);
    console.log(`⏳ TOTAL: ${totalH}h${totalM.toString().padStart(2, '0')}`);
    
    // 6. RÉSUMÉ
    console.log('\n🎉 NOUVELLE JOURNÉE CRÉÉE !');
    console.log('=' .repeat(50));
    console.log('📱 Connectez-vous pour tester:');
    console.log('   👤 test@Mouss.com');
    console.log('   🔑 7704154915Ym@!!');
    console.log(`   ⏰ Temps: ${totalH}h${totalM.toString().padStart(2, '0')}`);
    console.log('   📋 4 pointages avec horaires variables');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetWithRandomWorkday();
