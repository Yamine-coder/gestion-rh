const express = require('express');
const router = express.Router();
const { signup, login, completerOnboarding, demandeRecuperation, resetAvecToken } = require('../controllers/authController');
// IMPORTANT: l'ancien import retournait un objet -> Express recevait un objet au lieu d'une fonction
const { authMiddleware } = require('../middlewares/authMiddleware');
const { rateLimitLogin, rateLimitRecovery } = require('../middlewares/rateLimitMiddleware');
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validerMotDePasse } = require('../utils/passwordUtils');
const { validateBody, schemas } = require('../middlewares/validation');

// 🔐 Route pour inscription
router.post('/signup', validateBody(schemas.signup), signup);

// 🔑 Route pour connexion (avec rate limiting)
router.post('/login', rateLimitLogin, validateBody(schemas.login), login);

// 🔄 Route pour compléter l'onboarding (première connexion)
router.post('/complete-onboarding', authMiddleware, validateBody(schemas.onboarding), completerOnboarding);

// 📧 Route pour demande de récupération (avec rate limiting)
router.post('/forgot-password', rateLimitRecovery, validateBody(schemas.resetDemande), demandeRecuperation);

// 🔑 Route pour reset avec token (sans auth)
router.post('/reset-password', validateBody(schemas.resetToken), resetAvecToken);

// 👤 Route pour récupérer le profil utilisateur connecté
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(400).json({ error: "ID utilisateur manquant dans le token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { 
        id: true, 
        email: true, 
        role: true, 
        nom: true, 
        prenom: true, 
        telephone: true, 
        adresse: true,
        iban: true,
        categorie: true,
        categories: true,
        dateEmbauche: true,
        createdAt: true,
        statut: true
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 🔄 Route pour rafraîchir un token valide (avant expiration)
router.post('/refresh-token', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, role: true, statut: true }
    });

    if (!user || user.statut !== 'actif') {
      return res.status(403).json({ error: 'Compte inactif' });
    }

    const newToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token: newToken });
  } catch (error) {
    console.error('Erreur refresh token:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✏️ Route pour mettre à jour le profil utilisateur connecté
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(400).json({ error: "ID utilisateur manquant dans le token" });
    }

    const { nom, prenom, email, currentPassword, newPassword } = req.body;
    
    // 🔒 Sanitize: strip HTML tags to prevent stored XSS
    const stripHtml = (str) => typeof str === 'string' ? str.replace(/<[^>]*>/g, '').trim() : '';
    
    const updateData = {};

    if (nom) updateData.nom = stripHtml(nom);
    if (prenom) updateData.prenom = stripHtml(prenom);
    if (email) updateData.email = email.toLowerCase().trim();

    // Si l'utilisateur veut changer son mot de passe
    if (newPassword && currentPassword) {
      // Vérifier l'ancien mot de passe
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { password: true, email: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
      }

      // Valider le nouveau mot de passe
      const validation = validerMotDePasse(newPassword);
      if (!validation.valide) {
        return res.status(400).json({ error: validation.erreur });
      }

      // Hasher le nouveau mot de passe
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // Mettre à jour en base
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        nom: true,
        prenom: true,
        telephone: true,
        categorie: true,
        dateEmbauche: true,
        createdAt: true,
        statut: true
      }
    });

    res.status(200).json({ 
      message: 'Profil mis à jour avec succès',
      user: updatedUser 
    });

  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé par un autre utilisateur' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
