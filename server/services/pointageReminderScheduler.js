// server/services/pointageReminderScheduler.js
/**
 * Rappels de pointage par Web Push.
 *
 * Quatre étapes possibles par shift :
 *  - 'pre'        : 15 min AVANT le début, si l'employé n'a pas encore pointé son arrivée
 *  - 'retard'     : 10 min APRÈS le début, s'il n'a toujours pas pointé son arrivée
 *  - 'fin'        : à la fin prévue du service, s'il est pointé-entré mais pas sorti
 *  - 'fin_retard' : 15 min APRÈS la fin, s'il n'a toujours pas pointé son départ
 *
 * Clé anti-doublon par shift (`stage:shiftId`) → gère les coupures midi/soir.
 *
 * Optimisé pour la conso DB (Neon) :
 *  - Les shifts du jour sont chargés en cache (rafraîchi toutes les 5 min)
 *  - Le journal RappelPointage du jour est chargé en cache (anti-doublon)
 *  - On ne requête les pointages QUE pour les rares shifts dont un rappel est dû
 *
 * ⚠️ TIMEZONE : tout est calculé en Europe/Paris.
 */

const prisma = require('../prisma/client');
const pushService = require('./pushService');
const { filtrerEntrees, filtrerSorties } = require('../utils/pointageTypeUtils');

const TICK_MS = 60 * 1000;           // vérif chaque minute
const SHIFT_CACHE_TTL_MS = 5 * 60 * 1000; // recharge les shifts toutes les 5 min
const PRE_LEAD_MIN = 15;             // rappel 15 min avant l'arrivée
const RETARD_DELAY_MIN = 10;         // escalade arrivée : 10 min après le début
const RETARD_WINDOW_MIN = 30;        // fenêtre d'escalade arrivée (10→30 min après début)
const FIN_WINDOW_MIN = 5;            // rappel départ : 0→5 min après la fin prévue
const FIN_RETARD_DELAY_MIN = 15;     // escalade départ : 15 min après la fin
const FIN_RETARD_WINDOW_MIN = 45;    // fenêtre d'escalade départ (15→45 min après fin)

function getParisTime() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const hour = parseInt(get('hour'), 10);
  const minute = parseInt(get('minute'), 10);
  return {
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: hour * 60 + minute,
  };
}

/** Heure de début (segments officiels, hors extra) en minutes depuis minuit. */
function getShiftStartMinutes(shift) {
  const segments = Array.isArray(shift.segments) ? shift.segments : [];
  const officiels = segments.filter((s) => !s.isExtra);
  let start = Infinity;
  officiels.forEach((seg) => {
    const s = seg.start || seg.debut;
    if (s) {
      const [h, m] = s.split(':').map(Number);
      if (h * 60 + m < start) start = h * 60 + m;
    }
  });
  return start === Infinity ? null : start;
}

/** Heure de fin (segments officiels, hors extra) en minutes depuis minuit. */
function getShiftEndMinutes(shift) {
  const segments = Array.isArray(shift.segments) ? shift.segments : [];
  const officiels = segments.filter((s) => !s.isExtra);
  let end = -Infinity;
  officiels.forEach((seg) => {
    const e = seg.end || seg.fin;
    if (e) {
      const [h, m] = e.split(':').map(Number);
      if (h * 60 + m > end) end = h * 60 + m;
    }
  });
  return end === -Infinity ? null : end;
}

class PointageReminderScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.shiftCache = { dateStr: null, loadedAt: 0, shifts: [] };
    this.sentCache = { dateStr: null, set: new Set() }; // clés "employeId-stage"
  }

  start() {
    if (this.isRunning) return;
    if (!pushService.isConfigured()) {
      console.warn('[RAPPEL POINTAGE] Web Push non configuré → scheduler non démarré');
      return;
    }
    this.isRunning = true;
    this.tick().catch(() => {});
    this.intervalId = setInterval(() => this.tick().catch(() => {}), TICK_MS);
    console.log('✅ Scheduler rappels de pointage démarré');
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning = false;
  }

  async loadShifts(dateStr) {
    const fresh = this.shiftCache.dateStr === dateStr
      && (Date.now() - this.shiftCache.loadedAt) < SHIFT_CACHE_TTL_MS;
    if (fresh) return this.shiftCache.shifts;

    const shifts = await prisma.shift.findMany({
      where: {
        type: 'travail',
        date: {
          gte: new Date(`${dateStr}T00:00:00.000Z`),
          lte: new Date(`${dateStr}T23:59:59.999Z`),
        },
      },
      select: { id: true, employeId: true, segments: true },
    });
    this.shiftCache = { dateStr, loadedAt: Date.now(), shifts };
    return shifts;
  }

  async loadSentCache(dateStr) {
    if (this.sentCache.dateStr === dateStr) return;
    const rows = await prisma.rappelPointage.findMany({
      where: { date: dateStr },
      select: { employeId: true, stage: true },
    });
    const set = new Set(rows.map((r) => `${r.employeId}-${r.stage}`));
    this.sentCache = { dateStr, set };
  }

  /** Compte les arrivées / départs pointés aujourd'hui. */
  async getPointageCounts(employeId, dateStr) {
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employeId,
        horodatage: {
          gte: new Date(`${dateStr}T00:00:00.000Z`),
          lte: new Date(`${dateStr}T23:59:59.999Z`),
        },
      },
      select: { type: true },
    });
    return {
      entrees: filtrerEntrees(pointages).length,
      sorties: filtrerSorties(pointages).length,
    };
  }

  async markSent(employeId, dateStr, stage) {
    this.sentCache.set.add(`${employeId}-${stage}`);
    try {
      await prisma.rappelPointage.create({ data: { employeId, date: dateStr, stage } });
    } catch (e) {
      // unique violation = déjà marqué par un autre process, on ignore
    }
  }

  async tick() {
    if (!pushService.isConfigured()) return;
    const { dateStr, minutes: nowMin } = getParisTime();

    await this.loadSentCache(dateStr);
    const shifts = await this.loadShifts(dateStr);
    if (shifts.length === 0) return;

    for (const shift of shifts) {
      const start = getShiftStartMinutes(shift);
      const end = getShiftEndMinutes(shift);

      // Déterminer l'étape due maintenant (une seule fenêtre active à la fois)
      let stage = null; // 'pre' | 'retard' | 'fin' | 'fin_retard'
      if (start != null) {
        const untilStart = start - nowMin;   // >0 = avant le début
        const sinceStart = nowMin - start;   // >0 = après le début
        if (untilStart >= 1 && untilStart <= PRE_LEAD_MIN) stage = 'pre';
        else if (sinceStart >= RETARD_DELAY_MIN && sinceStart <= RETARD_WINDOW_MIN) stage = 'retard';
      }
      // Départ : uniquement pour les shifts qui se terminent le même jour (pas overnight)
      if (!stage && end != null && start != null && end > start) {
        const sinceEnd = nowMin - end;       // >0 = après la fin prévue
        if (sinceEnd >= 0 && sinceEnd <= FIN_WINDOW_MIN) stage = 'fin';
        else if (sinceEnd >= FIN_RETARD_DELAY_MIN && sinceEnd <= FIN_RETARD_WINDOW_MIN) stage = 'fin_retard';
      }
      if (!stage) continue;

      // Clé par shift (gère les coupures midi/soir) + anti-doublon (cache + DB)
      const stageKey = `${stage}:${shift.id}`;
      if (this.sentCache.set.has(`${shift.employeId}-${stageKey}`)) continue;

      const { entrees, sorties } = await this.getPointageCounts(shift.employeId, dateStr);
      const isDeparture = stage === 'fin' || stage === 'fin_retard';

      if (isDeparture) {
        // Pas d'arrivée pointée = absent → pas de rappel départ
        // Déjà pointé sortie (sorties >= entrees) → rien à faire
        if (entrees === 0 || sorties >= entrees) {
          await this.markSent(shift.employeId, dateStr, stageKey);
          continue;
        }
      } else {
        // Arrivée déjà pointée → rien à faire
        if (entrees > 0) {
          await this.markSent(shift.employeId, dateStr, stageKey);
          continue;
        }
      }

      const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
      const heureDebut = start != null ? fmt(start) : '';
      const heureFin = end != null ? fmt(end) : '';

      let payload;
      if (stage === 'pre') {
        payload = {
          title: '🕐 Ton service commence bientôt',
          body: `Début à ${heureDebut}. Pense à pointer ton arrivée en arrivant.`,
          url: '/pointage',
          tag: `rappel-pre-${dateStr}`,
        };
      } else if (stage === 'retard') {
        payload = {
          title: '⚠️ Tu n\'as pas encore pointé',
          body: `Ton service a commencé à ${heureDebut}. N'oublie pas de pointer ton arrivée !`,
          url: '/pointage',
          tag: `rappel-retard-${dateStr}`,
        };
      } else if (stage === 'fin') {
        payload = {
          title: '🕐 Fin de service',
          body: `Ton service se termine (${heureFin}). Pense à pointer ton départ.`,
          url: '/pointage',
          tag: `rappel-fin-${dateStr}`,
          requireInteraction: true,
        };
      } else { // fin_retard
        payload = {
          title: '⚠️ Tu n\'as pas pointé ton départ',
          body: `Ton service est terminé depuis ${heureFin}. Pointe ton départ pour ne pas fausser tes heures.`,
          url: '/pointage',
          tag: `rappel-fin-retard-${dateStr}`,
          requireInteraction: true,
        };
      }

      try {
        const res = await pushService.sendToUser(shift.employeId, payload);
        console.log(`[RAPPEL POINTAGE] ${stage} → employe ${shift.employeId} shift ${shift.id} (${res.sent} envoi(s))`);
      } catch (e) {
        console.error('[RAPPEL POINTAGE] erreur envoi:', e.message);
      }
      await this.markSent(shift.employeId, dateStr, stageKey);

      // Escalade admin : le départ n'est toujours pas pointé 15 min après la fin → on notifie les managers
      if (stage === 'fin_retard') {
        const adminStageKey = `admin_fin_retard:${shift.id}`;
        if (!this.sentCache.set.has(`${shift.employeId}-${adminStageKey}`)) {
          try {
            const employe = await prisma.user.findUnique({
              where: { id: shift.employeId },
              select: { nom: true, prenom: true, email: true },
            });
            const nomEmploye = employe?.nom && employe?.prenom
              ? `${employe.prenom} ${employe.nom}`
              : (employe?.email || `Employé #${shift.employeId}`);
            const resAdmin = await pushService.sendToAdmins({
              title: '⚠️ Départ non pointé',
              body: `${nomEmploye} n'a pas pointé son départ (fin prévue à ${heureFin}). Vous pouvez compléter son pointage depuis la vue jour.`,
              url: '/admin',
              tag: `admin-fin-retard-${dateStr}-${shift.employeId}`,
              requireInteraction: true,
            });
            console.log(`[RAPPEL POINTAGE] admin_fin_retard → employe ${shift.employeId} shift ${shift.id} (${resAdmin.sent} envoi(s) admin)`);
          } catch (e) {
            console.error('[RAPPEL POINTAGE] erreur envoi admin:', e.message);
          }
          await this.markSent(shift.employeId, dateStr, adminStageKey);
        }
      }
    }
  }
}

module.exports = new PointageReminderScheduler();
