import React, { useState } from "react";
import FormulaireCreationEmploye from "../components/FormulaireCreationEmploye";
import ListeEmployes from "../components/ListeEmployes";

function GestionEmployesPage() {
  // Référence à la fonction de rafraîchissement de la liste des employés
  const [refreshEmployesList, setRefreshEmployesList] = useState(() => null);

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
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulaire de création (1/3 de la largeur sur desktop) */}
        <div className="md:col-span-1">
          <FormulaireCreationEmploye onEmployeCreated={handleEmployeCreated} />
        </div>
        
        {/* Liste des employés (2/3 de la largeur sur desktop) */}
        <div className="md:col-span-2">
          <ListeEmployes onRegisterRefresh={registerRefreshFunction} />
        </div>
      </div>
    </div>
  );
}

export default GestionEmployesPage;
