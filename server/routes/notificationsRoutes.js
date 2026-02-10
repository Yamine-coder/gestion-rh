const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { addClient } = require('../services/sseManager');

/**
 * POST /api/notifications/sse-token
 * Génère un token SSE éphémère (2 min) pour éviter d'exposer le JWT principal en query string
 */
router.post('/sse-token', authMiddleware, (req, res) => {
  const employeId = req.user.userId || req.user.id;
  const sseToken = jwt.sign(
    { userId: employeId, purpose: 'sse' },
    process.env.JWT_SECRET,
    { expiresIn: '2m' }
  );
  res.json({ token: sseToken });
});

/**
 * GET /api/notifications/stream
 * Endpoint SSE pour les notifications temps réel
 * 🔒 Utilise un token SSE éphémère (2 min) au lieu du JWT principal
 */
router.get('/stream', (req, res) => {
  // Auth via token SSE éphémère en query string (EventSource ne supporte pas les headers)
  const token = req.query.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }

  const employeId = user.userId || user.id;

  // Headers SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Désactive le buffering nginx/proxy
  });

  // Heartbeat pour maintenir la connexion
  res.write(`event: connected\ndata: ${JSON.stringify({ employeId })}\n\n`);
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Enregistrer le client
  addClient(employeId, res);

  // Nettoyage à la déconnexion
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

/**
 * GET /api/notifications
 * Récupérer toutes les notifications de l'employé connecté
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const employeId = req.userId;

    const notifications = await prisma.notifications.findMany({
      where: { employe_id: employeId },
      orderBy: { date_creation: 'desc' },
      take: 50 // Limiter aux 50 dernières
    });

    res.json(notifications);
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/notifications/non-lues
 * Récupérer le nombre de notifications non lues
 */
router.get('/non-lues', authMiddleware, async (req, res) => {
  try {
    const employeId = req.userId;

    const count = await prisma.notifications.count({
      where: { 
        employe_id: employeId,
        lue: false
      }
    });

    res.json({ count });
  } catch (error) {
    console.error('Erreur comptage notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/notifications/:id/marquer-lue
 * Marquer une notification comme lue
 */
router.put('/:id/marquer-lue', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const employeId = req.userId;

    // Vérifier que la notification appartient à l'employé
    const notification = await prisma.notifications.findFirst({
      where: { 
        id: parseInt(id),
        employe_id: employeId 
      }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    const updated = await prisma.notifications.update({
      where: { id: parseInt(id) },
      data: { 
        lue: true,
        date_lecture: new Date()
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Erreur marquage notification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/notifications/marquer-toutes-lues
 * Marquer toutes les notifications comme lues
 */
router.put('/marquer-toutes-lues', authMiddleware, async (req, res) => {
  try {
    const employeId = req.userId;

    const result = await prisma.notifications.updateMany({
      where: { 
        employe_id: employeId,
        lue: false
      },
      data: { 
        lue: true,
        date_lecture: new Date()
      }
    });

    res.json({ 
      message: 'Toutes les notifications ont été marquées comme lues',
      count: result.count 
    });
  } catch (error) {
    console.error('Erreur marquage toutes notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Supprimer une notification
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const employeId = req.userId;

    // Vérifier que la notification appartient à l'employé
    const notification = await prisma.notifications.findFirst({
      where: { 
        id: parseInt(id),
        employe_id: employeId 
      }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    await prisma.notifications.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Notification supprimée' });
  } catch (error) {
    console.error('Erreur suppression notification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
