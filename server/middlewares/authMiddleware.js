// server/middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET non défini. Définissez-le dans le fichier .env');
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Vérifie si le token existe
  const token = authHeader && authHeader.split(' ')[1]; 
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  // Vérification du token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {    
    if (err) {
      return res.status(403).json({ error: 'Token invalide ou expiré' });
    }
    req.user = user; // Attache l'utilisateur décodé au `req`
    req.userId = user.userId || user.id; // Compatible avec les deux formats
    next(); // Continue vers la route protégée
  });
};

// Middleware pour vérifier les droits admin
const adminMiddleware = (req, res, next) => {
  // Normaliser le rôle en minuscule pour comparaison
  const role = req.user?.role?.toLowerCase();
  if (!req.user || (role !== 'admin' && role !== 'manager')) {
    return res.status(403).json({ 
      error: 'Accès refusé. Droits administrateur requis.' 
    });
  }
  next();
};

module.exports = {
  authMiddleware: authenticateToken,
  adminMiddleware: adminMiddleware,
  // Export par défaut pour compatibilité
  default: authenticateToken
};
