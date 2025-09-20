const express = require('express');
const router = express.Router();
const { getPlanningVsRealite } = require('../controllers/comparisonController');
const { authMiddleware: authenticateToken } = require('../middlewares/authMiddleware');
const isAdminMiddleware = require('../middlewares/isAdminMiddleware');

// GET /api/comparison/planning-vs-realite
// Paramètres : employeId (requis), date OU dateDebut+dateFin
// Accès : Admin uniquement
router.get('/planning-vs-realite', authenticateToken, isAdminMiddleware, getPlanningVsRealite);

module.exports = router;
