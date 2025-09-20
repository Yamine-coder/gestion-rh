const nodemailer = require('nodemailer');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  service: 'gmail', // ou autre service email
  auth: {
    user: process.env.EMAIL_USER, // votre email
    pass: process.env.EMAIL_PASSWORD  // mot de passe application Gmail
  }
});

// Template email professionnel pour nouvel employé
const envoyerEmailAccueil = async (employeData, motDePasseTemporaire) => {
  const { email, nom, prenom, categorie } = employeData;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        .container {
          max-width: 600px;
          margin: 0 auto;
          font-family: Arial, sans-serif;
          background-color: #f8f9fa;
          padding: 20px;
        }
        .header {
          background-color: #cf292c;
          color: white;
          padding: 30px 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: white;
          padding: 30px 20px;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .credentials {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #cf292c;
        }
        .button {
          display: inline-block;
          background-color: #cf292c;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          color: #666;
          font-size: 12px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Bienvenue dans l'équipe !</h1>
          <p>Votre compte employé a été créé</p>
        </div>
        
        <div class="content">
          <h2>Bonjour ${prenom} ${nom},</h2>
          
          <p>Nous sommes ravis de vous accueillir dans notre équipe en tant que <strong>${categorie}</strong> !</p>
          
          <p>Votre compte employé a été créé avec succès. Voici vos informations de connexion :</p>
          
          <div class="credentials">
            <h3>🔐 Vos identifiants de connexion :</h3>
            <p><strong>Email :</strong> ${email}</p>
            <p><strong>Mot de passe temporaire :</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${motDePasseTemporaire}</code></p>
          </div>
          
          <p><strong>⚠️ Important :</strong> Pour des raisons de sécurité, vous devrez changer ce mot de passe lors de votre première connexion.</p>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">
            🚀 Se connecter maintenant
          </a>
          
          <h3>📋 Prochaines étapes :</h3>
          <ol>
            <li>Connectez-vous avec vos identifiants</li>
            <li>Changez votre mot de passe</li>
            <li>Complétez votre profil si nécessaire</li>
            <li>Consultez votre planning et vos horaires</li>
          </ol>
          
          <p>Si vous rencontrez des difficultés, n'hésitez pas à contacter votre responsable.</p>
          
          <p>Encore une fois, bienvenue dans l'équipe ! 🎊</p>
        </div>
        
        <div class="footer">
          <p>Ce message a été envoyé automatiquement par le système de gestion RH.</p>
          <p>Merci de ne pas répondre à cet email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🎉 Bienvenue dans l\'équipe - Vos identifiants de connexion',
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé avec succès à ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
};

// 📧 FONCTION RÉCUPÉRATION DE MOT DE PASSE
const envoyerEmailRecuperation = async (email, nom, prenom, resetUrl) => {
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
  
  // Template HTML pour l'email de récupération
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; }
        .header { background-color: #cf292c; color: white; padding: 30px 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .button { display: inline-block; background-color: #cf292c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .warning { background-color: #fff3cd; color: #856404; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔑 Récupération de mot de passe</h1>
          <p>Demande de réinitialisation</p>
        </div>
        
        <div class="content">
          <h2>Bonjour ${prenom} ${nom},</h2>
          
          <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte employé.</p>
          
          <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">
              🔒 Réinitialiser mon mot de passe
            </a>
          </div>
          
          <div class="warning">
            <h3>⚠️ Important :</h3>
            <ul>
              <li>Ce lien est valide pendant <strong>24 heures</strong></li>
              <li>Il ne peut être utilisé qu'<strong>une seule fois</strong></li>
              <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
            <a href="${resetUrl}" style="color: #cf292c;">${resetUrl}</a>
          </p>
        </div>
        
        <div class="footer">
          <p>Cet email a été envoyé automatiquement, merci de ne pas répondre.</p>
          <p>© 2025 Chez Antoine - Système de gestion RH</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🔑 Récupération de votre mot de passe - Chez Antoine',
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
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
