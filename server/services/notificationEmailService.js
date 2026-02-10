/**
 * 📧 Service d'envoi d'emails pour les notifications
 * Gère les emails de: remplacements, anomalies, etc.
 */

const nodemailer = require('nodemailer');
const notifConfig = require('./notificationConfigService');
const prisma = require('../prisma/client');
const { parseSegments } = require('../utils/segmentUtils');

const RESTAURANT_NAME = 'Chez Antoine';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Configuration retry
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 8000];
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Créer le transporteur Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Envoi d'email avec retry automatique et alerting admin
 */
async function sendMailWithRetry(mailOptions) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const transporter = createTransporter();
      const info = await transporter.sendMail(mailOptions);
      if (attempt > 1) {
        console.log(`✅ Email envoyé à ${mailOptions.to} après ${attempt} tentative(s)`);
      }
      return info;
    } catch (err) {
      lastError = err;
      console.error(`⚠️ Tentative ${attempt}/${MAX_RETRIES} échouée pour ${mailOptions.to}: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAYS[attempt - 1]);
      }
    }
  }
  
  // Alerter les admins via notification
  console.error(`❌ ALERTE: Email échoué vers ${mailOptions.to} après ${MAX_RETRIES} tentatives`);
  try {
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
            text: `Email échoué vers ${mailOptions.to} après ${MAX_RETRIES} tentatives. Sujet: "${mailOptions.subject}"`,
            destinataire: mailOptions.to,
            sujet: mailOptions.subject,
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

// Template de base pour tous les emails
const getEmailTemplate = (title, content, ctaText = null, ctaUrl = null) => {
  const ctaButton = ctaText && ctaUrl ? `
    <tr>
      <td align="center" style="padding: 32px 0 16px 0;">
        <a href="${ctaUrl}" style="display: inline-block; background-color: #cf292c; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
          ${ctaText}
        </a>
      </td>
    </tr>
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f0f0f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f0f0f0;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              
              <!-- Header rouge -->
              <tr>
                <td style="background-color: #cf292c; padding: 28px 40px;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">${RESTAURANT_NAME}</h1>
                </td>
              </tr>
              
              <!-- Contenu -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #1a1a1a; margin: 0 0 24px 0; font-size: 20px; font-weight: 600;">${title}</h2>
                  ${content}
                  ${ctaButton}
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f8f8; padding: 24px 40px; border-top: 1px solid #eee;">
                  <p style="color: #888; font-size: 12px; margin: 0; text-align: center;">
                    Ceci est un email automatique de ${RESTAURANT_NAME}
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
};

// Récupérer les destinataires pour un type de notification
const getRecipients = async (type) => {
  // D'abord essayer la config centralisée
  const configuredRecipients = notifConfig.getRecipients(type);
  
  if (configuredRecipients && configuredRecipients.length > 0) {
    return configuredRecipients;
  }
  
  // Fallback: récupérer les admins
  const admins = await prisma.user.findMany({
    where: { role: 'admin', statut: 'actif' },
    select: { email: true, nom: true, prenom: true }
  });
  
  return admins.map(a => ({ email: a.email, name: `${a.prenom} ${a.nom}` }));
};

// Vérifier si un type de notification est activé
const isEnabled = (type) => {
  return notifConfig.isTypeEnabled(type);
};

// ===========================================================================
// 🔄 EMAILS DE REMPLACEMENT
// ===========================================================================

/**
 * Envoyer un email lors d'une nouvelle demande de remplacement
 */
const sendRemplacementDemande = async (demande, employeAbsent, shift) => {
  if (!isEnabled('remplacements')) {
    console.log('📧 Notifications remplacements désactivées');
    return;
  }

  const recipients = await getRecipients('remplacements');
  if (!recipients.length) {
    console.log('📧 Aucun destinataire configuré pour remplacements');
    return;
  }

  const dateShift = new Date(shift.date);
  const dateFormatee = dateShift.toLocaleDateString('fr-FR', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  
  // Calcul du nombre de jours avant le shift
  const aujourdhui = new Date();
  const diffTime = dateShift.getTime() - aujourdhui.getTime();
  const diffJours = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const urgenceTexte = diffJours <= 1 ? 'DEMAIN' : diffJours <= 2 ? 'Dans 2 jours' : `Dans ${diffJours} jours`;

  // Segments du shift
  let horaires = '';
  let dureeTotal = 0;
  const segments = parseSegments(shift.segments);
  if (segments.length > 0) {
    const workSegments = segments.filter(s => s.type?.toLowerCase() !== 'pause');
    horaires = workSegments.map(s => `${s.start || s.debut} - ${s.end || s.fin}`).join(' puis ');
    
    // Calcul durée approximative
    workSegments.forEach(s => {
      const start = s.start || s.debut;
      const end = s.end || s.fin;
      if (start && end) {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        dureeTotal += (eh * 60 + em) - (sh * 60 + sm);
      }
    });
  }
  const dureeHeures = Math.floor(dureeTotal / 60);
  const dureeMinutes = dureeTotal % 60;

  // Badge priorité
  const prioriteBadge = demande.priorite === 'urgente' 
    ? '<span style="display: inline-block; background-color: #cf292c; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">URGENT</span>'
    : demande.priorite === 'haute'
    ? '<span style="display: inline-block; background-color: #f59e0b; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Haute priorité</span>'
    : '<span style="display: inline-block; background-color: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Normale</span>';

  const content = `
    <!-- Alerte urgence si proche -->
    ${diffJours <= 2 ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
      <tr>
        <td style="background-color: #fef2f2; border-left: 4px solid #cf292c; padding: 12px 16px; border-radius: 0 8px 8px 0;">
          <span style="color: #cf292c; font-weight: 600; font-size: 14px;">⚡ ${urgenceTexte.toUpperCase()} - Action rapide requise</span>
        </td>
      </tr>
    </table>
    ` : ''}

    <!-- En-tête avec avatar -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
      <tr>
        <td>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align: middle;">
                <div style="width: 48px; height: 48px; background-color: #cf292c; border-radius: 50%; display: inline-block; text-align: center; line-height: 48px; color: white; font-weight: bold; font-size: 18px;">
                  ${employeAbsent.prenom[0]}${employeAbsent.nom[0]}
                </div>
              </td>
              <td style="padding-left: 16px; vertical-align: middle;">
                <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">${employeAbsent.prenom} ${employeAbsent.nom}</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">${employeAbsent.categorie || 'Équipe'} • Demande un remplacement</p>
              </td>
            </tr>
          </table>
        </td>
        <td style="text-align: right; vertical-align: top;">
          ${prioriteBadge}
        </td>
      </tr>
    </table>

    <!-- Carte de détails -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%); border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 24px;">
          <!-- Date et horaires -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td width="50%" style="vertical-align: top; padding-right: 12px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Date du shift</p>
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${dateFormatee}</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #cf292c; font-weight: 500;">${urgenceTexte}</p>
              </td>
              <td width="50%" style="vertical-align: top; padding-left: 12px; border-left: 1px solid #e5e7eb;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Horaires</p>
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${horaires || 'À définir'}</p>
                ${dureeTotal > 0 ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #666;">${dureeHeures}h${dureeMinutes > 0 ? dureeMinutes : ''} de travail</p>` : ''}
              </td>
            </tr>
          </table>

          <!-- Séparateur -->
          <div style="border-top: 1px dashed #e5e7eb; margin: 20px 0;"></div>

          <!-- Motif -->
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px;">Motif de la demande</p>
          <p style="margin: 0; font-size: 15px; color: #4a4a4a; line-height: 1.5;">${demande.motif || 'Aucun motif spécifié'}</p>
          
          ${demande.commentaireEmploye ? `
          <div style="margin-top: 16px; padding: 12px; background-color: #f3f4f6; border-radius: 8px;">
            <p style="margin: 0; font-size: 13px; color: #666; font-style: italic;">"${demande.commentaireEmploye}"</p>
          </div>
          ` : ''}
        </td>
      </tr>
    </table>

    <!-- Info action -->
    <p style="margin: 0; font-size: 14px; color: #666; text-align: center;">
      Connectez-vous pour voir les candidats disponibles et valider un remplacement.
    </p>
  `;

  const html = getEmailTemplate(
    'Nouvelle demande de remplacement',
    content,
    'Gérer la demande',
    `${FRONTEND_URL}/admin/remplacements`
  );

  try {
    for (const recipient of recipients) {
      await sendMailWithRetry({
        from: `"${RESTAURANT_NAME}" <${process.env.EMAIL_USER}>`,
        to: recipient.email,
        subject: `${demande.priorite === 'urgente' ? '🚨 URGENT' : '🔄'} Remplacement - ${employeAbsent.prenom} ${employeAbsent.nom} (${urgenceTexte})`,
        html
      });
    }
    console.log(`✅ Email remplacement envoyé à ${recipients.length} destinataire(s)`);
  } catch (err) {
    console.error('❌ Erreur envoi email remplacement:', err.message);
  }
};

/**
 * Envoyer un email quand une candidature est reçue
 */
const sendRemplacementCandidature = async (demande, candidat, employeAbsent) => {
  if (!isEnabled('remplacements')) return;

  const recipients = await getRecipients('remplacements');
  if (!recipients.length) return;

  const dateShift = new Date(demande.shift.date);
  const dateFormatee = dateShift.toLocaleDateString('fr-FR', { 
    weekday: 'long', day: 'numeric', month: 'long' 
  });

  const content = `
    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
      <strong>${candidat.prenom} ${candidat.nom}</strong> s'est proposé pour remplacer 
      <strong>${employeAbsent.prenom} ${employeAbsent.nom}</strong> le <strong>${dateFormatee}</strong>.
    </p>
    <p style="color: #666; font-size: 14px; margin: 0;">
      Connectez-vous pour valider ou refuser cette candidature.
    </p>
  `;

  const html = getEmailTemplate(
    '👋 Nouvelle candidature de remplacement',
    content,
    'Gérer les remplacements',
    `${FRONTEND_URL}/admin/remplacements`
  );

  try {
    for (const recipient of recipients) {
      await sendMailWithRetry({
        from: `"${RESTAURANT_NAME}" <${process.env.EMAIL_USER}>`,
        to: recipient.email,
        subject: `👋 Candidature remplacement - ${candidat.prenom} ${candidat.nom}`,
        html
      });
    }
    console.log(`✅ Email candidature envoyé à ${recipients.length} destinataire(s)`);
  } catch (err) {
    console.error('❌ Erreur envoi email candidature:', err.message);
  }
};

// ===========================================================================
// ⚠️ EMAILS D'ANOMALIES
// ===========================================================================

/**
 * Envoyer un récap quotidien des anomalies
 * @param {boolean} isTest - Si true, ignore le filtre de 24h pour les tests
 */
const sendAnomaliesRecap = async (isTest = false) => {
  if (!isEnabled('anomalies')) {
    console.log('📧 Notifications anomalies désactivées');
    return;
  }

  const recipients = await getRecipients('anomalies');
  if (!recipients.length) {
    console.log('📧 Aucun destinataire configuré pour anomalies');
    return;
  }

  // Récupérer les anomalies non traitées (avec filtre 24h sauf en mode test)
  const hier = new Date();
  hier.setDate(hier.getDate() - 1);

  const whereClause = isTest 
    ? { statut: 'en_attente' } 
    : { statut: 'en_attente', createdAt: { gte: hier } };

  const anomalies = await prisma.anomalie.findMany({
    where: whereClause,
    include: {
      employe: { select: { id: true, nom: true, prenom: true } }
    },
    orderBy: [
      { gravite: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  if (!anomalies.length) {
    console.log('📧 Aucune nouvelle anomalie à signaler');
    return;
  }

  // Grouper par gravité
  const parGravite = {
    haute: anomalies.filter(a => a.gravite === 'haute'),
    moyenne: anomalies.filter(a => a.gravite === 'moyenne'),
    basse: anomalies.filter(a => a.gravite === 'basse')
  };

  const anomaliesList = anomalies.slice(0, 10).map(a => {
    const typeLabel = {
      'retard_critique': '🔴 Retard critique',
      'retard_modere': '🟠 Retard modéré',
      'depart_anticipe': '🟡 Départ anticipé',
      'absence_injustifiee': '⚫ Absence injustifiée',
      'pointage_manquant': '⚪ Pointage manquant'
    }[a.type] || a.type;

    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${a.employe?.prenom} ${a.employe?.nom}</strong><br>
          <span style="color: #666; font-size: 13px;">${typeLabel}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
          <span style="color: #888; font-size: 13px;">
            ${new Date(a.date).toLocaleDateString('fr-FR')}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const content = `
    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
      Voici le récapitulatif des anomalies de pointage détectées.
    </p>
    
    <!-- Stats -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px; background-color: #fee2e2; border-radius: 8px; text-align: center;">
          <span style="font-size: 24px; font-weight: 700; color: #dc2626;">${parGravite.haute.length}</span><br>
          <span style="font-size: 12px; color: #991b1b;">Haute gravité</span>
        </td>
        <td style="width: 12px;"></td>
        <td style="padding: 16px; background-color: #fef3c7; border-radius: 8px; text-align: center;">
          <span style="font-size: 24px; font-weight: 700; color: #d97706;">${parGravite.moyenne.length}</span><br>
          <span style="font-size: 12px; color: #92400e;">Moyenne</span>
        </td>
        <td style="width: 12px;"></td>
        <td style="padding: 16px; background-color: #dbeafe; border-radius: 8px; text-align: center;">
          <span style="font-size: 24px; font-weight: 700; color: #2563eb;">${parGravite.basse.length}</span><br>
          <span style="font-size: 12px; color: #1e40af;">Basse</span>
        </td>
      </tr>
    </table>
    
    <!-- Liste -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8f9fa; border-radius: 8px;">
      ${anomaliesList}
    </table>
    
    ${anomalies.length > 10 ? `
      <p style="color: #888; font-size: 13px; text-align: center; margin-top: 16px;">
        + ${anomalies.length - 10} autres anomalies
      </p>
    ` : ''}
  `;

  const html = getEmailTemplate(
    `⚠️ ${anomalies.length} anomalie(s) en attente`,
    content,
    'Traiter les anomalies',
    `${FRONTEND_URL}/admin/anomalies`
  );

  try {
    for (const recipient of recipients) {
      await sendMailWithRetry({
        from: `"${RESTAURANT_NAME}" <${process.env.EMAIL_USER}>`,
        to: recipient.email,
        subject: `⚠️ [${RESTAURANT_NAME}] ${anomalies.length} anomalie(s) de pointage`,
        html
      });
    }
    console.log(`✅ Récap anomalies envoyé à ${recipients.length} destinataire(s)`);
  } catch (err) {
    console.error('❌ Erreur envoi récap anomalies:', err.message);
  }
};

/**
 * Envoyer une alerte immédiate pour anomalie grave
 */
const sendAnomalieUrgente = async (anomalie, employe) => {
  if (!isEnabled('anomalies')) return;
  if (anomalie.gravite !== 'haute') return; // Seulement les graves

  const recipients = await getRecipients('anomalies');
  if (!recipients.length) return;

  const typeLabel = {
    'retard_critique': 'Retard critique',
    'absence_injustifiee': 'Absence injustifiée',
    'pointage_manquant': 'Pointage manquant'
  }[anomalie.type] || anomalie.type;

  const content = `
    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
      Une anomalie de <strong style="color: #dc2626;">haute gravité</strong> a été détectée.
    </p>
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #1a1a1a;">
            ${employe.prenom} ${employe.nom}
          </p>
          <p style="margin: 0 0 8px 0; color: #666;">
            <strong>Type:</strong> ${typeLabel}
          </p>
          <p style="margin: 0; color: #666;">
            <strong>Détails:</strong> ${anomalie.description || 'Non spécifié'}
          </p>
        </td>
      </tr>
    </table>
  `;

  const html = getEmailTemplate(
    '🚨 Anomalie urgente détectée',
    content,
    'Traiter maintenant',
    `${FRONTEND_URL}/admin/anomalies`
  );

  try {
    for (const recipient of recipients) {
      await sendMailWithRetry({
        from: `"${RESTAURANT_NAME}" <${process.env.EMAIL_USER}>`,
        to: recipient.email,
        subject: `🚨 URGENT - Anomalie ${employe.prenom} ${employe.nom}`,
        html
      });
    }
    console.log(`✅ Alerte anomalie urgente envoyée`);
  } catch (err) {
    console.error('❌ Erreur envoi alerte anomalie:', err.message);
  }
};

module.exports = {
  // Remplacements
  sendRemplacementDemande,
  sendRemplacementCandidature,
  // Anomalies  
  sendAnomaliesRecap,
  sendAnomalieUrgente,
  // Utils
  getRecipients,
  isEnabled
};
