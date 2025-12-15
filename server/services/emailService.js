const { Resend } = require('resend');

// Configuration Resend (API HTTP - pas de SMTP bloqué)
const resend = new Resend(process.env.RESEND_API_KEY);

// Fallback: Gmail via nodemailer si pas de clé Resend
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Petite aide: délai asynchrone
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Fonction d'envoi universelle - Resend (prioritaire) ou Gmail (fallback)
async function sendEmail({ to, subject, html, from }) {
  const restaurantName = 'Chez Antoine';
  const fromEmail = from || process.env.EMAIL_FROM || 'onboarding@resend.dev';
  
  // Priorité 1: Resend (API HTTP - fonctionne partout)
  if (process.env.RESEND_API_KEY) {
    console.log('📧 Envoi via Resend...');
    try {
      const { data, error } = await resend.emails.send({
        from: `${restaurantName} <${fromEmail}>`,
        to: [to],
        subject: subject,
        html: html
      });
      
      if (error) {
        console.error('❌ Erreur Resend:', error);
        throw new Error(error.message);
      }
      
      console.log('✅ Email envoyé via Resend:', data?.id);
      return { success: true, provider: 'resend', id: data?.id };
    } catch (err) {
      console.error('❌ Erreur Resend:', err.message);
      throw err;
    }
  }
  
  // Priorité 2: Gmail via nodemailer (fallback)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    console.log('📧 Envoi via Gmail...');
    try {
      await transporter.sendMail({
        from: `"${restaurantName}" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: html
      });
      console.log('✅ Email envoyé via Gmail');
      return { success: true, provider: 'gmail' };
    } catch (err) {
      console.error('❌ Erreur Gmail:', err.message);
      throw err;
    }
  }
  
  throw new Error('Aucun service email configuré (RESEND_API_KEY ou EMAIL_USER/EMAIL_PASSWORD)');
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
    <body style="margin: 0; padding: 0; background-color: #f0f0f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
      <!-- Wrapper externe pour centrer -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f0f0f0;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            
            <!-- Container principal - largeur fixe 600px pour desktop -->
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              
              <!-- Header rouge -->
              <tr>
                <td style="background-color: #cf292c; padding: 36px 48px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td>
                        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">
                          ${restaurantName}
                        </h1>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Contenu principal -->
              <tr>
                <td style="padding: 48px;">
                  
                  <!-- Salutation -->
                  <h2 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">
                    Bienvenue ${prenom},
                  </h2>
                  
                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.7; margin: 0 0 32px 0;">
                    Votre compte a été créé avec succès. Voici vos identifiants de connexion.
                  </p>
                  
                  <!-- Catégorie(s) / Poste(s) -->
                  ${categorie ? `
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 32px;">
                    <tr>
                      <td>
                        <p style="color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin: 0 0 12px 0;">Postes</p>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            ${categorie.split(',').map(cat => `
                              <td style="padding-right: 10px; padding-bottom: 8px;">
                                <span style="display: inline-block; background: #f8f8f8; color: #333333; padding: 10px 20px; border-radius: 25px; font-size: 14px; font-weight: 500; border: 1px solid #e5e5e5;">${cat.trim()}</span>
                              </td>
                            `).join('')}
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  ` : ''}
                  
                  <!-- Box Identifiants -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #f9f9f9; border-radius: 12px; margin-bottom: 32px; border: 1px solid #eeeeee;">
                    <tr>
                      <td style="padding: 28px 32px;">
                        <p style="color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin: 0 0 20px 0;">Identifiants de connexion</p>
                        
                        <!-- Email -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom: 1px solid #e5e5e5; margin-bottom: 16px; padding-bottom: 16px;">
                          <tr>
                            <td>
                              <p style="color: #888888; font-size: 12px; margin: 0 0 6px 0;">Email</p>
                              <a href="mailto:${email}" style="color: #cf292c; font-size: 17px; font-weight: 600; text-decoration: none;">${email}</a>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Mot de passe -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td>
                              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">Mot de passe temporaire</p>
                              <span style="display: inline-block; background: #cf292c; color: #ffffff; padding: 14px 24px; border-radius: 8px; font-family: 'Courier New', Courier, monospace; font-size: 18px; font-weight: 700; letter-spacing: 2px;">${motDePasseTemporaire}</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Alerte Important -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #fffbeb; border-radius: 10px; margin-bottom: 32px; border-left: 5px solid #f59e0b;">
                    <tr>
                      <td style="padding: 20px 24px;">
                        <p style="color: #92400e; margin: 0; font-size: 15px; line-height: 1.6;">
                          <strong>⚠️ Important :</strong> Modifiez ce mot de passe lors de votre première connexion pour sécuriser votre compte.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Bouton Se connecter -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 40px;">
                    <tr>
                      <td align="center">
                        <a href="${frontendUrl}/login" style="display: inline-block; background: #cf292c; color: #ffffff; padding: 18px 48px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(207, 41, 44, 0.35);">
                          Se connecter →
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Étapes -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 2px solid #f0f0f0; padding-top: 32px;">
                    <tr>
                      <td>
                        <p style="color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin: 0 0 20px 0;">Premières étapes</p>
                        
                        <!-- Étape 1 -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 14px;">
                          <tr>
                            <td width="40" valign="top">
                              <span style="display: inline-block; width: 28px; height: 28px; background: #f0f0f0; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700; color: #666;">1</span>
                            </td>
                            <td style="padding-left: 12px;">
                              <p style="color: #4a4a4a; font-size: 15px; margin: 0; line-height: 28px;">Connectez-vous avec vos identifiants</p>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Étape 2 -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 14px;">
                          <tr>
                            <td width="40" valign="top">
                              <span style="display: inline-block; width: 28px; height: 28px; background: #f0f0f0; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700; color: #666;">2</span>
                            </td>
                            <td style="padding-left: 12px;">
                              <p style="color: #4a4a4a; font-size: 15px; margin: 0; line-height: 28px;">Créez votre mot de passe personnel</p>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Étape 3 -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td width="40" valign="top">
                              <span style="display: inline-block; width: 28px; height: 28px; background: #f0f0f0; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700; color: #666;">3</span>
                            </td>
                            <td style="padding-left: 12px;">
                              <p style="color: #4a4a4a; font-size: 15px; margin: 0; line-height: 28px;">Consultez votre planning de la semaine</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                </td>
              </tr>
              
              <!-- Section Support -->
              <tr>
                <td style="background-color: #f9f9f9; padding: 28px 48px; border-top: 1px solid #eeeeee;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td>
                        <p style="color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin: 0 0 12px 0;">Besoin d'aide ?</p>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td style="padding-right: 24px;">
                              <p style="margin: 0; font-size: 15px;">
                                📞 <a href="tel:${supportPhone.replace(/\s/g, '')}" style="color: #cf292c; text-decoration: none; font-weight: 600;">${supportPhone}</a>
                              </p>
                            </td>
                            <td>
                              <p style="margin: 0; font-size: 15px;">
                                ✉️ <a href="mailto:${supportEmail}" style="color: #cf292c; text-decoration: none; font-weight: 600;">${supportEmail}</a>
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 48px; text-align: center; background: #f0f0f0;">
                  <p style="color: #999999; font-size: 13px; margin: 0;">
                    © ${new Date().getFullYear()} ${restaurantName} • Tous droits réservés
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
    to: email,
    subject: `Bienvenue chez ${restaurantName} - Vos identifiants`,
    html: htmlContent
  };

  try {
    const result = await sendEmail(mailOptions);
    console.log(`✅ Email de bienvenue envoyé avec succès à ${email}`);
    return { success: true, provider: result.provider };
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
    to: email,
    subject: `Récupération de mot de passe - ${restaurantName}`,
    html: htmlContent
  };

  try {
    const result = await sendEmail(mailOptions);
    console.log(`✅ Email de récupération envoyé à ${email}`);
    return { success: true, provider: result.provider };
  } catch (error) {
    console.error('❌ Erreur envoi email récupération:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  envoyerEmailAccueil,
  envoyerEmailRecuperation
};
