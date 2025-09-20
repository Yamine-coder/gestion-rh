import React from 'react';

const CarteEmploye = ({ employe, motDePasseTemporaire, className = '' }) => {
  // La fonction handleImprimer a été déplacée dans FormulaireCreationEmploye
  
  // Extraire les initiales
  const initiales = `${employe.prenom?.charAt(0) || ''}${employe.nom?.charAt(0) || ''}`;

  return (
    <div className={`${className} animate-fadeIn`}>
      {/* Carte complètement redessinée selon design moderne */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Entête avec initiales et nom */}
        <div className="flex items-center gap-3 p-3 border-b border-gray-50">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-sm font-medium text-[#cf292c]">
            {initiales}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-800">{employe.prenom} {employe.nom}</h4>
              <span className="px-2 py-0.5 rounded-full text-2xs bg-gray-100 text-gray-600">{employe.categorie}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{employe.email}</p>
          </div>
        </div>

        {/* Identifiants de connexion */}
        <div className="p-3 bg-gray-50">
          <div className="flex items-center gap-2 mb-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs font-medium text-gray-700">Mot de passe</span>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-md p-2 font-mono text-sm text-gray-800 font-medium tracking-wide relative mb-0.5">
            {motDePasseTemporaire}
            <div className="absolute -left-1 -top-1 w-4 h-4 bg-white rounded-full border border-gray-200 flex items-center justify-center">
              <div className="w-2 h-2 bg-[#cf292c] rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-gray-500">À modifier lors de la 1ère connexion</p>
          </div>
          
          {/* Le bouton d'impression a été déplacé dans le composant parent */}
          <span className="text-2xs text-gray-400">Informations de connexion</span>
        </div>
      </div>
    </div>
  );
};

export default CarteEmploye;
