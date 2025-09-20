// Test final de la correction complète
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Reproduire la logique de calculerEcartHoraire corrigée
function calculerEcartHoraireTest(heurePrevu, heureReelle) {
  console.log(`🔧 calculerEcartHoraireTest: "${heurePrevu}" vs "${heureReelle}"`);
  
  // Convertir HH:MM en minutes pour l'heure prévue
  const [hPrevu, mPrevu] = heurePrevu.split(':').map(Number);
  const minutesPrevu = hPrevu * 60 + mPrevu;
  console.log(`📅 Prévu: ${heurePrevu} = ${minutesPrevu} minutes`);

  // Extraire HH:MM de l'heure réelle
  const [hReel, mReel] = heureReelle.split(':').map(Number);
  let minutesReel = hReel * 60 + mReel;
  console.log(`⏰ Réel: ${heureReelle} = ${minutesReel} minutes`);

  // Gestion du passage à minuit
  if (minutesReel < 240 && minutesPrevu > 1200) { 
    minutesReel += 24 * 60;
    console.log(`🌙 Passage à minuit détecté - Réel ajusté: ${minutesReel} minutes`);
  }

  // Calcul : prévu - réel
  const ecart = minutesPrevu - minutesReel;
  console.log(`📊 Écart final: ${ecart} minutes (positif = en avance, négatif = en retard)`);
  
  return ecart;
}

function determinerTypeAnomalieArrivee(ecart) {
  const mins = Math.abs(ecart);
  
  if (ecart > 30) {
    return { type: 'hors_plage_in', gravite: 'hors_plage', emoji: '🟣' };
  } else if (ecart >= -5) {
    return { type: 'arrivee_acceptable', gravite: 'ok', emoji: '🟢' };
  } else if (ecart >= -20) {
    return { type: 'retard_modere', gravite: 'attention', emoji: '🟡' };
  } else {
    return { type: 'retard_critique', gravite: 'critique', emoji: '🔴' };
  }
}

async function testFinal() {
  try {
    console.log('🔥 TEST FINAL DES CORRECTIONS\n');
    
    const testCases = [
      {
        nom: "Cas Moussa - Arrivée à 17:40 (UTC) vs prévu 18:00",
        heurePrevu: "18:00",
        heureReel: "17:40",
        description: "40 min d'avance → devrait être acceptable"
      },
      {
        nom: "Cas normal - Arrivée à 09:25 vs prévu 09:00", 
        heurePrevu: "09:00",
        heureReel: "09:25",
        description: "25 min de retard → devrait être critique"
      },
      {
        nom: "Cas acceptable - Arrivée à 08:58 vs prévu 09:00",
        heurePrevu: "09:00", 
        heureReel: "08:58",
        description: "2 min d'avance → devrait être acceptable"
      },
      {
        nom: "Cas hors-plage - Arrivée à 08:20 vs prévu 09:00",
        heurePrevu: "09:00",
        heureReel: "08:20", 
        description: "40 min d'avance → devrait être hors-plage"
      },
      {
        nom: "Cas minuit - Départ à 00:30 vs prévu 23:00",
        heurePrevu: "23:00",
        heureReel: "00:30",
        description: "1h30 après minuit → 90 min d'heures sup"
      }
    ];
    
    testCases.forEach((testCase, i) => {
      console.log(`${i+1}. ${testCase.nom}`);
      console.log(`   ${testCase.description}`);
      
      const ecart = calculerEcartHoraireTest(testCase.heurePrevu, testCase.heureReel);
      const anomalie = determinerTypeAnomalieArrivee(ecart);
      
      console.log(`   → Résultat: ${anomalie.emoji} ${anomalie.type} (${anomalie.gravite})`);
      console.log('');
    });
    
    // Test avec les vraies données corrigées
    console.log('🔍 TEST AVEC DONNÉES RÉELLES (simulation UTC):\n');
    
    // Simuler le pointage Moussa 2025-08-25T17:40:00.000Z → 17:40 UTC
    const horodatage = new Date('2025-08-25T17:40:00.000Z');
    const heureUTC = `${horodatage.getUTCHours().toString().padStart(2, '0')}:${horodatage.getUTCMinutes().toString().padStart(2, '0')}`;
    
    console.log(`Horodatage original: ${horodatage.toISOString()}`);
    console.log(`Heure UTC extraite: ${heureUTC}`);
    console.log(`Planning prévu: 18:00`);
    
    const ecartReel = calculerEcartHoraireTest('18:00', heureUTC);
    const anomalieReelle = determinerTypeAnomalieArrivee(ecartReel);
    
    console.log(`\n✅ RÉSULTAT FINAL:`);
    console.log(`   Écart: ${ecartReel} minutes`);
    console.log(`   Type: ${anomalieReelle.emoji} ${anomalieReelle.type}`);
    console.log(`   Gravité: ${anomalieReelle.gravite}`);
    
    if (anomalieReelle.type === 'arrivee_acceptable') {
      console.log(`   🎯 CORRECT ! Arrivée 20 min en avance = acceptable`);
    } else {
      console.log(`   ❌ PROBLÈME ! Devrait être acceptable`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testFinal();
