// server/services/anomalyScheduler.js
/**
 * Service de détection automatique des anomalies en temps réel
 * 
 * Architecture "Event-Driven" - Coût ZÉRO :
 * - Vérifie toutes les minutes les shifts qui viennent de se terminer
 * - Crée automatiquement les anomalies d'absence
 * - Ultra-léger : 1 requête SQL/minute
 * - Rappel congés : vérifie à 9h les demandes en attente > 48h
 * 
 * ⚠️ TIMEZONE: Toutes les heures sont en Europe/Paris
 * Le serveur peut être en UTC (cloud) mais on force Paris partout
 */

const prisma = require('../prisma/client');
const congeReminderService = require('./congeReminderService');
const { isEntree, isSortie, filtrerEntrees, filtrerSorties } = require('../utils/pointageTypeUtils');
const { parseSegments } = require('../utils/segmentUtils');
const { getBusinessDayBoundsUTC: getBusinessBounds, BUSINESS_DAY_CUTOFF_HOUR, isShiftTardifOuNuit: isShiftTardif } = require('../utils/businessDayUtils');

// ═══════════════════════════════════════════════════════════════════════════════
// 🕐 UTILITAIRES TIMEZONE - Europe/Paris
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtient la date/heure actuelle en timezone Paris
 * @returns {Object} { date: Date, dateStr: 'YYYY-MM-DD', hour: number, minute: number, timeStr: 'HH:MM' }
 */
function getParisTime() {
  const now = new Date();
  
  // Formater en Paris pour obtenir les composants
  const parisFormatter = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = parisFormatter.formatToParts(now);
  const get = (type) => parts.find(p => p.type === type)?.value;
  
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = parseInt(get('hour'), 10);
  const minute = parseInt(get('minute'), 10);
  
  return {
    date: now,
    dateStr: `${year}-${month}-${day}`,
    hour,
    minute,
    timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  };
}

// Wrapper pour compatibilité (utilise le module centralisé)
function getParisDateBoundsUTC(dateStr) {
  const { start: startUTC, end: endUTC } = getBusinessBounds(dateStr);
  return { startUTC, endUTC };
}

/**
 * Convertit une heure HH:MM Paris en minutes depuis minuit
 * @param {string} timeStr - Heure au format 'HH:MM'
 * @returns {number} Minutes depuis minuit
 */
function parisTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// ═══════════════════════════════════════════════════════════════════════════════

class AnomalyScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.lastCheck = null;
    this.checkIntervalMs = 60 * 1000; // 1 minute
  }

  /**
   * Démarre le scheduler
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Rattrapage immédiat : vérifier TOUS les shifts terminés du jour
    this.catchUpMissedShifts();

    // Puis vérification régulière toutes les minutes
    this.intervalId = setInterval(() => {
      this.checkEndedShifts();
      
      // 📧 Vérifier les rappels de congés en attente (s'exécute uniquement à 9h)
      congeReminderService.checkAndSendReminders();
    }, this.checkIntervalMs);
  }

  /**
   * Arrête le scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Vérifie les shifts qui viennent de se terminer (dans la dernière minute)
   * et crée les anomalies d'absence si nécessaire
   * 
   * ⚠️ TIMEZONE: Utilise Europe/Paris pour toutes les comparaisons
   * ⚠️ JOURNÉE DE TRAVAIL: 06:00 → 06:00+1 (si avant 6h = journée de la veille)
   */
  async checkEndedShifts() {
    // 🕐 UTILISER L'HEURE PARIS (pas l'heure serveur!)
    const paris = getParisTime();
    let today = paris.dateStr;
    const currentHour = paris.hour;
    const currentMinute = paris.minute;
    const currentTimeStr = paris.timeStr;
    
    // 🆕 LOGIQUE JOURNÉE DE TRAVAIL 6h-6h
    // Si on est entre 00:00 et 06:00, c'est encore la journée de travail de la VEILLE
    let currentMinutes = currentHour * 60 + currentMinute;
    if (currentHour < BUSINESS_DAY_CUTOFF_HOUR) {
      // Calculer la date de la veille
      const hier = new Date();
      hier.setDate(hier.getDate() - 1);
      const yyyy = hier.getFullYear();
      const mm = String(hier.getMonth() + 1).padStart(2, '0');
      const dd = String(hier.getDate()).padStart(2, '0');
      today = `${yyyy}-${mm}-${dd}`;
      
      // Ajuster currentMinutes : 00:30 = 24h30 = 1470 minutes depuis 00:00 de la veille
      currentMinutes = 24 * 60 + currentHour * 60 + currentMinute;
      
    }

    this.lastCheck = new Date();

    try {
      // 🕐 Calculer les bornes UTC pour la journée Paris
      const { startUTC, endUTC } = getParisDateBoundsUTC(today);
      
      // Récupérer tous les shifts de travail du jour
      // ✅ Chercher par date EXACTE (les shifts sont stockés à 00:00Z, pas dans les bounds 04:00Z)
      const shiftsToday = await prisma.shift.findMany({
        where: {
          date: new Date(`${today}T00:00:00.000Z`),
          type: { in: ['travail', 'présence', 'presence'] }
        },
        include: {
          employe: {
            select: { id: true, nom: true, prenom: true, statut: true }
          }
        }
      });

      let anomaliesCreees = 0;

      for (const shift of shiftsToday) {
        // Ignorer les employés inactifs
        if (shift.employe?.statut !== 'actif') continue;

        // Vérifier les segments de travail
        const segments = parseSegments(shift.segments);
        
        // 🆕 Séparer segments NORMAUX et segments EXTRA
        // Les segments extra sont des heures "au noir" - pas de génération d'anomalie absence
        const workSegments = segments.filter(seg => {
          const segType = seg.type?.toLowerCase();
          return segType !== 'pause' && segType !== 'break' && !seg.isExtra;
        });
        
        // Segments extra uniquement (pour info)
        const extraSegments = segments.filter(seg => seg.isExtra === true);

        // Si UNIQUEMENT des segments extra, pas d'anomalie absence à vérifier
        // (l'employé viendra s'il veut pour ses heures au noir)
        if (!workSegments.length && extraSegments.length > 0) {
          // Shift 100% extra - pas de vérification d'absence
          continue;
        }
        
        if (!workSegments.length) continue;

        // Trouver l'heure de fin du dernier segment de travail
        const lastSegment = workSegments[workSegments.length - 1];
        const shiftEnd = lastSegment.end || lastSegment.fin;

        if (!shiftEnd) continue;

        // Vérifier si le shift vient de se terminer (dans les 2 dernières minutes)
        const [endH, endM] = shiftEnd.split(':').map(Number);
        const shiftEndMinutes = endH * 60 + endM;
        // currentMinutes déjà calculé au début (avec ajustement si après minuit)
        const minutesSinceEnd = currentMinutes - shiftEndMinutes;

        // Le shift s'est terminé dans les 2 dernières minutes
        if (minutesSinceEnd >= 0 && minutesSinceEnd <= 2) {
          await this.checkForAbsence(shift, today);
          anomaliesCreees++;
        }
      }

      // Vérifier les pointages sans shift toutes les 5 minutes
      if (currentMinute % 5 === 0) {
        await this.checkPointagesSansShift(today);
      }
      
      // 🆕 Vérifier les employés "en cours" après fin de shift (toutes les 10 minutes)
      if (currentMinute % 10 === 0) {
        await this.checkEmployesEnCours(today, currentMinutes);
      }
      
      // 🆕 À 06:00 : clôturer la journée de travail précédente
      if (currentHour === 6 && currentMinute === 0) {
        await this.clotureJourneeTravail();
      }

    } catch (error) {
      console.error('❌ [SCHEDULER] Erreur lors de la vérification:', error.message);
    }
  }

  /**
   * Vérifie si un employé a pointé pour son shift et crée une anomalie si absent
   * 
   * ⚠️ TIMEZONE: Utilise Europe/Paris
   */
  async checkForAbsence(shift, dateStr) {
    const employeId = shift.employeId;

    // 🕐 Calculer les bornes UTC pour la journée Paris
    const { startUTC, endUTC } = getParisDateBoundsUTC(dateStr);

    // Détecter si le shift a des segments de nuit (end < start) OU finit tard (≥20h)
    const segments = parseSegments(shift.segments);
    const hasNightOrLateSegment = segments.some(seg => {
      if (!seg.start && !seg.debut) return false;
      if (!seg.end && !seg.fin) return false;
      const startStr = seg.start || seg.debut;
      const endStr = seg.end || seg.fin;
      const [sh] = startStr.split(':').map(Number);
      const [eh] = endStr.split(':').map(Number);
      return eh < sh || eh >= 20 || sh >= 20; // Night shift OU shift tardif
    });

    // Étendre la fenêtre de +6h pour les shifts de nuit/tardifs (sortie post-minuit)
    const endUTCEffective = hasNightOrLateSegment
      ? new Date(endUTC.getTime() + 6 * 60 * 60 * 1000)
      : endUTC;

    // Vérifier s'il y a eu au moins un pointage d'entrée aujourd'hui
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employeId,
        horodatage: {
          gte: startUTC,
          lt: endUTCEffective
        }
      },
      orderBy: { horodatage: 'asc' }
    });

    // ✅ CORRIGÉ: Utiliser les helpers centralisés pour gérer TOUTES les variantes de types
    const entrees = filtrerEntrees(pointages);
    const sorties = filtrerSorties(pointages);

    // Récupérer les heures prévues du shift
    // (segments déjà parsés ci-dessus)
    
    // 🆕 IMPORTANT: Séparer segments NORMAUX et EXTRA
    // Les segments extra (isExtra=true) sont des heures "au noir"
    // → Pas d'anomalie absence si l'employé ne vient pas pour un extra
    // → Mais vérifier retard/départ anticipé si l'employé pointe pour un extra
    const workSegments = segments.filter(seg => {
      const segType = seg.type?.toLowerCase();
      return segType !== 'pause' && segType !== 'break' && !seg.isExtra;
    });
    
    const extraSegments = segments.filter(seg => seg.isExtra === true);
    const hasOnlyExtras = workSegments.length === 0 && extraSegments.length > 0;

    // 🆕 Si le shift n'a que des segments extra, utiliser ceux-là pour les horaires
    // mais ne PAS générer d'anomalie absence (c'est optionnel)
    const effectiveSegments = workSegments.length > 0 ? workSegments : extraSegments;
    const firstSegment = effectiveSegments[0];
    const lastSegment = effectiveSegments[effectiveSegments.length - 1];
    const shiftStart = firstSegment?.start || firstSegment?.debut || null;
    const shiftEnd = lastSegment?.end || lastSegment?.fin || null;

    // ===== CAS 1: ABSENCE TOTALE =====
    if (entrees.length === 0) {
      // 🆕 NE PAS créer d'anomalie absence si UNIQUEMENT des segments extra
      // L'employé n'est pas obligé de venir pour ses heures "au noir"
      if (hasOnlyExtras) {
        return;
      }
      
      await this.createAnomalieIfNotExists(employeId, dateStr, 'absence_injustifiee', {
        gravite: 'critique',
        shiftId: shift.id,
        heurePrevueDebut: shiftStart,
        heurePrevueFin: shiftEnd,
        pointagesJour: 0,
        description: `Absence non justifiée - Aucun pointage pour le shift ${shiftStart} - ${shiftEnd}`
      });
      return;
    }

    // ===== CAS 2: RETARD - INDICATEUR SEULEMENT (stats ponctualité) =====
    // Les retards ne créent pas d'anomalies - affichés sur le planning

    // ===== CAS 2b: ARRIVÉE TRÈS EN AVANCE (≥45 min) - HEURES SUP À VALIDER =====
    if (entrees.length > 0 && shiftStart) {
      const premiereEntree = new Date(entrees[0].horodatage);
      const [startH, startM] = shiftStart.split(':').map(Number);
      const shiftStartMinutes = startH * 60 + startM;
      const entreeMinutes = premiereEntree.getHours() * 60 + premiereEntree.getMinutes();
      const avanceMinutes = shiftStartMinutes - entreeMinutes;
      
      // Seuil 45 min : en dessous on ne paie pas d'extra
      if (avanceMinutes >= 45) {
        const avanceHeures = Math.floor(avanceMinutes / 60);
        const avanceMin = avanceMinutes % 60;
        const tempsExtra = avanceHeures > 0 
          ? (avanceMin > 0 ? `${avanceHeures}h${avanceMin}min` : `${avanceHeures}h`)
          : `${avanceMinutes}min`;
        const heurePointage = `${String(premiereEntree.getHours()).padStart(2,'0')}:${String(premiereEntree.getMinutes()).padStart(2,'0')}`;
        
        await this.createAnomalieIfNotExists(employeId, dateStr, 'extra_potentiel', {
          gravite: 'a_valider',
          shiftId: shift.id,
          heurePrevueDebut: shiftStart,
          heureReelleArrivee: heurePointage,
          minutesEnAvance: avanceMinutes,
          raison: 'arrivee_avance',
          description: `Arrivée ${tempsExtra} en avance - Extra potentiel à valider (${heurePointage} au lieu de ${shiftStart})`
        });
      }
    }

    // ===== CAS 3: MISSING OUT (entrée sans sortie) =====
    if (entrees.length > sorties.length) {
      await this.createAnomalieIfNotExists(employeId, dateStr, 'missing_out', {
        gravite: 'moyenne',
        shiftId: shift.id,
        heurePrevueFin: shiftEnd,
        derniereEntree: entrees[entrees.length - 1].horodatage,
        description: `Sortie manquante - Pointage d'entrée sans pointage de sortie`
      });
    }

    // ===== CAS 3b: MISSING IN (sortie sans entrée) =====
    if (sorties.length > entrees.length) {
      await this.createAnomalieIfNotExists(employeId, dateStr, 'missing_in', {
        gravite: 'moyenne',
        shiftId: shift.id,
        heurePrevueDebut: shiftStart,
        premiereSortie: sorties[0].horodatage,
        description: `Entrée manquante - Pointage de sortie sans pointage d'entrée préalable`
      });
    }

    // ===== CAS 4: DÉPART ANTICIPÉ - INDICATEUR SEULEMENT (stats) =====
    // Les départs anticipés ne créent pas d'anomalies - affichés sur le planning
    
    // ===== CAS 5: DÉPART TRÈS TARDIF (≥45 min) - HEURES SUP À VALIDER =====
    if (sorties.length > 0 && shiftEnd) {
      const derniereSortie = new Date(sorties[sorties.length - 1].horodatage);
      const [endH, endM] = shiftEnd.split(':').map(Number);
      const shiftEndMinutes = endH * 60 + endM;
      const sortieMinutes = derniereSortie.getHours() * 60 + derniereSortie.getMinutes();
      const retardMinutes = sortieMinutes - shiftEndMinutes;
      
      // Seuil 45 min : en dessous on ne paie pas d'extra
      if (retardMinutes >= 45) {
        const retardHeures = Math.floor(retardMinutes / 60);
        const retardMin = retardMinutes % 60;
        const tempsExtra = retardHeures > 0 
          ? (retardMin > 0 ? `${retardHeures}h${retardMin}min` : `${retardHeures}h`)
          : `${retardMinutes}min`;
        const heurePointage = `${String(derniereSortie.getHours()).padStart(2,'0')}:${String(derniereSortie.getMinutes()).padStart(2,'0')}`;
        
        await this.createAnomalieIfNotExists(employeId, dateStr, 'extra_potentiel', {
          gravite: 'a_valider',
          shiftId: shift.id,
          heurePrevueFin: shiftEnd,
          heureReelleDepart: heurePointage,
          minutesApres: retardMinutes,
          raison: 'depart_tardif',
          description: `Départ ${tempsExtra} après la fin - Extra potentiel à valider (${heurePointage} au lieu de ${shiftEnd})`
        });
      }
    }
  }

  /**
   * Vérifie si une pause prévue n'a pas été prise
   * Cas: shift 9h-13h + 14h-17h mais employé pointe 9h-17h sans interruption
   */
  async checkPauseNonPrise(shift, entrees, sorties, dateStr) {
    const segments = parseSegments(shift.segments);
    
    // Calculer les pauses prévues à partir des GAPS entre segments de travail
    const workSegments = segments
      .filter(seg => !seg.isExtra && (seg.start || seg.debut) && (seg.end || seg.fin))
      .map(seg => ({
        start: seg.start || seg.debut,
        end: seg.end || seg.fin
      }))
      .sort((a, b) => a.start.localeCompare(b.start));
    
    // Calculer les gaps entre segments (= pauses prévues)
    const pauseGaps = [];
    for (let gi = 0; gi < workSegments.length - 1; gi++) {
      const gapStart = workSegments[gi].end;
      const gapEnd = workSegments[gi + 1].start;
      const [endH, endM] = gapStart.split(':').map(Number);
      const [startH, startM] = gapEnd.split(':').map(Number);
      const gapMinutes = (startH * 60 + startM) - (endH * 60 + endM);
      if (gapMinutes > 0) {
        pauseGaps.push({ start: gapStart, end: gapEnd, dureeMinutes: gapMinutes });
      }
    }
    
    // Fallback: chercher des segments de type 'pause' explicite
    if (pauseGaps.length === 0) {
      const pauseSegments = segments.filter(seg => {
        const segType = seg.type?.toLowerCase();
        return segType === 'pause' || segType === 'break';
      });
      pauseSegments.forEach(seg => {
        const pStart = seg.start || seg.debut;
        const pEnd = seg.end || seg.fin;
        if (pStart && pEnd) {
          const [pStartH, pStartM] = pStart.split(':').map(Number);
          const [pEndH, pEndM] = pEnd.split(':').map(Number);
          const dur = (pEndH * 60 + pEndM) - (pStartH * 60 + pStartM);
          if (dur > 0) pauseGaps.push({ start: pStart, end: pEnd, dureeMinutes: dur });
        }
      });
    }
    
    // Si pas de pause prévue, rien à vérifier
    if (pauseGaps.length === 0) return;
    
    // Si l'employé n'a que 2 pointages (1 entrée + 1 sortie), il n'a probablement pas pris sa pause
    if (entrees.length === 1 && sorties.length === 1) {
      const entree = new Date(entrees[0].horodatage);
      const sortie = new Date(sorties[0].horodatage);
      
      // Calculer la durée travaillée sans interruption
      const dureeMinutes = Math.round((sortie - entree) / (1000 * 60));
      
      // Utiliser le premier gap comme pause principale
      const pausePrincipale = pauseGaps[0];
      const pauseDebut = pausePrincipale.start;
      const pauseFin = pausePrincipale.end;
      const pauseDureeMinutes = pauseGaps.reduce((acc, g) => acc + g.dureeMinutes, 0);
      
      const [pStartH, pStartM] = pauseDebut.split(':').map(Number);
      const [pEndH, pEndM] = pauseFin.split(':').map(Number);
      
      // Vérifier si l'employé a travaillé pendant la pause prévue
      const pauseDebutDate = new Date(entree);
      pauseDebutDate.setHours(pStartH, pStartM, 0, 0);
      const pauseFinDate = new Date(entree);
      pauseFinDate.setHours(pEndH, pEndM, 0, 0);
      
      // Si entrée avant pause ET sortie après pause = pause non prise
      if (entree <= pauseDebutDate && sortie >= pauseFinDate) {
          await this.createAnomalieIfNotExists(shift.employeId, dateStr, 'pause_non_prise', {
            gravite: dureeMinutes > 360 ? 'haute' : 'moyenne', // >6h = grave (code du travail)
            shiftId: shift.id,
            pausePrevue: `${pauseDebut} - ${pauseFin}`,
            pauseDureeMinutes,
            dureeTravailContinuMinutes: dureeMinutes,
            heuresTravailleesSansPause: (dureeMinutes / 60).toFixed(1),
            description: `Pause non prise - ${(dureeMinutes / 60).toFixed(1)}h de travail continu au lieu de ${pauseDureeMinutes}min de pause prévue (${pauseDebut}-${pauseFin})`
          });
          
          // Si >6h sans pause, c'est aussi une violation du code du travail
          if (dureeMinutes > 360) {
            await this.createAnomalieIfNotExists(shift.employeId, dateStr, 'depassement_amplitude', {
              gravite: 'critique',
              shiftId: shift.id,
              dureeTravailContinuMinutes: dureeMinutes,
              seuilLegal: 360,
              description: `⚠️ Violation code du travail - ${(dureeMinutes / 60).toFixed(1)}h de travail continu sans pause (max légal: 6h)`
            });
          }
          
          // ===== HEURES SUPPLÉMENTAIRES liées à la pause non prise =====
          // La pause non prise représente du temps de travail effectif supplémentaire
          // qui doit être comptabilisé pour le paiement
          if (pauseDureeMinutes > 0) {
            const heuresSupp = (pauseDureeMinutes / 60).toFixed(1);
            await this.createAnomalieIfNotExists(shift.employeId, dateStr, 'extra_potentiel', {
              gravite: 'basse',
              shiftId: shift.id,
              pauseNonPrise: `${pauseDebut} - ${pauseFin}`,
              pauseDureeMinutes,
              heuresSupp,
              raison: 'pause_non_prise',
              description: `+${heuresSupp}h extra potentiel - Pause de ${pauseDureeMinutes}min non prise (travaillée)`
            });
          }
        }
    }
  }

  /**
   * Crée une anomalie si elle n'existe pas déjà
   */
  async createAnomalieIfNotExists(employeId, dateStr, type, options) {
    const { gravite, description, ...details } = options;
    
    // 🕐 Utiliser les bornes Paris
    const { startUTC, endUTC } = getParisDateBoundsUTC(dateStr);
    
    const anomalieExistante = await prisma.anomalie.findFirst({
      where: {
        employeId,
        date: {
          gte: startUTC,
          lt: endUTC
        },
        type
      }
    });

    if (!anomalieExistante) {
      const employe = await prisma.user.findUnique({
        where: { id: employeId },
        select: { nom: true, prenom: true }
      });
      
      // Midi Paris pour la date de l'anomalie
      const midiParis = new Date(`${dateStr}T11:00:00.000Z`); // 11:00 UTC = 12:00 Paris hiver
      
      await prisma.anomalie.create({
        data: {
          employeId,
          date: midiParis,
          type,
          gravite: gravite || 'moyenne',
          statut: 'en_attente',
          details: {
            ...details,
            detecteAutomatiquement: true,
            detectePar: 'scheduler'
          },
          description
        }
      });

      const emoji = type.includes('absence') ? '🚨' : 
                    type.includes('retard') ? '⏰' : 
                    type.includes('depart') || type.includes('premature') ? '🚪' :
                    type.includes('missing') ? '❓' :
                    type.includes('heures_sup') ? '⏱️' :
                    type.includes('pause') ? '☕' :
                    type.includes('hors_plage') ? '📍' :
                    type.includes('conge') ? '🏖️' :
                    type.includes('amplitude') || type.includes('depassement') ? '⚠️🔴' : '⚠️';
      
    }
  }

  /**
   * Rattrapage au démarrage : vérifie TOUS les shifts terminés du jour
   * Crée les anomalies manquées (si le serveur a redémarré après la fin d'un shift)
   */
  async catchUpMissedShifts() {
    // 🕐 Utiliser l'heure Paris
    const paris = getParisTime();
    const today = paris.dateStr;
    const currentMinutes = paris.hour * 60 + paris.minute;

    try {
      // 🕐 Bornes Paris
      const { startUTC, endUTC } = getParisDateBoundsUTC(today);
      
      // ✅ Chercher par date EXACTE (les shifts sont stockés à 00:00Z, pas dans les bounds 04:00Z)
      const shiftsToday = await prisma.shift.findMany({
        where: {
          date: new Date(`${today}T00:00:00.000Z`),
          type: { in: ['travail', 'présence', 'presence'] }
        },
        include: {
          employe: { select: { id: true, nom: true, prenom: true, statut: true } }
        }
      });

      let rattrapages = 0;

      for (const shift of shiftsToday) {
        if (shift.employe?.statut !== 'actif') continue;

        const segments = parseSegments(shift.segments);
        const workSegments = segments.filter(seg => {
          const segType = seg.type?.toLowerCase();
          return segType !== 'pause' && segType !== 'break';
        });

        if (!workSegments.length) continue;

        const lastSegment = workSegments[workSegments.length - 1];
        const shiftEnd = lastSegment.end || lastSegment.fin;
        if (!shiftEnd) continue;

        const [endH, endM] = shiftEnd.split(':').map(Number);
        const shiftEndMinutes = endH * 60 + endM;

        // Le shift est terminé (avec marge de 5 minutes)
        if (currentMinutes > shiftEndMinutes + 5) {
          await this.checkForAbsence(shift, today);
          rattrapages++;
        }
      }

      // 🆕 Vérifier aussi les pointages sans shift prévu
      await this.checkPointagesSansShift(today);

      if (rattrapages > 0) {
      } else {
      }
      
      // 🆕 Vérifier aussi les employés "en cours" après fin de shift
      await this.checkEmployesEnCours(today, currentMinutes);

    } catch (error) {
      console.error('❌ [SCHEDULER] Erreur rattrapage:', error.message);
    }
  }

  /**
   * 🆕 Vérifie les employés "en cours" (entrée sans sortie) après la fin de leur shift
   * Crée des anomalies de type "missing_out" et calcule les heures supplémentaires potentielles
   */
  async checkEmployesEnCours(dateStr, currentMinutes) {
    try {
      const { startUTC, endUTC } = getParisDateBoundsUTC(dateStr);
      
      // 1. Récupérer tous les pointages du jour
      const pointages = await prisma.pointage.findMany({
        where: {
          horodatage: {
            gte: startUTC,
            lt: endUTC
          }
        },
        include: {
          user: { select: { id: true, nom: true, prenom: true, role: true, statut: true } }
        },
        orderBy: { horodatage: 'asc' }
      });
      
      // 2. Grouper par utilisateur
      const pointagesParUser = {};
      for (const p of pointages) {
        if (!pointagesParUser[p.userId]) {
          pointagesParUser[p.userId] = [];
        }
        pointagesParUser[p.userId].push(p);
      }
      
      // 3. Pour chaque utilisateur, vérifier s'il est "en cours"
      for (const [userId, userPointages] of Object.entries(pointagesParUser)) {
        const userIdInt = parseInt(userId);
        const user = userPointages[0]?.user;
        
        // Ignorer les admins/managers et les inactifs
        if (user?.role === 'admin' || user?.role === 'manager' || user?.role === 'rh') continue;
        if (user?.statut !== 'actif') continue;
        
        // ✅ CORRIGÉ: Utiliser les helpers centralisés pour gérer TOUTES les variantes
        const entrees = filtrerEntrees(userPointages);
        const sorties = filtrerSorties(userPointages);
        
        // Si plus d'entrées que de sorties → employé "en cours"
        if (entrees.length > sorties.length) {
          const derniereEntree = entrees[entrees.length - 1];
          const heureEntree = new Date(derniereEntree.horodatage);
          const minutesEntree = heureEntree.getHours() * 60 + heureEntree.getMinutes();
          const dureeEnCours = currentMinutes - minutesEntree;
          
          // Récupérer le shift de cet employé
          // ✅ Date exacte (les shifts sont stockés à 00:00Z, pas dans les bounds 04:00Z)
          const shift = await prisma.shift.findFirst({
            where: {
              employeId: userIdInt,
              date: new Date(`${dateStr}T00:00:00.000Z`),
              type: { in: ['travail', 'présence', 'presence'] }
            }
          });
          
          if (shift) {
            // Extraire l'heure de fin du shift
            const segments = parseSegments(shift.segments);
            const workSegments = segments.filter(seg => {
              const segType = seg.type?.toLowerCase();
              return segType !== 'pause' && segType !== 'break';
            });
            
            if (workSegments.length > 0) {
              const lastSegment = workSegments[workSegments.length - 1];
              const shiftEnd = lastSegment.end || lastSegment.fin;
              
              if (shiftEnd) {
                const [endH, endM] = shiftEnd.split(':').map(Number);
                const shiftEndMinutes = endH * 60 + endM;
                const minutesApresFinShift = currentMinutes - shiftEndMinutes;
                
                // Si plus de 60 minutes après la fin du shift sans pointer le départ
                if (minutesApresFinShift >= 60) {
                  const heuresSupPotentielles = (minutesApresFinShift / 60).toFixed(1);
                  
                  // Créer anomalie missing_out avec heures sup potentielles
                  await this.createAnomalieIfNotExists(userIdInt, dateStr, 'missing_out_prolonge', {
                    gravite: minutesApresFinShift > 180 ? 'haute' : 'moyenne', // >3h = grave
                    shiftId: shift.id,
                    heurePrevueFin: shiftEnd,
                    derniereEntree: derniereEntree.horodatage,
                    dureeEnCoursMinutes: dureeEnCours,
                    minutesApresFinShift,
                    heuresSupPotentielles,
                    description: `⚠️ Sortie non pointée - "En cours" depuis ${(dureeEnCours / 60).toFixed(1)}h (fin prévue: ${shiftEnd}, ${heuresSupPotentielles}h sup potentielles)`
                  });
                  
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ [SCHEDULER] Erreur checkEmployesEnCours:', error.message);
    }
  }

  /**
   * 🆕 Clôture la journée de travail précédente à 6h du matin
   * Finalise les anomalies et calcule les heures réelles vs prévues
   */
  async clotureJourneeTravail() {
    const paris = getParisTime();
    
    // La journée à clôturer est celle de la veille (06h hier → 06h aujourd'hui)
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);
    const dateHier = hier.toISOString().split('T')[0];
    
    try {
      const { startUTC, endUTC } = getParisDateBoundsUTC(dateHier);
      
      // 1. Récupérer tous les pointages de la journée à clôturer
      const pointages = await prisma.pointage.findMany({
        where: {
          horodatage: {
            gte: startUTC,
            lt: endUTC
          }
        },
        include: {
          user: { select: { id: true, nom: true, prenom: true, role: true, statut: true } }
        },
        orderBy: { horodatage: 'asc' }
      });
      
      // 2. Grouper par utilisateur
      const pointagesParUser = {};
      for (const p of pointages) {
        if (!pointagesParUser[p.userId]) {
          pointagesParUser[p.userId] = [];
        }
        pointagesParUser[p.userId].push(p);
      }
      
      let clotures = 0;
      
      // 3. Pour chaque utilisateur avec entrée sans sortie
      for (const [userId, userPointages] of Object.entries(pointagesParUser)) {
        const userIdInt = parseInt(userId);
        const user = userPointages[0]?.user;
        
        if (user?.role === 'admin' || user?.role === 'manager' || user?.role === 'rh') continue;
        if (user?.statut !== 'actif') continue;
        
        // ✅ CORRIGÉ: Utiliser les helpers centralisés pour gérer TOUTES les variantes
        const entrees = filtrerEntrees(userPointages);
        const sorties = filtrerSorties(userPointages);
        
        // Si entrée sans sortie → clôturer automatiquement
        if (entrees.length > sorties.length) {
          const derniereEntree = entrees[entrees.length - 1];
          
          // Récupérer le shift
          // ✅ Date exacte (les shifts sont stockés à 00:00Z, pas dans les bounds 04:00Z)
          const shift = await prisma.shift.findFirst({
            where: {
              employeId: userIdInt,
              date: new Date(`${dateHier}T00:00:00.000Z`),
              type: { in: ['travail', 'présence', 'presence'] }
            }
          });
          
          let heureFin = '06:00'; // Par défaut, clôture à 6h
          let heuresSupp = 0;
          
          if (shift) {
            const segments = parseSegments(shift.segments);
            const workSegments = segments.filter(seg => {
              const segType = seg.type?.toLowerCase();
              return segType !== 'pause' && segType !== 'break';
            });
            
            if (workSegments.length > 0) {
              const lastSegment = workSegments[workSegments.length - 1];
              const shiftEnd = lastSegment.end || lastSegment.fin;
              
              if (shiftEnd) {
                // Calculer les heures sup (de fin shift à 6h du matin)
                const [endH, endM] = shiftEnd.split(':').map(Number);
                const shiftEndMinutes = endH * 60 + endM;
                const clotureMinutes = 6 * 60 + 24 * 60; // 6h le lendemain = 30h
                
                // Si le shift finissait avant minuit
                if (shiftEndMinutes < 24 * 60) {
                  heuresSupp = ((clotureMinutes - shiftEndMinutes) / 60).toFixed(1);
                }
                heureFin = shiftEnd;
              }
            }
          }
          
          // Créer anomalie de clôture automatique
          await this.createAnomalieIfNotExists(userIdInt, dateHier, 'cloture_auto_journee', {
            gravite: 'haute',
            shiftId: shift?.id,
            heurePrevueFin: heureFin,
            derniereEntree: derniereEntree.horodatage,
            heuresSupPotentielles: heuresSupp,
            description: `🔒 Clôture automatique - Sortie jamais pointée (fin prévue: ${heureFin}, ${heuresSupp}h de travail non comptabilisées)`
          });
          
          clotures++;
        }
      }
      
      if (clotures > 0) {
      } else {
      }
      
    } catch (error) {
      console.error('❌ [SCHEDULER] Erreur clôture journée:', error.message);
    }
  }

  /**
   * � LOGIQUE STANDARD SIRH : Détecte les pointages sans shift prévu
   * 
   * Pour chaque pointage, on cherche le shift le plus pertinent :
   * 1. Récupérer les shifts de J et J-1
   * 2. Pour chaque shift, calculer l'écart avec l'heure du pointage
   * 3. Associer au shift avec le plus petit écart (max 4h de tolérance)
   * 4. Si aucun shift trouvé → anomalie "pointage hors planning"
   */
  async checkPointagesSansShift(dateStr) {
    try {
      const paris = getParisTime();
      const realToday = paris.dateStr;
      
      // Calculer hier
      const hier = new Date();
      hier.setDate(hier.getDate() - 1);
      const hierStr = `${hier.getFullYear()}-${String(hier.getMonth() + 1).padStart(2, '0')}-${String(hier.getDate()).padStart(2, '0')}`;
      
      // Bornes pour aujourd'hui et hier
      const boundsToday = getParisDateBoundsUTC(realToday);
      const boundsHier = getParisDateBoundsUTC(hierStr);
      
      // 1. Récupérer tous les pointages des dernières 24h
      const pointages = await prisma.pointage.findMany({
        where: {
          horodatage: {
            gte: boundsHier.startUTC,
            lt: boundsToday.endUTC
          }
        },
        include: {
          user: { select: { id: true, email: true, nom: true, prenom: true, role: true } }
        }
      });

      // 2. Grouper par userId
      const pointagesParUser = {};
      for (const p of pointages) {
        if (!pointagesParUser[p.userId]) {
          pointagesParUser[p.userId] = [];
        }
        pointagesParUser[p.userId].push(p);
      }

      // 3. Pour chaque user ayant pointé
      for (const [userId, userPointages] of Object.entries(pointagesParUser)) {
        const userIdInt = parseInt(userId);
        
        // Ignorer les admins/managers
        const user = userPointages[0]?.user;
        if (user?.role === 'admin' || user?.role === 'manager' || user?.role === 'rh') {
          continue;
        }

        // 🎯 LOGIQUE SIRH : Récupérer les shifts de J et J-1
        // ✅ IMPORTANT: Les shifts sont stockés avec date = "YYYY-MM-DDT00:00:00.000Z" (minuit UTC)
        // Il faut chercher par date EXACTE, PAS par business day bounds (04:00Z → 03:59Z)
        // car minuit UTC < 04:00Z → le shift de J tombait dans les bounds de J-1
        // Les business day bounds restent corrects pour les POINTAGES (fin de shift après minuit)
        const [shiftsToday, shiftsHier] = await Promise.all([
          prisma.shift.findMany({
            where: {
              employeId: userIdInt,
              date: new Date(`${realToday}T00:00:00.000Z`),
              type: { in: ['travail', 'présence', 'presence'] }
            }
          }),
          prisma.shift.findMany({
            where: {
              employeId: userIdInt,
              date: new Date(`${hierStr}T00:00:00.000Z`),
              type: { in: ['travail', 'présence', 'presence'] }
            }
          })
        ]);
        
        const allShifts = [
          ...shiftsToday.map(s => ({ ...s, shiftDate: realToday })),
          ...shiftsHier.map(s => ({ ...s, shiftDate: hierStr }))
        ];
        
        // Fonction pour obtenir l'heure de début d'un shift en minutes
        const getShiftStartMinutes = (shift) => {
          const segments = parseSegments(shift.segments);
          const workSegment = segments.find(s => s.type?.toLowerCase() !== 'pause' && !s.isExtra);
          if (!workSegment) return null;
          
          const startTime = workSegment.start || workSegment.debut;
          if (!startTime) return null;
          
          const [h, m] = startTime.split(':').map(Number);
          return h * 60 + m;
        };
        
        // Pour chaque pointage d'entrée, trouver le shift le plus proche
        // ✅ CORRIGÉ: Utiliser le helper centralisé pour filtrer les entrées
        const entreesPointages = filtrerEntrees(userPointages);
        
        for (const pointage of entreesPointages) {
          const pointageDate = new Date(pointage.horodatage);
          const pointageDateStr = pointageDate.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
          const pointageMinutes = pointageDate.getHours() * 60 + pointageDate.getMinutes();
          
          // Chercher le meilleur shift
          let bestShift = null;
          let bestDistance = Infinity;
          
          for (const shift of allShifts) {
            const shiftStart = getShiftStartMinutes(shift);
            if (shiftStart === null) continue;
            
            // Calculer la distance
            let distance;
            if (shift.shiftDate === pointageDateStr) {
              // Même jour : distance simple
              distance = Math.abs(pointageMinutes - shiftStart);
            } else if (shift.shiftDate === hierStr && pointageDateStr === realToday) {
              // Shift d'hier, pointage aujourd'hui (shift de nuit)
              // Le pointage est après minuit, le shift a commencé hier soir
              distance = pointageMinutes + (1440 - shiftStart); // minutes depuis le début du shift
            } else {
              continue; // Pas pertinent
            }
            
            if (distance < bestDistance) {
              bestDistance = distance;
              bestShift = shift;
            }
          }
          
          // Tolérance : 4h (240 min) max
          const MAX_TOLERANCE = 240;
          
          if (!bestShift || bestDistance > MAX_TOLERANCE) {
            // Aucun shift trouvé ou trop loin → vérifier si anomalie existe déjà
            const anomalieExistante = await prisma.anomalie.findFirst({
              where: {
                employeId: userIdInt,
                date: {
                  gte: new Date(`${pointageDateStr}T00:00:00.000Z`),
                  lt: new Date(`${pointageDateStr}T23:59:59.999Z`)
                },
                type: 'pointage_hors_planning'
              }
            });
            
            if (!anomalieExistante) {
              // Calculer les heures travaillées
              // ✅ CORRIGÉ: Utiliser le helper centralisé pour filtrer les sorties
              const sorties = filtrerSorties(userPointages);
              let totalMinutes = 0;
              
              for (const sortie of sorties) {
                const sortieTime = new Date(sortie.horodatage);
                if (sortieTime > pointageDate) {
                  totalMinutes = (sortieTime - pointageDate) / (1000 * 60);
                  break;
                }
              }
              const heuresTravaillees = Math.round(totalMinutes / 60 * 10) / 10;
              
              await prisma.anomalie.create({
                data: {
                  employeId: userIdInt,
                  date: new Date(`${pointageDateStr}T12:00:00.000Z`),
                  type: 'pointage_hors_planning',
                  gravite: 'moyenne',
                  statut: 'en_attente',
                  details: {
                    pointages: userPointages.map(p => ({
                      type: p.type,
                      heure: new Date(p.horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
                    })),
                    heuresTravaillees,
                    detecteAutomatiquement: true,
                    detectePar: 'scheduler_sirh'
                  },
                  description: `Pointage hors planning - ${heuresTravaillees}h travaillées sans shift prévu`
                }
              });
              
            }
          } else {
          }
        }
      }
    } catch (error) {
      console.error('❌ [SCHEDULER] Erreur checkPointagesSansShift:', error.message);
    }
  }

  /**
   * Force une vérification manuelle (utile pour les tests)
   */
  async forceCheck() {
    await this.checkEndedShifts();
  }

  /**
   * Retourne l'état du scheduler
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      checkIntervalMs: this.checkIntervalMs
    };
  }
}

// Export d'une instance unique (singleton)
const scheduler = new AnomalyScheduler();
module.exports = scheduler;
