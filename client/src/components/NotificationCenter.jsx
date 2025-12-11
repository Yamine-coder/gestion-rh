import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  Trash2, 
  Calendar, 
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  UserX,
  Plane,
  MessageSquare,
  Info,
  ChevronRight,
  RefreshCw,
  Settings
} from 'lucide-react';
import axios from 'axios';
import { getToken } from '../utils/tokenManager';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const brand = '#cf292c';

// Configuration des types de notifications avec icônes et couleurs
const NOTIFICATION_CONFIG = {
  // Congés
  conge_approuve: {
    icon: Plane,
    color: '#10b981', // emerald
    bg: '#10b98115',
    label: 'Congé approuvé',
    route: '/mes-conges'
  },
  conge_rejete: {
    icon: UserX,
    color: '#ef4444', // red
    bg: '#ef444415',
    label: 'Congé refusé',
    route: '/mes-conges'
  },
  nouvelle_demande_conge: {
    icon: Calendar,
    color: '#3b82f6', // blue
    bg: '#3b82f615',
    label: 'Nouvelle demande',
    route: null // géré par admin
  },
  modification_demande_conge: {
    icon: FileText,
    color: '#f59e0b', // amber
    bg: '#f59e0b15',
    label: 'Demande modifiée',
    route: null
  },
  
  // Modifications de pointage
  modification_approuvee: {
    icon: CheckCheck,
    color: '#10b981',
    bg: '#10b98115',
    label: 'Modification approuvée',
    route: '/pointage'
  },
  modification_rejetee: {
    icon: UserX,
    color: '#ef4444',
    bg: '#ef444415',
    label: 'Modification refusée',
    route: '/pointage'
  },
  
  // Planning
  planning_modifie: {
    icon: Calendar,
    color: '#6366f1', // indigo
    bg: '#6366f115',
    label: 'Planning modifié',
    route: '/planning'
  },
  nouveau_shift: {
    icon: Clock,
    color: '#3b82f6',
    bg: '#3b82f615',
    label: 'Nouveau créneau',
    route: '/planning'
  },
  
  // Consignes/Infos RH
  nouvelle_consigne: {
    icon: MessageSquare,
    color: brand,
    bg: brand + '15',
    label: 'Nouvelle consigne',
    route: '/'
  },
  consigne_importante: {
    icon: AlertTriangle,
    color: '#f59e0b',
    bg: '#f59e0b15',
    label: 'Info importante',
    route: '/'
  },
  
  // Anomalies
  anomalie_detectee: {
    icon: AlertTriangle,
    color: '#ef4444',
    bg: '#ef444415',
    label: 'Anomalie détectée',
    route: '/pointage'
  },
  
  // Justificatifs
  justificatif_ajoute: {
    icon: FileText,
    color: '#10b981',
    bg: '#10b98115',
    label: 'Justificatif ajouté',
    route: null
  },
  
  // Default
  info: {
    icon: Info,
    color: '#6b7280',
    bg: '#6b728015',
    label: 'Information',
    route: null
  }
};

const NotificationCenter = ({ 
  isOpen, 
  onClose, 
  notifications = [], 
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onRefresh,
  loading = false
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // all, unread
  
  // Obtenir la config pour un type de notification
  const getConfig = (type) => {
    return NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.info;
  };

  // Formater la date relative
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

  // Parser le message JSON si nécessaire
  const parseMessage = (message) => {
    if (!message) return { text: '' };
    try {
      return JSON.parse(message);
    } catch {
      return { text: message };
    }
  };

  // Gérer le clic sur une notification
  const handleNotificationClick = (notif) => {
    const config = getConfig(notif.type);
    
    // Marquer comme lue
    if (!notif.lue && onMarkAsRead) {
      onMarkAsRead(notif.id);
    }
    
    // Fermer le panel
    onClose();
    
    // Naviguer si route définie
    if (config.route) {
      const parsedMsg = parseMessage(notif.message);
      
      // Navigation avec paramètres si nécessaire
      if (parsedMsg.congeId && notif.type.includes('conge')) {
        navigate(config.route, { state: { highlightId: parsedMsg.congeId } });
      } else {
        navigate(config.route);
      }
    }
  };

  // Filtrer les notifications
  const filteredNotifications = notifications.filter(n => 
    filter === 'all' ? true : !n.lue
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:bg-transparent"
        onClick={onClose}
      />

      {/* Panel - Mobile: bottom sheet, Desktop: dropdown */}
      <div className="fixed inset-x-0 bottom-0 lg:absolute lg:inset-auto lg:right-0 lg:top-full lg:mt-2 lg:w-[420px] z-[61]">
        <div className="bg-white dark:bg-gray-800 lg:rounded-2xl rounded-t-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[80vh] lg:max-h-[600px] flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800">
            {/* Mobile drag handle */}
            <div className="lg:hidden w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: brand + '15' }}
                >
                  <Bell size={20} style={{ color: brand }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                    title="Actualiser"
                  >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Filtres + Actions */}
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === 'all' 
                    ? 'text-white' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                style={filter === 'all' ? { backgroundColor: brand } : {}}
              >
                Toutes
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === 'unread' 
                    ? 'text-white' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                style={filter === 'unread' ? { backgroundColor: brand } : {}}
              >
                Non lues {unreadCount > 0 && `(${unreadCount})`}
              </button>
            </div>
            
            {unreadCount > 0 && onMarkAllAsRead && (
              <button
                onClick={onMarkAllAsRead}
                disabled={loading}
                className="text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                style={{ color: brand }}
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Liste des notifications */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#f3f4f6' }}
                >
                  <Bell size={28} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {filter === 'unread' ? 'Tout est lu !' : 'Aucune notification'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {filter === 'unread' 
                    ? 'Vous avez lu toutes vos notifications' 
                    : 'Vous recevrez ici les mises à jour importantes'
                  }
                </p>
              </div>
            ) : (
              <div className="py-2">
                {filteredNotifications.map((notif) => {
                  const config = getConfig(notif.type);
                  const Icon = config.icon;
                  const { text: messageText } = parseMessage(notif.message);
                  
                  return (
                    <div
                      key={notif.id}
                      className={`group relative mx-2 mb-1 p-3 rounded-xl cursor-pointer transition-all ${
                        notif.lue
                          ? 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/30'
                          : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icône */}
                        <div 
                          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: config.bg }}
                        >
                          <Icon size={18} style={{ color: config.color }} />
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <div className="flex items-center gap-2">
                              <h4 className={`text-sm font-medium truncate ${
                                notif.lue 
                                  ? 'text-gray-700 dark:text-gray-300' 
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {notif.titre}
                              </h4>
                              {!notif.lue && (
                                <span 
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: brand }}
                                />
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
                              {formatDate(notif.date_creation)}
                            </span>
                          </div>
                          
                          {messageText && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                              {messageText}
                            </p>
                          )}
                          
                          {/* Type badge */}
                          <div className="mt-1.5 flex items-center gap-2">
                            <span 
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ 
                                backgroundColor: config.bg, 
                                color: config.color 
                              }}
                            >
                              {config.label}
                            </span>
                            {config.route && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                Voir <ChevronRight size={10} />
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
                              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-emerald-600 transition-colors"
                              title="Marquer comme lu"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(notif.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
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
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-center text-gray-400 dark:text-gray-500">
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

export default React.memo(NotificationCenter);
