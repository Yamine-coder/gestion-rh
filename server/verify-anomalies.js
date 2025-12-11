/**
 * TEST COMPLET: Vérification que les anomalies remontent pour Jordan
 */
const prisma = require('./prisma/client');

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`\n🧪 VÉRIFICATION ANOMALIES JORDAN - ${today}`);
  console.log('='.repeat(60));

  // Vérifier les anomalies en BDD
  const anomalies = await prisma.anomalie.findMany({
    where: {
      employeId: 110,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lte: new Date(`${today}T23:59:59.999Z`)
      }
    },
    include: {
      employe: { select: { prenom: true, nom: true } }
    }
  });

  console.log(`\n📋 Anomalies en BDD pour ${today}:`);
  if (anomalies.length === 0) {
    console.log('   ❌ AUCUNE anomalie trouvée !');
  } else {
    anomalies.forEach(a => {
      console.log(`   ✅ ID ${a.id}: ${a.type} (${a.gravite}) - ${a.statut}`);
      console.log(`      Description: ${a.description}`);
      console.log(`      Date BDD: ${a.date.toISOString()}`);
      if (a.details) {
        console.log(`      Détails: ${JSON.stringify(a.details)}`);
      }
    });
  }

  // Simuler ce que fait le frontend
  console.log('\n' + '='.repeat(60));
  console.log('🔍 SIMULATION requête frontend:');
  
  const workDay = today;
  console.log(`   Query: dateDebut=${workDay}&dateFin=${workDay}`);
  
  // Reproduire la logique du backend
  const startDate = new Date(workDay + 'T00:00:00.000Z');
  startDate.setDate(startDate.getDate() - 1); // -1 jour pour timezone
  
  const where = {
    employeId: 110,
    date: {
      gte: startDate,
      lte: new Date(workDay + 'T23:59:59.999Z')
    }
  };
  
  console.log(`   Where clause:`);
  console.log(`     employeId: 110`);
  console.log(`     date >= ${startDate.toISOString()}`);
  console.log(`     date <= ${workDay}T23:59:59.999Z`);

  const resultats = await prisma.anomalie.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
  });

  console.log(`\n📊 Résultats (comme le frontend verrait):`);
  console.log(`   ${resultats.length} anomalie(s) retournée(s)`);
  resultats.forEach(r => {
    console.log(`   - ${r.type}: ${r.description}`);
  });

  // Vérifier les pointages
  console.log('\n' + '='.repeat(60));
  console.log('⏰ POINTAGES du jour:');
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: 110,
      horodatage: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  pointages.forEach(p => {
    const h = new Date(p.horodatage);
    console.log(`   ${p.type}: ${h.getHours().toString().padStart(2,'0')}:${h.getMinutes().toString().padStart(2,'0')}`);
  });

  // Vérifier le shift
  console.log('\n📅 SHIFT du jour:');
  const shift = await prisma.shift.findFirst({
    where: {
      employeId: 110,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });
  
  if (shift) {
    console.log(`   Type: ${shift.type}`);
    console.log(`   Segments:`, JSON.stringify(shift.segments, null, 2).split('\n').map(l => '   ' + l).join('\n'));
  } else {
    console.log('   ❌ Pas de shift trouvé');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
