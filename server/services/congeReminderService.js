// server/services/congeReminderService.js
/**
 * Service de rappel automatique pour les congés non traités > 48h
 * Envoie un email de rappel aux admins une fois par jour (9h)
 */

const prisma = require('../prisma/client');
const { envoyerEmailRappelConges } = require('./emailService');

// Track si le rappel a déjà été envoyé aujourd'hui
let lastReminderDate = null;

/**
 * Vérifie et envoie les rappels pour les congés en attente > 48h
 * @returns {Object} { sent: boolean, count: number }
 */
async function checkAndSendReminders() {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = now.toISOString().split('T')[0];

    // Envoyer le rappel uniquement à 9h et une seule fois par jour
    if (currentHour !== 9 || lastReminderDate === todayStr) {
      return { sent: false, reason: 'not_time' };
    }

    // Calculer la date limite (48h avant maintenant)
    const limite48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Trouver les congés en attente depuis plus de 48h
    const congesEnAttente = await prisma.conge.findMany({
      where: {
        statut: 'en attente',
        createdAt: {
          lt: limite48h
        }
      },
      include: {
        user: {
          select: { nom: true, prenom: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (congesEnAttente.length === 0) {
      console.log('✅ [REMINDER] Aucun congé en attente > 48h');
      lastReminderDate = todayStr;
      return { sent: false, reason: 'no_pending', count: 0 };
    }

    // Formater les données pour l'email
    const congesFormatted = congesEnAttente.map(c => {
      const joursAttente = Math.floor((now - new Date(c.createdAt)) / (1000 * 60 * 60 * 24));
      return {
        id: c.id,
        employeNom: c.user ? `${c.user.prenom} ${c.user.nom}` : 'Employé inconnu',
        type: c.type,
        dateDebut: new Date(c.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        dateFin: new Date(c.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        joursAttente
      };
    });

    // Récupérer les admins
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true, prenom: true }
    });

    if (admins.length === 0) {
      console.log('⚠️ [REMINDER] Aucun admin trouvé pour envoyer le rappel');
      return { sent: false, reason: 'no_admins' };
    }

    // Envoyer l'email à chaque admin
    let emailsSent = 0;
    for (const admin of admins) {
      if (admin.email) {
        try {
          await envoyerEmailRappelConges(admin.email, congesFormatted);
          emailsSent++;
        } catch (error) {
          console.error(`❌ [REMINDER] Erreur envoi email à ${admin.email}:`, error.message);
        }
      }
    }

    console.log(`📧 [REMINDER] Rappel envoyé à ${emailsSent} admin(s) pour ${congesEnAttente.length} congé(s) en attente`);
    
    // Marquer comme envoyé pour aujourd'hui
    lastReminderDate = todayStr;

    return { 
      sent: true, 
      emailsSent,
      congesCount: congesEnAttente.length,
      conges: congesFormatted.map(c => `${c.employeNom} (${c.joursAttente}j)`)
    };

  } catch (error) {
    console.error('❌ [REMINDER] Erreur checkAndSendReminders:', error);
    return { sent: false, error: error.message };
  }
}

/**
 * Force l'envoi du rappel (pour tests)
 */
async function forceReminder() {
  lastReminderDate = null;
  const originalHour = new Date().getHours;
  // Temporairement override pour forcer
  const result = await checkAndSendRemindersForced();
  return result;
}

/**
 * Version forcée sans vérification d'heure
 */
async function checkAndSendRemindersForced() {
  try {
    const now = new Date();
    const limite48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const congesEnAttente = await prisma.conge.findMany({
      where: {
        statut: 'en attente',
        createdAt: { lt: limite48h }
      },
      include: {
        user: { select: { nom: true, prenom: true, email: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (congesEnAttente.length === 0) {
      return { sent: false, reason: 'no_pending', count: 0 };
    }

    const congesFormatted = congesEnAttente.map(c => {
      const joursAttente = Math.floor((now - new Date(c.createdAt)) / (1000 * 60 * 60 * 24));
      return {
        id: c.id,
        employeNom: c.user ? `${c.user.prenom} ${c.user.nom}` : 'Employé inconnu',
        type: c.type,
        dateDebut: new Date(c.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        dateFin: new Date(c.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        joursAttente
      };
    });

    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true }
    });

    let emailsSent = 0;
    for (const admin of admins) {
      if (admin.email) {
        try {
          await envoyerEmailRappelConges(admin.email, congesFormatted);
          emailsSent++;
        } catch (error) {
          console.error(`❌ Erreur envoi email à ${admin.email}:`, error.message);
        }
      }
    }

    return { sent: true, emailsSent, congesCount: congesEnAttente.length };
  } catch (error) {
    return { sent: false, error: error.message };
  }
}

module.exports = {
  checkAndSendReminders,
  forceReminder
};
