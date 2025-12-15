import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HiUsers } from 'react-icons/hi';
import axios from 'axios';
import { computeKPIs } from '../utils/kpiHelpers';
import AlertesTempsReel from './AlertesTempsReel';
import IntelligenceHero from './IntelligenceHero';
import { 
  Megaphone, Plus, Edit2, Trash2, X, AlertTriangle, AlertCircle, Info, Check, 
  Bell, Calendar, Clock, Zap, FileText, Send, PartyPopper, Users, Coffee,
  Sparkles, Star, Heart, MessageCircle, Volume2, CalendarDays, CalendarClock,
  CalendarRange, CalendarCheck, Timer, CheckCircle, Circle, ClipboardList, LogOut, Mail, Phone,
  TrendingUp, Activity, ClipboardCheck, Download, RefreshCw, ChevronRight, UserCheck, UserX, Hourglass, Percent, Plane
} from 'lucide-react';
import { toLocalDateString, getCurrentDateString } from '../utils/parisTimeUtils';
import DatePickerCustom from './DatePickerCustom';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

function DashboardOverview({ onGoToConges }) {
  const token = (typeof localStorage!=='undefined') ? localStorage.getItem('token') : null;
  const userPrenom = (typeof localStorage!=='undefined') ? localStorage.getItem('prenom') : null;
  const [stats, setStats] = useState({});
  const [pendingConges, setPendingConges] = useState(0);
  const [pendingLeavesList, setPendingLeavesList] = useState([]);
  const [congesAVenir, setCongesAVenir] = useState(0); // Congés à venir dans la semaine
  const [congesAVenirList, setCongesAVenirList] = useState([]); // Liste détaillée des congés à venir
  const [dailyNote, setDailyNote] = useState('');
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
  // Tab colonne droite (centre de notifications)
  const [rightColumnTab, setRightColumnTab] = useState('consignes'); // 'consignes', 'alertes', 'actions'
  // Liste des employés
  const [employesList, setEmployesList] = useState([]);

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
    const date = new Date().toISOString().slice(0,10);
    try {
      setLoadingShifts(true);
      console.log('🔍 [DASHBOARD] Appel API shifts pour date:', date);
      // Try common endpoint patterns
      let res;
      try { 
        res = await axios.get(`${API_BASE}/admin/shifts?start=${date}&end=${date}`, { 
          headers:{Authorization:`Bearer ${token}`}
        }); 
        console.log('✅ [DASHBOARD] API /admin/shifts réponse:', res.data?.length || 0, 'shifts');
      }
      catch { 
        try { 
          res = await axios.get(`${API_BASE}/admin/planning/jour?date=${date}`, { 
            headers:{Authorization:`Bearer ${token}`}
          }); 
          console.log('✅ [DASHBOARD] API /admin/planning/jour réponse:', res.data?.length || 0, 'plannings');
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
      console.log('🔍 [DASHBOARD] Appel API comparaisons pour date:', date);
      
      // Récupérer la liste des employés
      const employesRes = await axios.get(`${API_BASE}/admin/employes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const employes = Array.isArray(employesRes.data) ? employesRes.data : [];
      console.log('✅ [DASHBOARD] API /admin/employes:', employes.length, 'employés');
      
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
      console.log(`✅ [DASHBOARD] ${allComparaisons.length} comparaisons chargées`);
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
      console.log('🔍 [DASHBOARD] Appel API /admin/stats...');
      const res = await axios.get(`${API_BASE}/admin/stats`,{ headers:{Authorization:`Bearer ${token}`}}); 
      console.log('✅ [DASHBOARD] API /admin/stats réponse:', res.data);
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
      console.log('🔍 [DASHBOARD] Appel API /admin/employes...');
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
      console.log(`✅ [DASHBOARD] ${employesEnrichis.length} employés chargés, ${employesEnrichis.filter(e => e.aPointe).length} ont pointé`);
      console.log('📋 [DASHBOARD] Liste détaillée:', employesEnrichis.map(e => `${e.nomComplet} (${e.aPointe ? '✅' : '❌'})`).join(', '));
    } catch(e) {
      console.error('❌ [DASHBOARD] Erreur chargement employés:', e);
      setEmployesList([]);
    }
  },[token]);

  const fetchPendingLeaves = useCallback( async ()=>{
    if(!token) return;
    try { 
      console.log('🔍 [DASHBOARD] Appel API /admin/conges...');
      
      // Récupérer les demandes en attente
      const resEnAttente = await axios.get(`${API_BASE}/admin/conges?statut=en%20attente`,{ headers:{Authorization:`Bearer ${token}`}}); 
      let list=[]; 
      if(Array.isArray(resEnAttente.data)) list=resEnAttente.data; 
      else if(Array.isArray(resEnAttente.data?.conges)) list=resEnAttente.data.conges; 
      console.log('✅ [DASHBOARD] API /admin/conges en attente:', list.length);
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
      console.log('✅ [DASHBOARD] Congés à venir (14j):', congesProchains.length);
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
    if (comp.heuresSupplementaires) {
      heuresSupTotal += comp.heuresSupplementaires;
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
  if (anomalies.absencesNonPlanifiees.length === 0 && nonPointes > 0 && stats?.employes) {
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

  // Salutation contextuelle
  const getGreeting = () => {
    const h = now.getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
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
    <div className='p-4 sm:p-6 lg:p-8 space-y-5 bg-slate-50 min-h-screen'>

      {/* Section Hero Intelligence du jour */}
      <IntelligenceHero />

      {/* KPIs - Vue rapide */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        <KpiCard
          label='Effectif attendu'
          value={effectifAttendu}
          sub={enCongeAujourdHui > 0 ? `${enCongeAujourdHui} en congé aujourd'hui` : 'Aucun congé aujourd\'hui'}
          tone='neutral'
          icon={Users}
          loading={loading}
        />
        <KpiCard
          label='Pointages'
          value={pointes}
          sub={`${presenceReellePct}% de présence`}
          tone={colorPresence}
          icon={UserCheck}
          trend={pointes > 0 ? { value: 5, direction: 'up', positive: true } : null}
          loading={loading}
        />
        <KpiCard
          label='Non pointés'
          value={nonPointes}
          sub={nonPointes > 0 ? `${nonPointesPct}% de l'effectif` : 'RAS'}
          tone={colorNonPointes}
          icon={Hourglass}
          trend={nonPointes > 0 ? { value: 2, direction: 'down', positive: true } : null}
          loading={loading}
        />
        <KpiCard
          label='Congés à venir'
          value={congesAVenir}
          sub={congesAVenir > 0 ? 'Cette semaine' : 'Aucun congé prévu'}
          tone={congesAVenir > 0 ? 'warning' : 'ok'}
          icon={Plane}
          loading={loading}
        />
      </div>

      {/* Section Principale - Grid 2 colonnes */}
      <div className='grid lg:grid-cols-3 gap-6'>
        
        {/* COLONNE GAUCHE - Planning + Équipe (2/3) */}
        <div className='lg:col-span-2 space-y-6'>
          
          {/* Planning du jour - Timeline visuelle */}
          <section className='bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 hover:shadow-md transition-shadow duration-200'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-2'>
                <div className='w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center border border-primary-100'>
                  <CalendarDays className='w-4 h-4 text-primary-600' />
                </div>
                <div>
                  <h3 className='text-sm font-semibold text-gray-900'>Planning du jour</h3>
                  <p className='text-[10px] text-gray-500'>{validShifts.length} shifts programmés</p>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                {/* Filtres rapides */}
                <div className='flex bg-slate-100 rounded-lg p-0.5'>
                  {[
                    { key: 'all', label: 'Tous' },
                    { key: 'ongoing', label: 'En cours' },
                    { key: 'upcoming', label: 'À venir' }
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setPlanningFilter(f.key)}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all ${
                        planningFilter === f.key 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={fetchShiftsToday} 
                  className='p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 transition-colors'
                  aria-label='Actualiser le planning'
                >
                  <RefreshCw className={`w-3 h-3 ${loadingShifts ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
            {loadingShifts ? (
              <div className='space-y-3 py-4'>
                {/* Skeleton loading pour planning */}
                {[1, 2, 3].map(i => (
                  <div key={i} className='flex items-center gap-2 animate-pulse'>
                    <div className='w-24 h-4 bg-slate-200 rounded'></div>
                    <div className='flex-1 h-6 bg-slate-100 rounded-lg'></div>
                  </div>
                ))}
              </div>
            ) : validShifts.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-8 px-4'>
                <div className='w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3'>
                  <CalendarDays className='w-8 h-8 text-slate-300' />
                </div>
                <p className='text-sm font-medium text-gray-600'>Aucun shift programmé</p>
                <p className='text-xs text-gray-400 mt-1'>Le planning du jour est vide</p>
              </div>
            ) : (
              <>
                {/* Timeline visuelle 8h-24h */}
                <div className='relative'>
                  {/* Barre de temps avec graduations */}
                  <div className='flex items-center text-[9px] text-gray-400 mb-2 pl-24'>
                    {[8, 10, 12, 14, 16, 18, 20, 22, 24].map(h => (
                      <span key={h} className='flex-1 text-center font-medium'>{h}h</span>
                    ))}
                  </div>
                  
                  {/* Barre de fond avec indicateur heure actuelle */}
                  <div className='relative h-1.5 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-full mb-3 ml-24'>
                    {(() => {
                      const nowHour = now.getHours() + now.getMinutes() / 60;
                      if (nowHour >= 8 && nowHour <= 24) {
                        const pos = ((nowHour - 8) / 16) * 100;
                        return (
                          <div 
                            className='absolute -top-0.5 w-2.5 h-2.5 bg-red-500 rounded-full shadow-md border-2 border-white z-10'
                            style={{ left: `calc(${pos}% - 5px)` }}
                          />
                        );
                      }
                      return null;
                    })()}
                  </div>
                  
                  {/* Shifts sur la timeline */}
                  <div className='space-y-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent'>
                    {validShifts
                      .filter(s => s.type !== 'repos')
                      .filter(s => {
                        if (planningFilter === 'all') return true;
                        const status = shiftStatus(s);
                        if (planningFilter === 'ongoing') return status === 'ongoing';
                        if (planningFilter === 'upcoming') return status === 'upcoming';
                        return true;
                      })
                      .sort((a, b) => new Date(a.start) - new Date(b.start))
                      .map((s, idx) => {
                        // Nom employé
                        let employeeName = 'N/A';
                        if (s.employe?.prenom || s.employe?.nom) {
                          const prenom = s.employe.prenom || '';
                          const nom = s.employe.nom || '';
                          employeeName = prenom ? `${prenom} ${nom.charAt(0)}.` : nom;
                        } else if (s.employePrenom) {
                          employeeName = s.employePrenom;
                        }
                        
                        const isAbsence = s.type === 'absence';
                        const isRemplacement = s.isRemplacement || s.replacementRequested || s.remplacantId || s.motif?.toLowerCase()?.includes('remplacement');
                        const isNonAssigne = !s.employeeId && !s.employeId;
                        const status = shiftStatus(s);
                        
                        // Absence
                        if (isAbsence) {
                          return (
                            <div key={s.id || `shift-${idx}`} className='flex items-center gap-2 group'>
                              <div className='w-24 flex items-center gap-1.5'>
                                <div className='w-1.5 h-1.5 rounded-full bg-red-400'></div>
                                <span className='text-[11px] font-medium text-gray-700 truncate'>{employeeName}</span>
                              </div>
                              <div className='flex-1'>
                                <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 text-red-700 text-[10px] font-medium'>
                                  <UserX className='w-3 h-3' />
                                  <span>Absent{s.motif ? ` · ${s.motif}` : ''}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // Segments
                        const hasSegments = Array.isArray(s.segments) && s.segments.length > 0;
                        const isCoupure = hasSegments && s.segments.length > 1;
                        
                        const getSegmentBars = () => {
                          if (!hasSegments) {
                            const start = new Date(s.start);
                            const end = new Date(s.end);
                            const startH = start.getHours() + start.getMinutes() / 60;
                            const endH = end.getHours() + end.getMinutes() / 60 + (end.getDate() > start.getDate() ? 24 : 0);
                            return [{ startH, endH, label: `${formatHM(s.start)} - ${formatHM(s.end)}`, isExtra: false }];
                          }
                          
                          return s.segments.map(seg => {
                            const [sh, sm] = (seg.debut || seg.start || '08:00').split(':').map(Number);
                            const [eh, em] = (seg.fin || seg.end || '16:00').split(':').map(Number);
                            let startH = sh + sm / 60;
                            let endH = eh + em / 60;
                            if (endH < startH) endH += 24;
                            return { 
                              startH, endH, 
                              label: `${String(sh).padStart(2,'0')}:${String(sm).padStart(2,'0')} - ${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`,
                              isExtra: seg.isExtra,
                              isPaid: seg.paymentStatus === 'payé' || seg.paymentStatus === 'paye'
                            };
                          });
                        };
                        
                        const segmentBars = getSegmentBars();
                        
                        // Couleurs inspirées de PlanningRH
                        const getBarStyle = (seg) => {
                          if (seg?.isExtra && seg?.isPaid) return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm';
                          if (seg?.isExtra) return 'bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-sm';
                          if (isRemplacement) return 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-sm';
                          if (status === 'ongoing') return 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm';
                          if (status === 'upcoming') return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm';
                          return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700';
                        };
                        
                        // Dot color
                        const getDotColor = () => {
                          if (isRemplacement) return 'bg-fuchsia-500';
                          if (status === 'ongoing') return 'bg-emerald-500';
                          if (status === 'upcoming') return 'bg-blue-500';
                          return 'bg-gray-400';
                        };
                        
                        return (
                          <div key={s.id || `shift-${idx}`} className='flex items-center gap-2 group'>
                            {/* Nom employé */}
                            <div className='w-24 flex items-center gap-1.5'>
                              <div className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`}></div>
                              <span className='text-[11px] font-medium text-gray-700 truncate flex items-center gap-1'>
                                {isRemplacement && <RefreshCw className='w-2.5 h-2.5 text-fuchsia-500' />}
                                {employeeName}
                              </span>
                            </div>
                            
                            {/* Timeline des segments */}
                            <div className='flex-1 relative h-6'>
                              {segmentBars.map((bar, barIdx) => {
                                const leftPct = Math.max(0, ((bar.startH - 8) / 16) * 100);
                                const widthPct = Math.min(100 - leftPct, ((bar.endH - bar.startH) / 16) * 100);
                                
                                return (
                                  <div
                                    key={barIdx}
                                    className={`absolute h-full rounded-lg flex items-center justify-center px-1 text-[9px] font-semibold ${getBarStyle(bar)} ${isNonAssigne ? 'opacity-60 border-2 border-dashed border-orange-400' : ''}`}
                                    style={{ 
                                      left: `${leftPct}%`, 
                                      width: `${Math.max(widthPct, 6)}%`,
                                      minWidth: '40px'
                                    }}
                                    title={`${employeeName} : ${bar.label}${isCoupure ? ' (coupure)' : ''}${bar.isExtra ? ' [Extra]' : ''}`}
                                  >
                                    <span className='truncate drop-shadow-sm'>{bar.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Badge coupure */}
                            {isCoupure && (
                              <span className='text-[8px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium'>
                                Coupure
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
                
                {/* Légende améliorée */}
                <div className='flex flex-wrap gap-3 text-[9px] text-gray-500 pt-3 mt-3 border-t border-gray-100'>
                  <span className='flex items-center gap-1.5'>
                    <span className='w-3 h-2 rounded bg-gradient-to-r from-emerald-500 to-green-500'></span>En cours
                  </span>
                  <span className='flex items-center gap-1.5'>
                    <span className='w-3 h-2 rounded bg-gradient-to-r from-blue-500 to-blue-600'></span>À venir
                  </span>
                  <span className='flex items-center gap-1.5'>
                    <span className='w-3 h-2 rounded bg-gradient-to-r from-gray-300 to-gray-400'></span>Terminé
                  </span>
                  <span className='flex items-center gap-1.5'>
                    <span className='w-3 h-2 rounded bg-gradient-to-r from-fuchsia-500 to-pink-500'></span>Remplacement
                  </span>
                  <span className='flex items-center gap-1.5'>
                    <span className='w-3 h-2 rounded bg-gradient-to-r from-orange-400 to-amber-500'></span>Extra
                  </span>
                  <span className='flex items-center gap-1.5'>
                    <span className='w-2 h-2 rounded-full bg-red-500'></span>Maintenant
                  </span>
                </div>
              </>
            )}
          </section>

          {/* Congés à venir - Nouveau widget */}
          {congesAVenirList.length > 0 && (
            <section className='bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4 hover:shadow-md transition-shadow duration-200'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <div className='w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center border border-primary-100'>
                    <Plane className='w-4 h-4 text-primary-600' />
                  </div>
                  <div>
                    <h3 className='text-sm font-semibold text-gray-900'>Congés à venir</h3>
                    <p className='text-[10px] text-gray-500'>{congesAVenirList.length} absence{congesAVenirList.length > 1 ? 's' : ''} prévue{congesAVenirList.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onGoToConges && onGoToConges()}
                  className='text-[10px] px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-700 font-medium border border-primary-100 transition-colors group'
                >
                  Voir tout <ChevronRight className='w-3 h-3 inline ml-0.5 group-hover:translate-x-0.5 transition-transform' />
                </button>
              </div>
              
              <div className='space-y-2'>
                {congesAVenirList.slice(0, 5).map((conge, idx) => {
                  const debut = new Date(conge.dateDebut);
                  const fin = new Date(conge.dateFin);
                  const joursRestants = Math.ceil((debut - now) / (1000 * 60 * 60 * 24));
                  const dureeJours = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24)) + 1;
                  
                  const employeNom = conge.employe?.prenom && conge.employe?.nom 
                    ? `${conge.employe.prenom} ${conge.employe.nom}`
                    : conge.employe?.email || 'Employé';
                  
                  const initials = employeNom.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  
                  return (
                    <div 
                      key={conge.id || idx}
                      className={`flex items-center gap-3 p-2.5 rounded-xl hover:shadow-sm transition-all cursor-default ${
                        joursRestants <= 2 ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {/* Avatar avec initiales */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        joursRestants <= 2 ? 'bg-amber-200 text-amber-800' : 'bg-violet-100 text-violet-700'
                      }`}>
                        {initials}
                      </div>
                      
                      {/* Infos */}
                      <div className='flex-1 min-w-0'>
                        <p className='text-xs font-semibold text-gray-900 truncate'>{employeNom}</p>
                        <p className='text-[10px] text-gray-500'>
                          {debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {dureeJours > 1 && ` → ${fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                          <span className='text-gray-400 ml-1'>· {dureeJours}j</span>
                        </p>
                      </div>
                      
                      {/* Badge J-X et type */}
                      <div className='flex flex-col items-end gap-1'>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          joursRestants <= 2 ? 'bg-amber-500 text-white' : 'bg-violet-500 text-white'
                        }`}>
                          J-{joursRestants}
                        </span>
                        <span className='text-[9px] text-gray-400 capitalize'>
                          {conge.type || 'congé'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                
                {congesAVenirList.length > 5 && (
                  <p className='text-[10px] text-gray-400 text-center pt-1'>
                    +{congesAVenirList.length - 5} autre{congesAVenirList.length - 5 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* COLONNE DROITE - Centre de notifications unifié (1/3) */}
        <div className='space-y-4'>
          
          {/* Centre de notifications avec tabs */}
          <div className='bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200'>
            
            {/* Header avec tabs */}
            <div className='border-b border-slate-100'>
              <div className='flex items-center justify-between px-4 pt-4 pb-2'>
                <div className='flex items-center gap-2'>
                  <div className='w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center border border-primary-100'>
                    <Bell className='w-4 h-4 text-primary-600' />
                  </div>
                  <h3 className='text-sm font-semibold text-gray-900'>Infos & Actions</h3>
                </div>
                {rightColumnTab === 'consignes' && (
                  <button
                    onClick={() => {
                      setEditingConsigne(null);
                      setConsigneForm({ titre: '', contenu: '', type: 'info', dateFin: '' });
                      setShowConsigneModal(true);
                    }}
                    className='p-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-600 transition-colors'
                    aria-label='Ajouter une consigne'
                  >
                    <Plus className='w-4 h-4' />
                  </button>
                )}
              </div>
              
              {/* Tabs */}
              <div className='flex px-4 gap-1'>
                {[
                  { key: 'consignes', label: 'Consignes', icon: Megaphone, count: consignes.filter(c => c.active).length },
                  { key: 'alertes', label: 'Alertes', icon: AlertTriangle, count: totalAnomalies },
                  { key: 'actions', label: 'Actions', icon: ClipboardCheck, count: pendingLeavesList.length + replacements.length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setRightColumnTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all relative ${
                      rightColumnTab === tab.key 
                        ? 'text-primary-700 bg-primary-50' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className='w-3.5 h-3.5' />
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                        rightColumnTab === tab.key 
                          ? tab.key === 'alertes' ? 'bg-red-100 text-red-700' : 'bg-primary-100 text-primary-700'
                          : tab.key === 'alertes' && tab.count > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                    {rightColumnTab === tab.key && (
                      <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full' />
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Contenu des tabs */}
            <div className='p-4 min-h-[200px]'>
              
              {/* Tab Consignes */}
              {rightColumnTab === 'consignes' && (
                <div className='space-y-2'>
                  {loadingConsignes ? (
                    <div className='space-y-2'>
                      {[1, 2, 3].map(i => (
                        <div key={i} className='h-10 bg-slate-100 rounded-lg animate-pulse' />
                      ))}
                    </div>
                  ) : consignes.filter(c => c.active).length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-6'>
                      <div className='w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2'>
                        <Megaphone className='w-6 h-6 text-slate-300' />
                      </div>
                      <p className='text-sm text-gray-500'>Aucune consigne active</p>
                      <p className='text-xs text-gray-400 mt-1'>Cliquez sur + pour en créer</p>
                    </div>
                  ) : (
                    <>
                      {consignes.filter(c => c.active).slice(0, showAllConsignes ? undefined : 4).map(consigne => (
                        <div 
                          key={consigne.id}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs cursor-pointer hover:shadow-sm transition-all ${
                            consigne.type === 'urgent'
                              ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                              : consigne.type === 'important'
                                ? 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                                : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
                          }`}
                          onClick={() => openEditConsigne(consigne)}
                        >
                          {consigne.type === 'urgent' ? <AlertTriangle className='w-4 h-4 flex-shrink-0' />
                          : consigne.type === 'important' ? <AlertCircle className='w-4 h-4 flex-shrink-0' />
                          : <Info className='w-4 h-4 flex-shrink-0' />}
                          <span className='font-medium truncate flex-1'>{consigne.titre}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleConsigne(consigne); }}
                            className='p-1 rounded-lg hover:bg-white/50 flex-shrink-0 opacity-60 hover:opacity-100'
                          >
                            <X className='w-3.5 h-3.5' />
                          </button>
                        </div>
                      ))}
                      {consignes.filter(c => c.active).length > 4 && (
                        <button 
                          onClick={() => setShowAllConsignes(!showAllConsignes)}
                          className='text-[11px] text-primary-600 hover:text-primary-700 text-center w-full py-2 hover:underline cursor-pointer font-medium'
                        >
                          {showAllConsignes ? '↑ Réduire' : `Voir ${consignes.filter(c => c.active).length - 4} autres →`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* Tab Alertes */}
              {rightColumnTab === 'alertes' && (
                <div className='space-y-2'>
                  {!hasAnomalies ? (
                    <div className='flex flex-col items-center justify-center py-6'>
                      <div className='w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-2'>
                        <CheckCircle className='w-6 h-6 text-emerald-500' />
                      </div>
                      <p className='text-sm font-medium text-emerald-700'>Tout est OK !</p>
                      <p className='text-xs text-gray-400 mt-1'>Aucune alerte à traiter</p>
                    </div>
                  ) : (
                    <>
                      {anomalies.absencesNonPlanifiees.length > 0 && (
                        <div className='flex items-center gap-2.5 p-3 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-colors cursor-pointer'>
                          <div className='w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center'>
                            <Bell className='w-4 h-4 text-red-600' />
                          </div>
                          <div className='flex-1'>
                            <p className='text-xs font-semibold text-red-800'>{anomalies.absencesNonPlanifiees.length} absence{anomalies.absencesNonPlanifiees.length>1?'s':''}</p>
                            <p className='text-[10px] text-red-600'>Non planifiée{anomalies.absencesNonPlanifiees.length>1?'s':''}</p>
                          </div>
                          <ChevronRight className='w-4 h-4 text-red-400' />
                        </div>
                      )}
                      {anomalies.retards.length > 0 && (
                        <div className='flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors cursor-pointer'>
                          <div className='w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center'>
                            <Clock className='w-4 h-4 text-amber-600' />
                          </div>
                          <div className='flex-1'>
                            <p className='text-xs font-semibold text-amber-800'>{anomalies.retards.length} retard{anomalies.retards.length>1?'s':''}</p>
                            <p className='text-[10px] text-amber-600'>Shift commencé non pointé</p>
                          </div>
                          <ChevronRight className='w-4 h-4 text-amber-400' />
                        </div>
                      )}
                      {anomalies.horsPlage.length > 0 && (
                        <div className='flex items-center gap-2.5 p-3 rounded-xl bg-purple-50 border border-purple-100 hover:bg-purple-100 transition-colors cursor-pointer'>
                          <div className='w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center'>
                            <Activity className='w-4 h-4 text-purple-600' />
                          </div>
                          <div className='flex-1'>
                            <p className='text-xs font-semibold text-purple-800'>{anomalies.horsPlage.length} hors-plage</p>
                            <p className='text-[10px] text-purple-600'>Pointage hors planning</p>
                          </div>
                          <ChevronRight className='w-4 h-4 text-purple-400' />
                        </div>
                      )}
                      {anomalies.departsAnticipes.length > 0 && (
                        <div className='flex items-center gap-2.5 p-3 rounded-xl bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors cursor-pointer'>
                          <div className='w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center'>
                            <LogOut className='w-4 h-4 text-orange-600' />
                          </div>
                          <div className='flex-1'>
                            <p className='text-xs font-semibold text-orange-800'>{anomalies.departsAnticipes.length} départ{anomalies.departsAnticipes.length>1?'s':''} anticipé{anomalies.departsAnticipes.length>1?'s':''}</p>
                            <p className='text-[10px] text-orange-600'>Avant fin de shift</p>
                          </div>
                          <ChevronRight className='w-4 h-4 text-orange-400' />
                        </div>
                      )}
                      {anomalies.nonAssignes.length > 0 && (
                        <div className='flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer'>
                          <div className='w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center'>
                            <ClipboardList className='w-4 h-4 text-slate-600' />
                          </div>
                          <div className='flex-1'>
                            <p className='text-xs font-semibold text-slate-700'>{anomalies.nonAssignes.length} non assigné{anomalies.nonAssignes.length>1?'s':''}</p>
                            <p className='text-[10px] text-slate-500'>Shift sans employé</p>
                          </div>
                          <ChevronRight className='w-4 h-4 text-slate-400' />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* Tab Actions */}
              {rightColumnTab === 'actions' && (
                <div className='space-y-2'>
                  {pendingLeavesList.length === 0 && replacements.length === 0 ? (
                    <div className='flex flex-col items-center justify-center py-6'>
                      <div className='w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2'>
                        <CheckCircle className='w-6 h-6 text-slate-300' />
                      </div>
                      <p className='text-sm text-gray-500'>Aucune action en attente</p>
                      <p className='text-xs text-gray-400 mt-1'>Tout est à jour</p>
                    </div>
                  ) : (
                    <>
                      {/* Congés */}
                      {pendingLeavesList.length > 0 && (
                        <div 
                          onClick={() => onGoToConges && onGoToConges()}
                          className='flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 cursor-pointer transition-all group'
                        >
                          <div className='w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center'>
                            <Calendar className='w-4 h-4 text-blue-600' />
                          </div>
                          <div className='flex-1'>
                            <p className='text-xs font-semibold text-blue-800'>{pendingLeavesList.length} demande{pendingLeavesList.length>1?'s':''} de congé</p>
                            <p className='text-[10px] text-blue-600'>En attente de validation</p>
                          </div>
                          <ChevronRight className='w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform' />
                        </div>
                      )}
                      
                      {/* Remplacements */}
                      {replacements.length > 0 && (
                        <div className='flex items-center gap-2.5 p-3 rounded-xl bg-purple-50 border border-purple-100 hover:bg-purple-100 cursor-pointer transition-all group'>
                          <div className='w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center'>
                            <RefreshCw className='w-4 h-4 text-purple-600' />
                          </div>
                          <div className='flex-1'>
                            <p className='text-xs font-semibold text-purple-800'>{replacements.length} remplacement{replacements.length>1?'s':''}</p>
                            <p className='text-[10px] text-purple-600'>
                              {urgentReplacements.length > 0 
                                ? `${urgentReplacements.length} urgent${urgentReplacements.length>1?'s':''} !` 
                                : 'À organiser'}
                            </p>
                          </div>
                          {urgentReplacements.length > 0 && (
                            <span className='text-[9px] px-2 py-1 rounded-full bg-amber-500 text-white font-bold animate-pulse'>
                              URGENT
                            </span>
                          )}
                          <ChevronRight className='w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform' />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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

// --- UI Components Simples ---

const KpiCard = ({ label, value, sub, tone = 'neutral', icon: Icon, trend, loading = false }) => {
  const toneMap = {
    neutral: {
      wrap: 'bg-white border-slate-200/70 text-slate-900',
      icon: 'bg-slate-100 text-slate-600',
      sub: 'text-slate-500'
    },
    ok: {
      wrap: 'bg-white border-slate-200/70 text-slate-900',
      icon: 'bg-emerald-50 text-emerald-700',
      sub: 'text-emerald-700'
    },
    warn: {
      wrap: 'bg-white border-slate-200/70 text-slate-900',
      icon: 'bg-amber-50 text-amber-700',
      sub: 'text-amber-700'
    },
    alert: {
      wrap: 'bg-white border-slate-200/70 text-slate-900',
      icon: 'bg-red-50 text-red-700',
      sub: 'text-red-700'
    },
    info: {
      wrap: 'bg-white border-slate-200/70 text-slate-900',
      icon: 'bg-sky-50 text-sky-700',
      sub: 'text-sky-700'
    },
  };

  const cfg = toneMap[tone] || toneMap.neutral;
  const displayValue = (value === null || value === undefined) ? '—' : value;

  // Tendance : { value: number, direction: 'up' | 'down' | 'stable' }
  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.direction === 'up') return trend.positive ? 'text-emerald-600' : 'text-red-600';
    if (trend.direction === 'down') return trend.positive ? 'text-emerald-600' : 'text-red-600';
    return 'text-gray-400';
  };

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : null;

  if (loading) {
    return (
      <div className={`rounded-2xl border shadow-sm p-4 ${cfg.wrap} animate-pulse`}>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0 space-y-2 flex-1'>
            <div className='h-3 bg-slate-200 rounded w-20'></div>
            <div className='h-7 bg-slate-200 rounded w-12'></div>
          </div>
          <div className='w-10 h-10 rounded-xl bg-slate-200'></div>
        </div>
        <div className='mt-2 h-4 bg-slate-100 rounded w-24'></div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border shadow-sm p-4 ${cfg.wrap} hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-default group`}>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-[11px] font-semibold text-slate-600 uppercase tracking-wide truncate'>{label}</div>
          <div className='mt-1 flex items-baseline gap-2'>
            <span className='text-2xl font-bold text-slate-900 leading-none'>{displayValue}</span>
            {trend && TrendIcon && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${getTrendColor()}`}>
                <TrendIcon className='w-3.5 h-3.5' />
                {trend.value !== undefined && <span>{Math.abs(trend.value)}%</span>}
              </span>
            )}
          </div>
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.icon} group-hover:scale-105 transition-transform duration-200`}>
            <Icon className='w-5 h-5' />
          </div>
        )}
      </div>
      {sub && (
        <div className={`mt-2 text-xs font-medium ${cfg.sub}`}>{sub}</div>
      )}
    </div>
  );
};

// Composant TrendingDown pour KpiCard
const TrendingDown = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
    <polyline points="17 18 23 18 23 12"></polyline>
  </svg>
);

// Backward-compat (si jamais réutilisé plus tard)
const SimpleCard = ({ label, value, sub, tone = 'neutral', loading = false }) => (
  <KpiCard
    label={label}
    value={loading ? '…' : value}
    sub={!loading ? sub : undefined}
    tone={tone}
  />
);

export default DashboardOverview;
