// server/middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET non défini. Définissez-le dans le fichier .env');
}

// Cache léger pour éviter un hit DB à chaque requête
// Map: userId → { statut, expiry }
const statusCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (optimisé pour réduire les requêtes DB)

async function checkUserActive(userId) {
  const cached = statusCache.get(userId);
  if (cached && cached.expiry > Date.now()) {
    return cached.statut;
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { statut: true }
    });
    const statut = user?.statut || 'inconnu';
    statusCache.set(userId, { statut, expiry: Date.now() + CACHE_TTL });
    return statut;
  } catch (err) {
    console.error('[AUTH] Erreur vérification statut DB:', err.message);
    return 'erreur_db'; // Signaler l'erreur au lieu de fail-open
  }
}

// Invalider le cache pour un userId (appelé lors du départ)
function invalidateStatusCache(userId) {
  statusCache.delete(userId);
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Vérifie si le token existe (header OU query string pour les fichiers)
  const token = (authHeader && authHeader.split(' ')[1]) || req.query?.token;
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  // Vérification du token
  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {    
    if (err) {
      return res.status(403).json({ error: 'Token invalide ou expiré' });
    }
    
    // Vérifier que l'utilisateur est toujours actif
    const userId = user.userId || user.id;
    const statut = await checkUserActive(userId);
    if (statut === 'erreur_db') {
      return res.status(503).json({ error: 'Service temporairement indisponible. Réessayez dans quelques instants.' });
    }
    if (statut !== 'actif') {
      return res.status(403).json({ error: 'Compte désactivé. Contactez votre administrateur.' });
    }
    
    req.user = user; // Attache l'utilisateur décodé au `req`
    req.userId = userId; // Compatible avec les deux formats
    next(); // Continue vers la route protégée
  });
};

// Middleware spécial pour le refresh: accepte les tokens expirés (max 30 jours)
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // 30 jours en secondes
const refreshAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query?.token;
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  // ignoreExpiration: true → accepte les tokens expirés pour permettre le refresh
  jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true }, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }

    // Sécurité: refuser les tokens expirés depuis plus de 30 jours
    // Un token trop ancien ne doit pas pouvoir être rafraîchi
    if (user.exp) {
      const expiredSince = Math.floor(Date.now() / 1000) - user.exp;
      if (expiredSince > REFRESH_MAX_AGE) {
        return res.status(401).json({ error: 'Token expiré depuis trop longtemps. Veuillez vous reconnecter.' });
      }
    }

    // Vérifier que l'utilisateur est toujours actif (defense-in-depth)
    const userId = user.userId || user.id;
    const statut = await checkUserActive(userId);
    if (statut !== 'actif' && statut !== 'erreur_db') {
      return res.status(403).json({ error: 'Compte désactivé. Contactez votre administrateur.' });
    }

    req.user = user;
    req.userId = userId;
    next();
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
  refreshAuthMiddleware: refreshAuthMiddleware,
  adminMiddleware: adminMiddleware,
  invalidateStatusCache,
  // Export par défaut pour compatibilité
  default: authenticateToken
};
