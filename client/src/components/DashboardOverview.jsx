import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HiUsers } from 'react-icons/hi';
import axios from 'axios';
import { computeKPIs } from '../utils/kpiHelpers';
import AlertesTempsReel from './AlertesTempsReel';
// Nouveaux widgets Dashboard refactorisés
import EvenementsCalendrier from './dashboard/EvenementsCalendrier';
import AvisGoogle from './dashboard/AvisGoogle';
import { 
  Megaphone, Plus, Edit2, Trash2, X, AlertTriangle, AlertCircle, Info, Check, 
  Bell, BellRing, BellOff, Calendar, Clock, Zap, FileText, Send, PartyPopper, Users, Coffee,
  Sparkles, Star, Heart, MessageCircle, Volume2, CalendarDays, CalendarClock,
  CalendarRange, CalendarCheck, Timer, CheckCircle, Circle, ClipboardList, LogOut, Mail, Phone,
  TrendingUp, Activity, ClipboardCheck, Download, RefreshCw, ChevronRight, UserCheck, UserX, Hourglass, Percent, Plane,
  Gift, Tv, GraduationCap, Flag, Cake, TreePine, Snowflake, Sun, Flower2, ExternalLink, Moon,
  Package, UserCog, PhoneCall, UtensilsCrossed, FolderOpen, Flame, Pin, PinOff, MailPlus, Copy, Briefcase, AlarmClock,
  Truck, User, MoreHorizontal, Edit3, Repeat, List, MapPin, Building2, ShoppingBag, BookOpen, ShieldCheck
} from 'lucide-react';
import { toLocalDateString, getCurrentDateString } from '../utils/parisTimeUtils';
import DatePickerCustom from './DatePickerCustom';
import TimePickerCustom from './TimePickerCustom';
import { API_BASE } from '../config/api';

// Couleurs de la charte graphique
const BRAND_COLORS = {
  primary: '#cf292c',      // Rouge principal
  primaryDark: '#a01e21',  // Rouge foncé
  primaryLight: '#f8d7d8', // Rouge très clair
};

// Configuration des types de consignes avec icônes Lucide et couleurs de la charte
const TYPES_CONSIGNE = [
  {
    value: 'info',
    label: 'Information',
    icon: Info,
    iconBg: 'bg-sky-100 dark:bg-sky-900/40',
    iconColor: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50 dark:bg-sky-900/20',
    textColor: 'text-sky-700 dark:text-sky-300',
    borderColor: 'border-sky-200 dark:border-sky-800',
    badgeColor: 'bg-sky-500',
    description: 'Information générale pour l\'équipe'
  },
  {
    value: 'important',
    label: 'Important',
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800',
    badgeColor: 'bg-amber-500',
    description: 'Message important à ne pas manquer'
  },
  {
    value: 'urgent',
    label: 'Urgent',
    icon: Zap,
    iconBg: 'bg-red-100 dark:bg-red-900/40',
    iconColor: 'text-[#cf292c] dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    textColor: 'text-[#cf292c] dark:text-red-300',
    borderColor: 'border-red-200 dark:border-red-800',
    badgeColor: 'bg-[#cf292c]',
    description: 'Action requise immédiatement'
  },
  {
    value: 'rappel',
    label: 'Rappel',
    icon: Bell,
    iconBg: 'bg-violet-100 dark:bg-violet-900/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    textColor: 'text-violet-700 dark:text-violet-300',
    borderColor: 'border-violet-200 dark:border-violet-800',
    badgeColor: 'bg-violet-500',
    description: 'Rappel de procédure ou deadline'
  },
  {
    value: 'evenement',
    label: 'Événement',
    icon: PartyPopper,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    badgeColor: 'bg-emerald-500',
    description: 'Événement à venir (réunion, formation...)'
  },
  {
    value: 'horaire',
    label: 'Horaires',
    icon: Clock,
    iconBg: 'bg-teal-100 dark:bg-teal-900/40',
    iconColor: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    textColor: 'text-teal-700 dark:text-teal-300',
    borderColor: 'border-teal-200 dark:border-teal-800',
    badgeColor: 'bg-teal-500',
    description: 'Changement d\'horaires ou fermeture'
  },
  {
    value: 'reunion',
    label: 'Réunion',
    icon: Users,
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    badgeColor: 'bg-indigo-500',
    description: 'Réunion d\'équipe ou entretien'
  },
  {
    value: 'felicitations',
    label: 'Félicitations',
    icon: Sparkles,
    iconBg: 'bg-pink-100 dark:bg-pink-900/40',
    iconColor: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    textColor: 'text-pink-700 dark:text-pink-300',
    borderColor: 'border-pink-200 dark:border-pink-800',
    badgeColor: 'bg-pink-500',
    description: 'Féliciter ou remercier l\'équipe'
  }
];

// Icônes pour les durées rapides
const DUREES_RAPIDES = [
  { label: '1 jour', days: 1, icon: Calendar },
  { label: '3 jours', days: 3, icon: CalendarDays },
  { label: '1 semaine', days: 7, icon: CalendarClock },
  { label: '2 semaines', days: 14, icon: CalendarRange },
  { label: '1 mois', days: 30, icon: CalendarCheck },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT MODAL CONSIGNE MODERNISÉ
// ═══════════════════════════════════════════════════════════════════════════
const ConsigneModal = ({ isOpen, onClose, onSave, form, setForm, isEditing, categories = [] }) => {
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const listRef = useRef(null);
  const triggerRef = useRef(null);
  
  const selectedType = TYPES_CONSIGNE.find(t => t.value === form.type) || TYPES_CONSIGNE[0];
  
  // Navigation clavier pour le sélecteur de type
  useEffect(() => {
    if (!showTypePicker) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        setShowTypePicker(false);
        triggerRef.current?.focus();
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        setFocusIndex(prev => {
          if (e.key === 'Home') return 0;
          if (e.key === 'End') return TYPES_CONSIGNE.length - 1;
          const delta = e.key === 'ArrowDown' ? 1 : -1;
          return ((prev + delta + TYPES_CONSIGNE.length) % TYPES_CONSIGNE.length);
        });
      } else if (e.key === 'Enter' && focusIndex >= 0) {
        e.preventDefault();
        const chosen = TYPES_CONSIGNE[focusIndex];
        if (chosen) {
          setForm(f => ({ ...f, type: chosen.value }));
          setShowTypePicker(false);
          triggerRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showTypePicker, focusIndex, setForm]);

  // Scroll vers option focus
  useEffect(() => {
    if (!showTypePicker || focusIndex < 0) return;
    const listEl = listRef.current;
    const optionEl = listEl?.querySelector(`[data-index='${focusIndex}']`);
    if (optionEl && listEl) {
      const oTop = optionEl.offsetTop;
      const oBottom = oTop + optionEl.offsetHeight;
      if (oTop < listEl.scrollTop) listEl.scrollTop = oTop - 4;
      else if (oBottom > listEl.scrollTop + listEl.clientHeight) listEl.scrollTop = oBottom - listEl.clientHeight + 4;
    }
  }, [focusIndex, showTypePicker]);

  // Focus initial
  useEffect(() => {
    if (showTypePicker) {
      const idx = TYPES_CONSIGNE.findIndex(t => t.value === form.type);
      setFocusIndex(idx >= 0 ? idx : 0);
    }
  }, [showTypePicker, form.type]);

  if (!isOpen) return null;

  const SelectedIcon = selectedType.icon;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[51] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* En-tête moderne */}
          <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, #cf292c 0%, #a01e21 100%)' }}
              >
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {isEditing ? <><Edit2 className="w-4 h-4 text-[#cf292c]" /> Modifier la consigne</> : <><Volume2 className="w-4 h-4 text-[#cf292c]" /> Nouvelle consigne</>}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {isEditing ? 'Modifiez les informations ci-dessous' : 'Créez une annonce pour votre équipe'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenu du formulaire */}
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            
            {/* Type de consigne - Sélecteur moderne */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Type de consigne
              </label>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTypePicker(!showTypePicker)}
                  ref={triggerRef}
                  className={`w-full flex items-center gap-3 px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-left text-sm focus:outline-none focus:ring-2 focus:ring-[#cf292c]/30 transition-all ${selectedType.borderColor}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedType.iconBg}`}>
                    <SelectedIcon className={`w-5 h-5 ${selectedType.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${selectedType.textColor}`}>{selectedType.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{selectedType.description}</div>
                  </div>
                  <span className="text-slate-400 dark:text-slate-500">
                    <svg className={`w-5 h-5 transition-transform ${showTypePicker ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>

                {/* Liste déroulante des types */}
                {showTypePicker && (
                  <div className="absolute z-20 mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <ul
                      ref={listRef}
                      role="listbox"
                      className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700"
                    >
                      {TYPES_CONSIGNE.map((t, idx) => {
                        const Icon = t.icon;
                        const active = t.value === form.type;
                        return (
                          <li
                            key={t.value}
                            role="option"
                            aria-selected={active}
                            data-index={idx}
                            onClick={() => {
                              setForm(f => ({ ...f, type: t.value }));
                              setShowTypePicker(false);
                              triggerRef.current?.focus();
                            }}
                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                              active 
                                ? 'bg-slate-50 dark:bg-slate-800' 
                                : focusIndex === idx 
                                  ? 'bg-slate-100 dark:bg-slate-700' 
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.iconBg}`}>
                              <Icon className={`w-4.5 h-4.5 ${t.iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-semibold ${t.textColor}`}>{t.label}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.description}</div>
                            </div>
                            {active && (
                              <div className="w-5 h-5 rounded-full bg-[#cf292c] flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <button
                        type="button"
                        onClick={() => setShowTypePicker(false)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Titre */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Titre <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={form.titre}
                  onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                  className="w-full pl-11 pr-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] transition-colors"
                  placeholder="Ex: Réunion d'équipe, Fermeture exceptionnelle..."
                  maxLength={100}
                />
              </div>
              <div className="text-xs text-slate-400 text-right">{form.titre.length}/100</div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.contenu}
                onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))}
                className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] transition-colors resize-none"
                rows={4}
                placeholder="Détaillez votre consigne ici...&#10;Vous pouvez utiliser des emojis 🎉"
                maxLength={500}
              />
              <div className="text-xs text-slate-400 text-right">{form.contenu.length}/500</div>
            </div>

            {/* Destinataires - Sélecteur de catégorie */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Destinataires
              </label>
              <div className="flex flex-wrap gap-2">
                {/* Option "Tout le monde" */}
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, cibleCategorie: '' }))}
                  className={`px-4 py-2 text-sm font-medium rounded-xl border-2 transition-all flex items-center gap-2 ${
                    !form.cibleCategorie
                      ? 'border-[#cf292c] bg-[#cf292c]/10 text-[#cf292c]'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Tout le monde
                </button>
                
                {/* Options par catégorie */}
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, cibleCategorie: cat }))}
                    className={`px-4 py-2 text-sm font-medium rounded-xl border-2 transition-all capitalize ${
                      form.cibleCategorie === cat
                        ? 'border-[#cf292c] bg-[#cf292c]/10 text-[#cf292c]'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {form.cibleCategorie 
                  ? `Cette consigne sera visible uniquement par l'équipe "${form.cibleCategorie}"`
                  : 'Cette consigne sera visible par tous les employés'
                }
              </p>
            </div>

            {/* Date d'expiration (obligatoire avec raccourcis) */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Date d'expiration <span className="text-red-500">*</span>
              </label>
              
              {/* Boutons de durée rapide */}
              <div className="flex flex-wrap gap-2 mb-2">
                {DUREES_RAPIDES.map(({ label, days, icon: DureeIcon }) => {
                  const targetDate = new Date();
                  targetDate.setDate(targetDate.getDate() + days);
                  const targetDateStr = toLocalDateString(targetDate);
                  const isSelected = form.dateFin === targetDateStr;
                  
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, dateFin: targetDateStr }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#cf292c] text-white border-[#cf292c] shadow-md'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-[#cf292c]/50 hover:text-[#cf292c]'
                      }`}
                    >
                      <DureeIcon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>
              
              {/* Sélecteur de date personnalisée */}
              <DatePickerCustom
                value={form.dateFin}
                onChange={(date) => setForm(f => ({ ...f, dateFin: date }))}
                min={getCurrentDateString()}
                placeholder="Choisir une date d'expiration"
                error={!form.dateFin}
              />
              {!form.dateFin && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Veuillez sélectionner une date d'expiration
                </p>
              )}
              {form.dateFin && (
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  La consigne expirera automatiquement le {new Date(form.dateFin).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>

            {/* Aperçu */}
            <div className="pt-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Aperçu
              </label>
              <div className={`p-4 rounded-xl border ${selectedType.bgColor} ${selectedType.borderColor}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedType.iconBg}`}>
                    <SelectedIcon className={`w-5 h-5 ${selectedType.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold ${selectedType.textColor}`}>
                      {form.titre || 'Titre de la consigne'}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap break-words">
                      {form.contenu || 'Le contenu de votre message apparaîtra ici...'}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5" />
                      {form.dateFin 
                        ? `Expire le ${new Date(form.dateFin).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`
                        : 'Date d\'expiration non définie'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer avec boutons */}
          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!form.titre.trim() || !form.contenu.trim() || !form.dateFin}
              className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl"
              style={{ 
                background: 'linear-gradient(135deg, #cf292c 0%, #a01e21 100%)',
              }}
            >
              <Send className="w-4 h-4" />
              {isEditing ? 'Enregistrer' : 'Publier'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Fonction utilitaire pour formater les dates
const formatDate = (date) => {
  if (typeof date === 'string') {
    // Si c'est déjà une chaîne, vérifier le format
    if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
      return date.split('T')[0];
    }
    date = new Date(date);
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return getCurrentDateString();
  }
  return toLocalDateString(date);
};

function DashboardOverview({ onGoToConges, onNavigate }) {
  const token = (typeof localStorage!=='undefined') ? localStorage.getItem('token') : null;
  const [userPrenom, setUserPrenom] = useState(() => {
    return (typeof localStorage!=='undefined') ? localStorage.getItem('prenom') : null;
  });
  const [stats, setStats] = useState({});
  const [pendingConges, setPendingConges] = useState(0);
  const [pendingLeavesList, setPendingLeavesList] = useState([]);
  const [congesAVenir, setCongesAVenir] = useState(0); // Congés à venir dans la semaine
  const [congesAVenirList, setCongesAVenirList] = useState([]); // Liste détaillée des congés à venir
  const [dailyNote, setDailyNote] = useState('');
  const [memoTasks, setMemoTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('rh_memo_tasks_v2');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('normal');
  const [newTaskCategory, setNewTaskCategory] = useState('rdv');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskReminder, setNewTaskReminder] = useState(''); // Rappel programmé (datetime-local)
  const [memoFilter, setMemoFilter] = useState('all'); // all, urgent, today, pinned, reminder
  const [showMemoForm, setShowMemoForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null); // Tâche en cours d'édition
  const [showReminderPopup, setShowReminderPopup] = useState(false);
  const [currentReminder, setCurrentReminder] = useState(null);
  const [userEmail, setUserEmail] = useState(() => {
    try {
      return localStorage.getItem('userEmail') || '';
    } catch { return ''; }
  }); // Email de l'admin connecté pour les rappels
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  // Consignes (nouveau système)
  const [consignes, setConsignes] = useState([]);
  const [loadingConsignes, setLoadingConsignes] = useState(true);
  const [showConsigneModal, setShowConsigneModal] = useState(false);
  const [editingConsigne, setEditingConsigne] = useState(null);
  const [showAllConsignes, setShowAllConsignes] = useState(false);
  const [consigneForm, setConsigneForm] = useState({ titre: '', contenu: '', type: 'info', dateFin: '', cibleCategorie: '' });
  const [categoriesDisponibles, setCategoriesDisponibles] = useState([]);
  // Shifts / planning
  const [shifts, setShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [shiftError, setShiftError] = useState(null);
  // Comparaisons (écarts planning vs réalité)
  const [comparaisons, setComparaisons] = useState([]);
  const [loadingComparaisons, setLoadingComparaisons] = useState(false);
  // État pour les sections dépliables
  const [showNonPointes, setShowNonPointes] = useState(false);
  const [showPresents, setShowPresents] = useState(false);
  const [showAnomalies, setShowAnomalies] = useState(false);
  // Filtre planning
  const [planningFilter, setPlanningFilter] = useState('all'); // 'all', 'ongoing', 'upcoming'
  // Liste des employés
  const [employesList, setEmployesList] = useState([]);
  // Événements pour le header
  const [headerEvents, setHeaderEvents] = useState([]);

  // Helper pour transformer les shifts Prisma en format attendu
  const transformShift = (shift) => {
    // Si le shift a déjà start/end, on le retourne tel quel
    if (shift.start && shift.end) return shift;
    
    // Sinon, on le construit depuis date + segments
    const shiftDate = new Date(shift.date);
    if (isNaN(shiftDate.getTime())) return null; // Date invalide
    
    // Si pas de segments ou shift d'absence, créer un shift par défaut
    if (!shift.segments || !Array.isArray(shift.segments) || shift.segments.length === 0) {
      return {
        ...shift,
        start: shiftDate.toISOString(),
        end: new Date(shiftDate.getTime() + 8*3600000).toISOString(), // +8h par défaut
        employeeId: shift.employeId,
        employeeName: shift.employe?.nom && shift.employe?.prenom 
          ? `${shift.employe.prenom} ${shift.employe.nom}` 
          : shift.employe?.email || 'Non assigné'
      };
    }
    
    // Prendre le premier et dernier segment pour start/end
    const firstSeg = shift.segments[0];
    const lastSeg = shift.segments[shift.segments.length - 1];
    
    // Construire les dates complètes
    const [startH, startM] = (firstSeg.debut || firstSeg.start || '08:00').split(':');
    const [endH, endM] = (lastSeg.fin || lastSeg.end || '16:00').split(':');
    
    const startDate = new Date(shiftDate);
    startDate.setHours(parseInt(startH), parseInt(startM), 0, 0);
    
    const endDate = new Date(shiftDate);
    endDate.setHours(parseInt(endH), parseInt(endM), 0, 0);
    
    // 🌙 RESTAURANT : Si shift de nuit (fin < début), ajouter 1 jour à la fin
    if (parseInt(endH) < parseInt(startH) || (parseInt(endH) === parseInt(startH) && parseInt(endM) < parseInt(startM))) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    return {
      ...shift,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      employeeId: shift.employeId,
      employeeName: shift.employe?.nom && shift.employe?.prenom 
        ? `${shift.employe.prenom} ${shift.employe.nom}` 
        : shift.employe?.email || 'Non assigné'
    };
  };

  // --- Fetch shifts of the day (best‑effort: if endpoint absent, stays empty) ---
  const fetchShiftsToday = useCallback(async ()=>{
    if(!token) { setLoadingShifts(false); return; }
    // Utiliser la date locale (pas UTC) pour éviter les décalages de timezone
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    try {
      setLoadingShifts(true);
      // Try common endpoint patterns
      let res;
      try { 
        res = await axios.get(`${API_BASE}/admin/shifts?start=${date}&end=${date}`, { 
          headers:{Authorization:`Bearer ${token}`}
        }); 
      }
      catch { 
        try { 
          res = await axios.get(`${API_BASE}/admin/planning/jour?date=${date}`, { 
            headers:{Authorization:`Bearer ${token}`}
          }); 
        } catch(e2){ throw e2; } 
      }
      const rawData = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.shifts) ? res.data.shifts : []);
      // Transformer les shifts pour avoir start/end
      const transformedShifts = rawData.map(transformShift).filter(s => s !== null);
      setShifts(transformedShifts);
      setShiftError(null);
    } catch(e){ 
      console.error('❌ [DASHBOARD] Erreur fetch shifts:', e.response?.status, e.response?.data || e.message);
      setShiftError('Planning indisponible'); 
      setShifts([]); 
    }
    finally { setLoadingShifts(false); }
  },[token]);

  // --- Fetch comparaisons (écarts planning vs réalité) ---
  const fetchComparaisons = useCallback(async () => {
    if (!token) return;
    const date = new Date().toISOString().slice(0, 10);
    
    try {
      setLoadingComparaisons(true);
      
      // Récupérer la liste des employés
      const employesRes = await axios.get(`${API_BASE}/admin/employes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const employes = Array.isArray(employesRes.data) ? employesRes.data : [];
      
      // Récupérer les comparaisons pour chaque employé
      const allComparaisons = [];
      for (const emp of employes) {
        if (emp.role !== 'employee') continue; // Ignorer les admins
        
        try {
          const params = new URLSearchParams({
            employeId: emp.id.toString(),
            dateDebut: date,
            dateFin: date
          });
          
          const compRes = await axios.get(
            `${API_BASE}/api/comparison/planning-vs-realite?${params}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (compRes.data.success && compRes.data.comparaisons?.length > 0) {
            allComparaisons.push(...compRes.data.comparaisons.map(c => ({
              ...c,
              employeEmail: emp.email,
              employeNom: `${emp.prenom || ''} ${emp.nom || ''}`.trim()
            })));
          }
        } catch (err) {
          console.warn(`⚠️ [DASHBOARD] Erreur comparaison employé ${emp.id}:`, err.message);
        }
      }
      
      setComparaisons(allComparaisons);
    } catch (error) {
      console.error('❌ [DASHBOARD] Erreur chargement comparaisons:', error.response?.status, error.response?.data || error.message);
    } finally {
      setLoadingComparaisons(false);
    }
  }, [token]);

  const fetchStats = useCallback(async ()=>{
    if(!token) return;
    try { 
      setLoading(true); 
      const res = await axios.get(`${API_BASE}/admin/stats`,{ headers:{Authorization:`Bearer ${token}`}}); 
      setStats(res.data||{}); 
      setLastUpdated(Date.now()); 
    }
    catch(e){ 
      console.error('❌ [DASHBOARD] Erreur API /admin/stats:', e.response?.status, e.response?.data || e.message);
      setError('Impossible de charger les stats'); 
      setStats({});
    }
    finally{ setLoading(false);} 
  },[token]);

  // Récupérer la liste complète des employés avec leurs pointages et heures
  const fetchEmployesList = useCallback(async ()=>{
    if(!token) return;
    try {
      const empRes = await axios.get(`${API_BASE}/admin/employes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Récupérer les pointages d'aujourd'hui avec les détails
      const today = getCurrentDateString();
      const pointagesRes = await axios.get(`${API_BASE}/admin/pointages?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const employes = Array.isArray(empRes.data) ? empRes.data : [];
      const pointages = Array.isArray(pointagesRes.data) ? pointagesRes.data : [];
      
      // Créer une Map des pointages par userId avec détails
      const pointagesMap = new Map();
      pointages.forEach(p => {
        if (!pointagesMap.has(p.userId) || (p.type === 'ENTRÉE' && !pointagesMap.get(p.userId).heureEntree)) {
          const existing = pointagesMap.get(p.userId) || {};
          pointagesMap.set(p.userId, {
            ...existing,
            ...(p.type === 'ENTRÉE' && { heureEntree: p.timestamp || p.createdAt }),
            ...(p.type === 'SORTIE' && { heureSortie: p.timestamp || p.createdAt }),
            telephone: p.user?.telephone || existing.telephone,
            email: p.user?.email || existing.email
          });
        }
      });
      
      // Enrichir la liste des employés avec le statut de pointage et heures
      const employesEnrichis = employes
        .filter(emp => emp.role === 'employee') // Seulement les employés
        .map(emp => {
          const pointageInfo = pointagesMap.get(emp.id);
          return {
            ...emp,
            aPointe: !!pointageInfo,
            heureEntree: pointageInfo?.heureEntree,
            heureSortie: pointageInfo?.heureSortie,
            telephone: emp.telephone || pointageInfo?.telephone,
            nomComplet: emp.nom && emp.prenom ? `${emp.prenom} ${emp.nom}` : emp.email
          };
        });
      
      setEmployesList(employesEnrichis);
    } catch(e) {
      console.error('❌ [DASHBOARD] Erreur chargement employés:', e);
      setEmployesList([]);
    }
  },[token]);

  const fetchPendingLeaves = useCallback( async ()=>{
    if(!token) return;
    try { 
      
      // Récupérer les demandes en attente
      const resEnAttente = await axios.get(`${API_BASE}/admin/conges?statut=en%20attente`,{ headers:{Authorization:`Bearer ${token}`}}); 
      let list=[]; 
      if(Array.isArray(resEnAttente.data)) list=resEnAttente.data; 
      else if(Array.isArray(resEnAttente.data?.conges)) list=resEnAttente.data.conges; 
      setPendingLeavesList(list); 
      setPendingConges(list.length);
      
      // Récupérer les congés approuvés à venir dans la semaine
      const resApprouves = await axios.get(`${API_BASE}/admin/conges?statut=approuvé`,{ headers:{Authorization:`Bearer ${token}`}}); 
      let approuves=[]; 
      if(Array.isArray(resApprouves.data)) approuves=resApprouves.data; 
      else if(Array.isArray(resApprouves.data?.conges)) approuves=resApprouves.data.conges;
      
      // Filtrer les congés qui commencent dans les 14 prochains jours
      const now = new Date();
      const dans14Jours = new Date(now.getTime() + 14*24*60*60*1000);
      const congesProchains = approuves.filter(c => {
        const debut = new Date(c.dateDebut);
        return debut >= now && debut <= dans14Jours;
      }).sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut));
      setCongesAVenir(congesProchains.length);
      setCongesAVenirList(congesProchains);
      
    } catch(e){ 
      console.error('❌ [DASHBOARD] Erreur API /admin/conges:', e.response?.status, e.response?.data || e.message);
      setPendingLeavesList([]); 
      setPendingConges(0);
      setCongesAVenir(0);
      setCongesAVenirList([]);
    } 
  },[token]);

  useEffect(()=>{ fetchStats(); fetchPendingLeaves(); fetchEmployesList(); },[fetchStats, fetchPendingLeaves, fetchEmployesList]);
  useEffect(()=>{ try{ const d=localStorage.getItem('rh_daily_instruction'); if(d) setDailyNote(d);}catch{} },[]);
  useEffect(()=>{ fetchShiftsToday(); fetchComparaisons(); },[fetchShiftsToday, fetchComparaisons]);
  
  // Sauvegarder les tâches mémo dans localStorage
  useEffect(() => {
    try { localStorage.setItem('rh_memo_tasks_v2', JSON.stringify(memoTasks)); } catch {}
  }, [memoTasks]);
  
  // Catégories de tâches pour restaurant/manager (avec icônes Lucide)
  const MEMO_CATEGORIES = [
    { value: 'rdv', label: 'RDV', icon: CalendarClock, color: 'rose', bgColor: 'bg-rose-100', textColor: 'text-rose-600', emoji: '📅' },
    { value: 'appel', label: 'Appel', icon: PhoneCall, color: 'violet', bgColor: 'bg-violet-100', textColor: 'text-violet-600', emoji: '📞' },
    { value: 'urgent', label: 'Urgent', icon: Flame, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600', emoji: '🔥' },
    { value: 'stocks', label: 'Stocks', icon: Package, color: 'amber', bgColor: 'bg-amber-100', textColor: 'text-amber-600', emoji: '📦' },
    { value: 'rh', label: 'Équipe', icon: Users, color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600', emoji: '👥' },
    { value: 'fournisseur', label: 'Fournisseur', icon: Truck, color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-600', emoji: '🚚' },
    { value: 'service', label: 'Service', icon: UtensilsCrossed, color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', emoji: '🍽️' },
    { value: 'admin', label: 'Administratif', icon: FileText, color: 'slate', bgColor: 'bg-slate-100', textColor: 'text-slate-600', emoji: '📄' },
    { value: 'perso', label: 'Perso', icon: User, color: 'cyan', bgColor: 'bg-cyan-100', textColor: 'text-cyan-600', emoji: '👤' },
  ];
  
  // Priorités avec icônes
  const MEMO_PRIORITIES = [
    { value: 'high', label: 'Urgent', color: 'red', icon: Flame, bgColor: 'bg-red-100', textColor: 'text-red-600' },
    { value: 'normal', label: 'Normal', color: 'gray', icon: Circle, bgColor: 'bg-gray-100', textColor: 'text-gray-500' },
    { value: 'low', label: 'Faible', color: 'slate', icon: Circle, bgColor: 'bg-slate-50', textColor: 'text-slate-400' },
  ];
  
  // État pour le modal email
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTask, setEmailTask] = useState(null);
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' });
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Fonctions pour gérer les tâches du mémo
  const addMemoTask = () => {
    if (!newTask.trim()) return;
    
    if (editingTask) {
      // Mode édition
      setMemoTasks(prev => prev.map(t => 
        t.id === editingTask.id 
          ? { 
              ...t, 
              text: newTask.trim(),
              priority: newTaskPriority,
              category: newTaskCategory,
              dueDate: newTaskDueDate || null,
              reminder: newTaskReminder || null,
              reminderTriggered: newTaskReminder ? false : t.reminderTriggered,
              pinned: newTaskPriority === 'high' ? true : t.pinned,
            } 
          : t
      ));
      setEditingTask(null);
    } else {
      // Mode création
      const task = {
        id: Date.now(),
        text: newTask.trim(),
        done: false,
        priority: newTaskPriority,
        category: newTaskCategory,
        dueDate: newTaskDueDate || null,
        reminder: newTaskReminder || null,
        reminderTriggered: false,
        pinned: newTaskPriority === 'high',
        createdAt: new Date().toISOString()
      };
      setMemoTasks(prev => [task, ...prev]);
    }
    
    resetMemoForm();
  };
  
  // Ouvrir le formulaire en mode édition
  const startEditTask = (task) => {
    setEditingTask(task);
    setNewTask(task.text);
    setNewTaskPriority(task.priority || 'normal');
    setNewTaskCategory(task.category || 'rdv');
    setNewTaskDueDate(task.dueDate || '');
    setNewTaskReminder(task.reminder || '');
    setShowMemoForm(true);
  };
  
  // Reset le formulaire
  const resetMemoForm = () => {
    setNewTask('');
    setNewTaskPriority('normal');
    setNewTaskCategory('rdv');
    setNewTaskDueDate('');
    setNewTaskReminder('');
    setShowMemoForm(false);
    setEditingTask(null);
  };
  
  // Snooze un rappel (reporter de X minutes)
  const snoozeReminder = (taskId, minutes = 15) => {
    const newReminderTime = new Date(Date.now() + minutes * 60 * 1000).toISOString().slice(0, 16);
    setMemoTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, reminder: newReminderTime, reminderTriggered: false } : t
    ));
    setShowReminderPopup(false);
    setCurrentReminder(null);
  };
  
  // Marquer le rappel comme vu
  const dismissReminder = (taskId) => {
    setMemoTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, reminderTriggered: true } : t
    ));
    setShowReminderPopup(false);
    setCurrentReminder(null);
  };
  
  // Ajouter/modifier un rappel sur une tâche existante
  const setTaskReminder = (taskId, reminderDateTime) => {
    setMemoTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, reminder: reminderDateTime, reminderTriggered: false } : t
    ));
  };
  
  // Supprimer un rappel
  const removeTaskReminder = (taskId) => {
    setMemoTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, reminder: null, reminderTriggered: false } : t
    ));
  };
  
  const toggleMemoTask = (taskId) => {
    setMemoTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, done: !t.done } : t
    ));
  };
  
  const togglePinTask = (taskId) => {
    setMemoTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, pinned: !t.pinned } : t
    ));
  };
  
  const deleteMemoTask = (taskId) => {
    setMemoTasks(prev => prev.filter(t => t.id !== taskId));
  };
  
  const clearCompletedTasks = () => {
    setMemoTasks(prev => prev.filter(t => !t.done));
  };
  
  // Ouvrir le modal email avec une tâche
  const openEmailModal = (task = null) => {
    const category = task ? MEMO_CATEGORIES.find(c => c.value === task.category) : null;
    setEmailTask(task);
    setEmailForm({
      to: '',
      subject: task ? `Rappel: ${task.text}` : 'Rappel depuis le tableau de bord',
      body: task 
        ? `Bonjour,\n\nCeci est un rappel concernant :\n\n📌 ${task.text}\n${task.dueDate ? `📅 Échéance : ${new Date(task.dueDate).toLocaleDateString('fr-FR')}\n` : ''}${category ? `📂 Catégorie : ${category.label}\n` : ''}\nCordialement,\nLe Manager`
        : 'Bonjour,\n\n\n\nCordialement,\nLe Manager'
    });
    setShowEmailModal(true);
  };
  
  // Envoyer un email
  const sendEmail = async () => {
    if (!emailForm.to || !emailForm.subject) return;
    
    setSendingEmail(true);
    try {
      // Utiliser mailto: comme fallback simple
      const mailtoLink = `mailto:${emailForm.to}?subject=${encodeURIComponent(emailForm.subject)}&body=${encodeURIComponent(emailForm.body)}`;
      window.open(mailtoLink, '_blank');
      
      // Marquer la tâche comme ayant eu un rappel envoyé
      if (emailTask) {
        setMemoTasks(prev => prev.map(t => 
          t.id === emailTask.id ? { ...t, emailSent: true, emailSentAt: new Date().toISOString() } : t
        ));
      }
      
      setShowEmailModal(false);
      setEmailForm({ to: '', subject: '', body: '' });
      setEmailTask(null);
    } catch (e) {
      console.error('Erreur envoi email:', e);
    } finally {
      setSendingEmail(false);
    }
  };
  
  // Copier le contenu de la tâche
  const copyTaskToClipboard = (task) => {
    const category = MEMO_CATEGORIES.find(c => c.value === task.category);
    const text = `${task.text}${task.dueDate ? ` (Échéance: ${new Date(task.dueDate).toLocaleDateString('fr-FR')})` : ''}${category ? ` [${category.label}]` : ''}`;
    navigator.clipboard.writeText(text);
  };
  
  // Filtrer les tâches
  const getFilteredTasks = () => {
    const today = new Date().toISOString().slice(0, 10);
    let filtered = [...memoTasks];
    
    switch (memoFilter) {
      case 'urgent':
        filtered = filtered.filter(t => t.priority === 'high' || t.category === 'urgent');
        break;
      case 'today':
        filtered = filtered.filter(t => t.dueDate === today);
        break;
      case 'pinned':
        filtered = filtered.filter(t => t.pinned);
        break;
      case 'reminder':
        filtered = filtered.filter(t => t.reminder && !t.reminderTriggered);
        break;
      default:
        break;
    }
    
    // Trier : épinglées d'abord, puis par priorité, puis non terminées avant terminées
    return filtered.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });
  };
  
  // Vérifier si une tâche est en retard
  const isOverdue = (task) => {
    if (!task.dueDate || task.done) return false;
    return new Date(task.dueDate) < new Date(new Date().toISOString().slice(0, 10));
  };
  
  // Stats du mémo
  const memoStats = {
    total: memoTasks.filter(t => !t.done).length,
    urgent: memoTasks.filter(t => !t.done && (t.priority === 'high' || t.category === 'urgent')).length,
    today: memoTasks.filter(t => !t.done && t.dueDate === new Date().toISOString().slice(0, 10)).length,
    overdue: memoTasks.filter(t => isOverdue(t)).length,
    withReminder: memoTasks.filter(t => !t.done && t.reminder && !t.reminderTriggered).length,
  };
  
  // Vérifier les rappels toutes les 30 secondes
  useEffect(() => {
    const checkReminders = async () => {
      const now = new Date();
      const pendingReminder = memoTasks.find(t => {
        if (t.done || !t.reminder || t.reminderTriggered) return false;
        const reminderTime = new Date(t.reminder);
        return reminderTime <= now;
      });
      
      if (pendingReminder && !showReminderPopup) {
        // Marquer comme triggered avant d'envoyer l'email
        setMemoTasks(prev => prev.map(t => 
          t.id === pendingReminder.id ? { ...t, reminderTriggered: true } : t
        ));
        
        // Envoyer l'email à l'admin connecté
        const emailTo = userEmail || localStorage.getItem('userEmail');
        if (emailTo) {
          try {
            const category = MEMO_CATEGORIES.find(c => c.value === pendingReminder.category);
            await axios.post(`${API_BASE}/api/memo/send-reminder`, {
              email: emailTo,
              task: {
                ...pendingReminder,
                category: category?.label || pendingReminder.category
              }
            });
          } catch (err) {
            console.error('Erreur envoi email rappel:', err);
          }
        }
        
        // Afficher aussi le popup visuel
        setCurrentReminder(pendingReminder);
        setShowReminderPopup(true);
        
        // Son de notification
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sbJOYj4FzZnN9iJF/bF9ne4yVhnBfZHKEkYt3ZWVwe4iNgnhxcHmDiod9dHJ2fYOHhH57eHt+goOBf3x7fH6AgYF/fn1+f4CAgIB/f39/gICAgH9/f3+AgICAgA==');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch {}
      }
    };
    
    checkReminders();
    const interval = setInterval(checkReminders, 30000); // Check toutes les 30s
    return () => clearInterval(interval);
  }, [memoTasks, showReminderPopup, userEmail]);
  
  // Récupérer le profil depuis l'API (prénom, nom, email)
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API_BASE}/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data?.prenom) {
            setUserPrenom(res.data.prenom);
            localStorage.setItem('prenom', res.data.prenom);
          }
          if (res.data?.nom) localStorage.setItem('nom', res.data.nom);
          if (res.data?.email) {
            setUserEmail(res.data.email);
            localStorage.setItem('userEmail', res.data.email);
          }
        } catch (e) { /* silent */ }
      }
    };
    fetchUserProfile();
  }, [token]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTION DES CONSIGNES
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchConsignes = useCallback(async () => {
    if (!token) return;
    setLoadingConsignes(true);
    try {
      const res = await axios.get(`${API_BASE}/api/consignes/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConsignes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erreur chargement consignes:', err);
    } finally {
      setLoadingConsignes(false);
    }
  }, [token]);

  // Charger les catégories disponibles pour le ciblage
  const fetchCategories = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/api/consignes/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategoriesDisponibles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
    }
  }, [token]);

  useEffect(() => { fetchConsignes(); fetchCategories(); }, [fetchConsignes, fetchCategories]);

  // Fetch événements pour le header
  useEffect(() => {
    const fetchHeaderEvents = async () => {
      try {
        // Récupérer les matchs et événements Vincennes en parallèle
        const [matchRes, vincennesRes] = await Promise.all([
          axios.get(`${API_BASE}/api/events/matches`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE}/api/events/evenements-vincennes`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const matches = matchRes.data?.matches || [];
        const vincennesEvents = vincennesRes.data?.events || [];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const events = [];
        
        // Jours fériés et fêtes (dans les 7 prochains jours)
        const fetes = [
          { date: '2025-01-01', nom: 'Jour de l\'An', icon: PartyPopper, color: 'violet', impact: 'high' },
          { date: '2025-02-14', nom: 'Saint-Valentin', icon: Heart, color: 'rose', impact: 'critical' },
          { date: '2025-04-20', nom: 'Pâques', icon: Gift, color: 'amber', impact: 'medium' },
          { date: '2025-05-01', nom: 'Fête du Travail', icon: Flower2, color: 'emerald', impact: 'high' },
          { date: '2025-05-25', nom: 'Fête des Mères', icon: Heart, color: 'pink', impact: 'critical' },
          { date: '2025-06-15', nom: 'Fête des Pères', icon: Star, color: 'blue', impact: 'high' },
          { date: '2025-07-14', nom: 'Fête Nationale', icon: Flag, color: 'blue', impact: 'high' },
          { date: '2025-10-31', nom: 'Halloween', icon: PartyPopper, color: 'orange', impact: 'medium' },
          { date: '2025-12-24', nom: 'Réveillon Noël', icon: TreePine, color: 'emerald', impact: 'critical' },
          { date: '2025-12-25', nom: 'Noël', icon: Gift, color: 'red', impact: 'high' },
          { date: '2025-12-31', nom: 'Réveillon', icon: PartyPopper, color: 'violet', impact: 'critical' },
          { date: '2026-01-01', nom: 'Jour de l\'An', icon: PartyPopper, color: 'violet', impact: 'high' },
        ];
        
        fetes.forEach(fete => {
          const feteDate = new Date(fete.date);
          feteDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((feteDate - today) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 7) {
            events.push({ ...fete, daysUntil: diffDays, type: 'fete' });
          }
        });
        
        // Vacances scolaires Zone C
        const vacances = [
          { debut: '2025-12-21', fin: '2026-01-05', nom: 'Vacances de Noël', icon: Snowflake, color: 'sky' },
          { debut: '2026-02-14', fin: '2026-03-02', nom: 'Vacances d\'Hiver', icon: Snowflake, color: 'blue' },
          { debut: '2026-04-11', fin: '2026-04-27', nom: 'Vacances Printemps', icon: Sun, color: 'amber' },
        ];
        
        vacances.forEach(vac => {
          const debutDate = new Date(vac.debut);
          const finDate = new Date(vac.fin);
          if (today >= debutDate && today <= finDate) {
            const joursRestants = Math.ceil((finDate - today) / (1000 * 60 * 60 * 24));
            events.push({ ...vac, daysUntil: 0, type: 'vacances', detail: `${joursRestants}j restants` });
          } else {
            const diffDays = Math.ceil((debutDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays > 0 && diffDays <= 7) {
              events.push({ ...vac, nom: `Début ${vac.nom}`, daysUntil: diffDays, type: 'vacances' });
            }
          }
        });
        
        // Matchs importants
        matches.filter(m => m.importance >= 4).forEach(match => {
          const matchDate = new Date(match.date);
          matchDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((matchDate - today) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 3) {
            const homeShort = match.homeTeam?.replace('Paris Saint-Germain', 'PSG').split(' ')[0] || '?';
            const awayShort = match.awayTeam?.replace('Paris Saint-Germain', 'PSG').split(' ')[0] || '?';
            events.push({
              nom: `${homeShort} vs ${awayShort}`,
              icon: Tv,
              color: 'indigo',
              daysUntil: diffDays,
              type: 'match',
              impact: 'high',
              heure: match.time || '21:00'
            });
          }
        });
        
        // 🏇 Événements Vincennes - Filtrés par proximité et statut
        // Lieux proches du restaurant Vincennes (impact sur affluence)
        const lieuxProches = ['Hippodrome', 'Centre-ville', 'Mairie', 'Chateau', 'Château', 'Coeur de Ville', 'Vincennes'];
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        
        vincennesEvents.forEach(evt => {
          // Vérifier si le lieu est proche du restaurant
          const isProche = lieuxProches.some(lieu => 
            evt.lieu?.toLowerCase().includes(lieu.toLowerCase())
          );
          if (!isProche) return;
          
          const evtDate = new Date(evt.date);
          evtDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((evtDate - today) / (1000 * 60 * 60 * 24));
          
          // Calculer heures de début et fin (durées réalistes)
          const [heureEvt, minEvt] = (evt.heure || '00:00').split(':').map(Number);
          // Durées selon type: commerce/soldes = journée, hippodrome = 4h, brocante = 8h, animation = 6h
          const dureeEstimee = evt.type === 'commerce' ? 10 : evt.type === 'hippodrome' ? 4 : evt.type === 'brocante' ? 8 : evt.type === 'animation' ? 6 : 3;
          const heureFin = Math.min(heureEvt + dureeEstimee, 22); // Max 22h
          
          // Calculer le statut de l'événement
          let status = 'upcoming'; // Par défaut: à venir
          let minutesUntilStart = null;
          
          if (diffDays === 0) {
            const nowMinutes = currentHour * 60 + currentMinutes;
            const startMinutes = heureEvt * 60 + (minEvt || 0);
            const endMinutes = heureFin * 60;
            
            if (nowMinutes >= endMinutes) {
              return; // Événement terminé, on l'ignore
            } else if (nowMinutes >= startMinutes) {
              status = 'ongoing'; // EN COURS
            } else if (startMinutes - nowMinutes <= 120) {
              status = 'soon'; // Dans moins de 2h
              minutesUntilStart = startMinutes - nowMinutes;
            }
          }
          
          // Période d'affichage selon l'impact (étendue)
          // Critical: J-21, High: J-10, Hippodrome/Commerce: J-10, Medium: J-5
          const isCritical = evt.impact === 'critical';
          const isHigh = evt.impact === 'high';
          const isMedium = evt.impact === 'medium';
          const isHippodrome = evt.type === 'hippodrome';
          const isCommerce = evt.type === 'commerce';
          const maxDays = isCritical ? 21 : isHigh ? 10 : (isHippodrome || isCommerce) ? 10 : isMedium ? 5 : 3;
          
          // Filtrer: événements importants, hippodrome, commerce ou en cours
          if (diffDays >= 0 && diffDays <= maxDays && (isCritical || isHigh || isHippodrome || isCommerce || status === 'ongoing')) {
            // Icônes Lucide selon le type
            let icon = MapPin;
            if (evt.type === 'hippodrome') icon = Flag;
            else if (evt.type === 'ferie') icon = Calendar;
            else if (evt.type === 'animation') icon = PartyPopper;
            else if (evt.type === 'culture') icon = Building2;
            else if (evt.type === 'commerce') icon = ShoppingBag;
            else if (evt.type === 'brocante') icon = ShoppingBag;
            else if (evt.type === 'fete') icon = PartyPopper;
            
            events.push({
              nom: evt.nom,
              icon,
              daysUntil: diffDays,
              type: 'vincennes',
              evtType: evt.type,
              impact: evt.impact,
              heure: evt.heure,
              heureFin: `${heureFin}:00`,
              detail: evt.detail,
              lieu: evt.lieu,
              affluenceEstimee: evt.affluenceEstimee,
              status,
              minutesUntilStart
            });
          }
        });
        
        // Trier: EN COURS d'abord, puis par proximité, puis par impact
        events.sort((a, b) => {
          // Priorité 1: EN COURS en premier
          if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
          if (b.status === 'ongoing' && a.status !== 'ongoing') return 1;
          // Priorité 2: Bientôt
          if (a.status === 'soon' && b.status !== 'soon') return -1;
          if (b.status === 'soon' && a.status !== 'soon') return 1;
          // Priorité 3: Par date
          if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
          // Priorité 4: Par impact
          const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return (impactOrder[a.impact] || 3) - (impactOrder[b.impact] || 3);
        });
        setHeaderEvents(events.slice(0, 5));
      } catch (err) {
        console.error('Erreur fetch header events:', err);
      }
    };
    fetchHeaderEvents();
  }, []);

  const handleSaveConsigne = async () => {
    if (!consigneForm.titre.trim() || !consigneForm.contenu.trim()) return;
    try {
      if (editingConsigne) {
        await axios.put(`${API_BASE}/api/consignes/${editingConsigne.id}`, consigneForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_BASE}/api/consignes`, consigneForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      fetchConsignes();
      setShowConsigneModal(false);
      setEditingConsigne(null);
      setConsigneForm({ titre: '', contenu: '', type: 'info', dateFin: '', cibleCategorie: '' });
    } catch (err) {
      console.error('Erreur sauvegarde consigne:', err);
    }
  };

  const handleDeleteConsigne = async (id) => {
    if (!window.confirm('Supprimer cette consigne ?')) return;
    try {
      await axios.delete(`${API_BASE}/api/consignes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchConsignes();
    } catch (err) {
      console.error('Erreur suppression consigne:', err);
    }
  };

  const handleToggleConsigne = async (consigne) => {
    try {
      await axios.put(`${API_BASE}/api/consignes/${consigne.id}`, { active: !consigne.active }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchConsignes();
    } catch (err) {
      console.error('Erreur toggle consigne:', err);
    }
  };

  const openEditConsigne = (consigne) => {
    setEditingConsigne(consigne);
    setConsigneForm({
      titre: consigne.titre,
      contenu: consigne.contenu,
      type: consigne.type,
      dateFin: consigne.dateFin ? toLocalDateString(new Date(consigne.dateFin)) : '',
      cibleCategorie: consigne.cibleCategorie || ''
    });
    setShowConsigneModal(true);
  };

  // KPIs derivés
  const now = new Date();
  const kpi = computeKPIs(stats,{ now });
  const { employes=0, pointes=0, absents=0, nonPointes=0, enCongeAujourdHui=0, absenceBreakdown } = kpi;
  const effectifAttendu = Math.max(0, employes - enCongeAujourdHui);
  const presenceReellePct = effectifAttendu>0? Math.round(pointes/effectifAttendu*100):0;
  
  // Absences non planifiées = employés non pointés (déjà corrigé pour exclure les congés)
  const absencesNonPlanifiees = nonPointes;
  
  const nonPointesPct = effectifAttendu>0? Math.round(nonPointes/effectifAttendu*100):0;
  const urgentDemandes = pendingLeavesList.filter(c=>{ if(!c?.dateDebut) return false; return (new Date(c.dateDebut).getTime()-now.getTime()) < 48*3600*1000; }).length;

  // Calcul des heures supplémentaires du jour (à partir des comparaisons)
  let heuresSupTotal = 0;
  comparaisons.forEach(comp => {
    if (comp.ecarts) {
      comp.ecarts.forEach(ecart => {
        // Chercher les heures supplémentaires dans les écarts
        if (ecart.type?.includes('supplementaire') || ecart.dureeMinutes > 0) {
          heuresSupTotal += Math.abs(ecart.dureeMinutes || 0);
        }
      });
    }
    // Aussi prendre en compte les heures totales si disponibles
    if (comp.heuresExtra || comp.heuresSupplementaires) {
      heuresSupTotal += (comp.heuresExtra || comp.heuresSupplementaires);
    }
  });
  const heuresSupAffichage = Math.round((heuresSupTotal / 60) * 10) / 10; // Arrondi à 1 décimale

  // Couleurs
  const colorPresence = presenceReellePct>=85?'ok': presenceReellePct>=70?'warn':'alert';
  const colorNonPointes = nonPointes===0? 'ok' : nonPointesPct>10? 'warn':'neutral';
  const colorAbsNP = absencesNonPlanifiees===0? 'ok': (absencesNonPlanifiees/(effectifAttendu||1) > 0.05 ? 'warn':'neutral');

  // --- Anomalies sur shifts ---
  const dayMs = 24*3600*1000;
  const anomalies = { 
    retards: [], 
    nonAssignes: [], 
    conflits: [], 
    depassements: [], 
    certifications: [],
    // Nouvelles catégories depuis les comparaisons
    horsPlage: [],
    retardsMineurs: [],
    departsAnticipes: [],
    absencesNonPlanifiees: []
  };
  
  // Vérifier que les shifts ont les bonnes propriétés
  const validShifts = shifts.filter(s => s && s.start && s.end);
  
  // Index by employee for conflict detection
  const byEmp = {};
  validShifts.forEach(s => { 
    if(s.employeeId) { 
      byEmp[s.employeeId] = byEmp[s.employeeId] || []; 
      byEmp[s.employeeId].push(s);
    } 
  });
  
  Object.values(byEmp).forEach(list => list.sort((a,b)=> new Date(a.start)-new Date(b.start)));
  
  // Conflicts + detect tardiness & depassements
  validShifts.forEach(s => {
    const start = new Date(s.start); 
    const end = new Date(s.end);
    
    // Vérifier que les dates sont valides
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    
    const durationH = (end - start)/3600000;
    const started = !!(s.started || s.hasPointage || s.checkIn);
    if(start < now && end > now && !started && s.employeeId) anomalies.retards.push(s);
    if(!s.employeeId) anomalies.nonAssignes.push(s);
    if(durationH > 10) anomalies.depassements.push(s);
    if(typeof s.certExpiryDays === 'number' && s.certExpiryDays <=7) anomalies.certifications.push(s);
  });
  
  // Ajouter les anomalies depuis les comparaisons (écarts planning vs réalité)
  comparaisons.forEach(comp => {
    if (!comp.ecarts || comp.ecarts.length === 0) return;
    
    comp.ecarts.forEach(ecart => {
      const anomalie = {
        ...ecart,
        employeId: comp.employeId,
        employeNom: comp.employeNom,
        date: comp.date
      };
      
      // Catégoriser selon le type d'écart
      if (ecart.type === 'absence_totale') {
        anomalies.absencesNonPlanifiees.push(anomalie);
      } else if (ecart.type?.includes('hors_plage')) {
        anomalies.horsPlage.push(anomalie);
      } else if (ecart.type?.includes('retard')) {
        anomalies.retardsMineurs.push(anomalie);
      } else if (ecart.type?.includes('depart')) {
        anomalies.departsAnticipes.push(anomalie);
      }
    });
  });
  
  // Si aucune absence détectée par les comparaisons mais qu'il y a des absences non planifiées dans les stats,
  // c'est que les employés n'ont pas de planning. Utilisons les stats pour afficher les absences réelles.
  // MAIS : seulement si il y a des shifts aujourd'hui (sinon c'est normal qu'il n'y ait pas de pointages)
  if (anomalies.absencesNonPlanifiees.length === 0 && nonPointes > 0 && stats?.employes && validShifts.length > 0) {
    // Construire une liste générique d'absences basée sur les stats
    // Note: Nous n'avons pas la liste détaillée des noms ici, donc on affiche un message générique
    for (let i = 0; i < nonPointes; i++) {
      anomalies.absencesNonPlanifiees.push({
        type: 'absence_totale',
        employeNom: `Employé ${i + 1}`,
        message: 'Absence non planifiée (aucun pointage)',
        source: 'stats'
      });
    }
  }
  
  Object.values(byEmp).forEach(list => {
    for(let i=0;i<list.length;i++){
      for(let j=i+1;j<list.length;j++){
        const a=list[i], b=list[j];
        const aStart=new Date(a.start), aEnd=new Date(a.end), bStart=new Date(b.start), bEnd=new Date(b.end);
        if(aEnd > bStart && aStart < bEnd){ anomalies.conflits.push([a,b]); }
      }
    }
  });

  const hasAnomalies = Object.values(anomalies).some(arr => arr.length>0);

  const shiftStatus = s => {
    const start=new Date(s.start), end=new Date(s.end);
    if(now > end) return 'done';
    if(now >= start) return 'ongoing';
    return 'upcoming';
  };
  const shiftColor = status => status==='ongoing'? 'bg-green-500' : status==='upcoming'? 'bg-blue-500' : 'bg-gray-400';
  const shiftLight = status => status==='ongoing'? 'bg-green-50 border-green-200' : status==='upcoming'? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-200';
  const formatHM = d => new Date(d).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});

  // --- Remplacements / échanges à approuver ---
  // Heuristique: shift sans employeeId ou avec s.replacementRequested / s.swapRequest
  // Urgent: commence dans <2h ; Imminent: <6h
  const replacementsRaw = validShifts.filter(s => !s.employeeId || s.replacementRequested || s.swapRequest || s.employeeReplacementNeeded);
  const replacements = replacementsRaw.map(s => {
    const start = new Date(s.start);
    const end = new Date(s.end);
    
    // Vérifier que les dates sont valides
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    
    const diffH = (start - now)/3600000;
    let urgence = diffH < 0 ? 'en cours' : diffH <=2 ? 'urgent' : diffH <=6 ? 'bientôt' : 'planifié';
    const employeeName = s.employeeName || s.employeNom || s.nom || 
                        (s.employe?.prenom && s.employe?.nom ? `${s.employe.prenom} ${s.employe.nom}` : 
                        s.employe?.email || 'Non assigné');
    
    return { 
      id: s.id || s._id || `repl-${start.getTime()}`, 
      start, 
      end,
      employeeName,
      original: s, 
      urgence 
    };
  }).filter(Boolean).sort((a,b)=> a.start - b.start);
  
  const urgentReplacements = replacements.filter(r => r.urgence==='urgent');
  const ongoingReplacements = replacements.filter(r => r.urgence==='en cours');

  if(error) return <div className='p-4 text-sm text-red-600'>{error}</div>;

  // Calculs pour l'affichage
  const totalAnomalies = (anomalies.absencesNonPlanifiees?.length || 0) + 
    (anomalies.retards?.length || 0) + 
    (anomalies.horsPlage?.length || 0) + 
    (anomalies.departsAnticipes?.length || 0) + 
    (anomalies.nonAssignes?.length || 0);

  const totalActionsEnAttente = pendingConges + replacements.length;
  const employesPresents = employesList.filter(e => e.aPointe);
  const employesNonPointes = employesList.filter(e => !e.aPointe);

  // Salutation contextuelle selon l'heure
  const getGreeting = () => {
    const h = now.getHours();
    if (h >= 5 && h < 12) return 'Bonjour';
    if (h >= 12 && h < 18) return 'Bon après-midi';
    if (h >= 18 && h < 22) return 'Bonsoir';
    return 'Bonne nuit';
  };

  // Icône selon le moment
  const getTimeIcon = () => {
    const h = now.getHours();
    if (h >= 5 && h < 12) return Coffee;
    if (h >= 12 && h < 18) return Sun;
    if (h >= 18 && h < 22) return Star;
    return Moon; // Nuit
  };
  
  const formatDateFr = () => {
    return now.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className='px-4 sm:px-6 py-3 sm:py-4 space-y-4 bg-slate-50 min-h-screen'>

      {/* ═══════════════════════════════════════════════════════════════
          🎯 HEADER - Salutation + Avis Google
          ═══════════════════════════════════════════════════════════════ */}
      <div className='bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden'>
        <div className='px-5 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'>
          
          {/* Gauche - Salutation avec design épuré */}
          <div className='flex items-center gap-3'>
            {/* Icône subtile selon moment de la journée */}
            <div className='w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center'>
              {React.createElement(getTimeIcon(), { className: 'w-5 h-5 text-slate-500' })}
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-lg font-semibold text-gray-800'>
                  {getGreeting()}{userPrenom ? `, ${userPrenom}` : ''}
                </h1>
                <button 
                  onClick={fetchShiftsToday}
                  className='p-1.5 hover:bg-slate-100 rounded-lg text-gray-300 hover:text-gray-500 transition-colors'
                  title='Actualiser les données'
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingShifts ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className='text-sm text-gray-400 flex items-center gap-1.5'>
                <Calendar className='w-3 h-3' />
                <span className='capitalize'>{formatDateFr()}</span>
              </p>
            </div>
          </div>

          {/* Droite - Avis Google mis en valeur */}
          <div className='flex items-center'>
            <AvisGoogle compact />
          </div>
        </div>

        {/* 📅 Événements à venir - Section claire */}
        {headerEvents.length > 0 && (
          <div className='px-5 py-3 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white'>
            <div className='flex items-center gap-4 overflow-x-auto'>
              {/* Titre de section clair */}
              <div className='flex items-center gap-2 flex-shrink-0 pr-3 border-r border-slate-200'>
                <CalendarDays className='w-4 h-4 text-slate-500' />
                <div className='flex flex-col'>
                  <span className='text-xs font-semibold text-slate-700'>Événements</span>
                  <span className='text-[10px] text-slate-400'>à proximité</span>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                {headerEvents.map((event, idx) => {
                  const isToday = event.daysUntil === 0;
                  const isTomorrow = event.daysUntil === 1;
                  const EventIcon = event.icon || Calendar;
                  const isOngoing = event.status === 'ongoing';
                  const isSoon = event.status === 'soon';
                  
                  // Couleur selon le statut et l'impact
                  let colorClass = 'bg-slate-50 border-slate-200 text-gray-600';
                  if (isOngoing) {
                    colorClass = 'bg-green-100 border-green-400 text-green-800 shadow-green-100 shadow-md';
                  } else if (isSoon) {
                    colorClass = 'bg-orange-100 border-orange-300 text-orange-800';
                  } else if (event.impact === 'critical') {
                    colorClass = isToday 
                      ? 'bg-red-100 border-red-300 text-red-800' 
                      : 'bg-red-50 border-red-200 text-red-700';
                  } else if (event.impact === 'high') {
                    colorClass = isToday || isTomorrow
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-slate-50 border-slate-200 text-gray-700';
                  }
                  
                  // Label contextuel avec statut
                  const getContextLabel = () => {
                    if (isOngoing) return null; // Tag séparé
                    if (isSoon) {
                      const mins = event.minutesUntilStart;
                      if (mins < 60) return `Dans ${mins}min`;
                      return `Dans ${Math.floor(mins/60)}h`;
                    }
                    if (isToday) {
                      if (event.heure && event.heure !== '00:00') return event.heure;
                      return "Auj.";
                    }
                    if (isTomorrow) return "Demain";
                    return `J-${event.daysUntil}`;
                  };
                  
                  // Tooltip
                  const tooltipLines = [
                    event.detail,
                    event.lieu,
                    event.heure && event.heure !== '00:00' && `${event.heure} - ${event.heureFin}`,
                    event.impact === 'critical' && '⚠️ Forte affluence attendue'
                  ].filter(Boolean).join(' • ');
                  
                  return (
                    <div 
                      key={idx}
                      title={tooltipLines}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-default hover:shadow-md ${colorClass} ${isOngoing ? 'ring-2 ring-green-400/50' : ''}`}
                    >
                      {/* Tag EN COURS */}
                      {isOngoing && (
                        <span className='flex items-center gap-1 px-1.5 py-0.5 bg-green-500 text-white text-[9px] font-bold rounded-md uppercase tracking-wide'>
                          <span className='w-1.5 h-1.5 bg-white rounded-full animate-pulse' />
                          En cours
                        </span>
                      )}
                      
                      {/* Icône */}
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isOngoing ? 'bg-green-200' : 'bg-white/60'
                      }`}>
                        <EventIcon className='w-3 h-3' />
                      </div>
                      
                      {/* Contenu principal */}
                      <div className='flex flex-col min-w-0'>
                        <div className='flex items-center gap-1'>
                          <span className='text-[11px] font-semibold whitespace-nowrap leading-tight truncate max-w-[160px]'>
                            {event.nom}
                          </span>
                          {/* Icône impact critique */}
                          {event.impact === 'critical' && !isOngoing && (
                            <Flame className='w-3 h-3 text-red-500 flex-shrink-0' />
                          )}
                        </div>
                        <div className='flex items-center gap-1.5 text-[10px] opacity-75'>
                          {getContextLabel() && <span className='whitespace-nowrap font-medium'>{getContextLabel()}</span>}
                          {event.lieu && (
                            <>
                              {getContextLabel() && <span className='opacity-50'>•</span>}
                              <span className='whitespace-nowrap truncate max-w-[80px]'>{event.lieu}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          📊 Cards contextuelles avec détails
          ═══════════════════════════════════════════════════════════════ */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        
        {/* Card Présence du jour */}
        <div className='bg-white rounded-xl border border-slate-200 p-4'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <Users className='w-4 h-4 text-slate-400' />
              <span className='text-sm font-medium text-gray-700'>Présence</span>
            </div>
            <span className={`text-lg font-semibold ${pointes === effectifAttendu ? 'text-emerald-600' : 'text-gray-800'}`}>
              {pointes}/{effectifAttendu}
            </span>
          </div>
          {employesNonPointes.length > 0 ? (
            <div className='space-y-1.5'>
              <p className='text-xs text-gray-400 mb-2'>Non pointés :</p>
              {employesNonPointes.slice(0, 3).map((emp, i) => (
                <div key={i} className='flex items-center gap-2 text-xs'>
                  <div className='w-1.5 h-1.5 rounded-full bg-amber-400'></div>
                  <span className='text-gray-600 truncate'>{emp.nomComplet || `${emp.prenom} ${emp.nom}`}</span>
                </div>
              ))}
              {employesNonPointes.length > 3 && (
                <button 
                  onClick={() => onNavigate?.('vuejour')}
                  className='text-xs text-gray-400 hover:text-gray-600 mt-1'
                >
                  +{employesNonPointes.length - 3} autres →
                </button>
              )}
            </div>
          ) : (
            <div className='flex items-center gap-2 text-xs text-emerald-600'>
              <CheckCircle className='w-3.5 h-3.5' />
              <span>Tous les employés ont pointé</span>
            </div>
          )}
        </div>

        {/* Card Derniers pointages */}
        <div className='bg-white rounded-xl border border-slate-200 p-4'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <Clock className='w-4 h-4 text-slate-400' />
              <span className='text-sm font-medium text-gray-700'>Derniers pointages</span>
            </div>
          </div>
          {(() => {
            const derniersArrivants = employesPresents
              .filter(e => e.heureEntree)
              .sort((a, b) => new Date(b.heureEntree) - new Date(a.heureEntree))
              .slice(0, 4);
            
            return derniersArrivants.length > 0 ? (
              <div className='space-y-1.5'>
                {derniersArrivants.map((emp, i) => (
                  <div key={i} className='flex items-center justify-between text-xs'>
                    <span className='text-gray-600 truncate'>{emp.prenom} {emp.nom?.charAt(0)}.</span>
                    <span className='text-emerald-600 font-medium'>
                      {new Date(emp.heureEntree).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className='flex items-center gap-2 text-xs text-gray-400'>
                <Clock className='w-3.5 h-3.5' />
                <span>Aucun pointage aujourd'hui</span>
              </div>
            );
          })()}
        </div>

        {/* Card Congés & Absences (fusionnée avec congés à venir) */}
        <div className='bg-white rounded-xl border border-slate-200 p-4 flex flex-col'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <Plane className='w-4 h-4 text-slate-400' />
              <span className='text-sm font-medium text-gray-700'>Congés</span>
            </div>
            {pendingConges > 0 && (
              <span className='px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full'>
                {pendingConges} en attente
              </span>
            )}
          </div>
          <div className='space-y-3 flex-1 overflow-y-auto max-h-48 custom-scrollbar'>
            {/* Absents aujourd'hui */}
            {enCongeAujourdHui > 0 && (
              <div className='pb-3 border-b border-slate-100'>
                <p className='text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-2'>Absents aujourd'hui</p>
                <div className='space-y-1.5'>
                  {congesAVenirList.filter(c => {
                    const debut = new Date(c.dateDebut);
                    const fin = new Date(c.dateFin);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    return debut <= today && fin >= today;
                  }).slice(0, 3).map((c, i) => {
                    const typeConfig = {
                      'CP': { color: 'text-blue-600', bg: 'bg-blue-50' },
                      'RTT': { color: 'text-purple-600', bg: 'bg-purple-50' },
                      'maladie': { color: 'text-red-600', bg: 'bg-red-50' },
                      'formation': { color: 'text-cyan-600', bg: 'bg-cyan-50' },
                      'sans solde': { color: 'text-gray-600', bg: 'bg-gray-50' },
                      'default': { color: 'text-slate-600', bg: 'bg-slate-50' }
                    };
                    const config = typeConfig[c.type] || typeConfig.default;
                    
                    return (
                      <div key={i} className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <div className={`w-1.5 h-1.5 rounded-full ${config.color.replace('text-', 'bg-')}`}></div>
                          <span className='text-xs text-gray-700'>{c.user?.prenom} {c.user?.nom?.charAt(0)}.</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${config.bg} ${config.color} font-medium`}>
                          {c.type || 'Congé'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Congés à venir */}
            {(() => {
              const congesFuturs = congesAVenirList.filter(c => {
                const debut = new Date(c.dateDebut);
                const today = new Date();
                today.setHours(0,0,0,0);
                return debut > today;
              });
              
              if (congesFuturs.length === 0) return null;
              
              return (
                <div>
                  <p className='text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-2'>À venir</p>
                  <div className='space-y-2'>
                    {congesFuturs.slice(0, 4).map((c, i) => {
                      const typeConfig = {
                        'CP': { color: 'text-blue-600', bg: 'bg-blue-50', icon: Plane },
                        'RTT': { color: 'text-purple-600', bg: 'bg-purple-50', icon: Clock },
                        'maladie': { color: 'text-red-600', bg: 'bg-red-50', icon: Heart },
                        'formation': { color: 'text-cyan-600', bg: 'bg-cyan-50', icon: BookOpen },
                        'sans solde': { color: 'text-gray-600', bg: 'bg-gray-50', icon: FileText },
                        'default': { color: 'text-slate-600', bg: 'bg-slate-50', icon: Calendar }
                      };
                      const config = typeConfig[c.type] || typeConfig.default;
                      const IconComponent = config.icon;
                      const debut = new Date(c.dateDebut);
                      const fin = new Date(c.dateFin);
                      const nbJours = Math.ceil((fin - debut) / (1000*60*60*24)) + 1;
                      const today = new Date();
                      const dansJours = Math.ceil((debut - today) / (1000*60*60*24));
                      
                      return (
                        <div key={i} className='flex items-center gap-3 py-1.5'>
                          <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className={`w-3.5 h-3.5 ${config.color}`} />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-xs font-medium text-gray-800 truncate'>{c.user?.prenom} {c.user?.nom?.charAt(0)}.</p>
                            <p className='text-[10px] text-gray-400'>
                              {debut.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                              {nbJours > 1 && ` → ${fin.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`}
                            </p>
                          </div>
                          <div className='text-right flex-shrink-0'>
                            <p className={`text-[10px] font-medium ${config.color}`}>{c.type || 'Congé'}</p>
                            <p className='text-[10px] text-gray-400'>
                              {nbJours}j · {dansJours === 1 ? 'demain' : `J-${dansJours}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {congesFuturs.length > 4 && (
                      <p className='text-[10px] text-center text-gray-400 pt-1'>
                        +{congesFuturs.length - 4} autre{congesFuturs.length - 4 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
            
            {/* Si rien */}
            {enCongeAujourdHui === 0 && congesAVenirList.length === 0 && pendingConges === 0 && (
              <div className='flex items-center gap-2 text-xs text-emerald-600 py-2'>
                <CheckCircle className='w-4 h-4' />
                <span>Aucun congé prévu cette semaine</span>
              </div>
            )}
            
            {pendingConges > 0 && (
              <button 
                onClick={() => onNavigate?.('demandes')}
                className='w-full mt-2 py-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-medium rounded-lg transition-colors flex items-center justify-center gap-1'
              >
                <Clock className='w-3.5 h-3.5' />
                Valider {pendingConges} demande{pendingConges > 1 ? 's' : ''} →
              </button>
            )}
          </div>
        </div>

        {/* Card Anomalies */}
        <div className='bg-white rounded-xl border border-slate-200 p-4'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <AlertTriangle className='w-4 h-4 text-slate-400' />
              <span className='text-sm font-medium text-gray-700'>Anomalies</span>
            </div>
            {totalAnomalies > 0 && (
              <span className='px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full'>
                {totalAnomalies}
              </span>
            )}
          </div>
          {totalAnomalies > 0 ? (
            <div className='space-y-1.5'>
              {anomalies.retards?.length > 0 && (
                <div className='flex items-center justify-between text-xs'>
                  <div className='flex items-center gap-2'>
                    <Clock className='w-3 h-3 text-amber-500' />
                    <span className='text-gray-600'>Retards</span>
                  </div>
                  <span className='text-amber-600 font-medium'>{anomalies.retards.length}</span>
                </div>
              )}
              {anomalies.horsPlage?.length > 0 && (
                <div className='flex items-center justify-between text-xs'>
                  <div className='flex items-center gap-2'>
                    <AlertCircle className='w-3 h-3 text-orange-500' />
                    <span className='text-gray-600'>Hors planning</span>
                  </div>
                  <span className='text-orange-600 font-medium'>{anomalies.horsPlage.length}</span>
                </div>
              )}
              {anomalies.depassements?.length > 0 && (
                <div className='flex items-center justify-between text-xs'>
                  <div className='flex items-center gap-2'>
                    <Timer className='w-3 h-3 text-red-500' />
                    <span className='text-gray-600'>Dépassements</span>
                  </div>
                  <span className='text-red-600 font-medium'>{anomalies.depassements.length}</span>
                </div>
              )}
              {anomalies.nonAssignes?.length > 0 && (
                <div className='flex items-center justify-between text-xs'>
                  <div className='flex items-center gap-2'>
                    <UserX className='w-3 h-3 text-slate-500' />
                    <span className='text-gray-600'>Non assignés</span>
                  </div>
                  <span className='text-slate-600 font-medium'>{anomalies.nonAssignes.length}</span>
                </div>
              )}
              <button 
                onClick={() => onNavigate?.({ menu: 'planning', openAnomalies: true })}
                className='text-xs text-red-600 hover:text-red-700 mt-2 font-medium'
              >
                Traiter les anomalies →
              </button>
            </div>
          ) : (
            <div className='flex items-center gap-2 text-xs text-emerald-600'>
              <CheckCircle className='w-3.5 h-3.5' />
              <span>Aucune anomalie</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          🗓️ PLANNING DU JOUR - Noms compacts sur une ligne
          ═══════════════════════════════════════════════════════════════ */}
          
          <section className='bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden'>
            {/* Header */}
            <div className='px-4 py-2.5 border-b border-slate-100 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div className='w-8 h-8 rounded-lg flex items-center justify-center' style={{ backgroundColor: '#fef2f2' }}>
                  <CalendarDays className='w-4 h-4' style={{ color: '#cf292c' }} />
                </div>
                <h3 className='text-sm font-semibold text-gray-900'>Planning du jour</h3>
              </div>
              <button 
                onClick={() => onNavigate?.('planning')}
                className='flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors hover:bg-red-50'
                style={{ color: '#cf292c' }}
              >
                Détails <ChevronRight className='w-3.5 h-3.5' />
              </button>
            </div>
            
            <div className='p-3'>
              {loadingShifts ? (
                <div className='animate-pulse h-24 bg-slate-100 rounded'></div>
              ) : validShifts.length === 0 ? (
                <div className='text-center py-6'>
                  <CalendarDays className='w-8 h-8 text-slate-300 mx-auto mb-2' />
                  <p className='text-xs text-gray-500'>Aucun shift programmé</p>
                </div>
              ) : (
                <>
                  {(() => {
                    const categoryIcons = {
                      'Cuisine': UtensilsCrossed, 'cuisine': UtensilsCrossed,
                      'Salle': Coffee, 'salle': Coffee,
                      'Pizzas': Flame, 'pizzas': Flame, 'Pizza': Flame, 'pizza': Flame,
                      'Bar': Coffee, 'bar': Coffee, 'Service': Users, 'service': Users,
                      'Caisse': Package, 'caisse': Package, 'Caisse/Service': Package,
                      'Manager': UserCog, 'manager': UserCog,
                      'Pastaiolo': UtensilsCrossed, 'Pizzaiolo': Flame, 'Entretien': ClipboardList,
                      'Securite': ShieldCheck, 'Assistant Direction': ClipboardList, 'Autre': ClipboardList,
                    };
                    
                    const categories = [...new Set(validShifts
                      .filter(s => s.type !== 'repos' && s.type !== 'absence')
                      .map(s => s.employe?.categorie || s.categorie || 'Autre')
                    )].sort();
                    
                    let minHour = 24, maxHour = 0;
                    validShifts.filter(s => s.type !== 'repos' && s.type !== 'absence').forEach(s => {
                      const startH = new Date(s.start).getHours();
                      const end = new Date(s.end);
                      let endH = end.getHours();
                      const endM = end.getMinutes();
                      
                      // Détecter si fin après minuit (date de fin > date de début)
                      const start = new Date(s.start);
                      const isNextDay = end.getDate() !== start.getDate() || end.getMonth() !== start.getMonth();
                      
                      if (isNextDay) {
                        // Fin après minuit - ajouter 24h
                        endH = endH + 24;
                        if (endM > 0) endH = Math.ceil(endH); // Arrondir au supérieur
                      } else {
                        // Même jour - si minutes > 0, on doit afficher l'heure suivante
                        if (endM > 0) endH = endH + 1;
                      }
                      
                      if (startH < minHour) minHour = startH;
                      if (endH > maxHour) maxHour = endH;
                    });
                    
                    if (minHour > maxHour) { minHour = 10; maxHour = 22; }
                    // Toujours afficher jusqu'à 1h du matin (25 = 1h)
                    maxHour = Math.max(maxHour, 25);
                    
                    const heures = [];
                    for (let h = minHour; h < maxHour; h++) heures.push(h);
                    
                    // Parse une heure "HH:MM" en nombre décimal
                    const parseTime = (timeStr) => {
                      if (!timeStr) return 0;
                      const [h, m] = timeStr.split(':').map(Number);
                      return h + (m || 0) / 60;
                    };
                    
                    // Vérifie si l'employé travaille à une heure donnée EN TENANT COMPTE DES SEGMENTS
                    const isWorkingAt = (shift, hour) => {
                      const shiftDate = new Date(shift.date || shift.start);
                      
                      // Si le shift a des segments (double shift avec pause)
                      if (shift.segments && Array.isArray(shift.segments) && shift.segments.length > 0) {
                        return shift.segments.some(seg => {
                          const startTime = parseTime(seg.debut || seg.start);
                          let endTime = parseTime(seg.fin || seg.end);
                          // Si fin après minuit
                          if (endTime < startTime) endTime += 24;
                          return startTime <= hour && endTime >= hour;
                        });
                      }
                      
                      // Sinon, utiliser start/end du shift
                      const start = new Date(shift.start);
                      const end = new Date(shift.end);
                      const startH = start.getHours() + start.getMinutes() / 60;
                      let endH = end.getHours() + end.getMinutes() / 60;
                      
                      const isNextDay = end.getDate() !== start.getDate();
                      if (isNextDay || (endH >= 0 && endH <= 6 && startH > 12)) {
                        endH += 24;
                      }
                      
                      return startH <= hour && endH >= hour;
                    };
                    
                    // Récupérer les horaires formatés d'un shift (tous les segments)
                    const getShiftHoraires = (shift) => {
                      if (shift.segments && Array.isArray(shift.segments) && shift.segments.length > 0) {
                        return shift.segments.map(seg => {
                          const startTime = seg.debut || seg.start || '?';
                          const endTime = seg.fin || seg.end || '?';
                          // Formater sans les :00 si heure pile
                          const formatTime = (t) => {
                            if (!t) return '?';
                            const [h, m] = t.split(':');
                            return m === '00' ? `${parseInt(h)}h` : `${parseInt(h)}h${m}`;
                          };
                          return `${formatTime(startTime)}-${formatTime(endTime)}`;
                        }).join(' + ');
                      }
                      // Fallback sur start/end
                      const start = new Date(shift.start);
                      const end = new Date(shift.end);
                      const formatH = (d) => {
                        const h = d.getHours();
                        const m = d.getMinutes();
                        return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
                      };
                      return `${formatH(start)}-${formatH(end)}`;
                    };
                    
                    const currentHour = now.getHours();
                    
                    return (
                      <div className='overflow-x-auto rounded-lg border border-slate-200'>
                        <table className='w-full border-collapse' style={{ minWidth: `${100 + heures.length * 70}px` }}>
                          <thead>
                            <tr className='bg-slate-50'>
                              <th className='sticky left-0 z-10 bg-slate-50 px-2 py-2 text-left border-r border-slate-200 min-w-[100px]'>
                                <span className='text-[9px] font-semibold text-gray-500 uppercase'>Poste</span>
                              </th>
                              {heures.map((h, i) => {
                                const isNow = h === currentHour || (h === 24 && currentHour === 0);
                                const isPast = h < currentHour || (currentHour === 0 && h < 24);
                                const displayHour = h >= 24 ? h - 24 : h;
                                const displayText = displayHour === 0 ? '00h' : `${displayHour}h`;
                                return (
                                  <th 
                                    key={i} 
                                    className={`px-1 py-2 text-center min-w-[65px] border-l border-slate-100 ${isNow ? 'bg-red-100' : ''}`}
                                  >
                                    <div className='flex flex-col items-center'>
                                      {isNow && <span className='w-1.5 h-1.5 rounded-full animate-pulse mb-0.5' style={{ backgroundColor: '#cf292c' }} />}
                                      <span className={`text-[10px] font-semibold ${isNow ? '' : isPast ? 'text-gray-400' : 'text-gray-600'}`} style={{ color: isNow ? '#cf292c' : undefined }}>
                                        {displayText}
                                      </span>
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {categories.map((cat, catIdx) => {
                              const CategoryIcon = categoryIcons[cat] || ClipboardList;
                              return (
                                <tr key={catIdx} className={`${catIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} border-t border-slate-100`}>
                                  <td className={`sticky left-0 z-10 px-2 py-2 border-r border-slate-200 ${catIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}>
                                    <div className='flex items-center gap-1.5'>
                                      <CategoryIcon className='w-3.5 h-3.5 text-slate-400 flex-shrink-0' />
                                      <span className='text-[10px] font-medium text-gray-700 truncate'>{cat}</span>
                                    </div>
                                  </td>
                                  {heures.map((h, hIdx) => {
                                    const isNow = h === currentHour || (h === 24 && currentHour === 0);
                                    const isPast = (h < currentHour) || (h >= 24 && currentHour > 0 && currentHour < 6);
                                    
                                    // Récupérer les shifts avec leurs horaires complets (segments)
                                    const shiftsHere = validShifts
                                      .filter(s => {
                                        const shiftCat = s.employe?.categorie || s.categorie || 'Autre';
                                        return shiftCat === cat && s.type !== 'repos' && s.type !== 'absence' && isWorkingAt(s, h);
                                      })
                                      .map(s => ({
                                        prenom: s.employe?.prenom || 'N/A',
                                        horaire: getShiftHoraires(s),
                                        shift: s
                                      }));
                                    
                                    // Dédupliquer par prénom
                                    const uniqueEmployes = [];
                                    const seen = new Set();
                                    shiftsHere.forEach(e => {
                                      if (!seen.has(e.prenom)) {
                                        seen.add(e.prenom);
                                        uniqueEmployes.push(e);
                                      }
                                    });
                                    const count = uniqueEmployes.length;
                                    
                                    return (
                                      <td 
                                        key={hIdx} 
                                        className={`px-1 py-1.5 text-center align-top border-l border-slate-100 ${isNow ? 'bg-red-50' : ''}`}
                                        title={uniqueEmployes.map(e => `${e.prenom}: ${e.horaire}`).join('\n')}
                                      >
                                        {count > 0 ? (
                                          <div className='flex flex-col gap-px'>
                                            {uniqueEmployes.slice(0, 4).map((emp, nIdx) => {
                                              return (
                                                <div 
                                                  key={nIdx}
                                                  className='text-[9px] px-1 py-0.5 rounded text-center relative'
                                                  style={{
                                                    backgroundColor: isPast ? '#f1f5f9' : isNow ? '#fef2f2' : '#ecfdf5',
                                                    color: isPast ? '#94a3b8' : isNow ? '#b91c1c' : '#047857',
                                                    fontWeight: isNow ? 600 : 500
                                                  }}
                                                >
                                                  <div className='truncate'>{emp.prenom.length > 7 ? emp.prenom.substring(0, 6) + '.' : emp.prenom}</div>
                                                </div>
                                              );
                                            })}
                                            {count > 4 && (
                                              <div 
                                                className='text-[8px] font-bold rounded py-0.5 text-center'
                                                style={{
                                                  backgroundColor: isPast ? '#e2e8f0' : isNow ? '#fecaca' : '#a7f3d0',
                                                  color: isPast ? '#64748b' : isNow ? '#991b1b' : '#065f46'
                                                }}
                                              >
                                                +{count - 4}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span className='text-[9px] text-slate-200'>–</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                  
                  {/* Légende */}
                  <div className='mt-2 flex items-center justify-end gap-3 text-[9px] text-gray-500'>
                    <span className='flex items-center gap-1'>
                      <span className='w-2.5 h-2.5 rounded' style={{ backgroundColor: '#fef2f2' }} /> En cours
                    </span>
                    <span className='flex items-center gap-1'>
                      <span className='w-2.5 h-2.5 rounded bg-emerald-50' /> À venir
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>

      {/* ═══════════════════════════════════════════════════════════════
          🏗️ CONSIGNES + MÉMO - Grille 2 colonnes équilibrées
          ═══════════════════════════════════════════════════════════════ */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            
            {/* Consignes du jour - 1/2 de la largeur */}
            <section className='bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col max-h-[400px]'>
              <div className='px-4 py-3 border-b border-slate-100 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Megaphone className='w-4 h-4 text-gray-400' />
                  <h3 className='text-sm font-semibold text-gray-900'>Consignes</h3>
                  {consignes.filter(c => c.active).length > 0 && (
                    <span className='text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium'>
                      {consignes.filter(c => c.active).length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEditingConsigne(null);
                    setConsigneForm({ titre: '', contenu: '', type: 'info', dateFin: '' });
                    setShowConsigneModal(true);
                  }}
                  className='p-1.5 rounded-lg hover:bg-slate-100 text-gray-400 hover:text-gray-600 transition-colors'
                >
                  <Plus className='w-4 h-4' />
                </button>
              </div>
              
              {/* Contenu */}
              <div className='p-4 flex-1 overflow-y-auto'>
                {consignes.filter(c => c.active).length === 0 ? (
                  <div className='text-center py-6'>
                    <Megaphone className='w-8 h-8 text-gray-300 mx-auto mb-2' />
                    <p className='text-sm text-gray-500'>Aucune consigne active</p>
                    <p className='text-xs text-gray-400 mt-1'>Cliquez sur + pour ajouter</p>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {consignes.filter(c => c.active).map(consigne => {
                      const typeConfig = TYPES_CONSIGNE.find(t => t.value === consigne.type) || TYPES_CONSIGNE[0];
                      const TypeIcon = typeConfig.icon;
                      return (
                        <div 
                          key={consigne.id}
                          onClick={() => openEditConsigne(consigne)}
                          className='flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors'
                        >
                          <TypeIcon className={`w-4 h-4 mt-0.5 ${typeConfig.iconColor}`} />
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium text-gray-900'>{consigne.titre}</p>
                            {consigne.contenu && (
                              <p className='text-xs text-gray-500 mt-0.5 line-clamp-2'>{consigne.contenu}</p>
                            )}
                            {consigne.dateFin && (
                              <p className='text-xs text-gray-400 mt-1'>Jusqu'au {new Date(consigne.dateFin).toLocaleDateString('fr-FR')}</p>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleConsigne(consigne); }}
                            className='p-1 rounded hover:bg-slate-100 text-gray-400'
                          >
                            <X className='w-3.5 h-3.5' />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
            
            {/* Mémo Manager - Structuré */}
            <section className='bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col max-h-[420px]'>
              {/* Header */}
              <div className='px-4 py-3 border-b border-slate-100 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center'>
                    <ClipboardList className='w-4 h-4 text-white' />
                  </div>
                  <div>
                    <h3 className='text-sm font-semibold text-gray-900'>Mémo</h3>
                    <p className='text-[10px] text-gray-400'>
                      {memoStats.total} tâche{memoStats.total > 1 ? 's' : ''} 
                      {memoStats.overdue > 0 && <span className='text-red-500 ml-1'>• {memoStats.overdue} en retard</span>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMemoForm(!showMemoForm)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    showMemoForm 
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
                      : 'bg-[#cf292c] text-white hover:bg-[#b02225] shadow-sm'
                  }`}
                >
                  {showMemoForm ? <X className='w-4 h-4' /> : <Plus className='w-4 h-4' />}
                </button>
              </div>
              
              <div className='flex-1 flex flex-col overflow-hidden'>
                {/* Formulaire structuré */}
                {showMemoForm && (
                  <div className='p-3 border-b border-slate-100 bg-slate-50/50'>
                    {/* Ligne 1: Catégorie + Texte */}
                    <div className='flex items-center gap-2'>
                      {/* Catégorie */}
                      {(() => {
                        const cat = MEMO_CATEGORIES.find(c => c.value === newTaskCategory);
                        const CatIcon = cat?.icon || ClipboardList;
                        return (
                          <button
                            type='button'
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${cat?.bgColor} ${cat?.textColor} transition-all hover:scale-105`}
                            onClick={() => {
                              const idx = MEMO_CATEGORIES.findIndex(c => c.value === newTaskCategory);
                              setNewTaskCategory(MEMO_CATEGORIES[(idx + 1) % MEMO_CATEGORIES.length].value);
                            }}
                            title={`${cat?.label} (cliquer pour changer)`}
                          >
                            <CatIcon className='w-4 h-4' />
                          </button>
                        );
                      })()}
                      
                      {/* Input */}
                      <input
                        type='text'
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && newTask.trim() && addMemoTask()}
                        placeholder='Nouvelle tâche...'
                        className='flex-1 h-9 text-sm px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#cf292c] focus:ring-1 focus:ring-[#cf292c]/20'
                        autoFocus
                      />
                      
                      {/* Priorité */}
                      <button
                        type='button'
                        onClick={() => {
                          const p = ['normal', 'high', 'low'];
                          setNewTaskPriority(p[(p.indexOf(newTaskPriority) + 1) % 3]);
                        }}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
                          newTaskPriority === 'high' 
                            ? 'bg-red-50 border-red-200 text-red-500' 
                            : newTaskPriority === 'low'
                              ? 'bg-slate-50 border-slate-200 text-slate-300'
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                        title={`Priorité: ${newTaskPriority === 'high' ? 'Urgente' : newTaskPriority === 'low' ? 'Basse' : 'Normale'}`}
                      >
                        <Flame className='w-4 h-4' />
                      </button>
                    </div>
                    
                    {/* Ligne 2: DatePickers stylisés */}
                    <div className='flex items-center gap-3 mt-2 flex-wrap'>
                      {/* Échéance - DatePicker Custom Compact */}
                      <div className='flex items-center'>
                        <DatePickerCustom
                          value={newTaskDueDate}
                          onChange={setNewTaskDueDate}
                          min={new Date().toISOString().slice(0, 10)}
                          placeholder='Échéance'
                          compact={true}
                        />
                        {newTaskDueDate && (
                          <button
                            type='button'
                            onClick={() => setNewTaskDueDate('')}
                            className='ml-1 p-0.5 text-slate-400 hover:text-slate-600 transition-colors'
                          >
                            <X className='w-3 h-3' />
                          </button>
                        )}
                      </div>
                      
                      <div className='w-px h-5 bg-slate-200' />
                      
                      {/* Rappel - DatePicker + Heure */}
                      <div className='flex items-center gap-1.5'>
                        <Bell className='w-4 h-4 text-amber-500 flex-shrink-0' />
                        <DatePickerCustom
                          value={newTaskReminder?.slice(0, 10) || ''}
                          onChange={(date) => {
                            // Préserver l'heure si déjà définie, sinon heure actuelle arrondie
                            const now = new Date();
                            const roundedMins = now.getMinutes() < 30 ? '00' : '30';
                            const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${roundedMins}`;
                            const time = newTaskReminder?.slice(11, 16) || defaultTime;
                            setNewTaskReminder(date ? `${date}T${time}` : '');
                          }}
                          min={new Date().toISOString().slice(0, 10)}
                          placeholder='Rappel'
                          compact={true}
                        />
                        {newTaskReminder && (
                          <TimePickerCustom
                            value={newTaskReminder?.slice(11, 16) || '09:00'}
                            onChange={(time) => {
                              const date = newTaskReminder?.slice(0, 10) || new Date().toISOString().slice(0, 10);
                              setNewTaskReminder(`${date}T${time}`);
                            }}
                            placeholder='Heure'
                          />
                        )}
                        {newTaskReminder && (
                          <button
                            type='button'
                            onClick={() => setNewTaskReminder('')}
                            className='p-0.5 text-amber-400 hover:text-amber-600 transition-colors'
                          >
                            <X className='w-3 h-3' />
                          </button>
                        )}
                      </div>
                      
                      <div className='flex-1' />
                      
                      {/* Actions */}
                      {editingTask && (
                        <button onClick={resetMemoForm} className='text-xs text-gray-400 hover:text-gray-600'>
                          Annuler
                        </button>
                      )}
                      <button
                        onClick={addMemoTask}
                        disabled={!newTask.trim()}
                        className='px-3 py-1.5 text-xs font-medium bg-[#cf292c] text-white rounded-lg hover:bg-[#b02225] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                      >
                        {editingTask ? 'Modifier' : 'Ajouter'}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Filtres */}
                <div className='px-3 py-2 border-b border-slate-100 flex items-center gap-1'>
                  {[
                    { value: 'all', icon: List, label: 'Tout', count: memoStats.total },
                    { value: 'urgent', icon: Flame, label: 'Urgent', count: memoStats.urgent },
                    { value: 'today', icon: CalendarDays, label: "Aujourd'hui", count: memoStats.today },
                    { value: 'reminder', icon: Bell, label: 'Rappels', count: memoStats.withReminder },
                    { value: 'pinned', icon: Pin, label: 'Épinglés', count: memoTasks.filter(t => t.pinned && !t.done).length },
                  ].map(filter => {
                    const Icon = filter.icon;
                    const isActive = memoFilter === filter.value;
                    return (
                      <button
                        key={filter.value}
                        onClick={() => setMemoFilter(filter.value)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                          isActive
                            ? 'bg-[#cf292c] text-white font-medium'
                            : 'text-gray-500 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className='w-3.5 h-3.5' />
                        <span className='hidden sm:inline'>{filter.label}</span>
                        {filter.count > 0 && (
                          <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                            {filter.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Liste des tâches */}
                <div className='flex-1 overflow-y-auto p-2'>
                  {getFilteredTasks().length === 0 ? (
                    <div className='text-center py-10'>
                      <div className='w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3'>
                        <ClipboardList className='w-6 h-6 text-slate-300' />
                      </div>
                      <p className='text-sm text-gray-400 mb-1'>
                        {memoFilter === 'all' ? 'Aucune tâche' : 'Aucune tâche ici'}
                      </p>
                      {!showMemoForm && (
                        <button
                          onClick={() => setShowMemoForm(true)}
                          className='text-xs text-[#cf292c] hover:underline'
                        >
                          + Ajouter une tâche
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className='space-y-1'>
                    {getFilteredTasks().map(task => {
                      const category = MEMO_CATEGORIES.find(c => c.value === task.category) || MEMO_CATEGORIES[0];
                      const priority = MEMO_PRIORITIES.find(p => p.value === task.priority) || MEMO_PRIORITIES[1];
                      const overdue = isOverdue(task);
                      const CategoryIcon = category.icon;
                      
                      return (
                        <div 
                          key={task.id}
                          className={`flex items-center gap-2 p-2 rounded-lg group transition-all cursor-pointer ${
                            task.done 
                              ? 'bg-slate-50 opacity-50' 
                              : overdue
                                ? 'bg-red-50 border-l-2 border-red-400'
                                : task.pinned
                                  ? 'bg-amber-50 border-l-2 border-amber-400'
                                  : task.priority === 'high'
                                    ? 'bg-red-50/50 border-l-2 border-red-300'
                                    : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleMemoTask(task.id)}
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              task.done 
                                ? 'border-emerald-400 bg-emerald-400' 
                                : 'border-slate-300 hover:border-[#cf292c]'
                            }`}
                          >
                            {task.done && <Check className='w-2.5 h-2.5 text-white' />}
                          </button>
                          
                          {/* Icône catégorie */}
                          {(() => {
                            const CatIcon = category.icon;
                            return <CatIcon className={`w-3.5 h-3.5 flex-shrink-0 ${category.textColor}`} />;
                          })()}
                          
                          {/* Contenu */}
                          <div className='flex-1 min-w-0' onClick={() => startEditTask(task)}>
                            <span className={`text-xs ${task.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                              {task.text}
                            </span>
                            {/* Meta info inline */}
                            {(task.dueDate || (task.reminder && !task.reminderTriggered)) && (
                              <div className='flex items-center gap-2 mt-0.5'>
                                {task.dueDate && (
                                  <span className={`text-[9px] flex items-center gap-0.5 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                    {overdue && <AlertTriangle className='w-2.5 h-2.5' />}
                                    {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                                {task.reminder && !task.reminderTriggered && (
                                  <span className='text-[9px] text-amber-500 flex items-center gap-0.5'>
                                    <Bell className='w-2.5 h-2.5' />
                                    {new Date(task.reminder).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className='flex items-center opacity-0 group-hover:opacity-100 transition-opacity'>
                            <button
                              onClick={() => togglePinTask(task.id)}
                              className={`p-1 rounded transition-colors ${task.pinned ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}`}
                              title={task.pinned ? 'Désépingler' : 'Épingler'}
                            >
                              <Pin className='w-3 h-3' />
                            </button>
                            <button
                              onClick={() => deleteMemoTask(task.id)}
                              className='p-1 rounded text-gray-300 hover:text-red-500 transition-colors'
                              title='Supprimer'
                            >
                              <Trash2 className='w-3 h-3' />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                </div>
                
                {/* Footer */}
                {memoTasks.filter(t => t.done).length > 0 && (
                  <div className='px-3 py-2 border-t border-slate-100 flex justify-between items-center'>
                    <span className='text-[10px] text-gray-400 flex items-center gap-1'>
                      <CheckCircle className='w-3 h-3 text-emerald-500' />
                      {memoTasks.filter(t => t.done).length} terminée{memoTasks.filter(t => t.done).length > 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={clearCompletedTasks}
                      className='text-[10px] text-gray-400 hover:text-red-500 transition-colors'
                    >
                      Effacer
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
          
      {/* Modal Email pour rappels */}
      {showEmailModal && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden'>
            {/* Header */}
            <div className='px-5 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-white/20 rounded-xl'>
                    <Mail className='w-5 h-5' />
                  </div>
                  <div>
                    <h3 className='font-semibold'>Envoyer un rappel</h3>
                    <p className='text-xs text-white/70'>Envoyez un email de rappel</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowEmailModal(false); setEmailTask(null); setEmailForm({ to: '', subject: '', body: '' }); }}
                  className='p-2 hover:bg-white/10 rounded-lg transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
            </div>
            
            {/* Contenu */}
            <div className='p-5 space-y-4'>
              {/* Destinataire */}
              <div className='space-y-1.5'>
                <label className='text-xs font-medium text-gray-700 flex items-center gap-1.5'>
                  <Users className='w-3.5 h-3.5 text-gray-400' />
                  Destinataire
                </label>
                <input
                  type='email'
                  value={emailForm.to}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, to: e.target.value }))}
                  placeholder='email@exemple.com'
                  className='w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                />
              </div>
              
              {/* Objet */}
              <div className='space-y-1.5'>
                <label className='text-xs font-medium text-gray-700 flex items-center gap-1.5'>
                  <FileText className='w-3.5 h-3.5 text-gray-400' />
                  Objet
                </label>
                <input
                  type='text'
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder='Objet du mail...'
                  className='w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                />
              </div>
              
              {/* Corps du message */}
              <div className='space-y-1.5'>
                <label className='text-xs font-medium text-gray-700 flex items-center gap-1.5'>
                  <MessageCircle className='w-3.5 h-3.5 text-gray-400' />
                  Message
                </label>
                <textarea
                  value={emailForm.body}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, body: e.target.value }))}
                  rows={6}
                  placeholder='Votre message...'
                  className='w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none'
                />
              </div>
              
              {/* Info tâche si liée */}
              {emailTask && (
                <div className='p-3 bg-slate-50 rounded-xl border border-slate-200'>
                  <p className='text-[10px] text-gray-500 mb-1'>Tâche liée :</p>
                  <p className='text-xs text-gray-700 font-medium'>{emailTask.text}</p>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className='px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2'>
              <button
                onClick={() => { setShowEmailModal(false); setEmailTask(null); setEmailForm({ to: '', subject: '', body: '' }); }}
                className='px-4 py-2 text-sm text-gray-600 hover:bg-slate-200 rounded-lg transition-colors'
              >
                Annuler
              </button>
              <button
                onClick={sendEmail}
                disabled={!emailForm.to || !emailForm.subject || sendingEmail}
                className='px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2'
              >
                <Send className='w-4 h-4' />
                {sendingEmail ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de Rappel */}
      {showReminderPopup && currentReminder && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-pulse'>
            {/* Header */}
            <div className='px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='p-2.5 bg-white/20 rounded-xl animate-bounce'>
                    <BellRing className='w-6 h-6' />
                  </div>
                  <div>
                    <h3 className='font-bold text-lg'>⏰ Rappel !</h3>
                    <p className='text-xs text-white/80'>Il est l'heure...</p>
                  </div>
                </div>
                <button
                  onClick={() => dismissReminder(currentReminder.id)}
                  className='p-2 hover:bg-white/10 rounded-lg transition-colors'
                >
                  <X className='w-5 h-5' />
                </button>
              </div>
            </div>
            
            {/* Contenu */}
            <div className='p-5'>
              <div className='p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl'>
                <p className='text-gray-800 font-medium text-sm leading-relaxed'>
                  {currentReminder.text}
                </p>
                {currentReminder.dueDate && (
                  <div className='flex items-center gap-2 mt-3 text-xs text-amber-700'>
                    <Calendar className='w-4 h-4' />
                    Échéance: {new Date(currentReminder.dueDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                )}
                {currentReminder.category && (
                  <div className='flex items-center gap-2 mt-2 text-xs text-gray-500'>
                    {(() => {
                      const cat = MEMO_CATEGORIES.find(c => c.value === currentReminder.category);
                      if (cat) {
                        const CatIcon = cat.icon;
                        return (
                          <>
                            <CatIcon className='w-4 h-4' />
                            {cat.label}
                          </>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
              
              {/* Boutons Reporter */}
              <div className='mt-4'>
                <p className='text-xs text-gray-500 mb-2'>Reporter de :</p>
                <div className='flex gap-2'>
                  <button
                    onClick={() => snoozeReminder(currentReminder.id, 5)}
                    className='flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors'
                  >
                    5 min
                  </button>
                  <button
                    onClick={() => snoozeReminder(currentReminder.id, 15)}
                    className='flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors'
                  >
                    15 min
                  </button>
                  <button
                    onClick={() => snoozeReminder(currentReminder.id, 30)}
                    className='flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors'
                  >
                    30 min
                  </button>
                  <button
                    onClick={() => snoozeReminder(currentReminder.id, 60)}
                    className='flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors'
                  >
                    1h
                  </button>
                </div>
              </div>
            </div>
            
            {/* Actions principales */}
            <div className='px-5 py-4 bg-slate-50 border-t border-slate-100 flex gap-2'>
              <button
                onClick={() => {
                  toggleMemoTask(currentReminder.id);
                  dismissReminder(currentReminder.id);
                }}
                className='flex-1 px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2'
              >
                <Check className='w-4 h-4' />
                Marquer terminé
              </button>
              <button
                onClick={() => dismissReminder(currentReminder.id)}
                className='flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2'
              >
                <BellOff className='w-4 h-4' />
                C'est noté !
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal création/édition consigne - Version modernisée */}
      {showConsigneModal && (
        <ConsigneModal
          isOpen={showConsigneModal}
          onClose={() => {
            setShowConsigneModal(false);
            setEditingConsigne(null);
            setConsigneForm({ titre: '', contenu: '', type: 'info', dateFin: '', cibleCategorie: '' });
          }}
          onSave={handleSaveConsigne}
          form={consigneForm}
          setForm={setConsigneForm}
          isEditing={!!editingConsigne}
          categories={categoriesDisponibles}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🎨 COMPOSANTS UI RÉUTILISABLES
// ═══════════════════════════════════════════════════════════════

// Mini KPI - Version compacte et épurée avec navigation
const MiniKpi = ({ icon: Icon, label, value, detail, color = 'slate', alert = false, className = '', onClick, clickable = false }) => {
  const colorMap = {
    slate: { border: 'border-slate-200', icon: 'text-slate-400', detail: 'text-slate-500' },
    emerald: { border: 'border-emerald-200', icon: 'text-emerald-500', detail: 'text-emerald-600' },
    amber: { border: 'border-amber-200', icon: 'text-amber-500', detail: 'text-amber-600' },
    red: { border: 'border-red-200', icon: 'text-red-500', detail: 'text-red-600' },
    blue: { border: 'border-blue-200', icon: 'text-blue-500', detail: 'text-blue-600' },
  };
  
  const cfg = colorMap[color] || colorMap.slate;
  const isClickable = onClick || clickable;
  
  return (
    <div 
      className={`flex items-center gap-3 p-4 rounded-xl bg-white border ${cfg.border} transition-all ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : 'hover:shadow-sm'} ${className}`}
      onClick={onClick}
    >
      <Icon className={`w-5 h-5 ${cfg.icon} ${alert ? 'animate-pulse' : ''}`} />
      <div className='flex-1 min-w-0'>
        <p className='text-xs text-gray-400 font-medium'>{label}</p>
        <div className='flex items-baseline gap-1.5'>
          <span className='text-lg font-semibold text-gray-800'>{value}</span>
          {detail && <span className={`text-xs ${cfg.detail}`}>{detail}</span>}
        </div>
      </div>
      {isClickable && <ChevronRight className='w-4 h-4 text-gray-300' />}
    </div>
  );
};

// Ligne d'alerte compacte
const AlertRow = ({ icon: Icon, label, color = 'red' }) => {
  const colorMap = {
    red: { bg: 'bg-red-50 border-red-100 hover:bg-red-100', icon: 'bg-red-100 text-red-600', text: 'text-red-700', arrow: 'text-red-400' },
    amber: { bg: 'bg-amber-50 border-amber-100 hover:bg-amber-100', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-700', arrow: 'text-amber-400' },
    orange: { bg: 'bg-orange-50 border-orange-100 hover:bg-orange-100', icon: 'bg-orange-100 text-orange-600', text: 'text-orange-700', arrow: 'text-orange-400' },
    purple: { bg: 'bg-purple-50 border-purple-100 hover:bg-purple-100', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-700', arrow: 'text-purple-400' },
    slate: { bg: 'bg-slate-50 border-slate-200 hover:bg-slate-100', icon: 'bg-slate-200 text-slate-600', text: 'text-slate-700', arrow: 'text-slate-400' },
  };
  
  const cfg = colorMap[color] || colorMap.red;
  
  return (
    <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${cfg.bg}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.icon}`}>
        <Icon className='w-4 h-4' />
      </div>
      <p className={`flex-1 text-xs font-medium ${cfg.text}`}>{label}</p>
      <ChevronRight className={`w-4 h-4 ${cfg.arrow}`} />
    </div>
  );
};

// KpiCard - Version complète (conservée pour compatibilité)
const KpiCard = ({ label, value, sub, tone = 'neutral', icon: Icon, trend, loading = false }) => {
  const toneMap = {
    neutral: { wrap: 'bg-white border-slate-200/70', icon: 'bg-slate-100 text-slate-600', sub: 'text-slate-500' },
    ok: { wrap: 'bg-white border-slate-200/70', icon: 'bg-emerald-50 text-emerald-700', sub: 'text-emerald-700' },
    warn: { wrap: 'bg-white border-slate-200/70', icon: 'bg-amber-50 text-amber-700', sub: 'text-amber-700' },
    alert: { wrap: 'bg-white border-slate-200/70', icon: 'bg-red-50 text-red-700', sub: 'text-red-700' },
  };

  const cfg = toneMap[tone] || toneMap.neutral;

  if (loading) {
    return (
      <div className={`rounded-2xl border shadow-sm p-4 ${cfg.wrap} animate-pulse`}>
        <div className='h-4 bg-slate-200 rounded w-20 mb-2'></div>
        <div className='h-8 bg-slate-200 rounded w-12'></div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border shadow-sm p-4 ${cfg.wrap} hover:shadow-md transition-all`}>
      <div className='flex items-start justify-between'>
        <div>
          <p className='text-[11px] font-semibold text-slate-600 uppercase tracking-wide'>{label}</p>
          <p className='text-2xl font-bold text-slate-900 mt-1'>{value ?? '—'}</p>
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.icon}`}>
            <Icon className='w-5 h-5' />
          </div>
        )}
      </div>
      {sub && <p className={`text-xs font-medium mt-2 ${cfg.sub}`}>{sub}</p>}
    </div>
  );
};

export default DashboardOverview;

