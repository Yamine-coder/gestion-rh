const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validerMotDePasse } = require('../utils/passwordUtils');
const { recordLoginAttempt } = require('../middlewares/rateLimitMiddleware');
const { envoyerEmailRecuperation } = require('../utils/emailService');
const crypto = require('crypto');

// 🔐 SIGNUP : création de compte
const signup = async (req, res) => {
  const { email, password, role, prenom, nom } = req.body;

  try {
    // Normaliser l'email en minuscules (standard de sécurité)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Vérifie si un compte existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }

    // 🔒 Validation du mot de passe
    const erreurMdp = validerMotDePasse(password);
    if (erreurMdp) {
      return res.status(400).json({ error: erreurMdp });
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔒 SÉCURITÉ: Forcer le rôle à 'employee' — seul un admin peut promouvoir
    // L'escalade de rôle via req.body est bloquée
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role: 'employee',
        prenom,
        nom
      },
    });

    // Génération du token avec `userId` (cohérent avec login)
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({ token, role: newUser.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
};

// 🔐 LOGIN : connexion avec rate limiting et onboarding
const login = async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  try {
    // Normaliser l'email en minuscules (standard de sécurité)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Récupérer l'utilisateur avec les champs nécessaires
    const user = await prisma.user.findUnique({ 
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        prenom: true,
        nom: true,
        firstLoginDone: true,
        statut: true
      }
    });

    if (!user) {
      recordLoginAttempt(ip, false);
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // Vérifier le statut du compte
    if (user.statut !== 'actif') {
      recordLoginAttempt(ip, false);
      return res.status(403).json({ message: "Compte suspendu. Contactez votre manager." });
    }

    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      recordLoginAttempt(ip, false);
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // Succès - effacer les tentatives échouées
    recordLoginAttempt(ip, true);

    // ✅ Génération du token avec `userId`
    // Mise à jour lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({ 
      token, 
      userId: user.id,
      role: user.role,
      prenom: user.prenom,
      nom: user.nom,
      firstLogin: !user.firstLoginDone // Indique si c'est la première connexion
    });
  } catch (error) {
    console.error("Erreur lors du login :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 🔄 ONBOARDING : Changement du mot de passe lors de la première connexion
const completerOnboarding = async (req, res) => {
  const { nouveauMotDePasse } = req.body;
  const userId = req.userId; // Vient du middleware d'auth

  try {
    // Validation du mot de passe
    const validation = validerMotDePasse(nouveauMotDePasse);
    if (!validation.valide) {
      return res.status(400).json({ error: validation.erreur });
    }

    // Vérifier que l'utilisateur n'a pas encore complété l'onboarding
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstLoginDone: true, email: true }
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    if (user.firstLoginDone) {
      return res.status(400).json({ error: "Onboarding déjà complété" });
    }

    // Hash du nouveau mot de passe
    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);

    // Mise à jour en base
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        firstLoginDone: true,
        codeActivation: null // Effacer l'ancien code si existant
      }
    });

    res.status(200).json({ 
      message: "Mot de passe mis à jour avec succès",
      onboardingComplete: true
    });

  } catch (error) {
    console.error("Erreur onboarding :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// 📧 DEMANDE DE RÉCUPÉRATION : Génère un token et envoie email
const demandeRecuperation = async (req, res) => {
  const { email } = req.body;

  try {
    // Normaliser l'email en minuscules (standard de sécurité)
    const normalizedEmail = email.toLowerCase().trim();
    
    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, prenom: true, nom: true }
    });

    // Même si l'utilisateur n'existe pas, on retourne toujours success
    // pour ne pas révéler quels emails sont dans la base
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'Si cet email existe, un lien de récupération a été envoyé.' 
      });
    }

    // Générer un token unique
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Sauvegarder en base
    await prisma.passwordReset.create({
      data: {
        email: normalizedEmail,
        token: resetToken,
        expiresAt,
        userId: user.id
      }
    });

    // Construire l'URL de reset
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Envoyer l'email
    const emailResult = await envoyerEmailRecuperation(
      email, 
      user.nom, 
      user.prenom, 
      resetUrl
    );

    if (!emailResult.success) {
      console.error('❌ Erreur envoi email:', emailResult.error);
      return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
    }

    res.json({ 
      success: true, 
      message: 'Un lien de récupération a été envoyé à votre email.' 
    });

  } catch (error) {
    console.error('❌ Erreur demande récupération:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// 🔑 RESET AVEC TOKEN : Valide le token et change le mot de passe
const resetAvecToken = async (req, res) => {
  const { token, nouveauMotDePasse } = req.body;

  try {
    // Validation du nouveau mot de passe
    const validation = validerMotDePasse(nouveauMotDePasse);
    if (!validation.valide) {
      return res.status(400).json({ error: validation.erreur });
    }

    // Vérifier le token
    const resetRequest = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetRequest || resetRequest.used) {
      return res.status(400).json({ error: 'Token invalide ou déjà utilisé' });
    }

    if (new Date() > resetRequest.expiresAt) {
      return res.status(400).json({ error: 'Token expiré' });
    }

    // Hash du nouveau mot de passe
    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);

    // Mettre à jour le mot de passe et marquer le token comme utilisé
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRequest.userId },
        data: { 
          password: hashedPassword,
          firstLoginDone: true, // Pas d'onboarding après reset
          lastLoginAt: new Date()
        }
      }),
      prisma.passwordReset.update({
        where: { token },
        data: { used: true }
      })
    ]);

    res.json({ 
      success: true, 
      message: 'Mot de passe réinitialisé avec succès' 
    });

  } catch (error) {
    console.error('❌ Erreur reset token:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};


module.exports = { signup, login, completerOnboarding, demandeRecuperation, resetAvecToken };
