import { NavLink } from "react-router-dom";
import { HomeIcon, ClockIcon, CalendarIcon, UserIcon, QrCodeIcon, BellIcon, BoltIcon } from "@heroicons/react/24/outline";
import { useState, useContext } from "react";
import { QRCodeCanvas } from 'qrcode.react';
import { X } from "lucide-react";
import { ThemeContext } from '../context/ThemeContext';
import NotificationsModal from './NotificationsModal';
import { useNotifications } from '../hooks/useNotifications';

// Navigation mobile optimisée - 5 éléments essentiels
const NAV_ITEMS = (pendingLeaves, hasNotifications) => [
  { key: 'home', to: '/home', label: 'Accueil', icon: HomeIcon },
  { key: 'pointage', to: '/pointage', label: 'Pointage', icon: ClockIcon },
  { key: 'scan', to: '/pointage', label: 'Mon QR', icon: QrCodeIcon, cta: true },
  { key: 'mes-conges', to: '/mes-conges', label: 'Congés', icon: CalendarIcon, badge: pendingLeaves ? (pendingLeaves > 9 ? '9+' : String(pendingLeaves)) : null },
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

      {/* Mobile: Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-800/60 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.4)] px-4 pt-2 pb-[calc(env(safe-area-inset-bottom,0)+10px)] sm:px-6" role="navigation" aria-label="Navigation principale">
        <div className="mx-auto w-full max-w-4xl grid grid-cols-5 items-end gap-1 sm:gap-2">
          {items.map(item => item.cta ? (
            <button key={item.key} onClick={openQuickQR} aria-label={item.label} className="relative -mt-6 justify-self-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-1 rounded-2xl">
              <div className="relative grid place-items-center h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/25 dark:shadow-primary-900/40 ring-3 ring-white dark:ring-slate-900 transition-all duration-200 ease-out group-hover:shadow-xl group-hover:shadow-primary-600/30 group-active:scale-95 sm:h-16 sm:w-16">
                <item.icon className="h-7 w-7 sm:h-8 sm:w-8 transition-transform duration-200" />
              </div>
              <span className="mt-1 block text-[10px] text-center text-primary-600 dark:text-primary-400 sm:text-[11px]">{item.label}</span>
            </button>
          ) : (
            <NavLink key={item.key} to={item.to} className={({ isActive }) => [base, isActive ? active : idle].join(' ')}>
              {({ isActive }) => (
                <>
                  {isActive && <ActiveMark />}
                  <div className={iconWrap(isActive)}>
                    <item.icon className={`h-5 w-5 sm:h-6 sm:w-6 transition-all duration-200 ease-out`} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] truncate">{item.label}</span>
                  {item.badge && (
                    <div className="absolute -top-0.5 right-1"><Badge>{item.badge}</Badge></div>
                  )}
                  {item.dot && !item.badge && (
                    <NotificationDot />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Modal QR Code Fullscreen - Compact et aéré, avec safe-area pour iOS */}
      {showQuickQR && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 lg:p-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4rem)' }}>
          <div className="relative bg-white dark:bg-slate-800 rounded-xl lg:rounded-2xl shadow-2xl w-full max-w-[90vw] lg:max-w-md max-h-full overflow-auto transition-all duration-300">
            <button
              onClick={closeQuickQR}
              className="absolute top-2 right-2 lg:top-3 lg:right-3 w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
              aria-label="Fermer"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-slate-300" />
            </button>
            
            <div className="p-4 lg:p-6 text-center">
              {/* Header compact */}
              <div className="flex items-center justify-center gap-2 mb-3 lg:mb-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-md shadow-primary-500/30">
                  <QrCodeIcon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-base lg:text-xl font-bold text-gray-900 dark:text-slate-100 leading-tight">Mon QR Code</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Présentez-le à la badgeuse</p>
                </div>
              </div>
              
              {/* QR Code compact */}
              <div className="relative group mb-3 lg:mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-400/15 to-primary-600/15 rounded-xl blur-lg transition-all duration-300 opacity-50" />
                <div className="relative bg-white p-3 lg:p-4 rounded-lg shadow-lg border border-gray-100 dark:border-slate-700">
                  <QRCodeCanvas 
                    value={localStorage.getItem('token') || ''} 
                    size={window.innerWidth >= 1024 ? 240 : 200}
                    className="mx-auto"
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
              
              {/* Instructions compactes */}
              <div className="space-y-2 lg:space-y-3">
                <div className="flex items-center gap-2 p-2.5 lg:p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg border border-blue-200 dark:border-blue-800">
                  <BoltIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="text-xs lg:text-sm font-medium text-blue-800 dark:text-blue-200 text-left">
                    Présentez ce code à la badgeuse pour pointer
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-[10px] lg:text-xs text-gray-600 dark:text-slate-400">
                  <div className="flex flex-col items-center gap-1 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <span className="text-sm lg:text-base">📱</span>
                    <span className="text-center leading-tight">Téléphone stable</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <span className="text-sm lg:text-base">💡</span>
                    <span className="text-center leading-tight">Bon éclairage</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <span className="text-sm lg:text-base">📏</span>
                    <span className="text-center leading-tight">15-30cm</span>
                  </div>
                </div>
              </div>
              
              {/* Bouton compact */}
              <button
                onClick={closeQuickQR}
                className="mt-3 lg:mt-4 w-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 hover:from-gray-200 hover:to-gray-300 dark:hover:from-slate-600 dark:hover:to-slate-500 text-gray-900 dark:text-slate-100 font-semibold py-2 lg:py-2.5 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-xs lg:text-sm"
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
