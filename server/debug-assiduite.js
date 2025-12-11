// Debug assiduité - vérifier les valeurs exactes

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);
  startDate.setHours(0, 0, 0, 0);

  console.log('=== DEBUG ASSIDUITÉ ===\n');
  console.log('Période:', startDate.toISOString(), '->', today.toISOString());

  // 1. Pointages
  const pointagesPeriode = await prisma.pointage.findMany({
    where: { horodatage: { gte: startDate, lte: today } },
    orderBy: { horodatage: 'asc' }
  });
  console.log('\nPointages trouvés:', pointagesPeriode.length);

  // Grouper par employé et par jour
  const pointagesParEmploye = {};
  pointagesPeriode.forEach(p => {
    if (!pointagesParEmploye[p.userId]) pointagesParEmploye[p.userId] = {};
    const dateStr = new Date(p.horodatage).toISOString().split('T')[0];
    if (!pointagesParEmploye[p.userId][dateStr]) pointagesParEmploye[p.userId][dateStr] = [];
    pointagesParEmploye[p.userId][dateStr].push(p);
  });

  let totalHeuresPeriode = 0;
  let joursTravailes = 0;

  for (const [userId, jours] of Object.entries(pointagesParEmploye)) {
    for (const [date, pointages] of Object.entries(jours)) {
      const entrees = pointages.filter(p => p.type === 'ENTRÉE').sort((a, b) => new Date(a.horodatage) - new Date(b.horodatage));
      const sorties = pointages.filter(p => p.type === 'SORTIE').sort((a, b) => new Date(a.horodatage) - new Date(b.horodatage));
      if (entrees.length > 0 && sorties.length > 0) {
        const heuresJour = (new Date(sorties[sorties.length - 1].horodatage) - new Date(entrees[0].horodatage)) / (1000 * 60 * 60);
        totalHeuresPeriode += heuresJour;
        joursTravailes++;
      }
    }
  }

  console.log('Total heures période (pointages):', totalHeuresPeriode.toFixed(2), 'h');
  console.log('Jours travaillés:', joursTravailes);

  // 2. Shifts théoriques
  const shiftsTheorique = await prisma.shift.findMany({
    where: {
      date: { gte: startDate, lte: today },
      type: { in: ['présence', 'NORMAL', 'matin', 'soir', 'coupure', 'travail'] },
      employe: { role: 'employee' }
    }
  });
  console.log('\nShifts trouvés:', shiftsTheorique.length);

  // Calculer heures théoriques EXACTEMENT comme le backend
  let heuresTheorique = 0;
  shiftsTheorique.forEach(shift => {
    if (!shift.segments || !Array.isArray(shift.segments)) return;
    
    shift.segments.forEach(segment => {
      if (segment.start && segment.end && !segment.isExtra) {
        try {
          const [startH, startM] = segment.start.split(':').map(Number);
          const [endH, endM] = segment.end.split(':').map(Number);
          
          let startMinutes = startH * 60 + startM;
          let endMinutes = endH * 60 + endM;
          
          if (endMinutes < startMinutes) {
            endMinutes += 24 * 60;
          }
          
          heuresTheorique += (endMinutes - startMinutes) / 60;
        } catch (e) {
          console.log('Erreur segment:', segment, e);
        }
      }
    });
  });

  console.log('Heures théoriques (shifts):', heuresTheorique.toFixed(2), 'h');

  // 3. Calcul assiduité
  const tauxAssiduiteRaw = heuresTheorique > 0 
    ? ((totalHeuresPeriode / heuresTheorique) * 100)
    : 100;
  const tauxAssiduite = Math.min(100, tauxAssiduiteRaw).toFixed(1);

  console.log('\n=== RÉSULTAT ===');
  console.log('Assiduité brute:', tauxAssiduiteRaw.toFixed(2), '%');
  console.log('Assiduité affichée:', tauxAssiduite, '%');

  if (tauxAssiduiteRaw > 100) {
    console.log('\n⚠️ Plus d\'heures travaillées que planifiées!');
    console.log('   → L\'assiduité est plafonnée à 100%');
  }

  await prisma.$disconnect();
}

debug();
