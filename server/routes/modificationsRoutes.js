const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../middlewares/authMiddleware');

// ========================================
// 🔧 UTILITAIRES DE VALIDATION
// ========================================

/**
 * Valider un numéro de téléphone international
 * Accepte : +33612345678, 06 12 34 56 78, +1(555)123-4567, etc.
 */
const isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  
  // Nettoyer : garder seulement + et chiffres
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Vérifier format : 
  // - Peut commencer par + (optionnel)
  // - Doit contenir entre 8 et 15 chiffres
  // - Le + ne peut être qu'au début
  const phoneRegex = /^\+?\d{8,15}$/;
  
  return phoneRegex.test(cleaned);
};

// ========================================
// 📋 CONFIGURATION DES CHAMPS
// ========================================

/**
 * GET /api/modifications/config/champs-modifiables
 * Récupère la configuration des champs modifiables pour l'employé
 */
router.get('/config/champs-modifiables', authMiddleware, async (req, res) => {
  try {
    const champs = await prisma.champs_modifiables_config.findMany({
      where: { actif: true }
    });

    // Organiser par type de modification
    const config = {
      direct: champs.filter(c => c.type_modification === 'direct').map(c => ({ nom_champ: c.nom_champ, description: c.description })),
      validation: champs.filter(c => c.type_modification === 'validation').map(c => ({ nom_champ: c.nom_champ, description: c.description })),
      verrouille: champs.filter(c => c.type_modification === 'verrouille').map(c => ({ nom_champ: c.nom_champ, description: c.description }))
    };

    res.json(config);
  } catch (error) {
    console.error('Erreur chargement config champs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// 🔄 MODIFICATIONS DIRECTES (sans validation)
// ========================================

/**
 * PUT /api/modifications/modification-directe
 * Permet à l'employé de modifier directement certains champs (téléphone, adresse)
 */
router.put('/modification-directe', authMiddleware, async (req, res) => {
  try {
    const { champ, nouvelle_valeur } = req.body;
    const employeId = req.userId;

    // Vérifier que le champ est bien modifiable directement
    const config = await prisma.champs_modifiables_config.findUnique({
      where: { nom_champ: champ }
    });

    if (!config || config.type_modification !== 'direct') {
      return res.status(403).json({ 
        error: 'Ce champ nécessite une validation ou ne peut pas être modifié' 
      });
    }

    // Validation de la valeur
    if (!nouvelle_valeur || typeof nouvelle_valeur !== 'string') {
      return res.status(400).json({ 
        error: 'Valeur invalide ou manquante' 
      });
    }

    // Normaliser et valider selon le type de champ
    let valeurFinale = nouvelle_valeur.trim();
    
    if (champ === 'email') {
      valeurFinale = nouvelle_valeur.toLowerCase().trim();
    }
    
    if (champ === 'telephone') {
      if (!isValidPhoneNumber(valeurFinale)) {
        return res.status(400).json({ 
          error: 'Format de téléphone invalide. Exemples valides: +33612345678, 06 12 34 56 78, +1(555)123-4567' 
        });
      }
    }

    if (champ === 'iban') {
      const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
      if (!ibanRegex.test(valeurFinale)) {
        return res.status(400).json({ 
          error: 'Format IBAN invalide' 
        });
      }
    }

    if (champ === 'adresse') {
      if (valeurFinale.length < 10) {
        return res.status(400).json({ 
          error: 'Adresse trop courte' 
        });
      }
    }

    // Mettre à jour le champ
    const updateData = {};
    updateData[champ] = valeurFinale;

    await prisma.user.update({
      where: { id: employeId },
      data: updateData
    });

    console.log(`✅ Modification directe: ${champ} mis à jour pour employé ${employeId}`);
    res.json({ 
      message: 'Modification enregistrée avec succès',
      champ,
      nouvelle_valeur: valeurFinale
    });

  } catch (error) {
    console.error('❌ Erreur modification directe:', error);
    console.error('Détails:', {
      champ: req.body.champ,
      valeur: req.body.nouvelle_valeur,
      userId: req.userId
    });
    res.status(500).json({ 
      error: 'Erreur lors de la modification',
      details: error.message 
    });
  }
});

// ========================================
// 📝 DEMANDES DE MODIFICATION (avec validation)
// ========================================

/**
 * POST /api/modifications/demande-modification
 * Créer une demande de modification pour un champ nécessitant validation
 */
router.post('/demande-modification', authMiddleware, async (req, res) => {
  try {
    const { champ, nouvelle_valeur, motif } = req.body;
    const employeId = req.userId;

    // Validation
    if (!champ || !nouvelle_valeur || !motif) {
      return res.status(400).json({ 
        error: 'Champ, nouvelle valeur et motif sont requis' 
      });
    }

    // Vérifier que le champ nécessite validation
    const config = await prisma.champs_modifiables_config.findUnique({
      where: { nom_champ: champ }
    });

    if (!config || config.type_modification !== 'validation') {
      return res.status(403).json({ 
        error: 'Ce champ ne nécessite pas de validation ou ne peut pas être modifié' 
      });
    }

    // Récupérer l'ancienne valeur
    const employe = await prisma.user.findUnique({
      where: { id: employeId },
      select: { [champ]: true }
    });

    // Vérifier s'il y a déjà une demande en attente pour ce champ
    const demandeExistante = await prisma.demandes_modification.findFirst({
      where: {
        employe_id: employeId,
        champ_modifie: champ,
        statut: 'en_attente'
      }
    });

    if (demandeExistante) {
      return res.status(400).json({ 
        error: 'Une demande pour ce champ est déjà en attente de traitement' 
      });
    }

    // Normaliser l'email si nécessaire
    let valeurFinale = nouvelle_valeur;
    if (champ === 'email') {
      valeurFinale = nouvelle_valeur.toLowerCase().trim();
    }

    // Créer la demande
    const demande = await prisma.demandes_modification.create({
      data: {
        employe_id: employeId,
        champ_modifie: champ,
        ancienne_valeur: employe[champ] || null,
        nouvelle_valeur: valeurFinale,
        motif,
        statut: 'en_attente'
      }
    });

    console.log(`📝 Nouvelle demande de modification: ${champ} pour employé ${employeId}`);

    // Notifier les admins de la nouvelle demande
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['admin', 'rh'] } },
        select: { id: true }
      });
      
      const nomComplet = employe ? `${employe.prenom} ${employe.nom}` : `Employé #${employeId}`;
      
      for (const admin of admins) {
        await prisma.notifications.create({
          data: {
            employe_id: admin.id,
            type: 'nouvelle_demande_modification',
            titre: 'Nouvelle demande de modification',
            message: `${nomComplet} demande à modifier son ${champ}||employeId:${employeId}||demandeId:${demande.id}`
          }
        });
      }
    } catch (notifErr) {
      console.error('Erreur notification admin:', notifErr);
    }

    res.status(201).json({ 
      message: 'Demande envoyée avec succès',
      demande
    });

  } catch (error) {
    console.error('Erreur création demande:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de la demande' });
  }
});

/**
 * GET /api/modifications/mes-demandes
 * Récupérer toutes les demandes de l'employé connecté
 */
router.get('/mes-demandes', authMiddleware, async (req, res) => {
  try {
    const employeId = req.userId;

    const demandes = await prisma.demandes_modification.findMany({
      where: { employe_id: employeId },
      orderBy: { date_demande: 'desc' }
    });

    res.json(demandes);
  } catch (error) {
    console.error('Erreur récupération demandes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/modifications/mon-historique
 * Récupérer l'historique des modifications validées de l'employé connecté
 */
router.get('/mon-historique', authMiddleware, async (req, res) => {
  try {
    const employeId = req.userId;

    const historique = await prisma.historique_modifications.findMany({
      where: { employe_id: employeId },
      orderBy: { date_modification: 'desc' },
      take: 50 // Limiter aux 50 dernières modifications
    });

    res.json(historique);
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// 👔 ROUTES MANAGER/ADMIN (Validation)
// ========================================

/**
 * GET /api/modifications/demandes-en-attente
 * Récupérer toutes les demandes en attente (pour managers/admins)
 */
router.get('/demandes-en-attente', authMiddleware, async (req, res) => {
  try {
    // Vérifier le rôle
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true }
    });

    if (!['admin', 'rh', 'manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Accès réservé aux managers et administrateurs' });
    }

    const demandes = await prisma.demandes_modification.findMany({
      where: { statut: 'en_attente' },
      orderBy: { date_demande: 'desc' }
    });

    res.json(demandes);
  } catch (error) {
    console.error('Erreur récupération demandes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/modifications/traiter-demande/:id
 * Approuver ou rejeter une demande de modification
 */
router.put('/traiter-demande/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, commentaire } = req.body; // statut: 'approuve' ou 'rejete'
    const traitePar = req.userId;

    // Vérifier le rôle
    const user = await prisma.user.findUnique({
      where: { id: traitePar },
      select: { role: true }
    });

    if (!['admin', 'rh', 'manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Accès réservé aux managers et administrateurs' });
    }

    // Validation
    if (!['approuve', 'rejete'].includes(statut)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    // Récupérer la demande
    const demande = await prisma.demandes_modification.findUnique({
      where: { id: parseInt(id) }
    });

    if (!demande) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    if (demande.statut !== 'en_attente') {
      return res.status(400).json({ error: 'Cette demande a déjà été traitée' });
    }

    // Mettre à jour la demande
    await prisma.demandes_modification.update({
      where: { id: parseInt(id) },
      data: {
        statut,
        date_traitement: new Date(),
        valide_par: traitePar,
        commentaire_validation: commentaire || null
      }
    });

    // Si approuvé, mettre à jour le champ de l'employé
    if (statut === 'approuve') {
      // Récupérer l'ancienne valeur avant mise à jour
      const employeActuel = await prisma.user.findUnique({
        where: { id: demande.employe_id },
        select: { [demande.champ_modifie]: true }
      });
      const ancienneValeur = employeActuel?.[demande.champ_modifie] || null;

      const updateData = {};
      updateData[demande.champ_modifie] = demande.nouvelle_valeur;

      await prisma.user.update({
        where: { id: demande.employe_id },
        data: updateData
      });

      // 🆕 Créer l'entrée dans l'historique des modifications
      await prisma.historique_modifications.create({
        data: {
          employe_id: demande.employe_id,
          champ_modifie: demande.champ_modifie,
          ancienne_valeur: ancienneValeur,
          nouvelle_valeur: demande.nouvelle_valeur,
          date_modification: new Date()
        }
      });

      // Créer une notification de succès pour l'employé
      await prisma.notifications.create({
        data: {
          employe_id: demande.employe_id,
          type: 'profil_modification_approuvee',
          titre: 'Modification de profil approuvée',
          message: `Votre demande de modification du champ "${demande.champ_modifie}" a été approuvée${commentaire ? '. Commentaire: ' + commentaire : '.'}||champ:${demande.champ_modifie}||nouvelleValeur:${demande.nouvelle_valeur}`
        }
      });

      console.log(`✅ Demande approuvée: ${demande.champ_modifie} mis à jour pour employé ${demande.employe_id}`);
    } else {
      // Créer une notification de rejet pour l'employé
      await prisma.notifications.create({
        data: {
          employe_id: demande.employe_id,
          type: 'profil_modification_rejetee',
          titre: 'Modification de profil rejetée',
          message: `Votre demande de modification du champ "${demande.champ_modifie}" a été rejetée${commentaire ? '. Raison: ' + commentaire : '.'}||champ:${demande.champ_modifie}`
        }
      });

      console.log(`❌ Demande rejetée: ${demande.champ_modifie} pour employé ${demande.employe_id}`);
    }

    res.json({ 
      message: statut === 'approuve' ? 'Demande approuvée' : 'Demande rejetée',
      demande
    });

  } catch (error) {
    console.error('Erreur traitement demande:', error);
    res.status(500).json({ error: 'Erreur lors du traitement de la demande' });
  }
});

// ========================================
// 🔄 BATCH UPDATE (plusieurs champs directs)
// ========================================

/**
 * PUT /api/modifications/batch-update
 * Permet de modifier plusieurs champs directs en une seule requête
 * Body: { modifications: { telephone: "xxx", adresse: "yyy" } }
 */
router.put('/batch-update', authMiddleware, async (req, res) => {
  try {
    const { modifications } = req.body;
    const employeId = req.userId;

    console.log('🔵 Batch update reçu:', { employeId, modifications });

    if (!modifications || typeof modifications !== 'object') {
      return res.status(400).json({ error: 'Format invalide: modifications attendu' });
    }

    // Récupérer les champs configurés comme modifiables directement
    const champsConfig = await prisma.champs_modifiables_config.findMany({
      where: { 
        type_modification: 'direct',
        actif: true
      }
    });

    const champsDirectsAutorises = champsConfig.map(c => c.nom_champ);
    console.log('📋 Champs directs autorisés:', champsDirectsAutorises);

    // Valider que tous les champs demandés sont modifiables directement
    const champsAModifier = Object.keys(modifications);
    const champsNonAutorises = champsAModifier.filter(c => !champsDirectsAutorises.includes(c));

    if (champsNonAutorises.length > 0) {
      return res.status(403).json({ 
        error: `Champs non autorisés: ${champsNonAutorises.join(', ')}` 
      });
    }

    // Valider et normaliser chaque valeur
    const updateData = {};
    
    for (const [champ, valeur] of Object.entries(modifications)) {
      // Permettre les valeurs vides pour téléphone et adresse (champs optionnels)
      const champsOptionnels = ['telephone', 'adresse'];
      const estOptional = champsOptionnels.includes(champ);
      
      // Pour les champs non-optionnels, exiger une valeur non vide
      if (!estOptional && (valeur === undefined || valeur === null || typeof valeur !== 'string' || valeur.trim() === '')) {
        return res.status(400).json({ 
          error: `Valeur invalide pour ${champ}` 
        });
      }

      // Pour les champs optionnels, accepter undefined, null ou chaîne vide
      let valeurFinale = (valeur === undefined || valeur === null) ? '' : String(valeur).trim();

      // Si c'est un champ optionnel et qu'il est vide, on le met à null
      if (estOptional && valeurFinale === '') {
        updateData[champ] = null;
        continue;
      }

      // Validation spécifique selon le champ
      if (champ === 'email') {
        valeurFinale = valeur.toLowerCase().trim();
      }

      if (champ === 'telephone' && valeurFinale) {
        if (!isValidPhoneNumber(valeurFinale)) {
          return res.status(400).json({ 
            error: 'Format de téléphone invalide' 
          });
        }
      }

      if (champ === 'iban') {
        const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
        if (!ibanRegex.test(valeurFinale)) {
          return res.status(400).json({ 
            error: 'Format IBAN invalide' 
          });
        }
      }

      if (champ === 'adresse' && valeurFinale) {
        if (valeurFinale.length < 10) {
          return res.status(400).json({ 
            error: 'Adresse trop courte' 
          });
        }
      }

      updateData[champ] = valeurFinale;
    }

    // Mettre à jour tous les champs en une seule opération
    const updatedUser = await prisma.user.update({
      where: { id: employeId },
      data: updateData
    });

    console.log('✅ Utilisateur mis à jour:', updatedUser.id, 'Champs:', Object.keys(updateData));

    res.json({ 
      message: 'Modifications enregistrées avec succès',
      modifications: updateData
    });

  } catch (error) {
    console.error('❌ Erreur batch update:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la sauvegarde',
      details: error.message 
    });
  }
});

module.exports = router;
