import axios from 'axios';
import { API_BASE } from '../config/api';
import { getToken, clearToken, setToken } from '../utils/tokenManager';

const api = axios.create({
  baseURL: API_BASE,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// Intercepteur: injecter le token dans chaque requête
api.interceptors.request.use(cfg => {
  const token = getToken();
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  } else {
    // Même si getToken() retourne null (expiré côté client), envoyer le token brut
    // pour que le refresh puisse fonctionner avec les anciens tokens
    const rawToken = localStorage.getItem('token');
    if (rawToken) {
      cfg.headers.Authorization = `Bearer ${rawToken}`;
    }
  }
  return cfg;
});

// Intercepteur réponse: tenter un refresh silencieux avant de déconnecter
api.interceptors.response.use(
  res => res,
  async err => {
    const originalRequest = err.config;

    // Si 401/403 et pas déjà un retry ni une requête de refresh
    if (
      err.response &&
      (err.response.status === 401 || err.response.status === 403) &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh-token')
    ) {
      // Si le 403 vient d'un compte désactivé, on déconnecte directement
      const errorMsg = err.response.data?.error || '';
      if (errorMsg.includes('désactivé') || errorMsg.includes('inactif')) {
        clearToken();
        localStorage.removeItem('role');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
        return Promise.reject(err);
      }

      // Tenter un refresh silencieux
      if (isRefreshing) {
        // Un refresh est déjà en cours, mettre en file d'attente
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(e => Promise.reject(e));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const currentToken = localStorage.getItem('token');
      if (!currentToken) {
        isRefreshing = false;
        return Promise.reject(err);
      }

      try {
        const response = await axios.post(`${API_BASE}/auth/refresh-token`, {}, {
          headers: { Authorization: `Bearer ${currentToken}` }
        });

        if (response.data?.token) {
          setToken(response.data.token);
          const newToken = response.data.token;
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Le refresh a échoué → déconnexion
        clearToken();
        localStorage.removeItem('role');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default api;
export { API_BASE as baseURL };
