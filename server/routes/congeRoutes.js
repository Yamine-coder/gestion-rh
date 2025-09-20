const express = require('express');
const router = express.Router();
const { authMiddleware: authenticateToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdminMiddleware');
const { demanderConge, getMesConges, mettreAJourStatutConge } = require('../controllers/congeController');

// 👤 Employé : faire une demande
router.post('/', authenticateToken, demanderConge);

// 👤 Employé : voir ses congés
router.get('/mes', authenticateToken, getMesConges);

// 🔐 Admin : changer statut d'un congé
router.put('/:id', authenticateToken, isAdmin, mettreAJourStatutConge);
router.get("/mes-conges", authenticateToken, getMesConges);

module.exports = router;