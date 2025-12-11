// Simulation de la route d'export pour diagnostiquer l'erreur
const { PrismaClient } = require('@prisma/client');
const { generateAllEmployeesExcel } = require('./utils/exportUtils');
const fs = require('fs');

const prisma = new PrismaClient();

// Copier les fonctions helpers de statsRoutes.js
function calculateSegmentHours(segment) {
  if (!segment.start || !segment.end) return 0;
  
  const [startH, startM] = segment.start.split(':').map(Number);
  const [endH, endM] = segment.end.split(':').map(Number);
  
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
}

function calculateRealHours(pointages) {
  if (!pointages || pointages.length === 0) return 0;
  
  const sortedPointages = [...pointages].sort((a, b) => 
    new Date(a.horodatage) - new Date(b.horodatage)
  );
  
  let totalMinutes = 0;
  let lastEntree = null;
  
  for (const p of sortedPointages) {
    if (p.type === 'entree') {
      lastEntree = new Date(p.horodatage);
    } else if (p.type === 'sortie' && lastEntree) {
      const sortie = new Date(p.horodatage);
      const diffMinutes = (sortie - lastEntree) / (1000 * 60);
      totalMinutes += diffMinutes;
      lastEntree = null;
    }
  }
  
  return totalMinutes / 60;
}

async function testExportRoute() {
  try {
    console.log('🧪 TEST SIMULATION ROUTE EXPORT\n');
    console.log('='.repeat(80));

    const periode = 'mois';
    const mois = null;
    
    // Calculer les dates
    let dateDebut, dateFin;
    const maintenant = new Date();

    if (mois) {
      const [annee, moisNum] = mois.split('-');
      dateDebut = new Date(parseInt(annee), parseInt(moisNum) - 1, 1);
      dateFin = new Date(parseInt(annee), parseInt(moisNum), 0, 23, 59, 59, 999);
    } else {
      dateDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
      dateFin = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    console.log(`📅 Période: ${dateDebut.toLocaleDateString('fr-FR')} → ${dateFin.toLocaleDateString('fr-FR')}\n`);

    // Récupérer tous les employés actifs
    console.log('📥 Récupération des employés...');
    const employes = await prisma.user.findMany({
      where: {
        role: { not: 'admin' }
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true
      },
      orderBy: [
        { nom: 'asc' },
        { prenom: 'asc' }
      ]
    });
    console.log(`✅ ${employes.length} employés trouvés`);

    // Récupérer shifts
    console.log('📥 Récupération des shifts...');
    const shifts = await prisma.shift.findMany({
      where: {
        date: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { date: 'asc' }
    });
    console.log(`✅ ${shifts.length} shifts trouvés`);

    // Récupérer pointages
    console.log('📥 Récupération des pointages...');
    const pointages = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { horodatage: 'asc' }
    });
    console.log(`✅ ${pointages.length} pointages trouvés`);

    // Récupérer congés
    console.log('📥 Récupération des congés...');
    const conges = await prisma.conge.findMany({
      where: {
        statut: 'Validé',
        OR: [
          { dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } }
        ]
      },
      select: {
        id: true,
        userId: true,
        dateDebut: true,
        dateFin: true,
        type: true
      }
    });
    console.log(`✅ ${conges.length} congés trouvés\n`);

    // Grouper par employé
    console.log('🔄 Groupement des données...');
    const shiftsParEmploye = new Map();
    const pointagesParEmploye = new Map();
    const congesParEmploye = new Map();

    shifts.forEach(s => {
      if (!shiftsParEmploye.has(s.employeId)) {
        shiftsParEmploye.set(s.employeId, []);
      }
      shiftsParEmploye.get(s.employeId).push(s);
    });

    pointages.forEach(p => {
      if (!pointagesParEmploye.has(p.userId)) {
        pointagesParEmploye.set(p.userId, []);
      }
      pointagesParEmploye.get(p.userId).push(p);
    });

    conges.forEach(c => {
      if (!congesParEmploye.has(c.userId)) {
        congesParEmploye.set(c.userId, []);
      }
      congesParEmploye.get(c.userId).push(c);
    });
    console.log('✅ Données groupées\n');

    // Traiter chaque employé
    console.log('🔄 Traitement des employés...');
    const rapportsEmployes = [];

    for (const employe of employes) {
      console.log(`   📊 Traitement ${employe.nom} ${employe.prenom}...`);
      
      const shiftsEmploye = shiftsParEmploye.get(employe.id) || [];
      const pointagesEmploye = pointagesParEmploye.get(employe.id) || [];
      const congesEmploye = congesParEmploye.get(employe.id) || [];

      // Créer map des congés par jour
      const congesParJour = new Map();
      congesEmploye.forEach(conge => {
        try {
          const debut = new Date(conge.dateDebut);
          const fin = new Date(conge.dateFin);
          const currentDate = new Date(debut);
          
          let iterations = 0;
          while (currentDate <= fin && iterations < 365) {
            const dateKey = currentDate.toISOString().split('T')[0];
            congesParJour.set(dateKey, {
              type: conge.type
            });
            currentDate.setDate(currentDate.getDate() + 1);
            iterations++;
          }
          
          if (iterations >= 365) {
            console.warn(`⚠️  Boucle infinie détectée pour congé ${conge.id}`);
          }
        } catch (err) {
          console.error(`❌ Erreur traitement congé ${conge.id}:`, err.message);
        }
      });

      // Grouper pointages par jour
      const pointagesParJour = new Map();
      pointagesEmploye.forEach(p => {
        const dateKey = p.horodatage.toISOString().split('T')[0];
        if (!pointagesParJour.has(dateKey)) {
          pointagesParJour.set(dateKey, []);
        }
        pointagesParJour.get(dateKey).push(p);
      });

      let heuresPrevues = 0;
      let heuresTravaillees = 0;
      let heuresSupplementaires = 0;
      let absencesJustifiees = 0;
      let absencesInjustifiees = 0;
      const joursAvecRetard = new Set();
      const heuresParJour = [];

      // Traiter shifts
      shiftsEmploye.forEach(shift => {
        const dateKey = shift.date.toISOString().split('T')[0];
        const pointagesJour = pointagesParJour.get(dateKey) || [];
        const congeJour = congesParJour.get(dateKey);

        if (shift.type === 'présence' && shift.segments) {
          let heuresPrevuesJour = 0;
          shift.segments.forEach(segment => {
            if (segment.start && segment.end && !segment.isExtra) {
              const heuresSegment = calculateSegmentHours(segment);
              heuresPrevues += heuresSegment;
              heuresPrevuesJour += heuresSegment;
            }
            if (segment.isExtra) {
              heuresSupplementaires += calculateSegmentHours(segment);
            }
          });

          const heuresTravailleesJour = calculateRealHours(pointagesJour);
          heuresTravaillees += heuresTravailleesJour;

          heuresParJour.push({
            jour: shift.date,
            type: 'présence',
            heuresPrevues: heuresPrevuesJour,
            heuresTravaillees: heuresTravailleesJour
          });
        } else if (shift.type === 'absence') {
          const motif = shift.motif?.toLowerCase() || '';
          let heuresPrevuesJour = 7;

          if (motif.includes('congé') || motif.includes('rtt') || motif.includes('maladie')) {
            absencesJustifiees++;
          } else {
            absencesInjustifiees++;
          }

          heuresParJour.push({
            jour: shift.date,
            type: 'absence',
            heuresPrevues: heuresPrevuesJour,
            heuresTravaillees: 0,
            details: congeJour ? {
              type: 'congé',
              congeType: congeJour.type
            } : undefined
          });
        }
      });

      const joursTravailles = shiftsEmploye.filter(s => s.type === 'présence').length;
      const joursPresents = pointagesParJour.size;

      rapportsEmployes.push({
        nom: employe.nom,
        prenom: employe.prenom,
        email: employe.email,
        role: employe.role,
        heuresPrevues: Math.round(heuresPrevues * 100) / 100,
        heuresTravaillees: Math.round(heuresTravaillees * 100) / 100,
        heuresSupplementaires: Math.round(heuresSupplementaires * 100) / 100,
        heuresManquantes: Math.max(0, Math.round((heuresPrevues - heuresTravaillees) * 100) / 100),
        absencesJustifiees,
        absencesInjustifiees,
        nombreRetards: joursAvecRetard.size,
        joursPlanifies: joursTravailles,
        joursPresents,
        tauxPresence: Math.min(100, joursTravailles > 0 ? Math.round((joursPresents / joursTravailles) * 100) : 0),
        tauxPonctualite: joursPresents > 0 ? Math.round(((joursPresents - joursAvecRetard.size) / joursPresents) * 100) : 100,
        moyenneHeuresJour: joursPresents > 0 ? Math.round((heuresTravaillees / joursPresents) * 100) / 100 : 0,
        heuresParJour: heuresParJour
      });
    }

    console.log(`✅ ${rapportsEmployes.length} rapports générés\n`);

    // Générer Excel
    console.log('📊 Génération du fichier Excel...');
    const buffer = await generateAllEmployeesExcel(rapportsEmployes, periode, dateDebut, dateFin);
    console.log(`✅ Excel généré: ${buffer.length} bytes\n`);

    // Sauvegarder
    const fileName = 'test_export_route_simulation.xlsx';
    fs.writeFileSync(fileName, buffer);
    console.log(`💾 Fichier sauvegardé: ${fileName}`);

    console.log('='.repeat(80));
    console.log('🎉 SUCCÈS !');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testExportRoute();
