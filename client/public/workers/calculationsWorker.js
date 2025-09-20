// client/public/workers/calculationsWorker.js

/**
 * Web Worker pour calculs lourds d'anomalies et de planning
 * Évite le blocage du thread principal
 */

self.onmessage = function(e) {
  const { type, data } = e.data;

  try {
    let result;
    
    switch (type) {
      case 'CALCULATE_ANOMALIES_STATS':
        result = calculateAnomaliesStats(data);
        break;
        
      case 'PROCESS_PLANNING_DATA':
        result = processPlanningData(data);
        break;
        
      case 'GENERATE_RAPPORT_DATA':
        result = generateRapportData(data);
        break;
        
      case 'CALCULATE_HEURES_SUPPLEMENTAIRES':
        result = calculateHeuresSupplementaires(data);
        break;
        
      default:
        throw new Error(`Type de calcul inconnu: ${type}`);
    }

    self.postMessage({
      success: true,
      type,
      result
    });
    
  } catch (error) {
    self.postMessage({
      success: false,
      type,
      error: error.message
    });
  }
};

/**
 * Calcul statistiques anomalies
 */
function calculateAnomaliesStats(data) {
  const { anomalies, comparaisons, shifts } = data;
  
  const stats = {
    total: anomalies.length,
    byStatus: { pending: 0, validated: 0, refused: 0 },
    byEmployee: new Map(),
    bySeverity: { low: 0, medium: 0, high: 0 },
    heuresManquantesTotal: 0,
    tendances: {
      derniereSemaine: 0,
      moisEnCours: 0
    }
  };

  const now = new Date();
  const semaineDerniere = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

  anomalies.forEach(anomalie => {
    // Statuts
    const statut = anomalie.statut || 'pending';
    stats.byStatus[statut] = (stats.byStatus[statut] || 0) + 1;

    // Par employé
    const empKey = `${anomalie.employeId}_${anomalie.employeNom}`;
    if (!stats.byEmployee.has(empKey)) {
      stats.byEmployee.set(empKey, { count: 0, heures: 0 });
    }
    const empStats = stats.byEmployee.get(empKey);
    empStats.count++;
    empStats.heures += anomalie.heuresManquantes || 0;

    // Sévérité basée sur heures manquantes
    const heures = anomalie.heuresManquantes || 0;
    stats.heuresManquantesTotal += heures;
    
    if (heures > 4) stats.bySeverity.high++;
    else if (heures > 1) stats.bySeverity.medium++;
    else stats.bySeverity.low++;

    // Tendances temporelles
    const anomalieDate = new Date(anomalie.jour);
    if (anomalieDate >= semaineDerniere) {
      stats.tendances.derniereSemaine++;
    }
    if (anomalieDate >= debutMois) {
      stats.tendances.moisEnCours++;
    }
  });

  // Conversion Map en objet pour JSON
  stats.byEmployee = Object.fromEntries(stats.byEmployee);

  return stats;
}

/**
 * Traitement données de planning
 */
function processPlanningData(data) {
  const { shifts, employes, dateDebut, dateFin } = data;
  
  const processed = {
    shiftsByDate: new Map(),
    employeHours: new Map(),
    conflicts: [],
    coverage: new Map()
  };

  const startDate = new Date(dateDebut);
  const endDate = new Date(dateFin);

  // Traitement des shifts
  shifts.forEach(shift => {
    const date = shift.jour || shift.date;
    const dateKey = date;
    
    // Groupement par date
    if (!processed.shiftsByDate.has(dateKey)) {
      processed.shiftsByDate.set(dateKey, []);
    }
    processed.shiftsByDate.get(dateKey).push(shift);

    // Calcul heures par employé
    const empKey = shift.employeId;
    if (!processed.employeHours.has(empKey)) {
      processed.employeHours.set(empKey, { 
        total: 0, 
        normal: 0, 
        extra: 0, 
        jours: new Set() 
      });
    }
    
    const empHours = processed.employeHours.get(empKey);
    const duration = calculateShiftDuration(shift);
    empHours.total += duration;
    empHours.jours.add(dateKey);
    
    if (shift.isExtra) {
      empHours.extra += duration;
    } else {
      empHours.normal += duration;
    }

    // Détection conflits (chevauchements)
    const dayShifts = processed.shiftsByDate.get(dateKey);
    const empShifts = dayShifts.filter(s => s.employeId === shift.employeId);
    
    if (empShifts.length > 1) {
      // Vérifier chevauchements temporels
      empShifts.forEach((s1, i) => {
        empShifts.slice(i + 1).forEach(s2 => {
          if (shiftsOverlap(s1, s2)) {
            processed.conflicts.push({
              type: 'overlap',
              employeId: shift.employeId,
              date: dateKey,
              shifts: [s1.id, s2.id]
            });
          }
        });
      });
    }
  });

  // Calcul couverture par jour
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    const dayShifts = processed.shiftsByDate.get(dateKey) || [];
    
    // Calcul des créneaux couverts
    const coverage = calculateDayCoverage(dayShifts);
    processed.coverage.set(dateKey, coverage);
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Conversion Maps en objets
  return {
    shiftsByDate: Object.fromEntries(processed.shiftsByDate),
    employeHours: Object.fromEntries(
      Array.from(processed.employeHours.entries()).map(([k, v]) => [
        k, 
        { ...v, jours: Array.from(v.jours) }
      ])
    ),
    conflicts: processed.conflicts,
    coverage: Object.fromEntries(processed.coverage)
  };
}

/**
 * Génération données de rapport
 */
function generateRapportData(data) {
  const { shifts, anomalies, periode } = data;
  
  const rapport = {
    resume: {
      totalHeures: 0,
      heuresNormales: 0,
      heuresExtra: 0,
      joursTravailes: 0,
      anomaliesCount: anomalies.length
    },
    details: [],
    graphique: {
      heuresParJour: [],
      anomaliesParJour: []
    }
  };

  // Groupement par jour
  const shiftsByDay = new Map();
  shifts.forEach(shift => {
    const day = shift.jour;
    if (!shiftsByDay.has(day)) {
      shiftsByDay.set(day, []);
    }
    shiftsByDay.get(day).push(shift);
  });

  // Traitement jour par jour
  shiftsByDay.forEach((dayShifts, day) => {
    const dayData = {
      jour: day,
      shifts: dayShifts,
      totalHeures: 0,
      heuresNormales: 0,
      heuresExtra: 0,
      anomalies: anomalies.filter(a => a.jour === day)
    };

    dayShifts.forEach(shift => {
      const duration = calculateShiftDuration(shift);
      dayData.totalHeures += duration;
      
      if (shift.isExtra) {
        dayData.heuresExtra += duration;
      } else {
        dayData.heuresNormales += duration;
      }
    });

    rapport.details.push(dayData);
    rapport.resume.totalHeures += dayData.totalHeures;
    rapport.resume.heuresNormales += dayData.heuresNormales;
    rapport.resume.heuresExtra += dayData.heuresExtra;
    
    if (dayData.totalHeures > 0) {
      rapport.resume.joursTravailes++;
    }

    // Données pour graphique
    rapport.graphique.heuresParJour.push({
      jour: day,
      heures: dayData.totalHeures
    });
    
    rapport.graphique.anomaliesParJour.push({
      jour: day,
      count: dayData.anomalies.length
    });
  });

  return rapport;
}

/**
 * Calcul heures supplémentaires
 */
function calculateHeuresSupplementaires(data) {
  const { shifts, seuils = { hebdo: 35, quotidien: 8 } } = data;
  
  const result = {
    heuresSupp: [],
    totaux: {
      normal: 0,
      supp25: 0,  // 25% de majoration
      supp50: 0   // 50% de majoration
    }
  };

  // Groupement par semaine et employé
  const shiftsByWeekAndEmployee = new Map();
  
  shifts.forEach(shift => {
    const date = new Date(shift.jour);
    const weekKey = getWeekKey(date);
    const empKey = `${weekKey}_${shift.employeId}`;
    
    if (!shiftsByWeekAndEmployee.has(empKey)) {
      shiftsByWeekAndEmployee.set(empKey, {
        weekKey,
        employeId: shift.employeId,
        shifts: [],
        totalHours: 0
      });
    }
    
    const weekData = shiftsByWeekAndEmployee.get(empKey);
    weekData.shifts.push(shift);
    weekData.totalHours += calculateShiftDuration(shift);
  });

  // Calcul des heures supp
  shiftsByWeekAndEmployee.forEach(weekData => {
    const { employeId, weekKey, totalHours } = weekData;
    
    if (totalHours > seuils.hebdo) {
      const heuresSupp = totalHours - seuils.hebdo;
      
      // Répartition 25% / 50%
      const supp25 = Math.min(heuresSupp, 8); // 8h max à 25%
      const supp50 = Math.max(0, heuresSupp - 8); // Reste à 50%
      
      result.heuresSupp.push({
        employeId,
        weekKey,
        heuresNormales: seuils.hebdo,
        heuresSupp25: supp25,
        heuresSupp50: supp50,
        totalHours
      });
      
      result.totaux.supp25 += supp25;
      result.totaux.supp50 += supp50;
    }
    
    result.totaux.normal += Math.min(totalHours, seuils.hebdo);
  });

  return result;
}

// Fonctions utilitaires

function calculateShiftDuration(shift) {
  if (shift.duration) return shift.duration;
  
  if (shift.heureDebut && shift.heureFin) {
    const debut = parseTime(shift.heureDebut);
    const fin = parseTime(shift.heureFin);
    return fin - debut;
  }
  
  return 8; // Défaut 8h
}

function parseTime(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours + (minutes / 60);
}

function shiftsOverlap(shift1, shift2) {
  const start1 = parseTime(shift1.heureDebut);
  const end1 = parseTime(shift1.heureFin);
  const start2 = parseTime(shift2.heureDebut);
  const end2 = parseTime(shift2.heureFin);
  
  return !(end1 <= start2 || end2 <= start1);
}

function calculateDayCoverage(shifts) {
  // Calcul simple des heures couvertes dans la journée
  const slots = Array(24).fill(false);
  
  shifts.forEach(shift => {
    const debut = Math.floor(parseTime(shift.heureDebut));
    const fin = Math.ceil(parseTime(shift.heureFin));
    
    for (let h = debut; h < fin && h < 24; h++) {
      slots[h] = true;
    }
  });
  
  return slots.filter(Boolean).length;
}

function getWeekKey(date) {
  const year = date.getFullYear();
  const weekNumber = getWeekNumber(date);
  return `${year}-W${weekNumber}`;
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
