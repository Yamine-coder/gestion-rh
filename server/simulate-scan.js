const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Reproduire la logique de détection du pointageRoutes.js
async function simulerScan() {
  const userId = 110;
  const now = new Date();
  
  // Logique journée de travail: avant 6h = journée de la veille
  const hour = now.getHours();
  const workDay = new Date(now);
  if (hour < 6) {
    workDay.setDate(workDay.getDate() - 1);
  }
  const dateJour = workDay.toISOString().split('T')[0];
  
  console.log('🔄 Simulation scan QR pour Jordan (retour de pause)...');
  console.log(`📅 Heure actuelle: ${now.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })}`);
  console.log(`📅 Journée de travail: ${dateJour} (car avant 6h = veille)\n`);
  
  // 1. Chercher le shift (comme le fait l'API)
  const shift = await prisma.shift.findFirst({
    where: {
      employeId: userId,
      date: new Date(dateJour)
    }
  });
  
  console.log('📋 Shift trouvé:', shift ? `ID ${shift.id} - ${shift.type}` : '❌ AUCUN');
  if (shift) {
    console.log('   Segments:', JSON.stringify(shift.segments));
  }
  
  // 2. Récupérer les pointages - journée de travail étendue (de 6h veille à 6h lendemain)
  const debutJournee = new Date(dateJour + 'T05:00:00Z'); // 6h Paris = 5h UTC
  const finJournee = new Date(dateJour);
  finJournee.setDate(finJournee.getDate() + 1);
  finJournee.setUTCHours(5, 0, 0, 0); // 6h Paris lendemain
  
  console.log('\n📅 Plage recherche pointages:', debutJournee.toISOString(), '→', finJournee.toISOString());
  
  const pointagesDuJour = await prisma.pointage.findMany({
    where: {
      userId,
      horodatage: { gte: debutJournee, lt: finJournee }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  console.log('\n📍 Pointages existants:');
  pointagesDuJour.forEach(p => {
    console.log(`   ${p.type} - ${p.horodatage.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })}`);
  });
  
  const arrivees = pointagesDuJour.filter(p => p.type === 'arrivee');
  const departs = pointagesDuJour.filter(p => p.type === 'depart');
  
  console.log(`\n   Arrivées: ${arrivees.length}, Départs: ${departs.length}`);
  
  // 3. Simuler la détection de pause excessive
  if (shift && arrivees.length >= 1 && departs.length >= 1) {
    console.log('\n✅ Conditions remplies pour détecter pause_excessive');
    
    const dernierDepart = departs[departs.length - 1];
    const debutPause = new Date(dernierDepart.horodatage);
    const finPause = now;
    const dureePauseReelleMinutes = Math.round((finPause - debutPause) / 60000);
    
    // Chercher la pause prévue dans les segments
    let pausePrevueMinutes = 60;
    const segments = shift.segments || [];
    const pauseSegment = segments.find(seg => seg.type === 'pause');
    
    if (pauseSegment) {
      const [pStartH, pStartM] = pauseSegment.start.split(':').map(Number);
      const [pEndH, pEndM] = pauseSegment.end.split(':').map(Number);
      pausePrevueMinutes = (pEndH * 60 + pEndM) - (pStartH * 60 + pStartM);
    }
    
    const depassementMinutes = dureePauseReelleMinutes - pausePrevueMinutes;
    
    console.log(`\n📊 Calcul pause:`);
    console.log(`   Début pause: ${debutPause.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })}`);
    console.log(`   Fin pause (maintenant): ${finPause.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })}`);
    console.log(`   Durée réelle: ${dureePauseReelleMinutes} min`);
    console.log(`   Durée prévue: ${pausePrevueMinutes} min`);
    console.log(`   Dépassement: ${depassementMinutes} min`);
    
    if (depassementMinutes > 5) {
      let gravite = 'moyenne';
      if (depassementMinutes > 30) gravite = 'haute';
      if (depassementMinutes > 60) gravite = 'critique';
      
      console.log(`\n🚨 ANOMALIE DÉTECTÉE: pause_excessive (${gravite})`);
      
      // Créer l'anomalie
      const anomalie = await prisma.anomalie.create({
        data: {
          employeId: userId,
          type: 'pause_excessive',
          gravite: gravite,
          description: `Pause excessive de ${depassementMinutes}min - Durée réelle ${dureePauseReelleMinutes}min au lieu de ${pausePrevueMinutes}min prévues`,
          date: new Date(dateJour),
          statut: 'en_attente'
        }
      });
      
      console.log(`✅ Anomalie créée: ID ${anomalie.id}`);
      
      // Créer le pointage de retour
      await prisma.pointage.create({
        data: { userId, type: 'arrivee', horodatage: now }
      });
      console.log(`✅ Pointage retour créé: arrivee à ${now.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })}`);
      
    } else {
      console.log('\n✅ Pas d\'anomalie - dans la tolérance de 5min');
    }
  } else {
    console.log('\n❌ Conditions NON remplies:');
    if (!shift) console.log('   - Pas de shift trouvé');
    if (arrivees.length < 1) console.log('   - Pas assez d\'arrivées');
    if (departs.length < 1) console.log('   - Pas assez de départs');
  }
  
  await prisma.$disconnect();
}

simulerScan().catch(console.error);
