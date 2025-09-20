/**
 * 🕐 TEST SPÉCIFIQUE - HORAIRE 7H → 00H30
 * Simule ton cas précis d'usage
 */

const { PrismaClient } = require('@prisma/client');
const { getWorkDayBounds } = require('./config/workDayConfig');

const prisma = new PrismaClient();

async function testerHoraire7h_00h30() {
  console.log('🕐 === TEST HORAIRE SPÉCIFIQUE : 7H → 00H30 ===\n');

  const TEST_USER_ID = 91; // Marie (utilisateur de test)

  try {
    // 🔍 Comprendre la logique journée de travail
    const { debutJournee, finJournee } = getWorkDayBounds();
    
    console.log('📅 CONFIGURATION ACTUELLE:');
    console.log(`   Début journée de travail: ${debutJournee.toLocaleString()}`);
    console.log(`   Fin journée de travail:   ${finJournee.toLocaleString()}`);
    console.log(`   ⚠️  Important: Une "journée de travail" va de 6h à 6h du lendemain`);

    // 🧹 Nettoyer les pointages existants pour ce test
    await prisma.pointage.deleteMany({
      where: {
        userId: TEST_USER_ID,
        horodatage: { gte: debutJournee, lt: finJournee }
      }
    });

    console.log('\n🎯 SIMULATION TON HORAIRE EXACT:');
    console.log('   Tu arrives à 7h du matin');
    console.log('   Tu pars à 00h30 (minuit et demi)');
    console.log('   Question: Dans quelle "journée de travail" ça tombe?\n');

    // 📍 Simuler ton arrivée à 7h aujourd'hui
    const arrivee7h = new Date();
    arrivee7h.setHours(7, 0, 0, 0); // 7h00 précises

    const pointageArrivee = await prisma.pointage.create({
      data: {
        userId: TEST_USER_ID,
        type: 'arrivee',
        horodatage: arrivee7h
      }
    });

    console.log(`📍 ARRIVÉE: ${arrivee7h.toLocaleString()}`);

    // 📍 Simuler ton départ à 00h30 (donc demain matin)
    const depart00h30 = new Date(arrivee7h);
    depart00h30.setDate(depart00h30.getDate() + 1); // Lendemain
    depart00h30.setHours(0, 30, 0, 0); // 00h30

    const pointageDepart = await prisma.pointage.create({
      data: {
        userId: TEST_USER_ID,
        type: 'depart',
        horodatage: depart00h30
      }
    });

    console.log(`📍 DÉPART: ${depart00h30.toLocaleString()}`);

    // 🧮 Calculer le temps travaillé
    const diffMs = depart00h30.getTime() - arrivee7h.getTime();
    const heuresTravaillees = diffMs / (1000 * 60 * 60); // Conversion en heures
    const heures = Math.floor(heuresTravaillees);
    const minutes = Math.round((heuresTravaillees - heures) * 60);

    console.log(`\n⏱️  TEMPS TRAVAILLÉ: ${heures}h${minutes.toString().padStart(2, '0')}`);

    // 🔍 Vérifier dans quelle journée de travail c'est compté
    console.log('\n🔍 ANALYSE JOURNÉE DE TRAVAIL:');
    
    // Vérifier si l'arrivée est dans la journée de travail
    const arriveeIncluse = arrivee7h >= debutJournee && arrivee7h < finJournee;
    console.log(`   Arrivée (7h) dans journée actuelle? ${arriveeIncluse ? '✅ OUI' : '❌ NON'}`);
    
    // Vérifier si le départ est dans la journée de travail
    const departInclus = depart00h30 >= debutJournee && depart00h30 < finJournee;
    console.log(`   Départ (00h30) dans journée actuelle? ${departInclus ? '✅ OUI' : '❌ NON'}`);

    // 📊 Tester l'API getMesPointagesAujourdhui
    console.log('\n📊 TEST API "getMesPointagesAujourdhui":');
    
    const pointagesAPI = await prisma.pointage.findMany({
      where: {
        userId: TEST_USER_ID,
        horodatage: { gte: debutJournee, lt: finJournee }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`   Pointages trouvés: ${pointagesAPI.length}/2`);
    
    if (pointagesAPI.length === 2) {
      console.log('   ✅ PARFAIT: Tes 2 pointages sont dans la MÊME journée de travail');
      console.log('   📅 Cela signifie que ton shift 7h→00h30 est traité comme UNE journée');
      
      // Calculer le temps via l'API
      let totalMinutesAPI = 0;
      for (let i = 0; i < pointagesAPI.length - 1; i++) {
        const debut = pointagesAPI[i];
        const fin = pointagesAPI[i + 1];
        
        if (debut.type === 'arrivee' && fin.type === 'depart') {
          const diffMinutes = Math.floor((new Date(fin.horodatage) - new Date(debut.horodatage)) / 60000);
          totalMinutesAPI += diffMinutes;
        }
      }
      
      const heuresAPI = (totalMinutesAPI / 60).toFixed(1);
      console.log(`   ⏱️  Temps calculé par l'API: ${heuresAPI}h`);
      
    } else {
      console.log('   ❌ PROBLÈME: Tes pointages sont séparés sur plusieurs journées');
      console.log('   🐛 Cela indiquerait un bug dans la configuration');
    }

    // 🗓️ Explication détaillée de la logique
    console.log('\n🗓️ EXPLICATION DÉTAILLÉE:');
    console.log(`
    📚 LOGIQUE "JOURNÉE DE TRAVAIL":
    ├─ Avant (problématique): Journée = 00h00 → 23h59 (calendrier)
    │  ├─ 7h → 23h59 = Jour 1
    │  └─ 00h00 → 00h30 = Jour 2 ❌ (séparé!)
    │
    └─ Maintenant (corrigé): Journée = 6h → 6h+1 (travail)
       ├─ 6h → 23h59 = Journée N
       ├─ 00h00 → 05h59 = Journée N (même!)
       └─ Ton cas: 7h → 00h30 = TOUT dans Journée N ✅
    `);

    console.log('\n💡 POURQUOI 6H COMME LIMITE?');
    console.log('   • 6h du matin = heure où peu de gens travaillent encore');
    console.log('   • Permet aux équipes de nuit de finir tranquilles (jusqu\'à 5h59)');
    console.log('   • Configurable selon ton entreprise (si besoin d\'ajuster)');

    // 🧪 Test avec différentes limites
    console.log('\n🧪 SIMULATION AUTRES CONFIGURATIONS:');
    
    const configurations = [
      { cutoff: 0, nom: 'Minuit (00h)' },
      { cutoff: 4, nom: '4h du matin' }, 
      { cutoff: 6, nom: '6h du matin (actuel)' },
      { cutoff: 8, nom: '8h du matin' }
    ];

    for (const config of configurations) {
      const debutTest = new Date(arrivee7h);
      debutTest.setHours(config.cutoff, 0, 0, 0);
      
      const finTest = new Date(debutTest);
      finTest.setDate(finTest.getDate() + 1);
      
      const arriveeOK = arrivee7h >= debutTest && arrivee7h < finTest;
      const departOK = depart00h30 >= debutTest && depart00h30 < finTest;
      const toutOK = arriveeOK && departOK;
      
      console.log(`   ${config.nom}: ${toutOK ? '✅' : '❌'} ${toutOK ? 'FONCTIONNE' : 'Séparerait tes pointages'}`);
    }

    console.log('\n🎯 CONCLUSION POUR TON CAS:');
    if (arriveeIncluse && departInclus) {
      console.log('✅ TON HORAIRE 7H → 00H30 FONCTIONNE PARFAITEMENT !');
      console.log('📊 Tes heures seront comptées ensemble dans une seule journée');
      console.log('⏱️  Tu auras tes 17h30 complètes dans le rapport journalier');
      console.log('🎉 Plus de problème de "split" sur deux jours !');
    } else {
      console.log('❌ Il y a encore un problème de configuration');
      console.log('🔧 Il faudrait ajuster la limite ou vérifier la logique');
    }

  } catch (error) {
    console.error('❌ Erreur durant le test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 🚀 Lancer le test spécifique
if (require.main === module) {
  testerHoraire7h_00h30().catch(console.error);
}

module.exports = { testerHoraire7h_00h30 };
