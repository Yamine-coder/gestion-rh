const prisma = require('./prisma/client');

async function simulateScheduler() {
  const jordanId = 110;
  const dateStr = '2025-12-05';
  
  console.log('=== SIMULATION SCHEDULER - PAUSE NON PRISE ===');
  console.log('');
  
  // Récupérer le shift
  const shift = await prisma.shift.findFirst({
    where: { employeId: jordanId },
    include: { employe: { select: { nom: true, prenom: true } } }
  });
  
  console.log('Shift:', shift.segments);
  
  // Récupérer les pointages
  const pointages = await prisma.pointage.findMany({
    where: { userId: jordanId },
    orderBy: { horodatage: 'asc' }
  });
  
  const entrees = pointages.filter(p => p.type === 'arrivee');
  const sorties = pointages.filter(p => p.type === 'depart');
  
  console.log('Entrees:', entrees.length);
  console.log('Sorties:', sorties.length);
  
  // Logique pause_non_prise
  const pauseSegments = shift.segments.filter(s => s.type === 'pause');
  console.log('Pauses prevues:', pauseSegments.length);
  
  if (entrees.length === 1 && sorties.length === 1) {
    const entree = new Date(entrees[0].horodatage);
    const sortie = new Date(sorties[0].horodatage);
    const dureeMinutes = Math.round((sortie - entree) / (1000 * 60));
    
    console.log('');
    console.log('Entree:', entree.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' }));
    console.log('Sortie:', sortie.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' }));
    console.log('Duree travail continu:', dureeMinutes, 'min =', (dureeMinutes/60).toFixed(1), 'h');
    
    const pause = pauseSegments[0];
    const description = 'Pause non prise - ' + (dureeMinutes/60).toFixed(1) + 'h de travail continu (pause prevue ' + pause.start + '-' + pause.end + ')';
    
    // Créer l'anomalie
    await prisma.anomalie.create({
      data: {
        employeId: jordanId,
        type: 'pause_non_prise',
        gravite: dureeMinutes > 360 ? 'haute' : 'moyenne',
        statut: 'en_attente',
        date: new Date(dateStr + 'T11:00:00Z'),
        description: description,
        details: {
          pausePrevue: pause.start + ' - ' + pause.end,
          dureeTravailContinuMinutes: dureeMinutes
        }
      }
    });
    
    console.log('');
    console.log('=== ANOMALIE CREEE ===');
    console.log('Type: pause_non_prise');
    console.log('Description:', description);
    
    // Si >6h, créer aussi depassement_amplitude
    if (dureeMinutes > 360) {
      await prisma.anomalie.create({
        data: {
          employeId: jordanId,
          type: 'depassement_amplitude',
          gravite: 'critique',
          statut: 'en_attente',
          date: new Date(dateStr + 'T11:00:00Z'),
          description: 'Violation code du travail - ' + (dureeMinutes/60).toFixed(1) + 'h de travail continu (max legal: 6h)'
        }
      });
      console.log('');
      console.log('Type: depassement_amplitude (>6h sans pause!)');
    }
  }
  
  await prisma['$'+'disconnect']();
}

simulateScheduler();
