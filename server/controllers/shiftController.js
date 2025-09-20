const prisma = require("../prisma/client");
// Sanitisation basique pour éviter injection HTML (notes/commentaires)
function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c]));
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
      include: { employe: { select: { id: true, email: true } } },
      orderBy: [{ date: "asc" }],
    });

    // S'assurer que les dates sont formatées en ISO string pour faciliter la manipulation côté client
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
      
      return {
        ...shift,
        date: formattedDate
      };
    });

    console.log("Shifts envoyés au client:", formattedShifts);

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

    // Validation segments si présence
    let safeSegments = [];
    if (type === 'présence') {
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
        if (start >= end) {
          throw new Error(`Heure début >= fin segment ${idx+1}`);
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
      }).sort((a,b)=> a.start.localeCompare(b.start));
      // Détection overlaps
      for (let i=1;i<normalized.length;i++) {
        if (normalized[i-1].end > normalized[i].start) {
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
      
      // Mise à jour directe sans vérification de version
      shift = await prisma.shift.update({
        where: { id },
        data: {
          employeId,
          date: dateObj,
          type,
          motif: type === "absence" ? motif : null,
          segments: type === "présence" ? safeSegments : []
          // Suppression de l'incrémentation de version
        },
      });
    } else {
      // Création (fusion si un shift présence existe déjà pour même jour/employé)
      if (type === 'présence') {
        const existing = await prisma.shift.findFirst({ where: { employeId: Number(employeId), date: dateObj, type: 'présence' } });
        if (existing) {
          // Fusion segments (concat + tri + revalidation overlap)
          const merged = [...existing.segments, ...safeSegments].sort((a,b)=> a.start.localeCompare(b.start));
          for (let i=1;i<merged.length;i++) {
            if (merged[i-1].end > merged[i].start) {
              return res.status(400).json({ error: 'Chevauchement après fusion segments' });
            }
          }
          shift = await prisma.shift.update({ where:{ id: existing.id }, data:{ segments: merged }});
        } else {
          shift = await prisma.shift.create({
            data: {
              employeId,
              date: dateObj,
              type,
              motif: type === 'absence' ? motif : null,
              segments: safeSegments,
              // version supprimée
            },
          });
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
    // Vérifier existence
    const existing = await prisma.shift.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: 'Shift introuvable' });

    // Transaction: supprimer d'abord les logs dépendants (pas de cascade défini dans le schema)
    await prisma.$transaction(async (tx) => {
      await tx.extraPaymentLog.deleteMany({ where: { shiftId: id } });
      await tx.shift.delete({ where: { id } });
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
    console.log("📝 Recherche logs pour shiftId:", shiftId);
    
    // Vérifier si des logs existent dans la table
    const count = await prisma.extraPaymentLog.count();
    console.log("📊 Nombre total de logs dans la table:", count);
    
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
    
    console.log("🔍 Logs trouvés:", logs.length);
    if (logs.length === 0) {
      // Si aucun log, vérifier si le shift existe
      const shift = await prisma.shift.findUnique({ 
        where: { id: shiftId },
        select: { id: true, employeId: true }  
      });
      console.log("🔍 Shift existe:", !!shift);
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
      newSegmentDraft.paymentDate = new Date().toISOString().split('T')[0];
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

// POST : création en batch de plusieurs shifts
const createBatchShifts = async (req, res) => {
  const { shifts } = req.body;
  
  if (!Array.isArray(shifts) || shifts.length === 0) {
    return res.status(400).json({ error: "Aucun planning à créer" });
  }

  try {
    const result = [];
    const errors = [];
    
    for (const shiftData of shifts) {
      // Support du nouveau format avec segments multiples ET de l'ancien format
      let { employeeId, date, segments, type = 'présence', startTime, endTime } = shiftData;
      
      // Conversion employeeId vers employeId pour compatibilité
      const employeId = Number(employeeId);
      
      if (!employeId || !date) {
        errors.push(`Données manquantes (employeId ou date) pour un planning: ${JSON.stringify(shiftData)}`);
        continue;
      }
      
      // Si pas de segments mais startTime/endTime (ancien format), créer un segment
      if (!segments && startTime && endTime) {
        segments = [{
          start: startTime,
          end: endTime,
          commentaire: "",
          aValider: false,
          isExtra: false,
          extraMontant: '',
          paymentStatus: 'à_payer',
          paymentMethod: '',
          paymentDate: '',
          paymentNote: ''
        }];
      }
      
      if (!segments || !Array.isArray(segments) || segments.length === 0) {
        errors.push(`Aucun segment fourni pour un planning: ${JSON.stringify(shiftData)}`);
        continue;
      }
      
      try {
        // Normalisation date (YYYY-MM-DD) -> objet Date UTC minuit
        let dateObj;
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
          const [year, month, day] = date.split('-').map(Number);
          dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        } else {
          dateObj = new Date(date);
        }
        
        if (isNaN(dateObj.getTime())) {
          errors.push(`Date invalide: ${date}`);
          continue;
        }
        
        // Validation de tous les segments
        const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
        let segmentsValides = true;
        
        for (const segment of segments) {
          if (!segment.start || !segment.end) {
            errors.push(`Segment sans horaires: ${JSON.stringify(segment)}`);
            segmentsValides = false;
            break;
          }
          
          if (!timeRegex.test(segment.start) || !timeRegex.test(segment.end)) {
            errors.push(`Format heure invalide dans segment: ${segment.start} - ${segment.end}`);
            segmentsValides = false;
            break;
          }
          
          if (segment.start >= segment.end) {
            errors.push(`L'heure de début doit être antérieure à l'heure de fin dans segment: ${segment.start} - ${segment.end}`);
            segmentsValides = false;
            break;
          }
        }
        
        if (!segmentsValides) {
          continue;
        }
        
        // Ajouter des IDs aux segments s'ils n'en ont pas
        const segmentsAvecIds = segments.map(segment => ({
          id: segment.id || require('crypto').randomUUID(),
          start: segment.start,
          end: segment.end,
          commentaire: segment.commentaire || "",
          aValider: segment.aValider || false,
          isExtra: segment.isExtra || false,
          extraMontant: segment.extraMontant || '',
          paymentStatus: segment.paymentStatus || 'à_payer',
          paymentMethod: segment.paymentMethod || '',
          paymentDate: segment.paymentDate || '',
          paymentNote: segment.paymentNote || ''
        }));
        
        console.log(`[BATCH] Création planning - date: ${date}, employé: ${employeId}, segments: ${segmentsAvecIds.length}`);
        
        // Création du shift avec segments multiples
        const shift = await prisma.shift.create({
          data: {
            employeId: parseInt(employeId, 10),
            date: dateObj,
            type,
            motif: '',
            segments: segmentsAvecIds,
          }
        });
        
        console.log(`Planning créé avec succès: id=${shift.id}, date=${shift.date}, segments=${shift.segments.length}`);
        result.push(shift);
      } catch (error) {
        console.error(`Erreur pour un planning:`, error);
        errors.push(`Erreur pour un planning: ${error.message}`);
      }
    }
    
    res.status(201).json({
      success: errors.length === 0,
      created: result.length,
      shifts: result.map(s => ({ ...s, date: s.date instanceof Date ? s.date.toISOString() : s.date })),
      errors: errors.length > 0 ? errors : undefined,
      message: 'Batch créé (code sans status)'
    });
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
  const { employeIds, startDate, endDate, monthsCount, daysOfWeek, segments, mode='skip' } = req.body || {};
  if (!Array.isArray(employeIds) || employeIds.length === 0) return res.status(400).json({ error: 'employeIds requis' });
  if (!startDate) return res.status(400).json({ error: 'startDate requis' });
  if ((!endDate && !monthsCount) || (endDate && monthsCount)) return res.status(400).json({ error: 'Fournir soit endDate soit monthsCount' });
  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) return res.status(400).json({ error: 'daysOfWeek requis' });
  if (!Array.isArray(segments) || segments.length === 0) return res.status(400).json({ error: 'segments requis' });

  try {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const seg of segments) {
      if (!seg.start || !seg.end || !timeRegex.test(seg.start) || !timeRegex.test(seg.end) || seg.start >= seg.end) {
        return res.status(400).json({ error: `Segment invalide ${seg.start || '?'}-${seg.end || '?'}` });
      }
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
        type: 'présence'
      },
      select: { id:true, employeId:true, date:true }
    });
    const existingMap = new Map(); // key: employeId|YYYY-MM-DD -> shiftId
    existingShifts.forEach(s => {
      const key = `${s.employeId}|${s.date.toISOString().slice(0,10)}`;
      existingMap.set(key, s.id);
    });

    // Normalised segments with ids
    const baseSegments = segments.map(seg => ({
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

    // Process by chunks to avoid very large transactions
    const createOps = [];
    for (const empId of employeIds) {
      for (const dateStr of jobs) {
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

    // Execute in batches of 100
    const BATCH = 100;
    for (let i=0;i<createOps.length;i+=BATCH) {
      const slice = createOps.slice(i,i+BATCH);
      await prisma.$transaction(async (tx) => {
        for (const op of slice) {
          if (op.action === 'replace') {
            await tx.shift.delete({ where: { id: op.shiftId } });
          }
          await tx.shift.create({
            data: {
              employeId: Number(op.employeId),
              date: new Date(op.dateStr + 'T00:00:00.000Z'),
              type: 'présence',
              motif: null,
              segments: baseSegments
            }
          });
          created++;
        }
      });
    }

    res.json({
      success: true,
      created,
      skipped: skipped.length,
      replaced: replaced.length,
      totalDates: jobs.length,
      employees: employeIds.length,
      from: startDate,
      to: finalEnd.toISOString().slice(0,10)
    });
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
    const count = await prisma.shift.deleteMany({ where });
    res.json({ success:true, deleted: count.count });
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
