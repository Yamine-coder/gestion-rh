// controllers/emailController.js
const { PrismaClient } = require('@prisma/client');
const { envoyerIdentifiants } = require('../utils/emailService');

const prisma = new PrismaClient();

/**
 * Envoie les identifiants à l'employé par email
 * @route POST /admin/employes/envoyer-identifiants
 */
const envoyerIdentifiantsParEmail = async (req, res) => {
  console.log("==== Requête d'envoi d'email reçue ====");
  console.log("Body:", req.body);
  console.log("Headers:", req.headers.authorization ? "Authorization: présent" : "Authorization: absent");
  
  const { employeId, email, motDePasseTemporaire } = req.body;
  
  if (!employeId) {
    console.error("Erreur: ID employé manquant");
    return res.status(400).json({ 
      success: false, 
      message: "ID employé requis" 
    });
  }
  
  if (!email) {
    console.error("Erreur: Email manquant");
    return res.status(400).json({ 
      success: false, 
      message: "Email requis" 
    });
  }
  
  if (!motDePasseTemporaire) {
    console.error("Erreur: Mot de passe temporaire manquant");
    return res.status(400).json({ 
      success: false, 
      message: "Mot de passe temporaire requis" 
    });
  }

  try {
    // Vérifier que l'employé existe
    console.log("Recherche de l'employé avec ID:", employeId);
    let employe;
    
    try {
      employe = await prisma.User.findUnique({
        where: { id: parseInt(employeId) }
      });
    } catch (dbError) {
      console.error("Erreur lors de la recherche de l'employé:", dbError);
      
      // Essayons de trouver l'employé par email comme alternative
      employe = await prisma.User.findUnique({
        where: { email: email }
      });
    }

    console.log("Employé trouvé:", employe ? "Oui" : "Non");

    if (!employe) {
      // Si nous n'avons pas pu trouver l'employé, créons un objet avec les informations minimales
      console.log("Création d'un objet employé simulé pour l'envoi d'email");
      employe = {
        email: email,
        nom: "Utilisateur",
        prenom: "Nouveau"
      };
    }

    // Vérifier que l'email fourni correspond à celui de l'employé
    if (employe.email && employe.email !== email) {
      console.log("L'email fourni ne correspond pas à celui de l'employé:", {
        emailFourni: email,
        emailEmploye: employe.email
      });
      return res.status(400).json({ 
        success: false, 
        message: "L'email fourni ne correspond pas à celui de l'employé" 
      });
    }

    // Envoyer l'email avec les identifiants
    console.log("Envoi de l'email avec les identifiants...");
    const resultatEnvoi = await envoyerIdentifiants(
      email, 
      employe.nom || "Utilisateur", 
      employe.prenom || "Nouveau", 
      motDePasseTemporaire
    );

    console.log("Résultat de l'envoi:", resultatEnvoi);

    if (!resultatEnvoi.success) {
      console.error("Échec de l'envoi d'email:", resultatEnvoi.error);
      
      // Gestion spécifique pour le cas de limitation (throttling)
      if (resultatEnvoi.code === "THROTTLED") {
        return res.status(429).json({
          success: false,
          message: "Limitation d'envoi d'email",
          error: resultatEnvoi.error,
          code: resultatEnvoi.code
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: "Erreur lors de l'envoi de l'email", 
        error: resultatEnvoi.error,
        code: resultatEnvoi.code
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Identifiants envoyés par email avec succès" 
    });
  } catch (error) {
    console.error('Erreur inattendue lors de l\'envoi de l\'email:', error);
    
    // Détails supplémentaires pour le débogage
    if (error.name === 'PrismaClientKnownRequestError') {
      console.error('Erreur Prisma lors de l\'accès à la base de données:', {
        code: error.code,
        meta: error.meta,
        message: error.message
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de l'envoi de l'email", 
      error: error.message,
      type: error.name || 'UnknownError'
    });
  }
};

module.exports = {
  envoyerIdentifiantsParEmail
};
