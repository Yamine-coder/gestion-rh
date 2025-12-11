const prisma = require('./prisma/client');

async function testCheckEmployeEnCours() {
  console.log('=== TEST: Vérification des employés "En cours" après fin de shift ===\n');
  
  // Forcer la date du 6 décembre
  const dateStr = '2025-12-06';
  const now = new Date();
  
  // Si on est après minuit (journée de travail continue jusqu'à 6h)
  // On ajuste currentMinutes pour refléter "passé minuit" = minutes + 24*60
  let currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (now.getDate() === 7 && now.getHours() < 6) {
    // On est le 7 après minuit mais avant 6h = encore dans la journée de travail du 6
    currentMinutes = 24 * 60 + now.getHours() * 60 + now.getMinutes(); // Ex: 00:30 = 24h30 = 1470 minutes
  }
  
  console.log(`📅 Date de travail forcée: ${dateStr}`);
  console.log(`🕐 Heure actuelle: ${now.toLocaleTimeString('fr-FR')}`);
  console.log(`🕐 Minutes depuis début journée: ${currentMinutes} (${(currentMinutes/60).toFixed(1)}h)\n`);
  
  // Bornes de la journée
  const startUTC = new Date(`${dateStr}T00:00:00+01:00`);
  const endUTC = new Date(`${dateStr}T23:59:59+01:00`);
  
  // 1. Récupérer tous les pointages
  const pointages = await prisma.pointage.findMany({
    where: {
      horodatage: {
        gte: startUTC,
        lt: endUTC
      }
    },
    include: {
      user: { select: { id: true, nom: true, prenom: true, role: true, statut: true } }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  console.log(`📊 ${pointages.length} pointage(s) trouvé(s)\n`);
  
  // 2. Grouper par utilisateur
  const pointagesParUser = {};
  for (const p of pointages) {
    if (!pointagesParUser[p.userId]) {
      pointagesParUser[p.userId] = [];
    }
    pointagesParUser[p.userId].push(p);
  }
  
  // currentMinutes déjà calculé au début
  
  // 3. Analyser chaque utilisateur
  for (const [userId, userPointages] of Object.entries(pointagesParUser)) {
    const userIdInt = parseInt(userId);
    const user = userPointages[0]?.user;
    
    if (user?.role === 'admin' || user?.role === 'manager' || user?.role === 'rh') continue;
    
    const entrees = userPointages.filter(p => p.type === 'ENTRÉE' || p.type === 'arrivee');
    const sorties = userPointages.filter(p => p.type === 'SORTIE' || p.type === 'depart');
    
    console.log(`\n👤 ${user?.prenom} ${user?.nom} (ID: ${userId})`);
    console.log(`   Entrées: ${entrees.length}, Sorties: ${sorties.length}`);
    
    // Afficher les pointages
    userPointages.forEach(p => {
      const h = new Date(p.horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      console.log(`   - ${h} ${p.type}`);
    });
    
    // Est-il "en cours" ?
    if (entrees.length > sorties.length) {
      const derniereEntree = entrees[entrees.length - 1];
      const heureEntree = new Date(derniereEntree.horodatage);
      const minutesEntree = heureEntree.getHours() * 60 + heureEntree.getMinutes();
      const dureeEnCours = currentMinutes - minutesEntree;
      
      console.log(`   ⚠️ STATUT: EN COURS depuis ${(dureeEnCours / 60).toFixed(1)}h`);
      
      // Récupérer le shift
      const shift = await prisma.shift.findFirst({
        where: {
          employeId: userIdInt,
          date: {
            gte: startUTC,
            lt: endUTC
          },
          type: { in: ['travail', 'présence', 'presence'] }
        }
      });
      
      if (shift) {
        const segments = shift.segments || [];
        const workSegments = segments.filter(seg => {
          const segType = seg.type?.toLowerCase();
          return segType !== 'pause' && segType !== 'break';
        });
        
        if (workSegments.length > 0) {
          const lastSegment = workSegments[workSegments.length - 1];
          const shiftEnd = lastSegment.end || lastSegment.fin;
          
          if (shiftEnd) {
            const [endH, endM] = shiftEnd.split(':').map(Number);
            const shiftEndMinutes = endH * 60 + endM;
            const minutesApresFinShift = currentMinutes - shiftEndMinutes;
            
            console.log(`   📋 Shift prévu: fin à ${shiftEnd}`);
            
            if (minutesApresFinShift > 0) {
              console.log(`   🚨 ${minutesApresFinShift} minutes APRÈS la fin du shift!`);
              console.log(`   💰 Heures sup potentielles: ${(minutesApresFinShift / 60).toFixed(1)}h`);
              
              if (minutesApresFinShift >= 60) {
                console.log(`   ❌ ANOMALIE: Devrait créer "missing_out_prolonge"`);
              }
            } else {
              console.log(`   ✅ Shift pas encore terminé`);
            }
          }
        }
      } else {
        console.log(`   📋 Pas de shift prévu`);
      }
    } else {
      console.log(`   ✅ STATUT: Terminé (entrées = sorties)`);
    }
  }
  
  await prisma.$disconnect();
}

testCheckEmployeEnCours().catch(console.error);
