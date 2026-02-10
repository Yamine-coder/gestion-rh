/**
 * ⏰ Cron jobs pour le scoring automatique
 * 
 * - Quotidien 23h : check anomalies non résolues (>48h → malus)
 * - Lundi 7h : bonus semaine complète + bonus sans anomalie
 */

const cron = require('node-cron');
const scoringService = require('../services/scoringService');

const startScoringCron = () => {
  // Tous les jours à 23h — vérifier les anomalies non résolues depuis 48h
  cron.schedule('0 23 * * *', async () => {
    try {
      await scoringService.checkAnomaliesNonResolues();
    } catch (err) {
      console.error('[SCORING CRON] Erreur check anomalies 48h:', err.message);
    }
  }, { timezone: 'Europe/Paris' });

  // Tous les lundis à 7h — bonus semaine complète + bonus sans anomalie
  cron.schedule('0 7 * * 1', async () => {
    try {
      await scoringService.attribuerBonusSemaineComplete();
      await scoringService.attribuerBonusSansAnomalie();
    } catch (err) {
      console.error('[SCORING CRON] Erreur bonus hebdo:', err.message);
    }
  }, { timezone: 'Europe/Paris' });

  console.log('✅ Cron scoring initialisé (quotidien 23h + hebdo lundi 7h)');
};

module.exports = { startScoringCron };
