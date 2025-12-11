// Test du calcul d'assiduité

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAssiduite() {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);
  
  // Heures réelles (pointages)
  const pointages = await prisma.pointage.findMany({
    where: { horodatage: { gte: startDate }, user: { role: 'employee' } }
  });
  
  const parEmployeJour = {};
  pointages.forEach(p => {
    const key = p.userId + '_' + new Date(p.horodatage).toISOString().split('T')[0];
    if (!parEmployeJour[key]) parEmployeJour[key] = [];
    parEmployeJour[key].push(p);
  });
  
  let heuresReelles = 0;
  Object.values(parEmployeJour).forEach(pts => {
    const entrees = pts.filter(p => p.type === 'ENTRÉE').sort((a,b) => new Date(a.horodatage) - new Date(b.horodatage));
    const sorties = pts.filter(p => p.type === 'SORTIE').sort((a,b) => new Date(a.horodatage) - new Date(b.horodatage));
    if (entrees.length && sorties.length) {
      const h = (new Date(sorties[sorties.length-1].horodatage) - new Date(entrees[0].horodatage)) / (1000*60*60);
      if (h > 0 && h < 16) heuresReelles += h;
    }
  });
  
  // Heures planifiées (shifts)
  const shifts = await prisma.shift.findMany({
    where: { date: { gte: startDate, lte: today }, type: { in: ['présence', 'NORMAL', 'matin', 'soir', 'coupure', 'travail'] } }
  });
  
  let heuresPlanifiees = 0;
  shifts.forEach(s => {
    if (s.segments && s.segments[0] && s.segments[0].start && s.segments[0].end) {
      const [sh, sm] = s.segments[0].start.split(':').map(Number);
      const [eh, em] = s.segments[0].end.split(':').map(Number);
      heuresPlanifiees += ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    }
  });
  
  const assiduite = Math.min(100, (heuresReelles / heuresPlanifiees) * 100);
  
  // Retards
  let retards = 0;
  const pointagesEntree = pointages.filter(p => p.type === 'ENTRÉE');
  
  for (const p of pointagesEntree) {
    const dateP = new Date(p.horodatage);
    const dateStr = dateP.toISOString().split('T')[0];
    const shift = shifts.find(s => s.employeId === p.userId && new Date(s.date).toISOString().split('T')[0] === dateStr);
    
    if (shift && shift.segments && shift.segments[0] && shift.segments[0].start) {
      const [h, m] = shift.segments[0].start.split(':').map(Number);
      const prevues = h * 60 + m;
      const reelles = dateP.getHours() * 60 + dateP.getMinutes();
      if (reelles > prevues + 5) retards++;
    }
  }
  
  const tauxRetards = (retards / pointagesEntree.length) * 100;
  const ponctualite = 100 - tauxRetards;
  
  console.log('='.repeat(50));
  console.log('📊 COMPARAISON PONCTUALITÉ vs ASSIDUITÉ');
  console.log('='.repeat(50));
  
  console.log('\n📌 PONCTUALITÉ (respect des horaires d\'arrivée):');
  console.log(`   Retards: ${retards} sur ${pointagesEntree.length} entrées`);
  console.log(`   Taux de retards: ${tauxRetards.toFixed(1)}%`);
  console.log(`   → PONCTUALITÉ: ${ponctualite.toFixed(1)}%`);
  
  console.log('\n📌 ASSIDUITÉ (heures travaillées / planifiées):');
  console.log(`   Heures réelles: ${heuresReelles.toFixed(1)}h`);
  console.log(`   Heures planifiées: ${heuresPlanifiees.toFixed(1)}h`);
  console.log(`   → ASSIDUITÉ: ${assiduite.toFixed(1)}%`);
  
  console.log('\n💡 INTERPRÉTATION:');
  if (ponctualite < 95 && assiduite >= 98) {
    console.log('   Les employés arrivent en retard MAIS rattrapent leurs heures.');
  } else if (ponctualite >= 95 && assiduite < 95) {
    console.log('   Les employés sont ponctuels MAIS ne font pas toutes leurs heures.');
  } else if (ponctualite >= 95 && assiduite >= 98) {
    console.log('   ✅ Excellent : ponctuels ET assidus !');
  } else {
    console.log('   ⚠️ Problème : ni ponctuels ni assidus.');
  }
  
  console.log('\n' + '='.repeat(50));
  
  await prisma.$disconnect();
}

testAssiduite();
