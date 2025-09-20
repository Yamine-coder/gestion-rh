/**
 * Test pour comprendre le problème de double pointage à la même heure
 * Simulation du cas test@Mouss.com avec pointages identiques
 */

const path = require('path');
const assert = (cond, msg) => { if (!cond) throw new Error('Assertion failed: ' + msg); };

// Mock des données problématiques
const pointagesAvecDoublons = [
  { id: 1, userId: 19, type: 'arrivee', horodatage: new Date('2025-08-28T07:00:00.000Z') },
  { id: 2, userId: 19, type: 'depart',  horodatage: new Date('2025-08-28T17:00:00.000Z') }, // Premier départ
  { id: 3, userId: 19, type: 'depart',  horodatage: new Date('2025-08-28T17:00:00.000Z') }, // Doublon exact même seconde
];

const prismaMock = {
  shift: { findMany: async () => [{
    id: 1, employeId: 19, date: new Date('2025-08-28T07:00:00.000Z'),
    type: 'présence', segments: [{ start: '09:00', end: '17:00' }]
  }] },
  pointage: { findMany: async () => pointagesAvecDoublons }
};

const prismaPath = path.resolve(__dirname, 'prisma', 'client.js');
require.cache[prismaPath] = { exports: prismaMock };

const { getPlanningVsRealite } = require('./controllers/comparisonController');

async function testDoublePointage() {
  console.log('🔍 TEST DOUBLE POINTAGE - Même heure exacte');
  
  const req = { query: { employeId: '19', date: '2025-08-28' } };
  let statusCode = 200; 
  let jsonPayload = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(payload) { jsonPayload = payload; }
  };

  await getPlanningVsRealite(req, res);

  assert(statusCode === 200, 'status 200');
  assert(jsonPayload && jsonPayload.success, 'payload success');
  
  const day = jsonPayload.comparaisons[0];
  console.log('📊 Pointages détectés:', day.reel);
  console.log('⚠️ Écarts calculés:', day.ecarts);
  
  // Vérifier qu'il n'y a qu'un seul départ dans les résultats finaux
  const departsCount = day.reel.filter(r => r.depart).length;
  console.log(`💡 Nombre de départs après traitement: ${departsCount}`);
  
  if (departsCount > 1) {
    console.log('❌ PROBLÈME: Double départ détecté même après déduplication');
    console.log('Raw pointages:', pointagesAvecDoublons.map(p => ({
      type: p.type, 
      heure: p.horodatage.toISOString(),
      deltaMs: pointagesAvecDoublons.length > 1 ? 
        Math.abs(new Date(p.horodatage) - new Date(pointagesAvecDoublons[1].horodatage)) : 0
    })));
  } else {
    console.log('✅ Déduplication OK');
  }
}

testDoublePointage().catch(e => { 
  console.error('❌ TEST ÉCHEC:', e.message); 
  process.exit(1); 
});
