// server/routes/anomaliesRoutes.js
const express = require('express');
const router = express.Router();
const { 
  syncAnomaliesFromComparison, 
  getAnomalies, 
  traiterAnomalie, 
  getStatsAnomalies, 
  marquerAnomaliesVues,
  getBilanJournalier 
} = require('../controllers/anomaliesController');

// Import du middleware d'authentification centralisé
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

// Routes publiques (avec auth)
router.get('/', authMiddleware, getAnomalies);
router.get('/stats', authMiddleware, getStatsAnomalies);
router.get('/bilan-journalier/:employeId/:date', authMiddleware, getBilanJournalier);
router.put('/marquer-vues', authMiddleware, marquerAnomaliesVues);

// Routes admin
router.post('/sync-from-comparison', authMiddleware, adminMiddleware, syncAnomaliesFromComparison);
router.put('/:id/traiter', authMiddleware, adminMiddleware, traiterAnomalie);

module.exports = router;
