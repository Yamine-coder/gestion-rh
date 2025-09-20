/**
 * Utilitaires pour la validation des segments et la gestion des erreurs
 */

/**
 * Valide un segment de temps
 * @param {Object} segment - Le segment à valider
 * @param {string} segment.start - Heure de début (format HH:MM)
 * @param {string} segment.end - Heure de fin (format HH:MM)
 * @returns {Object} - Résultat de validation {isValid, errorMessage}
 */
export const validateSegment = (segment) => {
  // Vérifier que les champs obligatoires sont présents
  if (!segment.start || !segment.end) {
    return {
      isValid: false,
      errorMessage: "Les heures de début et de fin sont obligatoires"
    };
  }

  // Vérifier le format des heures (HH:MM)
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timeRegex.test(segment.start)) {
    return {
      isValid: false,
      errorMessage: `Le format de l'heure de début doit être HH:MM (ex: 09:00)`
    };
  }
  
  if (!timeRegex.test(segment.end)) {
    return {
      isValid: false,
      errorMessage: `Le format de l'heure de fin doit être HH:MM (ex: 17:30)`
    };
  }

  // Vérifier que l'heure de début est avant l'heure de fin
  if (segment.start >= segment.end) {
    return {
      isValid: false,
      errorMessage: `L'heure de début (${segment.start}) doit être antérieure à l'heure de fin (${segment.end})`
    };
  }

  return {
    isValid: true,
    errorMessage: null
  };
};

/**
 * Vérifie les chevauchements entre segments
 * @param {Array} segments - Liste des segments
 * @returns {Object} - Résultat de validation {hasOverlap, overlaps}
 * où overlaps est un objet {index: {overlapsWith, errorMessage}}
 */
export const checkSegmentOverlaps = (segments) => {
  const overlaps = {};
  let hasOverlap = false;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    // Vérifier d'abord que le segment lui-même est valide
    const validation = validateSegment(segment);
    if (!validation.isValid) continue; // Ignorer les segments invalides
    
    for (let j = 0; j < segments.length; j++) {
      if (i === j) continue; // Ne pas comparer un segment avec lui-même
      
      const otherSeg = segments[j];
      const otherValidation = validateSegment(otherSeg);
      if (!otherValidation.isValid) continue; // Ignorer les segments invalides
      
      // Vérifier le chevauchement
      if ((segment.start >= otherSeg.start && segment.start < otherSeg.end) ||
          (segment.end > otherSeg.start && segment.end <= otherSeg.end) ||
          (segment.start <= otherSeg.start && segment.end >= otherSeg.end)) {
        
        overlaps[i] = {
          overlapsWith: j,
          errorMessage: `Chevauchement avec le créneau ${j+1} (${otherSeg.start}-${otherSeg.end})`
        };
        
        hasOverlap = true;
        break;
      }
    }
  }
  
  return { hasOverlap, overlaps };
};

/**
 * Analyse une erreur de serveur et renvoie un message d'erreur approprié
 * @param {Object} error - L'erreur à analyser
 * @returns {Object} - {message, type, segmentErrors}
 */
export const parseServerError = (error) => {
  const errData = error?.response?.data;
  const errMsg = errData?.error || error?.message || "Une erreur est survenue";
  
  // Par défaut, on renvoie juste le message
  const result = {
    message: errMsg,
    type: 'error',
    segmentErrors: {}
  };
  
  // Analyser le message pour des cas spécifiques
  if (errMsg.includes('Heure début >= fin segment')) {
    const segmentMatch = errMsg.match(/segment\s+(\d+)/i);
    const segmentNum = segmentMatch ? parseInt(segmentMatch[1], 10) : null;
    
    result.message = "L'heure de début doit être antérieure à l'heure de fin";
    
    if (segmentNum !== null) {
      result.segmentErrors[segmentNum-1] = {
        message: "L'heure de début doit être antérieure à l'heure de fin",
        type: "error"
      };
    }
  }
  else if (errMsg.toLowerCase().includes('format') && errMsg.toLowerCase().includes('heure')) {
    result.message = 'Format d\'heure invalide. Veuillez utiliser le format HH:MM (ex: 09:00)';
  }
  else if (errMsg.toLowerCase().includes('chevauch')) {
    result.message = 'Des créneaux se chevauchent. Veuillez ajuster les heures pour éviter les superpositions.';
  }
  else if (errData?.violations) {
    // Si le serveur envoie des violations détaillées
    const violations = errData.violations
      .map(v => `- ${v.message}`)
      .join('\n');
    result.message = `Erreurs de validation:\n${violations}`;
  }
  
  return result;
};
