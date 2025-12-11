// Créer des shifts planifiés pour tous les jours où il y a des pointages
// Pour corriger le taux d'utilisation

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMissingShifts() {
  console.log('🔧 Création des shifts manquants...\n');

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);
  startDate.setHours(0, 0, 0, 0);

  // Récupérer tous les pointages de la période
  const pointages = await prisma.pointage.findMany({
    where: {
      horodatage: { gte: startDate, lte: today }
    },
    include: { user: true }
  });

  // Grouper par employé et jour
  const pointagesParEmployeJour = {};
  pointages.forEach(p => {
    const dateStr = new Date(p.horodatage).toISOString().split('T')[0];
    const key = `${p.userId}_${dateStr}`;
    
    if (!pointagesParEmployeJour[key]) {
      pointagesParEmployeJour[key] = {
        userId: p.userId,
        date: dateStr,
        pointages: []
      };
    }
    pointagesParEmployeJour[key].pointages.push(p);
  });

  // Récupérer les shifts existants
  const shiftsExistants = await prisma.shift.findMany({
    where: {
      date: { gte: startDate, lte: today }
    }
  });

  const shiftsMap = new Set(
    shiftsExistants.map(s => `${s.employeId}_${new Date(s.date).toISOString().split('T')[0]}`)
  );

  console.log(`📊 Shifts existants: ${shiftsExistants.length}`);
  console.log(`📊 Jours/employés avec pointages: ${Object.keys(pointagesParEmployeJour).length}`);

  // Créer les shifts manquants basés sur les heures de pointage
  const shiftsACreer = [];

  for (const key in pointagesParEmployeJour) {
    if (!shiftsMap.has(key)) {
      const data = pointagesParEmployeJour[key];
      const entrees = data.pointages.filter(p => p.type === 'ENTRÉE');
      const sorties = data.pointages.filter(p => p.type === 'SORTIE');

      if (entrees.length > 0 && sorties.length > 0) {
        // Prendre la première entrée et dernière sortie
        const entree = new Date(entrees[0].horodatage);
        const sortie = new Date(sorties[sorties.length - 1].horodatage);

        // Créer un segment basé sur les heures réelles
        const startTime = `${String(entree.getHours()).padStart(2, '0')}:${String(entree.getMinutes()).padStart(2, '0')}`;
        const endTime = `${String(sortie.getHours()).padStart(2, '0')}:${String(sortie.getMinutes()).padStart(2, '0')}`;

        shiftsACreer.push({
          employeId: data.userId,
          date: new Date(data.date + 'T00:00:00Z'),
          type: 'NORMAL',
          segments: [{ start: startTime, end: endTime }]
        });
      }
    }
  }

  console.log(`📊 Shifts à créer: ${shiftsACreer.length}`);

  if (shiftsACreer.length > 0) {
    // Créer par lots de 100
    for (let i = 0; i < shiftsACreer.length; i += 100) {
      const batch = shiftsACreer.slice(i, i + 100);
      await prisma.shift.createMany({
        data: batch,
        skipDuplicates: true
      });
      console.log(`   ✅ Batch ${Math.floor(i/100) + 1} créé (${batch.length} shifts)`);
    }
  }

  // Vérification finale
  const totalShifts = await prisma.shift.count({
    where: {
      date: { gte: startDate, lte: today }
    }
  });

  // Recalculer heures théoriques
  const tousShifts = await prisma.shift.findMany({
    where: {
      date: { gte: startDate, lte: today }
    }
  });

  let heuresTheoriques = 0;
  tousShifts.forEach(shift => {
    if (shift.segments) {
      const segments = typeof shift.segments === 'string' 
        ? JSON.parse(shift.segments) 
        : shift.segments;
      
      if (Array.isArray(segments)) {
        segments.forEach(seg => {
          if (seg.start && seg.end) {
            const [startH, startM] = seg.start.split(':').map(Number);
            const [endH, endM] = seg.end.split(':').map(Number);
            heuresTheoriques += ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
          }
        });
      }
    }
  });

  console.log(`\n✅ Total shifts maintenant: ${totalShifts}`);
  console.log(`✅ Heures théoriques: ${heuresTheoriques.toFixed(1)}h`);
  console.log(`✅ Taux utilisation attendu: ~100%`);

  await prisma.$disconnect();
}

createMissingShifts().catch(e => {
  console.error('Erreur:', e);
  prisma.$disconnect();
});
