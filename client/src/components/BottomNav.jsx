import { NavLink } from "react-router-dom";
import { HomeIcon, ClockIcon, CalendarIcon, UserIcon, QrCodeIcon } from "@heroicons/react/24/outline";
import { useState, useContext } from "react";
import { QRCodeCanvas } from 'qrcode.react';
import { X, Zap } from "lucide-react";
import { ThemeContext } from '../context/ThemeContext';

// Liste centralisée
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
  const { theme } = useContext(ThemeContext); // eslint-disable-line no-unused-vars
  const token = localStorage.getItem('token');

  const openQuickQR = (e) => {
    e.preventDefault();
    setShowQuickQR(true);
  };

  const closeQuickQR = () => {
    setShowQuickQR(false);
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
        <div className="mx-auto max-w-7xl px-6 py-2">
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
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Content Spacer - Hauteur réduite */}
      <div className="hidden lg:block h-14"></div>

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

      {/* Modal QR Code Fullscreen - Mode Rapide */}
      {showQuickQR && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm transition-colors">
            <button
              onClick={closeQuickQR}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors z-10"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>
            
            <div className="p-8 text-center">
              {/* Header */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                  <QrCodeIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">Mon QR Code</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Mode rapide</p>
                </div>
              </div>
              
              {/* QR Code */}
              <div className="bg-white p-6 rounded-2xl mb-6 shadow-inner">
                <QRCodeCanvas 
                  value={token || ''} 
                  size={240}
                  className="mx-auto"
                  level="M"
                  includeMargin={true}
                />
              </div>
              
              {/* Instructions */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Présentez ce code à la badgeuse
                  </p>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                  <p>• Gardez votre téléphone stable</p>
                  <p>• Assurez-vous d'avoir un bon éclairage</p>
                  <p>• Distance recommandée: 15-30cm</p>
                </div>
              </div>
              
              {/* Bouton fermeture */}
              <button
                onClick={closeQuickQR}
                className="mt-6 w-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-slate-100 font-medium py-3 px-4 rounded-xl transition-colors"
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
