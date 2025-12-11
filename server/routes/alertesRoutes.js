// server/routes/alertesRoutes.js
// Routes pour le système d'alertes temps réel

const express = require('express');
const router = express.Router();
const alertesController = require('../controllers/alertesController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdminMiddleware');

// Route admin : détecter les retards et absences en temps réel
router.get('/retards-absences', authMiddleware, isAdmin, alertesController.detecterRetardsAbsences);

// Route employé : obtenir son statut de pointage et rappels
router.get('/mon-statut', authMiddleware, alertesController.getStatutPointageEmploye);

module.exports = router;
