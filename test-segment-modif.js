const axios = require('./server/node_modules/axios').default;
const { PrismaClient } = require('./server/node_modules/@prisma/client');

const BASE_URL = 'http://localhost:5000';
const prisma = new PrismaClient();

async function testSegmentModification() {
  // 1. Login admin
  console.log('1. Login admin...');
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'moussa@restaurant.com',
    password: 'Admin123!'
  });
  
  const { token } = loginRes.data;
  console.log('   Token obtenu');
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Récupérer le shift 7936 directement via Prisma
  console.log('\n2. Récupération du shift 7936...');
  const shift = await prisma.shift.findUnique({
    where: { id: 7936 },
    include: { employe: { select: { nom: true, prenom: true } } }
  });
  
  if (!shift) {
    console.log('   Shift non trouvé!');
    await prisma.$disconnect();
    return;
  }
  
  console.log('   Shift trouvé:', shift.id);
  console.log('   employeId:', shift.employeId);
  console.log('   Employé:', shift.employe?.prenom, shift.employe?.nom);
  console.log('   Date:', shift.date);
  console.log('   Segments actuels:');
  shift.segments.forEach(s => {
    console.log(`     - ${s.start}-${s.end} (isExtra: ${s.isExtra})`);
  });

  // 3. Modifier le segment extra (changer l'heure de fin)
  const extraSegmentIndex = shift.segments.findIndex(s => s.isExtra);
  if (extraSegmentIndex === -1) {
    console.log('   Pas de segment extra trouvé!');
    await prisma.$disconnect();
    return;
  }

  const currentStart = shift.segments[extraSegmentIndex].start;
  const currentEnd = shift.segments[extraSegmentIndex].end;
  const newEnd = '19:30'; // Nouvelle heure de fin (différente pour voir la modification)
  
  console.log('\n3. Modification du segment extra:', currentStart + '-' + currentEnd, '→', currentStart + '-' + newEnd);
  
  const updatedSegments = [...shift.segments];
  updatedSegments[extraSegmentIndex] = {
    ...updatedSegments[extraSegmentIndex],
    end: newEnd
  };

  // Utiliser PUT sur la route correcte
  const payload = {
    id: shift.id,
    employeId: shift.employeId,
    date: shift.date,
    type: 'présence',
    segments: updatedSegments
  };
  console.log('   Payload envoyé:', JSON.stringify(payload, null, 2));
  
  try {
    const updateRes = await axios.put(BASE_URL + '/shifts/' + shift.id, payload, { headers });

    console.log('   Résultat:', updateRes.status === 200 ? 'OK' : 'ERREUR');
    console.log('   Réponse:', updateRes.data?.message || 'OK');
  } catch (err) {
    console.log('   Erreur lors de la mise à jour:', err.response?.data || err.message);
  }

  // 4. Attendre un peu pour que la sync s'effectue
  await new Promise(r => setTimeout(r, 500));

  // 5. Vérifier le paiement mis à jour
  console.log('\n4. Vérification du paiement...');
  
  const paiement = await prisma.paiementExtra.findFirst({
    where: {
      employeId: shift.employeId,
      date: shift.date
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (paiement) {
    console.log('   Paiement ID:', paiement.id);
    console.log('   Heures:', paiement.heures);
    console.log('   Montant:', paiement.montant, '€');
    console.log('   Heures initiales:', paiement.heuresInitiales);
    console.log('   Montant initial:', paiement.montantInitial, '€');
    console.log('   Segment initial:', paiement.segmentInitial);
    console.log('   Commentaire:', paiement.commentaire);
    console.log('   Dernière modif:', paiement.derniereModif);
  } else {
    console.log('   Aucun paiement trouvé!');
  }

  await prisma.$disconnect();
  console.log('\n✅ Test terminé!');
}

testSegmentModification().catch(console.error);
