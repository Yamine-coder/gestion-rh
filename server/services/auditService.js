/**
 * 📋 Service d'Audit Trail
 * Trace toutes les modifications sur les entités critiques (shifts, congés, paiements)
 * 
 * Usage:
 *   const { logAudit } = require('../services/auditService');
 *   await logAudit({ entite: 'shift', entiteId: 42, action: 'creation', userId: 1, details: {...} });
 */
const prisma = require('../prisma/client');

/**
 * Enregistre une entrée d'audit — NON BLOQUANT (ne throw jamais)
 * @param {Object} params
 * @param {string} params.entite - Type d'entité: "shift", "conge", "paiement_extra", "shift_batch", "shift_range"
 * @param {number|null} params.entiteId - ID de l'entité (null pour batch)
 * @param {string} params.action - Action: "creation", "modification", "suppression", "approbation", "refus", "batch_creation", "batch_suppression"
 * @param {number} params.userId - ID de l'utilisateur ayant fait l'action
 * @param {Object} [params.details] - Détails: { before, after, metadata }
 * @param {string} [params.ipAddress] - Adresse IP du client
 * @param {Object} [params.tx] - Transaction Prisma (optionnel, pour inclure dans une tx existante)
 */
async function logAudit({ entite, entiteId, action, userId, details, ipAddress, tx }) {
  try {
    const client = tx || prisma;
    return await client.auditLog.create({
      data: {
        entite,
        entiteId: entiteId ?? null,
        action,
        userId: Number(userId),
        details: details || undefined,
        ipAddress: ipAddress || null
      }
    });
  } catch (err) {
    console.error('⚠️ Erreur audit log (non bloquant):', err.message);
    return null;
  }
}

/**
 * Helper: extraire userId depuis req (différents formats possibles)
 */
function getUserId(req) {
  return req.userId || req.user?.userId || req.user?.id;
}

/**
 * Helper: extraire IP depuis req
 */
function getIp(req) {
  return req.ip || req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || null;
}

/**
 * Raccourci pour auditer une action shift
 */
async function auditShift(req, { shiftId, action, before, after, metadata, tx }) {
  return logAudit({
    entite: 'shift',
    entiteId: shiftId,
    action,
    userId: getUserId(req),
    details: { before: before || null, after: after || null, metadata: metadata || null },
    ipAddress: getIp(req),
    tx
  });
}

/**
 * Raccourci pour auditer une action congé
 */
async function auditConge(req, { congeId, action, before, after, metadata, tx }) {
  return logAudit({
    entite: 'conge',
    entiteId: congeId,
    action,
    userId: getUserId(req),
    details: { before: before || null, after: after || null, metadata: metadata || null },
    ipAddress: getIp(req),
    tx
  });
}

module.exports = { logAudit, auditShift, auditConge, getUserId, getIp };
