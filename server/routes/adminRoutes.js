// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware: authenticateToken, adminMiddleware } = require('../middlewares/authMiddleware');
const { generateQRCode } = require('../controllers/qrController');
const isAdmin = require('../middlewares/isAdminMiddleware');
const { getTousLesConges, marquerCongesCommeVus, getDemandesNonVues } = require('../controllers/congeController');
const { creerEmploye, modifierEmploye, marquerDepart, annulerDepart, supprimerEmploye } = require('../controllers/adminController');
const { getTousLesEmployes } = require('../controllers/employeController');
const { getDashboardStats } = require('../controllers/adminController');
const { getAllPointages } = require('../controllers/statsController');
const { envoyerIdentifiantsParEmail } = require('../controllers/emailController');
const { getShifts } = require('../controllers/shiftController');

// Nouvelle route : créer un employé (admin uniquement)
router.post('/creer-employe', authenticateToken, isAdmin, creerEmploye);

// 🔐 Admin : voir tous les congés (optionnel : ?statut=approuvé&nonVu=true)
router.get('/conges', authenticateToken, isAdmin, getTousLesConges);

// 🔐 Admin : marquer des congés comme vus
router.post('/conges/vu', authenticateToken, isAdmin, marquerCongesCommeVus);

// 🔐 Admin : obtenir le nombre de demandes non vues
router.get('/conges/non-vues', authenticateToken, isAdmin, getDemandesNonVues);

// Nouvelle route : créer un employé (admin uniquement)
router.post('/employes', authenticateToken, isAdmin, creerEmploye);
router.get('/employes', authenticateToken, isAdmin, (req, res, next) => {
  console.log('🔍 [ADMIN DEBUG] Route /admin/employes (liste complète) appelée');
  console.log('🔍 [ADMIN DEBUG] User:', req.user);
  console.log('🔍 [ADMIN DEBUG] Query:', req.query);
  console.log('🔍 [ADMIN DEBUG] Params:', req.params);
  
  try {
    getTousLesEmployes(req, res, next);
  } catch (error) {
    console.error('❌ [ADMIN DEBUG] Erreur dans le wrapper getTousLesEmployes:', error);
    console.error('❌ [ADMIN DEBUG] Stack:', error.stack);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des employés',
      error: error.message 
    });
  }
});

// Route pour envoyer les identifiants par email - IMPORTANT: cette route doit être avant les routes avec :id
router.post('/employes/envoyer-identifiants', authenticateToken, isAdmin, envoyerIdentifiantsParEmail);

router.get('/employes/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [ADMIN DEBUG] Route /admin/employes/${id} appelée`);
    console.log(`🔍 [ADMIN DEBUG] Params:`, req.params);
    console.log(`🔍 [ADMIN DEBUG] User:`, req.user);
    
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

    console.log(`🔍 [ADMIN DEBUG] Employé trouvé:`, employe);

    if (!employe) {
      console.log(`❌ [ADMIN DEBUG] Employé ${id} non trouvé`);
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    console.log(`✅ [ADMIN DEBUG] Réponse envoyée pour employé ${id}`);
    res.json(employe);
  } catch (error) {
    console.error('❌ [ADMIN DEBUG] Erreur récupération employé:', error);
    console.error('❌ [ADMIN DEBUG] Stack:', error.stack);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération de l\'employé',
      error: error.message 
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

module.exports = router;
