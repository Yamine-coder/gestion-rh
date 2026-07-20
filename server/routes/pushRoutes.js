// server/routes/pushRoutes.js
// Routes Web Push : abonnement aux notifications de rappel de pointage

const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Clé publique VAPID (nécessaire au navigateur pour s'abonner)
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Gestion de l'abonnement (employé connecté)
router.post('/subscribe', authMiddleware, pushController.subscribe);
router.post('/unsubscribe', authMiddleware, pushController.unsubscribe);

// Notification de test (employé connecté)
router.post('/test', authMiddleware, pushController.sendTest);

module.exports = router;
