import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Hook pour récupérer le nombre de justificatifs Navigo en attente de validation
 */
export function useNavigoNotification() {
  const [enAttente, setEnAttente] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchEnAttente = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setEnAttente(0);
        return;
      }

      const response = await axios.get(`${API_URL}/api/navigo/mensuel/admin/en-attente`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEnAttente(response.data?.length || 0);
    } catch (error) {
      // Silencieux si l'API n'existe pas ou erreur
      console.log('Navigo notification check:', error.message);
      setEnAttente(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnAttente();
    
    // Rafraîchir toutes les 2 minutes
    const interval = setInterval(fetchEnAttente, 120000);
    
    return () => clearInterval(interval);
  }, [fetchEnAttente]);

  return {
    enAttente,
    loading,
    refresh: fetchEnAttente
  };
}
