const prisma = require("../prisma/client");
const { notifierNouveauShift, notifierPlanningModifie } = require('../services/notificationService');
const { toLocalDateString, getCurrentDateString } = require('../utils/dateUtils');
const { creerPaiementDepuisShiftExtra, TAUX_HORAIRE_DEFAUT } = require('../services/paiementExtrasService');
const { auditShift, logAudit, getUserId, getIp } = require('../services/auditService');

// Sanitisation basique pour éviter injection HTML (notes/commentaires)
function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c]));
}

/**
 * 💰 Synchronise automatiquement les PaiementExtra avec les segments isExtra d'un shift
 * 
 * RÈGLES DE GESTION :
 * - Si PaiementExtra "à_payer" → mise à jour libre (heures, montant)
 * - Si PaiementExtra "payé" et modification horaires → créer ajustement (+/- heures)
 * - Si décochage isExtra sur paiement "payé" → BLOQUER (retourner erreur)
 * - Si suppression shift avec paiement "payé" → marquer "annulé"
 */
async function syncShiftExtrasWithPaiements(shift, segments, adminId, options = {}) {
  if (!shift?.id || !Array.isArray(segments)) return { success: true };
  
  const { isDelete = false } = options;
  const errors = [];
  
  try {
    // Récupérer tous les PaiementExtra existants pour ce shift (y compris ajustements)
    const existingPaiements = await prisma.paiementExtra.findMany({
      where: { 
        shiftId: shift.id,
        source: { in: ['shift_extra', 'ajustement'] },
        statut: { not: 'annule' } // Ignorer les annulés
      }
    });
    
    // Séparer paiements principaux et ajustements
    const mainPaiements = existingPaiements.filter(p => p.source === 'shift_extra');
    const existingBySegment = {};
    mainPaiements.forEach(p => {
      if (p.segmentIndex !== null && p.segmentIndex !== undefined) {
        existingBySegment[p.segmentIndex] = p;
      }
    });
    
    // Cas de suppression du shift
    if (isDelete) {
      for (const paiement of mainPaiements) {
        if (paiement.statut === 'paye') {
          // Marquer comme annulé avec commentaire
          await prisma.paiementExtra.update({
            where: { id: paiement.id },
            data: {
              statut: 'annule',
              commentaire: `${paiement.commentaire || ''} [Shift supprimé le ${new Date().toLocaleDateString('fr-FR')}]`.trim()
            }
          });
        } else {
          await prisma.paiementExtra.delete({ where: { id: paiement.id } });
        }
      }
      return { success: true };
    }
    
    // Parcourir les segments pour créer/mettre à jour
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const existingPaiement = existingBySegment[i];
      
      // Calculer les heures du segment
      const calculerHeures = (seg) => {
        if (!seg.start || !seg.end) return 0;
        const [startH, startM] = seg.start.split(':').map(Number);
        const [endH, endM] = seg.end.split(':').map(Number);
        let h = (endH + endM/60) - (startH + startM/60);
        if (h < 0) h += 24; // Shift de nuit
        return Math.round(h * 100) / 100;
      };
      
      const heures = calculerHeures(segment);
      
      if (segment.isExtra) {
        if (existingPaiement) {
          const anciennesHeures = parseFloat(existingPaiement.heures);
          const ancienMontant = parseFloat(existingPaiement.montant);
          const diffHeures = heures - anciennesHeures;
          const aEteModifie = Math.abs(diffHeures) > 0.01;
          
          if (existingPaiement.statut === 'a_payer') {
            // ✅ Paiement non effectué → mise à jour directe
            if (aEteModifie) {
              const tauxHoraire = parseFloat(existingPaiement.tauxHoraire);
              const nouveauMontant = heures * tauxHoraire;
              
              // Garder trace des valeurs initiales si c'est la première modification
              const heuresInitiales = existingPaiement.heuresInitiales ?? anciennesHeures;
              const montantInitial = existingPaiement.montantInitial ?? ancienMontant;
              
              // Récupérer l'ancien segment horaire depuis le commentaire existant ou le stocker
              let ancienSegment = existingPaiement.segmentInitial;
              if (!ancienSegment) {
                // Extraire l'ancien segment du commentaire s'il existe
                const match = existingPaiement.commentaire?.match(/Segment extra (\d{1,2}:\d{2}-\d{1,2}:\d{2})/);
                ancienSegment = match ? match[1] : null;
              }
              const segmentInitial = ancienSegment;
              
              // Nouveau segment horaire
              const nouveauSegment = `${segment.start}-${segment.end}`;
              
              // Générer note automatique de modification avec ancien/nouveau segment
              // Format: ~~ancienSegment~~ nouveauSegment pour affichage barré côté frontend
              const dateModif = new Date().toLocaleDateString('fr-FR');
              let commentaire = segmentInitial 
                ? `Segment extra ~~${segmentInitial}~~ ${nouveauSegment} [Modifié le ${dateModif}: ${anciennesHeures}h→${heures}h]`
                : `Segment extra ${nouveauSegment} [Modifié le ${dateModif}: ${anciennesHeures}h→${heures}h]`;
              
              await prisma.paiementExtra.update({
                where: { id: existingPaiement.id },
                data: {
                  heures: heures,
                  montant: nouveauMontant,
                  heuresInitiales,
                  montantInitial,
                  segmentInitial,
                  derniereModif: new Date(),
                  commentaire
                }
              });
            }
          } else if (existingPaiement.statut === 'paye' && aEteModifie) {
            // ⚠️ Paiement déjà effectué + horaires changés → créer ajustement
            const tauxHoraire = parseFloat(existingPaiement.tauxHoraire);
            const montantAjustement = diffHeures * tauxHoraire;
            
            await prisma.paiementExtra.create({
              data: {
                employeId: shift.employeId,
                date: new Date(shift.date),
                heures: diffHeures,
                montant: montantAjustement,
                tauxHoraire: tauxHoraire,
                source: 'ajustement',
                shiftId: shift.id,
                segmentIndex: i,
                ajustementDeId: existingPaiement.id,
                motifAjustement: 'modification_horaires',
                statut: 'a_payer',
                creePar: adminId,
                commentaire: `Ajustement suite modification horaires (${anciennesHeures}h → ${heures}h)`
              }
            });
          }
          delete existingBySegment[i];
        } else {
          // Créer un nouveau PaiementExtra
          const paiement = await creerPaiementDepuisShiftExtra(shift, i, adminId);
        }
      } else {
        // Segment n'est plus extra
        if (existingPaiement) {
          if (existingPaiement.statut === 'paye') {
            // ❌ BLOQUER : impossible de décocher un extra déjà payé
            errors.push({
              type: 'extra_deja_paye',
              segmentIndex: i,
              message: `Le segment ${i + 1} a déjà été payé en extra (${existingPaiement.montant}€). Impossible de le décocher.`
            });
          } else {
            await prisma.paiementExtra.delete({ where: { id: existingPaiement.id } });
          }
          delete existingBySegment[i];
        }
      }
    }
    
    // Supprimer les paiements orphelins (segments qui n'existent plus)
    for (const segmentIndex in existingBySegment) {
      const orphanPaiement = existingBySegment[segmentIndex];
      if (orphanPaiement.statut === 'paye') {
        // Marquer comme annulé
        await prisma.paiementExtra.update({
          where: { id: orphanPaiement.id },
          data: {
            statut: 'annule',
            commentaire: `${orphanPaiement.commentaire || ''} [Segment supprimé le ${new Date().toLocaleDateString('fr-FR')}]`.trim()
          }
        });
      } else {
        await prisma.paiementExtra.delete({ where: { id: orphanPaiement.id } });
      }
    }
    
    if (errors.length > 0) {
      return { success: false, errors };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('⚠️ Erreur sync PaiementExtra:', error.message);
    return { success: false, errors: [{ type: 'sync_error', message: error.message }] };
  }
}

// GET tous les shifts (optionnel : filtrage employé, dates)
const getShifts = async (req, res) => {
  const { employeId, start, end } = req.query;
  try {
    const where = {
      ...(employeId ? { employeId: Number(employeId) } : {}),
      ...(start && end
        ? {
            date: {
              gte: new Date(start),
              lte: new Date(end),
            },
          }
        : {}),
    };

    const shifts = await prisma.shift.findMany({
      where,
      include: { employe: { select: { id: true, email: true, prenom: true, nom: true, categorie: true, categories: true, statut: true } } },
      orderBy: [{ date: "asc" }],
    });

    // S'assurer que les dates sont formatées en ISO string et segments sont des tableaux
    const formattedShifts = shifts.map(shift => {
      // Pour garantir que les dates sont toujours envoyées au format ISO string
      let formattedDate = null;
      if (shift.date) {
        if (typeof shift.date.toISOString === 'function') {
          formattedDate = shift.date.toISOString();
        } else if (typeof shift.date === 'string') {
          formattedDate = new Date(shift.date).toISOString();
        } else {
          try {
            formattedDate = new Date(shift.date).toISOString();
          } catch (e) {
            console.error("Erreur format date:", e);
          }
        }
      }
      
      // Parser segments si c'est une string JSON
      let parsedSegments = shift.segments;
      if (typeof shift.segments === 'string') {
        try {
          parsedSegments = JSON.parse(shift.segments);
        } catch (e) {
          console.error("Erreur parsing segments:", e);
          parsedSegments = [];
        }
      }
      
      return {
        ...shift,
        date: formattedDate,
        segments: parsedSegments
      };
    });

    res.json(formattedShifts);
  } catch (error) {
    res.status(500).json({ error: "Erreur récupération shifts" });
  }
};

// POST ou PUT : création / modification d'un shift (type/motif/segments selon la structure RH)
const createOrUpdateShift = async (req, res) => {
  const { id, employeId, date, type, motif, segments, version } = req.body;
  if (!employeId || !date || !type) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }
  if (type === "absence" && !motif) {
    return res.status(400).json({ error: "Le motif d'absence est requis" });
  }
  try {
    // Normalisation date (YYYY-MM-DD) -> objet Date UTC minuit
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return res.status(400).json({ error: 'Date invalide' });

    // 🔒 VÉRIFICATION CONGÉ APPROUVÉ - Bloquer si un congé existe pour cette date
    if (type === 'travail') {
      const startOfDay = new Date(dateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateObj);
      endOfDay.setHours(23, 59, 59, 999);
      
      const congeApprouve = await prisma.conge.findFirst({
        where: {
          userId: Number(employeId),
          statut: 'approuvé',
          dateDebut: { lte: endOfDay },
          dateFin: { gte: startOfDay }
        }
      });
      
      if (congeApprouve) {
        const typeConge = congeApprouve.type || 'congé';
        const dateDebutStr = new Date(congeApprouve.dateDebut).toLocaleDateString('fr-FR');
        const dateFinStr = new Date(congeApprouve.dateFin).toLocaleDateString('fr-FR');
        return res.status(409).json({ 
          error: `Impossible de planifier un shift : l'employé a un congé approuvé (${typeConge}) du ${dateDebutStr} au ${dateFinStr}`,
          congeId: congeApprouve.id,
          type: typeConge
        });
      }
    }

    // Validation segments si travail
    let safeSegments = [];
    if (type === 'travail') {
      if (!Array.isArray(segments) || segments.length === 0) {
        return res.status(400).json({ error: 'Segments requis pour une présence' });
      }
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    const normalized = segments.map((seg, idx) => {
        const start = seg.start?.trim();
        const end = seg.end?.trim();
        if (!timeRegex.test(start) || !timeRegex.test(end)) {
          throw new Error(`Format heure invalide segment ${idx+1}`);
        }
        
        // 🌙 RESTAURANT : Autoriser les shifts de nuit (ex: 19:00 → 00:30)
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const spansMultipleDays = endMinutes < startMinutes;
        
        if (spansMultipleDays) {
          const duration = ((24 * 60) - startMinutes + endMinutes) / 60;
        }
        
        // Interdire seulement les durées impossibles
        if (start === end) {
          throw new Error(`Heure début = fin segment ${idx+1} (durée nulle)`);
        }
        return {
      id: seg.id || require('crypto').randomUUID(),
          start,
          end,
      commentaire: sanitize(seg.commentaire),
          aValider: !!seg.aValider,
          isExtra: !!seg.isExtra,
          extraMontant: seg.extraMontant || '',
          paymentStatus: seg.paymentStatus || 'à_payer',
          paymentMethod: seg.paymentMethod || '',
          paymentDate: seg.paymentDate || '',
      paymentNote: sanitize(seg.paymentNote)
        };
      });
      
      // 🌙 RESTAURANT : Tri intelligent tenant compte des shifts de nuit
      // Ne pas trier par heure de début car ça casse les shifts de nuit (19:00 → 00:30)
      // Les segments sont déjà dans l'ordre souhaité par l'utilisateur
      
      // Détection overlaps avec gestion shifts de nuit
      for (let i=1;i<normalized.length;i++) {
        const prev = normalized[i-1];
        const curr = normalized[i];
        
        // Convertir en minutes
        const prevStartMin = parseInt(prev.start.split(':')[0]) * 60 + parseInt(prev.start.split(':')[1]);
        const prevEndMin = parseInt(prev.end.split(':')[0]) * 60 + parseInt(prev.end.split(':')[1]);
        const currStartMin = parseInt(curr.start.split(':')[0]) * 60 + parseInt(curr.start.split(':')[1]);
        const currEndMin = parseInt(curr.end.split(':')[0]) * 60 + parseInt(curr.end.split(':')[1]);
        
        const prevSpansNight = prevEndMin < prevStartMin;
        const currSpansNight = currEndMin < currStartMin;
        
        let overlap = false;
        
        if (!prevSpansNight && !currSpansNight) {
          // Cas normal : chevauchement simple
          overlap = (prevEndMin > currStartMin);
        } else if (prevSpansNight && !currSpansNight) {
          // Prev franchit minuit, curr normal
          // Prev occupe [prevStart → 24:00[ + [00:00 → prevEnd[
          overlap = (prevStartMin < currEndMin && currStartMin < 24*60) || (currStartMin < prevEndMin);
        } else if (!prevSpansNight && currSpansNight) {
          // Curr franchit minuit, prev normal
          overlap = (currStartMin < prevEndMin && prevStartMin < 24*60) || (prevStartMin < currEndMin);
        } else {
          // Les deux franchissent minuit : toujours un chevauchement
          overlap = true;
        }
        
        if (overlap) {
          return res.status(400).json({ error: `Chevauchement entre segments ${i} et ${i+1}` });
        }
      }
      safeSegments = normalized;
    }

    let shift;
    if (id) {
      // Edition
      const existingForUpdate = await prisma.shift.findUnique({ where: { id } });
      if (!existingForUpdate) return res.status(404).json({ error: 'Shift introuvable' });
      
      // 🔒 OPTIMISTIC LOCKING — vérifier que la version n'a pas changé
      if (typeof version === 'number' && existingForUpdate.version !== version) {
        return res.status(409).json({ 
          error: 'Ce shift a été modifié par un autre utilisateur. Rechargez la page et réessayez.',
          code: 'VERSION_CONFLICT',
          serverVersion: existingForUpdate.version
        });
      }
      
      shift = await prisma.shift.update({
        where: { id },
        data: {
          employeId,
          date: dateObj,
          type,
          motif: type === "absence" ? motif : null,
          segments: type === "travail" ? safeSegments : [],
          version: { increment: 1 }
        },
      });
      
      // 📋 AUDIT: modification shift
      await auditShift(req, {
        shiftId: id,
        action: 'modification',
        before: { employeId: existingForUpdate.employeId, date: existingForUpdate.date, type: existingForUpdate.type, motif: existingForUpdate.motif, segments: existingForUpdate.segments },
        after: { employeId, date: dateObj, type, motif: type === "absence" ? motif : null, segments: type === "travail" ? safeSegments : [] }
      });
      
      // 🔄 INVALIDATION AUTOMATIQUE DES ANOMALIES
      // Marquer les anomalies existantes comme obsolètes car le shift a été modifié
      try {
        const dateStr = toLocalDateString(dateObj);
        const startOfDay = new Date(dateObj);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateObj);
        endOfDay.setHours(23, 59, 59, 999);
        
        const anomaliesInvalidees = await prisma.anomalie.updateMany({
          where: {
            employeId: Number(employeId),
            date: {
              gte: startOfDay,
              lte: endOfDay
            },
            statut: 'en_attente'
          },
          data: {
            statut: 'obsolete'
          }
        });
        
      } catch (invalidationError) {
        console.error('⚠️ Erreur invalidation anomalies (non bloquant):', invalidationError.message);
        // On continue même si l'invalidation échoue
      }
    } else {
      // Création (fusion si un shift travail existe déjà pour même jour/employé)
      if (type === 'travail') {
        const existing = await prisma.shift.findFirst({ where: { employeId: Number(employeId), date: dateObj, type: 'travail' } });
        if (existing) {
          // 🚨 Un shift existe déjà — demander confirmation au client (pas de fusion silencieuse)
          const forceMerge = req.body.forceMerge === true;
          if (!forceMerge) {
            return res.status(409).json({
              error: 'Un shift existe déjà pour cet employé à cette date',
              code: 'SHIFT_EXISTS',
              existingShiftId: existing.id,
              existingSegments: existing.segments,
              message: 'Renvoyez avec forceMerge: true pour fusionner les segments'
            });
          }
          // Fusion confirmée — concat + tri + validation overlaps (night-shift aware)
          const merged = [...existing.segments, ...safeSegments].sort((a,b)=> a.start.localeCompare(b.start));
          for (let i=1;i<merged.length;i++) {
            const prevEndMin = parseInt(merged[i-1].end.split(':')[0])*60 + parseInt(merged[i-1].end.split(':')[1]);
            const currStartMin = parseInt(merged[i].start.split(':')[0])*60 + parseInt(merged[i].start.split(':')[1]);
            const prevStartMin = parseInt(merged[i-1].start.split(':')[0])*60 + parseInt(merged[i-1].start.split(':')[1]);
            const prevIsNight = prevEndMin < prevStartMin;
            // Si le segment précédent ne franchit PAS minuit, overlap = prevEnd > currStart
            // Si le segment précédent franchit minuit, overlap avec tout segment après minuit
            if (!prevIsNight && prevEndMin > currStartMin) {
              return res.status(400).json({ error: `Chevauchement après fusion segments ${i} et ${i+1}` });
            }
          }
          shift = await prisma.shift.update({ where:{ id: existing.id }, data:{ segments: merged, version: { increment: 1 } }});
          // 📋 AUDIT: fusion segments
          await auditShift(req, { shiftId: existing.id, action: 'modification', before: { segments: existing.segments }, after: { segments: merged }, metadata: { type: 'fusion' } });
        } else {
          shift = await prisma.shift.create({
            data: {
              employeId,
              date: dateObj,
              type,
              motif: type === 'absence' ? motif : null,
              segments: safeSegments,
              version: 0
            },
          });
          // 📋 AUDIT: création shift travail
          await auditShift(req, { shiftId: shift.id, action: 'creation', after: { employeId, date: dateObj, type, segments: safeSegments } });
        }
      } else {
        shift = await prisma.shift.create({
          data: {
            employeId,
            date: dateObj,
            type,
            motif: type === 'absence' ? motif : null,
            segments: [],
            version: 0
          },
        });
        // 📋 AUDIT: création shift absence
        await auditShift(req, { shiftId: shift.id, action: 'creation', after: { employeId, date: dateObj, type: 'absence', motif } });
        
        // 🎯 CRÉATION ABSENCE PAR ADMIN = Congé auto-validé
        // Quand un admin crée un shift "absence", on crée aussi un Conge validé
        // pour que ça apparaisse dans les congés de l'employé et dans les stats
        if (type === 'absence') {
          try {
            // Utiliser la même date que le shift (dateObj est déjà normalisée en UTC minuit)
            // Ne pas créer de nouvelles dates qui pourraient avoir un décalage timezone
            
            const congeExistant = await prisma.conge.findFirst({
              where: {
                userId: Number(employeId),
                dateDebut: { lte: dateObj },
                dateFin: { gte: dateObj }
              }
            });
            
            if (!congeExistant) {
              // Créer un congé validé automatiquement avec la même date exacte que le shift
              const congeAutoValide = await prisma.conge.create({
                data: {
                  userId: Number(employeId),
                  type: motif || 'Absence', // Utiliser le motif comme type
                  dateDebut: dateObj, // Même date que le shift
                  dateFin: dateObj,   // Même date que le shift (congé d'un jour)
                  statut: 'approuvé', // Auto-validé car créé par admin
                  vu: true, // Déjà vu car c'est l'admin qui crée
                  motifEmploye: `Absence posée par l'administration`,
                }
              });
              
              // 🔔 Notifier l'employé de son absence
              const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
              await prisma.notifications.create({
                data: {
                  employe_id: Number(employeId),
                  type: 'absence_admin',
                  titre: 'Absence enregistrée',
                  message: JSON.stringify({
                    text: `Une absence (${motif}) a été enregistrée pour vous le ${dateStr}`,
                    motif: motif,
                    date: dateObj.toISOString()
                  }),
                  lue: false
                }
              });
            } else {
            }
          } catch (congeError) {
            console.error('⚠️ Erreur création congé auto-validé (non bloquant):', congeError.message);
            // On continue même si la création du congé échoue
          }
        }
      }
      
      // 🔔 Notification nouveau shift (seulement pour les créations de travail)
      if (type === 'travail' && safeSegments.length > 0) {
        try {
          const heureDebut = safeSegments[0]?.start;
          const heureFin = safeSegments[safeSegments.length - 1]?.end;
          await notifierNouveauShift(employeId, {
            id: shift.id,
            date: dateObj.toISOString(),
            heureDebut,
            heureFin
          });
        } catch (notifError) {
          console.error('⚠️ Erreur notification nouveau shift:', notifError.message);
        }
      }
    }
    
    // 💰 SYNCHRONISATION AUTOMATIQUE PAIEMENTS EXTRAS
    // Créer automatiquement un PaiementExtra pour chaque segment isExtra
    if (type === 'travail' && safeSegments.length > 0) {
      const adminId = req.userId || req.user?.userId || req.user?.id;
      const syncResult = await syncShiftExtrasWithPaiements(shift, safeSegments, adminId);
      
      // Si erreur (ex: tentative de décocher un extra déjà payé)
      if (!syncResult.success && syncResult.errors?.length > 0) {
        const extraDejaPayeError = syncResult.errors.find(e => e.type === 'extra_deja_paye');
        if (extraDejaPayeError) {
          return res.status(400).json({ 
            error: extraDejaPayeError.message,
            code: 'EXTRA_DEJA_PAYE',
            segmentIndex: extraDejaPayeError.segmentIndex
          });
        }
      }
    }
    
    res.json(shift);
  } catch (error) {
    if (error.message?.startsWith('Format heure invalide') || error.message?.startsWith('Heure début') ) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Erreur enregistrement shift" });
  }
};

// Suppression d'un shift
const deleteShift = async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'id invalide' });
  try {
    // Vérifier existence et récupérer les données
    const existing = await prisma.shift.findUnique({ 
      where: { id }, 
      select: { id: true, employeId: true, date: true, type: true, motif: true, segments: true } 
    });
    if (!existing) return res.status(404).json({ error: 'Shift introuvable' });

    const adminId = req.userId || req.user?.userId || req.user?.id;
    
    // 💰 Gérer les PaiementExtra avant suppression
    const syncResult = await syncShiftExtrasWithPaiements(existing, [], adminId, { isDelete: true });
    
    // 🗑️ Si c'est une absence, supprimer aussi le congé associé créé automatiquement
    if (existing.type === 'absence') {
      try {
        const shiftDate = new Date(existing.date);
        const startOfDay = new Date(shiftDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(shiftDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Supprimer le congé auto-créé pour cette date et cet employé
        const deletedConge = await prisma.conge.deleteMany({
          where: {
            userId: existing.employeId,
            dateDebut: { lte: endOfDay },
            dateFin: { gte: startOfDay },
            motifEmploye: 'Absence posée par l\'administration' // Identifier les congés auto-créés
          }
        });
        
      } catch (congeError) {
        console.error('⚠️ Erreur suppression congé associé (non bloquant):', congeError.message);
      }
    }
    
    // Transaction: supprimer les dépendances et le shift
    await prisma.$transaction(async (tx) => {
      // Supprimer les demandes de remplacement liées
      await tx.demandeRemplacement.deleteMany({ where: { shiftId: id } });
      await tx.extraPaymentLog.deleteMany({ where: { shiftId: id } });
      // Supprimer les corrections de shift (FK vers Shift)
      await tx.shiftCorrection.deleteMany({ where: { shiftId: id } });
      // Supprimer les PaiementExtra restants (ceux à payer, les payés sont déjà marqués annulés)
      await tx.paiementExtra.deleteMany({ 
        where: { 
          shiftId: id,
          statut: 'a_payer'
        } 
      });
      await tx.shift.delete({ where: { id } });
      // 📋 AUDIT: suppression shift (dans la transaction)
      await logAudit({
        entite: 'shift', entiteId: id, action: 'suppression',
        userId: Number(adminId),
        details: { before: { employeId: existing.employeId, date: existing.date, type: existing.type, motif: existing.motif, segments: existing.segments } },
        ipAddress: getIp(req), tx
      });
    });

    res.json({ message: 'Shift supprimé', id });
  } catch (error) {
    console.error('Erreur suppression shift:', error);
    // Gestion erreur contrainte FK (au cas où autre table référencerait ce shift plus tard)
    if (error.code === 'P2003') {
      return res.status(409).json({ error: 'Contrainte de clé étrangère empêchant la suppression' });
    }
    res.status(500).json({ error: 'Erreur suppression shift' });
  }
};

// GET segments extras (filtrés par date si fourni)
const getExtrasSegments = async (req, res) => {
  const { start, end, employeId } = req.query;
  try {
    const where = {
      ...(employeId ? { employeId: Number(employeId) } : {}),
      ...(start && end
        ? { date: { gte: new Date(start), lte: new Date(end) } }
        : {}),
    };
    const shifts = await prisma.shift.findMany({
      where,
      orderBy: [{ date: "asc" }],
    });
    const extras = [];
    shifts.forEach((sh) => {
      if (Array.isArray(sh.segments)) {
        sh.segments.forEach((seg, idx) => {
          if (seg.isExtra) {
            extras.push({
              shiftId: sh.id,
              segmentIndex: idx,
              employeId: sh.employeId,
              date: sh.date,
              start: seg.start,
              end: seg.end,
              extraMontant: seg.extraMontant || "",
              paymentStatus: seg.paymentStatus || "à_payer",
              paymentMethod: seg.paymentMethod || "",
              paymentDate: seg.paymentDate || "",
              paymentNote: seg.paymentNote || "",
            });
          }
        });
      }
    });
    res.json(extras);
  } catch (e) {
    res.status(500).json({ error: "Erreur récupération extras" });
  }
};

// Réintégré: historique des modifications de paiement d'un shift
const getShiftExtraLogs = async (req, res) => {
  const shiftId = Number(req.params.id);
  if (Number.isNaN(shiftId)) return res.status(400).json({ error: 'shiftId invalide' });
  const { segmentIndex } = req.query;
  try {
    // Ajouter des logs de debug
    
    // Vérifier si des logs existent dans la table
    const count = await prisma.extraPaymentLog.count();
    
    // Vérifier si des logs existent pour ce shift spécifique
    const where = {
      shiftId,
      ...(segmentIndex !== undefined ? { segmentIndex: Number(segmentIndex) } : {}),
    };
    
    // Récupérer tous les champs pour diagnostic
    const logs = await prisma.extraPaymentLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { changedBy: { select: { id: true, email: true } } },
    });
    
    if (logs.length === 0) {
      // Si aucun log, vérifier si le shift existe
      const shift = await prisma.shift.findUnique({ 
        where: { id: shiftId },
        select: { id: true, employeId: true }  
      });
    }
    
    // Format compatible avec l'endpoint updateExtraPayment pour faciliter l'intégration côté client
    res.json({ logs });
  } catch (e) {
    console.error("❌ Erreur récupération logs:", e);
    res.status(500).json({ error: 'Erreur récupération historique extra' });
  }
};

// PATCH mise à jour paiement d'un segment extra (avec historique)
const updateExtraPayment = async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'shiftId invalide' });
  const { segmentIndex, paymentStatus, paymentMethod, paymentDate, paymentNote } = req.body;
  if (segmentIndex === undefined) return res.status(400).json({ error: 'segmentIndex requis' });
  try {
  const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) return res.status(404).json({ error: 'Shift introuvable' });
    const segments = Array.isArray(shift.segments) ? [...shift.segments] : [];
    if (!segments[segmentIndex]) return res.status(404).json({ error: 'Segment introuvable' });
    if (!segments[segmentIndex].isExtra) return res.status(400).json({ error: 'Segment non extra' });

    const oldSegment = { ...segments[segmentIndex] };
    const newSegmentDraft = {
      ...segments[segmentIndex],
      paymentStatus: paymentStatus || segments[segmentIndex].paymentStatus || 'à_payer',
      paymentMethod: paymentMethod !== undefined ? paymentMethod : (segments[segmentIndex].paymentMethod || ''),
      paymentDate: (paymentDate !== undefined ? paymentDate : (segments[segmentIndex].paymentDate || '')),
      paymentNote: paymentNote !== undefined ? sanitize(paymentNote) : (segments[segmentIndex].paymentNote || ''),
    };
    // Auto-date si passage à payé
    if (oldSegment.paymentStatus !== 'payé' && newSegmentDraft.paymentStatus === 'payé' && !newSegmentDraft.paymentDate) {
      newSegmentDraft.paymentDate = getCurrentDateString();
    }
    const hasChange = ['paymentStatus','paymentMethod','paymentDate','paymentNote']
      .some(k => (oldSegment[k] || '') !== (newSegmentDraft[k] || ''));
    if (!hasChange) {
      return res.json({ message: 'Aucun changement détecté', shift });
    }
    segments[segmentIndex] = newSegmentDraft;

    // Utiliser une transaction pour garantir l'atomicité des opérations
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mise à jour du shift
  const updatedShift = await tx.shift.update({ where: { id }, data: { segments } });
      
      // 2. Création de l'entrée dans le log
      const newLogEntry = await tx.extraPaymentLog.create({
        data: {
          shiftId: id,
          segmentIndex,
          employeId: updatedShift.employeId,
          changedByUserId: req.user.id,
          oldValues: {
            paymentStatus: oldSegment.paymentStatus || 'à_payer',
            paymentMethod: oldSegment.paymentMethod || '',
            paymentDate: oldSegment.paymentDate || '',
            paymentNote: oldSegment.paymentNote || '',
          },
          newValues: {
            paymentStatus: updatedShift.segments[segmentIndex].paymentStatus,
            paymentMethod: updatedShift.segments[segmentIndex].paymentMethod || '',
            paymentDate: updatedShift.segments[segmentIndex].paymentDate || '',
            paymentNote: updatedShift.segments[segmentIndex].paymentNote || '',
          },
        },
        include: { changedBy: { select: { id: true, email: true } } },
      });
      
      // 3. Récupérer tous les logs pour ce shift (pour éviter un appel API séparé)
      const allLogs = await tx.extraPaymentLog.findMany({
        where: { shiftId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { changedBy: { select: { id: true, email: true } } },
      });
      
      return { shift: updatedShift, logs: allLogs, newLog: newLogEntry };
    });
    
    // Retourner le shift mis à jour ET les logs actualisés
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Erreur mise à jour paiement extra' });
  }
};

// POST : création en batch de plusieurs shifts (TRANSACTIONNEL)
const createBatchShifts = async (req, res) => {
  const { shifts } = req.body;
  
  if (!Array.isArray(shifts) || shifts.length === 0) {
    return res.status(400).json({ error: "Aucun planning à créer" });
  }

  try {
    const errors = [];
    const validatedShifts = [];
    
    // Pré-charger les employés actifs pour validation
    const employeIds = [...new Set(shifts.map(s => Number(s.employeeId)).filter(Boolean))];
    const activeEmployees = await prisma.user.findMany({
      where: { id: { in: employeIds }, statut: 'actif' },
      select: { id: true }
    });
    const activeIds = new Set(activeEmployees.map(e => e.id));
    
    // ── Phase 1: Validation de TOUS les shifts AVANT insertion ──
    for (const shiftData of shifts) {
      let { employeeId, date, segments, type = 'travail', startTime, endTime, replaceExisting } = shiftData;
      const employeId = Number(employeeId);
      
      if (!employeId || !date) {
        errors.push(`Données manquantes (employeId ou date) pour un planning: ${JSON.stringify(shiftData)}`);
        continue;
      }
      
      // Vérifier que l'employé est actif
      if (!activeIds.has(employeId)) {
        errors.push(`Employé #${employeId} inactif ou inexistant — shift ignoré`);
        continue;
      }
      
      // Ancien format startTime/endTime → segments
      if (!segments && startTime && endTime) {
        segments = [{
          start: startTime, end: endTime, commentaire: "", aValider: false,
          isExtra: false, extraMontant: '', paymentStatus: 'à_payer',
          paymentMethod: '', paymentDate: '', paymentNote: ''
        }];
      }
      
      if (!segments || !Array.isArray(segments) || segments.length === 0) {
        errors.push(`Aucun segment fourni pour un planning: ${JSON.stringify(shiftData)}`);
        continue;
      }
      
      // Normalisation date
      let dateObj;
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      } else {
        dateObj = new Date(date);
      }
      if (isNaN(dateObj.getTime())) { errors.push(`Date invalide: ${date}`); continue; }
      
      // Validation segments
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      let segmentsValides = true;
      for (const segment of segments) {
        if (!segment.start || !segment.end) { errors.push(`Segment sans horaires: ${JSON.stringify(segment)}`); segmentsValides = false; break; }
        if (!timeRegex.test(segment.start) || !timeRegex.test(segment.end)) { errors.push(`Format heure invalide: ${segment.start} - ${segment.end}`); segmentsValides = false; break; }
        if (segment.start === segment.end) { errors.push(`Durée nulle: ${segment.start} - ${segment.end}`); segmentsValides = false; break; }
      }
      if (!segmentsValides) continue;
      
      // Vérification congé approuvé
      if (type === 'travail') {
        const congeApprouve = await prisma.conge.findFirst({
          where: { userId: employeId, statut: 'approuvé', dateDebut: { lte: dateObj }, dateFin: { gte: dateObj } }
        });
        if (congeApprouve) {
          errors.push(`Employé ${employeId} - Date ${date}: Congé approuvé (${congeApprouve.type})`);
          continue;
        }
      }
      
      const segmentsAvecIds = segments.map(segment => ({
        id: segment.id || require('crypto').randomUUID(),
        start: segment.start, end: segment.end,
        commentaire: segment.commentaire || "", aValider: segment.aValider || false,
        isExtra: segment.isExtra || false, extraMontant: segment.extraMontant || '',
        paymentStatus: segment.paymentStatus || 'à_payer', paymentMethod: segment.paymentMethod || '',
        paymentDate: segment.paymentDate || '', paymentNote: segment.paymentNote || ''
      }));
      
      validatedShifts.push({ employeId, dateObj, type, segmentsAvecIds, replaceExisting: !!replaceExisting });
    }
    
    // ── Phase 2: Détection duplicats dans le batch ──
    const existingShifts = await prisma.shift.findMany({
      where: {
        OR: validatedShifts.map(s => ({ employeId: s.employeId, date: s.dateObj, type: 'travail' }))
      },
      select: { id: true, employeId: true, date: true }
    });
    const existingKeys = new Set(existingShifts.map(s => `${s.employeId}|${s.date.toISOString().slice(0,10)}`));
    
    const toCreate = [];
    const toReplace = [];
    for (const vs of validatedShifts) {
      const key = `${vs.employeId}|${vs.dateObj.toISOString().slice(0,10)}`;
      if (existingKeys.has(key)) {
        if (vs.replaceExisting) {
          // Trouver le shift existant pour le remplacer
          const existing = existingShifts.find(s => s.employeId === vs.employeId && s.date.toISOString().slice(0,10) === vs.dateObj.toISOString().slice(0,10));
          if (existing) {
            toReplace.push({ ...vs, existingShiftId: existing.id });
          }
        } else {
          errors.push(`Shift déjà existant pour employé ${vs.employeId} le ${vs.dateObj.toISOString().slice(0,10)} — ignoré`);
        }
      } else {
        toCreate.push(vs);
        existingKeys.add(key); // éviter doublons dans le batch lui-même
      }
    }
    
    // ── Phase 3: Insertion TRANSACTIONNELLE ──
    let result = [];
    const ops = [];
    // Replacements
    for (const vs of toReplace) {
      ops.push(async (tx) => {
        // Nettoyer dépendances FK
        await tx.demandeRemplacement.deleteMany({ where: { shiftId: vs.existingShiftId } });
        await tx.extraPaymentLog.deleteMany({ where: { shiftId: vs.existingShiftId } });
        await tx.shiftCorrection.deleteMany({ where: { shiftId: vs.existingShiftId } });
        await tx.paiementExtra.deleteMany({ where: { shiftId: vs.existingShiftId } });
        await tx.shift.delete({ where: { id: vs.existingShiftId } });
        return tx.shift.create({
          data: {
            employeId: parseInt(vs.employeId, 10),
            date: vs.dateObj,
            type: vs.type,
            motif: '',
            segments: vs.segmentsAvecIds,
            version: 0
          }
        });
      });
    }
    // Creates
    if (toCreate.length > 0 || toReplace.length > 0) {
      result = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const op of ops) {
          results.push(await op(tx));
        }
        for (const vs of toCreate) {
          results.push(await tx.shift.create({
            data: {
              employeId: parseInt(vs.employeId, 10),
              date: vs.dateObj,
              type: vs.type,
              motif: '',
              segments: vs.segmentsAvecIds,
              version: 0
            }
          }));
        }
        return results;
      }, { maxWait: 10000, timeout: 30000 });
    }
    
    res.status(201).json({
      success: errors.length === 0,
      created: result.length,
      shifts: result.map(s => ({ ...s, date: s.date instanceof Date ? s.date.toISOString() : s.date })),
      errors: errors.length > 0 ? errors : undefined,
      message: `${result.length} shifts créés en transaction`
    });
    
    // 📋 AUDIT: batch creation (après réponse envoyée, non bloquant)
    if (result.length > 0) {
      logAudit({
        entite: 'shift_batch', entiteId: null, action: 'batch_creation',
        userId: Number(getUserId(req)),
        details: { metadata: { count: result.length, shiftIds: result.map(s => s.id), errors: errors.length } },
        ipAddress: getIp(req)
      });
    }
  } catch (error) {
    console.error("Erreur création batch shifts:", error);
    res.status(500).json({ error: "Erreur lors de la création des plannings" });
  }
};

// POST : création récurrente (CDI) – génère des shifts sur plusieurs mois / sans date de fin explicite
const createRecurringShifts = async (req, res) => {
  /* Body attendu:
    {
      employeIds: [Int],
      startDate: 'YYYY-MM-DD',
      endDate?: 'YYYY-MM-DD', // si absent utiliser monthsCount
      monthsCount?: number,   // nombre de mois à générer (ex: 6)
      daysOfWeek: [1,2,3,4,5], // 0=Dimanche ... 6=Samedi (aligné JS)
      segments: [{ start:'08:00', end:'16:00', ... }],
      mode: 'skip' | 'replace'   // comportement si un shift existe déjà
    }
  */
  const { employeIds, startDate, endDate, monthsCount, daysOfWeek, segments, segmentsByDay, mode='skip' } = req.body || {};
  if (!Array.isArray(employeIds) || employeIds.length === 0) return res.status(400).json({ error: 'employeIds requis' });
  if (!startDate) return res.status(400).json({ error: 'startDate requis' });
  if ((!endDate && !monthsCount) || (endDate && monthsCount)) return res.status(400).json({ error: 'Fournir soit endDate soit monthsCount' });
  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) return res.status(400).json({ error: 'daysOfWeek requis' });
  // segments OU segmentsByDay requis
  const hasSegmentsByDay = segmentsByDay && typeof segmentsByDay === 'object' && Object.keys(segmentsByDay).length > 0;
  if (!hasSegmentsByDay && (!Array.isArray(segments) || segments.length === 0)) return res.status(400).json({ error: 'segments requis' });

  try {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    const validateSegs = (segs, label) => {
      for (const seg of segs) {
        if (!seg.start || !seg.end || !timeRegex.test(seg.start) || !timeRegex.test(seg.end) || seg.start === seg.end) {
          return `Segment invalide ${label}: ${seg.start || '?'}-${seg.end || '?'}`;
        }
      }
      return null;
    };
    if (hasSegmentsByDay) {
      for (const [day, daySegs] of Object.entries(segmentsByDay)) {
        if (!Array.isArray(daySegs) || daySegs.length === 0) return res.status(400).json({ error: `Segments vides pour jour ${day}` });
        const err = validateSegs(daySegs, `jour ${day}`);
        if (err) return res.status(400).json({ error: err });
      }
    } else {
      const err = validateSegs(segments, '');
      if (err) return res.status(400).json({ error: err });
    }
    // Dates
    const [sy, sm, sd] = startDate.split('-').map(Number);
    let start = new Date(Date.UTC(sy, sm-1, sd, 0,0,0,0));
    let finalEnd;
    if (endDate) {
      const [ey, em, ed] = endDate.split('-').map(Number);
      finalEnd = new Date(Date.UTC(ey, em-1, ed, 0,0,0,0));
    } else {
      // monthsCount fourni
      finalEnd = new Date(Date.UTC(sy, sm-1 + monthsCount, sd, 0,0,0,0));
      // reculer d'un jour pour inclure la veille du même numéro si besoin
      finalEnd.setUTCDate(finalEnd.getUTCDate() - 1);
    }
    if (finalEnd < start) return res.status(400).json({ error: 'Période invalide' });

    // Préparer un Set des daysOfWeek pour performance
    const dowSet = new Set(daysOfWeek.map(Number));

    // Collecte dates à créer
    const jobs = [];
    for (let d = new Date(start); d <= finalEnd; d.setUTCDate(d.getUTCDate() + 1)) {
      if (dowSet.has(d.getUTCDay())) {
        const iso = d.toISOString().slice(0,10);
        jobs.push(iso);
      }
    }

    let created = 0;
    const skipped = [];
    const replaced = [];

    // Option: récupérer tous les shifts existants pour les employés sur l'intervalle pour limiter queries
    const existingShifts = await prisma.shift.findMany({
      where: {
        employeId: { in: employeIds.map(Number) },
        date: { gte: start, lte: finalEnd },
        type: 'travail'
      },
      select: { id:true, employeId:true, date:true }
    });
    const existingMap = new Map(); // key: employeId|YYYY-MM-DD -> shiftId
    existingShifts.forEach(s => {
      const key = `${s.employeId}|${s.date.toISOString().slice(0,10)}`;
      existingMap.set(key, s.id);
    });

    // Normalised segments with ids — par jour si segmentsByDay fourni
    const normalizeSegs = (segs) => segs.map(seg => ({
      id: seg.id || require('crypto').randomUUID(),
      start: seg.start,
      end: seg.end,
      commentaire: seg.commentaire ? sanitize(seg.commentaire) : '',
      aValider: !!seg.aValider,
      isExtra: !!seg.isExtra,
      extraMontant: seg.extraMontant || '',
      paymentStatus: seg.paymentStatus || 'à_payer',
      paymentMethod: seg.paymentMethod || '',
      paymentDate: seg.paymentDate || '',
      paymentNote: seg.paymentNote ? sanitize(seg.paymentNote) : ''
    }));
    // Map jour -> segments normalisés
    const segmentsByDayNorm = {};
    if (hasSegmentsByDay) {
      for (const [day, daySegs] of Object.entries(segmentsByDay)) {
        segmentsByDayNorm[Number(day)] = normalizeSegs(daySegs);
      }
    }
    const baseSegments = hasSegmentsByDay ? null : normalizeSegs(segments);

    // 🛡️ RÉCUPÉRER TOUS LES CONGÉS APPROUVÉS POUR FILTRER LES DATES
    const congesApprouves = await prisma.conge.findMany({
      where: {
        userId: { in: employeIds.map(Number) },
        statut: 'approuvé',
        OR: [
          { dateDebut: { lte: finalEnd }, dateFin: { gte: start } }
        ]
      },
      select: { userId: true, dateDebut: true, dateFin: true, type: true }
    });
    
    // Fonction helper pour vérifier si une date est en congé pour un employé
    const estEnConge = (empId, dateStr) => {
      const dateCheck = new Date(dateStr + 'T00:00:00.000Z');
      return congesApprouves.some(c => 
        c.userId === Number(empId) && 
        dateCheck >= c.dateDebut && 
        dateCheck <= c.dateFin
      );
    };
    
    const skippedConges = []; // Dates sautées à cause de congés

    // Process by chunks to avoid very large transactions
    const createOps = [];
    for (const empId of employeIds) {
      for (const dateStr of jobs) {
        // 🛡️ VÉRIFICATION CONGÉ - Ne pas créer de shift sur jour de congé approuvé
        if (estEnConge(empId, dateStr)) {
          skippedConges.push(`${empId}|${dateStr}`);
          continue;
        }
        
        const key = `${empId}|${dateStr}`;
        const existsId = existingMap.get(key);
        if (existsId) {
          if (mode === 'skip') { skipped.push(key); continue; }
          if (mode === 'replace') {
            replaced.push(key);
            createOps.push({ action:'replace', shiftId: existsId, employeId: empId, dateStr });
          }
        } else {
          createOps.push({ action:'create', employeId: empId, dateStr });
        }
      }
    }

    // Execute in batches of 25 with extended timeout (Neon/Prisma default is 5s)
    const BATCH = 25;
    for (let i=0;i<createOps.length;i+=BATCH) {
      const slice = createOps.slice(i,i+BATCH);
      await prisma.$transaction(async (tx) => {
        for (const op of slice) {
          if (op.action === 'replace') {
            // 🔄 Nettoyer TOUTES les dépendances FK avant suppression
            await tx.demandeRemplacement.deleteMany({ where: { shiftId: op.shiftId } });
            await tx.extraPaymentLog.deleteMany({ where: { shiftId: op.shiftId } });
            await tx.shiftCorrection.deleteMany({ where: { shiftId: op.shiftId } });
            await tx.paiementExtra.updateMany({
              where: { shiftId: op.shiftId, statut: 'paye' },
              data: { statut: 'annule', motifAjustement: 'remplacement_recurrent' }
            });
            await tx.paiementExtra.deleteMany({ where: { shiftId: op.shiftId, statut: 'a_payer' } });
            await tx.shift.delete({ where: { id: op.shiftId } });
          }
          // Choisir les segments selon le jour de la semaine
          const dow = new Date(op.dateStr + 'T00:00:00.000Z').getUTCDay();
          const segsForDay = hasSegmentsByDay ? (segmentsByDayNorm[dow] || baseSegments) : baseSegments;
          await tx.shift.create({
            data: {
              employeId: Number(op.employeId),
              date: new Date(op.dateStr + 'T00:00:00.000Z'),
              type: 'travail',
              motif: null,
              segments: segsForDay
            }
          });
          created++;
        }
      }, { maxWait: 10000, timeout: 30000 });
    }

    res.json({
      success: true,
      created,
      skipped: skipped.length,
      skippedConges: skippedConges.length, // 🛡️ Dates sautées car congés approuvés
      replaced: replaced.length,
      totalDates: jobs.length,
      employees: employeIds.length,
      from: startDate,
      to: finalEnd.toISOString().slice(0,10)
    });
    
    // 📋 AUDIT: création récurrente
    if (created > 0) {
      logAudit({
        entite: 'shift_batch', entiteId: null, action: 'batch_creation',
        userId: Number(getUserId(req)),
        details: { metadata: { type: 'recurrent', created, skipped: skipped.length, replaced: replaced.length, employeIds, startDate, endDate: finalEnd.toISOString().slice(0,10), daysOfWeek, mode } },
        ipAddress: getIp(req)
      });
    }
  } catch (e) {
    console.error('Erreur createRecurringShifts:', e);
    res.status(500).json({ error: 'Erreur création récurrente' });
  }
};

// DELETE (POST helper) : suppression en masse d'une plage pour un ou plusieurs employés
const deleteRangeShifts = async (req, res) => {
  /* Body:
    { employeIds?: [Int], startDate:'YYYY-MM-DD', endDate:'YYYY-MM-DD', type?: 'présence'|'absence'|undefined }
  */
  const { employeIds, startDate, endDate, type } = req.body || {};
  if (!startDate || !endDate) return res.status(400).json({ error: 'startDate et endDate requis' });
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const start = new Date(Date.UTC(sy, sm-1, sd, 0,0,0,0));
  const end = new Date(Date.UTC(ey, em-1, ed, 23,59,59,999));
  if (end < start) return res.status(400).json({ error: 'Période invalide' });
  try {
    const where = {
      date: { gte: start, lte: end },
      ...(Array.isArray(employeIds) && employeIds.length ? { employeId: { in: employeIds.map(Number) } } : {}),
      ...(type ? { type } : {})
    };
    
    // D'abord récupérer les IDs des shifts à supprimer
    const shiftsToDelete = await prisma.shift.findMany({
      where,
      select: { id: true, type: true, employeId: true, date: true }
    });
    const shiftIds = shiftsToDelete.map(s => s.id);
    
    if (shiftIds.length === 0) {
      return res.json({ success: true, deleted: 0 });
    }
    
    // 🔄 TRANSACTION COMPLÈTE — supprimer TOUTES les dépendances puis les shifts
    await prisma.$transaction(async (tx) => {
      // 1. Demandes de remplacement
      await tx.demandeRemplacement.deleteMany({ where: { shiftId: { in: shiftIds } } });
      // 2. ExtraPaymentLog (FK vers Shift)
      await tx.extraPaymentLog.deleteMany({ where: { shiftId: { in: shiftIds } } });
      // 3. ShiftCorrection (FK vers Shift)
      await tx.shiftCorrection.deleteMany({ where: { shiftId: { in: shiftIds } } });
      // 4. PaiementExtra liés (marquage annulé pour les payés, suppression pour à_payer)
      await tx.paiementExtra.updateMany({ 
        where: { shiftId: { in: shiftIds }, statut: 'paye' },
        data: { statut: 'annule', motifAjustement: 'suppression_shift_range' }
      });
      await tx.paiementExtra.deleteMany({ 
        where: { shiftId: { in: shiftIds }, statut: 'a_payer' }
      });
      // 5. Congés auto-créés pour les absences
      const absenceShifts = shiftsToDelete.filter(s => s.type === 'absence');
      for (const abs of absenceShifts) {
        const absDate = new Date(abs.date);
        const dayStart = new Date(absDate); dayStart.setHours(0,0,0,0);
        const dayEnd = new Date(absDate); dayEnd.setHours(23,59,59,999);
        await tx.conge.deleteMany({
          where: {
            userId: abs.employeId,
            dateDebut: { lte: dayEnd },
            dateFin: { gte: dayStart },
            motifEmploye: 'Absence posée par l\'administration'
          }
        });
      }
      // 6. Supprimer les shifts
      await tx.shift.deleteMany({ where: { id: { in: shiftIds } } });
      // 📋 AUDIT: suppression en masse
      await logAudit({
        entite: 'shift_range', entiteId: null, action: 'batch_suppression',
        userId: Number(getUserId(req)),
        details: { before: { shiftIds, shifts: shiftsToDelete }, metadata: { startDate, endDate, type, employeIds } },
        ipAddress: getIp(req), tx
      });
    }, { maxWait: 10000, timeout: 30000 });
    
    res.json({ success: true, deleted: shiftIds.length });
  } catch (e) {
    console.error('Erreur suppression plage:', e);
    res.status(500).json({ error: 'Erreur suppression plage' });
  }
};

module.exports = {
  getShifts,
  createOrUpdateShift,
  deleteShift,
  getExtrasSegments,
  updateExtraPayment,
  getShiftExtraLogs,
  createBatchShifts,
  createRecurringShifts,
  deleteRangeShifts
};
