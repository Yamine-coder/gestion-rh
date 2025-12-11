const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUserJordan() {
  console.log('=== TEST UTILISATEUR yjordan496@gmail.com ===\n');
  
  // 1. Trouver l'utilisateur
  const user = await prisma.user.findUnique({
    where: { email: 'yjordan496@gmail.com' }
  });
  
  if (!user) {
    console.log('❌ Utilisateur non trouvé');
    await prisma.$disconnect();
    return;
  }
  
  console.log('👤 Utilisateur trouvé:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Nom: ${user.prenom} ${user.nom}`);
  console.log(`   Statut: ${user.statut}`);
  console.log(`   Rôle: ${user.role}`);
  
  // 2. Calculer la journée de travail (06h-06h)
  const now = new Date();
  const hour = now.getHours();
  const isNightShift = hour < 6;
  
  const workDayDate = new Date(now);
  if (isNightShift) {
    workDayDate.setDate(workDayDate.getDate() - 1);
  }
  const workDay = workDayDate.toISOString().split('T')[0];
  
  console.log(`\n📅 Heure actuelle: ${now.toLocaleString('fr-FR')}`);
  console.log(`   Journée de travail: ${workDay} ${isNightShift ? '(🌙 mode nuit)' : ''}`);
  
  // 3. Chercher le shift de la journée de travail
  const startOfWorkDay = new Date(`${workDay}T00:00:00.000Z`);
  const endOfWorkDay = new Date(`${workDay}T23:59:59.999Z`);
  
  console.log('\n🔍 Recherche shifts...');
  const shifts = await prisma.shift.findMany({
    where: {
      employeId: user.id,
      date: {
        gte: startOfWorkDay,
        lte: endOfWorkDay
      }
    }
  });
  
  if (shifts.length === 0) {
    console.log('   ❌ Aucun shift trouvé pour cette journée de travail');
  } else {
    console.log(`   ✅ ${shifts.length} shift(s) trouvé(s):`);
    shifts.forEach(s => {
      console.log(`      - ID ${s.id}: type=${s.type}, segments=${JSON.stringify(s.segments)}`);
    });
  }
  
  // 4. Chercher les pointages de la journée de travail
  // Pour la journée de travail, on prend de 06h le jour J à 06h le jour J+1
  const workDayStart = new Date(`${workDay}T06:00:00.000`);
  const nextDay = new Date(workDayDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];
  const workDayEnd = new Date(`${nextDayStr}T05:59:59.999`);
  
  console.log(`\n🔍 Recherche pointages (${workDay} 06:00 → ${nextDayStr} 05:59)...`);
  
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: user.id,
      horodatage: {
        gte: workDayStart,
        lte: workDayEnd
      }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  if (pointages.length === 0) {
    console.log('   ❌ Aucun pointage pour cette journée de travail');
  } else {
    console.log(`   ✅ ${pointages.length} pointage(s):`);
    pointages.forEach(p => {
      const time = new Date(p.horodatage).toLocaleString('fr-FR');
      console.log(`      - ${p.type.toUpperCase()} à ${time}`);
    });
  }
  
  // 5. Calculer le temps travaillé
  let totalMinutes = 0;
  let lastArrivee = null;
  
  for (const p of pointages) {
    if (p.type === 'arrivee') {
      lastArrivee = new Date(p.horodatage);
    } else if (p.type === 'depart' && lastArrivee) {
      const diff = (new Date(p.horodatage) - lastArrivee) / 60000;
      totalMinutes += diff;
      lastArrivee = null;
    }
  }
  
  // Si session en cours (arrivée sans départ)
  if (lastArrivee) {
    const diff = (now - lastArrivee) / 60000;
    totalMinutes += diff;
    console.log(`\n⏱️ Session en cours depuis ${lastArrivee.toLocaleTimeString('fr-FR')}`);
  }
  
  const heures = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  console.log(`\n📊 TEMPS TRAVAILLÉ: ${heures}h${mins.toString().padStart(2, '0')}`);
  
  // 6. Comparer avec le shift prévu
  if (shifts.length > 0 && shifts[0].type === 'présence') {
    const shift = shifts[0];
    let totalPrevuMinutes = 0;
    
    if (shift.segments) {
      shift.segments.forEach(seg => {
        const start = seg.start || seg.debut;
        const end = seg.end || seg.fin;
        if (start && end) {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          let diff = (eh * 60 + em) - (sh * 60 + sm);
          if (diff < 0) diff += 24 * 60; // Shift de nuit
          totalPrevuMinutes += diff;
        }
      });
    }
    
    const prevuHeures = Math.floor(totalPrevuMinutes / 60);
    const prevuMins = totalPrevuMinutes % 60;
    console.log(`   PRÉVU: ${prevuHeures}h${prevuMins.toString().padStart(2, '0')}`);
    
    const ecart = totalMinutes - totalPrevuMinutes;
    const ecartH = Math.floor(Math.abs(ecart) / 60);
    const ecartM = Math.round(Math.abs(ecart) % 60);
    console.log(`   ÉCART: ${ecart >= 0 ? '+' : '-'}${ecartH}h${ecartM.toString().padStart(2, '0')}`);
  }
  
  // 7. Anomalies
  console.log('\n🔍 Recherche anomalies...');
  const anomalies = await prisma.anomalie.findMany({
    where: {
      employeId: user.id,
      date: {
        gte: startOfWorkDay,
        lte: endOfWorkDay
      }
    }
  });
  
  if (anomalies.length === 0) {
    console.log('   ✅ Aucune anomalie');
  } else {
    console.log(`   ⚠️ ${anomalies.length} anomalie(s):`);
    anomalies.forEach(a => {
      console.log(`      - ${a.type}: ${a.description} (statut: ${a.statut})`);
    });
  }
  
  console.log('\n=== FIN DU TEST ===');
  await prisma.$disconnect();
}

testUserJordan().catch(console.error);
