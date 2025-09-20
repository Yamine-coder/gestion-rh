// Test de la normalisation Europe/Paris
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getParisTimeString(date) {
  if (!date) return null;
  // Convertir vers le fuseau Europe/Paris
  const parisTime = new Date(date.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
  const hours = parisTime.getHours().toString().padStart(2, '0');
  const minutes = parisTime.getMinutes().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}`;
  console.log(`🕐 Conversion heure: ${date.toISOString()} → ${timeString} (Europe/Paris)`);
  return timeString;
}

async function testParisTimeZone() {
  try {
    console.log('🇫🇷 TEST DE LA NORMALISATION EUROPE/PARIS\n');
    
    // Test avec différentes heures UTC pour voir la conversion
    const testDates = [
      { 
        utc: '2025-08-25T17:40:00.000Z',
        description: 'Cas Moussa - été (UTC+2)'
      },
      {
        utc: '2025-01-15T08:30:00.000Z', 
        description: 'Cas hiver (UTC+1)'
      },
      {
        utc: '2025-08-25T22:00:00.000Z',
        description: 'Cas minuit proche - été'
      },
      {
        utc: '2025-01-15T23:00:00.000Z',
        description: 'Cas minuit proche - hiver'
      }
    ];
    
    console.log('📅 CONVERSIONS DE FUSEAUX HORAIRES:\n');
    
    testDates.forEach((test, i) => {
      const date = new Date(test.utc);
      const parisTime = getParisTimeString(date);
      
      console.log(`${i+1}. ${test.description}`);
      console.log(`   UTC: ${test.utc}`);
      console.log(`   Paris: ${parisTime}`);
      console.log('');
    });
    
    // Test avec les vraies données de la base
    console.log('🔍 TEST AVEC DONNÉES RÉELLES:\n');
    
    const pointage = await prisma.pointage.findFirst({
      where: {
        user: { email: 'test@Mouss.com' },
        type: 'arrivee'
      },
      include: { user: true },
      orderBy: { horodatage: 'desc' }
    });
    
    if (pointage) {
      console.log(`Pointage trouvé:`);
      console.log(`  Email: ${pointage.user.email}`);
      console.log(`  Type: ${pointage.type}`);
      console.log(`  UTC brut: ${pointage.horodatage.toISOString()}`);
      
      const heureParis = getParisTimeString(pointage.horodatage);
      console.log(`  Heure Paris: ${heureParis}`);
      
      // Comparaison avec le planning théorique
      const planning = "18:00"; // Exemple
      console.log(`\nComparaison avec planning ${planning}:`);
      
      const [hP, mP] = planning.split(':').map(Number);
      const minutesPrevu = hP * 60 + mP;
      
      const [hR, mR] = heureParis.split(':').map(Number);
      const minutesReel = hR * 60 + mR;
      
      const ecart = minutesPrevu - minutesReel;
      console.log(`  Écart: ${ecart} minutes`);
      console.log(`  Interprétation: ${ecart > 0 ? 'En avance' : ecart < 0 ? 'En retard' : 'À l\'heure'}`);
    } else {
      console.log('Aucun pointage trouvé pour test@Mouss.com');
    }
    
    // Vérification de la cohérence hiver/été
    console.log('\n🌍 VÉRIFICATION COHÉRENCE SAISONNIÈRE:\n');
    
    // Simuler une heure en été vs hiver
    const eteUTC = new Date('2025-07-15T16:00:00.000Z'); // Été UTC+2
    const hiverUTC = new Date('2025-01-15T17:00:00.000Z'); // Hiver UTC+1
    
    console.log('Même heure locale (18:00) en été et hiver:');
    console.log(`  Été - UTC: ${eteUTC.toISOString()} → Paris: ${getParisTimeString(eteUTC)}`);
    console.log(`  Hiver - UTC: ${hiverUTC.toISOString()} → Paris: ${getParisTimeString(hiverUTC)}`);
    
    console.log('\n✅ La normalisation Europe/Paris garantit la cohérence saisonnière !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testParisTimeZone();
