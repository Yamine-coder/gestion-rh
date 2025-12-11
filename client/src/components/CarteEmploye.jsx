import React from 'react';
import { getCategoriesEmploye } from '../utils/categoriesConfig';
import { Lock, Info, Mail } from 'lucide-react';

const CarteEmploye = ({ employe, motDePasseTemporaire, className = '', compact = false }) => {
  // La fonction handleImprimer a été déplacée dans FormulaireCreationEmploye
  
  // Extraire les initiales
  const initiales = `${employe.prenom?.charAt(0) || ''}${employe.nom?.charAt(0) || ''}`;
  
  // Récupérer les catégories multiples (retourne des objets {label, color, Icon})
  const categoriesConfig = getCategoriesEmploye(employe);

  return (
    <div className={`${className} animate-fadeIn`}>
      {/* Carte sobre et moderne - adaptée si compact */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Entête avec initiales et nom */}
        <div className={`flex items-center gap-3 ${compact ? 'p-3' : 'p-4'} border-b border-gray-100`}>
          <div className={`${compact ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm'} rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600`}>
            {initiales}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900 truncate`}>{employe.prenom} {employe.nom}</h4>
            <div className="flex items-center gap-1.5 text-gray-500 mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              <span className="text-xs truncate">{employe.email}</span>
            </div>
          </div>
        </div>
        
        {/* Catégories - style sobre */}
        <div className={`${compact ? 'px-3 py-2' : 'px-4 py-3'} bg-gray-50 border-b border-gray-100`}>
          <div className="flex flex-wrap gap-1.5">
            {categoriesConfig.map((catConfig, index) => {
              const IconComponent = catConfig.Icon;
              return (
                <span 
                  key={index}
                  className={`inline-flex items-center gap-1 ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1'} rounded-md text-xs font-medium bg-white border border-gray-200 text-gray-700`}
                >
                  {IconComponent && <IconComponent className="w-3 h-3 text-gray-500" />}
                  {catConfig.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Identifiants de connexion */}
        <div className={`${compact ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Lock className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-[#cf292c]`} />
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Mot de passe temporaire</span>
          </div>
          
          <div className={`bg-[#cf292c] rounded-lg ${compact ? 'p-2 text-sm' : 'p-3 text-base'} font-mono text-white font-semibold tracking-widest text-center`}>
            {motDePasseTemporaire}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center gap-2 ${compact ? 'px-3 py-2' : 'px-4 py-3'} border-t border-gray-100 bg-amber-50`}>
          <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">À modifier lors de la première connexion</p>
        </div>
      </div>
    </div>
  );
};

export default CarteEmploye;
