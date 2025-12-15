import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  XMarkIcon, 
  BellIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  TrashIcon,
  CalendarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftIcon,
  ChevronRightIcon,
  PaperAirplaneIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const brand = '#cf292c';

// Configuration des types de notifications avec icônes, couleurs et routes
const NOTIFICATION_CONFIG = {
  // Congés
  conge_approuve: {
    icon: PaperAirplaneIcon,
    color: '#10b981',
    bg: '#10b98115',
    label: 'Congé approuvé',
    route: '/mes-conges',
    highlightSection: 'conges-list'
  },
  conge_rejete: {
    icon: XCircleIcon,
    color: '#ef4444',
    bg: '#ef444415',
    label: 'Congé refusé',
    route: '/mes-conges',
    highlightSection: 'conges-list'
  },
  nouvelle_demande_conge: {
    icon: CalendarIcon,
    color: '#3b82f6',
    bg: '#3b82f615',
    label: 'Nouvelle demande',
    route: null
  },
  modification_demande_conge: {
    icon: DocumentTextIcon,
    color: '#f59e0b',
    bg: '#f59e0b15',
    label: 'Demande modifiée',
    route: null
  },
  
  // Modifications de pointage
  modification_approuvee: {
    icon: CheckCircleIcon,
    color: '#10b981',
    bg: '#10b98115',
    label: 'Modification approuvée',
    route: '/pointage',
    highlightSection: 'historique-pointages'
  },
  modification_rejetee: {
    icon: XCircleIcon,
    color: '#ef4444',
    bg: '#ef444415',
    label: 'Modification refusée',
    route: '/pointage',
    highlightSection: 'historique-pointages'
  },
  
  // 🆕 Modifications de profil employé
  profil_modification_approuvee: {
    icon: CheckCircleIcon,
    color: '#10b981',
    bg: '#10b98115',
    label: 'Profil modifié',
    route: '/employee/profil',
    highlightSection: 'infos-personnelles'
  },
  profil_modification_rejetee: {
    icon: XCircleIcon,
    color: '#ef4444',
    bg: '#ef444415',
    label: 'Modification refusée',
    route: '/employee/profil',
    highlightSection: 'infos-personnelles'
  },
  
  // 🆕 Notification admin: nouvelle demande de modification
  nouvelle_demande_modification: {
    icon: UserIcon,
    color: '#f59e0b',
    bg: '#f59e0b15',
    label: 'Nouvelle demande',
    route: '/admin/employes',
    highlightSection: 'demandes-modification'
  },
  
  // Planning
  planning_modifie: {
    icon: CalendarIcon,
    color: '#6366f1',
    bg: '#6366f115',
    label: 'Planning modifié',
    route: '/home',
    highlightSection: 'planning-section'
  },
  nouveau_shift: {
    icon: ClockIcon,
    color: '#3b82f6',
    bg: '#3b82f615',
    label: 'Nouveau créneau',
    route: '/home',
    highlightSection: 'planning-section'
  },
  
  // Consignes/Infos RH
  nouvelle_consigne: {
    icon: ChatBubbleLeftIcon,
    color: brand,
    bg: brand + '15',
    label: 'Nouvelle consigne',
    route: '/home',
    highlightSection: 'consignes-section'
  },
  consigne_importante: {
    icon: ExclamationTriangleIcon,
    color: '#f59e0b',
    bg: '#f59e0b15',
    label: 'Info importante',
    route: '/home',
    highlightSection: 'consignes-section'
  },
  
  // Anomalies
  anomalie_detectee: {
    icon: ExclamationTriangleIcon,
    color: '#ef4444',
    bg: '#ef444415',
    label: 'Anomalie détectée',
    route: '/mes-anomalies',
    highlightSection: 'anomalies-list'
  },
  
  // Justificatifs
  justificatif_ajoute: {
    icon: DocumentTextIcon,
    color: '#10b981',
    bg: '#10b98115',
    label: 'Justificatif ajouté',
    route: null
  },
  
  // Rappels
  rappel_pointage: {
    icon: ClockIcon,
    color: '#f59e0b',
    bg: '#f59e0b15',
    label: 'Rappel pointage',
    route: '/pointage',
    highlightSection: 'pointage-actions'
  },
  
  // Documents
  document_expire: {
    icon: DocumentTextIcon,
    color: '#ef4444',
    bg: '#ef444415',
    label: 'Document expiré',
    route: '/employee/profil',
    highlightSection: 'documents-section'
  },
  document_a_renouveler: {
    icon: DocumentTextIcon,
    color: '#f59e0b',
    bg: '#f59e0b15',
    label: 'Document à renouveler',
    route: '/employee/profil',
    highlightSection: 'documents-section'
  },
  
  // Remplacements
  remplacement_accepte: {
    icon: CheckCircleIcon,
    color: '#10b981',
    bg: '#10b98115',
    label: 'Remplacement accepté',
    route: '/home',
    highlightSection: 'remplacements-section'
  },
  remplacement_refuse: {
    icon: XCircleIcon,
    color: '#ef4444',
    bg: '#ef444415',
    label: 'Remplacement refusé',
    route: '/home',
    highlightSection: 'remplacements-section'
  },
  remplacement_demande: {
    icon: UserIcon,
    color: '#6366f1',
    bg: '#6366f115',
    label: 'Demande de remplacement',
    route: '/home',
    highlightSection: 'remplacements-section'
  },
  
  // Absences équipe
  absence_equipe: {
    icon: CalendarIcon,
    color: '#f59e0b',
    bg: '#f59e0b15',
    label: 'Absence équipe',
    route: '/home',
    highlightSection: 'planning-section'
  },
  
  // Heures supplémentaires
  heures_sup_validees: {
    icon: ClockIcon,
    color: '#10b981',
    bg: '#10b98115',
    label: 'Heures sup validées',
    route: '/pointage',
    highlightSection: 'heures-section'
  },
  
  // Default
  info: {
    icon: BellIcon,
    color: '#6b7280',
    bg: '#6b728015',
    label: 'Information',
    route: null
  }
};

const NotificationsModal = ({ 
  isOpen, 
  onClose, 
  notifications = [], 
  unreadCount = 0,
  onMarkAsRead, 
  onMarkAllAsRead,
  onDelete,
  loading
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  // Obtenir la config pour un type de notification
  const getConfig = (type) => {
    return NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.info;
  };

  // Parser le message JSON ou format ||key:value si nécessaire
  const parseMessage = (message) => {
    if (!message) return { text: '' };
    
    // Format avec ||key:value (notre format personnalisé)
    if (message.includes('||')) {
      const parts = message.split('||');
      const text = parts[0].trim();
      const data = { text };
      
      // Parser les métadonnées
      for (let i = 1; i < parts.length; i++) {
        const [key, ...valueParts] = parts[i].split(':');
        if (key && valueParts.length > 0) {
          data[key.trim()] = valueParts.join(':').trim();
        }
      }
      
      return data;
    }
    
    // Format JSON
    try {
      const parsed = JSON.parse(message);
      return { text: parsed.text || message, ...parsed };
    } catch {
      return { text: message };
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days}j`;
    
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // Gérer le clic sur une notification (marquer lu + rediriger)
  const handleNotificationClick = (notif) => {
    const config = getConfig(notif.type);
    
    // Marquer comme lue
    if (!notif.lue && onMarkAsRead) {
      onMarkAsRead(notif.id);
    }
    
    // Fermer le modal
    onClose();
    
    // Naviguer si route définie
    if (config.route) {
      const parsedMsg = parseMessage(notif.message);
      
      // Construire le state pour la navigation avec highlight
      const navigationState = {
        highlightSection: config.highlightSection || null,
        notificationType: notif.type,
        fromNotification: true
      };
      
      // Ajouter l'ID spécifique si disponible
      if (parsedMsg.congeId) {
        navigationState.highlightId = parsedMsg.congeId;
      }
      if (parsedMsg.pointageId) {
        navigationState.highlightId = parsedMsg.pointageId;
      }
      if (parsedMsg.shiftId) {
        navigationState.highlightId = parsedMsg.shiftId;
      }
      if (parsedMsg.consigneId) {
        navigationState.highlightId = parsedMsg.consigneId;
        navigationState.highlightConsigneId = parsedMsg.consigneId;
      }
      if (parsedMsg.highlightConsigneId) {
        navigationState.highlightConsigneId = parsedMsg.highlightConsigneId;
      }
      
      // 🆕 Ajouter le champ modifié pour les notifications de modification profil
      if (parsedMsg.champ) {
        navigationState.highlightField = parsedMsg.champ;
      }
      if (parsedMsg.nouvelleValeur) {
        navigationState.nouvelleValeur = parsedMsg.nouvelleValeur;
      }
      
      navigate(config.route, { state: navigationState });
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal - Mobile: en haut, Desktop: dropdown à droite */}
      <div className="fixed top-14 left-3 right-3 lg:left-auto lg:right-4 lg:top-14 lg:w-[400px] z-[100]">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[55vh] lg:max-h-[70vh] flex flex-col overflow-hidden animate-slideDown">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: brand + '15' }}
              >
                <BellIcon className="w-5 h-5" style={{ color: brand }} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          {unreadCount > 0 && (
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <button
                onClick={onMarkAllAsRead}
                disabled={loading}
                className="text-sm font-medium transition-colors disabled:opacity-50"
                style={{ color: brand }}
              >
                Tout marquer comme lu
              </button>
            </div>
          )}

          {/* Liste des notifications */}
          <div className="flex-1 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#f3f4f6' }}
                >
                  <BellIcon className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                  Aucune notification
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vous recevrez ici les mises à jour importantes
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notif) => {
                  const config = getConfig(notif.type);
                  const Icon = config.icon;
                  const { text: messageText } = parseMessage(notif.message);
                  
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`group relative p-3 rounded-xl transition-all cursor-pointer ${
                        notif.lue
                          ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/30'
                          : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icône avec couleur */}
                        <div 
                          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: config.bg }}
                        >
                          <Icon className="w-5 h-5" style={{ color: config.color }} />
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <div className="flex items-center gap-2">
                              <h3 className={`text-sm font-medium truncate ${
                                notif.lue 
                                  ? 'text-slate-700 dark:text-slate-300' 
                                  : 'text-slate-900 dark:text-white'
                              }`}>
                                {notif.titre}
                              </h3>
                              {!notif.lue && (
                                <span 
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: brand }}
                                />
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0">
                              {formatDate(notif.date_creation)}
                            </span>
                          </div>
                          
                          {messageText && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-1.5">
                              {messageText}
                            </p>
                          )}
                          
                          {/* Badge type + lien */}
                          <div className="flex items-center gap-2">
                            <span 
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: config.bg, color: config.color }}
                            >
                              {config.label}
                            </span>
                            {config.route && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                Voir <ChevronRightIcon className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions - visibles au hover */}
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notif.lue && onMarkAsRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkAsRead(notif.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="Marquer comme lu"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(notif.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition-colors"
                              title="Supprimer"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-center text-slate-400 dark:text-slate-500">
                {notifications.length} notification{notifications.length > 1 ? 's' : ''} • 
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default React.memo(NotificationsModal);
