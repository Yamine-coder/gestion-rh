const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../middlewares/authMiddleware');

// Configuration Multer pour l'upload de photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/photos-profil');
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Format: user-{userId}-{timestamp}.{extension}
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `user-${req.userId}-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

// Filtre pour accepter uniquement les images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non autorisé. Utilisez JPG, PNG ou WEBP.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 MB max
  }
});

// ========================================
// 📸 UPLOAD DE PHOTO DE PROFIL
// ========================================

/**
 * POST /api/profil/upload-photo
 * Upload d'une photo de profil
 */
router.post('/upload-photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune photo fournie' });
    }

    const userId = req.userId;
    const photoPath = `/uploads/photos-profil/${req.file.filename}`;

    // Récupérer l'ancienne photo pour la supprimer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { photoProfil: true }
    });

    // Supprimer l'ancienne photo si elle existe
    if (user.photoProfil) {
      const oldPhotoPath = path.join(__dirname, '..', user.photoProfil);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
        console.log(`🗑️  Ancienne photo supprimée: ${user.photoProfil}`);
      }
    }

    // Mettre à jour le chemin de la photo en BDD
    await prisma.user.update({
      where: { id: userId },
      data: { photoProfil: photoPath }
    });

    console.log(`✅ Photo de profil mise à jour pour l'utilisateur ${userId}`);
    
    res.json({
      message: 'Photo de profil mise à jour avec succès',
      photoUrl: photoPath
    });

  } catch (error) {
    console.error('Erreur upload photo:', error);
    
    // Supprimer le fichier uploadé en cas d'erreur BDD
    if (req.file) {
      const filePath = path.join(__dirname, '../uploads/photos-profil', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    if (error.message.includes('Format de fichier')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Erreur lors de l\'upload de la photo' });
  }
});

/**
 * DELETE /api/profil/delete-photo
 * Supprimer la photo de profil
 */
router.delete('/delete-photo', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Récupérer la photo actuelle
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { photoProfil: true }
    });

    if (!user.photoProfil) {
      return res.status(404).json({ error: 'Aucune photo de profil à supprimer' });
    }

    // Supprimer le fichier
    const photoPath = path.join(__dirname, '..', user.photoProfil);
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
      console.log(`🗑️  Photo supprimée: ${user.photoProfil}`);
    }

    // Mettre à jour la BDD
    await prisma.user.update({
      where: { id: userId },
      data: { photoProfil: null }
    });

    console.log(`✅ Photo de profil supprimée pour l'utilisateur ${userId}`);
    
    res.json({ message: 'Photo de profil supprimée avec succès' });

  } catch (error) {
    console.error('Erreur suppression photo:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la photo' });
  }
});

module.exports = router;
