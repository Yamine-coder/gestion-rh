const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware: authenticateToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdminMiddleware');
const { demanderConge, getMesConges, mettreAJourStatutConge } = require('../controllers/congeController');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { 
  uploadDocument, 
  deleteFile, 
  extractPublicIdFromUrl, 
  isCloudinaryUrl,
  isCloudinaryConfigured 
} = require('../services/cloudinaryService');

// ========================================
// Configuration Multer pour les justificatifs de congés
// ========================================
const storage = isCloudinaryConfigured()
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/justificatifs');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const userId = req.user?.userId || 'unknown';
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
        cb(null, `justificatif-${userId}-${timestamp}-${safeName}${ext}`);
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max pour les certificats médicaux
  fileFilter: fileFilter
});

// 👤 Employé : faire une demande
router.post('/', authenticateToken, demanderConge);

// 👤 Employé : voir ses congés
router.get('/mes', authenticateToken, getMesConges);
router.get("/mes-conges", authenticateToken, getMesConges);

// 👤 Employé : modifier sa demande (en attente uniquement)
router.put('/:id/update', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, debut, fin, motif } = req.body;
    const userId = req.user.userId;

    const conge = await prisma.conge.findUnique({ where: { id: parseInt(id) } });
    
    if (!conge) {
      return res.status(404).json({ error: 'Congé introuvable' });
    }

    // Vérifier que c'est bien le propriétaire
    if (conge.userId !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Ne peut modifier que si en attente
    if (conge.statut !== 'en attente') {
      return res.status(400).json({ error: 'Seules les demandes en attente peuvent être modifiées' });
    }

    // Vérifier les chevauchements (en excluant le congé actuel)
    const chevauchement = await prisma.conge.findFirst({
      where: {
        userId,
        id: { not: parseInt(id) },
        statut: { in: ['en attente', 'approuvé'] },
        OR: [
          {
            AND: [
              { dateDebut: { lte: new Date(debut) } },
              { dateFin: { gte: new Date(debut) } }
            ]
          },
          {
            AND: [
              { dateDebut: { lte: new Date(fin) } },
              { dateFin: { gte: new Date(fin) } }
            ]
          },
          {
            AND: [
              { dateDebut: { gte: new Date(debut) } },
              { dateFin: { lte: new Date(fin) } }
            ]
          }
        ]
      }
    });

    if (chevauchement) {
      return res.status(400).json({ 
        error: `Chevauchement avec une demande existante du ${new Date(chevauchement.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(chevauchement.dateFin).toLocaleDateString('fr-FR')}`
      });
    }

    const updated = await prisma.conge.update({
      where: { id: parseInt(id) },
      data: {
        type,
        dateDebut: new Date(debut),
        dateFin: new Date(fin),
        motifEmploye: motif || null, // Sauvegarder le commentaire de l'employé
      }
    });

    // 🔔 Notifier les managers/admins de la modification
    try {
      const employe = await prisma.user.findUnique({
        where: { id: userId },
        select: { nom: true, prenom: true, email: true }
      });

      const managers = await prisma.user.findMany({
        where: { role: { in: ['admin', 'manager'] } },
        select: { id: true }
      });

      const employeName = employe?.prenom && employe?.nom 
        ? `${employe.prenom} ${employe.nom}` 
        : employe?.email || 'Un employé';

      const dateDebutStr = new Date(debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      const dateFinStr = new Date(fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

      if (managers.length > 0) {
        await prisma.notifications.createMany({
          data: managers.map(manager => ({
            employe_id: manager.id,
            type: 'modification_demande_conge',
            titre: 'Demande de conge modifiee',
            message: JSON.stringify({
              text: `${employeName} a modifie sa demande de ${type} : nouvelles dates du ${dateDebutStr} au ${dateFinStr}`,
              congeId: updated.id,
              employeNom: employeName
            }),
            lue: false
          }))
        });
        console.log(`Notification envoyee aux ${managers.length} manager(s) pour modification de demande`);
      }
    } catch (notifError) {
      console.error('Erreur création notification modification:', notifError);
    }

    res.json(updated);
  } catch (err) {
    console.error('Erreur modification congé:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 👤 Employé : supprimer sa demande (en attente uniquement)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const conge = await prisma.conge.findUnique({ where: { id: parseInt(id) } });
    
    if (!conge) {
      return res.status(404).json({ error: 'Congé introuvable' });
    }

    // Vérifier que c'est bien le propriétaire
    if (conge.userId !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Ne peut supprimer que si en attente
    if (conge.statut !== 'en attente') {
      return res.status(400).json({ error: 'Seules les demandes en attente peuvent être annulées' });
    }

    // Supprimer les shifts associés au congé (créés automatiquement)
    const dateDebut = new Date(conge.dateDebut);
    const dateFin = new Date(conge.dateFin);
    
    await prisma.shift.deleteMany({
      where: {
        employeId: userId,
        type: 'absence',
        date: {
          gte: dateDebut,
          lte: dateFin,
        },
        motif: conge.type, // Le motif du shift correspond au type de congé
      }
    });

    // Supprimer le congé
    await prisma.conge.delete({ where: { id: parseInt(id) } });

    res.json({ message: 'Demande annulée avec succès' });
  } catch (err) {
    console.error('Erreur suppression congé:', err);
    console.error('Détails:', err.message);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
});

// 🔐 Admin : changer statut d'un congé
router.put('/:id', authenticateToken, isAdmin, mettreAJourStatutConge);

// ========================================
// 📎 UPLOAD JUSTIFICATIF pour un congé
// ========================================

// Types de congés nécessitant un justificatif obligatoire
const TYPES_JUSTIFICATIF_OBLIGATOIRE = ['maladie', 'maternite', 'paternite', 'deces'];
// Types où le justificatif est optionnel mais recommandé
const TYPES_JUSTIFICATIF_OPTIONNEL = ['mariage', 'formation'];

// Vérifier si un type de congé nécessite un justificatif
const requiresJustificatif = (type) => {
  const typeNormalized = type?.toLowerCase().replace(/congé\s*/i, '').trim();
  return TYPES_JUSTIFICATIF_OBLIGATOIRE.some(t => typeNormalized?.includes(t));
};

// 📎 Upload justificatif lors de la création/modification d'un congé (Cloudinary ou local)
router.post('/:id/justificatif', authenticateToken, upload.single('justificatif'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const conge = await prisma.conge.findUnique({ 
      where: { id: parseInt(id) },
      include: { user: { select: { nom: true, prenom: true, email: true } } }
    });
    
    if (!conge) {
      return res.status(404).json({ error: 'Congé introuvable' });
    }

    // Vérifier que c'est bien le propriétaire
    if (conge.userId !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    let fileUrl;

    // ☁️ CLOUDINARY : Upload vers le cloud si configuré
    if (isCloudinaryConfigured()) {
      try {
        // Supprimer l'ancien justificatif de Cloudinary
        if (conge.justificatif && isCloudinaryUrl(conge.justificatif)) {
          const oldPublicId = extractPublicIdFromUrl(conge.justificatif);
          if (oldPublicId) {
            const oldResourceType = conge.justificatif.includes('/raw/') ? 'raw' : 'image';
            await deleteFile(oldPublicId, oldResourceType);
          }
        }

        const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
        const result = await uploadDocument(
          req.file.buffer,
          'justificatifs',
          `justificatif-conge-${id}-${Date.now()}`,
          resourceType
        );
        fileUrl = result.url;
        console.log(`☁️  Justificatif uploadé sur Cloudinary: ${fileUrl}`);
      } catch (cloudinaryError) {
        console.error('❌ Erreur Cloudinary:', cloudinaryError.message);
        return res.status(500).json({ error: 'Erreur lors de l\'upload vers le cloud' });
      }
    } else {
      // 📁 FALLBACK LOCAL
      // Supprimer l'ancien justificatif local
      if (conge.justificatif && !isCloudinaryUrl(conge.justificatif)) {
        const oldPath = path.join(__dirname, '..', conge.justificatif);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      fileUrl = `/uploads/justificatifs/${req.file.filename}`;
      console.log(`📁 Justificatif stocké localement: ${fileUrl}`);
    }

    // Mettre à jour le congé avec le chemin du justificatif
    const updated = await prisma.conge.update({
      where: { id: parseInt(id) },
      data: { justificatif: fileUrl }
    });

    // 🔔 Notifier les managers/admins qu'un justificatif a été ajouté
    try {
      const managers = await prisma.user.findMany({
        where: { role: { in: ['admin', 'manager'] } },
        select: { id: true }
      });

      const employeName = conge.user?.prenom && conge.user?.nom 
        ? `${conge.user.prenom} ${conge.user.nom}` 
        : conge.user?.email || 'Un employé';

      // Créer une notification pour chaque manager
      if (managers.length > 0) {
        await prisma.notifications.createMany({
          data: managers.map(manager => ({
            employe_id: manager.id,
            type: 'justificatif_ajoute',
            titre: 'Justificatif ajoute',
            message: JSON.stringify({
              text: `${employeName} a ajoute un justificatif a sa demande de ${conge.type} (${new Date(conge.dateDebut).toLocaleDateString('fr-FR')} - ${new Date(conge.dateFin).toLocaleDateString('fr-FR')})`,
              congeId: conge.id,
              employeNom: employeName
            }),
            lue: false
          }))
        });
      }
    } catch (notifError) {
      console.error('Erreur création notification:', notifError);
      // Ne pas bloquer l'upload si la notification échoue
    }

    res.json({ 
      message: 'Justificatif uploadé avec succès',
      justificatif: fileUrl,
      conge: updated,
      storage: isCloudinaryConfigured() ? 'cloudinary' : 'local'
    });
  } catch (err) {
    console.error('Erreur upload justificatif:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 📎 Supprimer le justificatif d'un congé
router.delete('/:id/justificatif', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const conge = await prisma.conge.findUnique({ where: { id: parseInt(id) } });
    
    if (!conge) {
      return res.status(404).json({ error: 'Congé introuvable' });
    }

    // Vérifier que c'est bien le propriétaire (ou admin)
    if (conge.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    if (!conge.justificatif) {
      return res.status(400).json({ error: 'Aucun justificatif à supprimer' });
    }

    // ☁️ CLOUDINARY ou 📁 LOCAL : Supprimer le fichier
    if (isCloudinaryUrl(conge.justificatif)) {
      const publicId = extractPublicIdFromUrl(conge.justificatif);
      if (publicId) {
        const resourceType = conge.justificatif.includes('/raw/') ? 'raw' : 'image';
        await deleteFile(publicId, resourceType);
        console.log(`☁️  Justificatif Cloudinary supprimé: ${publicId}`);
      }
    } else {
      const filePath = path.join(__dirname, '..', conge.justificatif);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Justificatif local supprimé: ${conge.justificatif}`);
      }
    }

    // Mettre à jour le congé
    const updated = await prisma.conge.update({
      where: { id: parseInt(id) },
      data: { justificatif: null }
    });

    res.json({ message: 'Justificatif supprimé', conge: updated });
  } catch (err) {
    console.error('Erreur suppression justificatif:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 📋 Helper: Vérifier si justificatif requis pour un type
router.get('/config/justificatif-requis/:type', authenticateToken, (req, res) => {
  const { type } = req.params;
  const obligatoire = requiresJustificatif(type);
  const typeNormalized = type?.toLowerCase().replace(/congé\s*/i, '').trim();
  const optionnel = TYPES_JUSTIFICATIF_OPTIONNEL.some(t => typeNormalized?.includes(t));
  
  res.json({
    type,
    justificatifObligatoire: obligatoire,
    justificatifOptionnel: optionnel,
    message: obligatoire 
      ? 'Un justificatif est obligatoire pour ce type de congé' 
      : optionnel 
        ? 'Un justificatif est recommandé pour ce type de congé'
        : 'Aucun justificatif requis'
  });
});

module.exports = router;