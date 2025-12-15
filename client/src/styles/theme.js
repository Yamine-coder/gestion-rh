/**
 * 🎨 SYSTÈME DE DESIGN - GESTION RH
 * Inspiré de Skello, Combo (Snapshift), Deputy, When I Work
 * 
 * Principes :
 * - Mobile-first avec une UX intuitive
 * - Couleurs vives mais professionnelles
 * - Espacements généreux pour le touch
 * - Micro-interactions fluides
 * - Accessibilité (contraste, taille touch)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// COULEURS
// ═══════════════════════════════════════════════════════════════════════════════

export const colors = {
  // Couleur principale de la marque
  brand: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626', // Principal
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    DEFAULT: '#dc2626'
  },
  
  // Couleurs sémantiques
  success: {
    light: '#d1fae5',
    DEFAULT: '#10b981',
    dark: '#047857'
  },
  warning: {
    light: '#fef3c7',
    DEFAULT: '#f59e0b',
    dark: '#b45309'
  },
  error: {
    light: '#fee2e2',
    DEFAULT: '#ef4444',
    dark: '#b91c1c'
  },
  info: {
    light: '#dbeafe',
    DEFAULT: '#3b82f6',
    dark: '#1d4ed8'
  },
  
  // Créneaux horaires (restauration)
  shift: {
    midi: '#f59e0b',      // Ambre - Service midi
    soir: '#6366f1',      // Indigo - Service soir
    coupure: '#f97316',   // Orange - Journée coupure
    continue: '#3b82f6',  // Bleu - Journée continue
    remplacement: '#8b5cf6' // Violet - Remplacement
  },
  
  // Statuts
  status: {
    pending: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
    cancelled: '#6b7280'
  },
  
  // Fond & Surface
  background: {
    light: '#f9fafb',
    dark: '#111827'
  },
  surface: {
    light: '#ffffff',
    dark: '#1f2937'
  },
  
  // Texte
  text: {
    primary: {
      light: '#111827',
      dark: '#f9fafb'
    },
    secondary: {
      light: '#6b7280',
      dark: '#9ca3af'
    },
    muted: {
      light: '#9ca3af',
      dark: '#6b7280'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ESPACEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const spacing = {
  // Padding/Margin standards
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  
  // Taille minimum touch (accessibilité)
  touchMin: '44px',
  
  // Rayons de bordure
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    full: '9999px'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHIE
// ═══════════════════════════════════════════════════════════════════════════════

export const typography = {
  fontFamily: {
    sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    mono: ['SF Mono', 'Fira Code', 'Consolas', 'monospace']
  },
  
  fontSize: {
    xs: ['11px', { lineHeight: '16px' }],
    sm: ['13px', { lineHeight: '20px' }],
    base: ['15px', { lineHeight: '24px' }],
    lg: ['17px', { lineHeight: '28px' }],
    xl: ['20px', { lineHeight: '28px' }],
    '2xl': ['24px', { lineHeight: '32px' }],
    '3xl': ['30px', { lineHeight: '36px' }],
    '4xl': ['36px', { lineHeight: '40px' }]
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// OMBRES
// ═══════════════════════════════════════════════════════════════════════════════

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  
  // Ombres colorées pour les cartes interactives
  brand: '0 4px 14px 0 rgb(220 38 38 / 0.25)',
  success: '0 4px 14px 0 rgb(16 185 129 / 0.25)',
  warning: '0 4px 14px 0 rgb(245 158 11 / 0.25)'
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const animations = {
  // Durées
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms'
  },
  
  // Easings
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS - STYLES PRÉDÉFINIS
// ═══════════════════════════════════════════════════════════════════════════════

export const components = {
  // Boutons
  button: {
    base: 'inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
    sizes: {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-4 text-sm',
      lg: 'h-12 px-6 text-base'
    },
    variants: {
      primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700',
      outline: 'border-2 border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800',
      ghost: 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
      danger: 'bg-red-600 text-white hover:bg-red-700'
    }
  },
  
  // Cartes
  card: {
    base: 'bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm',
    interactive: 'hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]',
    padding: {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5'
    }
  },
  
  // Inputs
  input: {
    base: 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
    label: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'
  },
  
  // Badges
  badge: {
    base: 'inline-flex items-center rounded-full font-medium',
    sizes: {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-xs',
      lg: 'px-3 py-1 text-sm'
    }
  },
  
  // Modales
  modal: {
    overlay: 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50',
    container: 'fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4',
    content: 'bg-white dark:bg-slate-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto animate-slideUp'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS - CLASSES UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

// Générer les classes pour un créneau horaire
export const getShiftColorClasses = (creneau) => {
  const creneauColors = {
    midi: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      accent: 'bg-amber-500'
    },
    soir: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      text: 'text-indigo-700 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-800',
      accent: 'bg-indigo-500'
    },
    coupure: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800',
      accent: 'bg-orange-500'
    },
    continue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      accent: 'bg-blue-500'
    }
  };
  
  return creneauColors[creneau] || creneauColors.continue;
};

// Générer les classes pour un statut
export const getStatusClasses = (status) => {
  const statusColors = {
    pending: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-400',
      dot: 'bg-amber-500'
    },
    approved: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      dot: 'bg-emerald-500'
    },
    rejected: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
      dot: 'bg-red-500'
    },
    cancelled: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
      dot: 'bg-gray-400'
    }
  };
  
  return statusColors[status] || statusColors.pending;
};

// Export de la couleur brand pour usage direct
export const brandColor = '#dc2626';

export default {
  colors,
  spacing,
  typography,
  shadows,
  animations,
  components,
  getShiftColorClasses,
  getStatusClasses,
  brandColor
};
