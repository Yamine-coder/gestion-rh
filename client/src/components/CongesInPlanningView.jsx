// CongesInPlanningView.jsx
// Composant pour afficher les congés dans le planning avec détection de conflits

import React from 'react';
import { AlertTriangle, Users, Clock, CheckCircle, XCircle } from 'lucide-react';

// Badge congé avec indicateur de conflit
function CongeBadgeWithConflict({ conge, conflicts = null, isGhost = false }) {
  const getConflictIndicator = () => {
    if (!conflicts) return null;
    
    switch (conflicts.conflictLevel) {
      case 'critical':
        return <AlertTriangle size={12} className="text-red-500 animate-pulse" />;
      case 'high':
        return <AlertTriangle size={12} className="text-orange-500" />;
      case 'medium':
        return <Users size={12} className="text-yellow-500" />;
      case 'low':
        return <Users size={12} className="text-blue-500" />;
      default:
        return null;
    }
  };

  const getConflictBorder = () => {
    if (!conflicts) return '';
    
    switch (conflicts.conflictLevel) {
      case 'critical': return 'border-l-4 border-red-500';
      case 'high': return 'border-l-4 border-orange-500';
      case 'medium': return 'border-l-4 border-yellow-500';
      case 'low': return 'border-l-4 border-blue-500';
      default: return '';
    }
  };

  // Style pour les congés en attente (fantôme)
  const ghostStyle = isGhost 
    ? 'opacity-60 border-2 border-dashed animate-pulse' 
    : 'border border-solid';

  // Couleur selon le statut
  const getStatusColor = () => {
    if (conge.statut === 'approuvé') {
      return conge.type === "RTT" 
        ? "bg-yellow-50 text-yellow-700" 
        : "bg-[#ffd6d6] text-[#cf292c]";
    }
    if (conge.statut === 'en attente') {
      return 'bg-gray-50 text-gray-600';
    }
    if (conge.statut === 'refusé') {
      return 'bg-red-50 text-red-400 line-through';
    }
    return 'bg-gray-50 text-gray-500';
  };

  const getStatusIcon = () => {
    switch (conge.statut) {
      case 'approuvé': return <CheckCircle size={10} className="text-green-500" />;
      case 'en attente': return <Clock size={10} className="text-gray-400" />;
      case 'refusé': return <XCircle size={10} className="text-red-400" />;
      default: return null;
    }
  };

  return (
    <div
      className={`rounded-md px-2 py-1.5 text-xs font-medium flex flex-col items-center relative ${getStatusColor()} ${ghostStyle} ${getConflictBorder()}`}
      title={`${conge.type} ${conge.statut}${conflicts ? ` (Impact: ${conflicts.conflictLevel})` : ''}`}
    >
      <div className="flex items-center gap-1 w-full justify-between">
        <span className="tracking-wider uppercase">{conge.type}</span>
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          {getConflictIndicator()}
        </div>
      </div>
      
      {conge.motif && (
        <span className="text-gray-500 font-normal text-[10px] mt-0.5">{conge.motif}</span>
      )}
      
      {isGhost && (
        <span className="text-[9px] font-bold mt-1 bg-orange-100 text-orange-600 px-1 py-0.5 rounded">
          EN ATTENTE
        </span>
      )}
      
      {conflicts && conflicts.conflictLevel !== 'none' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white shadow-sm flex items-center justify-center">
          <span className={`w-2 h-2 rounded-full ${
            conflicts.conflictLevel === 'critical' ? 'bg-red-500' :
            conflicts.conflictLevel === 'high' ? 'bg-orange-500' :
            conflicts.conflictLevel === 'medium' ? 'bg-yellow-500' :
            'bg-blue-500'
          }`} />
        </div>
      )}
    </div>
  );
}

// Fonction utilitaire pour enrichir les congés avec les analyses de conflits
export const enrichCongesWithConflicts = (conges, employes) => {
  const { detectConflicts } = require('../utils/congeConflicts');
  
  return conges.map(conge => {
    // Détecter les conflits seulement pour les congés en attente ou approuvés
    if (conge.statut === 'en attente' || conge.statut === 'approuvé') {
      const conflicts = detectConflicts(conges, employes, conge.dateDebut, conge.dateFin, conge.userId);
      return { ...conge, conflicts };
    }
    return conge;
  });
};

// Composant principal exporté pour l'intégration dans le planning
export function CongesCellWithConflicts({ 
  conge, 
  conflicts, 
  onClick = () => {},
  className = "" 
}) {
  const isGhost = conge.statut === 'en attente';
  
  return (
    <div 
      className={`cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={() => onClick(conge)}
    >
      <CongeBadgeWithConflict 
        conge={conge} 
        conflicts={conflicts} 
        isGhost={isGhost} 
      />
    </div>
  );
}

// Composant de légende pour expliquer les indicateurs
export function CongesLegend() {
  return (
    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
      <h4 className="font-medium text-gray-800 mb-2 text-sm">Légende des congés</h4>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-[#ffd6d6] border border-solid rounded"></div>
          <span>Congé approuvé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-gray-50 border-2 border-dashed rounded opacity-60"></div>
          <span>Demande en attente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Conflit critique (80%+ équipe)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span>Conflit élevé (60%+ équipe)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span>Conflit modéré (40%+ équipe)</span>
        </div>
      </div>
    </div>
  );
}

export default CongeBadgeWithConflict;
