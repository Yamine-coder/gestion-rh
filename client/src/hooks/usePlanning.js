// hooks/usePlanning.js
// Hook personnalisé pour intégrer congés et détection de conflits dans le planning

import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { detectConflicts } from '../utils/congeConflicts';

// URL de l'API (utilise la variable d'environnement en production)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function usePlanningWithConges() {
  const [showCongesInPlanning, setShowCongesInPlanning] = useState(false);
  const [conges, setConges] = useState([]);
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const token = localStorage.getItem("token");

  // Charger les congés
  const loadConges = useCallback(async () => {
    if (!showCongesInPlanning) return;
    
    setLoading(true);
    try {
      const [congesRes, employesRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/conges`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/admin/employes`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      
      setConges(congesRes.data);
      setEmployes(employesRes.data);
    } catch (error) {
      console.error('Erreur chargement congés pour planning:', error);
    } finally {
      setLoading(false);
    }
  }, [showCongesInPlanning, token]);

  useEffect(() => {
    loadConges();
  }, [loadConges]);

  // Enrichir les congés avec l'analyse de conflits
  const enrichedConges = useMemo(() => {
    if (!showCongesInPlanning || conges.length === 0 || employes.length === 0) {
      return [];
    }

    return conges.map(conge => {
      if (conge.statut === 'refusé') return conge; // Ignorer les refusés
      
      // Analyser les conflits pour cette demande
      const conflicts = detectConflicts(
        conges.filter(c => c.statut === 'approuvé' || c.statut === 'en attente'),
        employes, 
        conge.dateDebut, 
        conge.dateFin, 
        conge.userId
      );
      
      return { ...conge, conflicts };
    });
  }, [conges, employes, showCongesInPlanning]);

  // Obtenir les congés pour un employé et une date donnée
  const getCongesForEmployeeDate = (employeId, dateStr) => {
    return enrichedConges.filter(conge => {
      if (conge.userId !== employeId) return false;
      
      const dateDebut = new Date(conge.dateDebut);
      const dateFin = new Date(conge.dateFin);
      const targetDate = new Date(dateStr);
      
      return targetDate >= dateDebut && targetDate <= dateFin;
    });
  };

  // Statistiques des conflits
  const conflictStats = useMemo(() => {
    const stats = {
      total: enrichedConges.length,
      enAttente: enrichedConges.filter(c => c.statut === 'en attente').length,
      critical: enrichedConges.filter(c => c.conflicts?.conflictLevel === 'critical').length,
      high: enrichedConges.filter(c => c.conflicts?.conflictLevel === 'high').length,
      medium: enrichedConges.filter(c => c.conflicts?.conflictLevel === 'medium').length,
      low: enrichedConges.filter(c => c.conflicts?.conflictLevel === 'low').length
    };
    
    return stats;
  }, [enrichedConges]);

  return {
    showCongesInPlanning,
    setShowCongesInPlanning,
    conges: enrichedConges,
    employes,
    loading,
    getCongesForEmployeeDate,
    conflictStats,
    refreshConges: loadConges
  };
}
