// utils/emailService.js
const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// Cache pour limiter les envois d'emails répétés
const emailSendCache = new Map();

// Durée minimale entre deux envois au même destinataire (en millisecondes)
const EMAIL_THROTTLE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Vérifie si un email peut être envoyé (pas de limitation en cours)
 */
const canSendEmail = (email, type) => {
  const key = `${email}:${type}`;
  const lastSentTime = emailSendCache.get(key);
  if (!lastSentTime) return true;
  return (Date.now() - lastSentTime) > EMAIL_THROTTLE_DURATION;
};

/**
 * Enregistre l'envoi d'un email dans le cache
 */
const recordEmailSent = (email, type) => {
  const key = `${email}:${type}`;
  emailSendCache.set(key, Date.now());
  setTimeout(() => emailSendCache.delete(key), 60 * 60 * 1000);
};

// ============================================================
// METHODE 1: Brevo (HTTP API - fonctionne sur Render/Vercel)
// ============================================================
const sendViaBrevo = async (mailOptions) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY non configurée');
  }
  
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'moussaouiyamine1@gmail.com';
  const fromName = 'Chez Antoine';
  
  console.log(`📧 Envoi via Brevo (HTTP API)...`);
  console.log(`📧 From: ${fromName} <${fromEmail}>`);
  console.log(`📧 To: ${mailOptions.to}`);
  
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: mailOptions.to }],
      subject: mailOptions.subject,
      htmlContent: mailOptions.html,
    }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ Brevo erreur:', JSON.stringify(data));
    throw new Error(`Brevo: ${data.message || JSON.stringify(data)}`);
  }
  
  console.log(`✅ Email envoyé via Brevo, ID: ${data.messageId}`);
  return { messageId: data.messageId };
};

// ============================================================
// METHODE 2: Resend (HTTP API - si domaine vérifié)
// ============================================================
const sendViaResend = async (mailOptions) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY non configurée');
  }
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM || 'Chez Antoine <onboarding@resend.dev>';
  
  console.log(`📧 Envoi via Resend (HTTP API)...`);
  console.log(`📧 From: ${fromEmail}`);
  console.log(`📧 To: ${mailOptions.to}`);
  
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: [mailOptions.to],
    subject: mailOptions.subject,
    html: mailOptions.html,
  });
  
  if (error) {
    console.error('❌ Resend erreur:', JSON.stringify(error));
    throw new Error(`Resend: ${error.message || JSON.stringify(error)}`);
  }
  
  console.log(`✅ Email envoyé via Resend, ID: ${data.id}`);
  return { messageId: data.id };
};

// ============================================================
// METHODE 3: Gmail SMTP (dev local uniquement)
// ============================================================
const createTransporter = (forcePort = null) => {
  const port = forcePort || 587;
  const isSecure = port === 465;
  
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port,
    secure: isSecure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
};

const sendViaSMTP = async (mailOptions) => {
  for (const port of [587, 465]) {
    try {
      console.log(`📧 SMTP tentative port ${port}...`);
      const transporter = createTransporter(port);
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email envoyé via SMTP port ${port}, ID: ${info.messageId}`);
      return info;
    } catch (err) {
      console.error(`❌ SMTP port ${port} échoué: ${err.code} - ${err.message}`);
    }
  }
  throw new Error('SMTP: ports 587 et 465 bloqués (ETIMEDOUT)');
};

// ============================================================
// ENVOI UNIFIÉ: Brevo → Resend → SMTP
// ============================================================
const sendMailWithRetry = async (mailOptions) => {
  // Priorité 1: Brevo (HTTP API - pas de domaine requis)
  if (process.env.BREVO_API_KEY) {
    try {
      return await sendViaBrevo(mailOptions);
    } catch (brevoErr) {
      console.error(`❌ Brevo échoué: ${brevoErr.message}`);
    }
  }
  
  // Priorité 2: Resend (HTTP API - nécessite domaine vérifié pour destinataires externes)
  if (process.env.RESEND_API_KEY) {
    try {
      return await sendViaResend(mailOptions);
    } catch (resendErr) {
      console.error(`❌ Resend échoué: ${resendErr.message}`);
    }
  }
  
  // Priorité 3: Gmail SMTP (dev local)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    try {
      return await sendViaSMTP(mailOptions);
    } catch (smtpErr) {
      console.error(`❌ SMTP échoué: ${smtpErr.message}`);
    }
  }
  
  throw new Error('Aucun service email disponible. Configurez BREVO_API_KEY (recommandé) ou RESEND_API_KEY ou EMAIL_USER/EMAIL_PASSWORD.');
};

// Envoi email de récupération de mot de passe
const envoyerEmailRecuperation = async (email, nom, prenom, resetUrl) => {
  const restaurantName = 'Chez Antoine';
  const supportPhone = '07 58 87 54 64';
  const supportEmail = 'moussaouiyamine1@gmail.com';
  
  try {
    // Vérifier la limitation d'envoi d'emails
    if (!canSendEmail(email, 'recuperation')) {
      console.log(`🔒 Limitation d'envoi: Email de récupération à ${email} déjà envoyé récemment`);
      return { 
        success: false, 
        error: "Email déjà envoyé récemment. Veuillez attendre quelques minutes avant de réessayer.",
        code: "THROTTLED"
      };
    }
    
    const mailOptions = {
      from: `"${restaurantName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: `Récupération de mot de passe - ${restaurantName}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Récupération de mot de passe</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" width="500" cellspacing="0" cellpadding="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #cf292c; padding: 28px 32px;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">
                        ${restaurantName}
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Contenu -->
                  <tr>
                    <td style="padding: 32px;">
                      <h2 style="color: #333333; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                        Bonjour ${prenom},
                      </h2>
                      
                      <p style="color: #555555; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
                        Vous avez demandé la réinitialisation de votre mot de passe.
                      </p>
                      
                      <!-- Bouton -->
                      <div style="text-align: center; margin: 28px 0;">
                        <a href="${resetUrl}" style="display: inline-block; background: #cf292c; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 14px;">
                          Réinitialiser le mot de passe
                        </a>
                      </div>
                      
                      <!-- Alerte -->
                      <div style="background: #fff8e6; border-radius: 4px; padding: 14px; margin: 20px 0; border-left: 3px solid #f5a623;">
                        <p style="color: #8a6d3b; margin: 0; font-size: 12px; line-height: 1.5;">
                          <strong>Important :</strong><br>
                          - Ce lien est valide pendant 24 heures<br>
                          - Il ne peut être utilisé qu'une seule fois<br>
                          - Si vous n'avez pas fait cette demande, ignorez cet email
                        </p>
                      </div>
                      
                      <!-- Lien alternatif -->
                      <p style="color: #888888; font-size: 11px; margin: 20px 0 0 0;">
                        Si le bouton ne fonctionne pas, copiez ce lien :<br>
                        <a href="${resetUrl}" style="color: #cf292c; word-break: break-all;">${resetUrl}</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Support -->
                  <tr>
                    <td style="background-color: #fafafa; padding: 16px 32px; border-top: 1px solid #e0e0e0;">
                      <p style="color: #888888; font-size: 11px; margin: 0 0 4px 0;">Besoin d'aide ?</p>
                      <p style="color: #555555; font-size: 12px; margin: 0;">
                        <a href="tel:${supportPhone.replace(/\s/g, '')}" style="color: #cf292c; text-decoration: none;">${supportPhone}</a>
                        &nbsp;·&nbsp;
                        <a href="mailto:${supportEmail}" style="color: #cf292c; text-decoration: none;">${supportEmail}</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 12px 32px; text-align: center; border-top: 1px solid #e0e0e0;">
                      <p style="color: #aaaaaa; font-size: 10px; margin: 0;">
                        © ${new Date().getFullYear()} ${restaurantName}
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const info = await sendMailWithRetry(mailOptions);
    console.log('✅ Email de récupération envoyé:', info.messageId);
    
    // Enregistrer l'envoi dans le cache pour la limitation
    recordEmailSent(email, 'recuperation');
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envoie les identifiants à un employé par email
 * @param {string} email - Email de l'employé
 * @param {string} nom - Nom de l'employé
 * @param {string} prenom - Prénom de l'employé
 * @param {string} motDePasse - Mot de passe temporaire
 * @param {string[]} categories - Liste des catégories de l'employé
 * @returns {Promise<object>} Résultat de l'opération
 */
const envoyerIdentifiants = async (email, nom, prenom, motDePasse, categories = []) => {
  // Informations de contact support
  const supportPhone = '07 58 87 54 64';
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || 'support@lefournilchezantoine.fr';
  const restaurantName = 'Chez Antoine';
  
  // Formater les catégories pour l'affichage
  const categoriesDisplay = categories.length > 0 
    ? categories.join(' • ') 
    : 'Membre de l\'équipe';
  try {
    // Vérifier la limitation d'envoi d'emails
    if (!canSendEmail(email, 'identifiants')) {
      console.log(`🔒 Limitation d'envoi: Email d'identifiants à ${email} déjà envoyé récemment`);
      return { 
        success: false, 
        error: "Email déjà envoyé récemment. Veuillez attendre quelques minutes avant de réessayer.",
        code: "THROTTLED"
      };
    }
    
    console.log(`📧 Préparation de l'email pour ${email}...`);
    console.log(`📋 Catégories: ${categoriesDisplay}`);
    
    const mailOptions = {
      from: `"${restaurantName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: `Bienvenue chez ${restaurantName} - Vos identifiants`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenue</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" width="500" cellspacing="0" cellpadding="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
                  
                  <!-- Header avec couleur de la charte -->
                  <tr>
                    <td style="background-color: #cf292c; padding: 28px 32px;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">
                        ${restaurantName}
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Contenu -->
                  <tr>
                    <td style="padding: 32px;">
                      <h2 style="color: #333333; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
                        Bienvenue ${prenom},
                      </h2>
                      
                      <p style="color: #555555; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
                        Votre compte a été créé. Voici vos identifiants de connexion.
                      </p>
                      
                      <!-- Catégories -->
                      ${categories.length > 0 ? `
                      <div style="margin-bottom: 20px;">
                        <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">Poste${categories.length > 1 ? 's' : ''}</p>
                        <div>
                          ${categories.map(cat => `<span style="display: inline-block; background: #f5f5f5; color: #333333; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; margin-right: 4px; margin-bottom: 4px; border: 1px solid #e0e0e0;">${cat}</span>`).join('')}
                        </div>
                      </div>
                      ` : ''}
                      
                      <!-- Identifiants -->
                      <div style="background: #fafafa; border-radius: 6px; padding: 20px; margin: 20px 0; border: 1px solid #e0e0e0;">
                        <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">Identifiants de connexion</p>
                        
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                              <span style="color: #888888; font-size: 11px;">Email</span><br>
                              <span style="color: #333333; font-size: 14px; font-weight: 500;">${email}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #888888; font-size: 11px;">Mot de passe temporaire</span><br>
                              <code style="display: inline-block; background: #cf292c; color: #ffffff; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 14px; font-weight: 600; letter-spacing: 1px; margin-top: 4px;">${motDePasse}</code>
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      <!-- Alerte -->
                      <div style="background: #fff8e6; border-radius: 4px; padding: 12px; margin: 20px 0; border-left: 3px solid #f5a623;">
                        <p style="color: #8a6d3b; margin: 0; font-size: 12px; line-height: 1.4;">
                          <strong>Important :</strong> Modifiez ce mot de passe lors de votre première connexion.
                        </p>
                      </div>
                      
                      <!-- Bouton -->
                      <div style="text-align: center; margin: 24px 0 20px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="display: inline-block; background: #cf292c; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 13px;">
                          Se connecter
                        </a>
                      </div>
                      
                      <!-- Étapes -->
                      <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 8px;">
                        <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">Étapes</p>
                        <p style="color: #555555; font-size: 12px; margin: 4px 0;">1. Connectez-vous</p>
                        <p style="color: #555555; font-size: 12px; margin: 4px 0;">2. Changez votre mot de passe</p>
                        <p style="color: #555555; font-size: 12px; margin: 4px 0;">3. Consultez votre planning</p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Support -->
                  <tr>
                    <td style="background-color: #fafafa; padding: 16px 32px; border-top: 1px solid #e0e0e0;">
                      <p style="color: #888888; font-size: 11px; margin: 0 0 4px 0;">Besoin d'aide ?</p>
                      <p style="color: #555555; font-size: 12px; margin: 0;">
                        <a href="tel:${supportPhone.replace(/\s/g, '')}" style="color: #cf292c; text-decoration: none;">${supportPhone}</a>
                        &nbsp;·&nbsp;
                        <a href="mailto:${supportEmail}" style="color: #cf292c; text-decoration: none;">${supportEmail}</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 12px 32px; text-align: center; border-top: 1px solid #e0e0e0;">
                      <p style="color: #aaaaaa; font-size: 10px; margin: 0;">
                        © ${new Date().getFullYear()} ${restaurantName}
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    
    console.log(`📬 Envoi de l'email via Gmail/SMTP...`);
    
    const info = await sendMailWithRetry(mailOptions);
    console.log(`✅ Email d'identifiants envoyé à ${email}, Message ID: ${info.messageId}`);
    
    // Enregistrer l'envoi dans le cache pour la limitation
    recordEmailSent(email, 'identifiants');
    
    // Informations supplémentaires pour le débogage
    if (process.env.NODE_ENV !== 'production' && info.messageUrl) {
      console.log(`📨 URL de prévisualisation: ${info.messageUrl}`);
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi d'email d'identifiants à ${email}:`, error);
    
    // Informations supplémentaires pour le débogage
    if (error.code === 'EAUTH') {
      console.error('Problème d\'authentification avec le serveur SMTP. Vérifiez vos identifiants EMAIL_USER et EMAIL_PASSWORD.');
    } else if (error.code === 'ESOCKET') {
      console.error('Problème de connexion au serveur SMTP. Vérifiez votre configuration réseau ou les paramètres du serveur.');
    } else if (error.code === 'EENVELOPE') {
      console.error('Problème avec l\'adresse email destinataire. Vérifiez que l\'adresse est valide.');
    }
    
    return { 
      success: false, 
      error: error.message,
      code: error.code || 'UNKNOWN'
    };
  }
};

// Test de la configuration email
const testerConfigurationEmail = async () => {
  if (process.env.BREVO_API_KEY) {
    console.log('✅ Configuration Brevo (HTTP API) détectée');
    return true;
  }
  if (process.env.RESEND_API_KEY) {
    console.log('✅ Configuration Resend (HTTP API) détectée');
    return true;
  }
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Configuration SMTP valide');
    return true;
  } catch (error) {
    console.error('❌ Configuration email invalide:', error.message);
    return false;
  }
};

/**
 * Envoie un email de rappel pour une tâche mémo
 * @param {string} email - Email du destinataire
 * @param {object} task - Tâche à rappeler
 * @returns {Promise<object>} Résultat de l'opération
 */
const envoyerRappelMemo = async (email, task) => {
  const restaurantName = 'Chez Antoine';
  
  try {
    // Pas de limitation pour les rappels
    console.log(`⏳ Envoi rappel mémo à ${email}...`);
    
    // Couleurs selon priorité
    const priorityColors = {
      high: { bg: '#FEE2E2', border: '#EF4444', text: '#B91C1C', label: '🔴 URGENT' },
      normal: { bg: '#FEF3C7', border: '#F59E0B', text: '#B45309', label: '🟡 Normal' },
      low: { bg: '#DBEAFE', border: '#3B82F6', text: '#1D4ED8', label: '🔵 Faible' }
    };
    const priority = priorityColors[task.priority] || priorityColors.normal;
    
    // Format date échéance
    const dueDateStr = task.dueDate 
      ? new Date(task.dueDate).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    
    // Emojis catégories
    const categoryEmojis = {
      'general': '📋', 'Général': '📋',
      'urgent': '🔥', 'Urgent': '🔥',
      'stocks': '📦', 'Stocks': '📦',
      'rh': '👥', 'RH': '👥',
      'fournisseur': '🚚', 'Fournisseur': '🚚',
      'service': '🍽️', 'Service': '🍽️',
      'admin': '📁', 'Admin': '📁',
      'email': '✉️', 'Email': '✉️'
    };
    const categoryEmoji = categoryEmojis[task.category] || '📋';
    
    const mailOptions = {
      from: `"${restaurantName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: `⏰ Rappel: ${task.text.substring(0, 50)}${task.text.length > 50 ? '...' : ''}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rappel Mémo</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fef2f2;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 20px auto;">
            <!-- Header avec logo et couleur charte -->
            <tr>
              <td style="background: linear-gradient(135deg, #cf292c 0%, #e63946 100%); padding: 24px 28px; border-radius: 16px 16px 0 0;">
                <table width="100%">
                  <tr>
                    <td style="vertical-align: middle;">
                      <div style="font-size: 28px; margin-bottom: 6px;">⏰</div>
                      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">Rappel Mémo Manager</h1>
                      <p style="color: rgba(255,255,255,0.75); margin: 4px 0 0 0; font-size: 12px;">
                        ${new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' })} à ${new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td style="text-align: right; vertical-align: top;">
                      <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 12px;">
                        <span style="color: white; font-size: 11px; font-weight: 600;">🍽️ ${restaurantName}</span>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Corps du message -->
            <tr>
              <td style="background: white; padding: 28px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 12px rgba(207,41,44,0.15);">
                
                <!-- Badge priorité + catégorie -->
                <div style="margin-bottom: 18px;">
                  <span style="background: ${priority.bg}; color: ${priority.text}; padding: 5px 12px; border-radius: 16px; font-size: 11px; font-weight: 600; border: 1px solid ${priority.border}; display: inline-block;">
                    ${priority.label}
                  </span>
                  ${task.category ? `
                  <span style="background: #f1f5f9; color: #475569; padding: 5px 12px; border-radius: 16px; font-size: 11px; font-weight: 500; margin-left: 6px; display: inline-block;">
                    ${categoryEmoji} ${task.category}
                  </span>
                  ` : ''}
                </div>
                
                <!-- Contenu de la tâche -->
                <div style="background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%); border-left: 4px solid #cf292c; padding: 18px 20px; border-radius: 0 12px 12px 0; margin-bottom: 20px;">
                  <p style="margin: 0; color: #1e293b; font-size: 15px; line-height: 1.6; font-weight: 500;">
                    ${task.text}
                  </p>
                </div>
                
                ${dueDateStr ? `
                <!-- Date d'échéance -->
                <table width="100%" style="margin-bottom: 16px;">
                  <tr>
                    <td style="background: #fffbeb; border-radius: 10px; padding: 12px 16px;">
                      <span style="color: #b45309; font-size: 12px; font-weight: 500;">
                        📅 Échéance : <strong>${dueDateStr}</strong>
                      </span>
                    </td>
                  </tr>
                </table>
                ` : ''}
                
                <!-- Séparateur -->
                <div style="border-top: 1px dashed #e2e8f0; margin: 20px 0;"></div>
                
                <!-- Footer -->
                <div style="text-align: center;">
                  <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.5;">
                    📬 Ce rappel a été envoyé automatiquement<br>
                    depuis votre <strong style="color: #cf292c;">Mémo Manager</strong>
                  </p>
                </div>
              </td>
            </tr>
            
            <!-- Pied de page -->
            <tr>
              <td style="padding: 16px; text-align: center;">
                <p style="color: #9ca3af; font-size: 10px; margin: 0;">
                  ${restaurantName} • Gestion RH
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const info = await sendMailWithRetry(mailOptions);
    console.log('✅ Email de rappel envoyé:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi rappel:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  envoyerEmailRecuperation,
  envoyerIdentifiants,
  testerConfigurationEmail,
  envoyerRappelMemo
};
