const nodemailer = require('nodemailer');

// Configuration du transporteur email - Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  // Debug temporaire pour diagnostiquer l'auth
  logger: true,
  debug: true
});

// Petite aide: délai asynchrone
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Envoi avec retry automatique si Brevo renvoie un rate limit d'auth (403)
async function sendWithRetry(mailOptions, { retries = 2, waitMs = 65000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (err) {
      lastError = err;
      const isRateLimited = (err.responseCode === 403) || (typeof err.response === 'string' && err.response.includes('rate limited'));
      if (isRateLimited && attempt < retries) {
        console.warn(`⏳ SMTP rate limited (403). Nouvelle tentative dans ${Math.round(waitMs/1000)}s... [essai ${attempt + 1}/${retries}]`);
        await delay(waitMs);
        continue;
      }
      break;
    }
  }
  throw lastError;
}

// Template email professionnel pour nouvel employé
const envoyerEmailAccueil = async (employeData, motDePasseTemporaire) => {
  const { email, nom, prenom, categorie } = employeData;
  
  // Informations de contact support
  const supportPhone = '07 58 87 54 64';
  const supportEmail = 'moussaouiyamine1@gmail.com';
  const restaurantName = 'Chez Antoine';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  const htmlContent = `
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
                  
                  <!-- Catégorie -->
                  ${categorie ? `
                  <div style="margin-bottom: 20px;">
                    <p style="color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">Poste</p>
                    <span style="display: inline-block; background: #f5f5f5; color: #333333; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; border: 1px solid #e0e0e0;">${categorie}</span>
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
                          <code style="display: inline-block; background: #cf292c; color: #ffffff; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 14px; font-weight: 600; letter-spacing: 1px; margin-top: 4px;">${motDePasseTemporaire}</code>
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
                    <a href="${frontendUrl}/login" style="display: inline-block; background: #cf292c; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 13px;">
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
  `;

  const mailOptions = {
    from: `"${restaurantName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: email,
    subject: `Bienvenue chez ${restaurantName} - Vos identifiants`,
    html: htmlContent
  };

  try {
    await sendWithRetry(mailOptions);
    console.log(`✅ Email de bienvenue envoyé avec succès à ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
};

// 📧 FONCTION RÉCUPÉRATION DE MOT DE PASSE
const envoyerEmailRecuperation = async (email, nom, prenom, resetUrl) => {
  const restaurantName = 'Chez Antoine';
  const supportPhone = '07 58 87 54 64';
  const supportEmail = 'moussaouiyamine1@gmail.com';
  
  console.log('📧 EMAIL RÉCUPÉRATION DEBUG:');
  console.log('- destinataire:', email);
  console.log('- nom:', nom, prenom);
  console.log('- resetUrl:', resetUrl);
  
  // 🧪 MODE TEST - Simuler l'envoi d'email
  if (process.env.EMAIL_PASSWORD === 'test-mode-disabled' || !process.env.EMAIL_PASSWORD || process.env.EMAIL_PASSWORD === 'votre-mot-de-passe-application') {
    console.log('🧪 MODE TEST ACTIVÉ - Email de récupération simulé');
    console.log('='.repeat(80));
    console.log('📧 EMAIL DE RÉCUPÉRATION SIMULÉ');
    console.log('👤 DESTINATAIRE:', `${prenom} ${nom} (${email})`);
    console.log('🔗 LIEN DE RÉCUPÉRATION:', resetUrl);
    console.log('⏰ VALIDITÉ: 24 heures');
    console.log('📄 CONTENU HTML GÉNÉRÉ ✅');
    console.log('='.repeat(80));
    
    // Simuler un délai d'envoi
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      message: 'Email de récupération simulé avec succès (mode test)',
      testMode: true
    };
  }
  
  // Template HTML sobre pour l'email de récupération
  const htmlContent = `
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
  `;

  const mailOptions = {
    from: `"${restaurantName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: email,
    subject: `Récupération de mot de passe - ${restaurantName}`,
    html: htmlContent
  };

  try {
    await sendWithRetry(mailOptions);
    console.log(`✅ Email de récupération envoyé à ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email récupération:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  envoyerEmailAccueil,
  envoyerEmailRecuperation
};
