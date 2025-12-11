const prisma = require('./prisma/client');
const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function main() {
  // 1. Regarder le shift 7925 associé au PaiementExtra 26
  const shift = await prisma.shift.findUnique({
    where: { id: 7925 },
    include: { employe: { select: { nom: true, prenom: true } } }
  });
  
  if (!shift) {
    console.log('Shift 7925 non trouvé');
    await prisma.$disconnect();
    return;
  }
  
  console.log('=== Shift 7925 ===');
  console.log('Employé:', shift.employee?.prenom, shift.employee?.nom);
  console.log('Date:', shift.date);
  console.log('Segments:', JSON.stringify(shift.segments, null, 2));
  
  // 2. Login admin
  console.log('\n--- Login admin ---');
  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    email: 'moussa@restaurant.com',
    password: 'Admin123!'
  });
  const token = loginRes.data.token;
  console.log('Token obtenu ✓');
  
  // 3. Modifier le shift en réduisant les heures Extra
  console.log('\n--- Modification du shift ---');
  
  // Créer des segments modifiés (réduire à 2h d'extra au lieu de 19h)
  const nouveauxSegments = [{
    start: '18:00',
    end: '20:00',  // 2h seulement
    isExtra: true,
    extraMontant: null
  }];
  
  // Utiliser une date formatée comme attendu
  const dateStr = shift.date.toISOString().split('T')[0];
  
  try {
    const updateRes = await axios.put(
      `${API_URL}/shifts/${shift.id}`,
      {
        id: shift.id,
        date: dateStr,
        employeId: shift.employeId,
        type: 'présence',  // Type requis !
        segments: nouveauxSegments
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Mise à jour réussie ✓');
    console.log('Shift mis à jour:', updateRes.data?.id);
  } catch (err) {
    console.error('Erreur update:', err.response?.data || err.message);
  }
  
  // 4. Vérifier le PaiementExtra après
  console.log('\n--- Vérification après update ---');
  const paiement = await prisma.paiementExtra.findUnique({ where: { id: 26 } });
  console.log('PaiementExtra 26:', paiement?.heures, 'h |', paiement?.montant, '€');
  
  await prisma.$disconnect();
}

main().catch(console.error);
