// server/routes/anomaliesRoutes.js
const express = require('express');
const router = express.Router();
const { 
  syncAnomaliesFromComparison, 
  getAnomalies, 
  traiterAnomalie, 
  getStatsAnomalies, 
  marquerAnomaliesVues,
  getBilanJournalier,
  getAnalytics,
  getEmployeScore,
  getEmployePatterns,
  invaliderAnomaliesPourShift,
  getAlertesNonTraitees
} = require('../controllers/anomaliesController');

// Import du middleware d'authentification centralisé
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

// Routes publiques (avec auth)
router.get('/', authMiddleware, getAnomalies);
router.get('/stats', authMiddleware, getStatsAnomalies);
router.get('/bilan-journalier/:employeId/:date', authMiddleware, getBilanJournalier);
router.put('/marquer-vues', authMiddleware, marquerAnomaliesVues);

// Routes alertes (admin)
router.get('/alertes-non-traitees', authMiddleware, adminMiddleware, getAlertesNonTraitees);

// Routes analytics (manager+)
router.get('/analytics', authMiddleware, getAnalytics);
router.get('/score/:employeId', authMiddleware, getEmployeScore);
router.get('/patterns/:employeId', authMiddleware, getEmployePatterns);

// Routes admin
router.post('/sync-from-comparison', authMiddleware, adminMiddleware, syncAnomaliesFromComparison);
router.put('/:id/traiter', authMiddleware, adminMiddleware, traiterAnomalie);
// Route invalidation anomalies (appelée après modif shift)
router.post('/invalider-pour-shift', authMiddleware, adminMiddleware, invaliderAnomaliesPourShift);

module.exports = router;
