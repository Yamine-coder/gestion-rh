/**
 * Test de cohérence des utilitaires de temps standardisés Europe/Paris
 * Vérifie que toutes les conversions sont alignées entre frontend et backend
 */

console.log('🔧 Test de cohérence des utilitaires de temps Europe/Paris');

// Test backend
const { getParisTimeString, getParisDateString, calculateTimeGapMinutes } = require('./utils/parisTimeUtils');

// Tests de base
console.log('\n📊 Tests Backend:');

// Test 1: Conversion d'heure
const testDate = new Date('2025-08-27T14:30:00.000Z'); // UTC
console.log(`Test date UTC: ${testDate.toISOString()}`);
console.log(`Heure Paris: ${getParisTimeString(testDate)}`);
console.log(`Date Paris: ${getParisDateString(testDate)}`);

// Test 2: Calcul d'écarts
const ecart1 = calculateTimeGapMinutes('14:00', '14:15'); // 15 min de retard
const ecart2 = calculateTimeGapMinutes('14:00', '13:45'); // 15 min d'avance
const ecart3 = calculateTimeGapMinutes('23:00', '01:30'); // Passage minuit
console.log(`\n⏰ Tests d'écarts:`);
console.log(`14:00 vs 14:15 = ${ecart1} minutes (attendu: -15)`);
console.log(`14:00 vs 13:45 = ${ecart2} minutes (attendu: +15)`);
console.log(`23:00 vs 01:30 = ${ecart3} minutes (attendu: -150)`);

// Test 3: Cohérence saisonnière (été UTC+2, hiver UTC+1)
console.log(`\n🌞 Tests saisonniers:`);
const dateEte = new Date('2025-08-15T12:00:00.000Z'); // Été
const dateHiver = new Date('2025-01-15T12:00:00.000Z'); // Hiver

console.log(`Date été UTC: ${dateEte.toISOString()}`);
console.log(`Heure été Paris: ${getParisTimeString(dateEte)} (attendu: 14:00)`);
console.log(`Date hiver UTC: ${dateHiver.toISOString()}`);
console.log(`Heure hiver Paris: ${getParisTimeString(dateHiver)} (attendu: 13:00)`);

// Test 4: Vérification avec des données de test réelles
const prisma = require('./prisma/client');

async function testRealData() {
  console.log(`\n🔍 Test avec données réelles:`);
  
  try {
    // Récupérer un pointage récent
    const recentPointage = await prisma.pointage.findFirst({
      where: {
        horodatage: {
          gte: new Date('2025-08-25T00:00:00.000Z')
        }
      },
      include: {
        user: true
      }
    });
    
    if (recentPointage) {
      console.log(`Pointage trouvé:`);
      console.log(`- Utilisateur: ${recentPointage.user.prenom} ${recentPointage.user.nom}`);
      console.log(`- Type: ${recentPointage.type}`);
      console.log(`- Horodatage UTC: ${recentPointage.horodatage.toISOString()}`);
      console.log(`- Heure Paris: ${getParisTimeString(recentPointage.horodatage)}`);
      console.log(`- Date Paris: ${getParisDateString(recentPointage.horodatage)}`);
    }
    
    console.log(`\n✅ Tous les tests de cohérence sont terminés !`);
    
  } catch (error) {
    console.error('Erreur lors du test avec données réelles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRealData();
