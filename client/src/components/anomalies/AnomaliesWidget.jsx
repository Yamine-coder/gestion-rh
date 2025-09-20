// client/src/components/anomalies/AnomaliesWidget.jsx
import React from 'react';
import { AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { useAnomaliesStats } from '../../hooks/useAnomalies';
import { anomaliesUtils } from '../../hooks/useAnomalies';

/**
 * Widget compact des anomalies pour le dashboard admin
 */
export default function AnomaliesWidget({ 
  employeId = null, 
  periode = 'semaine',
  onViewAll = null,
  onViewAnomalie = null,
  className = ''
}) {
  const { stats, anomaliesRecentes, loading, error, refresh } = useAnomaliesStats({
    employeId,
    periode,
    autoRefresh: true,
    refreshInterval: 30000
  });

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600">Erreur: {error}</p>
          <button
            onClick={refresh}
            className="text-sm text-blue-600 hover:underline mt-2"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const periodeLabel = periode === 'jour' ? 'aujourd\'hui' : 
                     periode === 'semaine' ? 'cette semaine' : 'ce mois';

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* En-tête */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold text-gray-900">Anomalies</h3>
          <span className="text-sm text-gray-500">({periodeLabel})</span>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            <Eye className="h-4 w-4" />
            Tout voir
          </button>
        )}
      </div>

      {/* Statistiques principales */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.enAttente || 0}</div>
            <div className="text-xs text-gray-500">En attente</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.validees || 0}</div>
            <div className="text-xs text-gray-500">Validées</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.refusees || 0}</div>
            <div className="text-xs text-gray-500">Refusées</div>
          </div>
        </div>

        {/* Répartition par gravité */}
        {stats.parGravite && Object.keys(stats.parGravite).length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Par gravité</h4>
            <div className="space-y-2">
              {Object.entries(stats.parGravite).map(([gravite, count]) => {
                const style = anomaliesUtils.getGraviteStyle(gravite);
                return (
                  <div key={gravite} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{style.icon}</span>
                      <span className={style.color}>{gravite}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Anomalies récentes */}
        {anomaliesRecentes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Récentes</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {anomaliesRecentes.map((anomalie) => {
                const graviteStyle = anomaliesUtils.getGraviteStyle(anomalie.gravite);
                const statutStyle = anomaliesUtils.getStatutStyle(anomalie.statut);
                
                return (
                  <div
                    key={anomalie.id}
                    className={`p-2 rounded-md border cursor-pointer hover:bg-gray-50 ${graviteStyle.bg} ${graviteStyle.border}`}
                    onClick={() => onViewAnomalie?.(anomalie)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs">{graviteStyle.icon}</span>
                          <span className="text-xs font-medium text-gray-700">
                            {anomalie.employe?.prenom} {anomalie.employe?.nom}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statutStyle.bg} ${statutStyle.color}`}>
                            {statutStyle.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 truncate" title={anomalie.description}>
                          {anomalie.description}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {anomaliesUtils.formatDate(anomalie.date)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* État vide */}
        {stats.total === 0 && (
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Aucune anomalie {periodeLabel}</p>
            <p className="text-xs text-gray-400">Tout semble en ordre !</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Badge compact d'anomalies pour affichage inline (ex: dans planning)
 */
export function AnomaliesBadge({ 
  employeId, 
  date, 
  anomalies = [],
  onClick = null,
  showCount = true 
}) {
  if (!anomalies.length) return null;

  // Déterminer la gravité maximale
  const graviteOrder = ['critique', 'hors_plage', 'attention', 'a_valider', 'info', 'ok'];
  const maxGravite = anomalies.reduce((max, anomalie) => {
    const currentIndex = graviteOrder.indexOf(anomalie.gravite);
    const maxIndex = graviteOrder.indexOf(max);
    return currentIndex < maxIndex ? anomalie.gravite : max;
  }, 'ok');

  const style = anomaliesUtils.getGraviteStyle(maxGravite);

  // Compter les anomalies en attente
  const enAttente = anomalies.filter(a => a.statut === 'en_attente').length;
  const displayCount = showCount && enAttente > 0 ? enAttente : anomalies.length;

  return (
    <button
      onClick={() => onClick?.(employeId, date, anomalies)}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80 ${style.bg} ${style.color} ${style.border} border`}
      title={`${anomalies.length} anomalie(s) dont ${enAttente} en attente`}
    >
      <span>{style.icon}</span>
      {showCount && <span>{displayCount}</span>}
    </button>
  );
}
