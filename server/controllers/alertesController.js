// server/controllers/alertesController.js
// Système d'alertes temps réel pour retards et absences

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { toLocalDateString, getCurrentDateString } = require('../utils/dateUtils');

/**
 * Détecte les retards et absences en temps réel
 * - Retard: shift commencé depuis > 15 min sans pointage d'arrivée
 * - Absence probable: shift commencé depuis > 1h sans pointage
 * - Absence confirmée: shift terminé sans aucun pointage
 */
const detecterRetardsAbsences = async (req, res) => {
  try {
    const now = new Date();
    const today = getCurrentDateString();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Récupérer tous les shifts de travail du jour
    const shifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lte: new Date(`${today}T23:59:59.999Z`)
        },
        type: 'travail'
      },
      include: {
        employe: {
          select: { id: true, nom: true, prenom: true, email: true, statut: true }
        }
      }
    });
    
    const alertes = [];
    
    for (const shift of shifts) {
      // Ignorer les employés inactifs (statut !== 'actif')
      if (shift.employe?.statut !== 'actif') continue;
      
      const segments = shift.segments || [];
      if (segments.length === 0) continue;
      
      // Trouver l'heure de début et de fin du shift
      let shiftStartMinutes = Infinity;
      let shiftEndMinutes = 0;
      let totalMinutesPrevues = 0;
      
      segments.forEach(seg => {
        const start = seg.start || seg.debut;
        const end = seg.end || seg.fin;
        if (start && end) {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          const startMin = sh * 60 + sm;
          const endMin = eh * 60 + em;
          
          if (startMin < shiftStartMinutes) shiftStartMinutes = startMin;
          if (endMin > shiftEndMinutes) shiftEndMinutes = endMin;
          
          let duration = endMin - startMin;
          if (duration < 0) duration += 24 * 60; // Shift de nuit
          totalMinutesPrevues += duration;
        }
      });
      
      // Récupérer les pointages du jour pour cet employé
      const pointages = await prisma.pointage.findMany({
        where: {
          userId: shift.employeId,
          horodatage: {
            gte: new Date(`${today}T00:00:00.000Z`),
            lte: new Date(`${today}T23:59:59.999Z`)
          }
        },
        orderBy: { horodatage: 'asc' }
      });
      
      // Support des deux formats: 'arrivee' et 'ENTRÉE'
      const hasArrivee = pointages.some(p => p.type === 'arrivee' || p.type === 'ENTRÉE');
      const minutesDepuisDebut = nowMinutes - shiftStartMinutes;
      const isShiftFinished = nowMinutes > shiftEndMinutes;
      
      // Vérifier si une anomalie existe déjà pour aujourd'hui
      const anomalieExistante = await prisma.anomalie.findFirst({
        where: {
          employeId: shift.employeId,
          date: {
            gte: new Date(`${today}T00:00:00.000Z`),
            lte: new Date(`${today}T23:59:59.999Z`)
          },
          type: { in: ['absence_non_justifiee', 'retard_critique'] }
        }
      });
      
      // Générer les alertes selon la situation
      if (!hasArrivee && minutesDepuisDebut > 0) {
        const employe = shift.employe;
        const heureDebutStr = `${Math.floor(shiftStartMinutes / 60).toString().padStart(2, '0')}:${(shiftStartMinutes % 60).toString().padStart(2, '0')}`;
        
        if (isShiftFinished) {
          // ABSENCE CONFIRMÉE - Shift terminé sans pointage
          alertes.push({
            type: 'absence_confirmee',
            gravite: 'critique',
            employeId: shift.employeId,
            employe: `${employe.prenom} ${employe.nom}`,
            message: `Absence confirmée - aucun pointage pour le shift ${heureDebutStr}`,
            shiftId: shift.id,
            heuresPrevues: (totalMinutesPrevues / 60).toFixed(1),
            anomalieCreee: !!anomalieExistante,
            action: anomalieExistante ? null : 'creer_anomalie'
          });
          
          // Créer l'anomalie si elle n'existe pas
          if (!anomalieExistante) {
            await prisma.anomalie.create({
              data: {
                employeId: shift.employeId,
                date: new Date(`${today}T12:00:00.000Z`),
                type: 'absence_non_justifiee',
                gravite: 'critique',
                statut: 'en_attente',
                details: {
                  motif: 'Absence complète - aucun pointage enregistré',
                  heuresPrevues: (totalMinutesPrevues / 60).toFixed(2),
                  heuresTravaillees: 0,
                  ecartMinutes: -totalMinutesPrevues,
                  shiftId: shift.id,
                  detecteAutomatiquement: true
                },
                description: `Absence non justifiée - ${(totalMinutesPrevues / 60).toFixed(1)}h prévues, aucun pointage`
              }
            });
          }
          
        } else if (minutesDepuisDebut > 60) {
          // ABSENCE PROBABLE - Plus d'1h de retard
          alertes.push({
            type: 'absence_probable',
            gravite: 'haute',
            employeId: shift.employeId,
            employe: `${employe.prenom} ${employe.nom}`,
            message: `Absence probable - ${minutesDepuisDebut} min sans pointage (prévu ${heureDebutStr})`,
            shiftId: shift.id,
            minutesRetard: minutesDepuisDebut
          });
          
        } else if (minutesDepuisDebut > 15) {
          // RETARD SIGNIFICATIF - Entre 15 et 60 min
          alertes.push({
            type: 'retard_significatif',
            gravite: 'moyenne',
            employeId: shift.employeId,
            employe: `${employe.prenom} ${employe.nom}`,
            message: `Retard - ${minutesDepuisDebut} min sans pointage (prévu ${heureDebutStr})`,
            shiftId: shift.id,
            minutesRetard: minutesDepuisDebut
          });
        }
      }
    }
    
    // Trier par gravité
    const ordre = { critique: 0, haute: 1, moyenne: 2, basse: 3 };
    alertes.sort((a, b) => ordre[a.gravite] - ordre[b.gravite]);
    
    res.json({
      success: true,
      timestamp: now.toISOString(),
      alertes,
      stats: {
        total: alertes.length,
        absences: alertes.filter(a => a.type.includes('absence')).length,
        retards: alertes.filter(a => a.type === 'retard_significatif').length
      }
    });
    
  } catch (error) {
    console.error('Erreur détection retards/absences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Récupère le statut de pointage d'un employé pour aujourd'hui
 * Utilisé côté employé pour afficher un rappel
 */
const getStatutPointageEmploye = async (req, res) => {
  try {
    const employeId = req.user.userId;
    const now = new Date();
    const today = getCurrentDateString();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Récupérer le shift du jour
    const shift = await prisma.shift.findFirst({
      where: {
        employeId,
        date: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lte: new Date(`${today}T23:59:59.999Z`)
        },
        type: 'travail'
      }
    });
    
    // Pas de shift prévu = pas de rappel
    if (!shift) {
      return res.json({
        success: true,
        rappel: null,
        statut: 'repos'
      });
    }
    
    const segments = shift.segments || [];
    
    // 💰 Filtrer les segments "extra" (payés au noir) - ils ne comptent pas pour les alertes
    const segmentsOfficiels = segments.filter(seg => !seg.isExtra);
    
    if (segmentsOfficiels.length === 0) {
      // Shift uniquement composé de segments extra = pas d'alerte de pointage
      return res.json({
        success: true,
        rappel: null,
        statut: 'shift_extra_uniquement'
      });
    }
    
    // Trouver l'heure de début du shift (segments officiels uniquement)
    let shiftStartMinutes = Infinity;
    let shiftEndMinutes = 0;
    
    segmentsOfficiels.forEach(seg => {
      const start = seg.start || seg.debut;
      const end = seg.end || seg.fin;
      if (start && end) {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        if (sh * 60 + sm < shiftStartMinutes) shiftStartMinutes = sh * 60 + sm;
        if (eh * 60 + em > shiftEndMinutes) shiftEndMinutes = eh * 60 + em;
      }
    });
    
    // Récupérer les pointages du jour
    const pointages = await prisma.pointage.findMany({
      where: {
        userId: employeId,
        horodatage: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lte: new Date(`${today}T23:59:59.999Z`)
        }
      },
      orderBy: { horodatage: 'desc' }
    });
    
    const hasArrivee = pointages.some(p => p.type === 'arrivee');
    const dernierPointage = pointages[0];
    const isEnService = dernierPointage?.type === 'arrivee';
    const minutesDepuisDebut = nowMinutes - shiftStartMinutes;
    const isShiftFinished = nowMinutes > shiftEndMinutes;
    
    // Déterminer le rappel à afficher
    let rappel = null;
    let statut = 'ok';
    
    const heureDebutStr = `${Math.floor(shiftStartMinutes / 60).toString().padStart(2, '0')}:${(shiftStartMinutes % 60).toString().padStart(2, '0')}`;
    
    if (!hasArrivee && minutesDepuisDebut > 0 && !isShiftFinished) {
      // Shift commencé mais pas de pointage
      if (minutesDepuisDebut > 60) {
        rappel = {
          type: 'urgent',
          message: `⚠️ Vous n'avez pas pointé votre arrivée ! Votre shift a commencé à ${heureDebutStr} (il y a ${minutesDepuisDebut} min)`,
          color: 'red'
        };
        statut = 'retard_critique';
      } else if (minutesDepuisDebut > 15) {
        rappel = {
          type: 'attention',
          message: `⏰ N'oubliez pas de pointer ! Votre shift a commencé à ${heureDebutStr}`,
          color: 'orange'
        };
        statut = 'retard';
      } else if (minutesDepuisDebut > 0) {
        rappel = {
          type: 'info',
          message: `📍 Pensez à pointer votre arrivée (prévu ${heureDebutStr})`,
          color: 'blue'
        };
        statut = 'a_pointer';
      }
    } else if (!hasArrivee && nowMinutes < shiftStartMinutes && shiftStartMinutes - nowMinutes <= 30) {
      // Shift commence bientôt (dans les 30 min)
      rappel = {
        type: 'info',
        message: `🕐 Votre shift commence à ${heureDebutStr}`,
        color: 'blue'
      };
      statut = 'bientot';
    } else if (isEnService) {
      statut = 'en_service';
    } else if (hasArrivee && !isEnService) {
      statut = 'parti';
    }
    
    res.json({
      success: true,
      rappel,
      statut,
      shift: {
        debut: heureDebutStr,
        fin: `${Math.floor(shiftEndMinutes / 60).toString().padStart(2, '0')}:${(shiftEndMinutes % 60).toString().padStart(2, '0')}`
      },
      pointages: pointages.length
    });
    
  } catch (error) {
    console.error('Erreur statut pointage employé:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  detecterRetardsAbsences,
  getStatutPointageEmploye
};
