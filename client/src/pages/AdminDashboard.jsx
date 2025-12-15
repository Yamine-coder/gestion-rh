import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCongesNotification } from "../hooks/useCongesNotification";
import "../styles/menu-animations.css";

import TopNavAdmin from "../components/TopNavAdmin";

import DashboardOverview from "../components/DashboardOverview";
import GestionEmployesPage from "./GestionEmployesPage";
import CongesTable from "../components/CongesTable";
import Performance from "../components/Performance";
import PlanningRH from "../components/PlanningRH";
import VueJournaliereRH from "../components/VueJournaliereRH";
import RapportsHeures from "../components/RapportsHeures";
import Parametres from "../components/Parametres";
import GestionAnomalies from "./GestionAnomalies";
import SuiviExtras from "./SuiviExtras";
import { useNavigationCleanup } from "../hooks/useNavigationCleanup";

export default function AdminDashboard() {
  const [menu, setMenu] = useState("dashboard");
  const [highlightCongeId, setHighlightCongeId] = useState(null); // ID du congé à highlighter
  const navigate = useNavigate();
  const { clearNavigation } = useNavigationCleanup();

  // Utilisation du hook personnalisé pour les notifications
  const { demandesEnAttente, loading: loadingBadge, refresh: refreshDemandesEnAttente } = useCongesNotification();
  
  // Badge dynamique
  const demandesBadge = loadingBadge ? "..." : (demandesEnAttente > 0 ? demandesEnAttente : null);

  // Gestionnaire de changement de menu avec support pour highlight
  const handleMenuChange = (menuOrObject) => {
    if (typeof menuOrObject === 'object' && menuOrObject !== null) {
      // Navigation avec paramètres (ex: { menu: 'demandes', highlightCongeId: 123 })
      setMenu(menuOrObject.menu);
      if (menuOrObject.highlightCongeId) {
        setHighlightCongeId(menuOrObject.highlightCongeId);
      }
    } else {
      // Navigation simple
      setMenu(menuOrObject);
      setHighlightCongeId(null);
    }
  };

  const handleLogout = () => {
    clearNavigation();
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col">
      {/* Navigation Top - Style Moderne */}
      <TopNavAdmin
        currentMenu={menu}
        onMenuChange={handleMenuChange}
        onLogout={handleLogout}
        demandesBadge={demandesBadge}
        loadingBadge={loadingBadge}
      />

      {/* Contenu principal - Design épuré */}
      <main className="flex-1 overflow-y-auto">
        <div className={menu === 'planning' ? '' : 'max-w-[1600px] mx-auto p-6 lg:p-8'}>
          {menu === "dashboard" && (
            <DashboardOverview onGoToConges={() => setMenu('demandes')} />
          )}
          {menu === "employes" && <GestionEmployesPage />}
          {menu === "vuejour" && <VueJournaliereRH />}
          {menu === "demandes" && (
            <CongesTable 
              onCongeUpdate={refreshDemandesEnAttente} 
              highlightCongeId={highlightCongeId}
              onHighlightComplete={() => setHighlightCongeId(null)}
            />
          )}
          {menu === "rapports" && <RapportsHeures />}
          {menu === "performance" && <Performance />}
          {menu === "planning" && <PlanningRH />}
          {menu === "anomalies" && <GestionAnomalies />}
          {menu === "extras" && <SuiviExtras />}
          {menu === "settings" && <Parametres />}
        </div>
      </main>
    </div>
  );
}
