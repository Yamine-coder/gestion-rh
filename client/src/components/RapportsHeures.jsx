// src/components/RapportsHeures.jsx

import React, { useState, useEffect } from "react";
// axios instance centralisée
import api, { baseURL } from "../api/axiosInstance";
import { 
  HiSearch, 
  HiEye, 
  HiDownload,
  HiUsers,
  HiClock,
  HiCalendar,
  HiChartBar
} from "react-icons/hi";
import RapportHeuresEmploye from "./RapportHeuresEmploye";
import { getCurrentDateString } from "../utils/parisTimeUtils";

const RapportsHeures = () => {
  const [employes, setEmployes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeId, setSelectedEmployeId] = useState(null);
  const [periode, setPeriode] = useState('mois');
  const [moisSelectionne, setMoisSelectionne] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtrer les employés selon le terme de recherche
  const filteredEmployes = employes.filter(employe => {
    const term = searchTerm.toLowerCase();
    return (
      employe.nom?.toLowerCase().includes(term) ||
      employe.prenom?.toLowerCase().includes(term) ||
      employe.email?.toLowerCase().includes(term) ||
      employe.role?.toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    fetchEmployes();
  }, []);

  const fetchEmployes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token d'authentification manquant");

      // Health check direct (bypass proxy) to give clearer message
      try {
        await fetch(`${baseURL}/health`).then(r => { if(!r.ok) throw new Error('health fail'); });
      } catch (e) {
        setError("API indisponible (serveur non démarré ou crash). Veuillez relancer le backend sur le port 5000.");
        return;
      }

      const response = await api.get("/admin/employes", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployes(response.data);
    } catch (err) {
      console.error("Erreur lors de la récupération des employés:", err);
      if (err.response) {
        setError(`Erreur serveur (${err.response.status}) lors du chargement des employés`);
      } else {
        setError("Erreur réseau / proxy: impossible de joindre l'API");
      }
    } finally {
      setLoading(false);
    }
  };

  const exporterTousRapports = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      // Afficher un loader
      const exportButton = document.querySelector('[data-export-all]');
      if (exportButton) {
        exportButton.disabled = true;
        exportButton.innerHTML = '<svg class="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
      }

      const response = await api.get('/api/stats/rapports/export-pdf', {
        params: { 
          periode, 
          mois: periode === 'mois' ? moisSelectionne : undefined
        },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Nom du fichier basé sur la période
      const dateStr = getCurrentDateString();
      const fileName = `rapport_heures_navigo_${periode}_${dateStr}.zip`;
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Restaurer le bouton
      if (exportButton) {
        exportButton.disabled = false;
        exportButton.innerHTML = '<svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><span class="hidden sm:inline ml-2">📦 ZIP (PDF + Justificatifs)</span><span class="sm:hidden ml-2">📦 ZIP</span>';
      }

      // Notification de succès
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
      notification.textContent = `✓ Export réussi ! ${employes.length} employés exportés`;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.classList.add('animate-fade-out');
        setTimeout(() => notification.remove(), 500);
      }, 3000);

    } catch (err) {
      console.error("Erreur lors de l'export:", err);
      
      // Restaurer le bouton en cas d'erreur
      const exportButton = document.querySelector('[data-export-all]');
      if (exportButton) {
        exportButton.disabled = false;
        exportButton.innerHTML = '<svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><span class="hidden sm:inline ml-2">📦 ZIP (PDF + Justificatifs)</span><span class="sm:hidden ml-2">📦 ZIP</span>';
      }

      alert(
        err.response?.data?.message || 
        "Erreur lors de l'export des rapports. Veuillez réessayer."
      );
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchEmployes}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-3 sm:p-6 rounded-xl shadow-md border border-gray-100">
      {/* En-tête avec contrôles - Style Vue Journalière */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-[#cf292c] rounded-lg text-white flex-shrink-0">
            <HiChartBar size={20} />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-semibold text-gray-900">Rapports d'heures</h1>
            <p className="text-xs text-gray-500 mt-0.5">Consultez et analysez les rapports détaillés de chaque employé</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <HiCalendar className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all shadow-sm"
            >
              <option value="semaine">Cette semaine</option>
              <option value="mois">Par mois</option>
              <option value="trimestre">Ce trimestre</option>
            </select>
          </div>
          
          {periode === 'mois' && (
            <input
              type="month"
              value={moisSelectionne}
              onChange={(e) => setMoisSelectionne(e.target.value)}
              max={new Date().toISOString().slice(0, 7)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all shadow-sm"
            />
          )}
<button
            onClick={exporterTousRapports}
            data-export-all
            className="w-full lg:w-auto bg-[#cf292c] text-white px-4 py-2 rounded-lg hover:bg-[#cf292c]/90 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">📦 ZIP (PDF + Justificatifs)</span>
            <span className="sm:hidden">📦 ZIP</span>
          </button>
        </div>
      </div>

      {/* Cartes statistiques - Essentiel */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {/* Card 1: Employés en poste */}
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Employés</p>
          <p className="text-2xl sm:text-3xl font-bold text-[#cf292c]">
            {employes.filter(e => e.statut === 'actif' && !e.dateSortie).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            En poste
          </p>
        </div>
        
        {/* Card 2: Productivité */}
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Productivité</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">
            --
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Heures effectives vs heures prévues
          </p>
        </div>

        {/* Card 3: Période */}
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Période</p>
          <p className="text-lg sm:text-xl font-bold text-gray-800">
            {periode === 'mois' && moisSelectionne 
              ? new Date(moisSelectionne + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
              : new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Liste des employés - Style Vue Jour */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Header avec recherche */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Employés ({filteredEmployes.length})
            </h2>
            <div className="w-full sm:w-auto relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all shadow-sm"
              />
            </div>
          </div>
        </div>
          
          {/* Table Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Employé
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Email
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Rôle
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredEmployes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <HiUsers className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">
                          {searchTerm ? "Aucun employé trouvé pour cette recherche" : "Aucun employé"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Les données apparaîtront ici</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEmployes.map((employe) => (
                    <tr key={employe.id} className="hover:bg-gray-50 transition-all duration-200 group">
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-[#cf292c] rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-white text-sm font-bold">
                              {`${employe.prenom?.[0] || ''}${employe.nom?.[0] || ''}`}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {employe.prenom} {employe.nom}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 border-r border-gray-100">
                        {employe.email}
                      </td>
                      <td className="px-6 py-4 text-center border-r border-gray-100">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {employe.role || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedEmployeId(employe.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#cf292c] border border-[#cf292c] text-[#cf292c] hover:text-white text-xs font-medium rounded-lg transition-all duration-200"
                        >
                          <HiEye className="w-4 h-4" />
                          Voir rapport
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Vue Mobile */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredEmployes.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HiUsers className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">
                  {searchTerm ? "Aucun employé trouvé" : "Aucun employé"}
                </p>
              </div>
            ) : (
              filteredEmployes.map((employe) => (
                <div key={employe.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-[#cf292c] rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">
                          {`${employe.prenom?.[0] || ''}${employe.nom?.[0] || ''}`}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {employe.prenom} {employe.nom}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{employe.email}</p>
                        {employe.role && (
                          <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                            {employe.role}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedEmployeId(employe.id)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#cf292c] border border-[#cf292c] text-[#cf292c] hover:text-white text-xs font-medium rounded-lg transition-all"
                    >
                      <HiEye className="w-3.5 h-3.5" />
                      <span>Voir</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      {/* Modal du rapport d'heures */}
      {selectedEmployeId && (
        <RapportHeuresEmploye
          employeId={selectedEmployeId}
          onClose={() => setSelectedEmployeId(null)}
        />
      )}

{/* Footer info */}
      <div className="mt-4 px-2 text-sm text-gray-500 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs">Données actualisées pour {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </div>
  );
};

export default RapportsHeures;
