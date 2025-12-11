import React, { useState } from "react";
import { createPortal } from "react-dom";
import FormulaireCreationEmploye from "../components/FormulaireCreationEmploye";
import ListeEmployes from "../components/ListeEmployes";
import { UserPlus, X } from "lucide-react";

function GestionEmployesPage() {
  // Référence à la fonction de rafraîchissement de la liste des employés
  const [refreshEmployesList, setRefreshEmployesList] = useState(() => null);
  
  // État pour afficher/masquer la modale de création
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Cette fonction sera passée à ListeEmployes pour récupérer sa fonction fetchEmployes
  const registerRefreshFunction = (fetchFn) => {
    setRefreshEmployesList(() => fetchFn);
  };

  // Cette fonction sera appelée quand un employé est créé avec succès
  const handleEmployeCreated = () => {
    // Si la fonction de rafraîchissement est disponible, on l'appelle
    if (refreshEmployesList) {
      refreshEmployesList();
    }
    // Note: On ne ferme PAS la modale ici car le formulaire affiche la carte de confirmation
    // La modale sera fermée manuellement par l'utilisateur après l'envoi des identifiants
  };

  // Fermer la modale et rafraîchir
  const handleCloseModal = () => {
    setShowCreateModal(false);
    if (refreshEmployesList) {
      refreshEmployesList();
    }
  };

  return (
    <>
      {/* Liste des employés - Pleine largeur */}
      <ListeEmployes 
        onRegisterRefresh={registerRefreshFunction} 
        onCreateClick={() => setShowCreateModal(true)}
      />
      
      {/* Bouton flottant création - Mobile uniquement */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="sm:hidden fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center bg-[#cf292c] text-white shadow-red-500/30 transition-all hover:bg-[#b82427]"
      >
        <UserPlus size={24} />
      </button>

      {/* Modale de création d'employé */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={handleCloseModal}
          />
          
          {/* Contenu de la modale */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slideUp flex flex-col">
            {/* Header de la modale */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#cf292c]/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-[#cf292c]" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Nouvel employé</h2>
                  <p className="text-xs text-gray-500">Créez un nouveau compte utilisateur</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Corps de la modale - scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <FormulaireCreationEmploye 
                onEmployeCreated={handleEmployeCreated}
                onClose={handleCloseModal}
                isModal={true}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default GestionEmployesPage;
