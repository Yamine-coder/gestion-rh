import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// URL de l'API (utilise la variable d'environnement en production)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const useCongesNotification = () => {
  const [demandesEnAttente, setDemandesEnAttente] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchDemandesEnAttente = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(`${API_BASE}/admin/conges?statut=en+attente`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const previousCount = demandesEnAttente;
      let newCount = 0;
      
      if (Array.isArray(response.data)) {
        newCount = response.data.length;
      } else if (response.data.count !== undefined) {
        newCount = response.data.count;
      }
      
      setDemandesEnAttente(newCount);
      setLastUpdate(new Date());
      
      // Si le nombre a augmenté, c'est une nouvelle demande
      if (!loading && previousCount < newCount && previousCount >= 0) {
        // Notification système si disponible
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Nouvelle demande de congés', {
            body: `Vous avez ${newCount} demande${newCount > 1 ? 's' : ''} de congés en attente`,
            icon: '/favicon.ico',
            badge: '/favicon.ico'
          });
        }
        
        // Log pour debug
        console.log(`📋 Nouvelle demande de congés ! Total: ${newCount}`);
      }
      
    } catch (error) {
      console.error('Erreur lors de la récupération des demandes en attente:', error);
    } finally {
      setLoading(false);
    }
  }, [demandesEnAttente, loading]);

  // Demander la permission pour les notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Effet pour le polling automatique
  useEffect(() => {
    fetchDemandesEnAttente();
    
    // Rafraîchir toutes les 30 secondes
    const intervalId = setInterval(fetchDemandesEnAttente, 30 * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchDemandesEnAttente]);

  return {
    demandesEnAttente,
    loading,
    lastUpdate,
    refresh: fetchDemandesEnAttente
  };
};
