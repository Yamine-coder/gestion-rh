/**
 * Test complet: Crée les anomalies pour les pointages existants de Jordan
 * Ce script analyse les pointages vs le planning et crée les anomalies manquantes
 */
const prisma = require('./prisma/client');

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`\n🧪 CRÉATION DES ANOMALIES POUR JORDAN - ${today}`);
  console.log('='.repeat(60));

  // Trouver Jordan
  const jordan = await prisma.user.findFirst({
    where: { email: 'yjordan496@gmail.com' }
  });

  if (!jordan) {
    console.log('❌ Jordan non trouvé');
    return;
  }
  console.log(`✅ Jordan trouvé (ID: ${jordan.id})`);

  // Récupérer le shift
  const shift = await prisma.shift.findFirst({
    where: {
      employeId: jordan.id,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      },
      type: { in: ['travail', 'présence', 'presence'] }
    }
  });

  if (!shift) {
    console.log('❌ Pas de shift planifié');
    return;
  }
  console.log(`✅ Shift trouvé:`, JSON.stringify(shift.segments, null, 2));

  // Récupérer les pointages
  const pointages = await prisma.pointage.findMany({
    where: {
      userId: jordan.id,
      horodatage: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    },
    orderBy: { horodatage: 'asc' }
  });

  console.log(`\n📊 ${pointages.length} pointages trouvés:`);
  pointages.forEach(p => {
    const h = new Date(p.horodatage);
    console.log(`   - ${p.type}: ${h.getHours().toString().padStart(2,'0')}:${h.getMinutes().toString().padStart(2,'0')}`);
  });

  // Analyser les segments de travail
  const workSegments = (shift.segments || []).filter(seg => {
    const segType = seg.type?.toLowerCase();
    return segType !== 'pause' && segType !== 'break';
  });

  if (!workSegments.length) {
    console.log('❌ Pas de segments de travail');
    return;
  }

  const TOLERANCE = 5; // minutes

  // ===== DÉTECTER LE RETARD =====
  const premiereEntree = pointages.find(p => p.type === 'ENTRÉE');
  if (premiereEntree) {
    const firstSegment = workSegments[0];
    const planStart = firstSegment.start || firstSegment.debut;
    
    if (planStart) {
      const [planH, planM] = planStart.split(':').map(Number);
      const planMinutes = planH * 60 + planM;
      
      const entreeDate = new Date(premiereEntree.horodatage);
      const entreeMinutes = entreeDate.getHours() * 60 + entreeDate.getMinutes();
      const ecartRetard = entreeMinutes - planMinutes;

      console.log(`\n🕐 Analyse RETARD:`);
      console.log(`   Prévu: ${planStart} (${planMinutes} min)`);
      console.log(`   Réel: ${entreeDate.getHours()}:${entreeDate.getMinutes().toString().padStart(2,'0')} (${entreeMinutes} min)`);
      console.log(`   Écart: ${ecartRetard} min`);

      if (ecartRetard > TOLERANCE) {
        // Supprimer anomalie existante
        await prisma.anomalie.deleteMany({
          where: {
            employeId: jordan.id,
            date: {
              gte: new Date(`${today}T00:00:00.000Z`),
              lt: new Date(`${today}T23:59:59.999Z`)
            },
            type: { contains: 'retard' }
          }
        });

        const heureReelle = `${String(entreeDate.getHours()).padStart(2, '0')}:${String(entreeDate.getMinutes()).padStart(2, '0')}`;
        const gravite = ecartRetard > 30 ? 'haute' : ecartRetard > 15 ? 'moyenne' : 'basse';
        
        const anomalie = await prisma.anomalie.create({
          data: {
            employeId: jordan.id,
            date: new Date(`${today}T12:00:00.000Z`),
            type: ecartRetard > 20 ? 'retard_critique' : 'retard_modere',
            gravite,
            statut: 'en_attente',
            details: {
              heurePrevue: planStart,
              heureReelle,
              ecartMinutes: ecartRetard,
              shiftId: shift.id,
              detecteAutomatiquement: true
            },
            description: `Retard de ${ecartRetard} min (arrivée ${heureReelle}, prévu ${planStart})`
          }
        });
        console.log(`   ✅ ANOMALIE CRÉÉE: ${anomalie.type} - ${anomalie.description}`);
      } else {
        console.log(`   ℹ️ Pas de retard significatif (tolérance: ${TOLERANCE} min)`);
      }
    }
  }

  // ===== DÉTECTER LE DÉPART ANTICIPÉ =====
  const sorties = pointages.filter(p => p.type === 'SORTIE');
  const derniereSortie = sorties[sorties.length - 1];
  
  if (derniereSortie) {
    const lastSegment = workSegments[workSegments.length - 1];
    const planEnd = lastSegment.end || lastSegment.fin;
    
    if (planEnd) {
      const [planH, planM] = planEnd.split(':').map(Number);
      const planMinutes = planH * 60 + planM;
      
      const sortieDate = new Date(derniereSortie.horodatage);
      const sortieMinutes = sortieDate.getHours() * 60 + sortieDate.getMinutes();
      const ecartDepart = planMinutes - sortieMinutes;

      console.log(`\n🚪 Analyse DÉPART ANTICIPÉ:`);
      console.log(`   Prévu: ${planEnd} (${planMinutes} min)`);
      console.log(`   Réel: ${sortieDate.getHours()}:${sortieDate.getMinutes().toString().padStart(2,'0')} (${sortieMinutes} min)`);
      console.log(`   Écart: ${ecartDepart} min`);

      if (ecartDepart > TOLERANCE) {
        // Supprimer anomalie existante
        await prisma.anomalie.deleteMany({
          where: {
            employeId: jordan.id,
            date: {
              gte: new Date(`${today}T00:00:00.000Z`),
              lt: new Date(`${today}T23:59:59.999Z`)
            },
            type: { contains: 'depart' }
          }
        });

        const heureReelle = `${String(sortieDate.getHours()).padStart(2, '0')}:${String(sortieDate.getMinutes()).padStart(2, '0')}`;
        const gravite = ecartDepart > 60 ? 'haute' : ecartDepart > 30 ? 'moyenne' : 'basse';
        
        const anomalie = await prisma.anomalie.create({
          data: {
            employeId: jordan.id,
            date: new Date(`${today}T12:00:00.000Z`),
            type: 'depart_anticipe',
            gravite,
            statut: 'en_attente',
            details: {
              heurePrevue: planEnd,
              heureReelle,
              ecartMinutes: ecartDepart,
              shiftId: shift.id,
              detecteAutomatiquement: true
            },
            description: `Départ anticipé de ${ecartDepart} min (départ ${heureReelle}, prévu ${planEnd})`
          }
        });
        console.log(`   ✅ ANOMALIE CRÉÉE: ${anomalie.type} - ${anomalie.description}`);
      } else {
        console.log(`   ℹ️ Pas de départ anticipé significatif (tolérance: ${TOLERANCE} min)`);
      }
    }
  }

  // Afficher toutes les anomalies
  console.log('\n' + '='.repeat(60));
  const toutesAnomalies = await prisma.anomalie.findMany({
    where: {
      employeId: jordan.id,
      date: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${today}T23:59:59.999Z`)
      }
    }
  });

  console.log(`📋 RÉSUMÉ: ${toutesAnomalies.length} anomalie(s) pour aujourd'hui:`);
  toutesAnomalies.forEach(a => {
    console.log(`   🚨 ${a.type} (${a.gravite}) - ${a.description}`);
  });

  console.log('\n✅ Rafraîchissez la page Pointage pour voir les anomalies!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
