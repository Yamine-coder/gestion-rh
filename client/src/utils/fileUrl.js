/**
 * Génère une URL authentifiée pour accéder aux fichiers protégés
 * Ajoute le token JWT en query string pour les liens ouverts dans un nouvel onglet
 */
import { API_BASE } from '../config/api';

export const getAuthenticatedFileUrl = (filePath) => {
  if (!filePath) return '#';
  
  const token = localStorage.getItem('token');
  const baseUrl = `${API_BASE}${filePath}`;
  
  if (!token) return baseUrl;
  
  // Ajouter le token en query string
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}token=${token}`;
};
