/**
 * 📧 Service d'alertes Email pour les avis négatifs
 * 
 * Envoie un email immédiatement quand un avis ≤3⭐ est détecté
 * Inclut : l'avis, une suggestion de réponse IA, lien pour répondre
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { generateAIResponse, isAIConfigured } = require('./avisResponseGeneratorService');

// Chemin du fichier de configuration
const CONFIG_PATH = path.join(__dirname, '../config/avisAlertConfig.json');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Cache des avis déjà alertés (pour éviter les doublons)
let alertedReviews = new Set();

/**
 * Charge la configuration des alertes
 */
function loadAlertConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Erreur lecture config alertes:', err.message);
  }
  // Config par défaut
  return {
    enabled: true,
    recipients: [],
    alertThreshold: 3,
    sendDailyReport: true,
    dailyReportTime: '09:00'
  };
}

/**
 * Sauvegarde la configuration des alertes
 */
function saveAlertConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error('Erreur sauvegarde config alertes:', err.message);
    return false;
  }
}

/**
 * Récupère la configuration actuelle
 */
function getAlertConfig() {
  return loadAlertConfig();
}

/**
 * Met à jour la configuration
 */
function updateAlertConfig(updates) {
  const config = loadAlertConfig();
  const newConfig = { ...config, ...updates };
  saveAlertConfig(newConfig);
  return newConfig;
}

/**
 * Ajoute un destinataire
 */
function addRecipient(email, name = '') {
  const config = loadAlertConfig();
  if (!config.recipients.find(r => r.email === email)) {
    config.recipients.push({ email, name, active: true });
    saveAlertConfig(config);
  }
  return config;
}

/**
 * Supprime un destinataire
 */
function removeRecipient(email) {
  const config = loadAlertConfig();
  config.recipients = config.recipients.filter(r => r.email !== email);
  saveAlertConfig(config);
  return config;
}

/**
 * Active/désactive un destinataire
 */
function toggleRecipient(email, active) {
  const config = loadAlertConfig();
  const recipient = config.recipients.find(r => r.email === email);
  if (recipient) {
    recipient.active = active;
    saveAlertConfig(config);
  }
  return config;
}

/**
 * Vérifie et envoie les alertes pour les nouveaux avis négatifs
 * @param {Array} reviews - Liste des avis
 * @param {Object} restaurant - Infos du restaurant
 */
async function checkAndAlertNegativeReviews(reviews, restaurant) {
  const negativeReviews = reviews.filter(r => 
    r.rating <= 3 && 
    !alertedReviews.has(r.time) &&
    (Date.now() - r.time) < 48 * 60 * 60 * 1000 // Moins de 48h
  );

  for (const review of negativeReviews) {
    try {
      await sendNegativeReviewAlert(review, restaurant);
      alertedReviews.add(review.time);
    } catch (error) {
      console.error('Erreur envoi alerte:', error.message);
    }
  }

  // Nettoyer le cache des vieux avis (> 7 jours)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  alertedReviews = new Set([...alertedReviews].filter(time => time > oneWeekAgo));

  return negativeReviews.length;
}

/**
 * Envoie un email d'alerte pour un avis négatif
 */
async function sendNegativeReviewAlert(review, restaurant) {
  const recipients = getAlertRecipients();
  if (!recipients.length) {
    return;
  }

  // Générer une suggestion de réponse via IA si disponible
  let suggestedResponse = '';
  if (isAIConfigured()) {
    try {
      suggestedResponse = await generateAIResponse(review);
      suggestedResponse = suggestedResponse?.replace(/^"|"$/g, '') || '';
    } catch (e) {
    }
  }

  const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  
  // Configuration urgence selon la note
  const urgencyConfig = {
    1: { text: 'CRITIQUE', alertBg: '#fef2f2', alertBorder: '#dc2626' },
    2: { text: 'URGENT', alertBg: '#fff7ed', alertBorder: '#ea580c' },
    3: { text: 'À TRAITER', alertBg: '#fefce8', alertBorder: '#ca8a04' }
  };
  const urgency = urgencyConfig[review.rating] || urgencyConfig[3];
  
  // URLs - Utiliser le Place ID pour un lien stable
  const placeId = process.env.GOOGLE_PLACE_ID || 'ChIJnYLnmZly5kcRgpLV4MN4Rus';
  const googleMapsUrl = `https://search.google.com/local/reviews?placeid=${placeId}`;
  const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  // Infos contact
  const supportPhone = '01 41 74 10 71';
  const restaurantName = 'Chez Antoine';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerte Avis Google</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" width="500" cellspacing="0" cellpadding="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #cf292c; padding: 28px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">
                      🍕 ${restaurantName}
                    </h1>
                  </td>
                  <td style="text-align: right;">
                    <span style="background: rgba(255,255,255,0.2); color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                      ⚠️ ${urgency.text}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Contenu -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #333333; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                Nouvel avis négatif sur Google
              </h2>
              
              <p style="color: #555555; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0;">
                Un client a laissé un avis ${review.rating} étoile${review.rating > 1 ? 's' : ''}. Répondez rapidement pour montrer votre professionnalisme.
              </p>
              
              <!-- Carte Avis -->
              <div style="background: ${urgency.alertBg}; border-radius: 8px; padding: 20px; border-left: 4px solid ${urgency.alertBorder}; margin-bottom: 24px;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align: top;">
                      <p style="margin: 0 0 4px 0; font-weight: 600; color: #333333; font-size: 15px;">
                        ${review.author || 'Client anonyme'}
                      </p>
                      <p style="margin: 0; color: #666666; font-size: 12px;">
                        ${review.relativeTime || 'Récemment'}
                      </p>
                    </td>
                    <td style="text-align: right; vertical-align: top;">
                      <span style="font-size: 20px;">${stars}</span>
                    </td>
                  </tr>
                </table>
                <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0; font-style: italic;">
                  "${review.text || 'Aucun commentaire'}"
                </p>
              </div>
              
              ${suggestedResponse ? `
              <!-- Suggestion IA -->
              <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; border-left: 4px solid #22c55e; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #166534; font-size: 13px;">
                  💡 Suggestion de réponse (IA)
                </p>
                <p style="color: #166534; font-size: 13px; line-height: 1.6; margin: 0;">
                  ${suggestedResponse}
                </p>
              </div>
              ` : ''}
              
              <!-- Bouton principal -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${googleMapsUrl}" style="display: inline-block; background: #cf292c; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  📍 Répondre sur Google Maps
                </a>
              </div>
              
              <!-- Stats -->
              <table width="100%" cellspacing="0" cellpadding="0" style="background: #fafafa; border-radius: 6px; margin-top: 20px;">
                <tr>
                  <td style="padding: 16px; text-align: center; border-right: 1px solid #e0e0e0; width: 33%;">
                    <p style="margin: 0; font-size: 20px; font-weight: 700; color: #333;">${restaurant?.rating || '4.3'}</p>
                    <p style="margin: 4px 0 0; font-size: 11px; color: #888;">Note actuelle</p>
                  </td>
                  <td style="padding: 16px; text-align: center; border-right: 1px solid #e0e0e0; width: 33%;">
                    <p style="margin: 0; font-size: 20px; font-weight: 700; color: #333;">${restaurant?.totalReviews || '3348'}</p>
                    <p style="margin: 4px 0 0; font-size: 11px; color: #888;">Total avis</p>
                  </td>
                  <td style="padding: 16px; text-align: center; width: 33%;">
                    <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${urgency.alertBorder};">${review.rating}⭐</p>
                    <p style="margin: 4px 0 0; font-size: 11px; color: #888;">Cet avis</p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Support -->
          <tr>
            <td style="background-color: #fafafa; padding: 16px 32px; border-top: 1px solid #e0e0e0;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="color: #888888; font-size: 11px; margin: 0 0 4px 0;">Liens rapides</p>
                    <p style="margin: 0;">
                      <a href="${dashboardUrl}/dashboard" style="color: #cf292c; text-decoration: none; font-size: 12px;">Dashboard</a>
                      <span style="color: #ccc; margin: 0 8px;">•</span>
                      <a href="https://business.google.com" style="color: #cf292c; text-decoration: none; font-size: 12px;">Google Business</a>
                    </p>
                  </td>
                  <td style="text-align: right;">
                    <a href="tel:${supportPhone.replace(/\s/g, '')}" style="color: #cf292c; text-decoration: none; font-size: 12px;">📞 ${supportPhone}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #aaaaaa; font-size: 10px; margin: 0;">
                © ${new Date().getFullYear()} ${restaurantName} • Alerte automatique
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const mailOptions = {
    from: `"${restaurantName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: recipients.join(', '),
    subject: `⚠️ Avis ${review.rating}⭐ - ${review.author || 'Client'} | ${restaurantName}`,
    html
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Récupère la liste des destinataires pour les alertes
 */
function getAlertRecipients() {
  const config = loadAlertConfig();
  
  // Si des destinataires sont configurés dans le fichier JSON
  if (config.recipients && config.recipients.length > 0) {
    return config.recipients
      .filter(r => r.active)
      .map(r => r.email);
  }
  
  // Fallback: variable d'env
  const alertEmails = process.env.AVIS_ALERT_EMAILS || process.env.EMAIL_USER;
  return alertEmails ? alertEmails.split(',').map(e => e.trim()) : [];
}

/**
 * Envoie un rapport quotidien des avis
 */
async function sendDailyReport(reviews, restaurant, analysis) {
  const recipients = getAlertRecipients();
  if (!recipients.length) return;

  const today = new Date();
  const last24h = reviews.filter(r => (Date.now() - r.time) < 24 * 60 * 60 * 1000);
  const negativeCount = last24h.filter(r => r.rating <= 3).length;
  const positiveCount = last24h.filter(r => r.rating >= 4).length;
  const avgRating = last24h.length > 0 
    ? (last24h.reduce((sum, r) => sum + r.rating, 0) / last24h.length).toFixed(1)
    : '-';

  if (last24h.length === 0) {
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 24px; text-align: center; }
    .content { padding: 24px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
    .stat { background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: 700; }
    .stat-label { font-size: 12px; color: #6b7280; }
    .positive { color: #16a34a; }
    .negative { color: #dc2626; }
    .review-list { margin: 20px 0; }
    .review-item { padding: 12px; border-bottom: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Rapport Avis - ${today.toLocaleDateString('fr-FR')}</h1>
      <p>${restaurant?.name || 'Chez Antoine'}</p>
    </div>
    <div class="content">
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${last24h.length}</div>
          <div class="stat-label">Nouveaux avis</div>
        </div>
        <div class="stat">
          <div class="stat-value positive">+${positiveCount}</div>
          <div class="stat-label">Positifs (4-5⭐)</div>
        </div>
        <div class="stat">
          <div class="stat-value negative">${negativeCount}</div>
          <div class="stat-label">Négatifs (1-3⭐)</div>
        </div>
        <div class="stat">
          <div class="stat-value">${avgRating}⭐</div>
          <div class="stat-label">Moyenne</div>
        </div>
      </div>
      
      ${negativeCount > 0 ? `
      <h3>⚠️ Avis négatifs à traiter :</h3>
      <div class="review-list">
        ${last24h.filter(r => r.rating <= 3).map(r => `
          <div class="review-item">
            <strong>${r.author}</strong> - ${'⭐'.repeat(r.rating)}<br>
            <em>${r.text?.substring(0, 150) || 'Pas de commentaire'}${r.text?.length > 150 ? '...' : ''}</em>
          </div>
        `).join('')}
      </div>
      ` : '<p style="color: #16a34a; text-align: center;">✅ Aucun avis négatif aujourd\'hui !</p>'}
    </div>
  </div>
</body>
</html>
`;

  await transporter.sendMail({
    from: `"🍕 Chez Antoine - Rapport" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: recipients.join(', '),
    subject: `📊 Rapport avis du ${today.toLocaleDateString('fr-FR')} - ${last24h.length} avis, ${negativeCount} négatif(s)`,
    html
  });

}

/**
 * Teste l'envoi d'email
 */
async function testAlertEmail() {
  const testReview = {
    author: 'Test Client',
    rating: 2,
    text: 'Ceci est un test d\'alerte email. Service lent et pizza froide.',
    time: Date.now(),
    relativeTime: 'à l\'instant'
  };

  const testRestaurant = {
    name: 'Chez Antoine Vincennes',
    rating: 4.3,
    totalReviews: 3348,
    googleUrl: 'https://www.google.com/maps'
  };

  await sendNegativeReviewAlert(testReview, testRestaurant);
  return true;
}

module.exports = {
  checkAndAlertNegativeReviews,
  sendNegativeReviewAlert,
  sendDailyReport,
  testAlertEmail,
  getAlertRecipients,
  // Config management
  getAlertConfig,
  updateAlertConfig,
  addRecipient,
  removeRecipient,
  toggleRecipient
};
