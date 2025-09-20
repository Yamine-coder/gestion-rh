import axios from 'axios';

// Use explicit baseURL to avoid relying solely on CRA proxy (helps diagnose proxy issues)
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL,
});

// Simple request/response logging in dev
if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(cfg => {
    console.debug('[API] Request', cfg.method?.toUpperCase(), cfg.baseURL + cfg.url, cfg.params || '', cfg.data || '');
    return cfg;
  });
  api.interceptors.response.use(res => {
    console.debug('[API] Response', res.status, res.config.url, res.data && (res.data.message || ''));
    return res;
  }, err => {
    if (err.response) {
      console.error('[API] Error Response', err.response.status, err.config?.url, err.response.data);
    } else {
      console.error('[API] Network/Proxy Error', err.message);
    }
    return Promise.reject(err);
  });
}

export default api;
export { baseURL };
