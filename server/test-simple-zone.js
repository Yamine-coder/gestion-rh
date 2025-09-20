/**
 * Test simple des zones d'heures supplémentaires
 */

const { getPlanningVsRealite } = require('./controllers/comparisonController');

async function testSimple() {
  console.log('🧪 Test simple Zone 1 (+15 min)');
  
  const req = { query: { employeId: '86', date: '2025-08-20' } };
  
  const res = {
    json: (data) => {
      console.log('📋 Résultat:', JSON.stringify(data, null, 2));
    }
  };
  
  await getPlanningVsRealite(req, res);
}

testSimple().catch(console.error);
