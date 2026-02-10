/**
 * ðŸ“§ Routes de configuration des notifications email
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const notifConfig = require('../services/notificationConfigService');
const { sendRemplacementDemande, sendRemplacementCandidature, sendAnomaliesRecap, sendAnomalieUrgente } = require('../services/notificationEmailService');

// Toutes les routes de configuration requiÃ¨rent admin
router.use(authMiddleware, adminMiddleware);

/**
 * GET /api/notifications/config - RÃ©cupÃ¨re toute la config
 */
router.get('/config', (req, res) => {
  try {
    const config = notifConfig.getConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/notifications/config/:type - Config d'un type spÃ©cifique
 */
router.get('/config/:type', (req, res) => {
  try {
    const config = notifConfig.getTypeConfig(req.params.type);
    if (!config) {
      return res.status(404).json({ error: 'Type non trouvÃ©' });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/notifications/config/:type - Met Ã  jour un type
 */
router.put('/config/:type', (req, res) => {
  try {
    const config = notifConfig.updateTypeConfig(req.params.type, req.body);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/notifications/config/:type/toggle - Active/dÃ©sactive un type
 */
router.patch('/config/:type/toggle', (req, res) => {
  try {
    const { enabled } = req.body;
    const config = notifConfig.toggleType(req.params.type, enabled);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/notifications/recipients/:type - Ajoute un destinataire
 */
router.post('/recipients/:type', (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }
    const config = notifConfig.addRecipient(req.params.type, email, name || '');
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/notifications/recipients/:type/:email - Supprime un destinataire
 */
router.delete('/recipients/:type/:email', (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const config = notifConfig.removeRecipient(req.params.type, email);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/notifications/recipients/:type/:email - Active/dÃ©sactive
 */
router.patch('/recipients/:type/:email', (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { active } = req.body;
    const config = notifConfig.toggleRecipient(req.params.type, email, active);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ðŸ§ª ROUTES DE TEST
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * POST /api/notifications-config/test/remplacement - Test email remplacement
 */
router.post('/test/remplacement', async (req, res) => {
  try {
    // DonnÃ©es de test
    const demande = {
      id: 999,
      motif: 'Rendez-vous mÃ©dical',
      priorite: 'urgente',
      commentaireEmploye: 'Je dois absolument m\'absenter ce jour-lÃ '
    };
    
    const employeAbsent = {
      id: 1,
      nom: 'Martin',
      prenom: 'Sophie',
      categorie: 'Service'
    };
    
    const shift = {
      id: 100,
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Dans 2 jours
      segments: [
        { start: '11:00', end: '14:30', type: 'travail' },
        { start: '18:00', end: '22:30', type: 'travail' }
      ]
    };
    
    await sendRemplacementDemande(demande, employeAbsent, shift);
    res.json({ success: true, message: 'Email de test remplacement envoyÃ© !' });
  } catch (err) {
    console.error('Erreur test remplacement:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/notifications-config/test/candidature - Test email candidature
 */
router.post('/test/candidature', async (req, res) => {
  try {
    const demande = {
      id: 999,
      shift: {
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        segments: [{ start: '11:00', end: '14:30' }]
      }
    };
    
    const candidat = {
      id: 2,
      nom: 'Dupont',
      prenom: 'Lucas'
    };
    
    const employeAbsent = {
      id: 1,
      nom: 'Martin',
      prenom: 'Sophie'
    };
    
    await sendRemplacementCandidature(demande, candidat, employeAbsent);
    res.json({ success: true, message: 'Email de test candidature envoyÃ© !' });
  } catch (err) {
    console.error('Erreur test candidature:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/notifications-config/test/anomalies-recap - Test rÃ©cap anomalies
 */
router.post('/test/anomalies-recap', async (req, res) => {
  try {
    await sendAnomaliesRecap(true); // true = mode test, ignore le filtre 24h
    res.json({ success: true, message: 'Email rÃ©cap anomalies envoyÃ© !' });
  } catch (err) {
    console.error('Erreur test anomalies:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/notifications-config/test/anomalie-urgente - Test alerte anomalie urgente
 */
router.post('/test/anomalie-urgente', async (req, res) => {
  try {
    const anomalie = {
      id: 999,
      type: 'retard_critique',
      gravite: 'haute',
      description: 'Retard de 45 min (arrivÃ©e 10:45, prÃ©vu 10:00)',
      date: new Date()
    };
    
    const employe = {
      id: 1,
      nom: 'Martin',
      prenom: 'Sophie'
    };
    
    await sendAnomalieUrgente(anomalie, employe);
    res.json({ success: true, message: 'Email alerte anomalie urgente envoyÃ© !' });
  } catch (err) {
    console.error('Erreur test anomalie urgente:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
