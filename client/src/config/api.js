/**
 * Configuration centralisée de l'API
 * Toutes les URLs de l'API doivent être importées depuis ce fichier.
 * 
 * Usage:
 *   import { API_BASE } from '../config/api';
 *   // ou depuis un sous-dossier :
 *   import { API_BASE } from '../../config/api';
 */

// Détection automatique : si on est en production (Vercel), utiliser l'URL Render
const getApiBase = () => {
  // Variable d'env en priorité (set par Vercel ou .env)
  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL !== 'http://localhost:5000') {
    return process.env.REACT_APP_API_URL;
  }
  // Auto-détection en production : si on est sur vercel.app, utiliser le backend Render
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return 'https://gestion-rh-vqof.onrender.com';
  }
  // Fallback local
  return process.env.REACT_APP_API_URL || 'http://localhost:5000';
};

export const API_BASE = getApiBase();
export const API_URL = API_BASE; // Alias pour compatibilité

export default API_BASE;
