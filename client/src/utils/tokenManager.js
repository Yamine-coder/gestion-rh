/**
 * Token Manager - Gestion sécurisée des tokens JWT avec expiration
 * 
 * Fonctionnalités:
 * - Stockage avec timestamp
 * - Vérification d'expiration (8h par défaut)
 * - Auto-logout sur expiration
 * - Refresh automatique
 */

const TOKEN_KEY = 'token';
const TOKEN_TIMESTAMP_KEY = 'token_timestamp';
const TOKEN_EXPIRATION = 8 * 60 * 60 * 1000; // 8 heures en millisecondes

/**
 * Stocke le token avec timestamp
 * @param {string} token - Token JWT
 */
export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());
};

/**
 * Récupère le token s'il est valide
 * @returns {string|null} Token valide ou null si expiré
 */
export const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  const timestamp = localStorage.getItem(TOKEN_TIMESTAMP_KEY);
  
  if (!token || !timestamp) {
    return null;
  }
  
  const now = Date.now();
  const tokenAge = now - parseInt(timestamp, 10);
  
  // Token expiré
  if (tokenAge > TOKEN_EXPIRATION) {
    clearToken();
    return null;
  }
  
  return token;
};

/**
 * Vérifie si le token est valide
 * @returns {boolean}
 */
export const isTokenValid = () => {
  return getToken() !== null;
};

/**
 * Supprime le token et ses métadonnées
 */
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
};

/**
 * Récupère le temps restant avant expiration
 * @returns {number} Temps en millisecondes, 0 si expiré
 */
export const getTimeUntilExpiration = () => {
  const timestamp = localStorage.getItem(TOKEN_TIMESTAMP_KEY);
  
  if (!timestamp) {
    return 0;
  }
  
  const now = Date.now();
  const tokenAge = now - parseInt(timestamp, 10);
  const remaining = TOKEN_EXPIRATION - tokenAge;
  
  return remaining > 0 ? remaining : 0;
};

/**
 * Vérifie si le token expire bientôt (moins de 30 min)
 * @returns {boolean}
 */
export const isTokenExpiringSoon = () => {
  const remaining = getTimeUntilExpiration();
  return remaining > 0 && remaining < (30 * 60 * 1000); // 30 minutes
};

/**
 * Rafraîchit le timestamp (à appeler après refresh token API)
 */
export const refreshTokenTimestamp = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());
  }
};

/**
 * Hook de vérification automatique (à appeler au montage des composants)
 * @param {function} onExpired - Callback quand le token expire
 * @returns {function} Cleanup function
 */
export const setupTokenExpirationCheck = (onExpired) => {
  // Vérification immédiate
  if (!isTokenValid()) {
    onExpired();
    return () => {};
  }
  
  // Vérification toutes les minutes
  const intervalId = setInterval(() => {
    if (!isTokenValid()) {
      clearInterval(intervalId);
      onExpired();
    }
  }, 60 * 1000); // Toutes les minutes
  
  return () => clearInterval(intervalId);
};

/**
 * Décode un token JWT (sans vérification de signature)
 * @param {string} token
 * @returns {object|null} Payload décodé ou null si erreur
 */
export const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Erreur décodage token:', error);
    return null;
  }
};

/**
 * Récupère les infos utilisateur du token
 * @returns {object|null}
 */
export const getTokenUserInfo = () => {
  const token = getToken();
  if (!token) return null;
  
  const payload = decodeToken(token);
  return payload ? { userId: payload.id, email: payload.email } : null;
};
