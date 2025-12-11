// server/routes/paiementExtrasRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getAllPaiements,
  getPaiementById,
  getPaiementsByEmploye,
  createPaiement,
  marquerPaye,
  annulerPaiement,
  getStatsPaiements,
  getAPayer,
  recalculerHeuresReelles,
  recalculerHeuresReellesPourDate,
  recalculerTousLesPaiements,
  updatePaiement
} = require('../controllers/paiementExtrasController');

const { synchroniserTousLesPaiements } = require('../services/paiementExtrasService');

// Import du middleware d'authentification
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');

// Routes admin - Toutes les routes nécessitent d'être admin
router.use(authMiddleware, adminMiddleware);

// GET /api/paiements-extras - Liste tous les paiements avec filtres
router.get('/', getAllPaiements);

// GET /api/paiements-extras/stats - Statistiques des paiements
router.get('/stats', getStatsPaiements);

// GET /api/paiements-extras/a-payer - Liste les paiements en attente
router.get('/a-payer', getAPayer);

// POST /api/paiements-extras/sync - Synchroniser les paiements depuis anomalies/shifts
router.post('/sync', async (req, res) => {
  try {
    const adminId = req.userId || req.user?.userId || req.user?.id;
    const resultats = await synchroniserTousLesPaiements(adminId);
    res.json({ success: true, message: 'Synchronisation terminée', resultats });
  } catch (error) {
    console.error('Erreur synchronisation:', error);
    res.status(500).json({ error: 'Erreur lors de la synchronisation' });
  }
});

// PUT /api/paiements-extras/recalculer-tous - Recalculer toutes les heures réelles en attente
router.put('/recalculer-tous', recalculerTousLesPaiements);

// PUT /api/paiements-extras/recalculer-date - Recalculer les heures réelles pour une date
router.put('/recalculer-date', recalculerHeuresReellesPourDate);

// GET /api/paiements-extras/employe/:employeId - Paiements d'un employé
router.get('/employe/:employeId', getPaiementsByEmploye);

// GET /api/paiements-extras/:id - Détail d'un paiement
router.get('/:id', getPaiementById);

// POST /api/paiements-extras - Créer un paiement (manuel ou depuis anomalie)
router.post('/', createPaiement);

// PUT /api/paiements-extras/:id/payer - Marquer comme payé
router.put('/:id/payer', marquerPaye);

// PUT /api/paiements-extras/:id/annuler - Annuler un paiement
router.put('/:id/annuler', annulerPaiement);

// PUT /api/paiements-extras/:id/recalculer - Recalculer les heures réelles d'un paiement
router.put('/:id/recalculer', recalculerHeuresReelles);

// PATCH /api/paiements-extras/:id - Mettre à jour un paiement (ajustement manuel)
router.patch('/:id', updatePaiement);

module.exports = router;
