import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Hook pour récupérer le nombre de remplacements en attente
 * Utilisé pour afficher un badge dans le planning
 */
export function useRemplacementsNotification() {
  const [enAttente, setEnAttente] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_BASE}/api/remplacements/admin/toutes`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { statut: 'en_attente' }
      });

      const data = Array.isArray(response.data) ? response.data : [];
      setEnAttente(data.length);
    } catch (err) {
      console.error('Erreur chargement remplacements:', err);
      setEnAttente(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    // Rafraîchir toutes les 60 secondes
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { enAttente, loading, refresh: fetchCount };
}
