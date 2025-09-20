const express = require('express');
const router = express.Router();
const { signup, login, completerOnboarding, demandeRecuperation, resetAvecToken } = require('../controllers/authController');
// IMPORTANT: l'ancien import retournait un objet -> Express recevait un objet au lieu d'une fonction
const { authMiddleware } = require('../middlewares/authMiddleware');
const { rateLimitLogin, rateLimitRecovery } = require('../middlewares/rateLimitMiddleware');
const prisma = require('../prisma/client');
const bcrypt = require('bcrypt');
const { validerMotDePasse } = require('../utils/passwordUtils');

// 🔐 Route pour inscription
router.post('/signup', signup);

// 🔑 Route pour connexion (avec rate limiting)
router.post('/login', rateLimitLogin, login);

// 🔄 Route pour compléter l'onboarding (première connexion)
router.post('/complete-onboarding', authMiddleware, completerOnboarding);

// 📧 Route pour demande de récupération (avec rate limiting)
router.post('/forgot-password', rateLimitRecovery, demandeRecuperation);

// 🔑 Route pour reset avec token (sans auth)
router.post('/reset-password', resetAvecToken);

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
        categorie: true, 
        dateEmbauche: true,
        createdAt: true,
        statut: true
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    console.log(`👤 Profil récupéré pour ${user.email} (${user.role})`);
    res.status(200).json(user);
  } catch (error) {
    console.error('Erreur récupération profil:', error);
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
    
    // Données à mettre à jour
    const updateData = {};
    
    if (nom) updateData.nom = nom.trim();
    if (prenom) updateData.prenom = prenom.trim();
    if (email) updateData.email = email.trim();

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
      console.log(`🔑 Mot de passe mis à jour pour ${user.email}`);
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

    console.log(`✅ Profil mis à jour pour ${updatedUser.email}`);
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
