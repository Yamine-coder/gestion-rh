/**
 * ================================================================
 * ROUTES API - MODIFICATIONS EMPLOYÉS
 * ================================================================
 * Gestion des modifications directes et demandes de validation
 * ================================================================
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware: verifyToken } = require('../middlewares/authMiddleware');

const prisma = new PrismaClient();

// ================================================================
// MIDDLEWARE - Récupération de l'IP client
// ================================================================
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress;
};

// ================================================================
// CONFIGURATION - Récupérer les champs modifiables
// ================================================================
router.get('/config/champs-modifiables', verifyToken, async (req, res) => {
  try {
    const champs = await prisma.$queryRaw`
      SELECT nom_champ, type_modification, description 
      FROM champs_modifiables_config 
      WHERE actif = TRUE 
      ORDER BY type_modification, nom_champ
    `;
    
    // Regrouper par type
    const config = {
      direct: champs.filter(c => c.type_modification === 'direct'),
      validation: champs.filter(c => c.type_modification === 'validation'),
      verrouille: champs.filter(c => c.type_modification === 'verrouille')
    };
    
    res.json(config);
  } catch (error) {
    console.error('Erreur récupération config:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ================================================================
// MODIFICATION DIRECTE - Téléphone, Adresse, Photo
// ================================================================
router.put('/modification-directe', verifyToken, async (req, res) => {
  const { champ, nouvelle_valeur } = req.body;
  const employeId = req.user.id;
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  try {
    // Vérifier que le champ est modifiable directement
    const config = await prisma.$queryRaw(
      'SELECT type_modification FROM champs_modifiables_config WHERE nom_champ = ? AND actif = TRUE',
      [champ]
    );

    if (!config[0] || config[0].type_modification !== 'direct') {
      return res.status(403).json({ error: 'Ce champ ne peut pas être modifié directement' });
    }

    // Récupérer l'ancienne valeur
    const employe = await prisma.$queryRaw(
      `SELECT ${champ} as ancienne_valeur FROM employes WHERE id = ?`,
      [employeId]
    );

    const ancienneValeur = employe[0]?.ancienne_valeur;

    // Commencer une transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Mettre à jour l'employé
      await connection.query(
        `UPDATE employes SET ${champ} = ? WHERE id = ?`,
        [nouvelle_valeur, employeId]
      );

      // Enregistrer dans l'historique
      await connection.query(
        `INSERT INTO historique_modifications 
         (employe_id, champ_modifie, ancienne_valeur, nouvelle_valeur, adresse_ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [employeId, champ, ancienneValeur, nouvelle_valeur, clientIp, userAgent]
      );

      await connection.commit();
      connection.release();

      res.json({ 
        success: true, 
        message: 'Modification enregistrée avec succès',
        ancienne_valeur: ancienneValeur,
        nouvelle_valeur: nouvelle_valeur
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Erreur modification directe:', error);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
});

// ================================================================
// DEMANDE DE MODIFICATION - Email, IBAN (avec validation)
// ================================================================
router.post('/demande-modification', verifyToken, async (req, res) => {
  const { champ, nouvelle_valeur, motif } = req.body;
  const employeId = req.user.id;
  const clientIp = getClientIp(req);

  try {
    // Vérifier que le champ nécessite une validation
    const config = await prisma.$queryRaw(
      'SELECT type_modification FROM champs_modifiables_config WHERE nom_champ = ? AND actif = TRUE',
      [champ]
    );

    if (!config[0] || config[0].type_modification !== 'validation') {
      return res.status(403).json({ error: 'Ce champ ne nécessite pas de validation' });
    }

    // Vérifier qu'il n'y a pas déjà une demande en attente pour ce champ
    const demandeExistante = await prisma.$queryRaw(
      `SELECT id FROM demandes_modification 
       WHERE employe_id = ? AND champ_modifie = ? AND statut = 'en_attente'`,
      [employeId, champ]
    );

    if (demandeExistante.length > 0) {
      return res.status(409).json({ error: 'Une demande est déjà en attente pour ce champ' });
    }

    // Récupérer l'ancienne valeur
    const employe = await prisma.$queryRaw(
      `SELECT ${champ} as ancienne_valeur FROM employes WHERE id = ?`,
      [employeId]
    );

    const ancienneValeur = employe[0]?.ancienne_valeur;

    // Créer la demande
    const result = await prisma.$queryRaw(
      `INSERT INTO demandes_modification 
       (employe_id, champ_modifie, ancienne_valeur, nouvelle_valeur, motif, adresse_ip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employeId, champ, ancienneValeur, nouvelle_valeur, motif, clientIp]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Demande de modification envoyée. Elle sera traitée par un administrateur.',
      demande_id: result.insertId
    });
  } catch (error) {
    console.error('Erreur demande modification:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de la demande' });
  }
});

// ================================================================
// HISTORIQUE - Récupérer l'historique de l'employé connecté
// ================================================================
router.get('/mon-historique', verifyToken, async (req, res) => {
  const employeId = req.user.id;

  try {
    const historique = await prisma.$queryRaw(
      `SELECT id, champ_modifie, ancienne_valeur, nouvelle_valeur, date_modification
       FROM historique_modifications
       WHERE employe_id = ?
       ORDER BY date_modification DESC
       LIMIT 50`,
      [employeId]
    );

    res.json(historique);
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ================================================================
// MES DEMANDES - Récupérer les demandes de l'employé connecté
// ================================================================
router.get('/mes-demandes', verifyToken, async (req, res) => {
  const employeId = req.user.id;

  try {
    const demandes = await prisma.$queryRaw(
      `SELECT 
        dm.id,
        dm.champ_modifie,
        dm.ancienne_valeur,
        dm.nouvelle_valeur,
        dm.motif,
        dm.statut,
        dm.date_demande,
        dm.date_traitement,
        dm.commentaire_validation,
        CONCAT(e.prenom, ' ', e.nom) as validateur
       FROM demandes_modification dm
       LEFT JOIN employes e ON dm.valide_par = e.id
       WHERE dm.employe_id = ?
       ORDER BY dm.date_demande DESC
       LIMIT 50`,
      [employeId]
    );

    res.json(demandes);
  } catch (error) {
    console.error('Erreur récupération demandes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ================================================================
// ADMIN - Récupérer toutes les demandes en attente
// ================================================================
router.get('/admin/demandes-en-attente', verifyToken, async (req, res) => {
  // Vérifier que c'est un admin ou manager
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  try {
    const demandes = await prisma.$queryRaw(
      `SELECT * FROM demandes_en_attente ORDER BY jours_attente DESC, date_demande ASC`
    );

    res.json(demandes);
  } catch (error) {
    console.error('Erreur récupération demandes admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ================================================================
// ADMIN - Approuver une demande
// ================================================================
router.post('/admin/approuver/:demandeId', verifyToken, async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  const { demandeId } = req.params;
  const { commentaire } = req.body;
  const validePar = req.user.id;

  try {
    await prisma.$executeRaw(
      'CALL sp_approuver_demande(?, ?, ?)',
      [demandeId, validePar, commentaire || null]
    );

    res.json({ success: true, message: 'Demande approuvée avec succès' });
  } catch (error) {
    console.error('Erreur approbation demande:', error);
    res.status(500).json({ error: 'Erreur lors de l\'approbation' });
  }
});

// ================================================================
// ADMIN - Rejeter une demande
// ================================================================
router.post('/admin/rejeter/:demandeId', verifyToken, async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  const { demandeId } = req.params;
  const { commentaire } = req.body;
  const validePar = req.user.id;

  if (!commentaire) {
    return res.status(400).json({ error: 'Un commentaire est requis pour rejeter une demande' });
  }

  try {
    await prisma.$executeRaw(
      'CALL sp_rejeter_demande(?, ?, ?)',
      [demandeId, validePar, commentaire]
    );

    res.json({ success: true, message: 'Demande rejetée' });
  } catch (error) {
    console.error('Erreur rejet demande:', error);
    res.status(500).json({ error: 'Erreur lors du rejet' });
  }
});

// ================================================================
// ADMIN - Dashboard modifications récentes
// ================================================================
router.get('/admin/modifications-recentes', verifyToken, async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  const limit = parseInt(req.query.limit) || 100;

  try {
    const modifications = await prisma.$queryRaw(
      `SELECT * FROM modifications_recentes LIMIT ?`,
      [limit]
    );

    res.json(modifications);
  } catch (error) {
    console.error('Erreur récupération modifications récentes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ================================================================
// ADMIN - Historique complet d'un employé
// ================================================================
router.get('/admin/historique-employe/:employeId', verifyToken, async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  const { employeId } = req.params;

  try {
    // Historique des modifications directes
    const historique = await prisma.$queryRaw(
      `SELECT 'direct' as type, id, champ_modifie, ancienne_valeur, nouvelle_valeur, 
              date_modification as date, NULL as statut, NULL as validateur
       FROM historique_modifications
       WHERE employe_id = ?
       UNION ALL
       SELECT 'demande' as type, dm.id, dm.champ_modifie, dm.ancienne_valeur, dm.nouvelle_valeur,
              dm.date_demande as date, dm.statut,
              CONCAT(e.prenom, ' ', e.nom) as validateur
       FROM demandes_modification dm
       LEFT JOIN employes e ON dm.valide_par = e.id
       WHERE dm.employe_id = ?
       ORDER BY date DESC`,
      [employeId, employeId]
    );

    res.json(historique);
  } catch (error) {
    console.error('Erreur récupération historique employé:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ================================================================
// STATISTIQUES - Pour le dashboard admin
// ================================================================
router.get('/admin/statistiques', verifyToken, async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  try {
    const stats = await prisma.$queryRaw(`
      SELECT 
        (SELECT COUNT(*) FROM demandes_modification WHERE statut = 'en_attente') as demandes_en_attente,
        (SELECT COUNT(*) FROM demandes_modification WHERE statut = 'approuve' AND DATE(date_traitement) = CURDATE()) as approuvees_aujourdhui,
        (SELECT COUNT(*) FROM demandes_modification WHERE statut = 'rejete' AND DATE(date_traitement) = CURDATE()) as rejetees_aujourdhui,
        (SELECT COUNT(*) FROM historique_modifications WHERE DATE(date_modification) = CURDATE()) as modifications_directes_aujourdhui,
        (SELECT COUNT(DISTINCT employe_id) FROM demandes_modification WHERE statut = 'en_attente') as employes_en_attente
    `);

    res.json(stats[0]);
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ================================================================
// BATCH UPDATE - Modifier plusieurs champs directs en une requête
// ================================================================
router.put('/batch-update', verifyToken, async (req, res) => {
  const { modifications } = req.body; // { telephone: 'xxx', adresse: 'yyy' }
  const employeId = req.user.id;
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'];

  if (!modifications || Object.keys(modifications).length === 0) {
    return res.status(400).json({ error: 'Aucune modification fournie' });
  }

  try {
    // Liste des champs autorisés en modification directe
    const champsDirects = ['telephone', 'adresse'];
    
    // Vérifier que tous les champs sont modifiables directement
    const champsNonAutorisés = Object.keys(modifications).filter(
      champ => !champsDirects.includes(champ)
    );

    if (champsNonAutorisés.length > 0) {
      return res.status(403).json({ 
        error: `Champs non modifiables directement: ${champsNonAutorisés.join(', ')}` 
      });
    }

    // Récupérer l'utilisateur actuel
    const user = await prisma.user.findUnique({
      where: { id: employeId },
      select: { telephone: true, adresse: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Préparer les données de mise à jour
    const updateData = {};
    if (modifications.telephone !== undefined) {
      updateData.telephone = modifications.telephone;
    }
    if (modifications.adresse !== undefined) {
      updateData.adresse = modifications.adresse;
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: employeId },
      data: updateData
    });

    console.log('✅ Utilisateur mis à jour:', updatedUser.id, 'Champs:', Object.keys(updateData));

    // Enregistrer dans l'historique
    for (const [champ, nouvelleValeur] of Object.entries(modifications)) {
      const ancienneValeur = user[champ];
      
      try {
        await prisma.$executeRaw`
          INSERT INTO historique_modifications 
          (employe_id, champ_modifie, ancienne_valeur, nouvelle_valeur, adresse_ip, user_agent)
          VALUES (${employeId}, ${champ}, ${ancienneValeur || ''}, ${nouvelleValeur || ''}, ${clientIp || ''}, ${userAgent || ''})
        `;
        console.log(`✅ Historique enregistré pour ${champ}`);
      } catch (histErr) {
        console.log('⚠️  Historique non enregistré pour', champ, ':', histErr.message);
      }
    }

    res.json({ 
      success: true, 
      message: `${Object.keys(modifications).length} modification(s) enregistrée(s) avec succès`,
      modifications_appliquees: Object.keys(modifications)
    });
  } catch (error) {
    console.error('❌ Erreur batch update:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors des modifications',
      details: error.message 
    });
  }
});

// ================================================================
// BATCH DEMANDES - Créer plusieurs demandes en une requête
// ================================================================
router.post('/batch-demandes', verifyToken, async (req, res) => {
  const { demandes, motif } = req.body; // demandes: [{ champ, nouvelle_valeur, ancienne_valeur }]
  const employeId = req.user.id;
  const clientIp = getClientIp(req);

  if (!demandes || demandes.length === 0) {
    return res.status(400).json({ error: 'Aucune demande fournie' });
  }

  try {
    // Vérifier que tous les champs nécessitent une validation
    const champs = demandes.map(d => d.champ);
    const champsValidation = await prisma.$queryRaw(
      `SELECT nom_champ, type_modification 
       FROM champs_modifiables_config 
       WHERE nom_champ IN (${champs.map(() => '?').join(',')}) 
       AND actif = TRUE`,
      ...champs
    );

    const champsNonAutorisés = champs.filter(
      champ => !champsValidation.find(c => c.nom_champ === champ && c.type_modification === 'validation')
    );

    if (champsNonAutorisés.length > 0) {
      return res.status(403).json({ 
        error: `Champs ne nécessitant pas de validation: ${champsNonAutorisés.join(', ')}` 
      });
    }

    // Vérifier qu'il n'y a pas de demandes en attente pour ces champs
    const demandesExistantes = await prisma.$queryRaw(
      `SELECT champ_modifie 
       FROM demandes_modification 
       WHERE employe_id = ? 
       AND champ_modifie IN (${champs.map(() => '?').join(',')}) 
       AND statut = 'en_attente'`,
      [employeId, ...champs]
    );

    if (demandesExistantes.length > 0) {
      return res.status(409).json({ 
        error: `Demandes déjà en attente pour: ${demandesExistantes.map(d => d.champ_modifie).join(', ')}` 
      });
    }

    // Créer toutes les demandes en transaction
    const demandeIds = [];
    
    await prisma.$transaction(async (tx) => {
      for (const demande of demandes) {
        const result = await tx.$executeRaw(
          `INSERT INTO demandes_modification 
           (employe_id, champ_modifie, ancienne_valeur, nouvelle_valeur, motif, adresse_ip)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [employeId, demande.champ, demande.ancienne_valeur, demande.nouvelle_valeur, motif, clientIp]
        );
        
        demandeIds.push(result);
      }
    });

    res.status(201).json({ 
      success: true, 
      message: `${demandes.length} demande(s) envoyée(s) pour validation administrative`,
      demandes_creees: demandes.length,
      champs: champs
    });
  } catch (error) {
    console.error('Erreur batch demandes:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi des demandes' });
  }
});

module.exports = router;


