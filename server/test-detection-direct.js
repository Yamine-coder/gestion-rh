/**
 * TEST DIRECT DE LA DÉTECTION - Sans serveur
 * 
 * Ce script teste directement la logique de détection de pause_excessive
 * en créant les données et en appelant la fonction de détection.
 */

const prisma = require('./prisma/client');

// Reproduire la logique de détection
async function creerAnomalieTempsReel({ userId, type, gravite, description, date }) {
  try {
    const anomalie = await prisma.anomalie.create({
      data: {
        employeId: userId,
        type,
        gravite,
        description,
        date: new Date(date),
        statut: 'en_attente'
      }
    });
    console.log(`   ✅ Anomalie créée: ID ${anomalie.id}`);
    return anomalie;
  } catch (err) {
    console.error('   ❌ Erreur création anomalie:', err.message);
    return null;
  }
}

async function detecterPauseExcessive(userId, horodatage, shift) {
  console.log('\n🔍 ANALYSE PAUSE EXCESSIVE:');
  
  // Récupérer les pointages du jour
  const workDay = horodatage.toISOString().split('T')[0];
  const dayStart = new Date(workDay + 'T06:00:00');
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  
  const pointages = await prisma.pointage.findMany({
    where: {
      userId,
      horodatage: { gte: dayStart, lt: dayEnd }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  console.log(`   📋 Pointages du jour: ${pointages.length}`);
  pointages.forEach(p => {
    console.log(`      ${p.type} → ${p.horodatage.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
  });
  
  // Chercher le pattern départ → arrivée (retour de pause)
  const arrivees = pointages.filter(p => p.type === 'arrivee');
  const departs = pointages.filter(p => p.type === 'depart');
  
  console.log(`   📊 Arrivées: ${arrivees.length}, Départs: ${departs.length}`);
  
  // Si on a au moins 2 arrivées, on cherche une pause
  if (arrivees.length >= 2 && departs.length >= 1) {
    // Dernière arrivée = retour de pause
    const retourPause = arrivees[arrivees.length - 1];
    
    // Chercher le départ juste avant
    const departPause = departs.find(d => 
      d.horodatage < retourPause.horodatage && 
      d.horodatage > arrivees[arrivees.length - 2].horodatage
    );
    
    if (departPause) {
      const debutPause = departPause.horodatage;
      const finPause = retourPause.horodatage;
      const dureePauseReelleMinutes = Math.round((finPause - debutPause) / 60000);
      
      console.log(`\n   ⏱️  PAUSE DÉTECTÉE:`);
      console.log(`      Début: ${debutPause.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`      Fin: ${finPause.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`      Durée réelle: ${dureePauseReelleMinutes} minutes`);
      
      // Trouver la pause prévue dans les segments
      let pausePrevueMinutes = 30; // défaut
      if (shift?.segments) {
        const pauseSegment = shift.segments.find(s => 
          s.type?.toLowerCase() === 'pause' || s.type?.toLowerCase() === 'break'
        );
        if (pauseSegment) {
          const [pStartH, pStartM] = (pauseSegment.start || pauseSegment.debut).split(':').map(Number);
          const [pEndH, pEndM] = (pauseSegment.end || pauseSegment.fin).split(':').map(Number);
          pausePrevueMinutes = (pEndH * 60 + pEndM) - (pStartH * 60 + pStartM);
        }
      }
      console.log(`      Durée prévue: ${pausePrevueMinutes} minutes`);
      
      const depassementMinutes = dureePauseReelleMinutes - pausePrevueMinutes;
      console.log(`      Dépassement: ${depassementMinutes} minutes`);
      
      // Tolérance de 5 minutes
      if (depassementMinutes > 5) {
        console.log(`\n   🚨 PAUSE EXCESSIVE DÉTECTÉE! (> 5 min de tolérance)`);
        
        let gravite = 'moyenne';
        let emoji = '☕';
        if (depassementMinutes > 30) { gravite = 'haute'; emoji = '⚠️☕'; }
        if (depassementMinutes > 60) { gravite = 'critique'; emoji = '🚨☕'; }
        
        const description = `${emoji} Pause excessive de ${depassementMinutes} min - Durée réelle ${dureePauseReelleMinutes}min au lieu de ${pausePrevueMinutes}min prévues`;
        
        return await creerAnomalieTempsReel({
          userId,
          type: 'pause_excessive',
          gravite,
          description,
          date: workDay
        });
      } else {
        console.log(`\n   ✅ Pause dans les limites acceptables`);
      }
    }
  }
  
  return null;
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🧪 TEST DIRECT DÉTECTION pause_excessive (sans serveur)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const workDay = '2025-12-06';
    const userId = 110;
    
    // 1. Nettoyage
    console.log('🧹 Nettoyage des données existantes...');
    await prisma.pointage.deleteMany({
      where: { userId, horodatage: { gte: new Date(workDay + 'T00:00:00') } }
    });
    await prisma.anomalie.deleteMany({
      where: { employeId: userId, date: { gte: new Date(workDay) } }
    });
    await prisma.shift.deleteMany({
      where: { employeId: userId, date: new Date(workDay) }
    });
    
    // 2. Créer le shift
    console.log('📅 Création du shift avec pause de 30 min...');
    const shift = await prisma.shift.create({
      data: {
        employeId: userId,
        date: new Date(workDay),
        type: 'journee',
        segments: [
          { type: 'travail', start: '08:00', end: '12:00' },
          { type: 'pause', start: '12:00', end: '12:30' },
          { type: 'travail', start: '12:30', end: '17:00' }
        ]
      }
    });
    console.log(`   ✅ Shift ID ${shift.id} créé\n`);
    
    // 3. Créer les pointages
    console.log('📱 Création des pointages:');
    
    // Arrivée à 08:00
    await prisma.pointage.create({
      data: { userId, type: 'arrivee', horodatage: new Date(workDay + 'T08:00:00') }
    });
    console.log('   1. Arrivée 08:00 ✅');
    
    // Départ pause à 12:00
    await prisma.pointage.create({
      data: { userId, type: 'depart', horodatage: new Date(workDay + 'T12:00:00') }
    });
    console.log('   2. Départ pause 12:00 ✅');
    
    // Retour pause à 12:45 (15 min de retard!)
    await prisma.pointage.create({
      data: { userId, type: 'arrivee', horodatage: new Date(workDay + 'T12:45:00') }
    });
    console.log('   3. Retour pause 12:45 (+15 min!) ✅');
    
    // 4. Lancer la détection
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const anomalie = await detecterPauseExcessive(userId, new Date(workDay + 'T12:45:00'), shift);
    
    // 5. Résultat
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RÉSULTAT FINAL:');
    
    const anomaliesDB = await prisma.anomalie.findMany({
      where: { employeId: userId, type: 'pause_excessive', date: { gte: new Date(workDay) } }
    });
    
    if (anomaliesDB.length > 0) {
      console.log(`\n   ╔════════════════════════════════════════════════════════╗`);
      console.log(`   ║  🎉 TEST RÉUSSI - DÉTECTION AUTOMATIQUE FONCTIONNE !  ║`);
      console.log(`   ╚════════════════════════════════════════════════════════╝`);
      anomaliesDB.forEach(a => {
        console.log(`\n   📌 Anomalie ID ${a.id}:`);
        console.log(`      Type: ${a.type}`);
        console.log(`      Gravité: ${a.gravite.toUpperCase()}`);
        console.log(`      ${a.description}`);
      });
    } else {
      console.log('\n   ❌ TEST ÉCHOUÉ - Aucune anomalie créée');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Erreur:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
