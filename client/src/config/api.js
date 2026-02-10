/**
 * Configuration centralisée de l'API
 * Toutes les URLs de l'API doivent être importées depuis ce fichier.
 * 
 * Usage:
 *   import { API_BASE } from '../config/api';
 *   // ou depuis un sous-dossier :
 *   import { API_BASE } from '../../config/api';
 */

export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
export const API_URL = API_BASE; // Alias pour compatibilité

export default API_BASE;
