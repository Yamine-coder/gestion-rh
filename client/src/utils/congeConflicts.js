// utils/congeConflicts.js
// Utilitaires pour détecter les conflits de congés

export const detectConflicts = (conges, employes, dateDebut, dateFin, employeId = null) => {
  const conflicts = {
    sameTeam: [],
    sameCategory: [],
    criticalShortage: false,
    conflictLevel: 'none' // none, low, medium, high, critical
  };

  // Convertir les dates pour la comparaison
  const start = new Date(dateDebut);
  const end = new Date(dateFin);
  
  // Trouver l'employé demandeur
  const demandeur = employes.find(e => e.id === employeId);
  const categorieDemandeur = demandeur?.categorie || 'general';
  
  // Vérifier les congés qui se chevauchent
  const congesActifs = conges.filter(c => 
    c.statut === 'approuvé' && // Seulement les approuvés
    c.userId !== employeId && // Pas le demandeur
    dateOverlap(new Date(c.dateDebut), new Date(c.dateFin), start, end)
  );
  
  // Analyser les conflits par catégorie
  const employesByCategory = employes.reduce((acc, emp) => {
    const cat = emp.categorie || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(emp);
    return acc;
  }, {});
  
  // Compter les absences par catégorie
  const absencesByCategory = congesActifs.reduce((acc, conge) => {
    const emp = employes.find(e => e.id === conge.userId);
    const cat = emp?.categorie || 'general';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat]++;
    return acc;
  }, {});
  
  // Calculer le niveau de conflit pour la catégorie du demandeur
  const totalInCategory = employesByCategory[categorieDemandeur]?.length || 1;
  const absentInCategory = (absencesByCategory[categorieDemandeur] || 0) + 1; // +1 pour le demandeur
  const ratioAbsent = absentInCategory / totalInCategory;
  
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
  congesActifs.forEach(conge => {
    const emp = employes.find(e => e.id === conge.userId);
    if (!emp) return;
    
    const conflictInfo = {
      employe: emp,
      conge: conge,
      overlap: getOverlapDays(new Date(conge.dateDebut), new Date(conge.dateFin), start, end)
    };
    
    if (emp.categorie === categorieDemandeur) {
      conflicts.sameCategory.push(conflictInfo);
    }
  });
  
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

// Générer les recommandations
export const generateRecommendations = (conflicts, dateDebut, dateFin) => {
  const recommendations = [];
  
  switch (conflicts.conflictLevel) {
    case 'critical':
      recommendations.push({
        type: 'error',
        message: '⚠️ CRITIQUE : Plus de 80% de l\'équipe serait absente',
        action: 'Refuser ou négocier d\'autres dates'
      });
      break;
      
    case 'high':
      recommendations.push({
        type: 'warning',
        message: '🔶 ATTENTION : 60%+ de l\'équipe absente',
        action: 'Vérifier la charge de travail avant d\'approuver'
      });
      break;
      
    case 'medium':
      recommendations.push({
        type: 'info',
        message: '💡 INFO : Impact modéré sur l\'équipe (40%+ absents)',
        action: 'Prévoir une organisation spéciale'
      });
      break;
      
    case 'low':
      recommendations.push({
        type: 'success',
        message: '✅ Impact faible - Peut être approuvé sans problème',
        action: null
      });
      break;
      
    default:
      recommendations.push({
        type: 'info',
        message: '🔍 Aucun conflit détecté',
        action: null
      });
      break;
  }
  
  return recommendations;
};
