// utils/congeConflicts.js
// Utilitaires pour détecter les conflits de congés

// ============================================================
// ANALYSE D'IMPACT HORAIRES - vérifie les vrais shifts planifiés
// ============================================================

/**
 * Convertir "HH:mm" en minutes depuis minuit
 */
const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Calculer la durée d'un segment en heures
 * Gère les segments qui traversent minuit (ex: 22:00 - 02:00)
 */
const segmentDurationHours = (start, end) => {
  let startMin = timeToMinutes(start);
  let endMin = timeToMinutes(end);
  if (endMin <= startMin) endMin += 1440; // traversée de minuit
  return (endMin - startMin) / 60;
};

/**
 * Parser les segments d'un shift (gère string JSON et array)
 */
const parseSegments = (segs) => {
  if (Array.isArray(segs)) return segs;
  if (typeof segs === 'string') {
    try { return JSON.parse(segs); } catch { return []; }
  }
  return [];
};

/**
 * Calculer les minutes de chevauchement horaire entre deux ensembles de segments
 * Ex: [{start:'19:00',end:'23:00'}] vs [{start:'18:00',end:'00:30'}] → overlap
 */
const segmentsOverlapMinutes = (segments1, segments2) => {
  let totalOverlap = 0;
  for (const s1 of segments1) {
    let start1 = timeToMinutes(s1.start);
    let end1 = timeToMinutes(s1.end);
    if (end1 <= start1) end1 += 1440;
    
    for (const s2 of segments2) {
      let start2 = timeToMinutes(s2.start);
      let end2 = timeToMinutes(s2.end);
      if (end2 <= start2) end2 += 1440;
      
      const overlapStart = Math.max(start1, start2);
      const overlapEnd = Math.min(end1, end2);
      if (overlapStart < overlapEnd) {
        totalOverlap += overlapEnd - overlapStart;
      }
    }
  }
  return totalOverlap;
};

/**
 * Calculer les plages horaires exactes de chevauchement entre deux ensembles de segments
 * Retourne un tableau [{start:'HH:mm', end:'HH:mm', minutes:N}]
 */
const computeOverlapRanges = (segments1, segments2) => {
  const ranges = [];
  for (const s1 of segments1) {
    let start1 = timeToMinutes(s1.start);
    let end1 = timeToMinutes(s1.end);
    if (end1 <= start1) end1 += 1440;
    
    for (const s2 of segments2) {
      let start2 = timeToMinutes(s2.start);
      let end2 = timeToMinutes(s2.end);
      if (end2 <= start2) end2 += 1440;
      
      const overlapStart = Math.max(start1, start2);
      const overlapEnd = Math.min(end1, end2);
      if (overlapStart < overlapEnd) {
        const sM = overlapStart % 1440;
        const eM = overlapEnd % 1440;
        ranges.push({
          start: `${String(Math.floor(sM / 60)).padStart(2, '0')}:${String(sM % 60).padStart(2, '0')}`,
          end: `${String(Math.floor(eM / 60)).padStart(2, '0')}:${String(eM % 60).padStart(2, '0')}`,
          minutes: overlapEnd - overlapStart,
        });
      }
    }
  }
  return ranges;
};

/**
 * Normaliser une date en clé YYYY-MM-DD (en local)
 */
const dateToKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

/**
 * Analyser l'impact réel d'un congé sur les horaires planifiés
 * @param {Object} params
 * @param {string} params.dateDebut - Date début du congé
 * @param {string} params.dateFin - Date fin du congé
 * @param {number} params.employeId - ID de l'employé demandeur
 * @param {Array} params.shiftsEmploye - Shifts du demandeur sur la période
 * @param {Array} params.shiftsCategorieAll - Tous les shifts de la catégorie sur la période
 * @param {Array} params.employes - Tous les employés
 * @param {Array} params.congesActifs - Congés actifs (approuvés + en attente) hors demandeur
 * @returns {Object} Analyse d'impact jour par jour
 */
export const analyseShiftImpact = ({ dateDebut, dateFin, employeId, shiftsEmploye, shiftsCategorieAll, employes, congesActifs }) => {
  const start = new Date(dateDebut);
  const end = new Date(dateFin);
  
  // Indexer les shifts du demandeur par date
  const shiftsParDate = {};
  (shiftsEmploye || []).forEach(s => {
    const key = dateToKey(s.date);
    shiftsParDate[key] = s;
  });

  // Indexer tous les shifts catégorie par date et employeId
  const shiftsCatParDateEmp = {};
  (shiftsCategorieAll || []).forEach(s => {
    const key = dateToKey(s.date);
    if (!shiftsCatParDateEmp[key]) shiftsCatParDateEmp[key] = {};
    shiftsCatParDateEmp[key][s.employeId] = s;
  });

  // Indexer les congés actifs par date
  const congesParDate = {};
  (congesActifs || []).forEach(c => {
    const cStart = new Date(c.dateDebut);
    const cEnd = new Date(c.dateFin);
    const day = new Date(cStart);
    while (day <= cEnd) {
      const key = dateToKey(day);
      if (!congesParDate[key]) congesParDate[key] = [];
      congesParDate[key].push(c);
      day.setDate(day.getDate() + 1);
    }
  });

  const jourParJour = [];
  let totalHeuresPerdues = 0;
  let joursAvecShift = 0;
  let joursSansShift = 0;
  let joursRepos = 0;
  const colleagueOverlapMap = {}; // empId -> { employe, totalOverlapMin, joursChevauchement, joursEnConge, shiftsExemple }

  const current = new Date(start);
  while (current <= end) {
    const key = dateToKey(current);
    const shift = shiftsParDate[key];
    const jourInfo = {
      date: new Date(current),
      dateKey: key,
      jourSemaine: current.toLocaleDateString('fr-FR', { weekday: 'short' }),
      shift: null,
      type: 'pas_de_shift', // pas_de_shift | repos | travail | absence
      segments: [],
      heures: 0,
      impact: 'aucun', // aucun | total
      // Couverture catégorie ce jour-là
      employesPlanifies: 0,
      employesAbsents: 0, // en congé ce jour
      employesDisponibles: 0,
    };

    if (shift) {
      jourInfo.shift = shift;
      jourInfo.type = shift.type || 'travail';
      
      if (shift.type === 'repos') {
        jourInfo.impact = 'aucun';
        joursRepos++;
      } else if (shift.type === 'travail') {
        // Calculer les heures des segments
        const segments = Array.isArray(shift.segments) ? shift.segments : 
          (typeof shift.segments === 'string' ? JSON.parse(shift.segments) : []);
        
        let heuresJour = 0;
        jourInfo.segments = segments.map(seg => {
          const dur = segmentDurationHours(seg.start, seg.end);
          heuresJour += dur;
          return { start: seg.start, end: seg.end, duree: dur };
        });
        
        jourInfo.heures = Math.round(heuresJour * 100) / 100;
        totalHeuresPerdues += heuresJour;
        jourInfo.impact = 'total';
        joursAvecShift++;
      } else if (shift.type === 'absence') {
        jourInfo.impact = 'aucun'; // déjà absent
        joursSansShift++;
      }
    } else {
      joursSansShift++;
    }

    // Analyse de couverture catégorie pour ce jour + chevauchement horaire
    const shiftsJour = shiftsCatParDateEmp[key] || {};
    const congesJour = congesParDate[key] || [];
    const employeIdsEnConge = new Set(congesJour.map(c => c.userId));
    
    let planifies = 0;
    let absentsConge = 0;
    let colleaguesSurCreneaux = 0;
    let colleaguesEnCongeCreneaux = 0;
    
    Object.entries(shiftsJour).forEach(([empId, s]) => {
      const id = Number(empId);
      if (id === employeId) return;
      if (s.type === 'travail') {
        planifies++;
        if (employeIdsEnConge.has(id)) absentsConge++;
        
        // Chevauchement horaire réel avec le demandeur
        if (jourInfo.type === 'travail' && jourInfo.segments.length > 0) {
          const colSegments = parseSegments(s.segments);
          const overlapMin = segmentsOverlapMinutes(jourInfo.segments, colSegments);
          
          if (overlapMin > 0) {
            colleaguesSurCreneaux++;
            if (employeIdsEnConge.has(id)) colleaguesEnCongeCreneaux++;
            
            // Calculer les plages de chevauchement exactes
            const overlapRanges = computeOverlapRanges(jourInfo.segments, colSegments);
            
            if (!colleagueOverlapMap[id]) {
              const emp = employes.find(e => e.id === id);
              colleagueOverlapMap[id] = {
                employe: emp,
                totalOverlapMin: 0,
                joursChevauchement: 0,
                joursEnConge: 0,
                shiftsExemple: colSegments,
                overlapRanges: overlapRanges, // plages de chevauchement réelles
                overlapHours: 0,
              };
            }
            colleagueOverlapMap[id].totalOverlapMin += overlapMin;
            colleagueOverlapMap[id].joursChevauchement++;
            if (employeIdsEnConge.has(id)) colleagueOverlapMap[id].joursEnConge++;
            colleagueOverlapMap[id].shiftsExemple = colSegments;
            // Garder les plages de chevauchement les plus longues
            if (overlapRanges.length > 0) {
              const totalRangeMin = overlapRanges.reduce((s, r) => s + r.minutes, 0);
              const existingTotal = (colleagueOverlapMap[id].overlapRanges || []).reduce((s, r) => s + r.minutes, 0);
              if (totalRangeMin >= existingTotal) {
                colleagueOverlapMap[id].overlapRanges = overlapRanges;
              }
            }
          }
        }
      }
    });
    
    jourInfo.employesPlanifies = planifies;
    jourInfo.employesAbsents = absentsConge;
    jourInfo.employesDisponibles = planifies - absentsConge;
    jourInfo.colleaguesSurCreneaux = colleaguesSurCreneaux;
    jourInfo.colleaguesEnCongeCreneaux = colleaguesEnCongeCreneaux;

    jourParJour.push(jourInfo);
    current.setDate(current.getDate() + 1);
  }

  totalHeuresPerdues = Math.round(totalHeuresPerdues * 100) / 100;

  // Déterminer le niveau d'impact global basé sur les vrais shifts
  const totalJours = jourParJour.length;
  const ratioJoursTravail = totalJours > 0 ? joursAvecShift / totalJours : 0;
  
  let impactLevel = 'aucun';
  if (joursAvecShift === 0) {
    impactLevel = 'aucun'; // zéro impact - pas de travail prévu
  } else if (ratioJoursTravail <= 0.3) {
    impactLevel = 'faible';
  } else if (ratioJoursTravail <= 0.6) {
    impactLevel = 'modere';
  } else {
    impactLevel = 'fort';
  }

  // Trouver le jour le plus critique (moins de couverture)
  let jourCritique = null;
  let minDisponibles = Infinity;
  jourParJour.forEach(j => {
    if (j.type === 'travail' && j.employesDisponibles < minDisponibles) {
      minDisponibles = j.employesDisponibles;
      jourCritique = j;
    }
  });

  // Identifier les horaires de référence du demandeur (premier jour de travail)
  const premierJourTravail = jourParJour.find(j => j.type === 'travail' && j.segments.length > 0);
  const horairesRef = premierJourTravail
    ? premierJourTravail.segments.map(s => ({ start: s.start, end: s.end }))
    : [];

  // Construire la couverture horaire réelle (basée sur le chevauchement de créneaux)
  const colleaguesList = Object.values(colleagueOverlapMap)
    .map(c => ({
      ...c,
      overlapHours: Math.round((c.totalOverlapMin / Math.max(c.joursChevauchement, 1)) * 10) / 10 / 60, // heures moy/jour
    }))
    .sort((a, b) => b.totalOverlapMin - a.totalOverlapMin);
  
  const totalColleguesMemeCreneaux = colleaguesList.length;
  const absentsParmiMemeCreneaux = colleaguesList.filter(c => c.joursEnConge > 0).length;
  const disponiblesParmiMemeCreneaux = totalColleguesMemeCreneaux - absentsParmiMemeCreneaux;
  
  // Ratio: parmi les collègues sur mêmes créneaux (+le demandeur), quel % sera absent
  const ratioAbsenceCreneaux = totalColleguesMemeCreneaux > 0
    ? Math.round(((absentsParmiMemeCreneaux + 1) / (totalColleguesMemeCreneaux + 1)) * 100)
    : 0;

  const couvertureHoraire = {
    colleagues: colleaguesList,
    total: totalColleguesMemeCreneaux,
    absents: absentsParmiMemeCreneaux,
    disponibles: disponiblesParmiMemeCreneaux,
    ratioAbsence: ratioAbsenceCreneaux,
    horairesRef, // horaires du demandeur pour contexte
  };

  return {
    jourParJour,
    totalHeuresPerdues,
    joursAvecShift,
    joursSansShift,
    joursRepos,
    impactLevel,
    jourCritique,
    ratioJoursTravail: Math.round(ratioJoursTravail * 100),
    couvertureHoraire,
  };
};


// ============================================================
// DETECTION DE CONFLITS (existant)
// ============================================================

export const detectConflicts = (conges, employes, dateDebut, dateFin, employeId = null) => {
  const conflicts = {
    sameTeam: [],
    sameCategory: [],
    otherCategories: [],
    criticalShortage: false,
    conflictLevel: 'none', // none, low, medium, high, critical
    stats: {
      totalEmployes: 0,
      totalInCategory: 0,
      absentInCategory: 0,
      availableInCategory: 0,
      ratioAbsent: 0,
      requestDays: 0,
      maxOverlapDays: 0,
      peakDate: null,
      peakAbsents: 0,
    }
  };

  // Convertir les dates pour la comparaison
  const start = new Date(dateDebut);
  const end = new Date(dateFin);
  
  // Calculer la durée de la demande (jours ouvrés approximatifs)
  const requestDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  
  // Trouver l'employé demandeur
  const demandeur = employes.find(e => e.id === employeId);
  const categorieDemandeur = demandeur?.categorie || 'general';
  
  // Ne considérer que les employés actifs (pas en départ)
  const employesActifs = employes.filter(e => !e.dateDepart || new Date(e.dateDepart) > end);
  
  // Vérifier les congés qui se chevauchent (approuvés + en attente)
  const congesActifs = conges.filter(c => 
    (c.statut === 'approuvé' || c.statut === 'en_attente') &&
    c.userId !== employeId &&
    dateOverlap(new Date(c.dateDebut), new Date(c.dateFin), start, end)
  );
  
  // Analyser les conflits par catégorie
  const employesByCategory = employesActifs.reduce((acc, emp) => {
    const cat = emp.categorie || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(emp);
    return acc;
  }, {});
  
  // Compter les absences par catégorie (seulement approuvés pour le calcul critique)
  const congesApprouves = congesActifs.filter(c => c.statut === 'approuvé');
  const absencesByCategory = congesApprouves.reduce((acc, conge) => {
    const emp = employesActifs.find(e => e.id === conge.userId);
    const cat = emp?.categorie || 'general';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat]++;
    return acc;
  }, {});
  
  // Calculer le niveau de conflit pour la catégorie du demandeur
  const totalInCategory = employesByCategory[categorieDemandeur]?.length || 1;
  const absentInCategory = (absencesByCategory[categorieDemandeur] || 0) + 1; // +1 pour le demandeur
  const ratioAbsent = absentInCategory / totalInCategory;
  const availableInCategory = totalInCategory - absentInCategory;
  
  // Analyse jour par jour pour trouver le pic d'absences
  let peakDate = null;
  let peakAbsents = 0;
  const dayAnalysis = [];
  
  const currentDay = new Date(start);
  while (currentDay <= end) {
    const dayAbsents = congesApprouves.filter(c => {
      const cStart = new Date(c.dateDebut);
      const cEnd = new Date(c.dateFin);
      const emp = employesActifs.find(e => e.id === c.userId);
      return emp?.categorie === categorieDemandeur && 
             currentDay >= cStart && currentDay <= cEnd;
    }).length + 1; // +1 pour le demandeur
    
    dayAnalysis.push({
      date: new Date(currentDay),
      absents: dayAbsents,
      available: totalInCategory - dayAbsents,
      ratio: dayAbsents / totalInCategory
    });
    
    if (dayAbsents > peakAbsents) {
      peakAbsents = dayAbsents;
      peakDate = new Date(currentDay);
    }
    
    currentDay.setDate(currentDay.getDate() + 1);
  }
  
  // Déterminer le niveau de criticité
  if (ratioAbsent >= 0.8) {
    conflicts.conflictLevel = 'critical';
    conflicts.criticalShortage = true;
  } else if (ratioAbsent >= 0.6) {
    conflicts.conflictLevel = 'high';
  } else if (ratioAbsent >= 0.4) {
    conflicts.conflictLevel = 'medium';
  } else if (ratioAbsent >= 0.2) {
    conflicts.conflictLevel = 'low';
  }
  
  // Lister les conflits spécifiques
  let maxOverlapDays = 0;
  congesActifs.forEach(conge => {
    const emp = employesActifs.find(e => e.id === conge.userId);
    if (!emp) return;
    
    const overlapDays = getOverlapDays(new Date(conge.dateDebut), new Date(conge.dateFin), start, end);
    if (overlapDays > maxOverlapDays) maxOverlapDays = overlapDays;
    
    const conflictInfo = {
      employe: emp,
      conge: conge,
      overlap: overlapDays,
      overlapPercent: Math.round((overlapDays / requestDays) * 100),
      isApproved: conge.statut === 'approuvé',
    };
    
    if ((emp.categorie || 'general') === categorieDemandeur) {
      conflicts.sameCategory.push(conflictInfo);
    } else {
      conflicts.otherCategories.push(conflictInfo);
    }
  });
  
  // Trier par nombre de jours de chevauchement décroissant
  conflicts.sameCategory.sort((a, b) => b.overlap - a.overlap);
  conflicts.otherCategories.sort((a, b) => b.overlap - a.overlap);
  
  // Enrichir les stats
  conflicts.stats = {
    totalEmployes: employesActifs.length,
    totalInCategory,
    absentInCategory,
    availableInCategory,
    ratioAbsent: Math.round(ratioAbsent * 100),
    requestDays,
    maxOverlapDays,
    peakDate,
    peakAbsents,
    dayAnalysis,
  };
  
  return conflicts;
};

// Utilitaire pour vérifier le chevauchement de dates
const dateOverlap = (start1, end1, start2, end2) => {
  return start1 <= end2 && start2 <= end1;
};

// Calculer les jours de chevauchement
const getOverlapDays = (start1, end1, start2, end2) => {
  const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
  const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));
  
  if (overlapStart > overlapEnd) return 0;
  
  return Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
};

// Générer les recommandations (sans emojis - les icônes sont dans le composant)
export const generateRecommendations = (conflicts, dateDebut, dateFin) => {
  const recommendations = [];
  const { stats } = conflicts;
  
  // Recommandation principale selon le niveau
  switch (conflicts.conflictLevel) {
    case 'critical':
      recommendations.push({
        type: 'error',
        title: 'Risque critique',
        message: `${stats.ratioAbsent}% de la catégorie serait absente (${stats.absentInCategory}/${stats.totalInCategory}). Seulement ${stats.availableInCategory} personne(s) disponible(s).`,
        action: 'Refuser ou négocier d\'autres dates'
      });
      break;
      
    case 'high':
      recommendations.push({
        type: 'warning',
        title: 'Attention requise',
        message: `${stats.ratioAbsent}% d'absence dans la catégorie. ${stats.availableInCategory} personne(s) disponible(s) sur ${stats.totalInCategory}.`,
        action: 'Vérifier la charge de travail avant d\'approuver'
      });
      break;
      
    case 'medium':
      recommendations.push({
        type: 'info',
        title: 'Impact modéré',
        message: `${stats.ratioAbsent}% d'absence prévue. ${stats.availableInCategory} personne(s) disponible(s) sur ${stats.totalInCategory}.`,
        action: 'Prévoir une organisation adaptée si nécessaire'
      });
      break;
      
    case 'low':
      recommendations.push({
        type: 'success',
        title: 'Impact faible',
        message: `Couverture suffisante : ${stats.availableInCategory} personne(s) disponible(s) sur ${stats.totalInCategory}.`,
        action: null
      });
      break;
      
    default:
      recommendations.push({
        type: 'success',
        title: 'Aucun conflit',
        message: 'Aucun chevauchement détecté avec d\'autres congés dans cette catégorie.',
        action: null
      });
      break;
  }
  
  // Recommandations additionnelles contextuelles
  if (conflicts.sameCategory.length > 0) {
    const pendingConflicts = conflicts.sameCategory.filter(c => !c.isApproved);
    if (pendingConflicts.length > 0) {
      recommendations.push({
        type: 'info',
        title: 'Demandes en attente',
        message: `${pendingConflicts.length} autre(s) demande(s) en attente sur la même période dans cette catégorie.`,
        action: null
      });
    }
  }
  
  if (stats.peakDate && stats.peakAbsents > 1) {
    recommendations.push({
      type: stats.peakAbsents / stats.totalInCategory >= 0.6 ? 'warning' : 'info',
      title: 'Pic d\'absences',
      message: `Le ${stats.peakDate.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}, ${stats.peakAbsents} personne(s) absente(s) sur ${stats.totalInCategory}.`,
      action: null
    });
  }
  
  if (stats.requestDays > 5) {
    recommendations.push({
      type: 'info',
      title: 'Congé long',
      message: `Demande de ${stats.requestDays} jours. Prévoir le passage de consignes.`,
      action: null
    });
  }
  
  return recommendations;
};

// Générer des recommandations basées sur le chevauchement horaire réel
export const generateShiftRecommendations = (shiftImpact) => {
  if (!shiftImpact) return [];
  const recs = [];
  const cov = shiftImpact.couvertureHoraire;
  
  if (shiftImpact.joursAvecShift === 0) {
    recs.push({
      type: 'success',
      title: 'Aucun shift impacté',
      message: 'Aucun shift de travail planifié sur cette période. Approbation sans impact opérationnel.',
      action: null
    });
    return recs;
  }
  
  if (cov && cov.total > 0) {
    const ratioPresent = cov.disponibles / cov.total;
    if (cov.ratioAbsence >= 80) {
      recs.push({
        type: 'error',
        title: 'Couverture horaire critique',
        message: `${cov.absents} collègue(s) sur ${cov.total} travaillant aux mêmes créneaux sont déjà en congé. Seulement ${cov.disponibles} personne(s) restante(s).`,
        action: 'Reporter ou refuser'
      });
    } else if (cov.ratioAbsence >= 50) {
      recs.push({
        type: 'warning',
        title: 'Couverture horaire réduite',
        message: `${cov.disponibles} collègue(s) disponible(s) sur ${cov.total} travaillant aux mêmes créneaux horaires.`,
        action: 'Vérifier que la couverture reste suffisante'
      });
    } else if (cov.absents > 0) {
      recs.push({
        type: 'info',
        title: 'Chevauchement partiel',
        message: `${cov.absents} collègue(s) sur même créneau en congé, mais ${cov.disponibles} restent disponible(s).`,
        action: null
      });
    } else {
      recs.push({
        type: 'success',
        title: 'Bonne couverture horaire',
        message: `${cov.total} collègue(s) travaillent aux mêmes horaires et sont tous disponibles.`,
        action: null
      });
    }
  } else if (cov && cov.total === 0 && shiftImpact.joursAvecShift > 0) {
    recs.push({
      type: 'success',
      title: 'Créneau isolé',
      message: 'Personne d\'autre ne travaille sur les mêmes créneaux horaires. Pas de conflit de couverture.',
      action: null
    });
  }
  
  // Avertissement jour critique basé sur les créneaux
  if (shiftImpact.jourCritique) {
    const jc = shiftImpact.jourCritique;
    if (jc.colleaguesSurCreneaux !== undefined && jc.colleaguesSurCreneaux - jc.colleaguesEnCongeCreneaux <= 0) {
      recs.push({
        type: 'error',
        title: 'Jour sans couverture horaire',
        message: `Le ${jc.date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}, aucun collègue disponible sur le même créneau.`,
        action: 'Jour à risque — prévoir un remplacement'
      });
    }
  }
  
  if (shiftImpact.totalHeuresPerdues > 0) {
    recs.push({
      type: 'info',
      title: 'Heures à couvrir',
      message: `${shiftImpact.totalHeuresPerdues}h de travail planifiées sur ${shiftImpact.joursAvecShift} jour(s) à redistribuer.`,
      action: null
    });
  }
  
  return recs;
};
