/**
 * Test de détection automatique des anomalies
 * Supprime et recrée les pointages de Jordan pour aujourd'hui
 */
const prisma = require('./prisma/client');

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`\n🧪 TEST DÉTECTION AUTOMATIQUE D'ANOMALIES - ${today}`);
  console.log('='.repeat(60));

  // Trouver Jordan
  const jordan = await prisma.user.findFirst({
    where: { email: 'yjordan496@gmail.com' }
  });

  if (!jordan) {
    console.log('❌ Jordan non trouvé');
    return;
  }
  console.log(`✅ Jordan trouvé (ID: ${jordan.id})`);

  // Supprimer les pointages et anomalies d'aujourd'hui
  console.log('\n🗑️ Suppression des données existantes...');
  
  await prisma.pointage.deleteMany({
    where: {
      userId: jordan.id,
      horodatage: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });

  await prisma.anomalie.deleteMany({
    where: {
      employeId: jordan.id,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });

  // Vérifier le shift
  const shift = await prisma.shift.findFirst({
    where: {
      employeId: jordan.id,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });

  if (!shift) {
    console.log('❌ Pas de shift pour Jordan aujourd\'hui');
    return;
  }
  console.log(`✅ Shift trouvé:`, shift.segments);

  // Créer les pointages avec retard et départ anticipé
  console.log('\n📝 Création des pointages...');
  
  // Planning: 09:00-12:00 / 13:00-17:00
  // Pointages: 09:20 (retard 20min), 12:00, 13:00, 16:00 (départ anticipé 60min)
  
  const pointages = [
    { type: 'ENTRÉE', horodatage: new Date(`${today}T08:20:00.000Z`) }, // 09:20 Paris = +20min retard
    { type: 'SORTIE', horodatage: new Date(`${today}T11:00:00.000Z`) }, // 12:00 Paris
    { type: 'ENTRÉE', horodatage: new Date(`${today}T12:00:00.000Z`) }, // 13:00 Paris
    { type: 'SORTIE', horodatage: new Date(`${today}T15:00:00.000Z`) }, // 16:00 Paris = -60min départ anticipé
  ];

  for (const p of pointages) {
    const pointage = await prisma.pointage.create({
      data: {
        userId: jordan.id,
        type: p.type,
        horodatage: p.horodatage
      }
    });
    const heureLocal = new Date(p.horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    console.log(`   ✅ ${p.type}: ${heureLocal} (UTC: ${p.horodatage.toISOString()})`);
  }

  // Vérifier les anomalies créées (par le script de test précédent, pas la détection auto)
  console.log('\n🔍 Vérification des anomalies en BDD...');
  const anomalies = await prisma.anomalie.findMany({
    where: {
      employeId: jordan.id,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });

  console.log(`   📊 ${anomalies.length} anomalie(s) trouvée(s):`);
  anomalies.forEach(a => {
    console.log(`      - ${a.type}: ${a.description}`);
  });

  console.log('\n⚠️ NOTE: Les anomalies sont créées lors de l\'appel à l\'API de pointage.');
  console.log('   Ce script crée directement en BDD donc la détection n\'est pas déclenchée.');
  console.log('   Testez via l\'interface ou via l\'API pour voir la détection automatique.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
