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
const { generateEmployeePDF, generateAllEmployeesExcel } = require('../utils/exportUtils');
const { toLocalDateString, getCurrentDateString } = require('../utils/dateUtils');
const { isEntree, isSortie, filtrerEntrees, filtrerSorties, trouverPremiereEntree, calculerHeuresReelles } = require('../utils/pointageTypeUtils');

/**
 * Normalise les types d'absence pour un affichage unifié
 * CP, conge_paye, Congé payé -> "Congé payé"
 * RTT -> "RTT"
 * maladie, Arrêt maladie -> "Arrêt maladie"
 */
function normaliserTypeAbsence(type) {
  if (!type) return 'Absence';
  const t = type.toLowerCase().trim();
  
  // Congés payés
  if (t === 'cp' || t === 'conge_paye' || t.includes('congé payé') || t.includes('conge paye')) {
    return 'Congé payé';
  }
  // RTT
  if (t === 'rtt' || t.includes('récup')) {
    return 'RTT';
  }
  // Maladie
  if (t.includes('maladie') || t === 'arret_maladie') {
    return 'Arrêt maladie';
  }
  // Sans solde
  if (t.includes('sans solde')) {
    return 'Congé sans solde';
  }
  // Exceptionnel
  if (t.includes('exceptionnel') || t.includes('familial')) {
    return 'Congé exceptionnel';
  }
  // Formation
  if (t.includes('formation')) {
    return 'Formation';
  }
  // Par défaut, retourner tel quel avec majuscule
  return type.charAt(0).toUpperCase() + type.slice(1);
}


// 📊 Stats globales pour la page Rapports d'heures
router.get('/globales', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { periode, mois } = req.query;

    // Calculer les dates de la période
    let dateDebut, dateFin;

    if (mois) {
      const [annee, moisNum] = mois.split('-');
      dateDebut = new Date(parseInt(annee), parseInt(moisNum) - 1, 1);
      dateFin = new Date(parseInt(annee), parseInt(moisNum), 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      dateDebut = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Compter les employés actifs
    const employesActifs = await prisma.user.count({
      where: {
        role: 'employee',
        statut: 'actif',
        dateSortie: null
      }
    });

    // Récupérer tous les shifts de travail de la période
    const shifts = await prisma.shift.findMany({
      where: {
        date: { gte: dateDebut, lte: dateFin },
        type: 'travail'
      }
    });

    // Récupérer tous les pointages de la période
    const pointages = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: dateDebut, lte: dateFin }
      }
    });

    // Récupérer les congés approuvés
    const conges = await prisma.conge.findMany({
      where: {
        dateDebut: { lte: dateFin },
        dateFin: { gte: dateDebut },
        statut: 'approuvé'
      }
    });

    // Créer une map des jours de congé par employé
    const congesParEmployeJour = new Map();
    conges.forEach(conge => {
      let currentDate = new Date(conge.dateDebut);
      const endDate = new Date(conge.dateFin);
      while (currentDate <= endDate) {
        const key = `${conge.userId}_${toLocalDateString(currentDate)}`;
        congesParEmployeJour.set(key, true);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Grouper les pointages par employé et jour
    const pointagesParEmployeJour = new Map();
    pointages.forEach(p => {
      const dateKey = toLocalDateString(p.horodatage);
      const key = `${p.userId}_${dateKey}`;
      if (!pointagesParEmployeJour.has(key)) {
        pointagesParEmployeJour.set(key, []);
      }
      pointagesParEmployeJour.get(key).push(p);
    });

    // Calculer les heures prévues et travaillées
    let totalHeuresPrevues = 0;
    let totalHeuresTravaillees = 0;

    shifts.forEach(shift => {
      const dateKey = toLocalDateString(shift.date);
      const congeKey = `${shift.employeId}_${dateKey}`;
      const isConge = congesParEmployeJour.has(congeKey);

      // Parser les segments
      let segments = shift.segments;
      if (typeof segments === 'string') {
        try {
          segments = JSON.parse(segments);
        } catch (e) {
          segments = [];
        }
      }
      if (!Array.isArray(segments)) segments = [];

      // Calculer les heures prévues (sauf si congé)
      if (!isConge) {
        segments.forEach(segment => {
          if (segment.start && segment.end && !segment.isExtra) {
            const segType = (segment.type || 'work').toLowerCase();
            if (segType === 'work' || segType === 'travail' || !segment.type) {
              const [sh, sm] = segment.start.split(':').map(Number);
              const [eh, em] = segment.end.split(':').map(Number);
              totalHeuresPrevues += (eh + em / 60) - (sh + sm / 60);
            }
          }
        });
      }

      // Calculer les heures travaillées
      const pointageKey = `${shift.employeId}_${dateKey}`;
      const pointagesJour = pointagesParEmployeJour.get(pointageKey) || [];
      if (pointagesJour.length >= 2) {
        // Calculer par paires entrée/sortie
        const sorted = pointagesJour.sort((a, b) => new Date(a.horodatage) - new Date(b.horodatage));
        for (let i = 0; i < sorted.length - 1; i += 2) {
          if (sorted[i] && sorted[i + 1]) {
            const diff = (new Date(sorted[i + 1].horodatage) - new Date(sorted[i].horodatage)) / (1000 * 60 * 60);
            totalHeuresTravaillees += diff;
          }
        }
      }
    });

    res.json({
      employesActifs,
      heuresPrevues: Math.round(totalHeuresPrevues * 100) / 100,
      heuresTravaillees: Math.round(totalHeuresTravaillees * 100) / 100,
      periode: { debut: dateDebut, fin: dateFin }
    });

  } catch (error) {
    console.error('❌ Erreur stats globales:', error);
    res.status(500).json({ message: 'Erreur lors du calcul des statistiques globales' });
  }
});

// 📊 Rapport DÉTAILLÉ jour par jour pour fiche navette
router.get('/employe/:employeId/rapport-detaille', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { employeId } = req.params;
    if (isNaN(parseInt(employeId))) return res.status(400).json({ error: 'ID employé invalide' });
    const { periode, mois } = req.query;

    // Valider l'employé
    const employe = await prisma.user.findUnique({
      where: { id: parseInt(employeId) },
      select: { id: true, email: true, nom: true, prenom: true, role: true }
    });

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    // Calculer les dates de la période
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

    // Récupérer tous les shifts (planning)
    const shifts = await prisma.shift.findMany({
      where: {
        employeId: parseInt(employeId),
        date: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { date: 'asc' }
    });

    // Récupérer tous les pointages
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: parseInt(employeId),
        horodatage: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { horodatage: 'asc' }
    });

    // Récupérer les congés
    const conges = await prisma.conge.findMany({
      where: {
        userId: parseInt(employeId),
        OR: [
          { dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } }
        ],
        statut: 'approuvé'
      },
      select: {
        id: true,
        type: true,
        dateDebut: true,
        dateFin: true
      }
    });

    // Grouper les pointages par jour
    const pointagesParJour = new Map();
    pointages.forEach(p => {
      const dateKey = toLocalDateString(p.horodatage);
      if (!pointagesParJour.has(dateKey)) {
        pointagesParJour.set(dateKey, []);
      }
      pointagesParJour.get(dateKey).push(p);
    });

    // Créer une map des congés par date
    const congesParJour = new Map();
    conges.forEach(conge => {
      let currentDate = new Date(conge.dateDebut);
      const endDate = new Date(conge.dateFin);
      
      while (currentDate <= endDate) {
        const dateKey = toLocalDateString(currentDate);
        congesParJour.set(dateKey, {
          type: conge.type,
          motif: conge.motif
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Construire le tableau détaillé jour par jour
    const detailsJours = [];
    const joursMap = new Map();

    // Analyser tous les jours de la période
    let currentDate = new Date(dateDebut);
    while (currentDate <= dateFin) {
      const dateKey = toLocalDateString(currentDate);
      const jourSemaine = currentDate.toLocaleDateString('fr-FR', { weekday: 'long' });
      
      const shift = shifts.find(s => toLocalDateString(s.date) === dateKey);
      const pointagesJour = pointagesParJour.get(dateKey) || [];
      const conge = congesParJour.get(dateKey);

      let heuresPrevues = 0;
      let heuresRealisees = 0;
      let ecart = 0;
      let statut = 'Non planifié';
      let retard = 0;
      let details = {};

      if (conge) {
        // Jour de congé - Utiliser la fonction de normalisation
        statut = normaliserTypeAbsence(conge.type);
        details = {
          type: 'congé',
          congeType: normaliserTypeAbsence(conge.type),
          motif: conge.motif || ''
        };
      } else if (shift) {
        // Parser les segments si c'est une string JSON
        let segments = shift.segments;
        if (typeof segments === 'string') {
          try {
            segments = JSON.parse(segments);
          } catch (e) {
            segments = [];
          }
        }
        if (!Array.isArray(segments)) segments = [];

        if (shift.type === 'travail' && segments.length > 0) {
          // Calculer heures prévues - UNIQUEMENT les segments de travail (pas les pauses)
          segments.forEach(segment => {
            if (segment.start && segment.end && !segment.isExtra) {
              // Ne compter que si c'est du travail (pas une pause)
              const segType = (segment.type || 'work').toLowerCase();
              if (segType === 'work' || segType === 'travail' || !segment.type) {
                heuresPrevues += calculateSegmentHours(segment);
              }
            }
          });

          // Calculer heures réalisées
          heuresRealisees = calculateRealHours(pointagesJour);

          // Calculer l'écart
          ecart = heuresRealisees - heuresPrevues;

          // Analyser le retard
          if (pointagesJour.length > 0 && segments.length > 0) {
            const premierSegment = segments[0];
            const retardInfo = analyserRetard(premierSegment, pointagesJour, shift.date);
            retard = retardInfo.retard;
          }

          // Définir le statut avec détails explicites
          let statutDetail = '';
          // Normaliser les types de pointage pour gérer les accents
          const normalizeType = (type) => type.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const isEntree = (p) => {
            const t = normalizeType(p.type);
            return t.includes('entree') || t.includes('arrivee') || t === 'entree' || t === 'arrivee';
          };
          
          if (pointagesJour.length === 0) {
            statut = 'Absence injustifiée';
            statutDetail = `Planifié ${segments[0]?.start || '?'}-${segments[segments.length-1]?.end || '?'}, aucun pointage`;
          } else if (pointagesJour.length % 2 !== 0) {
            statut = 'Pointage incomplet';
            statutDetail = `${pointagesJour.length} pointage(s) - manque ${pointagesJour.length % 2 === 1 ? 'sortie' : 'entrée'}`;
          } else if (retard > 0) {
            statut = `Retard (${retard} min)`;
            const premierPointage = pointagesJour.find(p => isEntree(p));
            const heureArrivee = premierPointage ? premierPointage.horodatage.toTimeString().slice(0, 5) : '?';
            const heurePrevue = segments[0]?.start || '?';
            statutDetail = `Arrivée ${heureArrivee} au lieu de ${heurePrevue}`;
          } else {
            statut = 'Présent';
            const premierPointage = pointagesJour.find(p => isEntree(p));
            const heureArrivee = premierPointage ? premierPointage.horodatage.toTimeString().slice(0, 5) : '?';
            statutDetail = `Arrivée ${heureArrivee}`;
          }

          // Calculer les heures par segment (travail vs pause)
          const workSegments = segments.filter(seg => seg.type === 'work' || !seg.type);
          const pauseSegments = segments.filter(seg => seg.type === 'pause' || seg.type === 'break');
          const heuresTravailPrevues = workSegments.reduce((acc, seg) => acc + calculateSegmentHours(seg), 0);
          const heuresPausePrevues = pauseSegments.reduce((acc, seg) => acc + calculateSegmentHours(seg), 0);

          // Affichage détaillé des segments de travail (ex: "09:00-12:00 / 13:00-17:00")
          const horairePlanifieDetaille = workSegments
            .map(seg => `${seg.start || '?'}-${seg.end || '?'}`)
            .join(' / ');

          details = {
            type: 'travail',
            horairePlanifie: horairePlanifieDetaille || '-',
            heuresTravailPrevues: Math.round(heuresTravailPrevues * 100) / 100,
            heuresPausePrevues: Math.round(heuresPausePrevues * 100) / 100,
            segments: segments.map(seg => ({
              debut: seg.start,
              fin: seg.end,
              type: seg.type || 'work',
              duree: calculateSegmentHours(seg)
            })),
            pointages: pointagesJour.map(p => ({
              type: p.type,
              heure: p.horodatage.toTimeString().slice(0, 5),
              horodatage: p.horodatage
            })),
            retard,
            statutDetail,
            commentaire: shift.commentaire || ''
          };
        } else if (shift.type === 'absence') {
          statut = normaliserTypeAbsence(shift.motif);
          details = {
            type: 'absence',
            motif: normaliserTypeAbsence(shift.motif)
          };
        }
      } else if (pointagesJour.length > 0) {
        // Pointages hors planning
        heuresRealisees = calculateRealHours(pointagesJour);
        ecart = heuresRealisees;
        statut = 'Hors planning';
        details = {
          type: 'hors_planning',
          pointages: pointagesJour.map(p => ({
            type: p.type,
            heure: p.horodatage.toTimeString().slice(0, 5),
            horodatage: p.horodatage
          }))
        };
      }

      detailsJours.push({
        date: dateKey,
        jourSemaine,
        heuresPrevues: Math.round(heuresPrevues * 100) / 100,
        heuresRealisees: Math.round(heuresRealisees * 100) / 100,
        ecart: Math.round(ecart * 100) / 100,
        statut,
        retard,
        // Nouveaux champs explicites
        horairePlanifie: details.horairePlanifie || null,
        statutDetail: details.statutDetail || null,
        heuresTravailPrevues: details.heuresTravailPrevues || heuresPrevues,
        details
      });

      joursMap.set(dateKey, {
        heuresPrevues,
        heuresRealisees,
        ecart,
        statut
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculer les synthèses par semaine
    const syntheseSemaines = [];
    let semaineActuelle = [];
    let currentWeek = null;

    detailsJours.forEach((jour, index) => {
      const date = new Date(jour.date);
      const numeroSemaine = getWeekNumber(date);
      
      if (currentWeek !== numeroSemaine) {
        if (semaineActuelle.length > 0) {
          syntheseSemaines.push(calculerSyntheseSemaine(semaineActuelle));
        }
        semaineActuelle = [];
        currentWeek = numeroSemaine;
      }
      
      semaineActuelle.push(jour);
      
      // Dernière semaine
      if (index === detailsJours.length - 1) {
        syntheseSemaines.push(calculerSyntheseSemaine(semaineActuelle));
      }
    });

    // Calculer les totaux mensuels
    const totalPrevues = detailsJours.reduce((sum, j) => sum + j.heuresPrevues, 0);
    const totalRealisees = detailsJours.reduce((sum, j) => sum + j.heuresRealisees, 0);
    const totalEcart = totalRealisees - totalPrevues;
    const totalRetards = detailsJours.filter(j => j.retard > 0).length;
    const totalMinutesRetard = detailsJours.reduce((sum, j) => sum + j.retard, 0);

    // Lister toutes les absences
    const listeAbsences = detailsJours
      .filter(j => j.statut !== 'Présent' && j.statut !== 'Non planifié' && !j.statut.includes('Retard'))
      .map(j => ({
        date: j.date,
        jourSemaine: j.jourSemaine,
        type: j.statut,
        details: j.details
      }));

    const rapport = {
      employe,
      periode: { 
        debut: dateDebut, 
        fin: dateFin, 
        type: periode,
        libelle: periode === 'mois' ? 
          `${dateDebut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}` :
          `${dateDebut.toLocaleDateString('fr-FR')} - ${dateFin.toLocaleDateString('fr-FR')}`
      },
      detailsJours,
      syntheseSemaines,
      totaux: {
        heuresPrevues: Math.round(totalPrevues * 100) / 100,
        heuresRealisees: Math.round(totalRealisees * 100) / 100,
        ecart: Math.round(totalEcart * 100) / 100,
        joursPlannifies: detailsJours.filter(j => j.heuresPrevues > 0).length,
        joursPresents: detailsJours.filter(j => j.heuresRealisees > 0).length,
        joursAbsents: listeAbsences.length,
        nombreRetards: totalRetards,
        minutesRetardTotal: totalMinutesRetard,
        heuresRetardTotal: Math.round((totalMinutesRetard / 60) * 100) / 100
      },
      absences: listeAbsences,
      conges: conges.map(c => ({
        type: c.type,
        debut: c.dateDebut,
        fin: c.dateFin,
        duree: Math.ceil((new Date(c.dateFin) - new Date(c.dateDebut)) / (1000 * 60 * 60 * 24)) + 1,
        motif: c.motif
      }))
    };

    res.json(rapport);

  } catch (error) {
    console.error('Erreur génération rapport détaillé:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Erreur lors de la génération du rapport détaillé'
    });
  }
});

// Fonctions utilitaires pour le rapport détaillé
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function calculerSyntheseSemaine(jours) {
  const premierJour = jours[0];
  const dernierJour = jours[jours.length - 1];
  
  const totalPrevues = jours.reduce((sum, j) => sum + j.heuresPrevues, 0);
  const totalRealisees = jours.reduce((sum, j) => sum + j.heuresRealisees, 0);
  const ecart = totalRealisees - totalPrevues;
  
  return {
    debut: premierJour.date,
    fin: dernierJour.date,
    numeroSemaine: getWeekNumber(new Date(premierJour.date)),
    heuresPrevues: Math.round(totalPrevues * 100) / 100,
    heuresRealisees: Math.round(totalRealisees * 100) / 100,
    ecart: Math.round(ecart * 100) / 100,
    joursPresents: jours.filter(j => j.heuresRealisees > 0).length,
    joursAbsents: jours.filter(j => j.statut !== 'Présent' && j.statut !== 'Non planifié' && !j.statut.includes('Retard')).length
  };
}

// 📊 Rapport détaillé d'un employé pour une période
router.get('/employe/:employeId/rapport', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { employeId } = req.params;
    if (isNaN(parseInt(employeId))) return res.status(400).json({ error: 'ID employé invalide' });
    const { periode, mois } = req.query;

    // Valider l'employé
    const employe = await prisma.user.findUnique({
      where: { id: parseInt(employeId) },
      select: { id: true, email: true, nom: true, prenom: true, role: true }
    });

    if (!employe) {
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

    // Récupérer les congés approuvés pour exclure ces jours du calcul
    const conges = await prisma.conge.findMany({
      where: {
        userId: parseInt(employeId),
        OR: [
          { dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } }
        ],
        statut: 'approuvé'
      },
      select: { dateDebut: true, dateFin: true, type: true }
    });

    // Créer une map des jours de congé
    const congesParJour = new Map();
    conges.forEach(conge => {
      let currentDate = new Date(conge.dateDebut);
      const endDate = new Date(conge.dateFin);
      while (currentDate <= endDate) {
        const dateKey = toLocalDateString(currentDate);
        congesParJour.set(dateKey, { type: conge.type });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

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
      const dateKey = toLocalDateString(p.horodatage);
      if (!pointagesParJour.has(dateKey)) {
        pointagesParJour.set(dateKey, []);
      }
      pointagesParJour.get(dateKey).push(p);
    });

    // Traiter chaque shift
    shifts.forEach(shift => {
      const dateKey = toLocalDateString(shift.date);
      const pointagesJour = pointagesParJour.get(dateKey) || [];

      // Vérifier si ce jour est un jour de congé approuvé - si oui, ignorer le shift pour les heures prévues
      const isConge = congesParJour.has(dateKey);

      // Parser les segments si c'est une string JSON
      let segments = shift.segments;
      if (typeof segments === 'string') {
        try {
          segments = JSON.parse(segments);
        } catch (e) {
          segments = [];
        }
      }
      if (!Array.isArray(segments)) segments = [];

      let heuresPrevuesJour = 0;
      let heuresTravailleesJour = 0;

      if (shift.type === 'travail' && segments.length > 0 && !isConge) {
        // Calculer les heures prévues - UNIQUEMENT les segments de travail (pas les pauses)
        // Ne pas compter si c'est un jour de congé
        segments.forEach(segment => {
          if (segment.start && segment.end && !segment.isExtra) {
            // Ne compter que si c'est du travail (pas une pause)
            const segType = (segment.type || 'work').toLowerCase();
            if (segType === 'work' || segType === 'travail' || !segment.type) {
              heuresPrevuesJour += calculateSegmentHours(segment);
            }
          }
          if (segment.isExtra) {
            heuresSupplementaires += calculateSegmentHours(segment);
          }
        });

        // Calculer les heures travaillées réelles
        heuresTravailleesJour = calculateRealHours(pointagesJour);

        // Analyser les retards
        if (pointagesJour.length > 0) {
          segments.forEach((segment, index) => {
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
        motif: shift.motif,
        isConge: isConge // Marquer si c'est un jour de congé
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

    // Ajouter les congés approuvés (table Conge) aux absences justifiées
    // (seulement les jours qui n'ont pas déjà été comptés comme shift d'absence)
    const joursDejaComptes = new Set(
      shifts.filter(s => s.type === 'absence').map(s => toLocalDateString(s.date))
    );
    congesParJour.forEach((conge, dateKey) => {
      if (!joursDejaComptes.has(dateKey)) {
        absencesJustifiees++;
      }
    });

    // Calculer le taux de ponctualité (jours uniques avec retard)
    // Exclure les jours de congé du calcul
    const joursAvecRetard = new Set(retards.map(r => r.date)).size;
    const joursPresentsRapport = heuresParJour.filter(h => h.travaillees > 0 && !h.isConge).length;
    const tauxPonctualiteRapport = joursPresentsRapport > 0 
      ? Math.round(((joursPresentsRapport - joursAvecRetard) / joursPresentsRapport) * 100)
      : 100;

    const rapport = {
      employe,
      periode: { debut: dateDebut, fin: dateFin, type: periode },
      heuresPrevues: Math.round(heuresPrevues * 100) / 100,
      heuresTravaillees: Math.round(heuresTravaillees * 100) / 100,
      heuresSupplementaires: 0, // Vraies heures supp légales (non calculées pour l'instant)
      heuresExtra: Math.round(heuresSupplementaires * 100) / 100, // Heures extra (shifts extra, payées en cash),
      absencesJustifiees,
      absencesInjustifiees,
      nombreRetards: joursAvecRetard, // Nombre de JOURS avec retard (pas nombre de retards)
      tauxPonctualite: tauxPonctualiteRapport,
      retards,
      heuresParJour,
      statistiques: {
        joursTravailles: heuresParJour.filter(h => h.travaillees > 0).length,
        joursAbsents: absencesJustifiees + absencesInjustifiees,
        moyenneHeuresJour: heuresParJour.length > 0 ? Math.round((heuresTravaillees / heuresParJour.filter(h => h.travaillees > 0).length) * 100) / 100 : 0
      }
    };

    res.json(rapport);

  } catch (error) {
    console.error('❌ [STATS DEBUG] Erreur génération rapport employé:', error);
    console.error('❌ [STATS DEBUG] Stack:', error.stack);
    res.status(500).json({ 
      message: 'Erreur lors de la génération du rapport'
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
  
  // 🌙 RESTAURANT : Gérer le passage à minuit (ex: 19:00 → 00:30 = 5.5h)
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60;
  }
  
  return Math.round((diffMinutes / 60) * 100) / 100;
}

function calculateRealHours(pointages) {
  // ✅ CORRIGÉ: Utiliser le helper centralisé qui gère TOUTES les variantes de types
  return calculerHeuresReelles(pointages);
}

function analyserRetard(segment, pointagesJour, dateShift) {
  // ✅ CORRIGÉ: Utiliser le helper centralisé pour trouver la première entrée
  const premiereArrivee = trouverPremiereEntree(pointagesJour);
  
  if (!premiereArrivee) {
    return { retard: 0, heureArrivee: null, heurePrevue: segment.start };
  }

  // Convertir l'heure prévue en minutes
  const [prevuH, prevuM] = segment.start.split(':').map(Number);
  const minutesPrevues = prevuH * 60 + prevuM;

  // Convertir l'heure réelle en minutes - Utiliser l'heure locale
  const heureArrivee = new Date(premiereArrivee.horodatage);
  // Utiliser getHours/getMinutes pour l'heure locale (pas UTC)
  const minutesReelles = heureArrivee.getHours() * 60 + heureArrivee.getMinutes();

  // Calculer le retard (en minutes)
  let retardMinutes = minutesReelles - minutesPrevues;

  // Gérer le passage à minuit (travail de nuit)
  if (retardMinutes < -12 * 60) {
    retardMinutes += 24 * 60;
  }

  const heureArriveeStr = heureArrivee.toTimeString().slice(0, 5); // Format HH:MM local

  return {
    retard: Math.max(0, retardMinutes),
    heureArrivee: heureArriveeStr,
    heurePrevue: segment.start,
    detail: retardMinutes > 0 ? `Arrivée ${heureArriveeStr} au lieu de ${segment.start} (+${retardMinutes} min)` : `À l'heure (${heureArriveeStr})`
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
    if (isNaN(parseInt(employeId))) return res.status(400).json({ error: 'ID employé invalide' });
    const { periode, mois, format = 'csv' } = req.query;

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

    // Récupérer les congés approuvés pour exclure ces jours du calcul des heures prévues
    const conges = await prisma.conge.findMany({
      where: {
        userId: parseInt(employeId),
        OR: [
          { dateDebut: { lte: dateFin }, dateFin: { gte: dateDebut } }
        ],
        statut: 'approuvé'
      }
    });

    // Créer une map des jours de congé
    const congesParJour = new Map();
    conges.forEach(conge => {
      let currentDate = new Date(conge.dateDebut);
      const endDate = new Date(conge.dateFin);
      while (currentDate <= endDate) {
        const dateKey = toLocalDateString(currentDate);
        congesParJour.set(dateKey, { type: conge.type });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Générer le CSV
    const csvLines = [];
    
    // En-tête
    csvLines.push('Date,Heures Prévues,Heures Travaillées,Écart,Type,Motif');
    
    // Traitement simplifié des données
    const pointagesParJour = new Map();
    pointages.forEach(p => {
      const dateKey = toLocalDateString(p.horodatage);
      if (!pointagesParJour.has(dateKey)) {
        pointagesParJour.set(dateKey, []);
      }
      pointagesParJour.get(dateKey).push(p);
    });

    let totalPrevues = 0;
    let totalTravaillees = 0;

    shifts.forEach(shift => {
      const dateKey = toLocalDateString(shift.date);
      const pointagesJour = pointagesParJour.get(dateKey) || [];
      const isConge = congesParJour.has(dateKey);

      let heuresPrevuesJour = 0;
      let heuresTravailleesJour = 0;

      // Parser les segments si c'est une string JSON
      let segments = shift.segments;
      if (typeof segments === 'string') {
        try {
          segments = JSON.parse(segments);
        } catch (e) {
          segments = [];
        }
      }
      if (!Array.isArray(segments)) segments = [];

      // Si c'est un jour de congé approuvé, ne pas compter les heures prévues
      if (shift.type === 'travail' && segments.length > 0 && !isConge) {
        // UNIQUEMENT les segments de travail (pas les pauses)
        segments.forEach(segment => {
          if (segment.start && segment.end && !segment.isExtra) {
            const segType = (segment.type || 'work').toLowerCase();
            if (segType === 'work' || segType === 'travail' || !segment.type) {
              heuresPrevuesJour += calculateSegmentHours(segment);
            }
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
    csvLines.push(`Période,${toLocalDateString(dateDebut)} à ${toLocalDateString(dateFin)}`);
    csvLines.push(`Heures Prévues Total,${totalPrevues.toFixed(2)}`);
    csvLines.push(`Heures Travaillées Total,${totalTravaillees.toFixed(2)}`);
    csvLines.push(`Écart Total,${(totalTravaillees - totalPrevues).toFixed(2)}`);

    // Calculer les heures par jour d'abord pour détecter les jours présents
    const heuresParJourMap = new Map();
    shifts.forEach(shift => {
      const dateKey = toLocalDateString(shift.date);
      const isConge = congesParJour.has(dateKey); // Vérifier si c'est un jour de congé
      
      // Parser les segments si c'est une string JSON
      let segments = shift.segments;
      if (typeof segments === 'string') {
        try {
          segments = JSON.parse(segments);
        } catch (e) {
          segments = [];
        }
      }
      if (!Array.isArray(segments)) segments = [];

      // Ne pas inclure les jours de congé dans le calcul de présence/retards
      if (shift.type === 'travail' && segments.length > 0 && !isConge) {
        const pointagesJour = pointagesParJour.get(dateKey) || [];
        const heuresTravailleesJour = calculateRealHours(pointagesJour);
        heuresParJourMap.set(dateKey, {
          heures: heuresTravailleesJour,
          pointages: pointagesJour,
          segments: segments // segments déjà parsés
        });
      }
    });

    // Calculer les retards pour chaque jour avec heures travaillées > 0
    // Utiliser un Set pour compter les jours UNIQUES avec retard (comme le rapport API)
    const joursAvecRetardSet = new Set();
    let joursPresents = 0;
    
    heuresParJourMap.forEach((data, dateKey) => {
      // Considérer présent si heures travaillées > 0 (cohérent avec frontend)
      if (data.heures > 0) {
        joursPresents++;
        
        // Analyser le retard sur TOUS les segments (comme le rapport API)
        if (data.pointages.length > 0) {
          data.segments.forEach(segment => {
            if (segment.start && segment.end && !segment.isExtra) {
              const retardInfo = analyserRetard(segment, data.pointages, dateKey);
              if (retardInfo.retard > 0) {
                joursAvecRetardSet.add(dateKey); // Ajouter au Set (dédupliqué automatiquement)
              }
            }
          });
        }
      }
    });

    const nombreRetards = joursAvecRetardSet.size; // Nombre de JOURS uniques avec retard

    // Calculer le taux de ponctualité
    const tauxPonctualite = joursPresents > 0 
      ? Math.round(((joursPresents - nombreRetards) / joursPresents) * 100)
      : 100;

    // Préparer les données complètes du rapport
    // Construire heuresParJour pour TOUS les jours de la période (pas seulement les shifts)
    const heuresParJourData = [];
    let currentDateLoop = new Date(dateDebut);
    
    while (currentDateLoop <= dateFin) {
      const dateKey = toLocalDateString(currentDateLoop);
      const shift = shifts.find(s => toLocalDateString(s.date) === dateKey);
      const pointagesJour = pointagesParJour.get(dateKey) || [];
      const isConge = congesParJour.has(dateKey);
      const congeInfo = congesParJour.get(dateKey);
      
      let heuresPrevuesJour = 0;
      let heuresTravailleesJour = 0;
      let statut = 'Repos'; // Par défaut si pas de shift
      
      if (shift) {
        // Parser les segments si c'est une string JSON
        let segments = shift.segments;
        if (typeof segments === 'string') {
          try {
            segments = JSON.parse(segments);
          } catch (e) {
            segments = [];
          }
        }
        if (!Array.isArray(segments)) segments = [];
        
        if (isConge) {
          // Jour de congé approuvé
          statut = normaliserTypeAbsence(congeInfo?.type || 'Congé');
          heuresTravailleesJour = calculateRealHours(pointagesJour); // Au cas où il y aurait des pointages
        } else if (shift.type === 'absence') {
          // Shift de type absence (maladie, congé, etc.)
          statut = normaliserTypeAbsence(shift.motif || 'Absence');
        } else if (shift.type === 'repos') {
          statut = 'Repos';
        } else if (shift.type === 'travail' && segments.length > 0) {
          // Jour de travail planifié
          // Calculer heures prévues - UNIQUEMENT les segments de travail (pas les pauses)
          segments.forEach(segment => {
            if (segment.start && segment.end && !segment.isExtra) {
              const segType = (segment.type || 'work').toLowerCase();
              if (segType === 'work' || segType === 'travail' || !segment.type) {
                heuresPrevuesJour += calculateSegmentHours(segment);
              }
            }
          });
          heuresTravailleesJour = calculateRealHours(pointagesJour);
          
          // Déterminer le statut
          if (heuresTravailleesJour > 0) {
            statut = 'Présent';
          } else if (pointagesJour.length === 0) {
            statut = 'Absence';
          } else {
            statut = 'Incomplet';
          }
        }
      } else if (isConge) {
        // Pas de shift mais congé approuvé
        statut = normaliserTypeAbsence(congeInfo?.type || 'Congé');
      } else if (pointagesJour.length > 0) {
        // Pointages sans planning
        heuresTravailleesJour = calculateRealHours(pointagesJour);
        statut = 'Hors planning';
      }
      // Sinon reste 'Repos' par défaut
      
      heuresParJourData.push({
        jour: dateKey,
        date: new Date(currentDateLoop),
        prevues: Math.round(heuresPrevuesJour * 100) / 100,
        travaillees: Math.round(heuresTravailleesJour * 100) / 100,
        type: shift?.type || 'repos',
        motif: shift?.motif || null,
        isConge: isConge,
        statut: statut
      });
      
      currentDateLoop.setDate(currentDateLoop.getDate() + 1);
    }

    const rapportComplet = {
      heuresPrevues: totalPrevues,
      heuresTravaillees: totalTravaillees,
      heuresSupplementaires: 0,
      absencesJustifiees: shifts.filter(s => s.type === 'absence' && (s.motif?.toLowerCase().includes('congé') || s.motif?.toLowerCase().includes('rtt') || s.motif?.toLowerCase().includes('maladie'))).length + congesParJour.size,
      absencesInjustifiees: shifts.filter(s => s.type === 'absence' && !(s.motif?.toLowerCase().includes('congé') || s.motif?.toLowerCase().includes('rtt') || s.motif?.toLowerCase().includes('maladie'))).length,
      nombreRetards: nombreRetards,
      tauxPonctualite: tauxPonctualite,
      heuresParJour: heuresParJourData,
      statistiques: {
        joursTravailles: heuresParJourData.filter(h => h.statut === 'Présent').length,
        joursAbsents: heuresParJourData.filter(h => h.statut.includes('Congé') || h.statut === 'RTT' || h.statut.includes('Maladie') || h.statut === 'Absence').length,
        joursRepos: heuresParJourData.filter(h => h.statut === 'Repos').length,
        joursPresents: joursPresents,
        moyenneHeuresJour: joursPresents > 0 ? totalTravaillees / joursPresents : 0
      }
    };

    // Format de sortie selon le paramètre
    if (format === 'pdf') {
      try {
        const pdfBuffer = await generateEmployeePDF(employe, rapportComplet, periode, dateDebut, dateFin);
        
        const fileName = `rapport_${employe.nom}_${employe.prenom}_${periode}_${getCurrentDateString()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return res.send(pdfBuffer);
      } catch (pdfError) {
        console.error('❌ Erreur génération PDF:', pdfError);
        return res.status(500).json({ 
          message: 'Erreur lors de la génération du PDF'
        });
      }
    } else if (format === 'json') {
      // Retourner les données en JSON
      const jsonData = {
        employe: {
          nom: employe.nom,
          prenom: employe.prenom,
          email: employe.email
        },
        periode: {
          type: periode,
          debut: dateDebut.toISOString(),
          fin: dateFin.toISOString()
        },
        donnees: shiftsEmploye.map(shift => {
          const dateKey = toLocalDateString(shift.date);
          const pointagesJour = pointagesParJour.get(dateKey) || [];
          
          // Parser les segments
          let segments = shift.segments;
          if (typeof segments === 'string') {
            try { segments = JSON.parse(segments); } catch (e) { segments = []; }
          }
          if (!Array.isArray(segments)) segments = [];
          
          let heuresPrevuesJour = 0;
          let heuresTravailleesJour = 0;
          
          if (shift.type === 'travail' && segments.length > 0) {
            // UNIQUEMENT les segments de travail (pas les pauses)
            segments.forEach(segment => {
              if (segment.start && segment.end && !segment.isExtra) {
                const segType = (segment.type || 'work').toLowerCase();
                if (segType === 'work' || segType === 'travail' || !segment.type) {
                  heuresPrevuesJour += calculateSegmentHours(segment);
                }
              }
            });
            heuresTravailleesJour = calculateRealHours(pointagesJour);
          }
          
          return {
            date: dateKey,
            heuresPrevues: heuresPrevuesJour.toFixed(2),
            heuresTravaillees: heuresTravailleesJour.toFixed(2),
            ecart: (heuresTravailleesJour - heuresPrevuesJour).toFixed(2),
            type: shift.type,
            motif: shift.motif || null
          };
        }),
        resume: {
          totalPrevues: totalPrevues.toFixed(2),
          totalTravaillees: totalTravaillees.toFixed(2),
          ecartTotal: (totalTravaillees - totalPrevues).toFixed(2)
        },
        genere: new Date().toISOString()
      };
      
      const fileName = `rapport_${employe.nom}_${employe.prenom}_${periode}_${getCurrentDateString()}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.json(jsonData);
    } else if (format === 'pdf') {
      // TODO: Implémenter la génération PDF (nécessite une lib comme pdfkit ou puppeteer)
      return res.status(501).json({ 
        message: 'Export PDF en cours de développement',
        alternative: 'Utilisez le format CSV en attendant'
      });
    } else {
      // Format CSV par défaut
      const csvContent = csvLines.join('\n');
      const fileName = `rapport_${employe.nom}_${employe.prenom}_${periode}_${getCurrentDateString()}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send('\ufeff' + csvContent); // UTF-8 BOM pour Excel
    }

  } catch (error) {
    console.error('❌ Erreur export rapport employé:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'export du rapport'
    });
  }
});

// 📊 Export global de tous les rapports d'heures (Excel/CSV)
router.get('/rapports/export-all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { periode, mois, format = 'csv' } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '');

    // Calculer les dates de la période
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

    // Calculer le mois et l'année pour récupérer les justificatifs Navigo
    const moisPeriode = dateDebut.getMonth() + 1; // 1-12
    const anneePeriode = dateDebut.getFullYear();

    // Récupérer tous les employés actifs (en service)
    const employes = await prisma.user.findMany({
      where: {
        role: 'employee', // Uniquement les employés (pas managers, ni admins)
        statut: 'actif', // Uniquement les employés en service
        OR: [
          { dateSortie: null }, // Pas encore parti
          { dateSortie: { gt: dateFin } } // Ou parti après la fin de la période
        ]
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        statut: true,
        dateSortie: true,
        justificatifNavigo: true, // Ancien système (pour compatibilité)
        eligibleNavigo: true,
        justificatifsNavigo: {
          where: {
            mois: moisPeriode,
            annee: anneePeriode,
            statut: 'valide' // Uniquement les justificatifs validés
          },
          select: {
            id: true,
            fichier: true,
            fichierNom: true,
            dateUpload: true,
            dateValidation: true
          }
        }
      },
      orderBy: [
        { nom: 'asc' },
        { prenom: 'asc' }
      ]
    });

    // Récupérer tous les shifts de la période
    const shifts = await prisma.shift.findMany({
      where: {
        date: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { date: 'asc' }
    });

    // Récupérer tous les pointages de la période
    const pointages = await prisma.pointage.findMany({
      where: {
        horodatage: { gte: dateDebut, lte: dateFin }
      },
      orderBy: { horodatage: 'asc' }
    });

    // Récupérer tous les congés approuvés de la période pour avoir les types d'absences
    const conges = await prisma.conge.findMany({
      where: {
        statut: 'approuvé',
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

    // Grouper par employé
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

    // Traiter les données de chaque employé
    const rapportsEmployes = [];

    for (const employe of employes) {
      const shiftsEmploye = shiftsParEmploye.get(employe.id) || [];
      const pointagesEmploye = pointagesParEmploye.get(employe.id) || [];
      const congesEmploye = congesParEmploye.get(employe.id) || [];

      // Créer un map des congés par jour pour avoir le type
      const congesParJour = new Map();
      congesEmploye.forEach(conge => {
        const debut = new Date(conge.dateDebut);
        const fin = new Date(conge.dateFin);
        const currentDate = new Date(debut);
        
        while (currentDate <= fin) {
          const dateKey = toLocalDateString(currentDate);
          congesParJour.set(dateKey, {
            type: conge.type
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      // Grouper les pointages par jour
      const pointagesParJour = new Map();
      pointagesEmploye.forEach(p => {
        const dateKey = toLocalDateString(p.horodatage);
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
      const joursAvecRetard = new Set(); // Utiliser un Set pour compter les JOURS avec retard (pas les segments)
      const heuresParJour = []; // Pour le détail jour par jour avec type de congé
      const joursTraites = new Set(); // Pour éviter de traiter 2 fois le même jour

      // Traiter chaque shift
      shiftsEmploye.forEach(shift => {
        const dateKey = toLocalDateString(shift.date);
        joursTraites.add(dateKey);
        const pointagesJour = pointagesParJour.get(dateKey) || [];
        const congeJour = congesParJour.get(dateKey);

        // Parser les segments
        let segments = shift.segments;
        if (typeof segments === 'string') {
          try { segments = JSON.parse(segments); } catch (e) { segments = []; }
        }
        if (!Array.isArray(segments)) segments = [];

        if (shift.type === 'travail' && segments.length > 0) {
          let heuresPrevuesJour = 0;
          segments.forEach(segment => {
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

          // Ajouter les détails du jour
          heuresParJour.push({
            jour: shift.date,
            type: 'travail',
            heuresPrevues: heuresPrevuesJour,
            heuresTravaillees: heuresTravailleesJour
          });

          // Compter les retards PAR JOUR (pas par segment)
          if (pointagesJour.length > 0) {
            segments.forEach(segment => {
              if (segment.start && segment.end && !segment.isExtra) {
                const retardInfo = analyserRetard(segment, pointagesJour, shift.date);
                if (retardInfo.retard > 0) {
                  joursAvecRetard.add(dateKey); // Marquer le JOUR comme ayant un retard
                }
              }
            });
          }
        } else if (shift.type === 'absence') {
          const motif = shift.motif || '';
          const motifLower = motif.toLowerCase();
          let heuresPrevuesJour = 7; // Défaut 7h pour une journée

          if (motifLower.includes('congé') || motifLower.includes('rtt') || motifLower.includes('maladie')) {
            absencesJustifiees++;
          } else {
            absencesInjustifiees++;
          }

          // Ajouter les détails du jour avec le type de congé depuis le motif du shift
          heuresParJour.push({
            jour: shift.date,
            type: 'absence',
            heuresPrevues: heuresPrevuesJour,
            heuresTravaillees: 0,
            details: motif ? {
              type: 'congé',
              congeType: motif // Le motif contient le type de congé (créé par l'auto-création)
            } : (congeJour ? {
              type: 'congé',
              congeType: congeJour.type // Fallback: map des congés
            } : undefined)
          });
        }
      });

      // 🔄 FALLBACK: Ajouter les jours de congés qui n'ont PAS de shift planifié
      // (Pour les anciens congés approuvés avant la mise en place de l'auto-création)
      congesParJour.forEach((congeInfo, dateKey) => {
        if (!joursTraites.has(dateKey)) {
          // Ce jour a un congé approuvé mais aucun shift planifié
          const dateJour = new Date(dateKey + 'T12:00:00.000Z');
          
          // Vérifier que c'est dans la période
          if (dateJour >= dateDebut && dateJour <= dateFin) {
            absencesJustifiees++;
            
            heuresParJour.push({
              jour: dateJour,
              type: 'absence',
              heuresPrevues: 7, // Journée standard
              heuresTravaillees: 0,
              details: {
                type: 'congé',
                congeType: congeInfo.type
              }
            });
          }
        }
      });

      const joursTravailles = shiftsEmploye.filter(s => s.type === 'travail').length;
      const joursPresents = pointagesParJour.size;
      const nombreJoursAvecRetard = joursAvecRetard.size; // Nombre de JOURS avec au moins un retard

      rapportsEmployes.push({
        nom: employe.nom,
        prenom: employe.prenom,
        email: employe.email,
        role: employe.role,
        heuresPrevues: Math.round(heuresPrevues * 100) / 100,
        heuresTravaillees: Math.round(heuresTravaillees * 100) / 100,
        heuresSupplementaires: 0, // Vraies heures supp légales (non calculées)
        heuresExtra: Math.round(heuresSupplementaires * 100) / 100, // Heures extra (shifts extra, cash),
        heuresManquantes: Math.max(0, Math.round((heuresPrevues - heuresTravaillees) * 100) / 100),
        absencesJustifiees,
        absencesInjustifiees,
        nombreRetards: nombreJoursAvecRetard, // Nombre de JOURS avec retard (pas de segments)
        joursPlanifies: joursTravailles,
        joursPresents,
        tauxPresence: Math.min(100, joursTravailles > 0 ? Math.round((joursPresents / joursTravailles) * 100) : 0),
        tauxPonctualite: joursPresents > 0 ? Math.round(((joursPresents - nombreJoursAvecRetard) / joursPresents) * 100) : 100,
        moyenneHeuresJour: joursPresents > 0 ? Math.round((heuresTravaillees / joursPresents) * 100) / 100 : 0,
        heuresParJour: heuresParJour, // Ajouter le détail jour par jour avec types de congé
        // Données Navigo pour l'export Excel
        eligibleNavigo: employe.eligibleNavigo,
        justificatifNavigo: employe.justificatifNavigo, // Ancien système
        justificatifsNavigo: employe.justificatifsNavigo // Nouveau système (validés ce mois)
      });
    }

    // Générer le fichier selon le format
    if (format === 'excel') {
      try {
        const excelBuffer = await generateAllEmployeesExcel(rapportsEmployes, periode, dateDebut, dateFin, token);
        
        const fileName = `rapport_heures_tous_employes_${periode}_${getCurrentDateString()}.${excelBuffer.extension}`;
        res.setHeader('Content-Type', excelBuffer.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return res.send(excelBuffer);
      } catch (excelError) {
        console.error('❌ Erreur génération Excel:', excelError);
        return res.status(500).json({ 
          message: 'Erreur lors de la génération du fichier Excel'
        });
      }
    } else if (format === 'excel' || format === 'xlsx') {
      // Format Excel avec images Navigo intégrées
      const excelBuffer = await generateAllEmployeesExcel(rapportsEmployes, periode, dateDebut, dateFin, token);
      
      const dateDebutStr = dateDebut.toLocaleDateString('fr-FR').replace(/\//g, '-');
      const dateFinStr = dateFin.toLocaleDateString('fr-FR').replace(/\//g, '-');
      const fileName = `Rapport_Heures_Navigo_${periode}_du_${dateDebutStr}_au_${dateFinStr}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(excelBuffer);
    } else if (format === 'csv') {
      const csvLines = [];
      
      // En-tête du document
      csvLines.push(`RAPPORT D'HEURES - TOUS LES EMPLOYÉS`);
      csvLines.push(`Période: ${dateDebut.toLocaleDateString('fr-FR')} au ${dateFin.toLocaleDateString('fr-FR')}`);
      csvLines.push(`Généré le: ${new Date().toLocaleString('fr-FR')}`);
      csvLines.push('');
      
      // En-tête des colonnes
      csvLines.push([
        'Nom',
        'Prénom',
        'Email',
        'Rôle',
        'Heures Prévues',
        'Heures Travaillées',
        'Heures Extra',
        'Heures Manquantes',
        'Absences Justifiées',
        'Absences Injustifiées',
        'Nombre de Retards',
        'Jours Planifiés',
        'Jours Présents',
        'Taux de Présence (%)',
        'Taux de Ponctualité (%)',
        'Moyenne h/jour'
      ].join(','));
      
      // Données des employés
      rapportsEmployes.forEach(emp => {
        csvLines.push([
          emp.nom,
          emp.prenom,
          emp.email,
          emp.role,
          emp.heuresPrevues,
          emp.heuresTravaillees,
          emp.heuresExtra || 0,
          emp.heuresManquantes,
          emp.absencesJustifiees,
          emp.absencesInjustifiees,
          emp.nombreRetards,
          emp.joursPlanifies,
          emp.joursPresents,
          emp.tauxPresence,
          emp.tauxPonctualite,
          emp.moyenneHeuresJour
        ].join(','));
      });
      
      // Ligne de séparation
      csvLines.push('');
      
      // Totaux et moyennes
      const totaux = {
        heuresPrevues: rapportsEmployes.reduce((sum, e) => sum + e.heuresPrevues, 0),
        heuresTravaillees: rapportsEmployes.reduce((sum, e) => sum + e.heuresTravaillees, 0),
        heuresExtra: rapportsEmployes.reduce((sum, e) => sum + (e.heuresExtra || 0), 0),
        heuresManquantes: rapportsEmployes.reduce((sum, e) => sum + e.heuresManquantes, 0),
        absencesJustifiees: rapportsEmployes.reduce((sum, e) => sum + e.absencesJustifiees, 0),
        absencesInjustifiees: rapportsEmployes.reduce((sum, e) => sum + e.absencesInjustifiees, 0),
        nombreRetards: rapportsEmployes.reduce((sum, e) => sum + e.nombreRetards, 0)
      };

      csvLines.push('TOTAUX');
      csvLines.push(`Employés,,${employes.length}`);
      csvLines.push(`Heures Prévues,,${totaux.heuresPrevues.toFixed(2)}`);
      csvLines.push(`Heures Travaillées,,${totaux.heuresTravaillees.toFixed(2)}`);
      csvLines.push(`Heures Extra,,${totaux.heuresExtra.toFixed(2)}`);
      csvLines.push(`Heures Manquantes,,${totaux.heuresManquantes.toFixed(2)}`);
      csvLines.push(`Absences Justifiées,,${totaux.absencesJustifiees}`);
      csvLines.push(`Absences Injustifiées,,${totaux.absencesInjustifiees}`);
      csvLines.push(`Retards Total,,${totaux.nombreRetards}`);
      csvLines.push('');
      csvLines.push('MOYENNES');
      csvLines.push(`Taux de Présence Moyen,,${(rapportsEmployes.reduce((sum, e) => sum + e.tauxPresence, 0) / employes.length).toFixed(1)}%`);
      csvLines.push(`Taux de Ponctualité Moyen,,${(rapportsEmployes.reduce((sum, e) => sum + e.tauxPonctualite, 0) / employes.length).toFixed(1)}%`);
      csvLines.push(`Moyenne h/jour (équipe),,${(totaux.heuresTravaillees / rapportsEmployes.reduce((sum, e) => sum + e.joursPresents, 0)).toFixed(2)}`);

      const csvContent = csvLines.join('\n');
      const fileName = `rapport_heures_tous_employes_${periode}_${getCurrentDateString()}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send('\ufeff' + csvContent); // UTF-8 BOM pour Excel
    } else {
      // Format JSON pour usage API
      res.json({
        periode: { debut: dateDebut, fin: dateFin, type: periode },
        genere: new Date().toISOString(),
        nombreEmployes: employes.length,
        rapports: rapportsEmployes
      });
    }

  } catch (error) {
    console.error('❌ Erreur export global rapports:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ 
      message: 'Erreur lors de l\'export global des rapports'
    });
  }
});

// 📦 Export ZIP avec Excel + justificatifs Navigo
router.get('/rapports/export-pdf', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { periode, mois } = req.query;
    const { generateRapportExcelZIP } = require('../utils/excelZipUtils');

    // [Même logique de calcul des dates et récupération des données que export-all]
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

    // Extraire mois/année de la période pour les justificatifs Navigo
    const moisPeriode = dateDebut.getMonth() + 1; // 1-12
    const anneePeriode = dateDebut.getFullYear();

    // Récupérer les employés et leurs données + justificatifs Navigo du mois
    const employes = await prisma.user.findMany({
      where: {
        role: 'employee',
        statut: 'actif',
        OR: [
          { dateSortie: null },
          { dateSortie: { gt: dateFin } }
        ]
      },
      select: {
        id: true, email: true, nom: true, prenom: true,
        justificatifNavigo: true, eligibleNavigo: true,
        // Récupérer les justificatifs Navigo mensuels pour ce mois
        justificatifsNavigo: {
          where: {
            mois: moisPeriode,
            annee: anneePeriode,
            statut: 'valide' // Seulement les validés
          },
          select: {
            fichier: true,
            dateUpload: true,
            mois: true,
            annee: true
          }
        }
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }]
    });

    // Calculer les rapports (logique simplifiée pour le PDF)
    const rapportsEmployes = await Promise.all(employes.map(async (employe) => {
      // Récupérer shifts, pointages, congés pour cet employé
      const shifts = await prisma.shift.findMany({
        where: { employeId: employe.id, date: { gte: dateDebut, lte: dateFin } }
      });

      const pointages = await prisma.pointage.findMany({
        where: { userId: employe.id, horodatage: { gte: dateDebut, lte: dateFin } },
        orderBy: { horodatage: 'asc' }
      });

      const conges = await prisma.conge.findMany({
        where: {
          userId: employe.id,
          statut: 'approuvé',
          dateDebut: { lte: dateFin },
          dateFin: { gte: dateDebut }
        }
      });

      // Calculer heures et absences (logique simplifiée)
      let heuresTravaillees = 0;
      const joursAvecPointage = new Set();

      pointages.forEach(p => {
        const dateStr = toLocalDateString(p.horodatage);
        joursAvecPointage.add(dateStr);
      });

      shifts.forEach(shift => {
        const dateStr = toLocalDateString(shift.date);
        if (joursAvecPointage.has(dateStr)) {
          const debut = new Date(`1970-01-01T${shift.heureDebut}`);
          const fin = new Date(`1970-01-01T${shift.heureFin}`);
          heuresTravaillees += (fin - debut) / (1000 * 60 * 60);
        }
      });

      // Fonction helper pour extraire les dates d'un congé
      const extraireDates = (conge) => {
        const dates = [];
        const debut = new Date(conge.dateDebut);
        const fin = new Date(conge.dateFin);
        for (let d = new Date(debut); d <= fin; d.setDate(d.getDate() + 1)) {
          dates.push(d.toLocaleDateString('fr-FR'));
        }
        return dates;
      };

      // Calculer tous les types d'absences avec dates
      const congesCP = conges.filter(c => c.type === 'CP' || c.type === 'conge_paye');
      const congesRTT = conges.filter(c => c.type === 'RTT');
      const congesMaladie = conges.filter(c => c.type === 'maladie' || c.type === 'arret_maladie');
      const congesSansSolde = conges.filter(c => c.type?.toLowerCase().includes('sans solde'));
      const congesExceptionnel = conges.filter(c => c.type?.toLowerCase().includes('exceptionnel') || c.type?.toLowerCase().includes('familial'));
      const congesFormation = conges.filter(c => c.type?.toLowerCase().includes('formation'));

      const datesCP = congesCP.flatMap(extraireDates);
      const datesRTT = congesRTT.flatMap(extraireDates);
      const datesMaladie = congesMaladie.flatMap(extraireDates);
      const datesSansSolde = congesSansSolde.flatMap(extraireDates);
      const datesExceptionnel = congesExceptionnel.flatMap(extraireDates);
      const datesFormation = congesFormation.flatMap(extraireDates);

      return {
        ...employe,
        heuresTravaillees,
        joursCP: datesCP.length,
        joursRTT: datesRTT.length,
        joursMaladie: datesMaladie.length,
        joursSansSolde: datesSansSolde.length,
        joursExceptionnel: datesExceptionnel.length,
        joursFormation: datesFormation.length,
        absencesInjustifiees: 0,
        datesCP,
        datesRTT,
        datesMaladie,
        datesSansSolde,
        datesExceptionnel,
        datesFormation,
        datesInjustifiees: []
      };
    }));

    // Générer le ZIP avec Excel + justificatifs
    const zipBuffer = await generateRapportExcelZIP(rapportsEmployes, periode, dateDebut, dateFin);

    // Créer un nom de fichier précis avec dates et timestamp
    const now = new Date();
    const dateDebutStr = new Date(dateDebut).toLocaleDateString('fr-FR').replace(/\//g, '-');
    const dateFinStr = new Date(dateFin).toLocaleDateString('fr-FR').replace(/\//g, '-');
    const timestamp = getCurrentDateString() + '_' + now.toTimeString().split(' ')[0].replace(/:/g, 'h');
    const fileName = `Rapport_RH_Navigo_${periode}_du_${dateDebutStr}_au_${dateFinStr}_genere_${timestamp}.zip`;

    // Envoyer le ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(zipBuffer);

  } catch (error) {
    console.error('❌ Erreur export ZIP:', error);
    res.status(500).json({ message: 'Erreur génération ZIP' });
  }
});

// Route existante pour les stats RH
router.get('/', authenticateToken, isAdmin, getStatsRH);

module.exports = router;
