import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCongesNotification } from "../hooks/useCongesNotification";
import "../styles/menu-animations.css";
import {
  Calendar as CalendarIcon,
  Users,
  Settings,
  BarChart,
  FileText,
  LogOut,
  Inbox,
  PieChart,
  Menu as MenuIcon,
  ChevronLeft,
} from "lucide-react";
import logo from "../assets/logo.jpg";

import DashboardOverview from "../components/DashboardOverview";
import FormulaireCreationEmploye from "../components/FormulaireCreationEmploye";
import ListeEmployes from "../components/ListeEmployes";
import CongesTable from "../components/CongesTable";
import StatsRH from "../components/StatsRH";
import PlanningRH from "../components/PlanningRH";
import VueJournaliereRH from "../components/VueJournaliereRH";
import RapportsHeures from "../components/RapportsHeures";
import Parametres from "../components/Parametres";
import { useNavigationCleanup } from "../hooks/useNavigationCleanup";

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [menu, setMenu] = useState("dashboard");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const { clearNavigation } = useNavigationCleanup();

  // Utilisation du hook personnalisé pour les notifications
  const { demandesEnAttente, loading: loadingBadge, refresh: refreshDemandesEnAttente } = useCongesNotification();
  
  // Badge dynamique avec animation de chargement si nécessaire
  // Ne pas afficher le badge s'il y a 0 demandes pour un aspect plus propre
  const demandesBadge = loadingBadge ? "..." : (demandesEnAttente > 0 ? demandesEnAttente : null);

  const menuItems = [
    { key: "dashboard", label: "Tableau de bord", icon: <BarChart size={20} /> },
    { key: "employes", label: "Employés", icon: <Users size={20} /> },
    { key: "vuejour", label: "Vue journalière", icon: <FileText size={20} /> },
    { key: "demandes", label: "Demandes de congés", icon: <Inbox size={20} />, badge: demandesBadge },
    { key: "rapports", label: "Rapports d'heures", icon: <BarChart size={20} /> },
    { key: "stats", label: "Statistiques RH", icon: <PieChart size={20} /> },
    { key: "planning", label: "Planning RH", icon: <CalendarIcon size={20} /> },
    { key: "settings", label: "Paramètres", icon: <Settings size={20} /> },
  ];

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    // Nettoyer toutes les données de navigation
    clearNavigation();
    // Supprimer le token
    localStorage.removeItem("token");
    // Rediriger vers la page de connexion
    navigate("/");
  };

  // Pour le tooltip
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ----- SIDEBAR DESKTOP AMÉLIORÉE ----- */}
      <aside
        className={`
          hidden lg:flex flex-col justify-between h-full bg-white shadow-lg transition-all duration-300 z-40
          ${sidebarOpen ? "w-72" : "w-20"}
        `}
        style={{ 
          minWidth: sidebarOpen ? "18rem" : "5rem", 
          borderRight: "1px solid rgba(235, 235, 235, 0.8)",
          background: "linear-gradient(to bottom, white, #fafafa)"
        }}
      >
        <div>
          {/* Header avec logo et effet de dégradé */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className={`flex items-center space-x-3 transition-all duration-300 ${!sidebarOpen && "opacity-0 w-0 overflow-hidden"}`}>
              <div className="relative logo-shine">
                <img 
                  src={logo} 
                  alt="Logo RH Manager" 
                  className="w-12 h-12 rounded-xl object-cover shadow-lg ring-2 ring-[#cf292c]/10 hover:ring-[#cf292c]/30 hover:shadow-xl transition-all duration-300"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-transparent via-transparent to-black/5"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">RH Manager</h1>
                <p className="text-xs text-gray-500 font-medium">Administration</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`
                p-2 rounded-lg bg-gray-100 hover:bg-gradient-to-br from-[#cf292c] to-[#e74c3c] hover:text-white transition-all duration-200
                transform ${sidebarOpen ? "" : "rotate-180"} shadow-sm hover:shadow
              `}
              aria-label={sidebarOpen ? "Réduire le menu" : "Étendre le menu"}
            >
              <ChevronLeft size={18} />
            </button>
          </div>
          
          {/* Navigation améliorée avec effet de dégradé et animations */}
          <nav className="space-y-2 px-4 py-6">
            {menuItems.map((item, idx) => (
              <div key={item.key} className="relative group">
                <button
                  onMouseEnter={() => !sidebarOpen && setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => !sidebarOpen && setHoveredIndex(idx)}
                  onBlur={() => setHoveredIndex(null)}
                  onClick={() => setMenu(item.key)}
                  className={`
                    flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20
                    ${menu === item.key
                      ? "bg-gradient-to-br from-[#cf292c] to-[#e74c3c] text-white shadow-md transform scale-[1.02]" 
                      : "text-gray-700 hover:bg-gray-50 hover:text-[#cf292c] hover:shadow-sm hover:scale-[1.01]"
                    }
                    ${sidebarOpen ? "justify-start gap-4" : "justify-center"}
                  `}
                >
                  <span className="flex-shrink-0 relative">
                    {item.icon}
                    {/* Badge pour menu collapsed avec animation améliorée */}
                    {item.badge && !sidebarOpen && (
                      <span className="absolute -top-2 -right-2 bg-gradient-to-r from-[#cf292c] to-[#e74c3c] text-white text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#cf292c] opacity-75"></span>
                        <span className="relative">
                          {loadingBadge ? "..." : (item.badge > 99 ? '99+' : item.badge)}
                        </span>
                      </span>
                    )}
                  </span>
                  
                  {/* Label et badge */}
                  {sidebarOpen && (
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium whitespace-nowrap">{item.label}</span>
                      {item.badge && (
                        <span className={`relative text-xs font-semibold px-2 py-1 rounded-full shadow-sm ${
                          menu === item.key 
                            ? "bg-white/20 text-white" 
                            : "bg-red-100 text-[#cf292c] border border-red-200"
                        }`}>
                          {!loadingBadge && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#cf292c] rounded-full animate-ping"></span>
                          )}
                          <span className="relative">
                            {loadingBadge ? "..." : item.badge}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </button>
                
                {/* Tooltip amélioré avec effet de dégradé */}
                {!sidebarOpen && hoveredIndex === idx && (
                  <div className="
                    absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity duration-200
                  ">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white text-sm px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                      {item.label}
                      {/* Flèche */}
                      <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2">
                        <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
        
        {/* Footer avec déconnexion amélioré */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/50">
          <button
            onClick={handleLogout}
            className={`
              flex items-center w-full p-3 rounded-xl text-gray-600 
              hover:text-white hover:bg-gradient-to-br from-[#cf292c] to-[#e74c3c] transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20 shadow-sm hover:shadow
              ${sidebarOpen ? "gap-3" : "justify-center"}
            `}
          >
            <LogOut size={18} />
            {sidebarOpen && <span className="font-medium">Se déconnecter</span>}
          </button>
        </div>
      </aside>

      {/* ----- SIDEBAR MOBILE AMÉLIORÉE ----- */}
      {sidebarMobileOpen && (
        <>
          {/* Overlay avec transition */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
            onClick={() => setSidebarMobileOpen(false)}
          />
          
          {/* Drawer amélioré */}
          <aside className="fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col transition-transform duration-300">
            {/* Header mobile avec logo réel */}
            <div className="bg-[#cf292c] text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative logo-shine">
                    <img 
                      src={logo} 
                      alt="Logo RH Manager" 
                      className="w-12 h-12 rounded-xl object-cover shadow-lg ring-2 ring-white/20 hover:ring-white/40 hover:shadow-xl transition-all duration-300"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-transparent via-transparent to-black/10"></div>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">RH Manager</h1>
                    <p className="text-sm text-red-100 font-medium">Administration mobile</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarMobileOpen(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Fermer le menu"
                >
                  <ChevronLeft size={20} className="text-white" />
                </button>
              </div>
            </div>
            
            {/* Navigation mobile améliorée */}
            <nav className="overflow-y-auto flex-1 px-6 py-6 space-y-2">
              {menuItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => {
                    setMenu(item.key);
                    setSidebarMobileOpen(false);
                  }}
                  className={`
                    flex items-center gap-4 w-full px-4 py-3 rounded-xl transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20
                    ${menu === item.key
                      ? "bg-gradient-to-r from-[#cf292c] to-[#e74c3c] text-white shadow-md" 
                      : "text-gray-700 hover:bg-gray-50 hover:text-[#cf292c]"
                    }
                  `}
                >
                  <span className={`flex-shrink-0 relative transition-transform duration-200 ${menu === item.key ? "scale-110" : ""}`}>
                    {item.icon}
                  </span>
                  <div className="flex-1 text-left">
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`
                      relative text-xs font-semibold px-2 py-1 rounded-full shadow-sm
                      ${menu === item.key 
                        ? "bg-white/20 text-white" 
                        : "bg-red-100 text-[#cf292c] border border-red-200"
                      }
                    `}>
                      {!loadingBadge && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#cf292c] rounded-full animate-ping"></span>
                      )}
                      <span className="relative">
                        {loadingBadge ? "..." : item.badge}
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </nav>
            
            {/* Footer mobile amélioré */}
            <div className="border-t border-gray-200 p-6 bg-gray-50/50">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full p-3 rounded-xl text-gray-600 
                hover:text-white hover:bg-gradient-to-br from-[#cf292c] to-[#e74c3c] 
                transition-all duration-200 shadow-sm hover:shadow 
                focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20"
              >
                <LogOut size={18} />
                <span className="font-medium">Se déconnecter</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ----- MAIN CONTENT AMÉLIORÉ ----- */}
      <main className="flex-1 overflow-y-auto transition-all duration-300 bg-gray-50">
        {/* Header amélioré */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarMobileOpen(true)}
                className="
                  lg:hidden p-3 rounded-xl bg-[#cf292c] text-white shadow-md
                  hover:bg-[#b91c1c] transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20
                "
                aria-label="Ouvrir le menu"
              >
                <MenuIcon size={20} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {menuItems.find(item => item.key === menu)?.label || "Tableau de bord"}
                </h2>
                <p className="text-sm text-gray-600 hidden sm:block">
                  Interface d'administration des ressources humaines
                </p>
              </div>
            </div>
            
            {/* Informations contextuelles */}
            <div className="hidden md:flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Système actif</span>
              </div>
              <div className="text-right">
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Contenu principal */}
        <div className="p-6">
          {menu === "dashboard" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <DashboardOverview hideTitle={true} onGoToConges={()=>setMenu('demandes')} />
            </div>
          )}
          {menu === "employes" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <FormulaireCreationEmploye hideTitle={true} />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <ListeEmployes hideTitle={true} />
              </div>
            </div>
          )}
          {menu === "vuejour" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <VueJournaliereRH hideTitle={true} />
            </div>
          )}
          {menu === "demandes" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <CongesTable hideTitle={true} onCongeUpdate={refreshDemandesEnAttente} />
            </div>
          )}
          {menu === "rapports" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <RapportsHeures hideTitle={true} />
            </div>
          )}
          {menu === "stats" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <StatsRH hideTitle={true} />
            </div>
          )}
          {menu === "planning" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <PlanningRH hideTitle={true} />
            </div>
          )}
          {menu === "settings" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <Parametres hideTitle={true} />
            </div>
          )}
        </div>
      </main>

        {/* Modal confirmation de déconnexion - design amélioré */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm mx-auto animate-scaleIn">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmer la déconnexion ?</h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir vous déconnecter de l'application ?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#cf292c] hover:bg-[#b52429] rounded-lg transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
