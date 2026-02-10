/**
 * ’¬ Routes Avis Google
 * Récupère les avis via Google Places API avec analyse avancée
 * Version: 2.0 avec tendances et insights
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const avisAnalysis = require('../services/avisAnalysisService');
const { generateAIResponse, isAIConfigured } = require('../services/avisResponseGeneratorService');
const avisAlerts = require('../services/avisAlertService');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

// Protéger toutes les routes avis
router.use(authMiddleware);

// Cache simple - 30 minutes
let cache = { data: null, timestamp: null, TTL: 30 * 60 * 1000 };

/**
 * GET /api/avis - Avis avec analyse avancée
 */
router.get('/', async (req, res) => {
  try {
    const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    const PLACE_ID = process.env.GOOGLE_PLACE_ID;
    const forceRefresh = req.query.refresh === 'true';

    if (!API_KEY || !PLACE_ID) {
      return res.json({ configured: false, ...getDemoData() });
    }

    // Cache check (skip if force refresh)
    if (!forceRefresh && cache.data && cache.timestamp && (Date.now() - cache.timestamp < cache.TTL)) {
      return res.json({ ...cache.data, cached: true, cacheAge: Math.round((Date.now() - cache.timestamp) / 60000) + ' minutes' });
    }

    // Appel Google Places API
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: PLACE_ID,
        fields: 'name,rating,user_ratings_total,reviews,url,formatted_phone_number,website',
        language: 'fr',
        key: API_KEY
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google API: ${response.data.status}`);
    }

    const place = response.data.result;
    
    // Formater les avis
    const reviews = (place.reviews || []).map(r => ({
      author: r.author_name,
      rating: r.rating,
      text: r.text,
      time: r.time * 1000,
      relativeTime: r.relative_time_description,
      profilePhoto: r.profile_photo_url,
      isNegative: r.rating <= 3
    }));

    // Ajouter Ã  l'historique
    const history = avisAnalysis.addReviews(reviews);
    
    // Analyse avancée
    const analysis = avisAnalysis.analyzeReviews(history.reviews);
    const peakProblems = avisAnalysis.detectPeakProblems(history.reviews);

    const result = {
      configured: true,
      restaurant: {
        name: place.name,
        rating: place.rating,
        totalReviews: place.user_ratings_total,
        googleUrl: place.url,
        phone: place.formatted_phone_number,
        website: place.website
      },
      reviews,
      analysis: { ...analysis, peakProblems },
      historySize: history.reviews.length,
      lastUpdate: new Date().toISOString()
    };

    cache.data = result;
    cache.timestamp = Date.now();
    res.json(result);
  } catch (err) {
    console.error('Erreur avis:', err.message);
    res.status(500).json({ error: 'Erreur chargement avis', ...getDemoData() });
  }
});

/**
 * GET /api/avis/alerts - Avis négatifs récents
 */
router.get('/alerts', async (req, res) => {
  try {
    if (cache.data?.reviews) {
      const alerts = cache.data.reviews.filter(r => 
        r.isNegative && (Date.now() - r.time) < 48 * 60 * 60 * 1000
      );
      return res.json({ alerts, count: alerts.length });
    }
    res.json({ alerts: [], count: 0 });
  } catch (err) {
    res.json({ alerts: [], count: 0 });
  }
});

/**
 * GET /api/avis/trends - Tendances
 */
router.get('/trends', async (req, res) => {
  try {
    const history = avisAnalysis.loadHistory();
    const analysis = avisAnalysis.analyzeReviews(history.reviews);
    res.json({ trends: analysis.trends, insights: analysis.insights, stats: analysis.stats });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/avis/analysis/:period - Analyse par période (7d, 30d, 90d, month)
 */
router.get('/analysis/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const validPeriods = ['7d', '30d', '90d', 'month'];
    
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ 
        error: 'Période invalide', 
        validPeriods 
      });
    }
    
    const history = avisAnalysis.loadHistory();
    const analysis = avisAnalysis.analyzeByPeriod(history.reviews, period);
    
    res.json({
      success: true,
      ...analysis,
      availablePeriods: avisAnalysis.PERIODS
    });
  } catch (err) {
    console.error('Erreur analyse période:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/avis/generate-response - Génère une réponse via IA
 * Body: { review: { author, rating, text } }
 */
router.post('/generate-response', async (req, res) => {
  try {
    const { review, forceRegenerate } = req.body;
    
    if (!review || !review.text) {
      return res.status(400).json({ error: 'Review avec texte requis' });
    }
    
    // Vérifier si l'API IA est configurée
    if (!isAIConfigured()) {
      return res.json({ 
        success: false, 
        error: 'API OpenAI non configurée. Ajoutez OPENAI_API_KEY dans le fichier .env',
        aiConfigured: false
      });
    }
    
    // Générer la réponse via IA
    const result = await generateAIResponse(review, { forceRegenerate: !!forceRegenerate });
    
    if (!result || !result.response) {
      return res.json({ 
        success: false, 
        error: 'Erreur lors de la génération de la réponse',
        aiConfigured: true
      });
    }
    
    res.json({ 
      success: true, 
      response: result.response,
      aiConfigured: true,
      model: result.model,
      fromCache: result.fromCache || false
    });
    
  } catch (err) {
    console.error('Erreur generate-response:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * “§ POST /api/avis/test-alert - Tester l'envoi d'email d'alerte
 */
router.post('/test-alert', async (req, res) => {
  try {
    await avisAlerts.testAlertEmail();
    res.json({ success: true, message: 'Email de test envoyé !' });
  } catch (err) {
    console.error('Erreur test-alert:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * “§ GET /api/avis/alert-status - Statut des alertes email
 */
router.get('/alert-status', (req, res) => {
  const config = avisAlerts.getAlertConfig();
  const recipients = avisAlerts.getAlertRecipients();
  const emailConfigured = !!process.env.EMAIL_USER && !!process.env.EMAIL_PASSWORD;
  
  res.json({
    emailConfigured,
    config,
    alertRecipients: recipients,
    alertsEnabled: emailConfigured && recipients.length > 0 && config.enabled
  });
});

/**
 * “§ GET /api/avis/alert-config - Récupère la config des alertes
 */
router.get('/alert-config', adminMiddleware, (req, res) => {
  const config = avisAlerts.getAlertConfig();
  res.json(config);
});

/**
 * “§ PUT /api/avis/alert-config - Met Ã  jour la config des alertes
 */
router.put('/alert-config', adminMiddleware, (req, res) => {
  try {
    const updates = req.body;
    const config = avisAlerts.updateAlertConfig(updates);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * “§ POST /api/avis/alert-recipients - Ajoute un destinataire
 */
router.post('/alert-recipients', adminMiddleware, (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }
    const config = avisAlerts.addRecipient(email, name || '');
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * “§ DELETE /api/avis/alert-recipients/:email - Supprime un destinataire
 */
router.delete('/alert-recipients/:email', adminMiddleware, (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const config = avisAlerts.removeRecipient(email);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * “§ PATCH /api/avis/alert-recipients/:email - Active/désactive un destinataire
 */
router.patch('/alert-recipients/:email', adminMiddleware, (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { active } = req.body;
    const config = avisAlerts.toggleRecipient(email, active);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * “§ POST /api/avis/check-alerts - Vérifie et envoie les alertes maintenant
 */
router.post('/check-alerts', adminMiddleware, async (req, res) => {
  try {
    if (!cache.data?.reviews) {
      return res.json({ success: false, message: 'Aucun avis en cache, rechargez d\'abord' });
    }
    
    const count = await avisAlerts.checkAndAlertNegativeReviews(
      cache.data.reviews,
      cache.data.restaurant
    );
    
    res.json({ 
      success: true, 
      alertsSent: count,
      message: count > 0 ? `${count} alerte(s) envoyée(s)` : 'Pas de nouvel avis négatif Ã  signaler'
    });
  } catch (err) {
    console.error('Erreur check-alerts:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * 🎯 GET /api/avis/objectif - Calcul de l'objectif note
 */
router.get('/objectif', async (req, res) => {
  try {
    const objectif = parseFloat(req.query.objectif) || 4.5;
    
    if (!cache.data?.restaurant) {
      return res.json({ 
        configured: false,
        objectif,
        noteActuelle: 4.2,
        totalAvis: 847,
        avis5EtoilesNecessaires: 15,
        progression: 93,
        message: 'Mode démo - Configurez Google Places API'
      });
    }
    
    const { rating, totalReviews } = cache.data.restaurant;
    
    // Calcul: combien d'avis 5⭐ pour atteindre l'objectif
    // Formule: (rating * totalReviews + 5 * x) / (totalReviews + x) = objectif
    // => x = (objectif * totalReviews - rating * totalReviews) / (5 - objectif)
    let avisNecessaires = 0;
    if (rating < objectif && objectif < 5) {
      avisNecessaires = Math.ceil((objectif * totalReviews - rating * totalReviews) / (5 - objectif));
    }
    
    const progression = Math.min(100, Math.round((rating / objectif) * 100));
    
    res.json({
      configured: true,
      objectif,
      noteActuelle: rating,
      totalAvis: totalReviews,
      avis5EtoilesNecessaires: Math.max(0, avisNecessaires),
      progression,
      message: avisNecessaires > 0 
        ? `${avisNecessaires} avis 5⭐ pour atteindre ${objectif}⭐`
        : `Objectif atteint ! 🎉`
    });
  } catch (err) {
    console.error('Erreur objectif:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Cache pour les données concurrents (éviter trop d'appels Google API)
let concurrentsCache = {
  data: null,
  lastUpdate: null,
  TTL: 6 * 60 * 60 * 1000 // 6 heures
};

/**
 * † GET /api/avis/concurrents - Stats comparatives avec concurrents RÉELS
 * Récupère automatiquement les pizzerias et restaurants proches via Google Places
 * Cache de 6h pour économiser les appels API
 */
router.get('/concurrents', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    
    // Vérifier le cache (sauf si refresh forcé)
    if (!forceRefresh && concurrentsCache.data && concurrentsCache.lastUpdate) {
      const age = Date.now() - concurrentsCache.lastUpdate;
      if (age < concurrentsCache.TTL) {
        // Retourner les données en cache avec l'âge
        return res.json({
          ...concurrentsCache.data,
          fromCache: true,
          cacheAge: age,
          lastUpdate: new Date(concurrentsCache.lastUpdate).toISOString(),
          nextUpdate: new Date(concurrentsCache.lastUpdate + concurrentsCache.TTL).toISOString()
        });
      }
    }
    const MON_PLACE_ID = process.env.GOOGLE_PLACE_ID;
    
    if (!API_KEY) {
      return res.status(400).json({ error: 'GOOGLE_PLACES_API_KEY non configurée' });
    }
    
    // 1. Récupérer les infos de notre restaurant
    let monRestaurant = cache.data?.restaurant;
    if (!monRestaurant || !monRestaurant.location) {
      // Récupérer les détails incluant la localisation
      const myResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: {
          place_id: MON_PLACE_ID,
          fields: 'name,rating,user_ratings_total,geometry,types',
          language: 'fr',
          key: API_KEY
        }
      });
      
      if (myResponse.data.status === 'OK') {
        const place = myResponse.data.result;
        monRestaurant = {
          name: place.name,
          rating: place.rating,
          totalReviews: place.user_ratings_total,
          location: place.geometry?.location,
          types: place.types
        };
      }
    }
    
    if (!monRestaurant?.location) {
      return res.status(400).json({ error: 'Impossible de localiser le restaurant' });
    }
    
    const { lat, lng } = monRestaurant.location;
    
    // 2. Rechercher les restaurants À PROXIMITÉ (priorité) - rayon élargi
    const proximiteResponse = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: {
        location: `${lat},${lng}`,
        radius: 800, // 800m - quartier proche
        type: 'restaurant',
        language: 'fr',
        key: API_KEY
      }
    });
    
    // 3. Rechercher les pizzerias (même type - secondaire) - rayon élargi
    const pizzeriasResponse = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: {
        location: `${lat},${lng}`,
        radius: 1500, // 1.5km autour
        type: 'restaurant',
        keyword: 'pizzeria pizza italien',
        language: 'fr',
        key: API_KEY
      }
    });
    
    // Combiner et dédupliquer
    const allPlaces = new Map();
    
    // Ajouter les restaurants Ã  PROXIMITÉ (priorité) - seuil réduit
    (proximiteResponse.data.results || []).forEach(place => {
      if (place.place_id !== MON_PLACE_ID && place.rating && place.user_ratings_total >= 10) {
        const isPizzeria = (place.name || '').toLowerCase().includes('pizza') || 
                          (place.name || '').toLowerCase().includes('italien') ||
                          (place.types || []).some(t => t.includes('pizza'));
        allPlaces.set(place.place_id, {
          name: place.name,
          rating: place.rating,
          totalReviews: place.user_ratings_total,
          placeId: place.place_id,
          type: isPizzeria ? 'pizzeria' : 'proximite',
          vicinity: place.vicinity
        });
      }
    });
    
    // Ajouter les pizzerias (si pas déjÃ  présents) - seuil réduit
    (pizzeriasResponse.data.results || []).forEach(place => {
      if (place.place_id !== MON_PLACE_ID && place.rating && place.user_ratings_total >= 10 && !allPlaces.has(place.place_id)) {
        allPlaces.set(place.place_id, {
          name: place.name,
          rating: place.rating,
          totalReviews: place.user_ratings_total,
          placeId: place.place_id,
          type: 'pizzeria',
          vicinity: place.vicinity
        });
      }
    });
    
    // Trier par note et prendre les 15 meilleurs concurrents
    const concurrentsData = Array.from(allPlaces.values())
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 15);
    
    // Séparer par catégorie
    const proximite = concurrentsData.filter(c => c.type === 'proximite');
    const pizzerias = concurrentsData.filter(c => c.type === 'pizzeria');
    
    // Calculs comparatifs - par rapport aux pizzerias uniquement
    const tousRestaurants = [
      { ...monRestaurant, isMine: true },
      ...concurrentsData.map(c => ({ ...c, isMine: false }))
    ].sort((a, b) => b.rating - a.rating);
    
    const classement = tousRestaurants.findIndex(r => r.isMine) + 1;
    
    // Moyenne des pizzerias seulement (comparaison pertinente)
    const moyennePizzerias = pizzerias.length > 0 
      ? pizzerias.reduce((sum, c) => sum + c.rating, 0) / pizzerias.length
      : 0;
    
    // Moyenne de tous les concurrents
    const moyenneTous = concurrentsData.length > 0 
      ? concurrentsData.reduce((sum, c) => sum + c.rating, 0) / concurrentsData.length
      : 0;
    
    const ecartMoyennePizzerias = monRestaurant.rating - moyennePizzerias;
    const ecartMoyenneTous = monRestaurant.rating - moyenneTous;
    
    // Classement parmi les pizzerias uniquement
    const classementPizzerias = [
      { ...monRestaurant, isMine: true },
      ...pizzerias.map(c => ({ ...c, isMine: false }))
    ].sort((a, b) => b.rating - a.rating)
      .findIndex(r => r.isMine) + 1;
    
    const responseData = {
      configured: true,
      monRestaurant: {
        name: monRestaurant.name,
        rating: monRestaurant.rating,
        totalReviews: monRestaurant.totalReviews
      },
      // Tous les concurrents
      concurrents: concurrentsData,
      // Séparés par type
      proximite,
      pizzerias,
      // Stats globales
      classement,
      total: tousRestaurants.length,
      // Stats proximité (comparaison principale)
      moyenneProximite: proximite.length > 0 
        ? Math.round((proximite.reduce((sum, c) => sum + c.rating, 0) / proximite.length) * 100) / 100
        : 0,
      ecartProximite: proximite.length > 0 
        ? Math.round((monRestaurant.rating - (proximite.reduce((sum, c) => sum + c.rating, 0) / proximite.length)) * 100) / 100
        : 0,
      // Stats pizzerias (comparaison secondaire)
      classementPizzerias,
      totalPizzerias: pizzerias.length + 1,
      moyennePizzerias: Math.round(moyennePizzerias * 100) / 100,
      ecartPizzerias: Math.round(ecartMoyennePizzerias * 100) / 100,
      // Stats tous restaurants
      moyenneTous: Math.round(moyenneTous * 100) / 100,
      ecartTous: Math.round(ecartMoyenneTous * 100) / 100,
      // Message
      message: classement === 1 
        ? '† #1 du quartier !' 
        : `“Š #${classement}/${tousRestaurants.length} du quartier`
    };
    
    // Sauvegarder en cache
    concurrentsCache.data = responseData;
    concurrentsCache.lastUpdate = Date.now();
    
    res.json({
      ...responseData,
      fromCache: false,
      lastUpdate: new Date(concurrentsCache.lastUpdate).toISOString(),
      nextUpdate: new Date(concurrentsCache.lastUpdate + concurrentsCache.TTL).toISOString()
    });
  } catch (err) {
    console.error('Erreur concurrents:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * ”” GET /api/avis/nouveaux - Vérifier les nouveaux avis depuis dernière consultation
 */
router.get('/nouveaux', (req, res) => {
  try {
    const dernierCheck = parseInt(req.query.depuis) || (Date.now() - 24 * 3600 * 1000);
    
    if (!cache.data?.reviews) {
      return res.json({ nouveaux: [], count: 0 });
    }
    
    const nouveauxAvis = cache.data.reviews.filter(r => r.time > dernierCheck);
    const nouveauxNegatifs = nouveauxAvis.filter(r => r.isNegative);
    
    res.json({
      nouveaux: nouveauxAvis,
      count: nouveauxAvis.length,
      negatifs: nouveauxNegatifs.length,
      dernierCheck: new Date(dernierCheck).toISOString(),
      alerte: nouveauxNegatifs.length > 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Données de démo
 */
function getDemoData() {
  const now = Date.now();
  return {
    isDemo: true,
    restaurant: { name: 'Restaurant (Demo)', rating: 4.2, totalReviews: 847, googleUrl: '#' },
    reviews: [
      { author: 'Jean D.', rating: 2, text: 'Service très lent, 45 minutes d\'attente. Le tartare était bon mais l\'attente gâche tout.', time: now - 2*3600000, relativeTime: 'il y a 2h', isNegative: true },
      { author: 'Marie M.', rating: 5, text: 'Excellent ! Terrasse magnifique, accueil chaleureux, tartare parfait.', time: now - 5*3600000, relativeTime: 'il y a 5h', isNegative: false },
      { author: 'Pierre D.', rating: 4, text: 'Bon rapport qualité-prix, accueil sympa.', time: now - 24*3600000, relativeTime: 'il y a 1j', isNegative: false },
      { author: 'Sophie B.', rating: 3, text: 'Correct mais bruyant et portions petites. Service lent.', time: now - 48*3600000, relativeTime: 'il y a 2j', isNegative: true },
      { author: 'Lucas P.', rating: 5, text: 'Super ambiance, magret parfait, terrasse top !', time: now - 72*3600000, relativeTime: 'il y a 3j', isNegative: false }
    ],
    analysis: {
      keywords: {
        positive: [
          { word: 'terrasse', count: 34 }, { word: 'tartare', count: 28 },
          { word: 'accueil', count: 25 }, { word: 'chaleureux', count: 18 }
        ],
        negative: [
          { word: 'attente', count: 31 }, { word: 'lent', count: 22 },
          { word: 'bruit', count: 15 }, { word: 'prix', count: 12 }
        ],
        plats: [
          { word: 'tartare', count: 28 }, { word: 'magret', count: 15 }, { word: 'entrecôte', count: 12 }
        ]
      },
      trends: [
        { word: 'attente', type: 'negative', currentCount: 8, change: 45, direction: 'up', alert: true },
        { word: 'lent', type: 'negative', currentCount: 5, change: 30, direction: 'up', alert: true },
        { word: 'terrasse', type: 'positive', currentCount: 12, change: 25, direction: 'up', alert: false }
      ],
      insights: [
        { type: 'warning', title: '"attente" mentionné 31 fois', detail: 'En hausse de +45% vs mois dernier', action: 'Vérifier le staffing aux heures de pointe' },
        { type: 'success', title: '"terrasse" apprécié (34 mentions)', detail: 'Continuez sur cette lancée !', action: null },
        { type: 'info', title: 'Le tartare fait parler', detail: 'Mentionné 28 fois récemment', action: null }
      ],
      peakProblems: [
        { time: 'samedi 13h', count: 8 }, { time: 'vendredi 20h', count: 6 }, { time: 'dimanche 12h', count: 4 }
      ],
      ratingDistribution: { 5: 312, 4: 245, 3: 156, 2: 89, 1: 45 },
      stats: { totalAnalyzed: 150, currentMonth: 45, lastMonth: 52, averageRating: 4.2, negativeCount: 23 }
    }
  };
}

module.exports = router;
