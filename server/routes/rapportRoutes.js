const express = require('express');
const router = express.Router();
const { authMiddleware: authenticateToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdminMiddleware');
const prisma = require('../prisma/client');
const { toLocalDateString } = require('../utils/dateUtils');

// 📊 Génération du rapport de présence/absence pour une période donnée
router.get('/presence/:startDate/:endDate', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    const debut = new Date(startDate);
    const fin = new Date(endDate);
    fin.setHours(23, 59, 59, 999);

    // Récupérer tous les shifts de la période
    const shifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: debut,
          lte: fin
        }
      },
      include: {
        employe: {
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
            role: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { employe: { nom: 'asc' } }
      ]
    });

    // Récupérer les pointages de la période
    const pointages = await prisma.pointage.findMany({
      where: {
        horodatage: {
          gte: debut,
          lte: fin
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true
          }
        }
      },
      orderBy: {
        horodatage: 'asc'
      }
    });

    // Traiter les données pour le rapport
    const rapportData = [];
    const employesMap = new Map();

    // Initialiser la carte des employés
    shifts.forEach(shift => {
      if (!employesMap.has(shift.employeId)) {
        employesMap.set(shift.employeId, {
          id: shift.employeId,
          email: shift.employe.email,
          nom: shift.employe.nom,
          prenom: shift.employe.prenom,
          role: shift.employe.role,
          jours: new Map()
        });
      }
    });

    // Traiter les shifts (planning)
    shifts.forEach(shift => {
      const employe = employesMap.get(shift.employeId);
      const dateKey = toLocalDateString(shift.date);
      
      employe.jours.set(dateKey, {
        date: dateKey,
        type: shift.type,
        motif: shift.motif,
        segments: shift.segments || [],
        heuresPrevues: shift.type === 'travail' ? calculatePlannedHours(shift.segments) : 0,
        heuresReelles: 0,
        pointages: [],
        statut: shift.type === 'absence' ? 'absent' : 'prévu'
      });
    });

    // Traiter les pointages réels
    const pointagesGroupes = new Map();
    pointages.forEach(pointage => {
      const dateKey = toLocalDateString(pointage.horodatage);
      const userId = pointage.userId;
      
      if (!pointagesGroupes.has(userId)) {
        pointagesGroupes.set(userId, new Map());
      }
      
      if (!pointagesGroupes.get(userId).has(dateKey)) {
        pointagesGroupes.get(userId).set(dateKey, []);
      }
      
      pointagesGroupes.get(userId).get(dateKey).push(pointage);
    });

    // Calculer les heures réelles
    pointagesGroupes.forEach((joursPointages, userId) => {
      const employe = employesMap.get(userId);
      if (!employe) return;

      joursPointages.forEach((pointagesJour, dateKey) => {
        const jourData = employe.jours.get(dateKey);
        if (jourData) {
          jourData.pointages = pointagesJour;
          jourData.heuresReelles = calculateRealHours(pointagesJour);
          
          if (jourData.heuresReelles > 0) {
            jourData.statut = jourData.type === 'travail' ? 'présent' : 'présent_non_prévu';
          }
        }
      });
    });

    // Convertir en tableau pour la réponse
    employesMap.forEach(employe => {
      const joursArray = Array.from(employe.jours.values());
      rapportData.push({
        ...employe,
        jours: joursArray,
        totalHeuresPrevues: joursArray.reduce((sum, jour) => sum + jour.heuresPrevues, 0),
        totalHeuresReelles: joursArray.reduce((sum, jour) => sum + jour.heuresReelles, 0),
        joursPresence: joursArray.filter(j => j.statut === 'présent').length,
        joursAbsence: joursArray.filter(j => j.statut === 'absent').length
      });
    });

    res.json({
      periode: { debut: startDate, fin: endDate },
      employes: rapportData,
      resume: {
        totalEmployes: rapportData.length,
        totalHeuresPrevues: rapportData.reduce((sum, emp) => sum + emp.totalHeuresPrevues, 0),
        totalHeuresReelles: rapportData.reduce((sum, emp) => sum + emp.totalHeuresReelles, 0)
      }
    });

  } catch (error) {
    console.error('Erreur génération rapport présence:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération du rapport',
      error: error.message 
    });
  }
});

// 📈 Rapport de ponctualité pour une période
router.get('/ponctualite/:startDate/:endDate', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    const debut = new Date(startDate);
    const fin = new Date(endDate);
    fin.setHours(23, 59, 59, 999);

    // Récupérer les données nécessaires
    const shifts = await prisma.shift.findMany({
      where: {
        date: { gte: debut, lte: fin },
        type: 'travail'
      },
      include: {
        employe: {
          select: { id: true, email: true, nom: true, prenom: true }
        }
      }
    });

    const pointages = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: debut, lte: fin }
      },
      include: {
        user: {
          select: { id: true, email: true, nom: true, prenom: true }
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    // Analyser la ponctualité
    const ponctualiteData = [];
    
    // Grouper les pointages par employé et par jour
    const pointagesParEmployeJour = new Map();
    pointages.forEach(p => {
      const dateKey = toLocalDateString(p.horodatage);
      const key = `${p.userId}-${dateKey}`;
      
      if (!pointagesParEmployeJour.has(key)) {
        pointagesParEmployeJour.set(key, []);
      }
      pointagesParEmployeJour.get(key).push(p);
    });

    shifts.forEach(shift => {
      if (!shift.segments || shift.segments.length === 0) return;

      const dateKey = toLocalDateString(shift.date);
      const pointagesKey = `${shift.employeId}-${dateKey}`;
      const pointagesJour = pointagesParEmployeJour.get(pointagesKey) || [];

      shift.segments.forEach((segment, index) => {
        if (segment.start && segment.end) {
          const analyse = analyserPonctualiteSegment(segment, pointagesJour, shift.date);
          
          ponctualiteData.push({
            employe: shift.employe,
            date: dateKey,
            segmentIndex: index,
            heuresPrevues: segment,
            ...analyse
          });
        }
      });
    });

    res.json({
      periode: { debut: startDate, fin: endDate },
      ponctualite: ponctualiteData
    });

  } catch (error) {
    console.error('Erreur génération rapport ponctualité:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération du rapport de ponctualité',
      error: error.message 
    });
  }
});

// 💰 Rapport des heures supplémentaires
router.get('/heures-supplementaires/:startDate/:endDate', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    const debut = new Date(startDate);
    const fin = new Date(endDate);
    fin.setHours(23, 59, 59, 999);

    // Récupérer les shifts avec segments extra
    const shifts = await prisma.shift.findMany({
      where: {
        date: { gte: debut, lte: fin }
      },
      include: {
        employe: {
          select: { id: true, email: true, nom: true, prenom: true }
        }
      }
    });

    const heuresSupplementaires = [];

    shifts.forEach(shift => {
      if (shift.segments) {
        shift.segments.forEach((segment, index) => {
          if (segment.isExtra) {
            heuresSupplementaires.push({
              employe: shift.employe,
              date: toLocalDateString(shift.date),
              segment: segment,
              heures: calculateSegmentHours(segment),
              montant: segment.extraMontant || 0,
              statut: segment.paymentStatus || 'à_payer',
              validePar: segment.validatedBy,
              valideAt: segment.validatedAt
            });
          }
        });
      }
    });

    const resume = {
      totalHeuresExtra: heuresSupplementaires.reduce((sum, h) => sum + h.heures, 0),
      totalMontant: heuresSupplementaires.reduce((sum, h) => sum + h.montant, 0),
      aPayerMontant: heuresSupplementaires
        .filter(h => h.statut === 'à_payer')
        .reduce((sum, h) => sum + h.montant, 0)
    };

    res.json({
      periode: { debut: startDate, fin: endDate },
      heuresSupplementaires,
      resume
    });

  } catch (error) {
    console.error('Erreur génération rapport heures supplémentaires:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération du rapport des heures supplémentaires',
      error: error.message 
    });
  }
});

// Fonctions utilitaires
function calculatePlannedHours(segments) {
  if (!segments || segments.length === 0) return 0;
  
  return segments.reduce((total, segment) => {
    // ⚠️ Exclure les segments extra (heures "au noir") des rapports officiels
    if (segment.start && segment.end && !segment.isExtra) {
      return total + calculateSegmentHours(segment);
    }
    return total;
  }, 0);
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

function calculateSegmentHours(segment) {
  if (!segment.start || !segment.end) return 0;
  
  const [startH, startM] = segment.start.split(':').map(Number);
  const [endH, endM] = segment.end.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  let diffMinutes = endMinutes - startMinutes;
  
  // 🌙 RESTAURANT : Gérer le passage à minuit (ex: 19:00 → 00:30 = 5.5h)
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
    console.log(`   🌙 Shift franchit minuit: ${segment.start}→${segment.end} = ${(diffMinutes/60).toFixed(1)}h`);
  }
  
  return Math.round((diffMinutes / 60) * 100) / 100;
}

function analyserPonctualiteSegment(segment, pointagesJour, dateShift) {
  // Logique d'analyse de ponctualité simplifiée
  if (pointagesJour.length === 0) {
    return {
      statut: 'absent',
      retardArrivee: null,
      departAnticipe: null
    };
  }
  
  // Trouver le premier pointage arrivée et le dernier départ
  const premiereArrivee = pointagesJour.find(p => p.type === 'arrivee');
  const dernierDepart = pointagesJour.filter(p => p.type === 'depart').pop();
  
  if (!premiereArrivee) {
    return {
      statut: 'absence_partielle',
      retardArrivee: null,
      departAnticipe: null
    };
  }
  
  // Calculer les écarts (simplifié)
  const heureArriveePrevu = segment.start;
  const heureDepartPrevu = segment.end;
  
  return {
    statut: 'présent',
    retardArrivee: 0, // À calculer précisément
    departAnticipe: 0, // À calculer précisément
    heureArriveeReelle: premiereArrivee.horodatage.toTimeString().slice(0, 5),
    heureDepartReelle: dernierDepart ? dernierDepart.horodatage.toTimeString().slice(0, 5) : null
  };
}

module.exports = router;
