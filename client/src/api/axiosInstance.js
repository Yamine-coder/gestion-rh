import axios from 'axios';
import { API_BASE } from '../config/api';
import { getToken, clearToken } from '../utils/tokenManager';

const api = axios.create({
  baseURL: API_BASE,
});

// Intercepteur: injecter le token valide (via tokenManager) dans chaque requête
api.interceptors.request.use(cfg => {
  const token = getToken(); // Vérifie l'expiration automatiquement
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// Intercepteur réponse: auto-logout sur 401/403
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      // Token invalide ou expiré côté serveur
      const token = localStorage.getItem('token');
      if (token) {
        clearToken();
        localStorage.removeItem('role');
        // Rediriger vers login sauf si déjà sur /login
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
export { API_BASE as baseURL };
