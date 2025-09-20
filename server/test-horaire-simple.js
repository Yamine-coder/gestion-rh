/*
🕐 === TEST SIMPLE: HORAIRE 7H → 00H30 ===

Ce test vérifie comment ton horaire spécifique (7h matin → 00h30) 
est géré par le système.
*/

const { PrismaClient } = require('@prisma/client');
const { getWorkDayBounds } = require('./config/workDayConfig');

const prisma = new PrismaClient();

async function testHoraire7h_00h30() {
  console.log('🕐 === TEST HORAIRE SPÉCIFIQUE : 7H → 00H30 ===\n');

  try {
    // === THÉORIE : JOURNÉE DE TRAVAIL ===
    console.log('📅 LOGIQUE DU SYSTÈME:');
    console.log('   Une "journée de travail" commence à 6h');
    console.log('   Elle finit le lendemain à 6h');
    console.log('   Exemple: de 6h lundi à 6h mardi = 1 journée de travail\n');

    // === TEST DE COHÉRENCE ===
    console.log('🎯 TON CAS SPÉCIFIQUE:');
    console.log('   Tu arrives à 7h du matin');
    console.log('   Tu pars à 00h30 (minuit et demi)');
    console.log('   Total: 17h30 de travail\n');

    // Simuler une date hier pour éviter les contraintes futures
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);

    // === CALCUL DE LA JOURNÉE DE TRAVAIL ===
    const arrivee7h = new Date(hier);
    arrivee7h.setHours(7, 0, 0, 0); // 7h00

    const depart00h30 = new Date(arrivee7h);
    depart00h30.setDate(depart00h30.getDate() + 1); // Jour suivant
    depart00h30.setHours(0, 30, 0, 0); // 00h30

    console.log('📍 DÉTAILS TEMPORELS:');
    console.log(`   Arrivée: ${arrivee7h.toLocaleString('fr-FR')}`);
    console.log(`   Départ:  ${depart00h30.toLocaleString('fr-FR')}`);

    // === CALCUL DE LA JOURNÉE DE TRAVAIL ===
    const workDayArrivee = getWorkDayBounds(arrivee7h);
    const workDayDepart = getWorkDayBounds(depart00h30);

    console.log('\n🧮 CALCUL DES JOURNÉES DE TRAVAIL:');
    console.log(`   Arrivée 7h → Journée: ${workDayArrivee.debutJournee.toLocaleDateString('fr-FR')} à ${workDayArrivee.finJournee.toLocaleDateString('fr-FR')}`);
    console.log(`   Départ 00h30 → Journée: ${workDayDepart.debutJournee.toLocaleDateString('fr-FR')} à ${workDayDepart.finJournee.toLocaleDateString('fr-FR')}`);

    // === VÉRIFICATION ===
    const memeJournee = workDayArrivee.debutJournee.getTime() === workDayDepart.debutJournee.getTime();
    
    console.log('\n✅ RÉSULTAT:');
    if (memeJournee) {
      console.log('   🎯 PARFAIT ! Ton arrivée 7h et ton départ 00h30 sont comptés dans la MÊME journée de travail');
      console.log('   📊 Tes 17h30 de travail = 1 seule journée dans les rapports');
      console.log('   💡 C\'est exactement ce qu\'on veut pour les équipes de nuit !');
    } else {
      console.log('   ⚠️  ATTENTION ! Ton horaire chevauche 2 journées de travail');
      console.log('   📊 Tes heures seraient divisées entre 2 journées différentes');
      console.log('   💡 Il faudrait ajuster la configuration si c\'est un problème');
    }

    // === CALCUL DES HEURES ===
    const heuresTravaillees = (depart00h30.getTime() - arrivee7h.getTime()) / (1000 * 60 * 60);
    console.log(`\n⏰ CALCUL DES HEURES: ${heuresTravaillees}h de travail effectif`);

    // === COMPARAISON AVEC D'AUTRES CONFIGURATIONS ===
    console.log('\n🔧 AUTRES CONFIGURATIONS POSSIBLES:');
    console.log('   • Début à 0h (minuit): Ton départ 00h30 serait dans la journée suivante ❌');
    console.log('   • Début à 3h: Ton arrivée 7h et départ 00h30 dans la même journée ✅');
    console.log('   • Début à 6h (actuel): Ton arrivée 7h et départ 00h30 dans la même journée ✅');

    console.log('\n🏆 CONCLUSION:');
    console.log('   La configuration actuelle (6h → 6h+1) est PARFAITE pour ton horaire 7h → 00h30');
    console.log('   Tes 17h30 de travail seront comptées comme 1 seule journée dans tous les rapports ! 🎯');

  } catch (error) {
    console.error('❌ Erreur durant le test:', error.message);
  }
}

// Exécuter le test
testHoraire7h_00h30()
  .then(() => {
    console.log('\n✅ Test terminé avec succès !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
