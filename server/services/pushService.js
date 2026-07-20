// server/services/pushService.js
/**
 * Service Web Push (notifications natives, app fermée).
 * Utilise les clés VAPID définies dans .env :
 *   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
 */

const webpush = require('web-push');
const prisma = require('../prisma/client');

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@chez-antoine.fr';

let configured = false;

if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
} else {
  console.warn('[PUSH] Clés VAPID manquantes → Web Push désactivé (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');
}

function isConfigured() {
  return configured;
}

function getPublicKey() {
  return PUBLIC_KEY || null;
}

/**
 * Enregistre/actualise un abonnement push pour un utilisateur.
 * @param {number} userId
 * @param {{endpoint:string, keys:{p256dh:string, auth:string}}} subscription
 * @param {string} [userAgent]
 */
async function saveSubscription(userId, subscription, userAgent) {
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    throw new Error('Abonnement push invalide');
  }
  const { endpoint, keys } = subscription;
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent || null },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent || null },
  });
}

/**
 * Supprime un abonnement (par endpoint).
 */
async function removeSubscription(endpoint) {
  if (!endpoint) return;
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

/**
 * Envoie une notification push à tous les appareils d'un utilisateur.
 * Nettoie automatiquement les abonnements expirés (404/410).
 * @param {number} userId
 * @param {{title:string, body:string, url?:string, tag?:string, data?:object}} payload
 * @returns {Promise<{sent:number, removed:number}>}
 */
async function sendToUser(userId, payload) {
  if (!configured) return { sent: 0, removed: 0 };

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return { sent: 0, removed: 0 };

  const body = JSON.stringify({
    title: payload.title || 'Chez Antoine',
    body: payload.body || '',
    url: payload.url || '/pointage',
    tag: payload.tag,
    data: payload.data || {},
  });

  let sent = 0;
  let removed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(pushSub, body);
        sent++;
      } catch (err) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          // Abonnement expiré / révoqué → on le supprime
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
          removed++;
        } else {
          console.error('[PUSH] Échec envoi:', status || err?.message);
        }
      }
    })
  );

  return { sent, removed };
}

/**
 * Envoie une notification push à tous les administrateurs/managers.
 * @param {{title:string, body:string, url?:string, tag?:string, data?:object}} payload
 * @returns {Promise<{sent:number, removed:number}>}
 */
async function sendToAdmins(payload) {
  if (!configured) return { sent: 0, removed: 0 };

  const admins = await prisma.user.findMany({
    where: { role: { in: ['admin', 'manager'] } },
    select: { id: true },
  });

  let sent = 0;
  let removed = 0;
  for (const admin of admins) {
    const result = await sendToUser(admin.id, payload);
    sent += result.sent;
    removed += result.removed;
  }
  return { sent, removed };
}

module.exports = {
  isConfigured,
  getPublicKey,
  saveSubscription,
  removeSubscription,
  sendToUser,
  sendToAdmins,
};
