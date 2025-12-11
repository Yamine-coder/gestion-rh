/**
 * Test de pointage sur un extra existant
 * Met à jour un PaiementExtra avec des données de pointage
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🧪 TEST POINTAGE SUR EXTRA\n');
  
  // 1. Trouver un paiement extra non pointé
  const paiements = await prisma.paiementExtra.findMany({
    where: { 
      statut: 'a_payer',
      pointageValide: false
    },
    include: { employe: true },
    take: 5,
    orderBy: { date: 'desc' }
  });
  
  console.log('📋 Paiements extras non pointés:');
  paiements.forEach(p => {
    console.log(`  ID: ${p.id} | ${p.employe?.prenom} ${p.employe?.nom} | ${p.date.toISOString().split('T')[0]} | Heures prévues: ${p.heures}h`);
  });
  
  if (paiements.length === 0) {
    console.log('\n❌ Aucun paiement extra non pointé trouvé');
    return;
  }
  
  // 2. Prendre le premier et simuler un pointage
  const paiement = paiements[0];
  
  console.log(`\n🎯 Test sur: ID ${paiement.id} - ${paiement.employe?.prenom} ${paiement.employe?.nom}`);
  console.log(`   Heures prévues: ${paiement.heures}h`);
  
  // Simuler un pointage légèrement différent 
  const heureArrivee = '18:00';
  const heureDepart = '22:00';
  
  // Parser les heures
  const [hA, mA] = heureArrivee.split(':').map(Number);
  const [hD, mD] = heureDepart.split(':').map(Number);
  
  // Arrivée 10 min plus tard, départ 5 min plus tôt
  const arriveeReelle = `${String(hA).padStart(2, '0')}:${String(mA + 10).padStart(2, '0')}`;
  const departReelle = `${String(hD).padStart(2, '0')}:${String(Math.max(0, mD - 5)).padStart(2, '0')}`;
  
  // Calculer heures réelles
  const minutesArrivee = hA * 60 + mA + 10;
  const minutesDepart = hD * 60 + mD - 5;
  const heuresReelles = (minutesDepart - minutesArrivee) / 60;
  const ecart = heuresReelles - Number(paiement.heures);
  
  console.log(`\n📊 Simulation pointage:`);
  console.log(`   Arrivée réelle: ${arriveeReelle}`);
  console.log(`   Départ réel: ${departReelle}`);
  console.log(`   Heures réelles: ${heuresReelles.toFixed(2)}h`);
  console.log(`   Écart: ${ecart > 0 ? '+' : ''}${ecart.toFixed(2)}h`);
  
  // 3. Mettre à jour le paiement avec les données de pointage
  const updated = await prisma.paiementExtra.update({
    where: { id: paiement.id },
    data: {
      pointageValide: true,
      arriveeReelle: arriveeReelle,
      departReelle: departReelle,
      heuresPrevues: paiement.heures,
      heuresReelles: heuresReelles,
      ecartHeures: ecart
    }
  });
  
  console.log(`\n✅ PaiementExtra ${paiement.id} mis à jour!`);
  console.log(`   pointageValide: true`);
  console.log(`   arriveeReelle: ${updated.arriveeReelle}`);
  console.log(`   departReelle: ${updated.departReelle}`);
  console.log(`   heuresReelles: ${updated.heuresReelles}h`);
  console.log(`   ecartHeures: ${updated.ecartHeures}h`);
  
  console.log('\n👉 Rafraîchissez la page Gestion des Extras pour voir le résultat');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
