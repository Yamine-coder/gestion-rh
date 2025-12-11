// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware: authenticateToken } = require('../middlewares/authMiddleware');
const prisma = require('../prisma/client');
const bcrypt = require('bcrypt');
const { validerMotDePasse } = require('../utils/passwordUtils');
const { parseCategories, enrichUserWithCategories } = require('../utils/categoriesHelper');

// ✅ Route : GET /user/profile
router.get('/profile', authenticateToken, async (req, res) => {
  console.log("DEBUG JWT req.user =", req.user); // Log pour vérifier

  if (!req.user?.userId) {
    return res.status(400).json({ error: "ID utilisateur manquant dans le token" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }, // Utilise req.user.userId
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
        photoProfil: true,
        justificatifDomicile: true,
        justificatifRIB: true,
        justificatifNavigo: true,
        createdAt: true 
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Enrichir avec categoriesArray
    const enrichedUser = enrichUserWithCategories(user);
    res.status(200).json(enrichedUser);
  } catch (error) {
    console.error('Erreur serveur /user/profile :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ Route : GET /user/profil (alternative française)
router.get('/profil', authenticateToken, async (req, res) => {
  if (!req.user?.userId) {
    return res.status(400).json({ error: "ID utilisateur manquant dans le token" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
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
        photoProfil: true,
        justificatifDomicile: true,
        justificatifRIB: true,
        justificatifNavigo: true,
        createdAt: true 
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Enrichir avec categoriesArray
    const enrichedUser = enrichUserWithCategories(user);
    res.status(200).json(enrichedUser);
  } catch (error) {
    console.error('Erreur serveur /user/profil :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ Route : PUT /user/change-password
router.put('/change-password', authenticateToken, async (req, res) => {
  const { ancienMotDePasse, nouveauMotDePasse } = req.body;
  const userId = req.user.userId;

  console.log('🔄 CHANGEMENT PASSWORD DEBUG:');
  console.log('- userId:', userId);
  console.log('- nouveauMotDePasse length:', nouveauMotDePasse?.length);

  try {
    // Validation du nouveau mot de passe
    const validation = validerMotDePasse(nouveauMotDePasse);
    if (!validation.valide) {
      return res.status(400).json({ error: validation.erreur });
    }

    // Récupérer l'utilisateur actuel
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, email: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier l'ancien mot de passe
    const isValidOldPassword = await bcrypt.compare(ancienMotDePasse, user.password);
    if (!isValidOldPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }

    // Hash du nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(nouveauMotDePasse, 10);

    // Mise à jour en base
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedNewPassword,
        lastLoginAt: new Date()
      }
    });

    console.log(`✅ Mot de passe changé pour ${user.email}`);
    res.json({ success: true, message: 'Mot de passe modifié avec succès' });

  } catch (error) {
    console.error('❌ Erreur changement mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/pointage', authenticateToken, async (req, res) => {
  try {
    const { type } = req.body;
    const userId = req.user.userId;

    const pointage = await prisma.pointage.create({
      data: {
        type,
        userId,
      },
    });

    res.status(200).json(pointage);
  } catch (error) {
    console.error('Erreur lors du pointage :', error);
    res.status(500).json({ error: 'Erreur serveur lors du pointage' });
  }
});
module.exports = router;
