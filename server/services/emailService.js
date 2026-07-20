const { sendMailWithRetry } = require('../utils/emailService');

// Petite aide: délai asynchrone
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Fonction d'envoi universelle — utilise Brevo/Resend/SMTP via sendMailWithRetry
async function sendEmail({ to, subject, html, from }) {
  const restaurantName = 'Chez Antoine';
  const fromEmail = from || process.env.EMAIL_FROM || process.env.EMAIL_USER;
  
  try {
    const mailOptions = {
      from: `"${restaurantName}" <${fromEmail}>`,
      to: to,
      subject: subject,
      html: html
    };
    
    const info = await sendMailWithRetry(mailOptions);
    console.log(`✅ Email envoyé à ${to}, ID: ${info.messageId}`);
    return { success: true, provider: 'auto', id: info.messageId };
  } catch (lastError) {
    console.error(`❌ ALERTE: Email définitivement échoué vers ${to}`);
    console.error(`   Sujet: ${subject}`);
    console.error(`   Erreur: ${lastError?.message}`);
    
    // Créer une notification admin pour l'échec d'email
    try {
      const prisma = require('../prisma/client');
      const admins = await prisma.user.findMany({
        where: { role: 'admin', statut: 'actif' },
        select: { id: true }
      });
      
      if (admins.length > 0) {
        await prisma.notifications.createMany({
          data: admins.map(admin => ({
            employe_id: admin.id,
            type: 'erreur_email',
            titre: '⚠️ Échec envoi email',
            message: JSON.stringify({
              text: `L'envoi d'email à ${to} a échoué. Sujet: "${subject}". Erreur: ${lastError?.message}`,
              destinataire: to,
              sujet: subject,
              erreur: lastError?.message,
              date: new Date().toISOString()
            }),
            lue: false
          }))
        });
      }
    } catch (notifErr) {
      console.error('❌ Impossible de notifier les admins:', notifErr.message);
    }
    
    throw lastError;
  }
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
  
  // 🧪 MODE TEST - Simuler l'envoi d'email
  if (process.env.EMAIL_PASSWORD === 'test-mode-disabled' || !process.env.EMAIL_PASSWORD || process.env.EMAIL_PASSWORD === 'votre-mot-de-passe-application') {
    
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
    return { success: true, provider: result.provider };
  } catch (error) {
    console.error('❌ Erreur envoi email récupération:', error);
    return { success: false, error: error.message };
  }
};

// Template email pour nouvelle demande de congé (envoyé aux admins)
const envoyerEmailNouvelleDemandeConge = async (adminEmail, demandeData) => {
  const { employeNom, type, dateDebut, dateFin, nbJours, motif, congeId } = demandeData;
  
  const restaurantName = 'Chez Antoine';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const urlGestion = `${frontendUrl}/conges`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nouvelle demande de congé</title>
      <!--[if mso]>
      <style type="text/css">
        table { border-collapse: collapse; }
        .button { padding: 16px 32px !important; }
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      
      <!-- Wrapper -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 32px 16px;">
            
            <!-- Container - max 560px pour lisibilité -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td style="background-color: #cf292c; padding: 32px 24px; text-align: center;">
                  <p style="color: rgba(255,255,255,0.9); font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0; font-weight: 500;">${restaurantName}</p>
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">
                    Nouvelle demande de congé
                  </h1>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 32px 24px;">
                  
                  <p style="color: #333333; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
                    <strong>${employeNom}</strong> a soumis une demande de congé.
                  </p>
                  
                  <!-- Détails -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fafafa; border-radius: 6px; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 20px;">
                        
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td style="padding-bottom: 12px; border-bottom: 1px solid #eee;">
                              <p style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">Type</p>
                              <p style="color: #222; font-size: 15px; font-weight: 600; margin: 0;">${type}</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                              <p style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">Période</p>
                              <p style="color: #222; font-size: 15px; font-weight: 600; margin: 0;">${dateDebut} au ${dateFin}</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top: 12px;">
                              <p style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">Durée</p>
                              <p style="color: #222; font-size: 15px; font-weight: 600; margin: 0;">${nbJours} jour${nbJours > 1 ? 's' : ''}</p>
                            </td>
                          </tr>
                        </table>
                        
                        ${motif ? `
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                          <tr>
                            <td>
                              <p style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">Motif</p>
                              <p style="color: #555; font-size: 14px; margin: 0; line-height: 1.5;">${motif}</p>
                            </td>
                          </tr>
                        </table>
                        ` : ''}
                        
                      </td>
                    </tr>
                  </table>
                  
                  <!-- CTA -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center">
                        <a href="${urlGestion}" style="display: inline-block; background-color: #cf292c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                          Voir la demande
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 24px; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 12px; margin: 0; text-align: center; line-height: 1.5;">
                    ${restaurantName} · Gestion RH
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
    to: adminEmail,
    subject: `Demande de congé - ${employeNom}`,
    html: htmlContent
  };

  try {
    const result = await sendEmail(mailOptions);
    return { success: true, provider: result.provider };
  } catch (error) {
    console.error('❌ Erreur envoi email nouvelle demande:', error);
    return { success: false, error: error.message };
  }
};

// Template email rappel congés non traités > 48h
const envoyerEmailRappelConges = async (adminEmail, congesEnAttente) => {
  const restaurantName = 'Chez Antoine';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const urlGestion = `${frontendUrl}/conges`;

  // Générer les lignes pour chaque demande
  const congesRows = congesEnAttente.map(c => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <p style="margin: 0 0 4px 0;">
          <strong style="color: #222; font-size: 14px;">${c.employeNom}</strong>
          <span style="color: #888; font-size: 13px;"> · ${c.type}</span>
        </p>
        <p style="margin: 0; color: #666; font-size: 13px;">
          ${c.dateDebut} au ${c.dateFin}
          <span style="color: #cf292c; font-weight: 500; margin-left: 8px;">${c.joursAttente}j d'attente</span>
        </p>
      </td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rappel - Demandes en attente</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      
      <!-- Wrapper -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" style="padding: 32px 16px;">
            
            <!-- Container -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td style="background-color: #b91c1c; padding: 32px 24px; text-align: center;">
                  <p style="color: rgba(255,255,255,0.9); font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0; font-weight: 500;">${restaurantName}</p>
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">
                    ${congesEnAttente.length} demande${congesEnAttente.length > 1 ? 's' : ''} en attente
                  </h1>
                  <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">
                    depuis plus de 48h
                  </p>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 24px;">
                  
                  <!-- Alerte -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fef2f2; border-left: 3px solid #cf292c; margin-bottom: 20px;">
                    <tr>
                      <td style="padding: 12px 16px;">
                        <p style="color: #991b1b; font-size: 13px; margin: 0; line-height: 1.5;">
                          Ces demandes nécessitent votre attention.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Liste -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fafafa; border-radius: 6px;">
                    <tr>
                      <td style="padding: 16px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                          ${congesRows}
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- CTA -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 24px;">
                    <tr>
                      <td align="center">
                        <a href="${urlGestion}" style="display: inline-block; background-color: #cf292c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                          Traiter les demandes
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 16px 24px; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                    Rappel automatique · ${restaurantName}
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
    to: adminEmail,
    subject: `Rappel : ${congesEnAttente.length} demande${congesEnAttente.length > 1 ? 's' : ''} de congé en attente`,
    html: htmlContent
  };

  try {
    const result = await sendEmail(mailOptions);
    return { success: true, provider: result.provider };
  } catch (error) {
    console.error('❌ Erreur envoi email rappel congés:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  envoyerEmailAccueil,
  envoyerEmailRecuperation,
  envoyerEmailNouvelleDemandeConge,
  envoyerEmailRappelConges
};
