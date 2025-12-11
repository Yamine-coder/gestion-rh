// Test debug des pointages
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calculateRealHours(pointages) {
  console.log(`\n🔍 calculateRealHours appelée avec ${pointages.length} pointages:`);
  
  if (!pointages || pointages.length < 2) {
    console.log('❌ Moins de 2 pointages, retour 0');
    return 0;
  }
  
  let totalMinutes = 0;
  
  for (let i = 0; i < pointages.length - 1; i += 2) {
    const arrivee = pointages[i];
    const depart = pointages[i + 1];
    
    console.log(`\n  Paire ${i/2 + 1}:`);
    console.log(`    Arrivée [${i}]: ${arrivee.type} à ${arrivee.horodatage.toISOString()}`);
    if (depart) {
      console.log(`    Départ  [${i+1}]: ${depart.type} à ${depart.horodatage.toISOString()}`);
    } else {
      console.log(`    Départ  [${i+1}]: undefined`);
    }
    
    if (arrivee.type === 'arrivee' && depart && depart.type === 'depart') {
      const diffMs = new Date(depart.horodatage) - new Date(arrivee.horodatage);
      const diffMin = diffMs / (1000 * 60);
      totalMinutes += diffMin;
      console.log(`    ✅ Diff: ${diffMs}ms = ${diffMin.toFixed(2)} minutes = ${(diffMin/60).toFixed(2)}h`);
    } else {
      console.log(`    ❌ Paire invalide`);
    }
  }
  
  const totalHeures = totalMinutes / 60;
  console.log(`\n  📊 Total: ${totalMinutes.toFixed(2)} minutes = ${totalHeures.toFixed(2)}h`);
  console.log(`  📊 Arrondi: ${Math.round(totalHeures * 100) / 100}h`);
  
  return Math.round((totalMinutes / 60) * 100) / 100;
}

async function testDebugPointages() {
  console.log('🔍 TEST DEBUG POINTAGES\n');
  console.log('='.repeat(80));

  try {
    const employe = await prisma.user.findFirst({
      where: { email: 'test.horaires@restaurant.com' }
    });

    if (!employe) {
      console.log('❌ Employé de test non trouvé');
      return;
    }

    console.log(`✅ Employé: ${employe.prenom} ${employe.nom} (ID: ${employe.id})\n`);

    // Récupérer TOUS les pointages
    const pointages = await prisma.pointage.findMany({
      where: { userId: employe.id },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`📋 Total pointages trouvés: ${pointages.length}\n`);

    // Afficher chaque pointage
    pointages.forEach((p, i) => {
      console.log(`${i + 1}. ${p.type.padEnd(10)} | ${p.horodatage.toISOString()} | ${p.horodatage.toLocaleString('fr-FR')}`);
    });

    // Grouper par jour
    console.log('\n' + '='.repeat(80));
    console.log('📅 GROUPEMENT PAR JOUR\n');

    const pointagesParJour = new Map();
    pointages.forEach(p => {
      const dateKey = p.horodatage.toISOString().split('T')[0];
      if (!pointagesParJour.has(dateKey)) {
        pointagesParJour.set(dateKey, []);
      }
      pointagesParJour.get(dateKey).push(p);
    });

    console.log(`📊 ${pointagesParJour.size} jours avec pointages\n`);

    pointagesParJour.forEach((pointagesJour, dateKey) => {
      console.log(`\n📆 ${dateKey} (${pointagesJour.length} pointages)`);
      console.log('-'.repeat(60));
      
      pointagesJour.forEach((p, i) => {
        const heure = p.horodatage.toTimeString().slice(0, 8);
        console.log(`  ${i + 1}. ${p.type.padEnd(10)} | ${heure}`);
      });

      // Calculer les heures pour ce jour
      const heures = calculateRealHours(pointagesJour);
      console.log(`\n  ✅ Total calculé pour ce jour: ${heures}h`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Test terminé\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDebugPointages();
