// src/components/RapportHeuresEmploye.jsx

import React, { useState, useEffect, useCallback } from "react";
import api from "../api/axiosInstance";
import {
  HiCalendar,
  HiDownload,
  HiXCircle
} from "react-icons/hi";
import {
  BarChart,
  Bar,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useToast } from './ui/Toast';

const RapportHeuresEmploye = ({ employeId, onClose }) => {
  const [employe, setEmploye] = useState(null);
  const [rapportData, setRapportData] = useState(null);
  const [rapportDetaille, setRapportDetaille] = useState(null);
  const [periode, setPeriode] = useState('mois'); // semaine, mois, trimestre
  const [moisSelectionne, setMoisSelectionne] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [loadingDetaille, setLoadingDetaille] = useState(false);
  const [error, setError] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('synthese'); // synthese, detaille
  const toast = useToast();

  // Couleur de charte principale
  const ACCENT = '#cf292c';


  const fetchRapportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token d'authentification manquant");
      }

      // Récupérer les données de l'employé et son rapport
      const [employeResponse, rapportResponse] = await Promise.all([
        api.get(`/admin/employes/${employeId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        api.get(`/api/stats/employe/${employeId}/rapport`, {
          params: { periode, mois: moisSelectionne },
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setEmploye(employeResponse.data);
      setRapportData(rapportResponse.data);
    } catch (err) {
      console.error("Erreur lors de la récupération du rapport:", err);
      if (err.response) {
        setError(`Erreur ${err.response.status} : ${err.response.data?.message || 'Serveur'}`);
      } else {
        setError("Erreur réseau / API indisponible");
      }
    } finally {
      setLoading(false);
    }
  }, [employeId, periode, moisSelectionne]);

  const fetchRapportDetaille = useCallback(async () => {
    setLoadingDetaille(true);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token d'authentification manquant");
      }

      const response = await api.get(`/api/stats/employe/${employeId}/rapport-detaille`, {
        params: { periode, mois: moisSelectionne },
        headers: { Authorization: `Bearer ${token}` }
      });

      setRapportDetaille(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération du rapport détaillé:", err);
      setError("Impossible de charger le détail mensuel");
    } finally {
      setLoadingDetaille(false);
    }
  }, [employeId, periode, moisSelectionne]);

  // Regroupe les retards par date pour enrichir le tooltip du graphique
  const retardsByDate = React.useMemo(() => {
    if (!rapportData?.retards) return {};
    return rapportData.retards.reduce((acc, r) => {
      if (!r?.date) return acc;
      const d = r.date;
      // Le backend envoie "retard" (en minutes), pas "duree"
      const duree = parseInt(r.retard || r.duree) || 0;
      if (!acc[d]) acc[d] = { total: 0, occurrences: 0 };
      acc[d].total += duree;
      acc[d].occurrences += 1;
      return acc;
    }, {});
  }, [rapportData]);

  // Normalise la structure heuresParJour pour supporter plusieurs conventions de noms + fallback si 0
  const heuresParJourNormalisees = React.useMemo(() => {
    if (!rapportData?.heuresParJour) return [];
    let rows = rapportData.heuresParJour.map((d, idx) => {
      const prevues = d.prevues ?? d.heuresPrevues ?? d.heuresPreveues ?? d.heuresPlanifiees ?? d.heures_planifiees ?? d.planifiees ?? d.planifiee ?? d.planifie ?? d.planned ?? d.expected ?? d.scheduled ?? d.hPrevues ?? 0;
      const travaillees = d.travaillees ?? d.heuresTravaillees ?? d.heuresRealisees ?? d.realisees ?? d.reelles ?? d.hTravaillees ?? d.worked ?? d.effectuees ?? 0;
      const jourKey = d.jour || d.date || `J${idx + 1}`;
      
      // Récupérer les retards pour ce jour - essayer plusieurs clés possibles
      const retardInfo = retardsByDate[jourKey] || 
                        retardsByDate[d.date] || 
                        retardsByDate[d.jour] || 
                        { total: 0, occurrences: 0 };
      
      return {
        key: jourKey,
        jour: jourKey,
        prevues: typeof prevues === 'string' ? parseFloat(prevues.replace(',', '.')) || 0 : prevues,
        travaillees: typeof travaillees === 'string' ? parseFloat(travaillees.replace(',', '.')) || 0 : travaillees,
        retardMinutes: retardInfo.total,
        retardCount: retardInfo.occurrences
      };
    });
    const totalPrevuesGlobal = Number(rapportData.heuresPrevues || rapportData.heuresPreveues) || 0;
    const allPrevuesZero = rows.length && rows.every(r => (r.prevues || 0) === 0);
    if (allPrevuesZero && totalPrevuesGlobal > 0) {
      const actifs = rows.filter(r => r.travaillees > 0);
      const base = actifs.length ? actifs : rows;
      const repartition = totalPrevuesGlobal / base.length;
      rows = rows.map(r => ({ ...r, prevues: +(repartition.toFixed(2)) }));
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[RapportHeuresEmploye] Fallback: Répartition uniforme des heures prévues', { totalPrevuesGlobal, repartition });
      }
    }
    return rows;
  }, [rapportData, retardsByDate]);

  const toutesPrevuesZero = React.useMemo(() => {
    if (!heuresParJourNormalisees.length) return false;
    return heuresParJourNormalisees.every(r => (r.prevues ?? 0) === 0) && heuresParJourNormalisees.some(r => (r.travaillees ?? 0) > 0);
  }, [heuresParJourNormalisees]);

  // Calcul de ponctualité basé sur les retards réels
  const tauxPonctualiteCalcule = React.useMemo(() => {
    // Si pas de données, supposer 100%
    if (!rapportData || !heuresParJourNormalisees.length) return 100;
    
    // Compter les jours travaillés (présences)
    const joursPresents = heuresParJourNormalisees.filter(r => (r.travaillees || 0) > 0);
    if (joursPresents.length === 0) return 100;
    
    // Compter les retards distincts (par jour)
    const retardsUniques = new Set();
    if (rapportData.retards) {
      rapportData.retards.forEach(retard => {
        // Le backend envoie "retard" (en minutes), pas "duree"
        const dureeRetard = retard.retard || retard.duree || 0;
        if (retard.date && parseInt(dureeRetard) > 0) {
          retardsUniques.add(retard.date);
        }
      });
    }
    
    const joursAvecRetard = retardsUniques.size;
    const joursSansRetard = Math.max(0, joursPresents.length - joursAvecRetard);
    
    // Calcul: (jours sans retard / jours présents) * 100
    return Math.round((joursSansRetard / joursPresents.length) * 100);
  }, [heuresParJourNormalisees, rapportData]);

  // Tooltip personnalisé pour afficher Ecart & Retards
  const CustomHeuresTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const prevues = payload.find(p => p.dataKey === 'prevues')?.value || 0;
    const travaillees = payload.find(p => p.dataKey === 'travaillees')?.value || 0;
    const ecart = (travaillees - prevues).toFixed(2);
    const retardInfo = retardsByDate[label];
    return (
      <div className="rounded-md border border-gray-200 bg-white/90 backdrop-blur px-3 py-2 shadow-sm text-[11px] space-y-1">
        <div className="font-semibold text-gray-800">{label}</div>
        <div className="flex justify-between gap-4"><span className="text-gray-500">Prévues</span><span className="font-medium text-gray-700">{prevues}h</span></div>
        <div className="flex justify-between gap-4"><span className="text-gray-500">Travaillées</span><span className="font-medium text-gray-700">{travaillees}h</span></div>
        <div className="flex justify-between gap-4"><span className="text-gray-500">Écart</span><span className={`font-medium ${ecart < 0 ? 'text-red-600' : ecart > 0 ? 'text-green-600' : 'text-gray-600'}`}>{ecart}h</span></div>
        {retardInfo && (
          <div className="flex justify-between gap-4"><span className="text-gray-500">Retards</span><span className="font-medium text-amber-600">{retardInfo.total} min ({retardInfo.occurrences})</span></div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (employeId) {
      fetchRapportData();
    }
  }, [employeId, fetchRapportData]);

  // Reset le rapport détaillé quand le mois ou la période change
  useEffect(() => {
    setRapportDetaille(null);
  }, [moisSelectionne, periode]);

  // Charger le rapport détaillé quand on est sur l'onglet et que les données sont null
  useEffect(() => {
    if (activeTab === 'detaille' && !rapportDetaille && employeId) {
      fetchRapportDetaille();
    }
  }, [activeTab, rapportDetaille, employeId, fetchRapportDetaille]);

  const exporterRapport = async (format = 'csv') => {
    try {
      setShowExportMenu(false);
      const token = localStorage.getItem("token");
      
      const response = await api.get(`/api/stats/employe/${employeId}/export`, {
        params: { 
          periode, 
          mois: moisSelectionne,
          format // csv ou pdf
        },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extension selon le format
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      const fileName = `rapport_${employe?.prenom}_${employe?.nom}_${periode}_${moisSelectionne || new Date().toISOString().slice(0, 7)}.${ext}`;
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Notification de succès
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.innerHTML = `✓ Export ${format.toUpperCase()} réussi !`;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
      }, 2500);

    } catch (err) {
      console.error("Erreur lors de l'export:", err);
      toast.error('Erreur', err.response?.data?.message || "Erreur lors de l'export du rapport");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cf292c] mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <HiXCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-md max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header simple */}
        <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#cf292c] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {employe ? `${employe.prenom?.[0] || ''}${employe.nom?.[0] || ''}` : ''}
              </span>
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 text-sm">{employe?.email}</div>
              <div className="text-xs text-gray-500">
                {employe?.prenom} {employe?.nom} · {employe?.role}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Bouton Export simplifié */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#cf292c] text-white text-xs rounded-lg hover:bg-[#cf292c]/90 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Exporter</span>
              </button>

              {/* Menu déroulant */}
              {showExportMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowExportMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => exporterRapport('pdf')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      PDF
                    </button>
                    <button
                      onClick={() => exporterRapport('csv')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      CSV
                    </button>
                    <button
                      onClick={() => exporterRapport('json')}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      JSON
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Fermer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contrôles de période */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <label className="text-sm font-medium text-gray-700">Période</label>
              <select
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] bg-white"
              >
                <option value="semaine">Semaine</option>
                <option value="mois">Mois</option>
                <option value="trimestre">Trimestre</option>
              </select>
            </div>
            {periode === 'mois' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Mois</label>
                <input
                  type="month"
                  value={moisSelectionne}
                  onChange={(e) => setMoisSelectionne(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Onglets - Style moderne */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex px-4 sm:px-6 gap-2">
            <button
              onClick={() => setActiveTab('synthese')}
              className={`relative px-5 py-3.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'synthese'
                  ? 'text-[#cf292c]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Synthèse</span>
              </div>
              {activeTab === 'synthese' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#cf292c] rounded-t-full"></div>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('detaille')}
              className={`relative px-5 py-3.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === 'detaille'
                  ? 'text-[#cf292c]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Détail mensuel</span>
                <span className="sm:hidden">Détail</span>
              </div>
              {activeTab === 'detaille' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#cf292c] rounded-t-full"></div>
              )}
            </button>
          </div>
        </div>

        {/* Corps du rapport */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'synthese' && rapportData && (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Cartes statistiques (style Vue Journalière) */}
              {(() => {
                const heuresPrevues = Number(rapportData.heuresPrevues || rapportData.heuresPreveues) || 0;
                const heuresTrav = Number(rapportData.heuresTravaillees) || 0;
                const heuresSupp = Number(rapportData.heuresSupplementaires) || 0;
                const absJustJ = Number(rapportData.absencesJustifiees) || 0;
                const absInjJ = Number(rapportData.absencesInjustifiees) || 0;
                const retardCount = rapportData.nombreRetards || 0;
                const joursPresents = (rapportData.heuresParJour || []).filter(j => (j.travaillees ?? j.heuresTravaillees ?? j.heuresRealisees ?? 0) > 0).length;
                  
                  // Pour les absences, on estime avec la moyenne des heures prévues par jour de la période
                  const totalJoursPeriode = joursPresents + absJustJ + absInjJ;
                  const avgHeuresJourPrevu = totalJoursPeriode > 0 ? +(heuresPrevues / totalJoursPeriode).toFixed(2) : 8;
                  const heuresStandardParJour = avgHeuresJourPrevu > 0 ? avgHeuresJourPrevu : 8;
                  
                  const heuresAbsJustEst = +(absJustJ * heuresStandardParJour).toFixed(2);
                  const heuresAbsInjEst = +(absInjJ * heuresStandardParJour).toFixed(2);
                  
                  // Heures manquantes = heures prévues - heures travaillées - absences justifiées estimées
                  // Les absences injustifiées SONT des heures manquantes, donc pas de soustraction
                  const heuresManquantesRaw = heuresPrevues - heuresTrav - heuresAbsJustEst;
                  const heuresManquantes = heuresManquantesRaw > 0 ? +heuresManquantesRaw.toFixed(2) : 0;
                  
                  return (
                    <>
                      {/* Cartes statistiques - Style Vue Journalière */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
                          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Heures prévues</p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-800">{heuresPrevues}h</p>
                        </div>
                        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
                          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Travaillées</p>
                          <p className="text-xl sm:text-2xl font-bold text-[#cf292c]">{heuresTrav}h</p>
                        </div>
                        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
                          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                            <span className="hidden sm:inline">Heures supp.</span>
                            <span className="sm:hidden">Supp.</span>
                          </p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-800">{heuresSupp}h</p>
                        </div>
                        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
                          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                            <span className="hidden sm:inline">Ponctualité</span>
                            <span className="sm:hidden">Ponct.</span>
                          </p>
                          <p className={`text-xl sm:text-2xl font-bold ${tauxPonctualiteCalcule >= 90 ? 'text-green-600' : tauxPonctualiteCalcule >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {tauxPonctualiteCalcule}%
                          </p>
                        </div>
                      </div>

                      {/* Détails supplémentaires - Grille 3 colonnes */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Jours présents</p>
                          <p className="text-lg font-bold text-gray-800">{joursPresents}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Retards</p>
                          <p className="text-lg font-bold text-yellow-600">{retardCount}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Moy. h/jour</p>
                          <p className="text-lg font-bold text-gray-800">{joursPresents ? (heuresTrav / joursPresents).toFixed(1) : '0'}h</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">H. manquantes</p>
                          <p className={`text-lg font-bold ${heuresManquantes ? 'text-amber-600' : 'text-gray-800'}`}>{heuresManquantes}h</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Abs. justifiées</p>
                          <p className="text-lg font-bold text-green-600">{absJustJ}j</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Abs. injustifiées</p>
                          <p className="text-lg font-bold text-red-600">{absInjJ}j</p>
                        </div>
                      </div>
                    </>
                  );
                })()}

              {/* Graphique heures */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Heures prévues vs. travaillées
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={heuresParJourNormalisees}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="jour"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip content={<CustomHeuresTooltip />} />
                      <Bar dataKey="prevues" fill="#e5e7eb" name="Heures prévues" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="travaillees" fill={ACCENT} name="Heures travaillées" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="inline-block w-3 h-3 rounded bg-[#e5e7eb] border border-gray-300" />
                      <span>Prévues</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: ACCENT }} />
                      <span>Travaillées</span>
                    </div>
                    {toutesPrevuesZero && (
                      <div className="w-full flex items-center gap-1.5 text-xs text-amber-600 mt-2 p-2 bg-amber-50 rounded">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Heures prévues manquantes. Vérifiez les données planifiées.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Détail mensuel */}
          {activeTab === 'detaille' && (
            <div className="p-4 sm:p-6 space-y-6">
              {loadingDetaille ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cf292c]"></div>
                  <p className="ml-3 text-gray-600">Chargement du détail...</p>
                </div>
              ) : rapportDetaille ? (
                <>
                  {/* Synthèse par semaine */}
                  {rapportDetaille.syntheseSemaines && rapportDetaille.syntheseSemaines.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                        Synthèse hebdomadaire
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rapportDetaille.syntheseSemaines.map((semaine, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">
                              Semaine {semaine.numeroSemaine} • {new Date(semaine.debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - {new Date(semaine.fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-600">Prévues:</span>
                                <span className="ml-1 font-medium">{semaine.heuresPrevues}h</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Réalisées:</span>
                                <span className="ml-1 font-medium text-[#cf292c]">{semaine.heuresRealisees}h</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Écart:</span>
                                <span className={`ml-1 font-medium ${semaine.ecart >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                  {semaine.ecart >= 0 ? '+' : ''}{semaine.ecart}h
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Présents:</span>
                                <span className="ml-1 font-medium">{semaine.joursPresents}/7j</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tableau détaillé jour par jour */}
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Détail jour par jour • {rapportDetaille.periode?.libelle || 'Période'}
                      </h3>
                    </div>

                    {/* Version Desktop */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Jour</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Prévu</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Réalisé</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Écart</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {rapportDetaille.detailsJours?.map((jour, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                {new Date(jour.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                                {jour.jourSemaine}
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-medium text-gray-800">
                                {jour.heuresPrevues}h
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-medium text-[#cf292c]">
                                {jour.heuresRealisees}h
                              </td>
                              <td className="px-4 py-3 text-center text-sm font-medium">
                                <span className={`px-2 py-1 rounded ${
                                  jour.ecart > 0 ? 'bg-green-100 text-green-700' :
                                  jour.ecart < 0 ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {jour.ecart >= 0 ? '+' : ''}{jour.ecart}h
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  jour.statut === 'Présent' ? 'bg-green-100 text-green-700' :
                                  jour.statut.includes('Retard') ? 'bg-yellow-100 text-yellow-700' :
                                  jour.statut.includes('Congé') || jour.statut.includes('RTT') ? 'bg-blue-100 text-blue-700' :
                                  jour.statut.includes('Absence') ? 'bg-red-100 text-red-700' :
                                  jour.statut === 'Hors planning' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {jour.statut}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 font-semibold">
                          <tr>
                            <td colSpan="2" className="px-4 py-3 text-sm text-gray-700">TOTAL</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-800">
                              {rapportDetaille.totaux?.heuresPrevues || 0}h
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-[#cf292c]">
                              {rapportDetaille.totaux?.heuresRealisees || 0}h
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              <span className={`px-2 py-1 rounded ${
                                (rapportDetaille.totaux?.ecart || 0) >= 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {(rapportDetaille.totaux?.ecart || 0) >= 0 ? '+' : ''}{rapportDetaille.totaux?.ecart || 0}h
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-700">
                              {rapportDetaille.totaux?.joursPresents || 0} jours présents
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Version Mobile */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {rapportDetaille.detailsJours?.map((jour, idx) => (
                        <div key={idx} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(jour.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                              </div>
                              <div className="text-xs text-gray-500 capitalize">{jour.jourSemaine}</div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              jour.statut === 'Présent' ? 'bg-green-100 text-green-700' :
                              jour.statut.includes('Retard') ? 'bg-yellow-100 text-yellow-700' :
                              jour.statut.includes('Congé') ? 'bg-blue-100 text-blue-700' :
                              jour.statut.includes('Absence') ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {jour.statut}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-gray-500">Prévu</div>
                              <div className="font-medium text-gray-800">{jour.heuresPrevues}h</div>
                            </div>
                            <div className="text-center p-2 bg-red-50 rounded">
                              <div className="text-gray-500">Réalisé</div>
                              <div className="font-medium text-[#cf292c]">{jour.heuresRealisees}h</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-gray-500">Écart</div>
                              <div className={`font-medium ${jour.ecart >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                {jour.ecart >= 0 ? '+' : ''}{jour.ecart}h
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Liste des absences */}
                  {rapportDetaille.absences && rapportDetaille.absences.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                        Absences détaillées ({rapportDetaille.absences.length})
                      </h3>
                      <div className="space-y-2">
                        {rapportDetaille.absences.map((absence, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                            <div>
                              <span className="font-medium text-gray-900">
                                {new Date(absence.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}
                              </span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              absence.type.includes('Congé') || absence.type.includes('RTT') ? 'bg-blue-100 text-blue-700' :
                              absence.type.includes('injustif') ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {absence.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Récapitulatif retards */}
                  {rapportDetaille.totaux && rapportDetaille.totaux.nombreRetards > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-yellow-800 mb-1">Retards</h4>
                          <p className="text-sm text-yellow-700">
                            {rapportDetaille.totaux.nombreRetards} retard{rapportDetaille.totaux.nombreRetards > 1 ? 's' : ''} cumulé{rapportDetaille.totaux.nombreRetards > 1 ? 's' : ''} : {rapportDetaille.totaux.minutesRetardTotal} minutes
                            {rapportDetaille.totaux.heuresRetardTotal > 0 && (
                              <span className="font-medium"> ({rapportDetaille.totaux.heuresRetardTotal}h à déduire)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>Aucune donnée détaillée disponible</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center text-sm text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">Données actualisées • {periode === 'semaine' ? 'Semaine' : periode === 'mois' ? 'Mois' : 'Trimestre'} en cours</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RapportHeuresEmploye;
