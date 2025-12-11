const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../prisma/client');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Configuration de Multer pour l'upload des documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const userId = req.userId;
    const type = req.body.type || 'document'; // domicile, rib, navigo
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
// Upload un document (domicile, rib, navigo)
// ========================================
router.post('/upload', authMiddleware, upload.single('document'), async (req, res) => {
  try {
    const userId = req.userId;
    const { type, mois, annee } = req.body; // type: domicile, rib, navigo

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    if (!type || !['domicile', 'rib', 'navigo'].includes(type)) {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    const filePath = `/uploads/documents/${req.file.filename}`;

    // Récupérer l'utilisateur pour supprimer l'ancien fichier si existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        justificatifDomicile: true,
        justificatifRIB: true,
        justificatifNavigo: true
      }
    });

    // Supprimer l'ancien fichier selon le type
    let oldFilePath = null;
    if (type === 'domicile' && user.justificatifDomicile) {
      oldFilePath = user.justificatifDomicile;
    } else if (type === 'rib' && user.justificatifRIB) {
      oldFilePath = user.justificatifRIB;
    } else if (type === 'navigo' && user.justificatifNavigo) {
      oldFilePath = user.justificatifNavigo;
    }

    if (oldFilePath) {
      const fullOldPath = path.join(__dirname, '..', oldFilePath);
      if (fs.existsSync(fullOldPath)) {
        fs.unlinkSync(fullOldPath);
        console.log(`🗑️  Ancien document supprimé: ${oldFilePath}`);
      }
    }

    // Mettre à jour le champ correspondant dans la base
    const updateData = {};
    if (type === 'domicile') {
      updateData.justificatifDomicile = filePath;
    } else if (type === 'rib') {
      updateData.justificatifRIB = filePath;
    } else if (type === 'navigo') {
      updateData.justificatifNavigo = filePath;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    console.log(`✅ Document ${type} uploadé pour l'utilisateur ${userId}`);
    res.json({
      message: 'Document uploadé avec succès',
      filePath: filePath,
      type: type
    });

  } catch (error) {
    console.error('Erreur upload document:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'upload du document' });
  }
});

// ========================================
// DELETE /api/documents/delete/:type
// Supprimer un document (domicile, rib, navigo)
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
    let filePath = null;
    if (type === 'domicile') {
      filePath = user.justificatifDomicile;
    } else if (type === 'rib') {
      filePath = user.justificatifRIB;
    } else if (type === 'navigo') {
      filePath = user.justificatifNavigo;
    }

    if (!filePath) {
      return res.status(404).json({ error: 'Aucun document à supprimer' });
    }

    // Supprimer le fichier
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`🗑️  Document supprimé: ${filePath}`);
    }

    // Mettre à jour la base
    const updateData = {};
    if (type === 'domicile') {
      updateData.justificatifDomicile = null;
    } else if (type === 'rib') {
      updateData.justificatifRIB = null;
    } else if (type === 'navigo') {
      updateData.justificatifNavigo = null;
    }

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
