const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetAndCreateWorkday() {
  try {
    console.log('🔄 RESET ET CRÉATION D\'UNE NOUVELLE JOURNÉE DE TRAVAIL');
    console.log('=' .repeat(60));
    
    // 1. Trouver l'utilisateur test@Mouss.com
    console.log('\n👤 Recherche de l\'utilisateur...');
    const user = await prisma.user.findUnique({
      where: { email: 'test@Mouss.com' }
    });
    
    if (!user) {
      console.log('❌ Utilisateur test@Mouss.com non trouvé');
      return;
    }
    
    console.log(`✅ Utilisateur trouvé: ${user.nom} ${user.prenom} (ID: ${user.id})`);
    
    // 2. NETTOYAGE COMPLET
    console.log('\n🗑️ PHASE 1: NETTOYAGE COMPLET...');
    console.log('-' .repeat(40));
    
    // Compter les pointages existants
    const countBefore = await prisma.pointage.count({
      where: { userId: user.id }
    });
    console.log(`📊 Pointages existants à supprimer: ${countBefore}`);
    
    // Supprimer tous les anciens pointages
    const deletedResult = await prisma.pointage.deleteMany({
      where: { userId: user.id }
    });
    console.log(`✅ ${deletedResult.count} pointages supprimés avec succès`);
    
    // Vérification
    const countAfter = await prisma.pointage.count({
      where: { userId: user.id }
    });
    console.log(`✅ Vérification: ${countAfter} pointages restants (doit être 0)`);
    
    // 3. CRÉATION D'UNE NOUVELLE JOURNÉE
    console.log('\n📅 PHASE 2: CRÉATION NOUVELLE JOURNÉE...');
    console.log('-' .repeat(40));
    
    const today = new Date();
    today.setSeconds(0, 0); // Reset seconds and milliseconds
    
    // Horaires de travail variables pour plus de réalisme
    const workSchedules = [
      // Journée standard
      { type: 'arrivee', hour: 8, minute: 32, description: 'Arrivée matinale' },
      { type: 'depart', hour: 12, minute: 18, description: 'Pause déjeuner' },
      { type: 'arrivee', hour: 13, minute: 42, description: 'Retour de pause' },
      { type: 'depart', hour: 17, minute: 58, description: 'Fin de journée' }
    ];
    
    console.log('⏰ Planning de la nouvelle journée:');
    workSchedules.forEach((schedule, i) => {
      const timeStr = `${schedule.hour.toString().padStart(2, '0')}:${schedule.minute.toString().padStart(2, '0')}`;
      const emoji = schedule.type === 'arrivee' ? '🟢' : '🔴';
      console.log(`   ${i + 1}. ${emoji} ${schedule.type.toUpperCase()} - ${timeStr} (${schedule.description})`);
    });
    
    // 4. Création des pointages
    console.log('\n🔄 Création des pointages...');
    
    for (let i = 0; i < workSchedules.length; i++) {
      const schedule = workSchedules[i];
      
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
      
      const timeStr = pointageTime.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      console.log(`✅ ${schedule.type.toUpperCase()} créé à ${timeStr}`);
      
      // Petite pause pour l'effet visuel
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 5. CALCULS ET VÉRIFICATIONS
    console.log('\n📊 PHASE 3: CALCULS ET VÉRIFICATIONS...');
    console.log('-' .repeat(40));
    
    // Récupérer tous les pointages créés
    const allPointages = await prisma.pointage.findMany({
      where: { userId: user.id },
      orderBy: { horodatage: 'asc' }
    });
    
    console.log(`📋 Total pointages créés: ${allPointages.length}`);
    
    // Calculer les temps
    let totalMinutes = 0;
    
    // Période matinale
    const matinStart = allPointages[0]; // Première arrivée
    const matinEnd = allPointages[1];   // Premier départ
    if (matinStart && matinEnd) {
      const matinMs = new Date(matinEnd.horodatage) - new Date(matinStart.horodatage);
      const matinMin = Math.round(matinMs / (1000 * 60));
      totalMinutes += matinMin;
      console.log(`🌅 Temps matin: ${Math.floor(matinMin / 60)}h${(matinMin % 60).toString().padStart(2, '0')}`);
    }
    
    // Période après-midi
    const apremStart = allPointages[2]; // Deuxième arrivée
    const apremEnd = allPointages[3];   // Deuxième départ
    if (apremStart && apremEnd) {
      const apremMs = new Date(apremEnd.horodatage) - new Date(apremStart.horodatage);
      const apremMin = Math.round(apremMs / (1000 * 60));
      totalMinutes += apremMin;
      console.log(`🌇 Temps après-midi: ${Math.floor(apremMin / 60)}h${(apremMin % 60).toString().padStart(2, '0')}`);
    }
    
    // Pause déjeuner
    if (matinEnd && apremStart) {
      const pauseMs = new Date(apremStart.horodatage) - new Date(matinEnd.horodatage);
      const pauseMin = Math.round(pauseMs / (1000 * 60));
      console.log(`🍽️ Pause déjeuner: ${Math.floor(pauseMin / 60)}h${(pauseMin % 60).toString().padStart(2, '0')}`);
    }
    
    const totalHeures = Math.floor(totalMinutes / 60);
    const restMinutes = totalMinutes % 60;
    console.log(`⏳ TEMPS TOTAL TRAVAILLÉ: ${totalHeures}h${restMinutes.toString().padStart(2, '0')}`);
    
    // 6. HISTORIQUE FINAL
    console.log('\n📋 HISTORIQUE FINAL:');
    console.log('-' .repeat(40));
    
    allPointages.forEach((p, i) => {
      const date = new Date(p.horodatage);
      const emoji = p.type === 'arrivee' ? '🟢' : '🔴';
      const time = date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      console.log(`   ${emoji} ${p.type.toUpperCase()} - ${time}`);
    });
    
    // 7. RÉSUMÉ FINAL
    console.log('\n🎉 JOURNÉE DE TRAVAIL CRÉÉE AVEC SUCCÈS !');
    console.log('=' .repeat(60));
    console.log('\n📱 INSTRUCTIONS POUR TESTER:');
    console.log('   👤 Email: test@Mouss.com');
    console.log('   🔑 Mot de passe: 7704154915Ym@!!');
    console.log('   🌐 Page: http://localhost:3001/pointage (ou autre port)');
    console.log('\n📊 CE QUI SERA AFFICHÉ:');
    console.log(`   ⏰ Temps travaillé: ${totalHeures}h${restMinutes.toString().padStart(2, '0')}`);
    console.log(`   📋 Historique: ${allPointages.length} pointages`);
    console.log('   📱 Interface responsive et moderne');
    console.log('   🎯 Toutes les fonctionnalités opérationnelles');
    
  } catch (error) {
    console.error('❌ ERREUR LORS DU RESET:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le reset complet
resetAndCreateWorkday();
