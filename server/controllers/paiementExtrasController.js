// server/controllers/paiementExtrasController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { toLocalDateString } = require('../utils/dateUtils');

// Fonction helper pour parser les segments JSON
function parseSegments(segments) {
  if (!segments) return [];
  if (Array.isArray(segments)) return segments;
  if (typeof segments === 'string') {
    try {
      const parsed = JSON.parse(segments);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }
  return [];
}

/**
 * Récupérer tous les paiements extras avec filtres
 * GET /api/paiements-extras?statut=a_payer&employe=123&dateDebut=2025-01-01&dateFin=2025-01-31
 */
const getAllPaiements = async (req, res) => {
  try {
    const { statut, employeId, dateDebut, dateFin, source } = req.query;
    
    const where = {};
    
    if (statut) where.statut = statut;
    if (employeId) where.employeId = parseInt(employeId);
    if (source) where.source = source;
    
    if (dateDebut || dateFin) {
      where.date = {};
      if (dateDebut) where.date.gte = new Date(dateDebut);
      if (dateFin) where.date.lte = new Date(dateFin);
    }
    
    const paiements = await prisma.paiementExtra.findMany({
      where,
      include: {
        employe: {
          select: { id: true, nom: true, prenom: true, email: true }
        },
        payeur: {
          select: { id: true, nom: true, prenom: true }
        },
        anomalie: {
          select: { id: true, type: true, date: true, gravite: true, details: true }
        }
      },
      orderBy: [
        { statut: 'asc' }, // a_payer en premier
        { date: 'desc' }
      ]
    });
    
    // Récupérer les shifts liés pour les paiements shift_extra
    const shiftIds = [...new Set(paiements.filter(p => p.shiftId).map(p => p.shiftId))];
    const shifts = shiftIds.length > 0 ? await prisma.shift.findMany({
      where: { id: { in: shiftIds } },
      select: { id: true, date: true, segments: true }
    }) : [];
    const shiftsMap = Object.fromEntries(shifts.map(s => [s.id, s]));
    
    // Attacher les shifts aux paiements
    const paiementsWithShifts = paiements.map(p => ({
      ...p,
      shift: p.shiftId ? shiftsMap[p.shiftId] || null : null
    }));
    
    res.json({
      success: true,
      total: paiementsWithShifts.length,
      paiements: paiementsWithShifts
    });
    
  } catch (error) {
    console.error('Erreur getAllPaiements:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des paiements' });
  }
};

/**
 * Récupérer un paiement par ID
 * GET /api/paiements-extras/:id
 */
const getPaiementById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const paiement = await prisma.paiementExtra.findUnique({
      where: { id: parseInt(id) },
      include: {
        employe: {
          select: { id: true, nom: true, prenom: true, email: true, telephone: true }
        },
        payeur: {
          select: { id: true, nom: true, prenom: true }
        },
        anomalie: {
          select: { id: true, type: true, date: true, gravite: true, details: true }
        }
      }
    });
    
    if (!paiement) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }
    
    res.json({ success: true, paiement });
    
  } catch (error) {
    console.error('Erreur getPaiementById:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du paiement' });
  }
};

/**
 * Récupérer les paiements d'un employé
 * GET /api/paiements-extras/employe/:employeId
 */
const getPaiementsByEmploye = async (req, res) => {
  try {
    const { employeId } = req.params;
    const { statut } = req.query;
    
    const where = { employeId: parseInt(employeId) };
    if (statut) where.statut = statut;
    
    const paiements = await prisma.paiementExtra.findMany({
      where,
      include: {
        payeur: {
          select: { nom: true, prenom: true }
        },
        anomalie: {
          select: { type: true, date: true, details: true }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    // Calculs totaux
    const stats = {
      total: paiements.length,
      aPayer: paiements.filter(p => p.statut === 'a_payer').length,
      paye: paiements.filter(p => p.statut === 'paye').length,
      montantAPayer: paiements
        .filter(p => p.statut === 'a_payer')
        .reduce((sum, p) => sum + (p.montant || 0), 0),
      montantPaye: paiements
        .filter(p => p.statut === 'paye')
        .reduce((sum, p) => sum + (p.montant || 0), 0),
      heuresAPayer: paiements
        .filter(p => p.statut === 'a_payer')
        .reduce((sum, p) => sum + (p.heures || 0), 0),
      heuresPaye: paiements
        .filter(p => p.statut === 'paye')
        .reduce((sum, p) => sum + (p.heures || 0), 0)
    };
    
    res.json({ success: true, paiements, stats });
    
  } catch (error) {
    console.error('Erreur getPaiementsByEmploye:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des paiements' });
  }
};

/**
 * Créer un nouveau paiement extra
 * POST /api/paiements-extras
 * Sources: "shift_extra" | "anomalie_heures_sup" | "manuel"
 */
const createPaiement = async (req, res) => {
  try {
    const {
      employeId,
      anomalieId,
      shiftId,
      dateTravail, // accepte dateTravail ou date depuis le frontend
      date: dateFromBody,
      heures,
      tauxHoraire,
      montant,
      source = 'manuel',
      methodePaiement = 'especes',
      commentaire
    } = req.body;
    
    // Accepter soit dateTravail soit date
    const dateValue = dateTravail || dateFromBody;
    
    const userId = req.userId || req.user?.userId || req.user?.id;
    
    // Validations
    if (!employeId) {
      return res.status(400).json({ error: 'employeId requis' });
    }
    if (!dateValue) {
      return res.status(400).json({ error: 'date requise' });
    }
    if (!heures || heures <= 0) {
      return res.status(400).json({ error: 'heures doit être supérieur à 0' });
    }
    
    // Vérifier que l'employé existe
    const employe = await prisma.user.findUnique({
      where: { id: parseInt(employeId) },
      select: { id: true, nom: true, prenom: true, tauxHoraireExtra: true }
    });
    
    if (!employe) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }
    
    // Calculer le montant si pas fourni
    const tauxEffectif = tauxHoraire || employe.tauxHoraireExtra || 10; // Défaut: 10€/h
    const montantCalcule = montant || (heures * tauxEffectif);
    
    // Créer le paiement
    const paiement = await prisma.paiementExtra.create({
      data: {
        employeId: parseInt(employeId),
        anomalieId: anomalieId ? parseInt(anomalieId) : null,
        shiftId: shiftId ? parseInt(shiftId) : null,
        date: new Date(dateValue),
        heures: parseFloat(heures),
        tauxHoraire: parseFloat(tauxEffectif),
        montant: parseFloat(montantCalcule),
        source,
        statut: 'a_payer',
        commentaire,
        creePar: userId
      },
      include: {
        employe: {
          select: { nom: true, prenom: true }
        }
      }
    });
    
    console.log(`💰 Paiement extra créé: ${heures}h pour ${employe.nom} ${employe.prenom} - ${montantCalcule}€`);
    
    res.status(201).json({
      success: true,
      message: `Paiement de ${montantCalcule.toFixed(2)}€ créé pour ${employe.prenom} ${employe.nom}`,
      paiement
    });
    
  } catch (error) {
    console.error('Erreur createPaiement:', error);
    res.status(500).json({ error: 'Erreur lors de la création du paiement' });
  }
};

/**
 * Marquer un paiement comme payé
 * PUT /api/paiements-extras/:id/payer
 */
const marquerPaye = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire, methodePaiement, reference, tauxHoraire } = req.body;
    const userId = req.userId || req.user?.userId || req.user?.id;
    
    const paiement = await prisma.paiementExtra.findUnique({
      where: { id: parseInt(id) },
      include: {
        employe: { select: { nom: true, prenom: true } }
      }
    });
    
    if (!paiement) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }
    
    if (paiement.statut === 'paye') {
      return res.status(400).json({ error: 'Ce paiement a déjà été effectué' });
    }
    
    if (paiement.statut === 'annule') {
      return res.status(400).json({ error: 'Ce paiement a été annulé' });
    }
    
    // Recalculer le montant si un nouveau taux horaire est fourni
    const nouveauTaux = tauxHoraire ? parseFloat(tauxHoraire) : parseFloat(paiement.tauxHoraire);
    const heures = parseFloat(paiement.heures);
    const nouveauMontant = heures * nouveauTaux;
    
    // Construire le commentaire avec la méthode de paiement et la référence
    let commentaireFinal = commentaire || paiement.commentaire || '';
    if (methodePaiement) {
      const methodeLabel = methodePaiement === 'especes' ? 'Espèces' : 
                          methodePaiement === 'virement' ? 'Virement' : 
                          methodePaiement === 'cheque' ? 'Chèque' : methodePaiement;
      commentaireFinal = `Payé par ${methodeLabel}${reference ? ` (Réf: ${reference})` : ''}${commentaireFinal ? ` - ${commentaireFinal}` : ''}`;
    }
    
    const paiementMAJ = await prisma.paiementExtra.update({
      where: { id: parseInt(id) },
      data: {
        statut: 'paye',
        payeLe: new Date(),
        payePar: userId,
        tauxHoraire: nouveauTaux,
        montant: nouveauMontant,
        commentaire: commentaireFinal || null
      },
      include: {
        employe: { select: { nom: true, prenom: true } },
        payeur: { select: { nom: true, prenom: true } }
      }
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // 🔄 SYNCHRONISER LE SEGMENT DU SHIFT AVEC LE STATUT PAYÉ
    // ═══════════════════════════════════════════════════════════════════════════
    if (paiement.shiftId && paiement.segmentIndex !== null && paiement.segmentIndex !== undefined) {
      try {
        const shift = await prisma.shift.findUnique({
          where: { id: paiement.shiftId }
        });
        
        if (shift && shift.segments) {
          // Parser les segments si nécessaire
          let segments = typeof shift.segments === 'string' 
            ? JSON.parse(shift.segments) 
            : (Array.isArray(shift.segments) ? [...shift.segments] : []);
          
          if (segments[paiement.segmentIndex] && segments[paiement.segmentIndex].isExtra) {
            segments[paiement.segmentIndex] = {
              ...segments[paiement.segmentIndex],
              paymentStatus: 'paye',
              paymentMethod: methodePaiement || 'especes',
              paymentDate: new Date().toISOString()
            };
            
            await prisma.shift.update({
              where: { id: paiement.shiftId },
              data: { segments }
            });
            
            console.log(`🔄 Segment ${paiement.segmentIndex} du shift ${paiement.shiftId} mis à jour: paymentStatus = 'paye'`);
          }
        }
      } catch (syncError) {
        console.error('⚠️ Erreur synchronisation segment shift:', syncError);
        // On ne bloque pas - le paiement est quand même marqué payé
      }
    }
    
    console.log(`✅ Paiement ${id} marqué payé: ${nouveauMontant.toFixed(2)}€ (${heures}h x ${nouveauTaux}€/h) à ${paiement.employe.prenom} ${paiement.employe.nom}`);
    
    res.json({
      success: true,
      message: `Paiement de ${nouveauMontant.toFixed(2)}€ marqué comme payé`,
      paiement: paiementMAJ,
      shiftUpdated: !!(paiement.shiftId && paiement.segmentIndex !== null)
    });
    
  } catch (error) {
    console.error('Erreur marquerPaye:', error);
    res.status(500).json({ error: 'Erreur lors du marquage du paiement' });
  }
};

/**
 * Annuler un paiement
 * PUT /api/paiements-extras/:id/annuler
 * 
 * LOGIQUE INTELLIGENTE :
 * - Shift FUTUR (date > aujourd'hui) → Retirer segment + annuler paiement
 * - Shift JOUR MÊME + heure < fin segment → Traiter comme futur
 * - Shift JOUR MÊME + heure >= fin segment → Vérifier pointage
 * - Shift PASSÉ + NON POINTÉ → Retirer segment + annuler paiement  
 * - Shift PASSÉ + POINTÉ → Garder segment, juste annuler paiement
 */
const annulerPaiement = async (req, res) => {
  try {
    const { id } = req.params;
    const { raison, forcerAnnulation } = req.body;
    const userId = req.userId || req.user?.userId || req.user?.id;
    
    const paiement = await prisma.paiementExtra.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!paiement) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }
    
    // Permettre l'annulation d'un paiement déjà effectué si forcerAnnulation est true
    if (paiement.statut === 'paye' && !forcerAnnulation) {
      return res.status(400).json({ 
        error: 'Ce paiement a déjà été effectué. Confirmez l\'annulation pour continuer.',
        requireConfirmation: true
      });
    }
    
    // Trouver le shift associé (par shiftId ou par date/employé)
    let shift = null;
    if (paiement.shiftId) {
      shift = await prisma.shift.findUnique({
        where: { id: paiement.shiftId }
      });
    }
    if (!shift) {
      shift = await prisma.shift.findFirst({
        where: {
          employeId: paiement.employeId,
          date: paiement.date
        }
      });
    }
    
    // Déterminer si on peut retirer le segment
    const now = new Date();
    const paiementDate = new Date(paiement.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    paiementDate.setHours(0, 0, 0, 0);
    
    let canRemoveSegment = false;
    let reason = '';
    let isPointe = false;
    
    // Trouver le segment extra et son heure de fin
    let segmentExtra = null;
    const segments = parseSegments(shift?.segments);
    if (shift && segments.length > 0) {
      segmentExtra = segments.find(s => s.isExtra);
    }
    
    // Vérifier si des pointages existent pour ce jour
    if (shift) {
      const startOfDay = new Date(paiement.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(paiement.date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const pointages = await prisma.pointage.findMany({
        where: {
          userId: paiement.employeId,
          horodatage: { gte: startOfDay, lte: endOfDay }
        }
      });
      isPointe = pointages.length > 0;
    }
    
    console.log(`🔍 Annulation paiement ${id}:`);
    console.log(`   - Date paiement: ${paiement.date}`);
    console.log(`   - Source: ${paiement.source}`);
    console.log(`   - Shift trouvé: ${shift ? shift.id : 'NON'}`);
    console.log(`   - Segment extra: ${segmentExtra ? `${segmentExtra.start}-${segmentExtra.end}` : 'NON'}`);
    console.log(`   - A des pointages: ${isPointe}`);
    
    if (paiementDate > today) {
      // Shift FUTUR
      canRemoveSegment = true;
      reason = 'Shift futur - segment retiré du planning';
      console.log(`   ✅ Shift FUTUR → retrait segment autorisé`);
    } else if (paiementDate.getTime() === today.getTime()) {
      // Shift JOUR MÊME - vérifier l'heure
      if (segmentExtra) {
        const [endH, endM] = segmentExtra.end.split(':').map(Number);
        const segmentEndTime = new Date();
        segmentEndTime.setHours(endH, endM, 0, 0);
        
        if (now < segmentEndTime) {
          // L'heure actuelle est avant la fin du segment → traiter comme futur
          canRemoveSegment = true;
          reason = 'Segment pas encore terminé - retiré du planning';
          console.log(`   ✅ Segment pas encore terminé (${segmentExtra.end}) → retrait autorisé`);
        } else if (!isPointe) {
          // Segment terminé mais pas pointé → on peut retirer
          canRemoveSegment = true;
          reason = 'Segment non pointé - retiré du planning';
          console.log(`   ✅ Segment terminé mais non pointé → retrait autorisé`);
        } else {
          // Segment terminé ET pointé → garder le segment
          canRemoveSegment = false;
          reason = 'Segment déjà pointé - conservé dans le planning';
          console.log(`   ❌ Segment terminé ET pointé → segment conservé`);
        }
      } else {
        canRemoveSegment = false;
        reason = 'Pas de segment extra trouvé';
      }
    } else {
      // Shift PASSÉ
      if (!isPointe) {
        canRemoveSegment = true;
        reason = 'Shift passé non pointé - retiré du planning';
        console.log(`   ✅ Shift PASSÉ non pointé → retrait autorisé`);
      } else {
        canRemoveSegment = false;
        reason = 'Shift passé pointé - conservé dans le planning';
        console.log(`   ❌ Shift PASSÉ mais pointé → segment conservé`);
      }
    }
    
    // Si forcerAnnulation est true, on retire TOUJOURS le segment (annulation manuelle confirmée)
    if (forcerAnnulation && !canRemoveSegment) {
      canRemoveSegment = true;
      reason = 'Annulation forcée - segment retiré du planning';
      console.log(`   ⚡ FORÇAGE → retrait segment autorisé malgré pointage`);
    }
    
    // Retirer le segment si autorisé (pour toutes les sources qui créent un segment)
    const sourcesAvecSegment = ['shift', 'shift_extra', 'anomalie_extra', 'anomalie_heures_sup'];
    if (canRemoveSegment && shift && segments.length > 0 && sourcesAvecSegment.includes(paiement.source)) {
      const segmentsSansExtra = segments.filter(s => !s.isExtra);
      
      if (segmentsSansExtra.length !== segments.length) {
        await prisma.shift.update({
          where: { id: shift.id },
          data: { segments: segmentsSansExtra }
        });
        console.log(`🗑️ Segment extra retiré du shift ${shift.id}`);
      }
    }
    
    // Si forçage d'annulation (paiement déjà effectué), ajouter une note
    const noteForce = (paiement.statut === 'paye' && forcerAnnulation) 
      ? ' [ANNULATION FORCÉE - Paiement déjà effectué]' 
      : '';
    
    // Mettre à jour le paiement
    const commentaire = raison 
      ? `[Annulé] ${raison} (${reason})${noteForce}`
      : `[Annulé] ${reason}${noteForce}`;
    
    const paiementMAJ = await prisma.paiementExtra.update({
      where: { id: parseInt(id) },
      data: {
        statut: 'annule',
        commentaire
      }
    });
    
    // 🔄 Si le paiement était lié à une anomalie, la remettre en "en_attente"
    let anomalieReactivee = false;
    if (paiement.anomalieId) {
      const anomalie = await prisma.anomalie.findUnique({
        where: { id: paiement.anomalieId }
      });
      if (anomalie && anomalie.statut === 'validee') {
        // Nettoyer les détails liés au paiement
        const details = typeof anomalie.details === 'object' ? { ...anomalie.details } : {};
        delete details.payeEnExtra;
        delete details.paiementExtraId;
        delete details.segmentIndexExtra;
        delete details.heuresPayeesExtra;
        delete details.montantExtra;
        delete details.tauxHoraire;
        details.paiementAnnuleLe = new Date().toISOString();
        details.paiementAnnuleRaison = raison || 'Annulation manuelle';
        
        await prisma.anomalie.update({
          where: { id: paiement.anomalieId },
          data: {
            statut: 'en_attente',
            details
          }
        });
        anomalieReactivee = true;
        console.log(`🔄 Anomalie #${paiement.anomalieId} remise en "en_attente"`);
      }
    }
    
    console.log(`❌ Paiement ${id} annulé. Segment retiré: ${canRemoveSegment}. Anomalie réactivée: ${anomalieReactivee}`);
    
    res.json({
      success: true,
      message: canRemoveSegment 
        ? `Paiement annulé - ${reason}${anomalieReactivee ? ' - Anomalie réactivée' : ''}`
        : `Paiement annulé (${reason})${anomalieReactivee ? ' - Anomalie réactivée' : ''}`,
      paiement: paiementMAJ,
      segmentRetire: canRemoveSegment,
      anomalieReactivee,
      raison: reason
    });
    
  } catch (error) {
    console.error('Erreur annulerPaiement:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation du paiement' });
  }
};

/**
 * Statistiques globales des paiements
 * GET /api/paiements-extras/stats?mois=2025-01
 */
const getStatsPaiements = async (req, res) => {
  try {
    const { mois, annee } = req.query;
    
    let dateDebut, dateFin;
    
    if (mois) {
      // Format: "2025-01"
      const [year, month] = mois.split('-').map(Number);
      dateDebut = new Date(year, month - 1, 1);
      dateFin = new Date(year, month, 0, 23, 59, 59);
    } else if (annee) {
      dateDebut = new Date(parseInt(annee), 0, 1);
      dateFin = new Date(parseInt(annee), 11, 31, 23, 59, 59);
    } else {
      // Mois en cours par défaut
      const now = new Date();
      dateDebut = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }
    
    const paiements = await prisma.paiementExtra.findMany({
      where: {
        date: {
          gte: dateDebut,
          lte: dateFin
        }
      },
      include: {
        employe: {
          select: { id: true, nom: true, prenom: true }
        }
      }
    });
    
    // Agrégations
    const stats = {
      periode: {
        debut: toLocalDateString(dateDebut),
        fin: toLocalDateString(dateFin)
      },
      totaux: {
        nombrePaiements: paiements.length,
        heuresTotal: paiements.reduce((sum, p) => sum + (p.heures || 0), 0),
        montantTotal: paiements.reduce((sum, p) => sum + (p.montant || 0), 0)
      },
      parStatut: {
        a_payer: {
          nombre: paiements.filter(p => p.statut === 'a_payer').length,
          montant: paiements.filter(p => p.statut === 'a_payer').reduce((sum, p) => sum + (p.montant || 0), 0),
          heures: paiements.filter(p => p.statut === 'a_payer').reduce((sum, p) => sum + (p.heures || 0), 0)
        },
        paye: {
          nombre: paiements.filter(p => p.statut === 'paye').length,
          montant: paiements.filter(p => p.statut === 'paye').reduce((sum, p) => sum + (p.montant || 0), 0),
          heures: paiements.filter(p => p.statut === 'paye').reduce((sum, p) => sum + (p.heures || 0), 0)
        },
        annule: {
          nombre: paiements.filter(p => p.statut === 'annule').length,
          montant: paiements.filter(p => p.statut === 'annule').reduce((sum, p) => sum + (p.montant || 0), 0),
          heures: paiements.filter(p => p.statut === 'annule').reduce((sum, p) => sum + (p.heures || 0), 0)
        }
      },
      parSource: {
        shift_extra: paiements.filter(p => p.source === 'shift_extra').length,
        anomalie_heures_sup: paiements.filter(p => p.source === 'anomalie_heures_sup').length,
        manuel: paiements.filter(p => p.source === 'manuel').length
      }
    };
    
    // Top employés (heures extras)
    const parEmploye = {};
    paiements.forEach(p => {
      const key = p.employeId;
      if (!parEmploye[key]) {
        parEmploye[key] = {
          id: p.employeId,
          nom: p.employe.nom,
          prenom: p.employe.prenom,
          heures: 0,
          montant: 0,
          nombre: 0
        };
      }
      parEmploye[key].heures += p.heures || 0;
      parEmploye[key].montant += p.montant || 0;
      parEmploye[key].nombre += 1;
    });
    
    stats.parEmploye = Object.values(parEmploye)
      .sort((a, b) => b.heures - a.heures)
      .slice(0, 10); // Top 10
    
    res.json({ success: true, stats });
    
  } catch (error) {
    console.error('Erreur getStatsPaiements:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
  }
};

/**
 * Récupérer la liste des paiements à effectuer (rapide pour dashboard)
 * GET /api/paiements-extras/a-payer
 */
const getAPayer = async (req, res) => {
  try {
    const paiements = await prisma.paiementExtra.findMany({
      where: { statut: 'a_payer' },
      include: {
        employe: {
          select: { id: true, nom: true, prenom: true, email: true }
        },
        anomalie: {
          select: { type: true, date: true, details: true }
        }
      },
      orderBy: { date: 'asc' }
    });
    
    const total = paiements.reduce((sum, p) => sum + (p.montant || 0), 0);
    const heuresTotal = paiements.reduce((sum, p) => sum + (p.heures || 0), 0);
    
    res.json({
      success: true,
      count: paiements.length,
      montantTotal: total,
      heuresTotal,
      paiements
    });
    
  } catch (error) {
    console.error('Erreur getAPayer:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des paiements à effectuer' });
  }
};

/**
 * Recalculer les heures réelles d'un paiement depuis les pointages
 * PUT /api/paiements-extras/:id/recalculer
 */
const recalculerHeuresReelles = async (req, res) => {
  try {
    const { id } = req.params;
    const { mettreAJourHeuresReelles } = require('../services/paiementExtrasService');
    
    const updated = await mettreAJourHeuresReelles(parseInt(id));
    
    if (!updated) {
      return res.status(404).json({ error: 'Paiement non trouvé ou impossible à recalculer' });
    }
    
    res.json({ 
      success: true, 
      message: 'Heures réelles recalculées',
      paiement: updated 
    });
    
  } catch (error) {
    console.error('Erreur recalculerHeuresReelles:', error);
    res.status(500).json({ error: 'Erreur lors du recalcul des heures' });
  }
};

/**
 * Recalculer les heures réelles pour tous les paiements d'une date
 * PUT /api/paiements-extras/recalculer-date
 */
const recalculerHeuresReellesPourDate = async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date requise' });
    }
    
    const { recalculerHeuresReellesPourDate: recalculer } = require('../services/paiementExtrasService');
    const resultats = await recalculer(new Date(date));
    
    res.json({ 
      success: true, 
      message: `${resultats.length} paiements recalculés`,
      paiements: resultats 
    });
    
  } catch (error) {
    console.error('Erreur recalculerHeuresReellesPourDate:', error);
    res.status(500).json({ error: 'Erreur lors du recalcul des heures' });
  }
};

/**
 * Recalculer les heures réelles pour tous les paiements en attente
 * PUT /api/paiements-extras/recalculer-tous
 */
const recalculerTousLesPaiements = async (req, res) => {
  try {
    const { mettreAJourHeuresReelles } = require('../services/paiementExtrasService');
    
    // Récupérer tous les paiements shift_extra non payés
    const paiements = await prisma.paiementExtra.findMany({
      where: {
        source: 'shift_extra',
        statut: 'a_payer',
        pointageValide: false
      }
    });
    
    const resultats = [];
    let updated = 0;
    
    for (const p of paiements) {
      try {
        const result = await mettreAJourHeuresReelles(p.id);
        if (result && result.pointageValide) {
          updated++;
        }
        resultats.push({ id: p.id, success: true, paiement: result });
      } catch (err) {
        resultats.push({ id: p.id, success: false, error: err.message });
      }
    }
    
    res.json({ 
      success: true, 
      message: `${updated}/${paiements.length} paiements mis à jour avec heures réelles`,
      total: paiements.length,
      updated,
      resultats
    });
    
  } catch (error) {
    console.error('Erreur recalculerTousLesPaiements:', error);
    res.status(500).json({ error: 'Erreur lors du recalcul des heures' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// METTRE À JOUR UN PAIEMENT (ajustement manuel des heures)
// ═══════════════════════════════════════════════════════════════════════════
const updatePaiement = async (req, res) => {
  try {
    const { id } = req.params;
    const { heures, montant, arriveeReelle, departReelle, heuresReelles, ecartHeures, commentaire } = req.body;
    
    const paiement = await prisma.paiementExtra.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!paiement) {
      return res.status(404).json({ error: 'Paiement non trouvé' });
    }
    
    // Ne pas permettre la modification si déjà payé
    if (paiement.statut === 'paye') {
      return res.status(400).json({ error: 'Impossible de modifier un paiement déjà effectué' });
    }
    
    // Mise à jour des champs
    const updates = {};
    if (heures !== undefined) updates.heures = parseFloat(heures);
    if (montant !== undefined) updates.montant = parseFloat(montant);
    if (arriveeReelle !== undefined) updates.arriveeReelle = arriveeReelle;
    if (departReelle !== undefined) updates.departReelle = departReelle;
    if (heuresReelles !== undefined) updates.heuresReelles = parseFloat(heuresReelles);
    if (ecartHeures !== undefined) updates.ecartHeures = parseFloat(ecartHeures);
    if (commentaire !== undefined) {
      // Ajouter au commentaire existant
      updates.commentaire = paiement.commentaire 
        ? `${paiement.commentaire}\n${commentaire}` 
        : commentaire;
    }
    
    const updated = await prisma.paiementExtra.update({
      where: { id: parseInt(id) },
      data: updates,
      include: {
        employe: {
          select: { id: true, nom: true, prenom: true, email: true }
        }
      }
    });
    
    console.log(`✏️ Paiement #${id} mis à jour:`, updates);
    res.json({ success: true, paiement: updated });
    
  } catch (error) {
    console.error('Erreur updatePaiement:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du paiement' });
  }
};

module.exports = {
  getAllPaiements,
  getPaiementById,
  getPaiementsByEmploye,
  createPaiement,
  marquerPaye,
  annulerPaiement,
  getStatsPaiements,
  getAPayer,
  recalculerHeuresReelles,
  recalculerHeuresReellesPourDate,
  recalculerTousLesPaiements,
  updatePaiement
};
