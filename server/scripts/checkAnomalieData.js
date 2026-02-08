const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  // Récupérer l'anomalie
  const a = await prisma.anomalie.findUnique({ 
    where: { id: 486 }, 
    include: { employe: true } 
  });
  
  console.log('=== ANOMALIE #486 ===');
  console.log('Employé:', a.employe.prenom, a.employe.nom, '(ID:', a.employeId, ')');
  console.log('Date:', a.date);
  console.log('Type:', a.type);
  console.log('heuresExtra:', a.heuresExtra);
  console.log('Details:', JSON.stringify(a.details, null, 2));
  
  const empId = a.employeId;
  const dateStr = '2026-01-27';
  
  // Récupérer le shift
  const shift = await prisma.shift.findFirst({ 
    where: { 
      employeId: empId, 
      date: { 
        gte: new Date(dateStr + 'T00:00:00Z'), 
        lte: new Date(dateStr + 'T23:59:59Z') 
      } 
    } 
  });
  
  console.log('\n=== SHIFT ===');
  if (shift) {
    console.log('Shift ID:', shift.id);
    console.log('Date:', shift.date);
    console.log('Type:', shift.type);
    const segments = typeof shift.segments === 'string' ? JSON.parse(shift.segments) : shift.segments;
    console.log('Segments:', JSON.stringify(segments, null, 2));
    
    // Calculer durée prévue
    let totalMinutes = 0;
    segments.forEach(s => {
      const [startH, startM] = (s.start || s.debut).split(':').map(Number);
      const [endH, endM] = (s.end || s.fin).split(':').map(Number);
      totalMinutes += (endH * 60 + endM) - (startH * 60 + startM);
    });
    console.log('Durée totale prévue:', totalMinutes, 'min =', (totalMinutes/60).toFixed(1), 'h');
  } else {
    console.log('Pas de shift trouvé');
  }
  
  // Récupérer les pointages
  const pointages = await prisma.pointage.findMany({ 
    where: { 
      userId: empId, 
      horodatage: { 
        gte: new Date(dateStr + 'T00:00:00Z'), 
        lte: new Date(dateStr + 'T23:59:59Z') 
      } 
    },
    orderBy: { horodatage: 'asc' }
  });
  
  console.log('\n=== POINTAGES ===');
  console.log('Nombre de pointages:', pointages.length);
  pointages.forEach(pt => {
    console.log(`  - ${pt.type}: ${pt.horodatage.toISOString()}`);
  });
  
  await prisma.$disconnect();
}

checkData().catch(e => { console.error(e); prisma.$disconnect(); });
