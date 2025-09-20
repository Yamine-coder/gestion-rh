// client/src/pages/GestionAnomalies.jsx
import React, { useState } from 'react';
import { AlertTriangle, Filter, RefreshCw, Search, Eye, Calendar, User } from 'lucide-react';
import { useAnomalies } from '../hooks/useAnomalies';
import { anomaliesUtils } from '../hooks/useAnomalies';
import ModalTraiterAnomalie from '../components/anomalies/ModalTraiterAnomalie';

export default function GestionAnomalies() {
  const [filtres, setFiltres] = useState({
    employeId: '',
    dateDebut: '',
    dateFin: '',
    statut: '',
    type: '',
    gravite: ''
  });
  
  const [recherche, setRecherche] = useState('');
  const [anomalieSelectionnee, setAnomalieSelectionnee] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const { 
    anomalies, 
    loading, 
    error, 
    pagination, 
    refresh, 
    fetchAnomalies 
  } = useAnomalies({
    ...filtres,
    autoRefresh: true,
    refreshInterval: 30000
  });

  // Appliquer les filtres
  const handleFilterChange = (key, value) => {
    setFiltres(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFiltres({
      employeId: '',
      dateDebut: '',
      dateFin: '',
      statut: '',
      type: '',
      gravite: ''
    });
    setRecherche('');
  };

  // Filtrer les anomalies localement selon la recherche
  const anomaliesFiltrees = anomalies.filter(anomalie => {
    if (!recherche) return true;
    const searchTerm = recherche.toLowerCase();
    return (
      anomalie.description.toLowerCase().includes(searchTerm) ||
      anomalie.employe?.nom?.toLowerCase().includes(searchTerm) ||
      anomalie.employe?.prenom?.toLowerCase().includes(searchTerm) ||
      anomaliesUtils.getTypeLabel(anomalie.type).toLowerCase().includes(searchTerm)
    );
  });

  const handleTraiterAnomalie = (anomalie) => {
    setAnomalieSelectionnee(anomalie);
  };

  const handleAnomalieTraitee = () => {
    refresh();
    setAnomalieSelectionnee(null);
  };

  // Statistiques rapides
  const stats = {
    total: anomaliesFiltrees.length,
    enAttente: anomaliesFiltrees.filter(a => a.statut === 'en_attente').length,
    critiques: anomaliesFiltrees.filter(a => a.gravite === 'critique').length,
    aValider: anomaliesFiltrees.filter(a => a.gravite === 'a_valider').length
  };

  return (
    <div className="space-y-6">
      
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Anomalies</h1>
            <p className="text-sm text-gray-600">
              Suivi et validation des écarts de pointage
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
              showFilters 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtres
          </button>
          
          <button
            onClick={refresh}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-8 bg-gray-400 rounded-full"></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-8 bg-blue-400 rounded-full"></div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.enAttente}</p>
              <p className="text-sm text-gray-600">En attente</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-8 bg-red-400 rounded-full"></div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.critiques}</p>
              <p className="text-sm text-gray-600">Critiques</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-8 bg-orange-400 rounded-full"></div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.aValider}</p>
              <p className="text-sm text-gray-600">À valider</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employé ID
              </label>
              <input
                type="number"
                value={filtres.employeId}
                onChange={(e) => handleFilterChange('employeId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date début
              </label>
              <input
                type="date"
                value={filtres.dateDebut}
                onChange={(e) => handleFilterChange('dateDebut', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date fin
              </label>
              <input
                type="date"
                value={filtres.dateFin}
                onChange={(e) => handleFilterChange('dateFin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                value={filtres.statut}
                onChange={(e) => handleFilterChange('statut', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous</option>
                <option value="en_attente">En attente</option>
                <option value="validee">Validée</option>
                <option value="refusee">Refusée</option>
                <option value="corrigee">Corrigée</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gravité
              </label>
              <select
                value={filtres.gravite}
                onChange={(e) => handleFilterChange('gravite', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Toutes</option>
                <option value="critique">Critique</option>
                <option value="hors_plage">Hors plage</option>
                <option value="attention">Attention</option>
                <option value="a_valider">À valider</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filtres.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous</option>
                <option value="retard">Retard</option>
                <option value="hors_plage">Hors plage</option>
                <option value="absence_totale">Absence totale</option>
                <option value="presence_non_prevue">Présence non prévue</option>
                <option value="depart_anticipe">Départ anticipé</option>
                <option value="heures_sup">Heures supplémentaires</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par description, employé, type..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Liste des anomalies */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des anomalies...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">Erreur: {error}</p>
            <button
              onClick={refresh}
              className="text-blue-600 hover:underline"
            >
              Réessayer
            </button>
          </div>
        ) : anomaliesFiltrees.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucune anomalie trouvée</p>
            {recherche && (
              <p className="text-sm text-gray-500 mt-1">
                Essayez de modifier vos critères de recherche
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gravité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {anomaliesFiltrees.map((anomalie) => {
                  const graviteStyle = anomaliesUtils.getGraviteStyle(anomalie.gravite);
                  const statutStyle = anomaliesUtils.getStatutStyle(anomalie.statut);

                  return (
                    <tr key={anomalie.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {anomalie.employe?.prenom} {anomalie.employe?.nom}
                            </p>
                            <p className="text-xs text-gray-500">
                              ID: {anomalie.employeId}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {anomaliesUtils.formatDate(anomalie.date)}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {anomaliesUtils.getTypeLabel(anomalie.type)}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm text-gray-900 truncate" title={anomalie.description}>
                          {anomalie.description}
                        </p>
                        {anomalie.heuresExtra && (
                          <p className="text-xs text-gray-500 mt-1">
                            {anomalie.heuresExtra}h {anomalie.montantExtra && `(${anomalie.montantExtra}€)`}
                          </p>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${graviteStyle.bg} ${graviteStyle.color}`}>
                          <span>{graviteStyle.icon}</span>
                          <span>{anomalie.gravite}</span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statutStyle.bg} ${statutStyle.color}`}>
                          {statutStyle.label}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        {anomalie.statut === 'en_attente' ? (
                          <button
                            onClick={() => handleTraiterAnomalie(anomalie)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Traiter
                          </button>
                        ) : (
                          <div className="text-xs text-gray-500">
                            {anomalie.traiteur && (
                              <p>Par: {anomalie.traiteur.prenom} {anomalie.traiteur.nom}</p>
                            )}
                            {anomalie.traiteAt && (
                              <p>{anomaliesUtils.formatDate(anomalie.traiteAt)}</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="px-6 py-3 border-t bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de {pagination.offset + 1} à {Math.min(pagination.offset + pagination.limit, pagination.total)} sur {pagination.total} anomalies
            </div>
            {pagination.hasMore && (
              <button
                onClick={() => fetchAnomalies({ 
                  offset: pagination.offset + pagination.limit,
                  limit: pagination.limit 
                })}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
              >
                Charger plus
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modale de traitement */}
      {anomalieSelectionnee && (
        <ModalTraiterAnomalie
          anomalie={anomalieSelectionnee}
          onClose={() => setAnomalieSelectionnee(null)}
          onTraited={handleAnomalieTraitee}
        />
      )}
    </div>
  );
}
