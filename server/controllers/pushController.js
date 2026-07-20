// server/controllers/pushController.js
const pushService = require('../services/pushService');

// GET /api/push/vapid-public-key  (public)
const getVapidPublicKey = (req, res) => {
  const key = pushService.getPublicKey();
  if (!key) {
    return res.status(503).json({ success: false, message: 'Web Push non configuré sur le serveur' });
  }
  res.json({ success: true, publicKey: key });
};

// POST /api/push/subscribe  (auth)
const subscribe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subscription } = req.body;
    if (!subscription) {
      return res.status(400).json({ success: false, message: 'Abonnement manquant' });
    }
    await pushService.saveSubscription(userId, subscription, req.headers['user-agent']);
    res.json({ success: true });
  } catch (err) {
    console.error('[PUSH] subscribe error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/push/unsubscribe  (auth)
const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    await pushService.removeSubscription(endpoint);
    res.json({ success: true });
  } catch (err) {
    console.error('[PUSH] unsubscribe error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/push/test  (auth) — envoie une notif de test à soi-même
const sendTest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pushService.sendToUser(userId, {
      title: '🔔 Test de notification',
      body: 'Si tu vois ce message, les rappels de pointage fonctionnent !',
      url: '/pointage',
      tag: 'test-push',
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[PUSH] test error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getVapidPublicKey, subscribe, unsubscribe, sendTest };
