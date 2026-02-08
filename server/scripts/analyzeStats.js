const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeStats() {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 1); // 1 mois en arrière
  
  console.log('📊 ANALYSE DES STATISTIQUES');
  console.log('='.repeat(60));
  console.log(`Période: ${startDate.toISOString().split('T')[0]} → ${today.toISOString().split('T')[0]}`);
  console.log('');
  
  // 1. Effectif
  const employesActifs = await prisma.user.count({
    where: { role: 'employee', statut: 'actif' }
  });
  const employesTotal = await prisma.user.count({
    where: { role: 'employee' }
  });
  console.log(`👥 EFFECTIF:`);
  console.log(`   - Actifs: ${employesActifs}`);
  console.log(`   - Total: ${employesTotal}`);
  
  // 2. Shifts planifiés
  const shifts = await prisma.shift.findMany({
    where: {
      date: { gte: startDate, lte: today },
      type: 'travail'
    }
  });
  
  let heuresTheoriques = 0;
  let shiftsValides = 0;
  
  shifts.forEach(shift => {
    let segments = shift.segments || [];
    // Parser si c'est une string JSON
    if (typeof segments === 'string') {
      try { segments = JSON.parse(segments); } catch(e) { segments = []; }
    }
    if (!Array.isArray(segments)) segments = [];
    
    segments.forEach(seg => {
      if (seg.start && seg.end && !seg.isExtra) {
        const [sh, sm] = seg.start.split(':').map(Number);
        const [eh, em] = seg.end.split(':').map(Number);
        let startMin = sh * 60 + sm;
        let endMin = eh * 60 + em;
        if (endMin < startMin) endMin += 24 * 60;
        heuresTheoriques += (endMin - startMin) / 60;
        shiftsValides++;
      }
    });
  });
  
  console.log(`\n📅 SHIFTS PLANIFIÉS:`);
  console.log(`   - Nombre de shifts: ${shifts.length}`);
  console.log(`   - Segments valides: ${shiftsValides}`);
  console.log(`   - Heures théoriques: ${heuresTheoriques.toFixed(1)}h`);
  
  // 3. Pointages réels
  const pointages = await prisma.pointage.findMany({
    where: {
      horodatage: { gte: startDate, lte: today }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  // Calculer heures réelles par paires arrivée/départ
  const pointagesParUserParJour = {};
  pointages.forEach(p => {
    const dateKey = p.horodatage.toISOString().split('T')[0];
    const key = `${p.userId}_${dateKey}`;
    if (!pointagesParUserParJour[key]) pointagesParUserParJour[key] = [];
    pointagesParUserParJour[key].push(p);
  });
  
  let heuresReelles = 0;
  let joursPointes = 0;
  
  Object.values(pointagesParUserParJour).forEach(pts => {
    pts.sort((a, b) => a.horodatage - b.horodatage);
    const arrivee = pts.find(p => p.type === 'arrivee');
    const depart = pts.find(p => p.type === 'depart');
    if (arrivee && depart) {
      const diff = (depart.horodatage - arrivee.horodatage) / 3600000;
      if (diff > 0 && diff < 24) {
        heuresReelles += diff;
        joursPointes++;
      }
    }
  });
  
  console.log(`\n⏱️ POINTAGES RÉELS:`);
  console.log(`   - Pointages total: ${pointages.length}`);
  console.log(`   - Jours avec arrivée+départ: ${joursPointes}`);
  console.log(`   - Heures réelles: ${heuresReelles.toFixed(1)}h`);
  
  // 4. Calcul absentéisme
  const heuresAbsence = Math.max(0, heuresTheoriques - heuresReelles);
  const tauxAbsenteisme = heuresTheoriques > 0 ? ((heuresAbsence / heuresTheoriques) * 100).toFixed(1) : 0;
  const tauxAssiduite = heuresTheoriques > 0 ? ((heuresReelles / heuresTheoriques) * 100).toFixed(1) : 0;
  
  console.log(`\n📉 ABSENTÉISME:`);
  console.log(`   - Heures manquantes: ${heuresAbsence.toFixed(1)}h`);
  console.log(`   - Taux absentéisme: ${tauxAbsenteisme}%`);
  console.log(`   - Taux assiduité: ${tauxAssiduite}%`);
  
  // 5. Retards
  const anomaliesRetard = await prisma.anomalie.count({
    where: {
      date: { gte: startDate, lte: today },
      type: { contains: 'retard' }
    }
  });
  
  const totalAnomalies = await prisma.anomalie.count({
    where: {
      date: { gte: startDate, lte: today }
    }
  });
  
  const tauxRetard = shiftsValides > 0 ? ((anomaliesRetard / shiftsValides) * 100).toFixed(1) : 0;
  
  console.log(`\n⏰ RETARDS:`);
  console.log(`   - Anomalies retard: ${anomaliesRetard}`);
  console.log(`   - Total anomalies: ${totalAnomalies}`);
  console.log(`   - Taux retard: ${tauxRetard}%`);
  
  // 6. Santé RH (combinaison)
  const santeRH = Math.max(0, 100 - parseFloat(tauxAbsenteisme) - parseFloat(tauxRetard) * 0.5);
  
  console.log(`\n💚 SANTÉ RH:`);
  console.log(`   - Score: ${santeRH.toFixed(0)}%`);
  console.log(`   (100% - ${tauxAbsenteisme}% absentéisme - ${(parseFloat(tauxRetard) * 0.5).toFixed(1)}% impact retards)`);
  
  // 7. Comparaison avec les valeurs affichées
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 COMPARAISON AVEC L'INTERFACE:`);
  console.log(`   Interface montre:     | Calcul réel:`);
  console.log(`   Santé RH: 60%         | ${santeRH.toFixed(0)}%`);
  console.log(`   Absentéisme: 40.3%    | ${tauxAbsenteisme}%`);
  console.log(`   Retards: 0.0%         | ${tauxRetard}%`);
  console.log(`   Assiduité: 59.7%      | ${tauxAssiduite}%`);
  
  await prisma.$disconnect();
}

analyzeStats().catch(e => { console.error(e); prisma.$disconnect(); });
