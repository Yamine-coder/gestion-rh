// Script pour créer des pointages réalistes basés sur les shifts existants
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Générer une heure avec variation aléatoire
function addRandomMinutes(timeStr, minVariation = -15, maxVariation = 15) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  const variation = Math.floor(Math.random() * (maxVariation - minVariation + 1)) + minVariation;
  const newTotalMinutes = Math.max(0, Math.min(1439, totalMinutes + variation)); // 0-1439 (23:59)
  
  const newHours = Math.floor(newTotalMinutes / 60);
  const newMins = newTotalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

// Obtenir une date avec heure
function getDateWithTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00.000Z`);
}

async function createRealisticPointages() {
  console.log('🎯 CRÉATION DE POINTAGES RÉALISTES\n');

  try {
    // Récupérer tous les shifts avec employés
    const shifts = await prisma.shift.findMany({
      include: {
        employe: {
          select: { id: true, nom: true, prenom: true }
        }
      },
      orderBy: [{ date: 'asc' }, { employeId: 'asc' }]
    });

    console.log(`📋 ${shifts.length} shifts trouvés`);

    let pointagesCreated = 0;
    const scenarios = [
      { name: 'Ponctuel', prob: 0.6, arrivalVar: [-5, 5], departVar: [-10, 10] },
      { name: 'Léger retard', prob: 0.25, arrivalVar: [5, 20], departVar: [-5, 15] },
      { name: 'Retard significatif', prob: 0.10, arrivalVar: [20, 45], departVar: [0, 20] },
      { name: 'Absent', prob: 0.05, arrivalVar: null, departVar: null }
    ];

    for (const shift of shifts) {
      const dateStr = shift.date.toISOString().split('T')[0];
      const segments = shift.segments || [];
      
      if (segments.length === 0) continue;

      // Choisir un scénario aléatoire
      const rand = Math.random();
      let scenario = scenarios[0];
      let cumulative = 0;
      for (const s of scenarios) {
        cumulative += s.prob;
        if (rand <= cumulative) {
          scenario = s;
          break;
        }
      }

      console.log(`👤 ${shift.employe.prenom} ${shift.employe.nom} - ${dateStr}: ${scenario.name}`);

      // Cas d'absence : ne créer aucun pointage
      if (scenario.name === 'Absent') {
        console.log('   ❌ Absence complète');
        continue;
      }

      // Créer pointages pour chaque segment
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        // Pointage d'arrivée
        const arrivalTime = addRandomMinutes(segment.start, ...scenario.arrivalVar);
        const arrivalPointage = await prisma.pointage.create({
          data: {
            userId: shift.employeId,
            type: 'arrivee',
            horodatage: getDateWithTime(dateStr, arrivalTime)
          }
        });
        
        // Pointage de départ
        const departTime = addRandomMinutes(segment.end, ...scenario.departVar);
        const departPointage = await prisma.pointage.create({
          data: {
            userId: shift.employeId,
            type: 'depart',
            horodatage: getDateWithTime(dateStr, departTime)
          }
        });

        console.log(`   📍 Segment ${i + 1}: ${segment.start}->${arrivalTime} | ${segment.end}->${departTime}`);
        pointagesCreated += 2;

        // Parfois ajouter des pointages intermédiaires (pause, etc.)
        if (Math.random() < 0.3 && segments.length === 1) {
          const pauseOut = addRandomMinutes('14:00', -30, 30);
          const pauseIn = addRandomMinutes('14:30', -15, 45);
          
          if (pauseOut > arrivalTime && pauseIn < departTime) {
            await prisma.pointage.create({
              data: {
                userId: shift.employeId,
                type: 'depart',
                horodatage: getDateWithTime(dateStr, pauseOut)
              }
            });
            
            await prisma.pointage.create({
              data: {
                userId: shift.employeId,
                type: 'arrivee',
                horodatage: getDateWithTime(dateStr, pauseIn)
              }
            });
            
            console.log(`   ☕ Pause: ${pauseOut}-${pauseIn}`);
            pointagesCreated += 2;
          }
        }
      }
    }

    console.log(`\n✅ ${pointagesCreated} pointages créés !`);
    
    // Statistiques finales
    const totalPointages = await prisma.pointage.count();
    const usersWithPointages = await prisma.pointage.groupBy({
      by: ['userId'],
      _count: { userId: true }
    });

    console.log(`\n📊 STATISTIQUES:`);
    console.log(`   Total pointages: ${totalPointages}`);
    console.log(`   Employés avec pointages: ${usersWithPointages.length}`);
    
    // Compter par type
    const byType = await prisma.pointage.groupBy({
      by: ['type'],
      _count: { type: true }
    });
    
    byType.forEach(t => {
      console.log(`   Type "${t.type}": ${t._count.type}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRealisticPointages();
