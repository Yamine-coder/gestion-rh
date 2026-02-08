/**
 * ⏰ Cron Job - Vérification automatique des avis négatifs
 * 
 * Exécute toutes les 15 minutes :
 * 1. Récupère les nouveaux avis via Google API
 * 2. Détecte les avis ≤3⭐ non encore alertés
 * 3. Envoie un email immédiatement
 * 
 * Rapport quotidien à 9h00
 */

const cron = require('node-cron');
const axios = require('axios');
const avisAlerts = require('../services/avisAlertService');
const avisAnalysis = require('../services/avisAnalysisService');

// État pour éviter les doublons
let isRunning = false;
let lastCheck = null;
let cronJobs = [];

/**
 * Vérifie les nouveaux avis et envoie les alertes
 */
async function checkNewReviews() {
  if (isRunning) {
    console.log('⏳ Vérification déjà en cours, skip...');
    return;
  }

  isRunning = true;
  lastCheck = new Date();

  try {
    const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    const PLACE_ID = process.env.GOOGLE_PLACE_ID;

    if (!API_KEY || !PLACE_ID) {
      console.log('⚠️ Google API non configurée, alertes désactivées');
      return;
    }

    // Test de connectivité rapide (timeout 5s)
    try {
      await axios.get('https://www.google.com', { timeout: 5000 });
    } catch (connErr) {
      // Erreur silencieuse - pas de connexion internet
      return;
    }

    console.log(`🔍 [${lastCheck.toLocaleTimeString('fr-FR')}] Vérification des nouveaux avis...`);

    // Appel Google Places API
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: PLACE_ID,
        fields: 'name,rating,user_ratings_total,reviews,url',
        language: 'fr',
        key: API_KEY
      },
      timeout: 10000
    });

    if (response.data.status !== 'OK') {
      console.error('❌ Erreur Google API:', response.data.status);
      return;
    }

    const place = response.data.result;
    const reviews = (place.reviews || []).map(r => ({
      author: r.author_name,
      rating: r.rating,
      text: r.text,
      time: r.time * 1000,
      relativeTime: r.relative_time_description,
      isNegative: r.rating <= 3
    }));

    const restaurant = {
      name: place.name,
      rating: place.rating,
      totalReviews: place.user_ratings_total,
      googleUrl: place.url
    };

    // Vérifier et envoyer les alertes
    const alertsSent = await avisAlerts.checkAndAlertNegativeReviews(reviews, restaurant);
    
    if (alertsSent > 0) {
      console.log(`📧 ${alertsSent} alerte(s) envoyée(s)`);
    } else {
      console.log('✅ Pas de nouvel avis négatif');
    }

  } catch (error) {
    // Erreurs réseau silencieuses (DNS, timeout, etc.)
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      // Silencieux - problème réseau temporaire
    } else {
      console.error('❌ Erreur cron avis:', error.message);
    }
  } finally {
    isRunning = false;
  }
}

/**
 * Envoie le rapport quotidien
 */
async function sendDailyReviewReport() {
  try {
    const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    const PLACE_ID = process.env.GOOGLE_PLACE_ID;

    if (!API_KEY || !PLACE_ID) return;

    console.log('📊 Génération du rapport quotidien...');

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: PLACE_ID,
        fields: 'name,rating,user_ratings_total,reviews,url',
        language: 'fr',
        key: API_KEY
      }
    });

    if (response.data.status !== 'OK') return;

    const place = response.data.result;
    const reviews = (place.reviews || []).map(r => ({
      author: r.author_name,
      rating: r.rating,
      text: r.text,
      time: r.time * 1000,
      relativeTime: r.relative_time_description
    }));

    const restaurant = {
      name: place.name,
      rating: place.rating,
      totalReviews: place.user_ratings_total,
      googleUrl: place.url
    };

    const history = avisAnalysis.loadHistory();
    const analysis = avisAnalysis.analyzeReviews(history.reviews);

    await avisAlerts.sendDailyReport(reviews, restaurant, analysis);
    console.log('📊 Rapport quotidien envoyé');

  } catch (error) {
    console.error('❌ Erreur rapport quotidien:', error.message);
  }
}

/**
 * Démarre les tâches cron
 */
function startCronJobs() {
  // Vérification toutes les 15 minutes
  const checkJob = cron.schedule('*/15 * * * *', checkNewReviews, {
    timezone: 'Europe/Paris'
  });
  cronJobs.push(checkJob);
  console.log('⏰ Cron avis: Vérification toutes les 15 minutes');

  // Rapport quotidien à 9h00
  const reportJob = cron.schedule('0 9 * * *', sendDailyReviewReport, {
    timezone: 'Europe/Paris'
  });
  cronJobs.push(reportJob);
  console.log('📊 Cron avis: Rapport quotidien à 9h00');

  // Première vérification au démarrage (après 30 secondes)
  setTimeout(() => {
    console.log('🚀 Première vérification des avis au démarrage...');
    checkNewReviews();
  }, 30000);
}

/**
 * Arrête les tâches cron
 */
function stopCronJobs() {
  cronJobs.forEach(job => job.stop());
  cronJobs = [];
  console.log('⏹️ Cron avis arrêté');
}

/**
 * Statut des crons
 */
function getCronStatus() {
  return {
    running: cronJobs.length > 0,
    lastCheck,
    nextCheck: lastCheck ? new Date(lastCheck.getTime() + 15 * 60 * 1000) : null,
    jobsCount: cronJobs.length
  };
}

module.exports = {
  startCronJobs,
  stopCronJobs,
  checkNewReviews,
  sendDailyReviewReport,
  getCronStatus
};
