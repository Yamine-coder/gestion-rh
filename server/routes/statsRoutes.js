const express = require('express');
const router = express.Router();
const { 
  getStatsRH, 
  getEmployeesStats, 
  getPlanningStats, 
  getCongesStats, 
  getAllPointages, 
  exportData 
} = require('../controllers/statsController');
const { authMiddleware: authenticateToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdminMiddleware');
const prisma = require('../prisma/client');

// 🔍 Middleware de debug pour toutes les routes stats
router.use((req, res, next) => {
  console.log(`🔍 [STATS DEBUG] ${req.method} ${req.path} - Query:`, req.query, '- Params:', req.params);
  next();
});

// 📊 Rapport détaillé d'un employé pour une période
router.get('/employe/:employeId/rapport', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { employeId } = req.params;
    const { periode, mois } = req.query;

    console.log(`📊 [STATS DEBUG] Génération rapport pour employé ${employeId}, période: ${periode}, mois: ${mois}`);
    console.log(`🔍 [STATS DEBUG] User:`, req.user);
    console.log(`🔍 [STATS DEBUG] Params:`, req.params);
    console.log(`🔍 [STATS DEBUG] Query:`, req.query);

    // Valider l'employé
    const employe = await prisma.user.findUnique({
      where: { id: parseInt(employeId) },
      select: { id: true, email: true, nom: true, prenom: true, role: true }
    });

    console.log(`🔍 [STATS DEBUG] Employé trouvé:`, employe);

    if (!employe) {
      console.log(`❌ [STATS DEBUG] Employé ${employeId} non trouvé`);
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    // Calculer les dates de la période
    let dateDebut, dateFin;
    const maintenant = new Date();

    switch (periode) {
      case 'semaine':
        // Semaine courante (lundi à dimanche)
        const jourSemaine = maintenant.getDay();
        const diffDebut = jourSemaine === 0 ? -6 : 1 - jourSemaine;
        dateDebut = new Date(maintenant);
        dateDebut.setDate(maintenant.getDate() + diffDebut);
        dateDebut.setHours(0, 0, 0, 0);
        
        dateFin = new Date(dateDebut);
        dateFin.setDate(dateDebut.getDate() + 6);
        dateFin.setHours(23, 59, 59, 999);
        break;

      case 'mois':
        if (mois) {
          const [annee, moisNum] = mois.split('-');
          dateDebut = new Date(parseInt(annee), parseInt(moisNum) - 1, 1);
          dateFin = new Date(parseInt(annee), parseInt(moisNum), 0, 23, 59, 59, 999);
        } else {
          dateDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
          dateFin = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59, 999);
        }
        break;

      case 'trimestre':
        const trimestre = Math.floor(maintenant.getMonth() / 3);
        dateDebut = new Date(maintenant.getFullYear(), trimestre * 3, 1);
        dateFin = new Date(maintenant.getFullYear(), (trimestre + 1) * 3, 0, 23, 59, 59, 999);
        break;

      default:
        return res.status(400).json({ message: 'Période invalide' });
    }

    console.log(`📅 Période calculée: ${dateDebut.toISOString()} → ${dateFin.toISOString()}`);

    // Récupérer les shifts (planning) de l'employé
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: parseInt(employeId),
        date: {
          gte: dateDebut,
          lte: dateFin
        }
      },
      orderBy: { date: 'asc' }
    });

    // Récupérer les pointages de l'employé
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: parseInt(employeId),
        horodatage: {
          gte: dateDebut,
          lte: dateFin
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`📋 Trouvé: ${shifts.length} shifts, ${pointages.length} pointages`);

    // Analyser les données jour par jour
    const heuresParJour = [];
    const retards = [];
    let heuresPrevues = 0;
    let heuresTravaillees = 0;
    let heuresSupplementaires = 0;
    let absencesJustifiees = 0;
    let absencesInjustifiees = 0;

    // Grouper les pointages par jour
    const pointagesParJour = new Map();
    pointages.forEach(p => {
      const dateKey = p.horodatage.toISOString().split('T')[0];
      if (!pointagesParJour.has(dateKey)) {
        pointagesParJour.set(dateKey, []);
      }
      pointagesParJour.get(dateKey).push(p);
    });

    // Traiter chaque shift
    shifts.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0];
      const pointagesJour = pointagesParJour.get(dateKey) || [];

      let heuresPrevuesJour = 0;
      let heuresTravailleesJour = 0;

      if (shift.type === 'présence' && shift.segments) {
        // Calculer les heures prévues
        shift.segments.forEach(segment => {
          if (segment.start && segment.end && !segment.isExtra) {
            heuresPrevuesJour += calculateSegmentHours(segment);
          }
          if (segment.isExtra) {
            heuresSupplementaires += calculateSegmentHours(segment);
          }
        });

        // Calculer les heures travaillées réelles
        heuresTravailleesJour = calculateRealHours(pointagesJour);

        // Analyser les retards
        if (pointagesJour.length > 0) {
          shift.segments.forEach((segment, index) => {
            if (segment.start && segment.end && !segment.isExtra) {
              const retardInfo = analyserRetard(segment, pointagesJour, shift.date);
              if (retardInfo.retard > 0) {
                retards.push({
                  date: dateKey,
                  segment: index,
                  retard: retardInfo.retard,
                  heurePrevu: segment.start,
                  heureReelle: retardInfo.heureArrivee
                });
              }
            }
          });
        }
      } else if (shift.type === 'absence') {
        // Compter les absences
        const motif = shift.motif?.toLowerCase() || '';
        if (motif.includes('congé') || motif.includes('rtt') || motif.includes('maladie')) {
          absencesJustifiees++;
        } else {
          absencesInjustifiees++;
        }
      }

      heuresParJour.push({
        jour: dateKey,
        date: shift.date,
        prevues: Math.round(heuresPrevuesJour * 100) / 100,
        travaillees: Math.round(heuresTravailleesJour * 100) / 100,
        type: shift.type,
        motif: shift.motif
      });

      heuresPrevues += heuresPrevuesJour;
      heuresTravaillees += heuresTravailleesJour;
    });

    // Ajouter les jours avec pointages mais sans planning
    pointagesParJour.forEach((pointagesJour, dateKey) => {
      const jourExiste = heuresParJour.find(h => h.jour === dateKey);
      if (!jourExiste) {
        const heuresTravailleesJour = calculateRealHours(pointagesJour);
        heuresParJour.push({
          jour: dateKey,
          date: new Date(dateKey),
          prevues: 0,
          travaillees: Math.round(heuresTravailleesJour * 100) / 100,
          type: 'hors_planning',
          motif: null
        });
        heuresTravaillees += heuresTravailleesJour;
      }
    });

    // Trier par date
    heuresParJour.sort((a, b) => new Date(a.jour) - new Date(b.jour));

    const rapport = {
      employe,
      periode: { debut: dateDebut, fin: dateFin, type: periode },
      heuresPrevues: Math.round(heuresPrevues * 100) / 100,
      heuresTravaillees: Math.round(heuresTravaillees * 100) / 100,
      heuresSupplementaires: Math.round(heuresSupplementaires * 100) / 100,
      absencesJustifiees,
      absencesInjustifiees,
      nombreRetards: retards.length,
      retards,
      heuresParJour,
      statistiques: {
        joursTravailles: heuresParJour.filter(h => h.travaillees > 0).length,
        joursAbsents: absencesJustifiees + absencesInjustifiees,
        moyenneHeuresJour: heuresParJour.length > 0 ? Math.round((heuresTravaillees / heuresParJour.filter(h => h.travaillees > 0).length) * 100) / 100 : 0
      }
    };

    console.log(`✅ Rapport généré: ${rapport.heuresTravaillees}h travaillées sur ${rapport.heuresPrevues}h prévues`);

    res.json(rapport);

  } catch (error) {
    console.error('❌ [STATS DEBUG] Erreur génération rapport employé:', error);
    console.error('❌ [STATS DEBUG] Stack:', error.stack);
    res.status(500).json({ 
      message: 'Erreur lors de la génération du rapport',
      error: error.message 
    });
  }
});

// Fonctions utilitaires
function calculateSegmentHours(segment) {
  if (!segment.start || !segment.end) return 0;
  
  const [startH, startM] = segment.start.split(':').map(Number);
  const [endH, endM] = segment.end.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  let diffMinutes = endMinutes - startMinutes;
  
  // Gérer le passage à minuit
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }
  
  return Math.round((diffMinutes / 60) * 100) / 100;
}

function calculateRealHours(pointages) {
  if (!pointages || pointages.length < 2) return 0;
  
  let totalMinutes = 0;
  
  for (let i = 0; i < pointages.length - 1; i += 2) {
    const arrivee = pointages[i];
    const depart = pointages[i + 1];
    
    if (arrivee.type === 'arrivee' && depart && depart.type === 'depart') {
      const diffMs = new Date(depart.horodatage) - new Date(arrivee.horodatage);
      totalMinutes += diffMs / (1000 * 60);
    }
  }
  
  return Math.round((totalMinutes / 60) * 100) / 100;
}

function analyserRetard(segment, pointagesJour, dateShift) {
  const premiereArrivee = pointagesJour.find(p => p.type === 'arrivee');
  
  if (!premiereArrivee) {
    return { retard: 0, heureArrivee: null };
  }

  // Convertir l'heure prévue en minutes
  const [prevuH, prevuM] = segment.start.split(':').map(Number);
  const minutesPrevues = prevuH * 60 + prevuM;

  // Convertir l'heure réelle en minutes
  const heureArrivee = new Date(premiereArrivee.horodatage);
  const minutesReelles = heureArrivee.getHours() * 60 + heureArrivee.getMinutes();

  // Calculer le retard (en minutes)
  let retardMinutes = minutesReelles - minutesPrevues;

  // Gérer le passage à minuit (travail de nuit)
  if (retardMinutes < -12 * 60) {
    retardMinutes += 24 * 60;
  }

  return {
    retard: Math.max(0, retardMinutes),
    heureArrivee: heureArrivee.toTimeString().slice(0, 5)
  };
}

// Routes pour les statistiques détaillées
router.get('/employes', authenticateToken, isAdmin, getEmployeesStats);
router.get('/planning', authenticateToken, isAdmin, getPlanningStats);
router.get('/conges', authenticateToken, isAdmin, getCongesStats);

// Route pour les pointages avec filtres
router.get('/pointages', authenticateToken, isAdmin, getAllPointages);

// Routes pour l'export des données
router.get('/export/:type', authenticateToken, isAdmin, exportData);

// Route d'export du rapport d'un employé
router.get('/employe/:employeId/export', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { employeId } = req.params;
    const { periode, mois } = req.query;

    console.log(`📊 Export rapport pour employé ${employeId}, période: ${periode}, mois: ${mois}`);

    // Valider l'employé
    const employe = await prisma.user.findUnique({
      where: { id: parseInt(employeId) },
      select: { id: true, email: true, nom: true, prenom: true, role: true }
    });

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    // Calculer les dates de la période (réutilisation de la logique)
    let dateDebut, dateFin;
    const maintenant = new Date();

    switch (periode) {
      case 'semaine':
        const jourSemaine = maintenant.getDay();
        const diffDebut = jourSemaine === 0 ? -6 : 1 - jourSemaine;
        dateDebut = new Date(maintenant);
        dateDebut.setDate(maintenant.getDate() + diffDebut);
        dateDebut.setHours(0, 0, 0, 0);
        
        dateFin = new Date(dateDebut);
        dateFin.setDate(dateDebut.getDate() + 6);
        dateFin.setHours(23, 59, 59, 999);
        break;

      case 'mois':
        if (mois) {
          const [annee, moisNum] = mois.split('-');
          dateDebut = new Date(parseInt(annee), parseInt(moisNum) - 1, 1);
          dateFin = new Date(parseInt(annee), parseInt(moisNum), 0, 23, 59, 59, 999);
        } else {
          dateDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
          dateFin = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59, 999);
        }
        break;

      case 'trimestre':
        const trimestre = Math.floor(maintenant.getMonth() / 3);
        dateDebut = new Date(maintenant.getFullYear(), trimestre * 3, 1);
        dateFin = new Date(maintenant.getFullYear(), (trimestre + 1) * 3, 0, 23, 59, 59, 999);
        break;

      default:
        return res.status(400).json({ message: 'Période invalide' });
    }

    // Récupérer les shifts et pointages (logique simplifiée pour l'export)
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: parseInt(employeId),
        date: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { date: 'asc' }
    });

    const pointages = await prisma.pointage.findMany({
      where: {
        userId: parseInt(employeId),
        horodatage: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { horodatage: 'asc' }
    });

    // Générer le CSV
    const csvLines = [];
    
    // En-tête
    csvLines.push('Date,Heures Prévues,Heures Travaillées,Écart,Type,Motif');
    
    // Traitement simplifié des données
    const pointagesParJour = new Map();
    pointages.forEach(p => {
      const dateKey = p.horodatage.toISOString().split('T')[0];
      if (!pointagesParJour.has(dateKey)) {
        pointagesParJour.set(dateKey, []);
      }
      pointagesParJour.get(dateKey).push(p);
    });

    let totalPrevues = 0;
    let totalTravaillees = 0;

    shifts.forEach(shift => {
      const dateKey = shift.date.toISOString().split('T')[0];
      const pointagesJour = pointagesParJour.get(dateKey) || [];

      let heuresPrevuesJour = 0;
      let heuresTravailleesJour = 0;

      if (shift.type === 'présence' && shift.segments) {
        shift.segments.forEach(segment => {
          if (segment.start && segment.end && !segment.isExtra) {
            heuresPrevuesJour += calculateSegmentHours(segment);
          }
        });
        heuresTravailleesJour = calculateRealHours(pointagesJour);
      }

      const ecart = (heuresTravailleesJour - heuresPrevuesJour).toFixed(2);
      csvLines.push(`${dateKey},${heuresPrevuesJour.toFixed(2)},${heuresTravailleesJour.toFixed(2)},${ecart},${shift.type || ''},${shift.motif || ''}`);
      
      totalPrevues += heuresPrevuesJour;
      totalTravaillees += heuresTravailleesJour;
    });
    
    // Résumé
    csvLines.push('');
    csvLines.push('RÉSUMÉ');
    csvLines.push(`Employé,${employe.prenom} ${employe.nom}`);
    csvLines.push(`Email,${employe.email}`);
    csvLines.push(`Période,${dateDebut.toISOString().split('T')[0]} à ${dateFin.toISOString().split('T')[0]}`);
    csvLines.push(`Heures Prévues Total,${totalPrevues.toFixed(2)}`);
    csvLines.push(`Heures Travaillées Total,${totalTravaillees.toFixed(2)}`);
    csvLines.push(`Écart Total,${(totalTravaillees - totalPrevues).toFixed(2)}`);

    const csvContent = csvLines.join('\n');
    const fileName = `rapport_${employe.nom}_${employe.prenom}_${periode}_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send('\ufeff' + csvContent); // UTF-8 BOM pour Excel

  } catch (error) {
    console.error('❌ Erreur export rapport employé:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'export du rapport',
      error: error.message 
    });
  }
});

// Route existante pour les stats RH
router.get('/', authenticateToken, isAdmin, getStatsRH);

module.exports = router;
