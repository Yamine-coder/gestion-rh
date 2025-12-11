const prisma = require('./prisma/client');

// Importer les fonctions utilitaires du scheduler
function getParisTime() {
  const now = new Date();
  const parisFormatter = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const parts = parisFormatter.formatToParts(now);
  const get = (type) => parts.find(p => p.type === type)?.value;
  return {
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10)
  };
}

function getParisDateBoundsUTC(dateStr) {
  const startParis = new Date(`${dateStr}T00:00:00+01:00`);
  const endParis = new Date(`${dateStr}T23:59:59+01:00`);
  const month = parseInt(dateStr.split('-')[1], 10);
  if (month >= 4 && month <= 10) {
    startParis.setTime(startParis.getTime() - 3600000);
    endParis.setTime(endParis.getTime() - 3600000);
  }
  return { startUTC: startParis, endUTC: endParis };
}

async function testDetectionMissingOut() {
  console.log('=== TEST: Détection missing_out pour Moussaoui Yamine ===\n');
  
  const paris = getParisTime();
  let today = paris.dateStr;
  const currentHour = paris.hour;
  const currentMinute = paris.minute;
  
  // FORCER le test sur le 6 décembre (journée où il y a des pointages)
  today = '2025-12-06';
  
  // LOGIQUE 6h-6h - calculer currentMinutes comme si on était le 7 après minuit
  // mais qu'on vérifie la journée de travail du 6
  let currentMinutes = 24 * 60 + currentHour * 60 + currentMinute; // Ex: 00:34 = 1474 min
  
  console.log(`📅 Date forcée: ${today}`);
  console.log(`🕐 Heure Paris: ${paris.hour}:${paris.minute}`);
  console.log(`🕐 Minutes totales: ${currentMinutes} (${(currentMinutes/60).toFixed(1)}h)\n`);
  
  const { startUTC, endUTC } = getParisDateBoundsUTC(today);
  
  // Trouver Moussaoui
  const moussaoui = await prisma.user.findFirst({
    where: { id: 110 }
  });
  console.log(`👤 Employé: ${moussaoui?.prenom} ${moussaoui?.nom}\n`);
  
  // Récupérer ses pointages du jour
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: 110,
      horodatage: { gte: startUTC, lt: endUTC }
    },
    orderBy: { horodatage: 'asc' }
  });
  
  console.log(`📊 Pointages:`);
  pointages.forEach(p => {
    const h = new Date(p.horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    console.log(`   ${h} - ${p.type}`);
  });
  
  const entrees = pointages.filter(p => p.type === 'ENTRÉE' || p.type === 'arrivee');
  const sorties = pointages.filter(p => p.type === 'SORTIE' || p.type === 'depart');
  
  console.log(`\n   Entrées: ${entrees.length}, Sorties: ${sorties.length}`);
  
  if (entrees.length > sorties.length) {
    console.log(`   ⚠️ EN COURS (entrée sans sortie)\n`);
    
    const derniereEntree = entrees[entrees.length - 1];
    const heureEntree = new Date(derniereEntree.horodatage);
    const minutesEntree = heureEntree.getHours() * 60 + heureEntree.getMinutes();
    const dureeEnCours = currentMinutes - minutesEntree;
    
    console.log(`   Dernière entrée: ${heureEntree.toLocaleTimeString('fr-FR')}`);
    console.log(`   Durée en cours: ${(dureeEnCours/60).toFixed(1)}h`);
    
    // Récupérer le shift
    const shift = await prisma.shift.findFirst({
      where: {
        employeId: 110,
        date: { gte: startUTC, lt: endUTC },
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
        
        console.log(`\n📋 Shift prévu fin: ${shiftEnd}`);
        
        const [endH, endM] = shiftEnd.split(':').map(Number);
        const shiftEndMinutes = endH * 60 + endM;
        const minutesApresFinShift = currentMinutes - shiftEndMinutes;
        
        console.log(`   Minutes après fin shift: ${minutesApresFinShift} (${(minutesApresFinShift/60).toFixed(1)}h)`);
        
        if (minutesApresFinShift >= 60) {
          console.log(`\n🚨 ANOMALIE DÉTECTÉE: missing_out_prolonge`);
          console.log(`   Gravité: ${minutesApresFinShift > 180 ? 'haute' : 'moyenne'}`);
          console.log(`   Heures sup potentielles: ${(minutesApresFinShift/60).toFixed(1)}h`);
          
          // Vérifier si l'anomalie existe déjà
          const anomalieExistante = await prisma.anomalie.findFirst({
            where: {
              employeId: 110,
              date: { gte: startUTC, lt: endUTC },
              type: 'missing_out_prolonge'
            }
          });
          
          if (anomalieExistante) {
            console.log(`\n✅ Anomalie déjà créée (ID: ${anomalieExistante.id})`);
          } else {
            console.log(`\n❌ Anomalie PAS ENCORE créée - le scheduler devrait la créer`);
            
            // Créer l'anomalie
            const midiParis = new Date(`${today}T11:00:00.000Z`);
            const newAnomalie = await prisma.anomalie.create({
              data: {
                employeId: 110,
                date: midiParis,
                type: 'missing_out_prolonge',
                gravite: minutesApresFinShift > 180 ? 'haute' : 'moyenne',
                statut: 'en_attente',
                details: {
                  shiftId: shift.id,
                  heurePrevueFin: shiftEnd,
                  derniereEntree: derniereEntree.horodatage,
                  dureeEnCoursMinutes: dureeEnCours,
                  minutesApresFinShift,
                  heuresSupPotentielles: (minutesApresFinShift/60).toFixed(1),
                  detecteAutomatiquement: true,
                  detectePar: 'test-manuel'
                },
                description: `⚠️ Sortie non pointée - "En cours" depuis ${(dureeEnCours/60).toFixed(1)}h (fin prévue: ${shiftEnd}, ${(minutesApresFinShift/60).toFixed(1)}h sup potentielles)`
              }
            });
            console.log(`\n✅ Anomalie créée! ID: ${newAnomalie.id}`);
          }
        } else {
          console.log(`\n✅ Pas encore 60 min après fin shift - pas d'anomalie`);
        }
      }
    }
  }
  
  await prisma.$disconnect();
}

testDetectionMissingOut().catch(console.error);
