// utils/emailService.js
const nodemailer = require('nodemailer');

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
      from: process.env.EMAIL_FROM || '"Gestion RH" <noreply@gesrh.com>',
      to: email,
      subject: '🔐 Récupération de mot de passe - Gestion RH',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">🔐 Récupération de mot de passe</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333;">Bonjour ${prenom} ${nom},</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Nous avons reçu une demande de récupération de mot de passe pour votre compte.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #667eea; color: white; padding: 15px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                📧 Réinitialiser mon mot de passe
              </a>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>⚠️ Important :</strong><br>
                • Ce lien est valide pendant <strong>24 heures</strong><br>
                • Si vous n'avez pas demandé cette récupération, ignorez cet email<br>
                • Pour votre sécurité, vous devrez changer votre mot de passe
              </p>
            </div>
            
            <p style="color: #888; font-size: 14px;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
              <code style="background: #f1f1f1; padding: 5px;">${resetUrl}</code>
            </p>
          </div>
          
          <div style="background: #333; color: #ccc; padding: 20px; text-align: center; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Gestion RH - Système de gestion du personnel</p>
            <p>Cet email a été généré automatiquement, ne répondez pas à ce message.</p>
          </div>
        </div>
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
 * @returns {Promise<object>} Résultat de l'opération
 */
const envoyerIdentifiants = async (email, nom, prenom, motDePasse) => {
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
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Gestion RH" <noreply@gesrh.com>',
      to: email,
      subject: '👋 Bienvenue dans l\'équipe - Vos identifiants de connexion',
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenue dans l'équipe</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; background-color: #f9f9f9;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <!-- En-tête avec logo -->
            <tr>
              <td style="padding: 25px 0; text-align: center; background-color: #cf292c;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Bienvenue dans l'équipe!</h1>
              </td>
            </tr>
            
            <!-- Contenu principal -->
            <tr>
              <td style="padding: 30px 40px;">
                <p style="margin: 0 0 20px; line-height: 1.5; font-size: 16px;">Bonjour <strong>${prenom} ${nom}</strong>,</p>
                <p style="margin: 0 0 25px; line-height: 1.5; font-size: 16px;">Nous sommes ravis de vous accueillir dans notre équipe. Votre compte a été créé avec succès sur notre plateforme de gestion RH. Vous trouverez ci-dessous vos identifiants de connexion :</p>
                
                <!-- Bloc d'identifiants -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f7f7f7; border-radius: 8px; margin: 0 0 30px;">
                  <tr>
                    <td style="padding: 25px;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="padding: 8px 0;"><strong style="font-size: 15px;">Portail de connexion :</strong></td>
                          <td style="padding: 8px 0;"><a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/login" style="color: #cf292c; text-decoration: none; font-size: 15px;">${process.env.CLIENT_URL || 'http://localhost:3000'}/login</a></td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;"><strong style="font-size: 15px;">Identifiant :</strong></td>
                          <td style="padding: 8px 0;"><span style="font-size: 15px;">${email}</span></td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0;"><strong style="font-size: 15px;">Mot de passe temporaire :</strong></td>
                          <td style="padding: 8px 0;"><code style="font-family: monospace; background-color: #fffbeb; padding: 3px 8px; border: 1px solid #fef3c7; border-radius: 4px; font-size: 15px;">${motDePasse}</code></td>
                        </tr>
                      </table>
                      <p style="margin: 20px 0 0; font-size: 14px; color: #666; font-style: italic;">Important : Vous devrez changer ce mot de passe lors de votre première connexion.</p>
                    </td>
                  </tr>
                </table>
                
                <!-- Section Premiers pas -->
                <h2 style="margin: 30px 0 15px; color: #444; font-size: 20px; font-weight: 600;">Vos premiers pas</h2>
                <p style="margin: 0 0 20px; line-height: 1.5; font-size: 16px;">Voici quelques ressources pour bien démarrer :</p>
                
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 30px;">
                  <tr>
                    <td width="60" style="vertical-align: top; padding: 0 0 15px;">
                      <div style="width: 50px; height: 50px; background-color: #edf2ff; border-radius: 50%; text-align: center; line-height: 50px; font-size: 20px; color: #4263eb;">1</div>
                    </td>
                    <td style="vertical-align: top; padding: 0 0 15px;">
                      <h3 style="margin: 0 0 5px; font-size: 16px; font-weight: 600; color: #444;">Connectez-vous à votre compte</h3>
                      <p style="margin: 0; line-height: 1.5; font-size: 15px; color: #555;">Utilisez les identifiants ci-dessus pour vous connecter à notre plateforme et définir votre mot de passe permanent.</p>
                    </td>
                  </tr>
                  <tr>
                    <td width="60" style="vertical-align: top; padding: 0 0 15px;">
                      <div style="width: 50px; height: 50px; background-color: #fff3bf; border-radius: 50%; text-align: center; line-height: 50px; font-size: 20px; color: #e67700;">2</div>
                    </td>
                    <td style="vertical-align: top; padding: 0 0 15px;">
                      <h3 style="margin: 0 0 5px; font-size: 16px; font-weight: 600; color: #444;">Complétez votre profil</h3>
                      <p style="margin: 0; line-height: 1.5; font-size: 15px; color: #555;">Vérifiez et complétez les informations de votre profil pour nous aider à mieux vous connaître.</p>
                    </td>
                  </tr>
                  <tr>
                    <td width="60" style="vertical-align: top; padding: 0 0 15px;">
                      <div style="width: 50px; height: 50px; background-color: #d3f9d8; border-radius: 50%; text-align: center; line-height: 50px; font-size: 20px; color: #2b8a3e;">3</div>
                    </td>
                    <td style="vertical-align: top; padding: 0 0 15px;">
                      <h3 style="margin: 0 0 5px; font-size: 16px; font-weight: 600; color: #444;">Découvrez nos fonctionnalités</h3>
                      <p style="margin: 0; line-height: 1.5; font-size: 15px; color: #555;">Explorez le système de gestion des pointages, des congés et d'autres fonctionnalités à votre disposition.</p>
                    </td>
                  </tr>
                </table>
                
                <!-- Besoin d'aide -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #eef6ff; border-radius: 8px; margin: 30px 0;">
                  <tr>
                    <td style="padding: 20px;">
                      <h3 style="margin: 0 0 10px; font-size: 17px; color: #0a58ca;">Besoin d'aide ?</h3>
                      <p style="margin: 0 0 15px; line-height: 1.5; font-size: 15px;">Si vous avez des questions ou rencontrez des difficultés, n'hésitez pas à contacter notre équipe RH :</p>
                      <p style="margin: 0; font-size: 15px;">
                        <a href="mailto:rh@example.com" style="color: #0a58ca; text-decoration: none;">rh@example.com</a> ou au <strong>01 23 45 67 89</strong>
                      </p>
                    </td>
                  </tr>
                </table>
                
                <p style="margin: 30px 0 0; line-height: 1.5; font-size: 16px;">Nous vous souhaitons une excellente intégration,</p>
                <p style="margin: 5px 0 0; line-height: 1.5; font-size: 16px;"><strong>L'équipe RH</strong></p>
              </td>
            </tr>
            
            <!-- Pied de page -->
            <tr>
              <td style="padding: 20px; text-align: center; background-color: #f5f5f5; border-top: 1px solid #eaeaea;">
                <p style="margin: 0 0 10px; font-size: 13px; color: #777;">Ce message est généré automatiquement, merci de ne pas y répondre.</p>
                <p style="margin: 0; font-size: 13px; color: #777;">© ${new Date().getFullYear()} ${process.env.COMPANY_NAME || 'Notre Entreprise'} - Tous droits réservés</p>
              </td>
            </tr>
          </table>
          
          <!-- Espace supplémentaire en bas -->
          <table width="100%">
            <tr>
              <td style="height: 30px;"></td>
            </tr>
          </table>
        </body>
        </html>
      `
    };
    
    console.log(`📬 Envoi de l'email...`);
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
