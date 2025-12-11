import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getToken } from '../utils/tokenManager';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Récupérer toutes les notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await axios.get('http://localhost:5000/api/notifications', {
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

      const response = await axios.get('http://localhost:5000/api/notifications/non-lues', {
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
        `http://localhost:5000/api/notifications/${notificationId}/marquer-lue`,
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
        'http://localhost:5000/api/notifications/marquer-toutes-lues',
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
        `http://localhost:5000/api/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (error) {
      console.error('Erreur suppression notification:', error);
    }
  }, [fetchNotifications, fetchUnreadCount]);

  // Charger les notifications au montage et toutes les 30 secondes
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Fonction inline pour éviter les dépendances
    const loadNotifications = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(response.data);
      } catch (error) {
        console.error('Erreur récupération notifications:', error);
      }
    };

    const loadUnreadCount = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/notifications/non-lues', {
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

    // Polling toutes les 30 secondes (uniquement le count)
    const interval = setInterval(loadUnreadCount, 30000);

    return () => clearInterval(interval);
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
