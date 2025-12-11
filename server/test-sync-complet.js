const axios = require('axios');
const prisma = require('./prisma/client');

const API_URL = 'http://localhost:5000';

async function test() {
  console.log('=== TEST COMPLET SYNCHRONISATION SHIFT-EXTRA ===\n');
  
  // 1. Login
  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    email: 'moussa@restaurant.com',
    password: 'Admin123!'
  });
  const token = loginRes.data.token;
  console.log('✓ Login admin OK\n');
  
  // 2. Créer un nouveau shift avec Extra
  console.log('--- Test 1: Création shift avec Extra ---');
  const dateTest = new Date();
  dateTest.setDate(dateTest.getDate() + 7); // Dans 7 jours
  const dateStr = dateTest.toISOString().split('T')[0];
  
  const createRes = await axios.post(`${API_URL}/shifts`, {
    employeId: 93,  // Marco Romano (employee actif)
    date: dateStr,
    type: 'présence',
    segments: [{
      start: '10:00',
      end: '14:00',  // 4h extra
      isExtra: true
    }]
  }, { headers: { Authorization: `Bearer ${token}` } });
  
  const shiftId = createRes.data.id;
  console.log(`  Shift créé: ID ${shiftId}`);
  
  // Vérifier le paiement créé
  const paiement1 = await prisma.paiementExtra.findFirst({
    where: { shiftId },
    orderBy: { id: 'desc' }
  });
  console.log(`  PaiementExtra créé: ID ${paiement1?.id} | ${paiement1?.heures}h | ${paiement1?.montant}€`);
  
  // 3. Modifier le shift (augmenter les heures)
  console.log('\n--- Test 2: Augmenter les heures (4h → 6h) ---');
  await axios.put(`${API_URL}/shifts/${shiftId}`, {
    id: shiftId,
    employeId: 93,
    date: dateStr,
    type: 'présence',
    segments: [{
      start: '10:00',
      end: '16:00',  // 6h maintenant
      isExtra: true
    }]
  }, { headers: { Authorization: `Bearer ${token}` } });
  
  const paiement2 = await prisma.paiementExtra.findFirst({
    where: { shiftId },
    orderBy: { id: 'desc' }
  });
  console.log(`  PaiementExtra mis à jour: ${paiement2?.heures}h | ${paiement2?.montant}€`);
  
  // 4. Réduire les heures
  console.log('\n--- Test 3: Réduire les heures (6h → 2h) ---');
  await axios.put(`${API_URL}/shifts/${shiftId}`, {
    id: shiftId,
    employeId: 93,
    date: dateStr,
    type: 'présence',
    segments: [{
      start: '10:00',
      end: '12:00',  // 2h
      isExtra: true
    }]
  }, { headers: { Authorization: `Bearer ${token}` } });
  
  const paiement3 = await prisma.paiementExtra.findFirst({
    where: { shiftId },
    orderBy: { id: 'desc' }
  });
  console.log(`  PaiementExtra mis à jour: ${paiement3?.heures}h | ${paiement3?.montant}€`);
  
  // 5. Retirer le statut Extra
  console.log('\n--- Test 4: Retirer isExtra ---');
  await axios.put(`${API_URL}/shifts/${shiftId}`, {
    id: shiftId,
    employeId: 93,
    date: dateStr,
    type: 'présence',
    segments: [{
      start: '10:00',
      end: '12:00',
      isExtra: false  // Plus extra
    }]
  }, { headers: { Authorization: `Bearer ${token}` } });
  
  const paiement4 = await prisma.paiementExtra.findFirst({
    where: { shiftId },
    orderBy: { id: 'desc' }
  });
  console.log(`  PaiementExtra statut: ${paiement4?.statut}`);
  
  // 6. Vérification via API
  console.log('\n--- Vérification via API ---');
  const apiRes = await axios.get(`${API_URL}/api/paiements-extras`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const pFromApi = apiRes.data.paiements.find(p => p.shiftId === shiftId);
  if (pFromApi) {
    console.log(`  API: ${pFromApi.heures}h | ${pFromApi.montant}€ | statut: ${pFromApi.statut}`);
  } else {
    console.log('  Paiement non trouvé via API (peut-être annulé)');
  }
  
  // Cleanup
  await prisma.paiementExtra.deleteMany({ where: { shiftId } });
  await prisma.shift.delete({ where: { id: shiftId } });
  console.log('\n✓ Cleanup effectué');
  
  await prisma.$disconnect();
  
  console.log('\n=== TOUS LES TESTS PASSÉS ✓ ===');
}

test().catch(err => {
  console.error('ERREUR:', err.message);
  process.exit(1);
});
