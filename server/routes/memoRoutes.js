// routes/memoRoutes.js
const express = require('express');
const router = express.Router();
const { envoyerRappelMemo } = require('../utils/emailService');

/**
 * POST /memo/send-reminder
 * Envoie un rappel par email pour une tâche mémo
 * Body: { email, task }
 */
router.post('/send-reminder', async (req, res) => {
  try {
    const { email, task } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email requis' });
    }
    
    if (!task || !task.text) {
      return res.status(400).json({ success: false, error: 'Tâche invalide' });
    }
    
    console.log(`📧 Envoi rappel mémo à ${email}:`, task.text.substring(0, 50));
    
    const result = await envoyerRappelMemo(email, task);
    
    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Erreur envoi rappel:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
