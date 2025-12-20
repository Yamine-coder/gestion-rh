const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { 
  uploadImage, 
  deleteFile, 
  extractPublicIdFromUrl, 
  isCloudinaryUrl,
  isCloudinaryConfigured 
} = require('../services/cloudinaryService');

// Configuration Multer - stockage en mémoire pour Cloudinary
const storage = isCloudinaryConfigured() 
  ? multer.memoryStorage() // Buffer pour Cloudinary
  : multer.diskStorage({   // Fallback local si Cloudinary non configuré
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/photos-profil');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
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
 * Upload d'une photo de profil (Cloudinary ou local)
 */
router.post('/upload-photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune photo fournie' });
    }

    const userId = req.userId;
    let photoUrl;

    // Récupérer l'ancienne photo pour la supprimer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { photoProfil: true }
    });

    // ☁️ CLOUDINARY : Upload vers le cloud si configuré
    if (isCloudinaryConfigured()) {
      try {
        // Upload vers Cloudinary
        const result = await uploadImage(
          req.file.buffer,
          'photos-profil',
          `user-${userId}`
        );
        photoUrl = result.url;
        
        // Supprimer l'ancienne photo de Cloudinary si existe
        if (user.photoProfil && isCloudinaryUrl(user.photoProfil)) {
          const oldPublicId = extractPublicIdFromUrl(user.photoProfil);
          if (oldPublicId) {
            await deleteFile(oldPublicId);
          }
        }
        
        console.log(`☁️  Photo uploadée sur Cloudinary: ${photoUrl}`);
      } catch (cloudinaryError) {
        console.error('❌ Erreur Cloudinary:', cloudinaryError.message);
        return res.status(500).json({ error: 'Erreur lors de l\'upload vers le cloud' });
      }
    } else {
      // 📁 FALLBACK LOCAL : Si Cloudinary non configuré
      photoUrl = `/uploads/photos-profil/${req.file.filename}`;
      
      // Supprimer l'ancienne photo locale si elle existe
      if (user.photoProfil && !isCloudinaryUrl(user.photoProfil)) {
        const oldPhotoPath = path.join(__dirname, '..', user.photoProfil);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
          console.log(`🗑️  Ancienne photo locale supprimée: ${user.photoProfil}`);
        }
      }
      
      console.log(`📁 Photo stockée localement: ${photoUrl}`);
    }

    // Mettre à jour le chemin de la photo en BDD
    await prisma.user.update({
      where: { id: userId },
      data: { photoProfil: photoUrl }
    });

    console.log(`✅ Photo de profil mise à jour pour l'utilisateur ${userId}`);
    
    res.json({
      message: 'Photo de profil mise à jour avec succès',
      photoUrl: photoUrl,
      storage: isCloudinaryConfigured() ? 'cloudinary' : 'local'
    });

  } catch (error) {
    console.error('Erreur upload photo:', error);
    
    // Supprimer le fichier uploadé en cas d'erreur BDD (mode local seulement)
    if (req.file && req.file.filename) {
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
 * Supprimer la photo de profil (Cloudinary ou local)
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

    // ☁️ CLOUDINARY : Supprimer du cloud si c'est une URL Cloudinary
    if (isCloudinaryUrl(user.photoProfil)) {
      const publicId = extractPublicIdFromUrl(user.photoProfil);
      if (publicId) {
        await deleteFile(publicId);
        console.log(`☁️  Photo Cloudinary supprimée: ${publicId}`);
      }
    } else {
      // 📁 LOCAL : Supprimer le fichier local
      const photoPath = path.join(__dirname, '..', user.photoProfil);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
        console.log(`🗑️  Photo locale supprimée: ${user.photoProfil}`);
      }
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
