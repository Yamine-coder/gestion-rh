// client/src/components/ui/Toast.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X, AlertCircle, Zap } from 'lucide-react';

// Couleur brand
const BRAND_COLOR = '#cf292c';

// Contexte pour les toasts
const ToastContext = createContext(null);

/**
 * Hook pour utiliser les toasts
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

/**
 * Composant Toast individuel
 */
function ToastItem({ toast, onRemove }) {
  const { id, type, title, message, duration = 4000 } = toast;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onRemove(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onRemove]);

  const typeConfig = {
    success: {
      icon: CheckCircle,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      iconColor: 'text-emerald-500',
      titleColor: 'text-emerald-800',
      messageColor: 'text-emerald-600'
    },
    error: {
      icon: XCircle,
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconColor: 'text-red-500',
      titleColor: 'text-red-800',
      messageColor: 'text-red-600'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconColor: 'text-amber-500',
      titleColor: 'text-amber-800',
      messageColor: 'text-amber-600'
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-600'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div 
      className={`flex items-start gap-3 p-4 rounded-xl border-2 shadow-lg backdrop-blur-sm animate-slide-in ${config.bg} ${config.border}`}
      style={{ minWidth: '320px', maxWidth: '420px' }}
    >
      <div className={`flex-shrink-0 ${config.iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-sm font-semibold ${config.titleColor}`}>{title}</p>
        )}
        {message && (
          <p className={`text-sm ${config.messageColor} ${title ? 'mt-1' : ''}`}>{message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Modale de confirmation personnalisée
 */
function ConfirmModal({ isOpen, onClose, onConfirm, config }) {
  if (!isOpen) return null;

  const {
    type = 'info',
    title = 'Confirmation',
    message = 'Êtes-vous sûr ?',
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    confirmColor = 'brand',
    icon: CustomIcon = null
  } = config;

  const typeConfig = {
    success: { icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-100' },
    error: { icon: XCircle, color: 'red', bg: 'bg-red-100' },
    warning: { icon: AlertTriangle, color: 'amber', bg: 'bg-amber-100' },
    info: { icon: Info, color: 'blue', bg: 'bg-blue-100' },
    brand: { icon: Zap, color: 'red', bg: 'bg-red-100' }
  };

  const tConfig = typeConfig[type] || typeConfig.info;
  const Icon = CustomIcon || tConfig.icon;

  const buttonColors = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    red: 'bg-red-600 hover:bg-red-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    brand: 'hover:opacity-90'
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header avec icône */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div 
              className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${tConfig.bg}`}
            >
              <Icon 
                className="w-6 h-6" 
                style={{ color: confirmColor === 'brand' ? BRAND_COLOR : undefined }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{message}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-lg ${
              confirmColor === 'brand' ? '' : buttonColors[confirmColor] || buttonColors.blue
            }`}
            style={confirmColor === 'brand' ? { backgroundColor: BRAND_COLOR } : {}}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modale d'alerte (information seule)
 */
function AlertModal({ isOpen, onClose, config }) {
  if (!isOpen) return null;

  const {
    type = 'info',
    title = 'Information',
    message = '',
    buttonText = 'OK',
    icon: CustomIcon = null,
    details = []
  } = config;

  const typeConfig = {
    success: { icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-100', iconBg: 'bg-emerald-500' },
    error: { icon: XCircle, color: 'red', bg: 'bg-red-100', iconBg: 'bg-red-500' },
    warning: { icon: AlertTriangle, color: 'amber', bg: 'bg-amber-100', iconBg: 'bg-amber-500' },
    info: { icon: Info, color: 'blue', bg: 'bg-blue-100', iconBg: 'bg-blue-500' }
  };

  const tConfig = typeConfig[type] || typeConfig.info;
  const Icon = CustomIcon || tConfig.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Contenu */}
        <div className="p-6">
          {/* Icône centrale */}
          <div className="flex justify-center mb-4">
            <div 
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${tConfig.bg}`}
            >
              <Icon className={`w-8 h-8 text-${tConfig.color}-600`} />
            </div>
          </div>

          {/* Titre et message */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-sm text-slate-600 whitespace-pre-line">{message}</p>
          </div>

          {/* Détails optionnels */}
          {details.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-2">
              {details.map((detail, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                  {detail.icon && <span>{detail.icon}</span>}
                  <span>{detail.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bouton */}
        <div className="px-6 py-4 bg-slate-50 flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-lg hover:opacity-90"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Provider pour les toasts et modales
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, config: {}, resolve: null });
  const [alertModal, setAlertModal] = useState({ isOpen: false, config: {} });

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Raccourcis pour les différents types
  const success = useCallback((title, message, duration) => {
    return addToast({ type: 'success', title, message, duration });
  }, [addToast]);

  const error = useCallback((title, message, duration) => {
    return addToast({ type: 'error', title, message, duration });
  }, [addToast]);

  const warning = useCallback((title, message, duration) => {
    return addToast({ type: 'warning', title, message, duration });
  }, [addToast]);

  const info = useCallback((title, message, duration) => {
    return addToast({ type: 'info', title, message, duration });
  }, [addToast]);

  // Modale de confirmation (retourne une Promise)
  const confirm = useCallback((config) => {
    return new Promise((resolve) => {
      setConfirmModal({ isOpen: true, config, resolve });
    });
  }, []);

  // Modale d'alerte (remplace alert())
  const alert = useCallback((config) => {
    if (typeof config === 'string') {
      config = { message: config };
    }
    setAlertModal({ isOpen: true, config });
  }, []);

  const handleConfirmClose = useCallback(() => {
    if (confirmModal.resolve) {
      confirmModal.resolve(false);
    }
    setConfirmModal({ isOpen: false, config: {}, resolve: null });
  }, [confirmModal.resolve]);

  const handleConfirm = useCallback(() => {
    if (confirmModal.resolve) {
      confirmModal.resolve(true);
    }
    setConfirmModal({ isOpen: false, config: {}, resolve: null });
  }, [confirmModal.resolve]);

  const handleAlertClose = useCallback(() => {
    setAlertModal({ isOpen: false, config: {} });
  }, []);

  const value = {
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    confirm,
    alert
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Container des toasts */}
      <div className="fixed top-4 right-4 z-[90] space-y-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>

      {/* Modale de confirmation */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleConfirmClose}
        onConfirm={handleConfirm}
        config={confirmModal.config}
      />

      {/* Modale d'alerte */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={handleAlertClose}
        config={alertModal.config}
      />

      {/* Styles d'animation */}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
