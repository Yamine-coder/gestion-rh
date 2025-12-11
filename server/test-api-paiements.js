const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function main() {
  // Login
  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    email: 'moussa@restaurant.com',
    password: 'Admin123!'
  });
  const token = loginRes.data.token;
  
  // Get paiements extras
  console.log('=== API /api/paiements-extras ===\n');
  const res = await axios.get(`${API_URL}/api/paiements-extras`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // Log structure
  console.log('Type de réponse:', typeof res.data);
  console.log('Clés:', Object.keys(res.data));
  
  // Récupérer la liste
  const paiements = Array.isArray(res.data) ? res.data : res.data.paiements || res.data.data || [];
  
  // Filtrer le paiement 26
  const p26 = paiements.find(p => p.id === 26);
  if (p26) {
    console.log('\nPaiementExtra 26:');
    console.log('  Heures:', p26.heures);
    console.log('  Montant:', p26.montant);
    console.log('  Statut:', p26.statut);
    console.log('  Source:', p26.source);
    console.log('  ShiftId:', p26.shiftId);
    console.log('  Shift date:', p26.shift?.date);
  } else {
    console.log('\nPaiementExtra 26 non trouvé dans la réponse API');
  }
  
  // Résumé total
  console.log('\n--- Résumé des paiements ---');
  console.log('Total:', paiements.length);
  const parStatut = paiements.reduce((acc, p) => {
    acc[p.statut] = (acc[p.statut] || 0) + 1;
    return acc;
  }, {});
  console.log('Par statut:', parStatut);
}

main().catch(console.error);
