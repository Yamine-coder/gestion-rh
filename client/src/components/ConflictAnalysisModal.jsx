import { X } from "lucide-react";
import { detectConflicts, generateRecommendations } from "../utils/congeConflicts";

// Composant Modal d'analyse des conflits - VERSION MINIMALISTE ET SOBRE
export default function ConflictAnalysisModal({ conge, employes, allConges, onClose, onApprove, onReject }) {

  // Analyser les conflits
  const conflicts = detectConflicts(allConges, employes, conge.dateDebut, conge.dateFin, conge.userId);
  const recommendations = generateRecommendations(conflicts, conge.dateDebut, conge.dateFin);
  
  // Trouver l'employé demandeur
  const demandeur = employes.find(e => e.id === conge.userId);
  const categorieDemandeur = demandeur?.categorie || 'general';
  
  // Calculer les statistiques d'impact
  const totalInCategory = employes.filter(e => (e.categorie || 'general') === categorieDemandeur).length;
  const impactPercentage = Math.round((conflicts.sameCategory.length + 1) * 100 / totalInCategory);
  
  // Couleurs selon le niveau de conflit - Version minimaliste
  const getConflictColor = (level) => {
    switch (level) {
      case 'critical': return 'border-red-200 bg-red-50/30';
      case 'high': return 'border-orange-200 bg-orange-50/30';
      case 'medium': return 'border-yellow-200 bg-yellow-50/30';
      case 'low': return 'border-blue-200 bg-blue-50/30';
      default: return 'border-green-200 bg-green-50/30';
    }
  };

  // Couleurs pour les barres de progression
  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-orange-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  // Titre selon le niveau - Version sobre
  const getConflictTitle = (level) => {
    switch (level) {
      case 'critical': return 'Conflit critique';
      case 'high': return 'Conflit élevé';
      case 'medium': return 'Conflit modéré';
      case 'low': return 'Impact faible';
      default: return 'Aucun conflit';
    }
  };



  return (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      {/* Container responsive plein écran mobile */}
      <div className="bg-white sm:rounded-lg sm:shadow-lg w-full sm:max-w-4xl max-h-[100vh] sm:max-h-[90vh] border border-gray-200 flex flex-col animate-[fadeIn_0.18s_ease-out]">
        
        {/* En-tête minimaliste sticky */}
        <div className="flex-shrink-0 bg-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 sticky top-0 z-10">
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-[#cf292c] rounded-full hidden sm:block"></div>
              <div className="space-y-0.5">
                <h2 className="text-base sm:text-lg font-medium text-gray-900 leading-tight">Analyse de conflit</h2>
                <p className="text-xs sm:text-sm text-gray-500">Évaluation des impacts</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors rounded-md hover:bg-gray-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300/60">
          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            
            {/* Informations de la demande - Ultra minimaliste */}
            <div className="border border-gray-200 rounded-md p-3 sm:p-4">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-700 font-medium text-sm sm:text-base">
                    {demandeur?.nom?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm sm:text-base leading-tight">{demandeur?.nom || 'Inconnu'} {demandeur?.prenom || ''}</div>
                  <div className="text-xs sm:text-sm text-gray-500">{categorieDemandeur} • {conge.type}</div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm gap-1">
                <span className="text-gray-500">Période</span>
                <span className="font-medium text-gray-900 tracking-tight">
                  {new Date(conge.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → {new Date(conge.dateFin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            </div>

            {/* Niveau d'impact - Design épuré */}
            <div className={`border rounded-md p-3 sm:p-4 ${getConflictColor(conflicts.conflictLevel)}`}>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${getProgressColor(impactPercentage)}`}></div>
                  <span className="font-medium text-gray-900 text-sm sm:text-base">{getConflictTitle(conflicts.conflictLevel)}</span>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-900">{impactPercentage}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2 sm:mb-3 overflow-hidden">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(impactPercentage)}`} style={{ width: `${impactPercentage}%` }} />
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-gray-900">{totalInCategory}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">Total</div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-medium text-gray-900">{conflicts.sameCategory.length}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">Absents</div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-medium text-gray-900">{totalInCategory - conflicts.sameCategory.length - 1}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">Dispo</div>
                </div>
              </div>
            </div>

            {/* Recommandations - Design épuré */}
            {recommendations.length > 0 && (
              <div className="space-y-1.5 sm:space-y-2">
                <div className="text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">Recommandations</div>
                {recommendations.map((rec, index) => (
                  <div key={index} className={`text-xs sm:text-sm p-2.5 sm:p-3 rounded-md ${
                    rec.type === 'error' ? 'bg-red-50 text-red-700 border-l-2 border-red-300' :
                    rec.type === 'warning' ? 'bg-orange-50 text-orange-700 border-l-2 border-orange-300' :
                    rec.type === 'success' ? 'bg-green-50 text-green-700 border-l-2 border-green-300' :
                    'bg-blue-50 text-blue-700 border-l-2 border-blue-300'
                  }`}>
                    {rec.message}
                  </div>
                ))}
              </div>
            )}

            {/* Liste des conflits - Design minimaliste */}
            {conflicts.sameCategory.length > 0 && (
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="text-xs sm:text-sm font-medium text-gray-900">Conflits ({conflicts.sameCategory.length})</div>
                  <span className="text-[10px] sm:text-xs text-gray-500">Même catégorie</span>
                </div>
                <div className="divide-y divide-gray-100 max-h-48 overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300/40">
                  {conflicts.sameCategory.map((conflict, index) => (
                    <div key={index} className="p-2.5 sm:p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-700 font-medium text-[11px] sm:text-xs">
                              {conflict.employe.nom?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div className="truncate">
                            <div className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                              {conflict.employe.nom} {conflict.employe.prenom}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <div className="text-[11px] sm:text-xs text-gray-900 leading-tight">
                            {new Date(conflict.conge.dateDebut).toLocaleDateString('fr-FR', { 
                              day: '2-digit', 
                              month: 'short'
                            })} → {new Date(conflict.conge.dateFin).toLocaleDateString('fr-FR', { 
                              day: '2-digit', 
                              month: 'short'
                            })}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">
                            {conflict.conge.type}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer sticky responsive */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-white border-t border-gray-200 sticky bottom-0 z-10 shadow-[0_-2px_4px_-2px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getProgressColor(impactPercentage)}`}></div>
              <span className="text-xs sm:text-sm text-gray-600">{getConflictTitle(conflicts.conflictLevel)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
              <button
                onClick={onClose}
                className="col-span-1 sm:col-span-1 px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => onReject(conge.id)}
                className="col-span-1 px-3 sm:px-4 py-2 text-xs sm:text-sm text-white bg-[#cf292c] rounded-md hover:bg-[#b32528] transition-colors"
              >
                Refuser
              </button>
              <button
                onClick={() => onApprove(conge.id)}
                className={`col-span-1 px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md transition-colors ${
                  conflicts.conflictLevel === 'critical'
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                disabled={conflicts.conflictLevel === 'critical'}
              >
                Approuver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
