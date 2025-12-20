const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../prisma/client');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { 
  uploadDocument, 
  deleteFile, 
  extractPublicIdFromUrl, 
  isCloudinaryUrl,
  isCloudinaryConfigured 
} = require('../services/cloudinaryService');

// Configuration de Multer - mémoire pour Cloudinary, disk pour local
const storage = isCloudinaryConfigured()
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/documents');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const userId = req.userId;
        const type = req.body.type || 'document';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${type}-${userId}-${timestamp}${ext}`);
      }
    });

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format non autorisé. Utilisez PDF, JPG, PNG ou WEBP.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: fileFilter
});

// ========================================
// POST /api/documents/upload
// Upload un document (domicile, rib, navigo) - Cloudinary ou local
// ========================================
router.post('/upload', authMiddleware, upload.single('document'), async (req, res) => {
  try {
    const userId = req.userId;
    const { type, mois, annee } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    if (!type || !['domicile', 'rib', 'navigo'].includes(type)) {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    let fileUrl;

    // Récupérer l'utilisateur pour supprimer l'ancien fichier si existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        justificatifDomicile: true,
        justificatifRIB: true,
        justificatifNavigo: true
      }
    });

    // Récupérer l'ancien fichier selon le type
    let oldFileUrl = null;
    if (type === 'domicile') oldFileUrl = user.justificatifDomicile;
    else if (type === 'rib') oldFileUrl = user.justificatifRIB;
    else if (type === 'navigo') oldFileUrl = user.justificatifNavigo;

    // ☁️ CLOUDINARY : Upload vers le cloud si configuré
    if (isCloudinaryConfigured()) {
      try {
        const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
        const result = await uploadDocument(
          req.file.buffer,
          `documents/${type}`,
          `${type}-user-${userId}`,
          resourceType
        );
        fileUrl = result.url;

        // Supprimer l'ancien fichier de Cloudinary
        if (oldFileUrl && isCloudinaryUrl(oldFileUrl)) {
          const oldPublicId = extractPublicIdFromUrl(oldFileUrl);
          if (oldPublicId) {
            const oldResourceType = oldFileUrl.includes('/raw/') ? 'raw' : 'image';
            await deleteFile(oldPublicId, oldResourceType);
          }
        }

        console.log(`☁️  Document ${type} uploadé sur Cloudinary: ${fileUrl}`);
      } catch (cloudinaryError) {
        console.error('❌ Erreur Cloudinary:', cloudinaryError.message);
        return res.status(500).json({ error: 'Erreur lors de l\'upload vers le cloud' });
      }
    } else {
      // 📁 FALLBACK LOCAL
      fileUrl = `/uploads/documents/${req.file.filename}`;

      // Supprimer l'ancien fichier local
      if (oldFileUrl && !isCloudinaryUrl(oldFileUrl)) {
        const fullOldPath = path.join(__dirname, '..', oldFileUrl);
        if (fs.existsSync(fullOldPath)) {
          fs.unlinkSync(fullOldPath);
          console.log(`🗑️  Ancien document local supprimé: ${oldFileUrl}`);
        }
      }

      console.log(`📁 Document ${type} stocké localement: ${fileUrl}`);
    }

    // Mettre à jour le champ correspondant dans la base
    const updateData = {};
    if (type === 'domicile') updateData.justificatifDomicile = fileUrl;
    else if (type === 'rib') updateData.justificatifRIB = fileUrl;
    else if (type === 'navigo') updateData.justificatifNavigo = fileUrl;

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    console.log(`✅ Document ${type} uploadé pour l'utilisateur ${userId}`);
    res.json({
      message: 'Document uploadé avec succès',
      filePath: fileUrl,
      type: type,
      storage: isCloudinaryConfigured() ? 'cloudinary' : 'local'
    });

  } catch (error) {
    console.error('Erreur upload document:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'upload du document' });
  }
});

// ========================================
// DELETE /api/documents/delete/:type
// Supprimer un document (domicile, rib, navigo) - Cloudinary ou local
// ========================================
router.delete('/delete/:type', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { type } = req.params;

    if (!['domicile', 'rib', 'navigo'].includes(type)) {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        justificatifDomicile: true,
        justificatifRIB: true,
        justificatifNavigo: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Récupérer le chemin du fichier selon le type
    let fileUrl = null;
    if (type === 'domicile') fileUrl = user.justificatifDomicile;
    else if (type === 'rib') fileUrl = user.justificatifRIB;
    else if (type === 'navigo') fileUrl = user.justificatifNavigo;

    if (!fileUrl) {
      return res.status(404).json({ error: 'Aucun document à supprimer' });
    }

    // ☁️ CLOUDINARY : Supprimer du cloud si c'est une URL Cloudinary
    if (isCloudinaryUrl(fileUrl)) {
      const publicId = extractPublicIdFromUrl(fileUrl);
      if (publicId) {
        const resourceType = fileUrl.includes('/raw/') ? 'raw' : 'image';
        await deleteFile(publicId, resourceType);
        console.log(`☁️  Document Cloudinary supprimé: ${publicId}`);
      }
    } else {
      // 📁 LOCAL : Supprimer le fichier local
      const fullPath = path.join(__dirname, '..', fileUrl);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`🗑️  Document local supprimé: ${fileUrl}`);
      }
    }

    // Mettre à jour la base
    const updateData = {};
    if (type === 'domicile') updateData.justificatifDomicile = null;
    else if (type === 'rib') updateData.justificatifRIB = null;
    else if (type === 'navigo') updateData.justificatifNavigo = null;

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    console.log(`✅ Document ${type} supprimé pour l'utilisateur ${userId}`);
    res.json({ message: 'Document supprimé avec succès' });

  } catch (error) {
    console.error('Erreur suppression document:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du document' });
  }
});

module.exports = router;
