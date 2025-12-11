import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Calendar as CalendarIcon,
  Users,
  Settings,
  BarChart3,
  FileText,
  LogOut,
  Inbox,
  PieChart,
  Menu as MenuIcon,
  X,
  User,
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  Bell,
  ChevronDown,
  Check,
  Trash2,
  AlertTriangle,
  Banknote,
} from "lucide-react";
import logo from "../assets/logo.jpg";
import { useNotifications } from "../hooks/useNotifications";
import { useNavigoNotification } from "../hooks/useNavigoNotification";

/**
 * TopNavAdmin - Navigation horizontale améliorée style Skello
 * Barre de navigation supérieure optimisée pour l'interface admin RH
 */
export default function TopNavAdmin({
  currentMenu,
  onMenuChange,
  onLogout,
  demandesBadge = null,
  loadingBadge = false,
}) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // État pour les données utilisateur
  const [userData, setUserData] = useState({ nom: '', prenom: '', email: '', role: '' });

  // Charger les données utilisateur au montage
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await axios.get('http://localhost:5000/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setUserData({
          nom: response.data.nom || '',
          prenom: response.data.prenom || '',
          email: response.data.email || '',
          role: response.data.role || ''
        });
      } catch (error) {
        console.error('Erreur chargement profil:', error);
      }
    };
    
    fetchUserData();
  }, []);

  // Formater le nom complet
  const displayName = userData.prenom && userData.nom 
    ? `${userData.prenom} ${userData.nom}` 
    : 'Administrateur';
  
  const roleLabel = userData.role === 'admin' ? 'Admin RH' : 'Utilisateur';

  // Hook pour les vraies notifications
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  // Hook pour les notifications Navigo (justificatifs en attente)
  const { enAttente: navigoEnAttente } = useNavigoNotification();

  // Organisation hiérarchique des menus - Principaux en premier
  const menuItems = [
    { 
      key: "dashboard", 
      label: "Tableau de bord", 
      icon: LayoutDashboard, 
      short: "Dashboard",
      priority: "high",
      description: "Vue d'ensemble"
    },
    { 
      key: "planning", 
      label: "Planning", 
      icon: CalendarIcon, 
      short: "Planning",
      priority: "high",
      description: "Gestion des plannings"
    },
    { 
      key: "employes", 
      label: "Employés", 
      icon: Users, 
      short: "Employés",
      badge: navigoEnAttente > 0 ? navigoEnAttente : null,
      badgeColor: "amber", // Badge orange pour Navigo
      priority: "high",
      description: navigoEnAttente > 0 ? `${navigoEnAttente} justificatif(s) Navigo en attente` : "Gérer les employés"
    },
    { 
      key: "vuejour", 
      label: "Vue journalière", 
      icon: FileText, 
      short: "Vue jour",
      priority: "medium",
      description: "Pointages du jour"
    },
    { 
      key: "demandes", 
      label: "Congés", 
      icon: Inbox, 
      short: "Congés",
      badge: demandesBadge,
      priority: "medium",
      description: "Demandes de congés"
    },
    { 
      key: "rapports", 
      label: "Rapports", 
      icon: ClipboardList, 
      short: "Rapports",
      priority: "medium",
      description: "Rapports d'heures"
    },
    { 
      key: "stats", 
      label: "Statistiques", 
      icon: TrendingUp, 
      short: "Stats",
      priority: "low",
      description: "Analytics RH"
    },
    // Anomalies retirées - maintenant intégrées dans le Planning
  ];

  // Calculer le nombre total de notifications (vraies notifs + demandes en attente)
  const totalNotifications = unreadCount;

  // Formater la date des notifications
  const formatNotifDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'À l\'instant';
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days}j`;
    
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // Icône selon le type de notification
  const getNotifIcon = (type) => {
    switch (type) {
      case 'nouvelle_demande_conge':
        return <CalendarIcon size={16} className="text-blue-600" />;
      case 'modification_demande_conge':
        return <FileText size={16} className="text-amber-600" />;
      case 'justificatif_ajoute':
        return <ClipboardList size={16} className="text-emerald-600" />;
      default:
        return <Bell size={16} className="text-gray-600" />;
    }
  };

  // Parser le message de notification (peut etre JSON ou texte simple)
  const parseNotifMessage = (message) => {
    if (!message) return { text: '', congeId: null, employeNom: null };
    try {
      const parsed = JSON.parse(message);
      return {
        text: parsed.text || message,
        congeId: parsed.congeId || null,
        employeNom: parsed.employeNom || null
      };
    } catch {
      // Message texte simple (anciennes notifications)
      return { text: message, congeId: null, employeNom: null };
    }
  };

  // Gestion du clic sur une notification
  const handleNotificationClick = (notif) => {
    const { congeId } = parseNotifMessage(notif.message);
    console.log('🔔 Clic notification:', { notifId: notif.id, type: notif.type, congeId, message: notif.message });
    
    // Marquer comme lue
    if (!notif.lue) {
      markAsRead(notif.id);
    }
    
    // Fermer le dropdown
    setShowNotifications(false);
    
    // Naviguer vers la page des conges avec l'ID a highlighter
    if (congeId && ['nouvelle_demande_conge', 'modification_demande_conge', 'justificatif_ajoute'].includes(notif.type)) {
      console.log('🔔 Navigation avec highlight vers congé:', congeId);
      onMenuChange({ menu: 'demandes', highlightCongeId: congeId });
    } else {
      // Navigation simple vers les conges
      console.log('🔔 Navigation simple (pas de congeId)');
      onMenuChange('demandes');
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    setShowProfileMenu(false);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    setShowMobileMenu(false);
    onLogout();
  };

  // Fermer les dropdowns au clic ailleurs
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowProfileMenu(false);
      setShowNotifications(false);
    };
    if (showProfileMenu || showNotifications) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showProfileMenu, showNotifications]);

  return (
    <>
      {/* Navigation Top - Design Moderne et Épuré */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="mx-auto px-6 lg:px-8">
          <div className="flex items-center h-16">
            
            {/* Logo + Titre - Minimaliste */}
            <div className="flex items-center gap-3 flex-shrink-0 mr-12">
              <div className="relative">
                <img 
                  src={logo} 
                  alt="RH Manager" 
                  className="w-9 h-9 rounded-xl object-cover shadow-sm"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-semibold text-gray-900 tracking-tight">RH Manager</h1>
              </div>
            </div>

            {/* Navigation Desktop - Minimaliste et Épurée */}
            <div className="hidden lg:flex items-center flex-1 gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentMenu === item.key;
                const isPriority = item.priority === "high";
                
                return (
                  <button
                    key={item.key}
                    onClick={() => onMenuChange(item.key)}
                    className={`
                      relative flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg
                      ${isActive 
                        ? 'text-[#cf292c] bg-red-50/80' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                    title={item.description}
                  >
                    <Icon size={18} strokeWidth={isPriority ? 2.5 : 2} className={isActive ? 'text-[#cf292c]' : ''} />
                    <span className="whitespace-nowrap">{item.short}</span>
                    
                    {/* Badge notifications - Design épuré */}
                    {item.badge && (
                      <span className={`ml-auto min-w-[20px] h-5 px-2 rounded-full text-white text-xs font-semibold flex items-center justify-center shadow-sm ${
                        item.badgeColor === 'amber' ? 'bg-amber-500' : 'bg-[#cf292c]'
                      }`}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                    
                    {/* Indicateur actif - Ligne subtile */}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#cf292c] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Actions droite - Design épuré */}
            <div className="hidden lg:flex items-center gap-3 ml-auto">
              
              {/* Notifications - Minimaliste */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotifications(!showNotifications);
                    setShowProfileMenu(false);
                  }}
                  className="relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                  title="Notifications"
                >
                  <Bell size={20} strokeWidth={2} />
                  {totalNotifications > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-[#cf292c] rounded-full ring-2 ring-white" />
                  )}
                </button>

                {/* Dropdown Notifications - Design premium */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-3 w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-200/60 overflow-hidden z-50">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#cf292c]/10 flex items-center justify-center">
                            <Bell size={18} className="text-[#cf292c]" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-[15px]">Notifications</h3>
                            {unreadCount > 0 && (
                              <p className="text-xs text-gray-500">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
                            )}
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAllAsRead();
                            }}
                            className="text-xs text-[#cf292c] hover:text-[#b52429] font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Tout marquer lu
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Liste des notifications */}
                    <div className="max-h-[420px] overflow-y-auto">
                      {notifications.length > 0 ? (
                        <div className="py-2">
                          {notifications.slice(0, 10).map((notif, index) => {
                            const { text: messageText } = parseNotifMessage(notif.message);
                            return (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`relative mx-2 mb-1 px-3 py-2.5 rounded-lg transition-all group cursor-pointer ${
                                !notif.lue 
                                  ? 'bg-gray-50 hover:bg-gray-100' 
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Icône avec couleur selon type */}
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  notif.type === 'nouvelle_demande_conge' 
                                    ? 'bg-gray-100 text-[#cf292c]' :
                                  notif.type === 'modification_demande_conge' 
                                    ? 'bg-gray-100 text-gray-600' :
                                  notif.type === 'justificatif_ajoute' 
                                    ? 'bg-gray-100 text-emerald-600' 
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {notif.type === 'nouvelle_demande_conge' && <CalendarIcon size={18} />}
                                  {notif.type === 'modification_demande_conge' && <FileText size={18} />}
                                  {notif.type === 'justificatif_ajoute' && <ClipboardList size={18} />}
                                  {!['nouvelle_demande_conge', 'modification_demande_conge', 'justificatif_ajoute'].includes(notif.type) && <Bell size={18} />}
                                </div>
                                
                                {/* Contenu */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className={`text-sm leading-tight ${!notif.lue ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                      {notif.titre?.replace(/^[^\w\sÀ-ÿ]+/u, '').trim()}
                                    </p>
                                    <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap bg-gray-100 px-2 py-0.5 rounded-full">
                                      {formatNotifDate(notif.date_creation)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{messageText}</p>
                                </div>
                              </div>
                              
                              {/* Actions au hover */}
                              <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                {!notif.lue && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notif.id);
                                    }}
                                    className="p-1.5 rounded-lg bg-white shadow-sm border border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                                    title="Marquer comme lu"
                                  >
                                    <Check size={12} />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notif.id);
                                  }}
                                  className="p-1.5 rounded-lg bg-white shadow-sm border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-300 transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              
                              {/* Indicateur non lu */}
                              {!notif.lue && (
                                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-[#cf292c]" />
                              )}
                            </div>
                          )})}
                        </div>
                      ) : (
                        <div className="px-5 py-14 text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <Bell size={28} className="text-gray-300" strokeWidth={1.5} />
                          </div>
                          <p className="text-sm font-semibold text-gray-900 mb-1">Aucune notification</p>
                          <p className="text-xs text-gray-500">Vous êtes à jour !</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Séparateur vertical */}
              <div className="w-px h-8 bg-gray-200" />

              {/* Profil utilisateur - Design moderne */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileMenu(!showProfileMenu);
                    setShowNotifications(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl transition-all"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-[#cf292c] to-[#b52429] rounded-xl flex items-center justify-center shadow-sm">
                    <User size={18} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div className="hidden xl:block text-left">
                    <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-500">{roleLabel}</p>
                  </div>
                  <ChevronDown size={16} className={`hidden xl:block text-gray-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Profile - Design sobre */}
                {showProfileMenu && (
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#cf292c] to-[#b52429] rounded-lg flex items-center justify-center flex-shrink-0">
                          <User size={18} className="text-white" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                          <p className="text-xs text-gray-500">{roleLabel}</p>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onMenuChange('settings');
                          setShowProfileMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-3 transition-colors"
                      >
                        <Settings size={16} />
                        <span>Paramètres</span>
                      </button>
                      <button
                        onClick={handleLogoutClick}
                        className="w-full px-4 py-2.5 text-sm text-[#cf292c] hover:bg-red-50 text-left flex items-center gap-3 transition-colors"
                      >
                        <LogOut size={16} />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bouton menu mobile - Design épuré */}
            <button
              onClick={() => setShowMobileMenu(true)}
              className="lg:hidden p-2.5 ml-auto text-gray-600 hover:bg-gray-50 rounded-xl transition-all relative"
            >
              <MenuIcon size={22} strokeWidth={2} />
              {totalNotifications > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#cf292c] rounded-full ring-2 ring-white" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Menu Mobile - Drawer Amélioré */}
      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 lg:hidden flex flex-col">
            
            {/* Header drawer - Amélioré avec profil */}
            <div className="p-4 border-b bg-gradient-to-r from-[#cf292c] to-red-600">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="RH Manager" className="w-10 h-10 rounded-lg ring-2 ring-white/20" />
                  <div>
                    <h2 className="text-base font-bold text-white">RH Manager</h2>
                    <p className="text-xs text-red-100">Administration</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Profil admin dans le drawer */}
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <User size={18} className="text-[#cf292c]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                  <p className="text-xs text-red-100 truncate">{userData.email || 'admin@rhmanager.com'}</p>
                </div>
              </div>

              {/* Notifications badge */}
              {totalNotifications > 0 && (
                <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2">
                  <Bell size={16} className="text-white" />
                  <span className="text-xs text-white font-medium">
                    {totalNotifications} notification{totalNotifications > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Navigation mobile - Organisée par priorité */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Menus principaux */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Principal</p>
                <div className="space-y-1">
                  {menuItems.filter(item => item.priority === 'high').map((item) => {
                    const Icon = item.icon;
                    const isActive = currentMenu === item.key;
                    
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          onMenuChange(item.key);
                          setShowMobileMenu(false);
                        }}
                        className={`
                          w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all
                          ${isActive 
                            ? 'bg-[#cf292c] text-white shadow-md' 
                            : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                      >
                        <Icon size={20} strokeWidth={2.5} />
                        <span className="flex-1 text-sm font-semibold">{item.label}</span>
                        
                        {item.badge && (
                          <span className={`
                            min-w-[22px] h-5 px-2 rounded-full text-xs font-bold flex items-center justify-center
                            ${isActive 
                              ? 'bg-white ' + (item.badgeColor === 'amber' ? 'text-amber-600' : 'text-[#cf292c]')
                              : (item.badgeColor === 'amber' ? 'bg-amber-500 text-white' : 'bg-[#cf292c] text-white')
                            }
                          `}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Menus secondaires */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Gestion</p>
                <div className="space-y-1">
                  {menuItems.filter(item => item.priority === 'medium').map((item) => {
                    const Icon = item.icon;
                    const isActive = currentMenu === item.key;
                    
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          onMenuChange(item.key);
                          setShowMobileMenu(false);
                        }}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
                          ${isActive 
                            ? 'bg-[#cf292c] text-white shadow-md' 
                            : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                      >
                        <Icon size={18} />
                        <span className="flex-1 text-sm font-medium">{item.label}</span>
                        
                        {item.badge && (
                          <span className={`
                            min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center
                            ${isActive 
                              ? 'bg-white ' + (item.badgeColor === 'amber' ? 'text-amber-600' : 'text-[#cf292c]')
                              : (item.badgeColor === 'amber' ? 'bg-amber-500 text-white' : 'bg-[#cf292c] text-white')
                            }
                          `}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Menus admin */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Administration</p>
                <div className="space-y-1">
                  {menuItems.filter(item => item.priority === 'low').map((item) => {
                    const Icon = item.icon;
                    const isActive = currentMenu === item.key;
                    
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          onMenuChange(item.key);
                          setShowMobileMenu(false);
                        }}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
                          ${isActive 
                            ? 'bg-[#cf292c] text-white shadow-md' 
                            : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                      >
                        <Icon size={18} />
                        <span className="flex-1 text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer drawer - Amélioré */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-3 px-4 py-3 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm font-semibold shadow-md"
              >
                <LogOut size={18} />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal confirmation déconnexion */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmer la déconnexion</h3>
              <p className="text-gray-600 mb-6 text-sm">Êtes-vous sûr de vouloir vous déconnecter ?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}