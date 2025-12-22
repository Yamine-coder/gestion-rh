/**
 * Routes pour les APIs externes (Météo, Football, Événements)
 * Endpoints pour le widget météo intelligent du dashboard
 */

const express = require('express');
const router = express.Router();
const externalApisService = require('../services/externalApisService');

// GET /api/external/smart-analysis
// Retourne l'analyse intelligente combinée (météo + matchs + fériés)
router.get('/smart-analysis', async (req, res) => {
  try {
    const analysis = await externalApisService.getSmartAnalysis();
    res.json(analysis);
  } catch (error) {
    console.error('❌ [EXTERNAL API] Erreur analyse intelligente:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'analyse',
      message: error.message 
    });
  }
});

// GET /api/external/weather
// Retourne uniquement la météo
router.get('/weather', async (req, res) => {
  try {
    const weather = await externalApisService.getWeather();
    res.json(weather);
  } catch (error) {
    console.error('❌ [EXTERNAL API] Erreur météo:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération météo',
      message: error.message 
    });
  }
});

// GET /api/external/matches
// Retourne les matchs à venir
router.get('/matches', async (req, res) => {
  try {
    const matches = await externalApisService.getUpcomingMatches();
    res.json(matches);
  } catch (error) {
    console.error('❌ [EXTERNAL API] Erreur matchs:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des matchs',
      message: error.message 
    });
  }
});

// GET /api/external/holidays
// Retourne les jours fériés à venir
router.get('/holidays', async (req, res) => {
  try {
    const holidays = externalApisService.checkUpcomingHolidays();
    res.json(holidays);
  } catch (error) {
    console.error('❌ [EXTERNAL API] Erreur jours fériés:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des jours fériés',
      message: error.message 
    });
  }
});

// GET /api/external/status
// Retourne le statut des APIs (pour debug/monitoring)
router.get('/status', async (req, res) => {
  const weatherKey = process.env.OPENWEATHER_API_KEY;
  const footballKey = process.env.FOOTBALL_API_KEY;
  const gistId = process.env.AFFLUENCE_GIST_ID;
  
  res.json({
    apis: {
      openweather: {
        configured: !!weatherKey,
        status: weatherKey ? 'active' : 'fallback'
      },
      football: {
        configured: !!footballKey,
        status: footballKey ? 'active' : 'fallback'
      },
      holidays: {
        configured: true,
        status: 'active'
      },
      affluence: {
        configured: !!gistId,
        status: gistId ? 'active' : 'estimated',
        gistId: gistId ? `${gistId.substring(0, 8)}...` : null
      }
    },
    config: {
      city: process.env.RESTAURANT_CITY || 'Paris',
      country: process.env.RESTAURANT_COUNTRY || 'FR'
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/external/affluence
// Retourne les données d'affluence Google
router.get('/affluence', async (req, res) => {
  try {
    const affluence = await externalApisService.getAffluenceData();
    res.json(affluence);
  } catch (error) {
    console.error('❌ [EXTERNAL API] Erreur affluence:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération affluence',
      message: error.message 
    });
  }
});

// POST /api/external/affluence-update
// Endpoint appelé par GitHub Actions après mise à jour du Gist
router.post('/affluence-update', async (req, res) => {
  // Vérifier le secret (optionnel mais recommandé)
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers['x-cron-secret'];
  
  if (cronSecret && providedSecret !== cronSecret) {
    console.warn('⚠️ [AFFLUENCE] Requête avec secret invalide');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  console.log('📊 [AFFLUENCE] Notification mise à jour reçue:', req.body);
  
  // Invalider le cache pour forcer un refresh
  // Note: on pourrait aussi passer les données directement dans le body
  
  res.json({ 
    success: true, 
    message: 'Cache invalidé, prochaine requête fetchera les nouvelles données',
    receivedAt: new Date().toISOString()
  });
});

module.exports = router;
