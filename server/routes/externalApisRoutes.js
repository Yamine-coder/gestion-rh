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
      }
    },
    config: {
      city: process.env.RESTAURANT_CITY || 'Paris',
      country: process.env.RESTAURANT_COUNTRY || 'FR'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
