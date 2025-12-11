const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authMiddleware } = require('../middlewares/authMiddleware');

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
