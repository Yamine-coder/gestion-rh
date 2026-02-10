import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getToken } from '../utils/tokenManager';
import { API_BASE } from '../config/api';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Récupérer toutes les notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await axios.get(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Erreur récupération notifications:', error);
    }
  }, []);

  // Récupérer le nombre de notifications non lues
  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await axios.get(`${API_BASE}/api/notifications/non-lues`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Ne mettre à jour que si le nombre a changé (évite les re-renders inutiles)
      setUnreadCount(prevCount => {
        return prevCount !== response.data.count ? response.data.count : prevCount;
      });
    } catch (error) {
      console.error('Erreur comptage notifications:', error);
    }
  }, []);

  // Marquer une notification comme lue
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const token = getToken();
      if (!token) return;

      await axios.put(
        `${API_BASE}/api/notifications/${notificationId}/marquer-lue`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  }, [fetchNotifications, fetchUnreadCount]);

  // Marquer toutes les notifications comme lues
  const markAllAsRead = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) return;

      await axios.put(
        `${API_BASE}/api/notifications/marquer-toutes-lues`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications, fetchUnreadCount]);

  // Supprimer une notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const token = getToken();
      if (!token) return;

      await axios.delete(
        `${API_BASE}/api/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (error) {
      console.error('Erreur suppression notification:', error);
    }
  }, [fetchNotifications, fetchUnreadCount]);

  // SSE temps réel avec fallback polling
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Fonction inline pour éviter les dépendances
    const loadNotifications = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(response.data);
      } catch (error) {
        console.error('Erreur récupération notifications:', error);
      }
    };

    const loadUnreadCount = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/notifications/non-lues`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUnreadCount(prevCount => {
          return prevCount !== response.data.count ? response.data.count : prevCount;
        });
      } catch (error) {
        console.error('Erreur comptage notifications:', error);
      }
    };

    // Chargement initial
    loadNotifications();
    loadUnreadCount();

    // === SSE temps réel ===
    let eventSource = null;
    let pollingInterval = null;
    let sseConnected = false;

    const connectSSE = async () => {
      try {
        // 🔒 Obtenir un token SSE éphémère (2 min) au lieu d'exposer le JWT principal
        let sseToken = token;
        try {
          const resp = await axios.post(`${API_BASE}/api/notifications/sse-token`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          sseToken = resp.data.token;
        } catch (e) {
          // Fallback: utiliser le token principal si l'endpoint n'existe pas encore
        }
        const sseUrl = `${API_BASE}/api/notifications/stream?token=${encodeURIComponent(sseToken)}`;
        eventSource = new EventSource(sseUrl);

        eventSource.addEventListener('connected', () => {
          sseConnected = true;
          // Arrêter le polling si SSE connecté
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        });

        eventSource.addEventListener('notification', (event) => {
          // Nouvelle notification reçue en temps réel
          loadNotifications();
          loadUnreadCount();
        });

        eventSource.onerror = () => {
          sseConnected = false;
          // Fermer le SSE cassé
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Fallback: reprendre le polling
          if (!pollingInterval) {
            pollingInterval = setInterval(loadUnreadCount, 30000);
          }
          // Tenter de reconnecter après 5s
          setTimeout(() => {
            if (!sseConnected) {
              connectSSE();
            }
          }, 5000);
        };
      } catch {
        // SSE non supporté — rester sur le polling
        if (!pollingInterval) {
          pollingInterval = setInterval(loadUnreadCount, 30000);
        }
      }
    };

    connectSSE();

    // Fallback polling au cas où SSE ne se connecte pas en 3s
    const fallbackTimeout = setTimeout(() => {
      if (!sseConnected && !pollingInterval) {
        pollingInterval = setInterval(loadUnreadCount, 30000);
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimeout);
      if (eventSource) {
        eventSource.close();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []); // Pas de dépendances - s'exécute une seule fois

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
};
