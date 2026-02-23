const express = require('express');
const router = express.Router();

const { authMiddleware: authenticateToken, adminMiddleware } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdminMiddleware');
const prisma = require('../prisma/client');
const { getWorkDayBounds } = require('../config/workDayConfig');
const { toLocalDateString } = require('../utils/dateUtils');
const { isEntree, isSortie, filtrerEntrees, filtrerSorties, TYPE_CANONIQUE_ENTREE, TYPE_CANONIQUE_SORTIE } = require('../utils/pointageTypeUtils');
const scoringService = require('../services/scoringService');
const { BUSINESS_DAY_CUTOFF_HOUR, getBusinessDayBoundsUTC, getBusinessDay, horodatageToParisMinutes } = require('../utils/businessDayUtils');

// 🔒 Mutex par userId pour empêcher les requêtes simultanées (triple-tap tablette)
const userPointageLocks = new Map();
const LOCK_TIMEOUT_MS = 10000; // Auto-libération après 10s max
async function acquireUserLock(userId) {
  while (userPointageLocks.has(userId)) {
    await new Promise(r => setTimeout(r, 100));
    // Libérer si le verrou est trop ancien (safety net)
    const lockTime = userPointageLocks.get(userId);
    if (lockTime && Date.now() - lockTime > LOCK_TIMEOUT_MS) {
      userPointageLocks.delete(userId);
      break;
    }
  }
  userPointageLocks.set(userId, Date.now());
}
function releaseUserLock(userId) {
  userPointageLocks.delete(userId);
}
const {
  getMesPointages,
  getMesPointagesAujourdhui,
  getPointagesParJour,
  enregistrerPointage,
} = require('../controllers/pointageController');

// ═══════════════════════════════════════════════════════════════════════════════
// � HELPER: Extraire heures de début/fin d'un shift (segments ou champs directs)
// ═══════════════════════════════════════════════════════════════════════════════
function getShiftHours(shift) {
  // Essayer d'abord les champs directs
  if (shift.heureDebut && shift.heureFin) {
    return { heureDebut: shift.heureDebut, heureFin: shift.heureFin };
  }
  
  // Sinon, extraire depuis les segments
  if (shift.segments && Array.isArray(shift.segments) && shift.segments.length > 0) {
    // Trier les segments par heure de début
    const sortedSegments = [...shift.segments].sort((a, b) => {
      const startA = a.start || a.debut || '00:00';
      const startB = b.start || b.debut || '00:00';
      return startA.localeCompare(startB);
    });
    
    const firstSegment = sortedSegments[0];
    const lastSegment = sortedSegments[sortedSegments.length - 1];
    
    return {
      heureDebut: firstSegment.start || firstSegment.debut,
      heureFin: lastSegment.end || lastSegment.fin
    };
  }
  
  return { heureDebut: null, heureFin: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// �🔥 DÉTECTION TEMPS RÉEL DES ANOMALIES - Best Practice Apps RH Pro
// Comme Factorial, PayFit, Lucca : feedback immédiat à l'employé
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Détecte les anomalies EN TEMPS RÉEL au moment du pointage
 * @param {number} userId - ID de l'employé
 * @param {string} type - 'arrivee' ou 'depart'
 * @param {Date} horodatage - Heure du pointage
 * @returns {Array} Anomalies détectées avec feedback pour l'employé
 */
async function detecterAnomaliesTempsReel(userId, type, horodatage) {
  const anomaliesDetectees = [];
  
  try {
    // Déterminer quelle date de shift chercher
    // Utilise l'heure PARIS (pas UTC) pour déterminer le jour business
    // Avant 5h du matin Paris = jour business de la veille (shift nocturne en cours)
    const heureParisMinutes = horodatageToParisMinutes(horodatage);
    const heurePointageParis = Math.floor(heureParisMinutes / 60);
    
    // getBusinessDay utilise le cutoff 05:00 Paris pour déterminer le jour business
    let dateJour = getBusinessDay(horodatage);
    
    // Chercher le shift sur le jour business
    let shift = await prisma.shift.findFirst({
      where: {
        employeId: userId,
        date: new Date(dateJour + 'T00:00:00.000Z')
      },
      include: {
        employe: { select: { nom: true, prenom: true } }
      }
    });
    
    // Si pas de shift trouvé sur le jour business, essayer le jour calendaire Paris
    // (cas edge: pointage à 00:30 Paris, shift créé pour le 19 fév au lieu du 18)
    if (!shift && heurePointageParis < BUSINESS_DAY_CUTOFF_HOUR) {
      const dateCalendaire = toLocalDateString(horodatage);
      if (dateCalendaire !== dateJour) {
        shift = await prisma.shift.findFirst({
          where: {
            employeId: userId,
            date: new Date(dateCalendaire + 'T00:00:00.000Z')
          },
          include: {
            employe: { select: { nom: true, prenom: true } }
          }
        });
        if (shift) {
          dateJour = dateCalendaire;
        }
      }
    }
    
    // Vérifier si l'employé est en congé
    // IMPORTANT: Pour les pointages avant 6h (fin de shift nocturne), on vérifie
    // le congé sur la date de la VEILLE (date réelle de travail), pas la date calendaire.
    // Ex: Sortie à 00:16 le 11/02 = fin du shift du 10/02, pas un pointage le 11.
    const dateCongeVerif = (heurePointageParis < BUSINESS_DAY_CUTOFF_HOUR) 
      ? toLocalDateString(new Date(horodatage.getTime() - 24 * 60 * 60 * 1000))
      : dateJour;
    
    const conge = await prisma.conge.findFirst({
      where: {
        userId,
        statut: 'approuvé',
        dateDebut: { lte: new Date(dateCongeVerif) },
        dateFin: { gte: new Date(dateCongeVerif) }
      }
    });
    
    const heurePointageStr = horodatage.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Paris'
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🏖️ POINTAGE PENDANT CONGÉ
    // ═══════════════════════════════════════════════════════════════════════════
    if (conge) {
      const anomalie = await creerAnomalieTempsReel({
        userId,
        type: 'pointage_pendant_conge',
        gravite: 'haute',
        description: `⚠️ Pointage pendant ${conge.type || 'congé'} - Vous êtes censé être en congé aujourd'hui`,
        date: new Date(dateJour)
      });
      
      if (anomalie) {
        anomaliesDetectees.push({
          type: 'pointage_pendant_conge',
          message: `⚠️ Vous êtes en ${conge.type || 'congé'} aujourd'hui !`,
          gravite: 'haute',
          icon: '🏖️'
        });
      }
      return anomaliesDetectees;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ⚡ POINTAGE HORS PLANNING
    // ═══════════════════════════════════════════════════════════════════════════
    if (!shift) {
      const anomalie = await creerAnomalieTempsReel({
        userId,
        type: 'pointage_hors_planning',
        gravite: 'moyenne',
        description: `Pointage hors planning à ${heurePointageStr} - Aucun shift prévu aujourd'hui`,
        date: new Date(dateJour)
      });
      
      if (anomalie) {
        anomaliesDetectees.push({
          type: 'pointage_hors_planning',
          message: `⚡ Aucun shift prévu aujourd'hui`,
          gravite: 'moyenne',
          icon: '⚡'
        });
      }
      return anomaliesDetectees;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // � EXTRAIRE LES HEURES DU SHIFT (depuis segments ou champs directs)
    // ═══════════════════════════════════════════════════════════════════════════
    const shiftHours = getShiftHours(shift);
    
    if (!shiftHours.heureDebut || !shiftHours.heureFin) {
      console.warn(`⚠️ Shift ${shift.id} sans heures définies, skip détection`);
      return anomaliesDetectees;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // �🟢 DÉTECTION À L'ARRIVÉE
    // ═══════════════════════════════════════════════════════════════════════════
    if (type === 'arrivee') {
      // Récupérer les pointages du jour pour détecter si c'est un retour de pause
      const { debutJournee, finJournee } = getWorkDayBounds();
      const pointagesDuJour = await prisma.pointage.findMany({
        where: {
          userId,
          horodatage: { gte: debutJournee, lt: finJournee }
        },
        orderBy: { horodatage: 'asc' }
      });
      
      // Compter les arrivées existantes (avant ce nouveau pointage)
      // ✅ CORRIGÉ: Utiliser les helpers centralisés pour gérer TOUTES les variantes
      const arrivees = filtrerEntrees(pointagesDuJour);
      const departs = filtrerSorties(pointagesDuJour);
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ☕ DÉTECTION PAUSE EXCESSIVE (retour de pause = 2ème arrivée)
      // ═══════════════════════════════════════════════════════════════════════════
      if (arrivees.length >= 1 && departs.length >= 1) {
        // C'est un retour de pause ! Calculer la durée de pause
        const dernierDepart = departs[departs.length - 1];
        const debutPause = new Date(dernierDepart.horodatage);
        const finPause = horodatage;
        const dureePauseReelleMinutes = Math.round((finPause - debutPause) / 60000);
        
        // Récupérer la durée de pause prévue depuis les gaps entre segments de travail
        let pausePrevueMinutes = 0; // ✅ FIX: 0 par défaut (pas de pause = pas de vérification)
        let hasPausePrevue = false;
        const segments = shift.segments || [];
        
        // Trier les segments de travail par heure de début pour trouver les gaps
        const workSegments = segments
          .filter(seg => !seg.isExtra && (seg.start || seg.debut) && (seg.end || seg.fin))
          .map(seg => ({
            start: seg.start || seg.debut,
            end: seg.end || seg.fin
          }))
          .sort((a, b) => a.start.localeCompare(b.start));
        
        if (workSegments.length >= 2) {
          // Calculer les gaps entre segments consécutifs (= pauses prévues)
          let totalPauseMinutes = 0;
          for (let gi = 0; gi < workSegments.length - 1; gi++) {
            const [endH, endM] = workSegments[gi].end.split(':').map(Number);
            const [startH, startM] = workSegments[gi + 1].start.split(':').map(Number);
            let gapMinutes = (startH * 60 + startM) - (endH * 60 + endM);
            // ✅ FIX: Gérer les gaps traversant minuit
            if (gapMinutes < 0) gapMinutes += 24 * 60;
            if (gapMinutes > 0) totalPauseMinutes += gapMinutes;
          }
          if (totalPauseMinutes > 0) {
            pausePrevueMinutes = totalPauseMinutes;
            hasPausePrevue = true;
          }
        } else {
          // Fallback: segment explicite de type pause (rare)
          const pauseSegment = segments.find(seg => {
            const segType = seg.type?.toLowerCase();
            return segType === 'pause' || segType === 'break';
          });
          if (pauseSegment) {
            const pauseStart = pauseSegment.start || pauseSegment.debut;
            const pauseEnd = pauseSegment.end || pauseSegment.fin;
            if (pauseStart && pauseEnd) {
              const [pStartH, pStartM] = pauseStart.split(':').map(Number);
              const [pEndH, pEndM] = pauseEnd.split(':').map(Number);
              pausePrevueMinutes = (pEndH * 60 + pEndM) - (pStartH * 60 + pStartM);
              if (pausePrevueMinutes > 0) hasPausePrevue = true;
            }
          } else if (shift.pauseDebut && shift.pauseFin) {
            const [pStartH, pStartM] = shift.pauseDebut.split(':').map(Number);
            const [pEndH, pEndM] = shift.pauseFin.split(':').map(Number);
            pausePrevueMinutes = (pEndH * 60 + pEndM) - (pStartH * 60 + pStartM);
            if (pausePrevueMinutes > 0) hasPausePrevue = true;
          }
        }
        
        // ✅ FIX: Si aucune pause prévue dans le shift (1 seul segment, pas de pause explicite),
        // ne PAS vérifier la pause. Un retour de pointage ne signifie pas forcément un retour de pause.
        if (!hasPausePrevue) {
          // Shift sans pause prévue → skip la détection pause_excessive
        } else {
        
        // Tolérance de 5 minutes
        const depassementMinutes = dureePauseReelleMinutes - pausePrevueMinutes;
        
        if (depassementMinutes > 5) {
          const heureDebutPause = debutPause.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
          const heureFinPause = finPause.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
          
          // Gravité selon le dépassement
          let gravite = 'moyenne';
          let emoji = '☕';
          if (depassementMinutes > 30) {
            gravite = 'haute';
            emoji = '⚠️☕';
          }
          if (depassementMinutes > 60) {
            gravite = 'critique';
            emoji = '🚨☕';
          }
          
          const anomalie = await creerAnomalieTempsReel({
            userId,
            shiftId: shift.id,
            type: 'pause_excessive',
            gravite,
            description: `${emoji} Pause excessive de ${depassementMinutes} min - Durée réelle ${dureePauseReelleMinutes}min (${heureDebutPause}-${heureFinPause}) au lieu de ${pausePrevueMinutes}min prévues`,
            date: new Date(dateJour)
          });
          
          if (anomalie) {
            anomaliesDetectees.push({
              type: 'pause_excessive',
              message: `${emoji} Pause prolongée de ${depassementMinutes} min`,
              detail: `${dureePauseReelleMinutes}min au lieu de ${pausePrevueMinutes}min`,
              gravite,
              icon: emoji
            });
          }
        }
        } // fin else hasPausePrevue
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ⏰ DÉTECTION RETARD (uniquement pour la 1ère arrivée)
      // NOTE: Les retards ne créent plus d'anomalies - pratique standard SIRH
      // Ils sont comptabilisés dans le score de ponctualité et affichés visuellement
      // EXCEPTION: Arrivée très en avance = heures sup potentielles à valider
      // ═══════════════════════════════════════════════════════════════════════════
      if (arrivees.length === 0) {
        const [heureDebut, minuteDebut] = shiftHours.heureDebut.split(':').map(Number);
        // ✅ FIX: Comparer en minutes Paris au lieu de setHours (UTC sur le serveur Render)
        const pointageMinutesParis = horodatageToParisMinutes(horodatage);
        const shiftDebutMinutes = heureDebut * 60 + minuteDebut;
        // diffMinutes: négatif = en avance, positif = en retard
        let diffMinutes = pointageMinutesParis - shiftDebutMinutes;
        // Gérer le passage minuit (si pointage post-minuit pour shift pré-minuit)
        if (diffMinutes > 720) diffMinutes -= 1440;
        if (diffMinutes < -720) diffMinutes += 1440;
      
        // 📍 Arrivée très en avance (≥45 min) - EXTRA POTENTIEL
        // Seuil 45 min : en dessous on ne paie pas d'extra
        if (diffMinutes <= -45) {
          const avanceMinutes = Math.abs(diffMinutes);
          const avanceHeures = Math.floor(avanceMinutes / 60);
          const avanceMin = avanceMinutes % 60;
          const tempsExtra = avanceHeures > 0 
            ? (avanceMin > 0 ? `${avanceHeures}h${avanceMin}min` : `${avanceHeures}h`)
            : `${avanceMinutes}min`;
          
          const anomalie = await creerAnomalieTempsReel({
            userId,
            shiftId: shift.id,
            type: 'extra_potentiel',
            gravite: 'a_valider',
            description: `Arrivée ${tempsExtra} en avance - Extra potentiel à valider (${heurePointageStr} au lieu de ${shiftHours.heureDebut})`,
            date: new Date(dateJour)
          });
          
          if (anomalie) {
            anomaliesDetectees.push({
              type: 'extra_potentiel',
              message: `⏱️ Arrivée ${tempsExtra} en avance`,
              detail: `Extra potentiel - Shift prévu à ${shiftHours.heureDebut}`,
              gravite: 'a_valider',
              icon: '⏱️'
            });
          }
        }
        
        // ⏰ Retard modéré (5-30 min) - Info seulement, pas d'anomalie
        else if (diffMinutes >= 5 && diffMinutes < 30) {
          anomaliesDetectees.push({
            type: 'retard_modere',
            message: `⏰ Retard de ${diffMinutes} minutes`,
            detail: `Arrivée à ${heurePointageStr} au lieu de ${shiftHours.heureDebut}`,
            gravite: 'info',
            icon: '⏰'
          });
        }
      
        // 🔴 Retard critique (>30 min) - Info seulement, pas d'anomalie
        else if (diffMinutes >= 30) {
          anomaliesDetectees.push({
            type: 'retard_critique',
            message: `🔴 Retard critique de ${diffMinutes} minutes`,
            detail: `Arrivée à ${heurePointageStr} au lieu de ${shiftHours.heureDebut}`,
            gravite: 'attention',
            icon: '🔴'
          });
        }
      } // Fin du bloc if (arrivees.length === 0)
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔴 DÉTECTION AU DÉPART
    // ═══════════════════════════════════════════════════════════════════════════
    if (type === 'depart') {
      const [heureFin, minuteFin] = shiftHours.heureFin.split(':').map(Number);
      // ✅ FIX: Comparer en minutes Paris au lieu de setHours (UTC sur le serveur Render)
      const pointageMinutesParis = horodatageToParisMinutes(horodatage);
      const shiftFinMinutes = heureFin * 60 + minuteFin;
      // diffMinutes: positif = parti avant la fin, négatif = parti après la fin  
      let diffMinutes = shiftFinMinutes - pointageMinutesParis;
      // Gérer le passage minuit (shift finit à 00:00 = 0, pointage à 23:50 = 1430)
      if (diffMinutes > 720) diffMinutes -= 1440;
      if (diffMinutes < -720) diffMinutes += 1440;
      
      // 🚪 Départ anticipé modéré (15-60 min avant) - Info seulement, pas d'anomalie
      // NOTE: Les départs anticipés ne créent plus d'anomalies - pratique standard SIRH
      if (diffMinutes >= 15 && diffMinutes < 60) {
        anomaliesDetectees.push({
          type: 'depart_anticipe',
          message: `🚪 Départ anticipé de ${diffMinutes} min`,
          detail: `Sortie à ${heurePointageStr} au lieu de ${shiftHours.heureFin}`,
          gravite: 'info',
          icon: '🚪'
        });
      }
      
      // 🚨 Départ prématuré critique (>60 min avant) - Info seulement, pas d'anomalie
      else if (diffMinutes >= 60) {
        anomaliesDetectees.push({
          type: 'depart_premature_critique',
          message: `🚨 Départ critique ${diffMinutes} min avant la fin`,
          detail: `Sortie à ${heurePointageStr} au lieu de ${shiftHours.heureFin}`,
          gravite: 'attention',
          icon: '🚨'
        });
      }
      
      // 📍 Départ très tardif (≥45 min après) - Extra potentiel à valider
      // Seuil 45 min : en dessous on ne paie pas d'extra
      else if (diffMinutes <= -45) {
        const depassementMinutes = Math.abs(diffMinutes);
        const depassementHeures = Math.floor(depassementMinutes / 60);
        const depassementMin = Math.round(depassementMinutes - (depassementHeures * 60));
        const tempsExtra = depassementHeures > 0 
          ? (depassementMin > 0 ? `${depassementHeures}h${depassementMin}min` : `${depassementHeures}h`)
          : `${depassementMinutes}min`;
        
        // ✅ Créer anomalie extra_potentiel
        const anomalie = await creerAnomalieTempsReel({
          userId,
          shiftId: shift.id,
          type: 'extra_potentiel',
          gravite: 'a_valider',
          description: `Départ ${tempsExtra} après la fin - Extra potentiel à valider (${heurePointageStr} au lieu de ${shiftHours.heureFin})`,
          date: new Date(dateJour)
        });
        
        if (anomalie) {
          anomaliesDetectees.push({
            type: 'extra_potentiel',
            message: `⏱️ Départ ${tempsExtra} après la fin`,
            detail: `Extra potentiel à valider`,
            gravite: 'a_valider',
            icon: '⏱️'
          });
        }
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ☕ VÉRIFICATION PAUSE AU DÉPART (si shift avec pause)
      // ═══════════════════════════════════════════════════════════════════════════
      if (shift.pauseDebut && shift.pauseFin) {
        // Récupérer tous les pointages du jour
        const { debutJournee, finJournee } = getWorkDayBounds();
        const pointagesDuJour = await prisma.pointage.findMany({
          where: {
            userId,
            horodatage: { gte: debutJournee, lt: finJournee }
          },
          orderBy: { horodatage: 'asc' }
        });
        
        // Vérifier si pause prise (au moins 2 paires de pointages)
        // ✅ CORRIGÉ: Utiliser les helpers centralisés pour gérer TOUTES les variantes
        let paires = 0;
        for (let i = 0; i < pointagesDuJour.length - 1; i++) {
          if (isEntree(pointagesDuJour[i].type) && isSortie(pointagesDuJour[i + 1].type)) {
            paires++;
          }
        }
        
        if (paires < 2) {
          // Calculer le temps de travail continu
          // ✅ CORRIGÉ: Utiliser les helpers centralisés pour trouver l'entrée
          const entrees = filtrerEntrees(pointagesDuJour);
          const premiereArrivee = entrees.length > 0 ? entrees[0] : null;
          if (premiereArrivee) {
            const heuresTravail = (horodatage - new Date(premiereArrivee.horodatage)) / 3600000;
            
            if (heuresTravail > 6) {
              // Pause non prise
              const anomalie = await creerAnomalieTempsReel({
                userId,
                shiftId: shift.id,
                type: 'pause_non_prise',
                gravite: 'haute',
                description: `Pause non prise - ${heuresTravail.toFixed(1)}h de travail continu (pause prévue ${shift.pauseDebut}-${shift.pauseFin})`,
                date: new Date(dateJour)
              });
              
              if (anomalie) {
                anomaliesDetectees.push({
                  type: 'pause_non_prise',
                  message: `☕ Pause non prise !`,
                  detail: `${heuresTravail.toFixed(1)}h de travail continu`,
                  gravite: 'haute',
                  icon: '☕'
                });
              }
              
              // Violation Code du travail (>6h)
              const anomalie2 = await creerAnomalieTempsReel({
                userId,
                shiftId: shift.id,
                type: 'depassement_amplitude',
                gravite: 'critique',
                description: `⚠️ Violation code du travail - ${heuresTravail.toFixed(1)}h de travail continu sans pause (max légal: 6h)`,
                date: new Date(dateJour)
              });
              
              if (anomalie2) {
                anomaliesDetectees.push({
                  type: 'depassement_amplitude',
                  message: `⚠️ Violation Code du travail`,
                  detail: `>${Math.floor(heuresTravail)}h sans pause (max 6h)`,
                  gravite: 'critique',
                  icon: '⚠️'
                });
              }
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ [TEMPS RÉEL] Erreur détection anomalie:', error);
  }
  
  return anomaliesDetectees;
}

/**
 * Crée une anomalie en base (évite les doublons)
 */
async function creerAnomalieTempsReel({ userId, shiftId, type, gravite, description, date }) {
  try {
    // ✅ FIX: Utiliser les bornes business day Paris (pas setHours en UTC)
    // La date passée est déjà le jour business correct (via getBusinessDay)
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const { start: dateDebut, end: dateFin } = getBusinessDayBoundsUTC(dateStr);
    
    const existante = await prisma.anomalie.findFirst({
      where: {
        employeId: userId,
        type,
        date: {
          gte: dateDebut,
          lt: dateFin
        }
      }
    });
    
    if (existante) {
      return null;
    }
    
    // Midi Paris pour la date de l'anomalie (11:00 UTC = 12:00 Paris hiver)
    const dateAnomalie = new Date(`${dateStr}T11:00:00.000Z`);
    
    const anomalie = await prisma.anomalie.create({
      data: {
        employeId: userId,
        type,
        gravite,
        description,
        date: dateAnomalie,
        statut: 'en_attente'
      }
    });
    
    return anomalie;
    
  } catch (error) {
    console.error('❌ [TEMPS RÉEL] Erreur création anomalie:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════

// 👤 Mes pointages
router.get('/mes-pointages', authenticateToken, getMesPointages);

// 📅 Mes pointages du jour actuel uniquement
router.get('/mes-pointages-aujourdhui', authenticateToken, getMesPointagesAujourdhui);

// 🔧 Pointage manuel (pour tests) - Admin uniquement
router.post('/manuel', authenticateToken, isAdmin, enregistrerPointage);

// 👨‍💼 Admin : pointages d’un jour
router.get('/admin/pointages/jour/:date', authenticateToken, isAdmin, getPointagesParJour);

// 🔁 Pointage automatique avec max 2 blocs (arrivee → depart → arrivee → depart)
// NOUVELLE LOGIQUE : Gère le travail de nuit + validations de sécurité
router.post('/auto', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 📋 Récupérer les infos de l'employé pour la réponse
    const employe = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, prenom: true, nom: true, email: true }
    });
    
    if (!employe) {
      return res.status(404).json({ message: "Employé non trouvé" });
    }
    
    // 🧪 MODE TEST: Uniquement en développement et pour les admins
    const testTime = req.body?.testTime;
    const offlineTimestamp = req.body?.offlineTimestamp;
    
    let maintenant = new Date();
    
    if (testTime) {
      // 🔒 SÉCURITÉ: testTime autorisé UNIQUEMENT en dev + admin
      const isDev = process.env.NODE_ENV !== 'production';
      const isAdmin = req.user.role === 'admin';
      if (isDev && isAdmin) {
        maintenant = new Date(testTime);
        console.warn(`[POINTAGE] ⚠️ testTime utilisé par admin ${userId}: ${testTime}`);
      } else {
        console.warn(`[POINTAGE] 🚫 testTime rejeté (env=${process.env.NODE_ENV}, role=${req.user.role})`);
        // Ignoré silencieusement — on utilise l'heure réelle
      }
    } else if (offlineTimestamp) {
      // 📴 MODE HORS-LIGNE: max 30 minutes de retard
      const offlineTime = new Date(offlineTimestamp);
      const ageMs = Date.now() - offlineTime.getTime();
      const MAX_OFFLINE_MS = 30 * 60 * 1000; // 30 minutes
      
      if (ageMs < 0) {
        // Timestamp dans le futur → rejeté
        console.warn(`[POINTAGE] 🚫 offlineTimestamp dans le futur rejeté (user ${userId})`);
      } else if (ageMs > MAX_OFFLINE_MS) {
        // Trop ancien → rejeté, on utilise l'heure actuelle
        console.warn(`[POINTAGE] 🚫 offlineTimestamp trop ancien (${Math.round(ageMs / 60000)} min, max 30 min) pour user ${userId}`);
      } else {
        maintenant = offlineTime;
      }
    }

    // 🛡️ Validations de sécurité
    if (!userId || userId <= 0) {
      return res.status(400).json({ message: "UserId invalide" });
    }

    // Utiliser la configuration centralisée (basée sur l'heure simulée si mode test)
    const { debutJournee, finJournee } = getWorkDayBounds(maintenant);

    const pointagesDuJour = await prisma.pointage.findMany({
      where: {
        userId,
        horodatage: { 
          gte: debutJournee,
          lt: finJournee 
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    const dernier = pointagesDuJour[pointagesDuJour.length - 1];

    // 🔢 Compter le nombre de paires "arrivee → depart"
    // ✅ CORRIGÉ: Utiliser les helpers centralisés pour gérer TOUTES les variantes
    let paires = 0;
    for (let i = 0; i < pointagesDuJour.length - 1; i++) {
      if (
        isEntree(pointagesDuJour[i].type) &&
        isSortie(pointagesDuJour[i + 1].type)
      ) {
        paires++;
      }
    }

    // 🔒 Si déjà 2 paires → journée terminée
    if (paires >= 2) {
      return res.status(400).json({ message: "Vous avez terminé votre journée (2 blocs max)." });
    }

    // ✅ Déduction du prochain type - UTILISER LES TYPES CANONIQUES
    let type = null;

    if (!dernier) {
      type = TYPE_CANONIQUE_ENTREE;
    } else if (isEntree(dernier.type)) {
      type = TYPE_CANONIQUE_SORTIE;
    } else if (isSortie(dernier.type)) {
      type = TYPE_CANONIQUE_ENTREE;
    }

    if (!type) {
      return res.status(400).json({ message: "Pointage impossible à déterminer." });
    }

    // 🛡️ Protection anti-doublon renforcée
    // DÉSACTIVÉ en mode test pour permettre les simulations rapides
    if (!testTime) {
      // 🚫 SÉCURITÉ : Rejeter les pointages futurs (au-delà de 1 minute)
      const now = new Date();
      const limiteFutur = new Date(now.getTime() + 60000); // +1 minute
      if (maintenant > limiteFutur) {
        return res.status(400).json({ 
          message: "Pointage refusé : date dans le futur",
          details: "Vérifiez l'horloge de votre appareil"
        });
      }
    
      // Protection anti-spam : 2 minutes entre chaque pointage (TOUS types confondus)
      // Empêche le double/triple-tap accidentel sur la tablette
      const limiteAntiDoublon = new Date(now.getTime() - 120000); // 2 minutes avant

      const pointageRecent = await prisma.pointage.findFirst({
        where: {
          userId,
          horodatage: {
            gte: limiteAntiDoublon
          }
        }
      });

      if (pointageRecent) {
        return res.status(409).json({ 
          message: "Veuillez patienter",
          details: `Un pointage a déjà été enregistré il y a moins de 2 minutes. Patientez avant de rebadger.`
        });
      }
    }

    // 🔒 Mutex par userId : empêche les requêtes simultanées (triple-tap tablette)
    await acquireUserLock(userId);
    let nouveau;
    try {
      nouveau = await prisma.pointage.create({
        data: {
          userId,
          type,
          horodatage: maintenant
        }
      });
    } finally {
      releaseUserLock(userId);
    }

    // 🔥 DÉTECTION TEMPS RÉEL - Best practice apps RH pro
    // Analyse immédiate au moment du pointage (comme Factorial, PayFit, Lucca)
    const anomaliesDetectees = await detecterAnomaliesTempsReel(userId, type, maintenant);

    // ✅ AUTO-RÉSOLUTION: Si c'est un départ, résoudre les anomalies missing_out existantes
    // Car le scheduler peut les créer dès la fin du shift (avant que l'employé ait pointé sa sortie)
    if (isSortie(type)) {
      try {
        const businessDay = getBusinessDay(maintenant);
        const { start: dayStart, end: dayEnd } = getBusinessDayBoundsUTC(businessDay);
        
        const anomaliesResolues = await prisma.anomalie.updateMany({
          where: {
            employeId: userId,
            type: { in: ['missing_out', 'missing_out_prolonge'] },
            statut: 'en_attente',
            date: {
              gte: dayStart,
              lt: dayEnd
            }
          },
          data: {
            statut: 'auto_resolue',
            commentaire: `Auto-résolu: sortie pointée à ${maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`,
            traiteAt: new Date()
          }
        });
        
        if (anomaliesResolues.count > 0) {
          console.log(`✅ [AUTO-RÉSOLUTION] ${anomaliesResolues.count} anomalie(s) missing_out résolue(s) pour employé ${userId}`);
        }
      } catch (resolveErr) {
        console.error('⚠️ [AUTO-RÉSOLUTION] Erreur:', resolveErr.message);
        // Non bloquant - le pointage est déjà enregistré
      }
    }

    // 🎯 SCORING - Attribuer/retirer des points selon ponctualité
    if (isEntree(type)) {
      try {
        // Utiliser le jour business Paris (pas UTC) pour trouver le bon shift
        const businessDay = getBusinessDay(maintenant);
        const shift = await prisma.shift.findFirst({
          where: { employeId: userId, date: new Date(businessDay + 'T00:00:00.000Z') }
        });
        if (shift && shift.segments && shift.segments.length > 0) {
          // Heure Paris du pointage pour le scoring
          const parisMinutes = horodatageToParisMinutes(maintenant);
          const heurePointage = `${String(Math.floor(parisMinutes / 60)).padStart(2, '0')}:${String(parisMinutes % 60).padStart(2, '0')}`;
          await scoringService.onPointage(
            { id: nouveau.id, employe_id: userId, type, heure: heurePointage, date: businessDay },
            { start: shift.segments[0].start, end: shift.segments[0].end }
          );
        }
      } catch (scoringErr) {
        // Non bloquant
      }
    }

    res.status(201).json({
      message: `✅ ${type === TYPE_CANONIQUE_ENTREE ? 'Arrivée' : 'Départ'} enregistré`,
      pointage: nouveau,
      employe: {
        id: employe.id,
        prenom: employe.prenom,
        nom: employe.nom
      },
      anomalies: anomaliesDetectees // Feedback immédiat à l'employé
    });
  } catch (err) {
    console.error("Erreur pointage auto :", err);
    
    // Gestion spécifique des erreurs de contraintes
    if (err.code === 'P2002') {
      return res.status(409).json({ 
        message: "Pointage en doublon détecté",
        details: "Ce pointage a déjà été enregistré"
      });
    }
    
    res.status(500).json({ message: "Erreur serveur dans le pointage automatique." });
  }
});

// 🧮 CALCUL DU TEMPS TOTAL TRAVAILLÉ AUJOURD'HUI
// NOUVELLE LOGIQUE : Gère le travail de nuit (ex: 22h - 06h du lendemain)
router.get('/total-aujourdhui', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Utiliser la configuration centralisée
    const { debutJournee, finJournee } = getWorkDayBounds();

    const pointages = await prisma.pointage.findMany({
      where: {
        userId,
        horodatage: { 
          gte: debutJournee,
          lt: finJournee 
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    let totalMinutes = 0;
    let pairesValides = 0;

    for (let i = 0; i < pointages.length - 1; i++) {
      const debut = pointages[i];
      const fin = pointages[i + 1];

      // ✅ CORRIGÉ: Utiliser les helpers centralisés pour gérer TOUTES les variantes
      const estDebut = isEntree(debut.type);
      const estFin = isSortie(fin.type);

      if (estDebut && estFin) {
        const debutTime = new Date(debut.horodatage);
        const finTime = new Date(fin.horodatage);

        const diffMinutes = Math.floor((finTime - debutTime) / 60000); // 1 min = 60000 ms
        if (diffMinutes > 0) {
          totalMinutes += diffMinutes;
          pairesValides++;
        }
        i++; // on saute l'élément suivant (déjà utilisé comme "fin")
      }
    }

    const totalHeures = Math.round((totalMinutes / 60) * 100) / 100; // ex : 7.5

    res.json({
      totalHeures,
      pairesValides,
      pointagesCount: pointages.length,
      periodeJournee: {
        debut: debutJournee,
        fin: finJournee
      }
    });
  } catch (err) {
    console.error("Erreur calcul total heures :", err);
    res.status(500).json({ message: "Erreur serveur lors du calcul des heures." });
  }
});

// 🗑️ Supprimer un pointage erroné (Admin uniquement)
router.delete('/delete-error', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { employeId, date, reason } = req.body;

    // Valider les paramètres
    if (!employeId || !date || !reason) {
      return res.status(400).json({ 
        message: "Paramètres manquants: employeId, date et reason sont requis" 
      });
    }

    // Convertir la date pour la recherche (début et fin de journée + post-minuit)
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    // Bornes jour business (05:00 → 04:59 J+1)
    const { end: endOfDay } = getBusinessDayBoundsUTC(date);

    // Chercher les pointages de l'employé pour cette date
    const pointagesToDelete = await prisma.pointage.findMany({
      where: {
        userId: parseInt(employeId),
        horodatage: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (pointagesToDelete.length === 0) {
      return res.status(404).json({ 
        message: "Aucun pointage trouvé pour cet employé à cette date" 
      });
    }

    // Supprimer tous les pointages de cette date pour cet employé
    const deleteResult = await prisma.pointage.deleteMany({
      where: {
        userId: parseInt(employeId),
        horodatage: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    // Optionnel: Logger l'action admin
    try {
      await prisma.logAdmin.create({
        data: {
          adminId: req.user.userId,
          action: 'DELETE_POINTAGE_ERROR',
          details: JSON.stringify({
            employeId: parseInt(employeId),
            date: date,
            reason: reason,
            deletedCount: deleteResult.count,
            timestamp: new Date().toISOString()
          })
        }
      });
    } catch (logError) {
      console.warn('⚠️ Impossible de logger l\'action admin:', logError.message);
      // Ne pas faire échouer la suppression si le log échoue
    }

    res.json({
      success: true,
      message: `${deleteResult.count} pointage(s) supprimé(s) avec succès`,
      deletedCount: deleteResult.count,
      reason: reason
    });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression du pointage:', error);
    res.status(500).json({ 
      message: "Erreur serveur lors de la suppression du pointage"
    });
  }
});

module.exports = router;
