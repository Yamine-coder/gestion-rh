import { NavLink } from "react-router-dom";
import { HomeIcon, ClockIcon, CalendarIcon, UserIcon, QrCodeIcon, BellIcon, BoltIcon, HandThumbUpIcon } from "@heroicons/react/24/outline";
import { useState, useContext } from "react";
import { QRCodeCanvas } from 'qrcode.react';
import { X, QrCode, Smartphone, Sun, Ruler } from "lucide-react";
import { ThemeContext } from '../context/ThemeContext';
import NotificationsModal from './NotificationsModal';
import { useNotifications } from '../hooks/useNotifications';

// Navigation mobile optimisée - 5 éléments essentiels
const NAV_ITEMS = (pendingLeaves, hasNotifications) => [
  { key: 'home', to: '/home', label: 'Accueil', icon: HomeIcon },
  { key: 'pointage', to: '/pointage', label: 'Pointage', icon: ClockIcon },
  { key: 'scan', to: '/pointage', label: 'Mon QR', icon: QrCodeIcon, cta: true },
  { key: 'conges', to: '/mes-conges', label: 'Congés', icon: CalendarIcon, badge: pendingLeaves },
  { key: 'profil', to: '/employee/profil', label: 'Profil', icon: UserIcon, dot: hasNotifications },
];

export default function BottomNav({ pendingLeaves = 0, hasNotifications = false }) {
  const items = NAV_ITEMS(pendingLeaves, hasNotifications);
  const [showQuickQR, setShowQuickQR] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { theme } = useContext(ThemeContext); // eslint-disable-line no-unused-vars
  
  // Hook centralisé pour les notifications
  const {
    notifications,
    unreadCount,
    loading: loadingNotifs,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const openQuickQR = (e) => {
    e.preventDefault();
    setShowQuickQR(true);
  };

  const closeQuickQR = () => {
    setShowQuickQR(false);
  };

  const openNotifications = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowNotifications(true);
  };

  // Mobile: Bottom navigation (existing styles)
  const base = "group relative flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl transition-all duration-200 ease-out sm:px-3 sm:py-3 lg:px-4 lg:py-3.5 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-1";
  const idle = "text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400";
  const active = "text-primary-600 dark:text-primary-400";

  const iconWrap = (isActive) => [
    "grid place-items-center w-10 h-10 rounded-xl transition-all duration-200 ease-out sm:w-11 sm:h-11 lg:w-12 lg:h-12",
    isActive
      ? "bg-primary-50 dark:bg-primary-900/20 shadow-sm ring-1 ring-primary-100 dark:ring-primary-800/40"
      : "bg-transparent group-hover:bg-primary-50/60 dark:group-hover:bg-primary-900/15",
  ].join(" ");

  const ActiveMark = () => (
    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary-600 dark:bg-primary-400" />
  );

  const Badge = ({ children }) => children ? (
    <span className="absolute -right-0.5 -top-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-600 text-white text-[10px] leading-[18px] text-center shadow-sm shadow-primary-600/30">{children}</span>
  ) : null;

  const NotificationDot = () => (
    <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-primary-500 ring-1 ring-white dark:ring-slate-900" />
  );

  return (
    <>
      {/* Desktop: Top Navigation Bar - Optimisé pour la lisibilité */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm shadow-black/3 dark:shadow-black/15" role="navigation" aria-label="Navigation principale">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between h-10">
            {/* Logo/Brand - Logo restaurant optimisé */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center shadow-sm">
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41-6.88-6.88 1.47-1.47z"/>
                </svg>
              </div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-white">Espace Employé</h1>
            </div>
            
            {/* Desktop Navigation Items - Espacement optimisé */}
            <div className="flex items-center gap-2">
              {items.filter(item => !item.cta).map(item => (
                <NavLink key={item.key} to={item.to} className={({ isActive }) => [
                  "group relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2",
                  isActive 
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm" 
                    : "text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"
                ].join(' ')}>
                  {({ isActive }) => (
                    <>
                      <item.icon className="h-4 w-4 transition-colors flex-shrink-0" />
                      <span className="font-medium text-sm">{item.label}</span>
                      {item.badge && (
                        <span className="ml-1 min-w-[16px] h-4 px-1 rounded-full bg-primary-600 text-white text-xs leading-4 text-center font-medium">{item.badge}</span>
                      )}
                      {item.dot && !item.badge && (
                        <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary-600 flex-shrink-0" />
                      )}
                      {isActive && (
                        <div className="absolute inset-x-1 bottom-0 h-px bg-primary-600" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
              
              {/* Desktop CTA Button - Mode rapide QR */}
              {items.find(item => item.cta) && (
                <div className="ml-3">
                  <button 
                    onClick={openQuickQR}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 shadow-sm"
                  >
                    <QrCodeIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium text-sm">Mon QR</span>
                  </button>
                </div>
              )}
              
              {/* Desktop Notifications Button */}
              <div className="relative ml-2">
                <button 
                  onClick={openNotifications}
                  className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
                  aria-label="Notifications"
                >
                  <BellIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-600 text-white text-[10px] leading-[18px] text-center font-semibold shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Content Spacer - Hauteur réduite */}
      <div className="hidden lg:block h-14"></div>

      {/* Mobile: Top Header Bar - avec safe-area pour iOS PWA */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo + Titre */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41-6.88-6.88 1.47-1.47z"/>
              </svg>
            </div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-white">Espace Employé</h1>
          </div>
          
          {/* Icône Notification Mobile */}
          <button 
            onClick={openNotifications}
            className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Notifications"
          >
            <BellIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-600 text-white text-[10px] leading-[18px] text-center font-semibold shadow-sm">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>
      
      {/* Modal Notifications - Utilisé pour mobile et desktop */}
      <NotificationsModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDelete={deleteNotification}
        loading={loadingNotifs}
      />

      {/* Mobile: Bottom Navigation Bar - Design incurvé premium */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        role="navigation" 
        aria-label="Navigation principale"
      >
        {/* Container principal - hauteur réduite */}
        <div className="relative h-[56px]">
          
          {/* FAB Central - Bouton flottant compact */}
          <button 
            onClick={openQuickQR}
            aria-label="Mon QR Code"
            className="absolute left-1/2 -translate-x-1/2 -top-5 z-10 group"
          >
            <div 
              className="w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-200 ease-out group-active:scale-95"
              style={{
                backgroundColor: '#dc2626',
                boxShadow: '0 2px 12px rgba(220, 38, 38, 0.35), 0 0 0 3px white'
              }}
            >
              {/* QR Code Icon */}
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 11h2v2H3v-2zm8-6h2v4h-2V5zm-2 6h4v4h-2v-2H9v-2zm6 0h2v2h2v-2h2v2h-2v2h2v4h-2v2h-2v-2h-4v2h-2v-4h4v-2h2v-2h-2v-2zm4 8v-4h-2v4h2zM15 3h6v6h-6V3zm2 2v2h2V5h-2zM3 3h6v6H3V3zm2 2v2h2V5H5zM3 15h6v6H3v-6zm2 2v2h2v-2H5z"/>
              </svg>
            </div>
          </button>

          {/* SVG Background avec découpe incurvée */}
          <svg 
            className="absolute inset-0 w-full h-full" 
            viewBox="0 0 375 56" 
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <path 
              d="M0 20C0 8.954 8.954 0 20 0H145C150 0 154 1.5 157 4.5C164 11.5 173 20 187.5 20C202 20 211 11.5 218 4.5C221 1.5 225 0 230 0H355C366.046 0 375 8.954 375 20V56H0V20Z"
              fill="#dc2626"
            />
          </svg>

          {/* Navigation Items - compact */}
          <div className="relative h-full px-4">
            <div className="mx-auto h-full grid grid-cols-5 items-center">
              
              {/* Accueil */}
              <NavLink 
                to="/home"
                className={({ isActive }) => `flex items-center justify-center h-full ${isActive ? 'text-white' : 'text-white/60'}`}
              >
                {({ isActive }) => (
                  <HomeIcon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.2 : 1.5} />
                )}
              </NavLink>
              
              {/* Pointage */}
              <NavLink 
                to="/pointage"
                className={({ isActive }) => `flex items-center justify-center h-full ${isActive ? 'text-white' : 'text-white/60'}`}
              >
                {({ isActive }) => (
                  <svg className="h-[22px] w-[22px]" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isActive ? 0 : 1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </NavLink>
              
              {/* Espace vide pour le FAB */}
              <div />
              
              {/* Congés */}
              <NavLink 
                to="/mes-conges"
                className={({ isActive }) => `relative flex items-center justify-center h-full ${isActive ? 'text-white' : 'text-white/60'}`}
              >
                {({ isActive }) => (
                  <>
                    <CalendarIcon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.2 : 1.5} />
                    {pendingLeaves > 0 && (
                      <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full bg-white text-red-600 text-[9px] leading-4 text-center font-bold">
                        {pendingLeaves}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
              
              {/* Profil */}
              <NavLink 
                to="/employee/profil"
                className={({ isActive }) => `relative flex items-center justify-center h-full ${isActive ? 'text-white' : 'text-white/60'}`}
              >
                {({ isActive }) => (
                  <>
                    <svg className="h-[22px] w-[22px]" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isActive ? 0 : 1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    {hasNotifications && (
                      <span className="absolute top-2 right-3 h-2 w-2 rounded-full bg-white" />
                    )}
                  </>
                )}
              </NavLink>
              
            </div>
          </div>
        </div>
      </nav>

      {/* Modal QR Code - Minimaliste et moderne */}
      {showQuickQR && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl" 
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4rem)' }}
          onClick={closeQuickQR}
        >
          <style>{`
            @keyframes modalIn {
              0% { opacity: 0; transform: translateY(10px); }
              100% { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <div 
            className="relative bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-[340px] sm:max-w-[360px] overflow-hidden shadow-2xl"
            style={{ animation: 'modalIn 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Accent de marque subtil en haut */}
            <div className="h-1 bg-red-500" />
            
            <div className="p-5 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <QrCode className="w-5 h-5 text-red-500" strokeWidth={2} />
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Mon QR Code</h3>
                </div>
                <button
                  onClick={closeQuickQR}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
              
              {/* QR Code - Full width */}
              <div className="bg-gray-50 dark:bg-zinc-800 p-3 sm:p-4 rounded-xl aspect-square flex items-center justify-center">
                <QRCodeCanvas 
                  value={localStorage.getItem('token') || ''} 
                  size={280}
                  className="w-full h-full max-w-full"
                  level="H"
                  includeMargin={false}
                  bgColor="#fafafa"
                  fgColor="#18181b"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              
              {/* Tips minimalistes avec icônes Lucide */}
              <div className="mt-4 flex items-center justify-center gap-4 sm:gap-5 text-[11px] text-gray-400 dark:text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Stable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Éclairé</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>15-30cm</span>
                </div>
              </div>
              
              {/* Bouton fermer */}
              <button
                onClick={closeQuickQR}
                className="mt-4 w-full py-3 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors active:scale-[0.98]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
