/**
 * Service de Notifications
 * Centralise la création de notifications pour garantir la cohérence
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Types de notifications disponibles
const NOTIFICATION_TYPES = {
  // Congés
  CONGE_APPROUVE: 'conge_approuve',
  CONGE_REJETE: 'conge_rejete',
  NOUVELLE_DEMANDE_CONGE: 'nouvelle_demande_conge',
  MODIFICATION_DEMANDE_CONGE: 'modification_demande_conge',
  
  // Modifications de pointage
  MODIFICATION_APPROUVEE: 'modification_approuvee',
  MODIFICATION_REJETEE: 'modification_rejetee',
  
  // Planning
  PLANNING_MODIFIE: 'planning_modifie',
  NOUVEAU_SHIFT: 'nouveau_shift',
  SHIFT_SUPPRIME: 'shift_supprime',
  
  // Consignes/Infos RH
  NOUVELLE_CONSIGNE: 'nouvelle_consigne',
  CONSIGNE_IMPORTANTE: 'consigne_importante',
  
  // Anomalies
  ANOMALIE_DETECTEE: 'anomalie_detectee',
  
  // Justificatifs
  JUSTIFICATIF_AJOUTE: 'justificatif_ajoute',
  
  // Général
  INFO: 'info'
};

/**
 * Créer une notification pour un employé
 * @param {Object} params
 * @param {number} params.employeId - ID de l'employé destinataire
 * @param {string} params.type - Type de notification (voir NOTIFICATION_TYPES)
 * @param {string} params.titre - Titre de la notification
 * @param {string|Object} params.message - Message ou objet avec détails
 * @returns {Promise<Object>} La notification créée
 */
async function creerNotification({ employeId, type, titre, message }) {
  try {
    // Convertir le message en JSON si c'est un objet
    const messageStr = typeof message === 'object' ? JSON.stringify(message) : message;
    
    const notification = await prisma.notifications.create({
      data: {
        employe_id: employeId,
        type: type,
        titre: titre,
        message: messageStr,
        lue: false
      }
    });
    
    console.log(`🔔 Notification créée: [${type}] "${titre}" pour employé #${employeId}`);
    return notification;
  } catch (error) {
    console.error('❌ Erreur création notification:', error);
    throw error;
  }
}

/**
 * Créer des notifications pour plusieurs employés
 * @param {Object} params
 * @param {number[]} params.employeIds - IDs des employés destinataires
 * @param {string} params.type - Type de notification
 * @param {string} params.titre - Titre de la notification
 * @param {string|Object} params.message - Message ou objet avec détails
 * @returns {Promise<Object>} Résultat du createMany
 */
async function creerNotifications({ employeIds, type, titre, message }) {
  try {
    const messageStr = typeof message === 'object' ? JSON.stringify(message) : message;
    
    const result = await prisma.notifications.createMany({
      data: employeIds.map(id => ({
        employe_id: id,
        type: type,
        titre: titre,
        message: messageStr,
        lue: false
      }))
    });
    
    console.log(`🔔 ${result.count} notifications créées: [${type}] "${titre}"`);
    return result;
  } catch (error) {
    console.error('❌ Erreur création notifications:', error);
    throw error;
  }
}

/**
 * Notifier tous les managers d'un événement
 * @param {Object} params - Paramètres de la notification
 * @returns {Promise<Object>}
 */
async function notifierManagers({ type, titre, message }) {
  try {
    // Récupérer tous les admins/managers
    const managers = await prisma.user.findMany({
      where: { 
        role: 'admin',
        statut: 'actif' 
      },
      select: { id: true }
    });
    
    if (managers.length === 0) {
      console.log('⚠️ Aucun manager trouvé pour les notifications');
      return { count: 0 };
    }
    
    return await creerNotifications({
      employeIds: managers.map(m => m.id),
      type,
      titre,
      message
    });
  } catch (error) {
    console.error('❌ Erreur notification managers:', error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS SPÉCIALISÉS PAR TYPE D'ÉVÉNEMENT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Notification de congé approuvé
 */
async function notifierCongeApprouve(conge) {
  const dateDebut = new Date(conge.dateDebut).toLocaleDateString('fr-FR');
  const dateFin = new Date(conge.dateFin).toLocaleDateString('fr-FR');
  
  return await creerNotification({
    employeId: conge.userId,
    type: NOTIFICATION_TYPES.CONGE_APPROUVE,
    titre: 'Demande de congé approuvée ✅',
    message: {
      text: `Votre demande de ${conge.type} du ${dateDebut} au ${dateFin} a été approuvée.`,
      congeId: conge.id,
      type: conge.type,
      dateDebut,
      dateFin
    }
  });
}

/**
 * Notification de congé refusé
 */
async function notifierCongeRejete(conge, motifRefus = null) {
  const dateDebut = new Date(conge.dateDebut).toLocaleDateString('fr-FR');
  const dateFin = new Date(conge.dateFin).toLocaleDateString('fr-FR');
  
  let texte = `Votre demande de ${conge.type} du ${dateDebut} au ${dateFin} a été refusée.`;
  if (motifRefus) {
    texte += ` Raison: ${motifRefus}`;
  }
  
  return await creerNotification({
    employeId: conge.userId,
    type: NOTIFICATION_TYPES.CONGE_REJETE,
    titre: 'Demande de congé refusée',
    message: {
      text: texte,
      congeId: conge.id,
      type: conge.type,
      dateDebut,
      dateFin,
      motifRefus
    }
  });
}

/**
 * Notification de nouvelle demande de congé (pour managers)
 */
async function notifierNouvelleDemandeConde(conge, employe) {
  const employeName = employe?.prenom && employe?.nom 
    ? `${employe.prenom} ${employe.nom}` 
    : employe?.email || 'Un employé';
  
  const dateDebut = new Date(conge.dateDebut).toLocaleDateString('fr-FR', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });
  const dateFin = new Date(conge.dateFin).toLocaleDateString('fr-FR', { 
    day: 'numeric', month: 'long', year: 'numeric' 
  });
  const nbJours = Math.ceil((new Date(conge.dateFin) - new Date(conge.dateDebut)) / (1000 * 60 * 60 * 24) + 1);
  
  return await notifierManagers({
    type: NOTIFICATION_TYPES.NOUVELLE_DEMANDE_CONGE,
    titre: 'Nouvelle demande de congé',
    message: {
      text: `${employeName} demande un ${conge.type} du ${dateDebut} au ${dateFin} (${nbJours} jour${nbJours > 1 ? 's' : ''})`,
      congeId: conge.id,
      employeNom: employeName,
      employeId: conge.userId
    }
  });
}

/**
 * Notification de modification de planning
 */
async function notifierPlanningModifie(employeId, details) {
  return await creerNotification({
    employeId,
    type: NOTIFICATION_TYPES.PLANNING_MODIFIE,
    titre: 'Votre planning a été modifié',
    message: {
      text: details.message || 'Un changement a été effectué sur votre planning.',
      date: details.date,
      shiftId: details.shiftId
    }
  });
}

/**
 * Notification de nouveau shift
 */
async function notifierNouveauShift(employeId, shift) {
  const dateShift = new Date(shift.date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  
  return await creerNotification({
    employeId,
    type: NOTIFICATION_TYPES.NOUVEAU_SHIFT,
    titre: 'Nouveau créneau ajouté',
    message: {
      text: `Un nouveau créneau a été ajouté le ${dateShift}: ${shift.heureDebut} - ${shift.heureFin}`,
      date: shift.date,
      shiftId: shift.id,
      heureDebut: shift.heureDebut,
      heureFin: shift.heureFin
    }
  });
}

/**
 * Notification de nouvelle consigne
 */
async function notifierNouvelleConsigne(consigne, employeIds) {
  const type = consigne.type === 'urgent' 
    ? NOTIFICATION_TYPES.CONSIGNE_IMPORTANTE 
    : NOTIFICATION_TYPES.NOUVELLE_CONSIGNE;
  
  const titre = consigne.type === 'urgent' 
    ? '⚠️ Consigne urgente' 
    : consigne.type === 'important'
      ? '📌 Information importante'
      : '📋 Nouvelle consigne';
  
  return await creerNotifications({
    employeIds,
    type,
    titre,
    message: {
      text: consigne.contenu.substring(0, 200) + (consigne.contenu.length > 200 ? '...' : ''),
      consigneId: consigne.id,
      consigneTitre: consigne.titre
    }
  });
}

/**
 * Notification d'anomalie détectée
 */
async function notifierAnomalieDetectee(employeId, anomalie) {
  return await creerNotification({
    employeId,
    type: NOTIFICATION_TYPES.ANOMALIE_DETECTEE,
    titre: 'Anomalie détectée',
    message: {
      text: `Une anomalie a été détectée sur vos pointages: ${anomalie.description || anomalie.type}`,
      anomalieId: anomalie.id,
      date: anomalie.date,
      type: anomalie.type
    }
  });
}

/**
 * Notification de modification approuvée
 */
async function notifierModificationApprouvee(employeId, modification) {
  return await creerNotification({
    employeId,
    type: NOTIFICATION_TYPES.MODIFICATION_APPROUVEE,
    titre: 'Modification approuvée ✅',
    message: {
      text: `Votre demande de modification de pointage a été approuvée.`,
      modificationId: modification.id,
      date: modification.date
    }
  });
}

/**
 * Notification de modification rejetée
 */
async function notifierModificationRejetee(employeId, modification, motif = null) {
  let texte = 'Votre demande de modification de pointage a été refusée.';
  if (motif) texte += ` Raison: ${motif}`;
  
  return await creerNotification({
    employeId,
    type: NOTIFICATION_TYPES.MODIFICATION_REJETEE,
    titre: 'Modification refusée',
    message: {
      text: texte,
      modificationId: modification.id,
      date: modification.date,
      motif
    }
  });
}

module.exports = {
  NOTIFICATION_TYPES,
  creerNotification,
  creerNotifications,
  notifierManagers,
  // Helpers spécialisés
  notifierCongeApprouve,
  notifierCongeRejete,
  notifierNouvelleDemandeConde,
  notifierPlanningModifie,
  notifierNouveauShift,
  notifierNouvelleConsigne,
  notifierAnomalieDetectee,
  notifierModificationApprouvee,
  notifierModificationRejetee
};
