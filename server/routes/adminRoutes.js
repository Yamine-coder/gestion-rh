// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware: authenticateToken, adminMiddleware } = require('../middlewares/authMiddleware');
const { generateQRCode } = require('../controllers/qrController');
const isAdmin = require('../middlewares/isAdminMiddleware');
const { getTousLesConges, marquerCongesCommeVus, getDemandesNonVues } = require('../controllers/congeController');
const { creerEmploye, modifierEmploye, marquerDepart, annulerDepart, supprimerEmploye, reinviterEmploye } = require('../controllers/adminController');
const { getTousLesEmployes } = require('../controllers/employeController');
const { getDashboardStats } = require('../controllers/adminController');
const { getAllPointages } = require('../controllers/statsController');
const { envoyerIdentifiantsParEmail } = require('../controllers/emailController');
const { getShifts } = require('../controllers/shiftController');
const { CATEGORIES_VALIDES } = require('../utils/categoriesHelper');

// 🔐 Admin : voir tous les congés (optionnel : ?statut=approuvé&nonVu=true)
router.get('/conges', authenticateToken, isAdmin, getTousLesConges);

// 🔐 Admin : marquer des congés comme vus
router.post('/conges/vu', authenticateToken, isAdmin, marquerCongesCommeVus);

// 🔐 Admin : obtenir le nombre de demandes non vues
router.get('/conges/non-vues', authenticateToken, isAdmin, getDemandesNonVues);

router.post('/employes', authenticateToken, isAdmin, creerEmploye);
router.get('/employes', authenticateToken, isAdmin, getTousLesEmployes);

// Route pour envoyer les identifiants par email - IMPORTANT: cette route doit être avant les routes avec :id
router.post('/employes/envoyer-identifiants', authenticateToken, isAdmin, envoyerIdentifiantsParEmail);

// Route pour réinviter un employé existant (nouveau mot de passe + email optionnel)
router.post('/employes/:id/reinviter', authenticateToken, isAdmin, reinviterEmploye);

router.get('/employes/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const prisma = require('../prisma/client');
    const employe = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: { 
        id: true, 
        email: true, 
        nom: true, 
        prenom: true, 
        role: true,
        statut: true,
        createdAt: true
      }
    });

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    res.json(employe);
  } catch (error) {
    res.status(500).json({ 
      message: 'Erreur lors de la récupération de l\'employé'
    });
  }
});
router.put('/employes/:id', authenticateToken, isAdmin, modifierEmploye);
router.put('/employes/:id/depart', authenticateToken, isAdmin, marquerDepart);
router.put('/employes/:id/annuler-depart', authenticateToken, isAdmin, annulerDepart);
router.delete('/employes/:id', authenticateToken, isAdmin, supprimerEmploye);

router.get('/employes/:id/qrcode', authenticateToken, isAdmin, generateQRCode);

router.get('/stats', authenticateToken, isAdmin, getDashboardStats);

// Route pour récupérer tous les pointages (avec filtres)
router.get('/pointages', authenticateToken, isAdmin, getAllPointages);

// Routes pour les shifts/planning
router.get('/shifts', authenticateToken, isAdmin, getShifts);
router.get('/planning/jour', authenticateToken, isAdmin, getShifts); // Alias pour compatibilité

// Référentiel catégories
router.get('/categories', authenticateToken, (req, res) => {
  res.json(CATEGORIES_VALIDES);
});

module.exports = router;
