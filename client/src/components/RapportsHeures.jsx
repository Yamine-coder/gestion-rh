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

const RapportsHeures = () => {
  const [employes, setEmployes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeId, setSelectedEmployeId] = useState(null);
  const [periode, setPeriode] = useState('mois');
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
    // Fonctionnalité à implémenter
    console.log("Export de tous les rapports à implémenter");
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#cf292c] to-[#b91f22] rounded-xl flex items-center justify-center shadow-lg">
                <HiChartBar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Rapports d'heures
                </h1>
                <p className="text-gray-500 text-sm">
                  Consultez les rapports détaillés de chaque employé
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#cf292c] focus:border-[#cf292c]"
              >
                <option value="semaine">Cette semaine</option>
                <option value="mois">Ce mois</option>
                <option value="trimestre">Ce trimestre</option>
              </select>
              <button
                onClick={exporterTousRapports}
                className="flex items-center gap-2 px-4 py-2 bg-[#cf292c] hover:bg-[#b91f22] text-white rounded-lg transition-colors shadow-sm"
              >
                <HiDownload className="w-4 h-4" />
                Exporter
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{employes.length}</p>
                <p className="text-sm text-gray-500">Employés actifs</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <HiUsers className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {employes.filter(e => e.statut === 'actif').length}
                </p>
                <p className="text-sm text-gray-500">En service</p>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <HiClock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                </p>
                <p className="text-sm text-gray-500">Période actuelle</p>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <HiCalendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredEmployes.length}
                </p>
                <p className="text-sm text-gray-500">Résultats affichés</p>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <HiSearch className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Barre de recherche et liste des employés */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Employés ({filteredEmployes.length})
              </h2>
              <div className="w-full sm:w-auto relative">
                <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher un employé..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cf292c] focus:border-[#cf292c]"
                />
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {filteredEmployes.length === 0 ? (
              <div className="text-center py-12">
                <HiUsers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? "Aucun employé trouvé pour cette recherche" : "Aucun employé"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEmployes.map((employe) => (
                  <div
                    key={employe.id}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-gray-200 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#cf292c] to-[#b91f22] text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                        {`${employe.prenom?.[0] || ''}${employe.nom?.[0] || ''}`}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {employe.prenom} {employe.nom}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{employe.email}</span>
                          {employe.role && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                              {employe.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setSelectedEmployeId(employe.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#cf292c] border border-[#cf292c] hover:border-[#cf292c] text-[#cf292c] hover:text-white text-sm rounded-lg transition-all duration-200"
                    >
                      <HiEye className="w-4 h-4" />
                      Voir rapport
                    </button>
                  </div>
                ))}
              </div>
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
      </div>
    </div>
  );
};

export default RapportsHeures;
