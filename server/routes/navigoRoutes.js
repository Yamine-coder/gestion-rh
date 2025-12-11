const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../middlewares/authMiddleware');

// Configuration du stockage des fichiers
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'justificatifs-navigo');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Utilise employeId du body (admin) ou userId du token (employé)
    const employeId = req.body.employeId || req.userId || 'unknown';
    const ext = path.extname(file.originalname);
    const filename = `navigo_${employeId}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers JPG, PNG et PDF sont autorisés'));
    }
  }
});

// Upload d'un justificatif Navigo (par admin)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { employeId, eligibleNavigo } = req.body;
    
    if (!employeId) {
      return res.status(400).json({ message: 'ID employé manquant' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier uploadé' });
    }

    // Chemin relatif pour stockage en BDD
    const filePath = `/uploads/justificatifs-navigo/${req.file.filename}`;

    // Mettre à jour l'employé
    const employe = await prisma.user.update({
      where: { id: parseInt(employeId) },
      data: {
        justificatifNavigo: filePath,
        eligibleNavigo: eligibleNavigo === 'true' || eligibleNavigo === true
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        justificatifNavigo: true,
        eligibleNavigo: true
      }
    });

    res.json({
      message: 'Justificatif uploadé avec succès',
      employe,
      fileUrl: filePath
    });
  } catch (error) {
    console.error('Erreur upload justificatif:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload du justificatif', error: error.message });
  }
});

// Récupérer tous les employés avec leur statut Navigo
router.get('/liste', async (req, res) => {
  try {
    const employes = await prisma.user.findMany({
      where: {
        role: 'employee',
        statut: 'actif'
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        categorie: true,
        justificatifNavigo: true,
        eligibleNavigo: true
      },
      orderBy: [
        { nom: 'asc' },
        { prenom: 'asc' }
      ]
    });

    res.json(employes);
  } catch (error) {
    console.error('Erreur récupération liste:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la liste', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES EMPLOYÉ - Upload de son propre justificatif Navigo
// ⚠️ IMPORTANT: Ces routes DOIVENT être AVANT /:employeId pour éviter conflit
// ═══════════════════════════════════════════════════════════════════════════

// Récupérer le statut Navigo de l'employé connecté
router.get('/mon-statut', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const employe = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        nom: true,
        prenom: true,
        justificatifNavigo: true,
        eligibleNavigo: true
      }
    });

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    res.json(employe);
  } catch (error) {
    console.error('Erreur récupération statut Navigo:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du statut', error: error.message });
  }
});

// Upload du justificatif Navigo par l'employé lui-même
router.post('/mon-justificatif', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier uploadé' });
    }

    // Récupérer l'ancien fichier pour le supprimer
    const oldEmploye = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { justificatifNavigo: true }
    });

    // Supprimer l'ancien fichier si existant
    if (oldEmploye?.justificatifNavigo) {
      const oldFilePath = path.join(__dirname, '..', oldEmploye.justificatifNavigo);
      try {
        await fs.unlink(oldFilePath);
      } catch (error) {
        console.log('Ancien fichier non trouvé ou déjà supprimé');
      }
    }

    // Chemin relatif pour stockage en BDD
    const filePath = `/uploads/justificatifs-navigo/${req.file.filename}`;

    // Mettre à jour l'employé - Le fichier est uploadé, en attente de validation admin
    const employe = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        justificatifNavigo: filePath,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        justificatifNavigo: true,
        eligibleNavigo: true
      }
    });

    res.json({
      message: 'Justificatif Navigo envoyé avec succès ! Il sera traité par l\'administration.',
      employe,
      fileUrl: filePath
    });
  } catch (error) {
    console.error('Erreur upload justificatif employé:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du justificatif', error: error.message });
  }
});

// Supprimer son propre justificatif Navigo
router.delete('/mon-justificatif', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const employe = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { justificatifNavigo: true }
    });

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    // Supprimer le fichier physique
    if (employe.justificatifNavigo) {
      const filePath = path.join(__dirname, '..', employe.justificatifNavigo);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error('Erreur suppression fichier:', error);
      }
    }

    // Mettre à jour la BDD
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        justificatifNavigo: null
      }
    });

    res.json({ message: 'Justificatif supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression justificatif employé:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du justificatif', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// TOGGLE ÉLIGIBILITÉ NAVIGO (Admin)
// ═══════════════════════════════════════════════════════════════════════════

// Toggle l'éligibilité Navigo d'un employé (sans upload de fichier)
router.put('/eligible/:employeId', async (req, res) => {
  try {
    const { employeId } = req.params;
    const { eligibleNavigo } = req.body;

    if (!employeId) {
      return res.status(400).json({ message: 'ID employé manquant' });
    }

    // Vérifier que l'employé existe
    const existingEmploye = await prisma.user.findUnique({
      where: { id: parseInt(employeId) }
    });

    if (!existingEmploye) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    // Mettre à jour l'éligibilité
    const employe = await prisma.user.update({
      where: { id: parseInt(employeId) },
      data: {
        eligibleNavigo: eligibleNavigo === true || eligibleNavigo === 'true'
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        eligibleNavigo: true
      }
    });

    res.json({
      message: `Éligibilité Navigo ${employe.eligibleNavigo ? 'activée' : 'désactivée'}`,
      employe
    });
  } catch (error) {
    console.error('Erreur toggle éligibilité:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'éligibilité', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE PARAMÉTRIQUE - Doit être EN DERNIER pour ne pas intercepter /mon-*
// ═══════════════════════════════════════════════════════════════════════════

// Supprimer un justificatif (par admin)
router.delete('/:employeId', async (req, res) => {
  try {
    const { employeId } = req.params;

    const employe = await prisma.user.findUnique({
      where: { id: parseInt(employeId) },
      select: { justificatifNavigo: true }
    });

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    // Supprimer le fichier physique
    if (employe.justificatifNavigo) {
      const filePath = path.join(__dirname, '..', employe.justificatifNavigo);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error('Erreur suppression fichier:', error);
      }
    }

    // Mettre à jour la BDD
    await prisma.user.update({
      where: { id: parseInt(employeId) },
      data: {
        justificatifNavigo: null,
        eligibleNavigo: false
      }
    });

    res.json({ message: 'Justificatif supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression justificatif:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du justificatif', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// NOUVEAU SYSTÈME DE JUSTIFICATIFS NAVIGO MENSUELS
// ═══════════════════════════════════════════════════════════════════════════

// Configuration du stockage mensuel
const storageJustificatifMensuel = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'justificatifs-navigo-mensuel');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || req.userId || 'unknown';
    const mois = req.body.mois || new Date().getMonth() + 1;
    const annee = req.body.annee || new Date().getFullYear();
    const ext = path.extname(file.originalname);
    const filename = `navigo_${userId}_${annee}_${String(mois).padStart(2, '0')}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const uploadMensuel = multer({
  storage: storageJustificatifMensuel,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers JPG, PNG et PDF sont autorisés'));
    }
  }
});

// Récupérer tous les justificatifs mensuels de l'employé connecté
router.get('/mensuel/mes-justificatifs', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const justificatifs = await prisma.justificatifNavigo.findMany({
      where: { userId: parseInt(userId) },
      orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
      include: {
        validateur: {
          select: { id: true, nom: true, prenom: true }
        }
      }
    });

    // Retourner aussi l'éligibilité Navigo de l'employé
    const employe = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { eligibleNavigo: true }
    });

    res.json({
      eligibleNavigo: employe?.eligibleNavigo || false,
      justificatifs
    });
  } catch (error) {
    console.error('Erreur récupération justificatifs mensuels:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération', error: error.message });
  }
});

// Upload d'un justificatif pour un mois donné
router.post('/mensuel/upload', authMiddleware, uploadMensuel.single('file'), async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { mois, annee } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    if (!mois || !annee) {
      return res.status(400).json({ message: 'Mois et année requis' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier uploadé' });
    }

    const moisInt = parseInt(mois);
    const anneeInt = parseInt(annee);

    // Vérifier si un justificatif existe déjà pour ce mois
    const existant = await prisma.justificatifNavigo.findUnique({
      where: {
        userId_mois_annee: {
          userId: parseInt(userId),
          mois: moisInt,
          annee: anneeInt
        }
      }
    });

    if (existant) {
      // Supprimer l'ancien fichier
      const oldFilePath = path.join(__dirname, '..', existant.fichier);
      try {
        await fs.unlink(oldFilePath);
      } catch (e) {
        console.log('Ancien fichier non trouvé');
      }
      
      // Supprimer l'enregistrement existant
      await prisma.justificatifNavigo.delete({
        where: { id: existant.id }
      });
    }

    const filePath = `/uploads/justificatifs-navigo-mensuel/${req.file.filename}`;

    const justificatif = await prisma.justificatifNavigo.create({
      data: {
        userId: parseInt(userId),
        mois: moisInt,
        annee: anneeInt,
        fichier: filePath,
        statut: 'en_attente'
      }
    });

    res.json({
      message: 'Justificatif envoyé avec succès',
      justificatif
    });
  } catch (error) {
    console.error('Erreur upload justificatif mensuel:', error);
    res.status(500).json({ message: 'Erreur lors de l\'upload', error: error.message });
  }
});

// Supprimer un justificatif mensuel (par l'employé, seulement si en_attente)
router.delete('/mensuel/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { id } = req.params;

    const justificatif = await prisma.justificatifNavigo.findUnique({
      where: { id: parseInt(id) }
    });

    if (!justificatif) {
      return res.status(404).json({ message: 'Justificatif non trouvé' });
    }

    // Vérifier que c'est bien le justificatif de l'employé connecté
    if (justificatif.userId !== parseInt(userId)) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    // Vérifier que le justificatif n'est pas encore validé
    if (justificatif.statut === 'valide') {
      return res.status(400).json({ message: 'Impossible de supprimer un justificatif déjà validé' });
    }

    // Supprimer le fichier
    const filePath = path.join(__dirname, '..', justificatif.fichier);
    try {
      await fs.unlink(filePath);
    } catch (e) {
      console.log('Fichier non trouvé');
    }

    await prisma.justificatifNavigo.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Justificatif supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression justificatif mensuel:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES ADMIN - Gestion des justificatifs mensuels de tous les employés
// ═══════════════════════════════════════════════════════════════════════════

// Récupérer tous les justificatifs en attente (pour validation admin)
router.get('/mensuel/admin/en-attente', authMiddleware, async (req, res) => {
  try {
    // Vérifier que c'est un admin
    if (req.user?.role !== 'admin' && req.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const justificatifs = await prisma.justificatifNavigo.findMany({
      where: { statut: 'en_attente' },
      orderBy: [{ dateUpload: 'asc' }],
      include: {
        user: {
          select: { id: true, nom: true, prenom: true, email: true, categorie: true }
        }
      }
    });

    res.json(justificatifs);
  } catch (error) {
    console.error('Erreur récupération justificatifs en attente:', error);
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Récupérer le tableau de bord admin (statistiques par mois)
router.get('/mensuel/admin/dashboard', authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const { mois, annee } = req.query;
    const moisInt = parseInt(mois) || new Date().getMonth() + 1;
    const anneeInt = parseInt(annee) || new Date().getFullYear();

    // Employés éligibles
    const employesEligibles = await prisma.user.findMany({
      where: {
        role: 'employee',
        statut: 'actif',
        eligibleNavigo: true
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        categorie: true
      }
    });

    // Justificatifs du mois
    const justificatifs = await prisma.justificatifNavigo.findMany({
      where: {
        mois: moisInt,
        annee: anneeInt
      },
      include: {
        user: {
          select: { id: true, nom: true, prenom: true }
        },
        validateur: {
          select: { id: true, nom: true, prenom: true }
        }
      }
    });

    // Calculer les statistiques
    const stats = {
      totalEligibles: employesEligibles.length,
      totalEnvoyes: justificatifs.length,
      valides: justificatifs.filter(j => j.statut === 'valide').length,
      enAttente: justificatifs.filter(j => j.statut === 'en_attente').length,
      refuses: justificatifs.filter(j => j.statut === 'refuse').length,
      manquants: employesEligibles.length - justificatifs.length
    };

    // Créer la liste des employés avec leur statut pour ce mois
    const employesAvecStatut = employesEligibles.map(emp => {
      const justif = justificatifs.find(j => j.userId === emp.id);
      return {
        ...emp,
        justificatif: justif || null,
        statut: justif ? justif.statut : 'non_envoye'
      };
    });

    res.json({
      mois: moisInt,
      annee: anneeInt,
      stats,
      employes: employesAvecStatut,
      justificatifs
    });
  } catch (error) {
    console.error('Erreur dashboard admin:', error);
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Valider ou refuser un justificatif (admin)
router.put('/mensuel/admin/:id/statut', authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const { id } = req.params;
    const { statut, motifRefus } = req.body;
    const adminId = req.user?.id || req.userId;

    if (!['valide', 'refuse'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const justificatif = await prisma.justificatifNavigo.update({
      where: { id: parseInt(id) },
      data: {
        statut,
        motifRefus: statut === 'refuse' ? motifRefus : null,
        dateValidation: new Date(),
        validePar: parseInt(adminId)
      },
      include: {
        user: {
          select: { id: true, nom: true, prenom: true }
        }
      }
    });

    // Envoyer une notification à l'employé
    const titre = statut === 'valide' 
      ? 'Justificatif Navigo validé'
      : 'Justificatif Navigo refusé';
    const message = statut === 'valide' 
      ? `Votre justificatif Navigo pour ${justificatif.mois}/${justificatif.annee} a été validé.`
      : `Votre justificatif Navigo pour ${justificatif.mois}/${justificatif.annee} a été refusé. ${motifRefus ? 'Motif: ' + motifRefus : ''}`;

    await prisma.notifications.create({
      data: {
        employe_id: justificatif.userId,
        type: 'navigo',
        titre,
        message,
        lue: false
      }
    });

    res.json({
      message: statut === 'valide' ? 'Justificatif validé' : 'Justificatif refusé',
      justificatif
    });
  } catch (error) {
    console.error('Erreur validation justificatif:', error);
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Récupérer l'historique complet d'un employé (admin)
router.get('/mensuel/admin/employe/:employeId', authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const { employeId } = req.params;

    const employe = await prisma.user.findUnique({
      where: { id: parseInt(employeId) },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        eligibleNavigo: true,
        dateEmbauche: true
      }
    });

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    const justificatifs = await prisma.justificatifNavigo.findMany({
      where: { userId: parseInt(employeId) },
      orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
      include: {
        validateur: {
          select: { id: true, nom: true, prenom: true }
        }
      }
    });

    res.json({
      employe,
      justificatifs
    });
  } catch (error) {
    console.error('Erreur historique employé:', error);
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Vérifier les rappels à envoyer (à appeler par un scheduler)
router.post('/mensuel/rappels/verifier', authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'admin' && req.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const now = new Date();
    const jourDuMois = now.getDate();
    const moisActuel = now.getMonth() + 1;
    const anneeActuelle = now.getFullYear();

    // Ne pas envoyer de rappels après le 15 du mois
    if (jourDuMois > 15) {
      return res.json({ message: 'Pas de rappels après le 15 du mois', rappelsEnvoyes: 0 });
    }

    // Employés éligibles qui n'ont pas encore envoyé leur justificatif ce mois-ci
    const employesSansJustificatif = await prisma.user.findMany({
      where: {
        role: 'employee',
        statut: 'actif',
        eligibleNavigo: true,
        NOT: {
          justificatifsNavigo: {
            some: {
              mois: moisActuel,
              annee: anneeActuelle
            }
          }
        }
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true
      }
    });

    // Créer des notifications de rappel
    let rappelsEnvoyes = 0;
    for (const emp of employesSansJustificatif) {
      // Vérifier si un rappel n'a pas déjà été envoyé aujourd'hui
      const rappelExistant = await prisma.notifications.findFirst({
        where: {
          employe_id: emp.id,
          type: 'navigo_rappel',
          date_creation: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          }
        }
      });

      if (!rappelExistant) {
        await prisma.notifications.create({
          data: {
            employe_id: emp.id,
            type: 'navigo_rappel',
            message: `N'oubliez pas d'envoyer votre justificatif Navigo pour le mois de ${getNomMois(moisActuel)} ${anneeActuelle}. Vous avez jusqu'au 15 du mois.`,
            lue: false
          }
        });
        rappelsEnvoyes++;
      }
    }

    res.json({
      message: `${rappelsEnvoyes} rappel(s) envoyé(s)`,
      rappelsEnvoyes,
      employesConcernes: employesSansJustificatif.length
    });
  } catch (error) {
    console.error('Erreur vérification rappels:', error);
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Fonction utilitaire pour obtenir le nom du mois
function getNomMois(mois) {
  const noms = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
                'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return noms[mois] || '';
}

module.exports = router;
