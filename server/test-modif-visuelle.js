const axios = require('axios');
const prisma = require('./prisma/client');

const API_URL = 'http://localhost:5000';

async function test() {
  console.log('=== TEST AFFICHAGE MODIFICATION VISUELLE ===\n');
  
  // 1. Login
  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    email: 'moussa@restaurant.com',
    password: 'Admin123!'
  });
  const token = loginRes.data.token;
  console.log('✓ Login admin OK\n');
  
  // 2. Créer un nouveau shift avec Extra
  console.log('--- Test: Création shift avec Extra (4h) ---');
  const dateTest = new Date();
  dateTest.setDate(dateTest.getDate() + 10);
  const dateStr = dateTest.toISOString().split('T')[0];
  
  const createRes = await axios.post(`${API_URL}/shifts`, {
    employeId: 93,
    date: dateStr,
    type: 'présence',
    segments: [{
      start: '10:00',
      end: '14:00',
      isExtra: true
    }]
  }, { headers: { Authorization: `Bearer ${token}` } });
  
  const shiftId = createRes.data.id;
  console.log(`  Shift créé: ID ${shiftId}`);
  
  let paiement = await prisma.paiementExtra.findFirst({
    where: { shiftId },
    orderBy: { id: 'desc' }
  });
  console.log(`  PaiementExtra: ID ${paiement?.id} | ${paiement?.heures}h | ${paiement?.montant}€`);
  console.log(`  heuresInitiales: ${paiement?.heuresInitiales}`);
  console.log(`  montantInitial: ${paiement?.montantInitial}`);
  console.log(`  commentaire: ${paiement?.commentaire}`);
  
  // 3. Modifier (augmenter 4h → 6h)
  console.log('\n--- Modification: 4h → 6h ---');
  await axios.put(`${API_URL}/shifts/${shiftId}`, {
    id: shiftId,
    employeId: 93,
    date: dateStr,
    type: 'présence',
    segments: [{
      start: '10:00',
      end: '16:00',
      isExtra: true
    }]
  }, { headers: { Authorization: `Bearer ${token}` } });
  
  paiement = await prisma.paiementExtra.findFirst({
    where: { shiftId },
    orderBy: { id: 'desc' }
  });
  console.log(`  PaiementExtra: ${paiement?.heures}h | ${paiement?.montant}€`);
  console.log(`  heuresInitiales: ${paiement?.heuresInitiales} (devrait être 4)`);
  console.log(`  montantInitial: ${paiement?.montantInitial} (devrait être 48)`);
  console.log(`  commentaire: ${paiement?.commentaire}`);
  console.log(`  derniereModif: ${paiement?.derniereModif}`);
  
  // 4. Modifier encore (6h → 2h)
  console.log('\n--- Modification: 6h → 2h ---');
  await axios.put(`${API_URL}/shifts/${shiftId}`, {
    id: shiftId,
    employeId: 93,
    date: dateStr,
    type: 'présence',
    segments: [{
      start: '10:00',
      end: '12:00',
      isExtra: true
    }]
  }, { headers: { Authorization: `Bearer ${token}` } });
  
  paiement = await prisma.paiementExtra.findFirst({
    where: { shiftId },
    orderBy: { id: 'desc' }
  });
  console.log(`  PaiementExtra: ${paiement?.heures}h | ${paiement?.montant}€`);
  console.log(`  heuresInitiales: ${paiement?.heuresInitiales} (devrait rester 4 - valeur initiale)`);
  console.log(`  montantInitial: ${paiement?.montantInitial} (devrait rester 48)`);
  console.log(`  commentaire: ${paiement?.commentaire}`);
  
  // 5. Vérifier via API
  console.log('\n--- Vérification API paiements-extras ---');
  const apiRes = await axios.get(`${API_URL}/api/paiements-extras`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const pFromApi = apiRes.data.paiements.find(p => p.shiftId === shiftId);
  if (pFromApi) {
    console.log(`  heures: ${pFromApi.heures}`);
    console.log(`  heuresInitiales: ${pFromApi.heuresInitiales}`);
    console.log(`  montant: ${pFromApi.montant}`);
    console.log(`  montantInitial: ${pFromApi.montantInitial}`);
    console.log(`  commentaire: ${pFromApi.commentaire}`);
  }
  
  // Cleanup
  await prisma.paiementExtra.deleteMany({ where: { shiftId } });
  await prisma.shift.delete({ where: { id: shiftId } });
  console.log('\n✓ Cleanup effectué');
  
  await prisma.$disconnect();
  
  console.log('\n=== TEST TERMINÉ ✓ ===');
}

test().catch(err => {
  console.error('ERREUR:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});
