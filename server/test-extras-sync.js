const axios = require('axios');
const prisma = require('./prisma/client');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123!';
let token = null;
let testEmployeId = null;
let testShiftId = null;
let testPaiementId = null;

async function run() {
  console.log('🧪 TEST SYNCHRONISATION EXTRAS\n');
  
  // 1. Générer token directement
  console.log('🔐 Génération token admin...');
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) {
    console.log('❌ Aucun admin trouvé');
    return;
  }
  token = jwt.sign({ userId: admin.id, role: admin.role }, JWT_SECRET, { expiresIn: '1h' });
  console.log('✅ Token généré pour:', admin.email, '\n');
  
  // 2. Employé test
  const emp = await prisma.user.findFirst({ 
    where: { role: 'employee' }, 
    select: { id: true, prenom: true, nom: true } 
  });
  if (!emp) {
    console.log('❌ Aucun employé trouvé');
    return;
  }
  testEmployeId = emp.id;
  console.log('👤 Employé:', emp.prenom, emp.nom, '\n');
  
  // Nettoyer les shifts de test précédents
  const dateFuture = new Date(); 
  dateFuture.setDate(dateFuture.getDate() + 5); // 5 jours dans le futur
  const dateStr = dateFuture.toISOString().split('T')[0];
  
  // Supprimer shift existant pour cette date/employé si présent
  const existingShift = await prisma.shift.findFirst({ 
    where: { employeId: testEmployeId, date: new Date(dateStr) } 
  });
  if (existingShift) {
    await prisma.paiementExtra.deleteMany({ where: { shiftId: existingShift.id } });
    await prisma.shift.delete({ where: { id: existingShift.id } });
    console.log('🧹 Shift existant nettoyé:', existingShift.id);
  }
  
  // 3. Créer shift avec extra (futur = programmé)
  console.log('📋 TEST 1: Créer shift avec isExtra (futur)');
  
  const res1 = await axios.post(`${API_BASE}/shifts`, {
    employeId: testEmployeId,
    date: dateStr,
    type: 'présence',
    segments: [{ start: '21:00', end: '23:30', isExtra: true }]
  }, { headers: { Authorization: `Bearer ${token}` } });
  
  testShiftId = res1.data.id;
  console.log('   Shift créé: ID', testShiftId);
  
  await new Promise(r => setTimeout(r, 300));
  const p1 = await prisma.paiementExtra.findFirst({ where: { shiftId: testShiftId } });
  if (p1) {
    testPaiementId = p1.id;
    console.log('   ✅ PaiementExtra créé: ID', p1.id, '-', p1.heures + 'h =', p1.montant + '€');
  } else {
    console.log('   ❌ PaiementExtra NON créé!');
  }
  
  // 4. Vérifier API
  console.log('\n📋 TEST 2: API retourne le paiement');
  const apiRes = await axios.get(`${API_BASE}/api/paiements-extras`, { 
    headers: { Authorization: `Bearer ${token}` } 
  });
  const found = apiRes.data.paiements?.find(p => p.id === testPaiementId);
  console.log('   ' + (found ? '✅ Trouvé dans API' : '❌ Non trouvé'));
  
  // 5. Décocher isExtra
  console.log('\n📋 TEST 3: Décocher isExtra → supprime PaiementExtra');
  const shift = await prisma.shift.findUnique({ where: { id: testShiftId } });
  const segments = [...shift.segments];
  segments[0].isExtra = false;
  
  await axios.post(`${API_BASE}/shifts`, {
    id: testShiftId, 
    employeId: testEmployeId, 
    date: dateStr,
    type: 'présence', 
    segments: segments
  }, { headers: { Authorization: `Bearer ${token}` } });
  
  await new Promise(r => setTimeout(r, 300));
  const p2 = await prisma.paiementExtra.findFirst({ 
    where: { shiftId: testShiftId, statut: 'a_payer' } 
  });
  console.log('   ' + (!p2 ? '✅ PaiementExtra supprimé' : '❌ Toujours présent'));
  
  // 6. Re-cocher
  console.log('\n📋 TEST 4: Re-cocher isExtra → recrée PaiementExtra');
  segments[0].isExtra = true;
  
  await axios.post(`${API_BASE}/shifts`, {
    id: testShiftId, 
    employeId: testEmployeId, 
    date: dateStr,
    type: 'présence', 
    segments: segments
  }, { headers: { Authorization: `Bearer ${token}` } });
  
  await new Promise(r => setTimeout(r, 300));
  const p3 = await prisma.paiementExtra.findFirst({ where: { shiftId: testShiftId } });
  console.log('   ' + (p3 ? '✅ Nouveau PaiementExtra créé: ID ' + p3.id : '❌ Non créé'));
  
  // 7. Supprimer shift
  console.log('\n📋 TEST 5: Supprimer shift → supprime PaiementExtra');
  const paiementIdToCheck = p3?.id;
  await axios.delete(`${API_BASE}/shifts/${testShiftId}`, { 
    headers: { Authorization: `Bearer ${token}` } 
  });
  
  await new Promise(r => setTimeout(r, 300));
  const p4 = paiementIdToCheck 
    ? await prisma.paiementExtra.findFirst({ where: { id: paiementIdToCheck } })
    : null;
  console.log('   ' + (!p4 ? '✅ PaiementExtra supprimé avec shift' : '❌ Toujours présent'));
  
  console.log('\n' + '='.repeat(40));
  console.log('🎉 TOUS LES TESTS PASSÉS!');
  console.log('='.repeat(40));
  
  await prisma.$disconnect();
}

run().catch(async e => { 
  console.error('❌ Erreur:', e.response?.data || e.message); 
  await prisma.$disconnect(); 
});
