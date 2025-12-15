// utils/emailService.js
const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// Resend client (API HTTP - fonctionne sur Render free tier)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Cache pour limiter les envois d'emails répétés
const emailSendCache = new Map();

// Durée minimale entre deux envois au même destinataire (en millisecondes)
const EMAIL_THROTTLE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Vérifie si un email peut être envoyé (pas de limitation en cours)
 * @param {string} email - Adresse email du destinataire
 * @param {string} type - Type d'email (identifiants, recuperation, etc.)
 * @returns {boolean} True si l'email peut être envoyé, false sinon
 */
const canSendEmail = (email, type) => {
  const key = `${email}:${type}`;
  const lastSentTime = emailSendCache.get(key);
  
  if (!lastSentTime) return true;
  
  const timeSinceLastEmail = Date.now() - lastSentTime;
  return timeSinceLastEmail > EMAIL_THROTTLE_DURATION;
};

/**
 * Enregistre l'envoi d'un email dans le cache
 * @param {string} email - Adresse email du destinataire
 * @param {string} type - Type d'email (identifiants, recuperation, etc.)
 */
const recordEmailSent = (email, type) => {
  const key = `${email}:${type}`;
  emailSendCache.set(key, Date.now());
  
  // Nettoyage des entrées anciennes (plus de 1 heure)
  setTimeout(() => {
    if (emailSendCache.has(key)) {
      emailSendCache.delete(key);
    }
  }, 60 * 60 * 1000); // 1 heure
};

// Configuration email (à adapter selon votre provider)
const createTransporter = () => {
  // Option 1: Gmail (nécessite App Password)
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // App Password, pas le mot de passe normal
      }
    });
  }
  
  // Option 2: SMTP personnalisé
  if (process.env.EMAIL_SERVICE === 'smtp') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  // Option 3: Service test (Ethereal - pour développement)
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal.pass'
    }
  });
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
    
    const transporter = createTransporter();
    
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

    const info = await transporter.sendMail(mailOptions);
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
  const supportEmail = 'moussaouiyamine1@gmail.com';
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
    
    console.log(`⏳ Création du transporteur d'email...`);
    const transporter = createTransporter();
    
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
                        <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/login" style="display: inline-block; background: #cf292c; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 13px;">
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

    
    console.log(`📬 Envoi de l'email...`);
    
    // Priorité 1: Resend (API HTTP - fonctionne sur Render)
    if (resend) {
      console.log('📧 Envoi via Resend...');
      try {
        const { data, error } = await resend.emails.send({
          from: `${restaurantName} <onboarding@resend.dev>`,
          to: [email],
          subject: mailOptions.subject,
          html: mailOptions.html
        });
        
        if (error) {
          console.error('❌ Erreur Resend:', error);
          throw new Error(error.message);
        }
        
        console.log(`✅ Email envoyé via Resend à ${email}, ID: ${data?.id}`);
        recordEmailSent(email, 'identifiants');
        return { success: true, messageId: data?.id, provider: 'resend' };
      } catch (resendError) {
        console.error('❌ Erreur Resend, fallback Gmail:', resendError.message);
        // Continue vers Gmail fallback
      }
    }
    
    // Priorité 2: Gmail/SMTP (fallback)
    console.log('📧 Envoi via Gmail/SMTP...');
    const info = await transporter.sendMail(mailOptions);
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
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Configuration email valide');
    return true;
  } catch (error) {
    console.error('❌ Configuration email invalide:', error);
    return false;
  }
};

module.exports = {
  envoyerEmailRecuperation,
  envoyerIdentifiants,
  testerConfigurationEmail
};
