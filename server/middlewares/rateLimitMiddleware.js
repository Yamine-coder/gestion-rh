// Simple rate limiting en mémoire pour les tentatives de login et récupération
const loginAttempts = new Map(); // IP -> { count, lastAttempt }
const recoveryAttempts = new Map(); // IP -> { count, lastAttempt }

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 10; // 10 tentatives de login par fenêtre
const MAX_RECOVERY_ATTEMPTS = 3; // 3 demandes de récupération par fenêtre

const rateLimitLogin = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Nettoyer les anciennes entrées
  for (const [key, value] of loginAttempts.entries()) {
    if (now - value.lastAttempt > RATE_LIMIT_WINDOW) {
      loginAttempts.delete(key);
    }
  }
  
  const attempts = loginAttempts.get(ip);
  
  if (attempts && attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const timeLeft = Math.ceil((RATE_LIMIT_WINDOW - (now - attempts.lastAttempt)) / 1000 / 60);
    return res.status(429).json({ 
      error: `Trop de tentatives de connexion. Réessayez dans ${timeLeft} minutes.`,
      retryAfter: timeLeft 
    });
  }
  
  next();
};

const recordLoginAttempt = (ip, success = false) => {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: now };
  
  if (success) {
    // Effacer les tentatives en cas de succès
    loginAttempts.delete(ip);
  } else {
    // Incrémenter les tentatives échouées
    attempts.count += 1;
    attempts.lastAttempt = now;
    loginAttempts.set(ip, attempts);
  }
};

// Rate limiting pour demandes de récupération
const rateLimitRecovery = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Nettoyer les anciennes entrées
  for (const [key, value] of recoveryAttempts.entries()) {
    if (now - value.lastAttempt > RATE_LIMIT_WINDOW) {
      recoveryAttempts.delete(key);
    }
  }
  
  const attempts = recoveryAttempts.get(ip);
  
  if (attempts && attempts.count >= MAX_RECOVERY_ATTEMPTS) {
    const timeLeft = Math.ceil((RATE_LIMIT_WINDOW - (now - attempts.lastAttempt)) / 1000 / 60);
    return res.status(429).json({ 
      error: `Trop de demandes de récupération. Réessayez dans ${timeLeft} minutes.`,
      retryAfter: timeLeft 
    });
  }
  
  // Enregistrer la tentative
  const currentAttempts = attempts || { count: 0, lastAttempt: now };
  currentAttempts.count += 1;
  currentAttempts.lastAttempt = now;
  recoveryAttempts.set(ip, currentAttempts);
  
  next();
};

module.exports = {
  rateLimitLogin,
  recordLoginAttempt,
  rateLimitRecovery
};
