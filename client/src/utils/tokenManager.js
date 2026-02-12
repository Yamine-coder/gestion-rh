/**
 * Token Manager - Gestion sécurisée des tokens JWT avec expiration
 * 
 * Fonctionnalités:
 * - Stockage avec timestamp
 * - Vérification d'expiration (7 jours)
 * - Auto-logout sur expiration
 * - Refresh automatique avant expiration
 */

import { API_BASE } from '../config/api';

const TOKEN_KEY = 'token';
const TOKEN_TIMESTAMP_KEY = 'token_timestamp';
const TOKEN_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 jours en millisecondes
const REFRESH_THRESHOLD = 12 * 60 * 60 * 1000; // Rafraîchir si < 12h restantes

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
  return remaining > 0 && remaining < REFRESH_THRESHOLD;
};

/**
 * Rafraîchit le token via l'API avant expiration
 * @returns {Promise<boolean>} true si le refresh a réussi
 */
let refreshInProgress = false;
export const refreshToken = async () => {
  if (refreshInProgress) return false;
  
  const currentToken = localStorage.getItem(TOKEN_KEY);
  if (!currentToken) return false;
  
  refreshInProgress = true;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  } finally {
    refreshInProgress = false;
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
  
  // Vérification toutes les minutes + refresh automatique
  const intervalId = setInterval(async () => {
    if (!isTokenValid()) {
      clearInterval(intervalId);
      onExpired();
      return;
    }
    
    // Tenter un refresh si le token expire bientôt
    if (isTokenExpiringSoon()) {
      await refreshToken();
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
