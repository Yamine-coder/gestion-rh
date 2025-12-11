const axios = require('axios');
const prisma = require('./prisma/client');
const jwt = require('jsonwebtoken');

const API_BASE = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123!';

async function run() {
  console.log('🧪 TEST SYSTÈME AJUSTEMENTS EXTRAS\n');
  console.log('='.repeat(50));
  
  // 1. Générer token admin
  console.log('\n🔐 Génération token admin...');
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) { console.log('❌ Aucun admin trouvé'); return; }
  
  const token = jwt.sign({ userId: admin.id, role: 'admin', email: admin.email }, JWT_SECRET, { expiresIn: '1h' });
  console.log('✅ Token généré pour:', admin.email);
  
  // 2. Trouver un employé
  const emp = await prisma.user.findFirst({ 
    where: { role: 'employee' }, 
    select: { id: true, prenom: true, nom: true } 
  });
  if (!emp) { console.log('❌ Aucun employé trouvé'); return; }
  console.log('👤 Employé:', emp.prenom, emp.nom);
  
  // 3. Préparer une date future unique
  const dateFuture = new Date();
  dateFuture.setDate(dateFuture.getDate() + 10);
  const dateStr = dateFuture.toISOString().split('T')[0];
  
  // Nettoyer les shifts existants pour cette date
  const existingShift = await prisma.shift.findFirst({ 
    where: { employeId: emp.id, date: new Date(dateStr) } 
  });
  if (existingShift) {
    await prisma.paiementExtra.deleteMany({ where: { shiftId: existingShift.id } });
    await prisma.shift.delete({ where: { id: existingShift.id } });
    console.log('🧹 Shift existant nettoyé');
  }
  
  let testShiftId = null;
  let paiementId = null;

  try {
    // TEST 1: Créer shift avec extra
    console.log('\n📋 TEST 1: Créer shift avec isExtra (3h)');
    const res1 = await axios.post(`${API_BASE}/shifts`, {
      employeId: emp.id,
      date: dateStr,
      type: 'présence',
      segments: [{ start: '10:00', end: '13:00', isExtra: true }]
    }, { headers: { Authorization: `Bearer ${token}` } });
    
    testShiftId = res1.data.id;
    console.log('   ✅ Shift créé: ID', testShiftId);
    
    // Vérifier PaiementExtra créé
    await new Promise(r => setTimeout(r, 300));
    const p1 = await prisma.paiementExtra.findFirst({ where: { shiftId: testShiftId } });
    if (p1) {
      paiementId = p1.id;
      console.log('   ✅ PaiementExtra créé: ID', p1.id, '- Heures:', Number(p1.heures), '- Montant:', Number(p1.montant) + '€');
    } else {
      console.log('   ❌ PaiementExtra NON créé!');
      return;
    }
    
    // TEST 2: Modifier horaires (shift à payer) -> mise à jour directe
    console.log('\n📋 TEST 2: Modifier horaires (10:00-13:00 → 10:00-15:00)');
    const shift = await prisma.shift.findUnique({ where: { id: testShiftId } });
    const segments = [...shift.segments];
    segments[0].end = '15:00';
    
    await axios.post(`${API_BASE}/shifts`, {
      id: testShiftId,
      employeId: emp.id,
      date: dateStr,
      type: 'présence',
      segments: segments
    }, { headers: { Authorization: `Bearer ${token}` } });
    
    await new Promise(r => setTimeout(r, 300));
    const p2 = await prisma.paiementExtra.findFirst({ where: { shiftId: testShiftId, source: 'shift_extra' } });
    console.log('   Heures après modif:', Number(p2.heures), '(attendu: 5)');
    console.log('   ' + (Math.abs(Number(p2.heures) - 5) < 0.1 ? '✅ Mise à jour directe OK' : '❌ Échec'));
    
    // TEST 3: Marquer comme payé
    console.log('\n📋 TEST 3: Marquer comme payé');
    await prisma.paiementExtra.update({
      where: { id: paiementId },
      data: { statut: 'paye', payeLe: new Date(), payePar: admin.id }
    });
    console.log('   ✅ PaiementExtra marqué PAYÉ');
    
    // TEST 4: Modifier horaires (déjà payé) -> créer ajustement
    console.log('\n📋 TEST 4: Modifier horaires après paiement (15:00 → 17:00 = +2h)');
    const shift2 = await prisma.shift.findUnique({ where: { id: testShiftId } });
    const segments2 = [...shift2.segments];
    segments2[0].end = '17:00';
    
    await axios.post(`${API_BASE}/shifts`, {
      id: testShiftId,
      employeId: emp.id,
      date: dateStr,
      type: 'présence',
      segments: segments2
    }, { headers: { Authorization: `Bearer ${token}` } });
    
    await new Promise(r => setTimeout(r, 300));
    const ajustement = await prisma.paiementExtra.findFirst({ 
      where: { shiftId: testShiftId, source: 'ajustement' } 
    });
    
    if (ajustement) {
      console.log('   ✅ Ajustement créé: ID', ajustement.id);
      console.log('   Heures ajustement:', Number(ajustement.heures), '(attendu: +2)');
      console.log('   Montant:', Number(ajustement.montant) + '€');
      console.log('   Motif:', ajustement.motifAjustement);
    } else {
      console.log('   ❌ Ajustement NON créé!');
    }
    
    // TEST 5: Tenter de décocher isExtra (déjà payé) -> DOIT BLOQUER
    console.log('\n📋 TEST 5: Tenter de décocher isExtra (déjà payé)');
    const shift3 = await prisma.shift.findUnique({ where: { id: testShiftId } });
    const segments3 = [...shift3.segments];
    segments3[0].isExtra = false;
    
    try {
      await axios.post(`${API_BASE}/shifts`, {
        id: testShiftId,
        employeId: emp.id,
        date: dateStr,
        type: 'présence',
        segments: segments3
      }, { headers: { Authorization: `Bearer ${token}` } });
      console.log('   ❌ Aurait dû être bloqué!');
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.code === 'EXTRA_DEJA_PAYE') {
        console.log('   ✅ Correctement bloqué:', err.response.data.error);
      } else {
        console.log('   ⚠️ Erreur inattendue:', err.response?.data || err.message);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 TESTS TERMINÉS');
    console.log('='.repeat(50));
    
  } catch (err) {
    console.error('\n❌ Erreur:', err.response?.data || err.message);
  } finally {
    // Nettoyage
    if (testShiftId) {
      await prisma.paiementExtra.deleteMany({ where: { shiftId: testShiftId } });
      await prisma.shift.delete({ where: { id: testShiftId } }).catch(() => {});
      console.log('\n🧹 Nettoyage effectué');
    }
    await prisma.$disconnect();
  }
}

run();
