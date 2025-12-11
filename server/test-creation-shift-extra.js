// Test création shift extra via API et vérification création paiement
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const API = 'http://localhost:5000';

async function testCreationShiftExtra() {
  console.log('=== TEST: Création shift extra via API ===\n');
  
  try {
    // 1. Se connecter en tant qu'admin (générer un token directement)
    console.log('1. Génération token admin...');
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) {
      console.log('   ❌ Aucun admin trouvé');
      return;
    }
    const token = jwt.sign(
      { userId: admin.id, role: admin.role },
      process.env.JWT_SECRET || 'dev-secret-key-for-testing',
      { expiresIn: '1h' }
    );
    console.log('   ✅ Connecté\n');
    
    // 2. Trouver un employé
    const employes = await prisma.user.findMany({
      where: { role: 'employe' },
      take: 1
    });
    const employeId = employes[0]?.id || 114;
    console.log(`2. Employé cible: ID ${employeId}\n`);
    
    // 3. Créer un shift avec segment extra pour dans 5 jours
    const dateTest = new Date();
    dateTest.setDate(dateTest.getDate() + 5);
    const dateStr = dateTest.toISOString().split('T')[0];
    
    console.log(`3. Création shift extra pour le ${dateStr}...`);
    
    // Supprimer shift existant s'il y en a un
    const existing = await prisma.shift.findFirst({
      where: { employeId, date: dateTest }
    });
    if (existing) {
      // Supprimer d'abord les paiements liés
      await prisma.paiementExtra.deleteMany({ where: { shiftId: existing.id } });
      await prisma.shift.delete({ where: { id: existing.id } });
      console.log(`   Ancien shift #${existing.id} supprimé`);
    }
    
    // Créer via API
    const createRes = await axios.post(`${API}/shifts`, {
      employeId,
      date: dateStr,
      type: 'présence',
      segments: [
        {
          start: '09:00',
          end: '12:00',
          commentaire: 'Service midi',
          isExtra: false
        },
        {
          start: '14:00',
          end: '18:00',
          commentaire: 'Service soir',
          isExtra: false
        },
        {
          start: '18:00',
          end: '21:00',
          commentaire: 'Heures supplémentaires TEST',
          isExtra: true,
          extraMontant: '',
          paymentStatus: 'à_payer'
        }
      ]
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const newShift = createRes.data;
    console.log(`   ✅ Shift créé: ID ${newShift.id}\n`);
    
    // 4. Vérifier si PaiementExtra a été créé automatiquement
    console.log('4. Vérification PaiementExtra...');
    
    // Attendre un peu que le sync se fasse
    await new Promise(r => setTimeout(r, 500));
    
    const paiement = await prisma.paiementExtra.findFirst({
      where: { shiftId: newShift.id }
    });
    
    if (paiement) {
      console.log('   ✅ PaiementExtra CRÉÉ AUTOMATIQUEMENT!');
      console.log(`      - ID: ${paiement.id}`);
      console.log(`      - Source: ${paiement.source}`);
      console.log(`      - Heures: ${paiement.heures}h`);
      console.log(`      - Heures prévues: ${paiement.heuresPrevues || '-'}h`);
      console.log(`      - Heures réelles: ${paiement.heuresReelles || '-'}h`);
      console.log(`      - Montant: ${paiement.montant}€`);
      console.log(`      - Statut: ${paiement.statut}`);
    } else {
      console.log('   ❌ AUCUN PaiementExtra créé!');
      console.log('   → Le flux automatique ne fonctionne pas');
    }
    
    // Cleanup
    console.log('\n5. Nettoyage...');
    if (paiement) {
      await prisma.paiementExtra.delete({ where: { id: paiement.id } });
    }
    await prisma.shift.delete({ where: { id: newShift.id } });
    console.log('   ✅ Test terminé et nettoyé');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
  
  await prisma.$disconnect();
}

testCreationShiftExtra();
