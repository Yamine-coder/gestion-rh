/**
 * ⏰ Cron job pour l'envoi quotidien du récap des anomalies
 */

const cron = require('node-cron');
const { sendAnomaliesRecap } = require('../services/notificationEmailService');

// Envoi du récap tous les jours à 8h00
const startAnomaliesCron = () => {
  // Tous les jours à 8h00
  cron.schedule('0 8 * * *', async () => {
    console.log('📧 [CRON] Envoi du récap quotidien des anomalies...');
    try {
      await sendAnomaliesRecap();
    } catch (err) {
      console.error('❌ [CRON] Erreur envoi récap anomalies:', err.message);
    }
  }, {
    timezone: 'Europe/Paris'
  });

  console.log('✅ Cron anomalies initialisé (récap quotidien à 8h00)');
};

module.exports = { startAnomaliesCron };
