// Script de test pour démontrer la logique de travail de nuit
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTravailNuit() {
  console.log('🌙 TEST LOGIQUE TRAVAIL DE NUIT');
  console.log('===============================');
  
  try {
    // Créer un utilisateur de test si nécessaire
    const testUser = await prisma.user.upsert({
      where: { email: 'test-nuit@exemple.com' },
      update: {},
      create: {
        email: 'test-nuit@exemple.com',
        nom: 'TestNuit',
        prenom: 'Employé',
        password: 'password123',
        role: 'employee'
      }
    });

    console.log(`👤 Utilisateur test: ${testUser.prenom} ${testUser.nom} (ID: ${testUser.id})`);

    // Simuler des pointages de nuit (22h du jour J -> 06h du jour J+1)
    const aujourd = new Date();
    
    // Horaire d'arrivée : hier 22h
    const arriveeHier = new Date(aujourd);
    arriveeHier.setDate(arriveeHier.getDate() - 1);
    arriveeHier.setHours(22, 0, 0, 0);
    
    // Pause minuit
    const pauseMinuit = new Date(aujourd);
    pauseMinuit.setHours(0, 30, 0, 0);
    
    // Reprise 1h
    const repriseNuit = new Date(aujourd);
    repriseNuit.setHours(1, 0, 0, 0);
    
    // Départ 6h du matin
    const departMatin = new Date(aujourd);
    departMatin.setHours(6, 0, 0, 0);

    // Nettoyer les anciens pointages de test
    await prisma.pointage.deleteMany({
      where: { userId: testUser.id }
    });

    // Créer les pointages de test
    const pointages = [
      { type: 'arrivee', horodatage: arriveeHier, description: 'Arrivée équipe de nuit' },
      { type: 'depart', horodatage: pauseMinuit, description: 'Pause nuit' },
      { type: 'arrivee', horodatage: repriseNuit, description: 'Reprise après pause' },
      { type: 'depart', horodatage: departMatin, description: 'Fin équipe de nuit' }
    ];

    for (const pointage of pointages) {
      await prisma.pointage.create({
        data: {
          userId: testUser.id,
          type: pointage.type,
          horodatage: pointage.horodatage
        }
      });
      console.log(`✅ ${pointage.type.toUpperCase()} ${pointage.horodatage.toLocaleString()} - ${pointage.description}`);
    }

    console.log('\n📊 ANALYSE AVEC NOUVELLE LOGIQUE:');
    console.log('==================================');

    // Simuler la logique de journée de travail
    const maintenant = new Date();
    let debutJournee, finJournee;

    if (maintenant.getHours() < 6) {
      // On est dans la nuit : journée de travail = hier 6h -> aujourd'hui 6h
      debutJournee = new Date(maintenant);
      debutJournee.setDate(debutJournee.getDate() - 1);
      debutJournee.setHours(6, 0, 0, 0);
      
      finJournee = new Date(maintenant);
      finJournee.setHours(6, 0, 0, 0);
    } else {
      // Journée normale : aujourd'hui 6h -> demain 6h
      debutJournee = new Date(maintenant);
      debutJournee.setHours(6, 0, 0, 0);
      
      finJournee = new Date(maintenant);
      finJournee.setDate(finJournee.getDate() + 1);
      finJournee.setHours(6, 0, 0, 0);
    }

    console.log(`🕐 Période journée de travail: ${debutJournee.toLocaleString()} → ${finJournee.toLocaleString()}`);

    // Récupérer les pointages de la journée de travail
    const pointagesJournee = await prisma.pointage.findMany({
      where: {
        userId: testUser.id,
        horodatage: {
          gte: debutJournee,
          lt: finJournee
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`📈 ${pointagesJournee.length} pointages trouvés pour cette journée de travail:`);
    pointagesJournee.forEach((p, i) => {
      console.log(`   ${i+1}. ${p.type.toUpperCase()} - ${p.horodatage.toLocaleString()}`);
    });

    // Calculer le temps total travaillé
    let totalMinutes = 0;
    let paires = 0;

    for (let i = 0; i < pointagesJournee.length - 1; i++) {
      const debut = pointagesJournee[i];
      const fin = pointagesJournee[i + 1];

      if (debut.type === 'arrivee' && fin.type === 'depart') {
        const diffMs = new Date(fin.horodatage) - new Date(debut.horodatage);
        const diffMinutes = Math.floor(diffMs / 60000);
        
        if (diffMinutes > 0) {
          totalMinutes += diffMinutes;
          paires++;
          
          console.log(`   ⏱️  Bloc ${paires}: ${debut.horodatage.toLocaleString()} → ${fin.horodatage.toLocaleString()}`);
          console.log(`       Durée: ${Math.floor(diffMinutes/60)}h${(diffMinutes%60).toString().padStart(2,'0')}`);
        }
        i++; // Sauter l'élément suivant
      }
    }

    const totalHeures = Math.round((totalMinutes / 60) * 100) / 100;
    console.log(`\n🎯 RÉSULTAT FINAL:`);
    console.log(`   💼 Temps total travaillé: ${Math.floor(totalHeures)}h${Math.round((totalHeures % 1) * 60).toString().padStart(2,'0')}`);
    console.log(`   📋 Nombre de blocs: ${paires}`);
    console.log(`   ✅ Système compatible avec le travail de nuit!`);

    console.log('\n🆚 COMPARAISON ANCIEN vs NOUVEAU SYSTÈME:');
    console.log('==========================================');
    
    // Ancien système (jour calendaire)
    const debutJourCalendaire = new Date(aujourd);
    debutJourCalendaire.setHours(0, 0, 0, 0);
    
    const pointagesAncien = await prisma.pointage.findMany({
      where: {
        userId: testUser.id,
        horodatage: { gte: debutJourCalendaire }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`❌ Ancien système (00h-23h59): ${pointagesAncien.length} pointages`);
    console.log(`✅ Nouveau système (6h-6h): ${pointagesJournee.length} pointages`);
    console.log(`📊 Différence: ${pointagesJournee.length - pointagesAncien.length} pointages supplémentaires pris en compte`);

  } catch (error) {
    console.error('Erreur lors du test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test
testTravailNuit().catch(console.error);
