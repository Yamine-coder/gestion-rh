/**
 * Test réaliste pour test@Mouss.com avec horaires problématiques
 * Reproduction du bug de départ critique à 236 minutes
 */

const path = require('path');

// Données réalistes basées sur le problème rapporté
const pointagesMouss = [
  { id: 1, userId: 19, type: 'arrivee', horodatage: new Date('2025-08-28T07:00:00.000Z') }, // 09:00 Paris
  { id: 2, userId: 19, type: 'depart',  horodatage: new Date('2025-08-28T15:00:00.000Z') }, // 17:00 Paris (fin normale)
  { id: 3, userId: 19, type: 'arrivee', horodatage: new Date('2025-08-28T15:30:00.000Z') }, // Retour après pause
  { id: 4, userId: 19, type: 'depart',  horodatage: new Date('2025-08-28T19:56:00.000Z') }, // 21:56 Paris (+236min)
];

const shiftMouss = [{
  id: 1, employeId: 19, date: new Date('2025-08-28T07:00:00.000Z'),
  type: 'présence', 
  segments: [
    { start: '09:00', end: '17:00' }, // Segment principal
    { start: '17:30', end: '18:00' }  // Segment court supplémentaire
  ]
}];

const prismaMock = {
  shift: { findMany: async () => shiftMouss },
  pointage: { findMany: async () => pointagesMouss }
};

const prismaPath = path.resolve(__dirname, 'prisma', 'client.js');
require.cache[prismaPath] = { exports: prismaMock };

const { getPlanningVsRealite } = require('./controllers/comparisonController');

async function testMoussCase() {
  console.log('🔍 TEST MOUSS RÉALISTE - Reproduction du bug 236min');
  
  const req = { query: { employeId: '19', date: '2025-08-28' } };
  let statusCode = 200; 
  let jsonPayload = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(payload) { jsonPayload = payload; }
  };

  await getPlanningVsRealite(req, res);
  
  const day = jsonPayload.comparaisons[0];
  console.log('\n📊 RÉSULTATS FINAUX:');
  console.log('Pointages traités:', JSON.stringify(day.reel, null, 2));
  console.log('\n⚠️ ÉCARTS DÉTECTÉS:');
  day.ecarts.forEach((ecart, idx) => {
    console.log(`${idx + 1}. ${ecart.description}`);
    console.log(`   Type: ${ecart.type}, Gravité: ${ecart.gravite}`);
    if (ecart.ecartMinutes) console.log(`   Écart: ${ecart.ecartMinutes} minutes`);
  });
  
  // Analyser spécifiquement les gros écarts
  const grosDepartsEcarts = day.ecarts.filter(e => 
    e.type.includes('depart') && Math.abs(e.ecartMinutes || 0) > 180
  );
  
  if (grosDepartsEcarts.length > 0) {
    console.log('\n🚨 GROS ÉCARTS DÉPART (>180 min):');
    grosDepartsEcarts.forEach(e => {
      console.log(`- ${e.description}`);
      console.log(`  Écart: ${e.ecartMinutes}min, Classification: ${e.type}`);
    });
  }
}

testMoussCase().catch(e => { 
  console.error('❌ TEST ÉCHEC:', e.message); 
  process.exit(1); 
});
