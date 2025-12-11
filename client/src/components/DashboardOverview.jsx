import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HiUsers } from 'react-icons/hi';
import axios from 'axios';
import { computeKPIs } from '../utils/kpiHelpers';
import AlertesTempsReel from './AlertesTempsReel';
import NavigoWidget from './NavigoWidget';
import { 
  Megaphone, Plus, Edit2, Trash2, X, AlertTriangle, AlertCircle, Info, Check, 
  Bell, Calendar, Clock, Zap, FileText, Send, PartyPopper, Users, Coffee,
  Sparkles, Star, Heart, MessageCircle, Volume2, CalendarDays, CalendarClock,
  CalendarRange, CalendarCheck, Timer
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
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
  const [stats, setStats] = useState({});
  const [pendingConges, setPendingConges] = useState(0);
  const [pendingLeavesList, setPendingLeavesList] = useState([]);
  const [congesAVenir, setCongesAVenir] = useState(0); // Congés à venir dans la semaine
  const [dailyNote, setDailyNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  // Consignes (nouveau système)
  const [consignes, setConsignes] = useState([]);
  const [loadingConsignes, setLoadingConsignes] = useState(true);
  const [showConsigneModal, setShowConsigneModal] = useState(false);
  const [editingConsigne, setEditingConsigne] = useState(null);
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
        res = await axios.get(`http://localhost:5000/admin/shifts?start=${date}&end=${date}`, { 
          headers:{Authorization:`Bearer ${token}`}
        }); 
        console.log('✅ [DASHBOARD] API /admin/shifts réponse:', res.data?.length || 0, 'shifts');
      }
      catch { 
        try { 
          res = await axios.get(`http://localhost:5000/admin/planning/jour?date=${date}`, { 
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
      const employesRes = await axios.get('http://localhost:5000/admin/employes', {
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
            `http://localhost:5000/api/comparison/planning-vs-realite?${params}`,
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
      const res = await axios.get('http://localhost:5000/admin/stats',{ headers:{Authorization:`Bearer ${token}`}}); 
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
      const empRes = await axios.get('http://localhost:5000/admin/employes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Récupérer les pointages d'aujourd'hui avec les détails
      const today = getCurrentDateString();
      const pointagesRes = await axios.get(`http://localhost:5000/admin/pointages?date=${today}`, {
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
      const resEnAttente = await axios.get('http://localhost:5000/admin/conges?statut=en%20attente',{ headers:{Authorization:`Bearer ${token}`}}); 
      let list=[]; 
      if(Array.isArray(resEnAttente.data)) list=resEnAttente.data; 
      else if(Array.isArray(resEnAttente.data?.conges)) list=resEnAttente.data.conges; 
      console.log('✅ [DASHBOARD] API /admin/conges en attente:', list.length);
      setPendingLeavesList(list); 
      setPendingConges(list.length);
      
      // Récupérer les congés approuvés à venir dans la semaine
      const resApprouves = await axios.get('http://localhost:5000/admin/conges?statut=approuvé',{ headers:{Authorization:`Bearer ${token}`}}); 
      let approuves=[]; 
      if(Array.isArray(resApprouves.data)) approuves=resApprouves.data; 
      else if(Array.isArray(resApprouves.data?.conges)) approuves=resApprouves.data.conges;
      
      // Filtrer les congés qui commencent dans les 7 prochains jours
      const now = new Date();
      const dans7Jours = new Date(now.getTime() + 7*24*60*60*1000);
      const congesProchains = approuves.filter(c => {
        const debut = new Date(c.dateDebut);
        return debut > now && debut <= dans7Jours;
      });
      console.log('✅ [DASHBOARD] Congés à venir dans la semaine:', congesProchains.length);
      setCongesAVenir(congesProchains.length);
      
    } catch(e){ 
      console.error('❌ [DASHBOARD] Erreur API /admin/conges:', e.response?.status, e.response?.data || e.message);
      setPendingLeavesList([]); 
      setPendingConges(0);
      setCongesAVenir(0);
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

  return (
    <div className='p-4 lg:p-6 space-y-4 bg-gray-50 min-h-[calc(100vh-3rem)]'>
      {/* Widget Alertes Temps Réel - Retards et Absences */}
      <AlertesTempsReel />
      
      {/* Widget Navigo - Justificatifs en attente */}
      <NavigoWidget />
      
      {/* Indicateur d'état des données - alerte si pas de données chargées */}
      {!loading && employes === 0 && (
        <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3'>
          <div className='flex items-start gap-2'>
            <svg className='w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5' fill='currentColor' viewBox='0 0 20 20'>
              <path fillRule='evenodd' d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z' clipRule='evenodd'/>
            </svg>
            <div className='flex-1'>
              <h3 className='text-xs font-semibold text-yellow-800'>Aucune donnée chargée</h3>
              <p className='text-xs text-yellow-700 mt-1'>
                Le serveur ne répond pas ou les APIs retournent des données vides. 
                Vérifiez que le serveur backend est démarré et consultez la console pour plus de détails.
              </p>
              <div className='mt-2 text-xs text-yellow-600'>
                <div>• Stats: {stats?.employes !== undefined ? '✅ OK' : '❌ Vide'}</div>
                <div>• Shifts: {shifts.length > 0 ? `✅ ${shifts.length} chargés` : '❌ Aucun'}</div>
                <div>• Comparaisons: {comparaisons.length > 0 ? `✅ ${comparaisons.length} chargées` : '❌ Aucune'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message d'information si les stats semblent incohérentes */}
      {!loading && employes > 0 && pointes === 0 && (
        <div className='bg-orange-50 border border-orange-200 rounded-lg p-3'>
          <div className='flex items-start gap-2'>
            <svg className='w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5' fill='currentColor' viewBox='0 0 20 20'>
              <path fillRule='evenodd' d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z' clipRule='evenodd'/>
            </svg>
            <div className='flex-1'>
              <h3 className='text-xs font-semibold text-orange-800'>Données incohérentes détectées</h3>
              <p className='text-xs text-orange-700 mt-1'>
                {employes} employés enregistrés mais 0 pointages aujourd'hui. 
                Cela peut indiquer un problème de calcul ou de synchronisation des données.
                Consultez la console du navigateur (F12) pour les détails.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* En-tête avec actualisation */}
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-lg font-semibold text-gray-800'>Tableau de bord</h2>
        <button 
          onClick={()=>{fetchStats(); fetchPendingLeaves(); fetchComparaisons(); fetchEmployesList();}} 
          className='px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-1.5 shadow-sm'
        >
          <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'/>
          </svg>
          Actualiser
        </button>
      </div>

      {/* 3 cartes métriques inspirées de Skello */}
      <div className='grid grid-cols-3 gap-4 mb-4'>
        {/* Carte 1: Effectif aujourd'hui */}
        <div className='bg-white border border-gray-200 rounded-lg p-4 shadow-sm'>
          <div className='text-xs text-gray-500 font-medium mb-2'>Effectif aujourd'hui</div>
          <div className='flex items-baseline gap-2 mb-3'>
            <span className='text-3xl font-bold text-gray-900'>{loading? '—': pointes}</span>
            <span className='text-lg text-gray-400'>/ {loading? '—': effectifAttendu}</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              colorPresence==='ok'? 'bg-green-100': 
              colorPresence==='warn'? 'bg-orange-100': 
              'bg-red-100'
            }`}>
              <svg className={`w-4 h-4 ${
                colorPresence==='ok'? 'text-green-600': 
                colorPresence==='warn'? 'text-orange-600': 
                'text-red-600'
              }`} fill='currentColor' viewBox='0 0 20 20'>
                <path d='M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z'/>
              </svg>
            </div>
            <div className='text-xs text-gray-600'>
              {loading? '...' : 
                enCongeAujourdHui > 0 || absencesNonPlanifiees > 0 
                  ? `${enCongeAujourdHui} en congé · ${absencesNonPlanifiees} absent${absencesNonPlanifiees>1?'s':''}`
                  : 'Équipe au complet'
              }
            </div>
          </div>
        </div>

        {/* Carte 2: Personnes en congé aujourd'hui */}
        <div className='bg-white border border-gray-200 rounded-lg p-4 shadow-sm'>
          <div className='text-xs text-gray-500 font-medium mb-2'>En congé aujourd'hui</div>
          <div className='flex items-baseline gap-2 mb-3'>
            <span className={`text-3xl font-bold ${enCongeAujourdHui > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
              {loading? '—': enCongeAujourdHui}
            </span>
            <span className='text-sm text-gray-400'>
              {enCongeAujourdHui > 1 ? 'personnes' : 'personne'}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              enCongeAujourdHui === 0 ? 'bg-gray-100' : 'bg-blue-100'
            }`}>
              <svg className={`w-4 h-4 ${enCongeAujourdHui === 0 ? 'text-gray-400' : 'text-blue-600'}`} fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' clipRule='evenodd'/>
              </svg>
            </div>
            <div className='text-xs text-gray-600'>
              {loading? '...' : enCongeAujourdHui === 0 ? 'Aucun congé' : 'Absents planifiés'}
            </div>
          </div>
        </div>

        {/* Carte 3: Congés à venir dans la semaine */}
        <div className='bg-white border border-gray-200 rounded-lg p-4 shadow-sm'>
          <div className='text-xs text-gray-500 font-medium mb-2'>Congés à venir (7j)</div>
          <div className='flex items-baseline gap-2 mb-3'>
            <span className={`text-3xl font-bold ${congesAVenir > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
              {loading? '—': congesAVenir}
            </span>
            <span className='text-sm text-gray-400'>
              {congesAVenir > 1 ? 'congés' : 'congé'}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              congesAVenir === 0 ? 'bg-gray-100' : 'bg-purple-100'
            }`}>
              <svg className={`w-4 h-4 ${congesAVenir === 0 ? 'text-gray-400' : 'text-purple-600'}`} fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z' clipRule='evenodd'/>
              </svg>
            </div>
            <div className='text-xs text-gray-600'>
              {loading? '...' : congesAVenir === 0 ? 'Aucun prévu' : 'À anticiper'}
            </div>
          </div>
        </div>
      </div>

      {/* Planning du jour - Ligne complète */}
      <section className='bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4'>
        <div className='flex items-center justify-between mb-3'>
          <h2 className='text-sm font-semibold text-gray-700 flex items-center gap-2'>
            <svg className='w-5 h-5 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'/>
            </svg>
            Planning du jour
          </h2>
          <button 
            onClick={fetchShiftsToday} 
            className='text-xs px-2.5 py-1.5 border rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-1.5'
          >
            <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'/>
            </svg>
            Actualiser
          </button>
        </div>
        
        {shiftError && <div className='text-xs text-red-600 mb-2 p-2 bg-red-50 rounded'>{shiftError}</div>}
        
        {loadingShifts ? (
          <div className='text-sm text-gray-500 py-4 text-center'>Chargement du planning…</div>
        ) : validShifts.length===0 ? (
          <div className='text-sm text-gray-500 italic p-4 bg-gray-50 rounded text-center'>Aucun shift programmé aujourd'hui</div>
        ) : (
          <>
            {/* Vue en grille compacte pour 30+ personnes */}
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2'>
              {validShifts.sort((a,b)=> new Date(a.start)-new Date(b.start)).map((s, idx) => {
                  const status = shiftStatus(s);
                  const start=new Date(s.start), end=new Date(s.end);
                  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
                  const duration = end-start; 
                  const widthPct = Math.max(8, (duration/dayMs)*100);
                  const isRetard = anomalies.retards.includes(s);
                  const isNonAssigne = !s.employeeId;
                  const employeeName = s.employeeName || s.employeNom || s.nom || 
                                      (s.employe?.prenom && s.employe?.nom ? `${s.employe.prenom} ${s.employe.nom}` : 
                                      s.employe?.email || 'Non assigné');
                  
                  const aPointe = s.employeeId ? employesList.some(e => e.id === s.employeeId && e.aPointe) : false;
                  
                  let retardMinutes = 0;
                  let avanceMinutes = 0;
                  let departAnticipeMinutes = 0;
                  let heuresSupMinutes = 0;
                  let hasRealRetard = isRetard;
                  let statusIcon = null;
                  let statusColor = '';
                  let statusTitle = '';
                  let departStatus = null;
                  
                  const formatMinutes = (mins) => {
                    if (mins >= 60) {
                      const heures = Math.floor(mins / 60);
                      const minutes = mins % 60;
                      return minutes > 0 ? `${heures}h${minutes.toString().padStart(2, '0')}` : `${heures}h`;
                    }
                    return `${mins}min`;
                  };
                  
                  if (isRetard) {
                    const start = new Date(s.start);
                    retardMinutes = Math.floor((now - start) / 60000);
                    statusIcon = '⏳';
                    statusColor = 'text-orange-500';
                    statusTitle = 'En attente de pointage';
                  }
                  
                  const comparaison = comparaisons.find(c => 
                    c.employeId === s.employeeId && 
                    c.date === formatDate(new Date(s.start))
                  );
                  
                  if (comparaison && comparaison.ecarts && comparaison.ecarts.length > 0) {
                    const ecartArrivee = comparaison.ecarts.find(e => 
                      e.type?.includes('retard') || 
                      e.type?.includes('arrivee') ||
                      e.type?.includes('hors_plage_in')
                    );
                    
                    const ecartDepart = comparaison.ecarts.find(e => 
                      e.type?.includes('depart') ||
                      e.type?.includes('hors_plage_out') ||
                      e.type?.includes('heures_sup')
                    );
                    
                    if (ecartArrivee) {
                      const ecartMins = ecartArrivee.ecartMinutes || 0;
                      
                      if (ecartMins < 0) {
                        retardMinutes = Math.abs(ecartMins);
                        hasRealRetard = true;
                        statusIcon = '⚠️';
                        statusColor = 'text-red-600';
                        statusTitle = `Retard arrivée: ${formatMinutes(retardMinutes)}`;
                      } else if (ecartMins > 0) {
                        avanceMinutes = ecartMins;
                        hasRealRetard = false;
                        statusIcon = '✓';
                        statusColor = 'text-green-600';
                        statusTitle = `En avance: ${formatMinutes(avanceMinutes)}`;
                      } else {
                        hasRealRetard = false;
                        statusIcon = '✓';
                        statusColor = 'text-green-600';
                        statusTitle = 'À l\'heure';
                      }
                    }
                    
                    if (ecartDepart) {
                      const ecartDepartMins = ecartDepart.ecartMinutes || 0;
                      
                      if (ecartDepart.type?.includes('depart_premature') || ecartDepart.type?.includes('depart_anticipe')) {
                        departAnticipeMinutes = ecartDepart.dureeMinutes || Math.abs(ecartDepartMins);
                        departStatus = {
                          icon: '🚪',
                          color: 'bg-red-500',
                          text: `Parti ${formatMinutes(departAnticipeMinutes)} tôt`,
                          title: `Départ anticipé de ${formatMinutes(departAnticipeMinutes)}`
                        };
                      } else if (ecartDepart.type?.includes('heures_sup') || ecartDepartMins < 0) {
                        heuresSupMinutes = ecartDepart.dureeMinutes || Math.abs(ecartDepartMins);
                        departStatus = {
                          icon: '⏱️',
                          color: 'bg-blue-500',
                          text: `H.Sup ${formatMinutes(heuresSupMinutes)}`,
                          title: `Heures supplémentaires: ${formatMinutes(heuresSupMinutes)}`
                        };
                      }
                    }
                  } else if (aPointe && !isRetard) {
                    statusIcon = '✓';
                    statusColor = 'text-green-600';
                    statusTitle = 'Présent';
                  }
                  
                  return (
                    <div 
                      key={s.id || s._id || `shift-${idx}`} 
                      className={`relative rounded-lg border ${shiftLight(status)} p-2 hover:shadow-md transition-shadow`}
                    >
                      {/* Point de statut en haut à droite */}
                      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${shiftColor(status)}`}></div>
                      
                      {/* Nom de l'employé */}
                      <div className='text-xs font-semibold text-gray-800 truncate pr-4 mb-1' title={employeeName}>
                        {employeeName}
                      </div>
                      
                      {/* Horaires */}
                      <div className='text-[10px] text-gray-600 font-medium mb-1.5'>
                        {formatHM(s.start)} - {formatHM(s.end)}
                      </div>
                      
                      {/* Badges compacts */}
                      <div className='flex flex-wrap gap-1'>
                        {statusIcon === '✓' && (
                          <span className='inline-flex items-center text-[9px] text-green-600' title={statusTitle}>
                            <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                              <path fillRule='evenodd' d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z' clipRule='evenodd'/>
                            </svg>
                          </span>
                        )}
                        {hasRealRetard && retardMinutes > 0 && (
                          <span 
                            className='bg-red-500 text-white rounded px-1 py-0.5 text-[8px] font-semibold' 
                            title={`Retard: ${formatMinutes(retardMinutes)}`}
                          >
                            ⚠️ {formatMinutes(retardMinutes)}
                          </span>
                        )}
                        {avanceMinutes > 0 && !hasRealRetard && (
                          <span 
                            className='bg-green-500 text-white rounded px-1 py-0.5 text-[8px] font-semibold' 
                            title={`Avance: ${formatMinutes(avanceMinutes)}`}
                          >
                            +{formatMinutes(avanceMinutes)}
                          </span>
                        )}
                        {departStatus && (
                          <span 
                            className={`${departStatus.color} text-white rounded px-1 py-0.5 text-[8px] font-semibold`}
                            title={departStatus.title}
                          >
                            {departStatus.icon} {departStatus.text}
                          </span>
                        )}
                        {isNonAssigne && (
                          <span className='bg-orange-100 text-orange-700 rounded px-1 py-0.5 text-[8px] font-semibold'>
                            NA
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
            </div>
            
            {/* Légende */}
            <div className='flex flex-wrap gap-3 text-xs text-gray-600 pt-3 mt-3 border-t border-gray-100'>
              <span className='flex items-center gap-1.5'>
                <span className='w-2 h-2 rounded-full bg-green-500'></span>
                En cours
              </span>
              <span className='flex items-center gap-1.5'>
                <span className='w-2 h-2 rounded-full bg-blue-500'></span>
                À venir
              </span>
              <span className='flex items-center gap-1.5'>
                <span className='w-2 h-2 rounded-full bg-gray-400'></span>
                Terminé
              </span>
            </div>
          </>
        )}
      </section>

      {/* État de l'équipe - Liste détaillée */}
      {console.log('🔍 [RENDER] employesList.length =', employesList.length, 'Liste:', employesList)}
      {employesList.length > 0 && (
        <section className='space-y-2'>
          <h3 className='text-sm font-semibold text-gray-800 flex items-center gap-2 px-1'>
            <svg className='w-4 h-4 text-gray-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'/>
            </svg>
            État de l'équipe
          </h3>

          <div className='grid grid-cols-2 gap-2'>
            {/* Présents */}
            <button
              onClick={() => setShowPresents(!showPresents)}
              className='flex items-center justify-between p-2.5 rounded-lg bg-white border border-green-200 hover:bg-green-50 transition-colors text-left shadow-sm'
            >
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 rounded-full bg-green-500'></div>
                <div>
                  <div className='text-[10px] text-gray-600'>Présents</div>
                  <div className='text-base font-bold text-green-700'>{employesList.filter(e => e.aPointe).length}</div>
                </div>
              </div>
              <svg className={`w-3.5 h-3.5 text-green-700 transition-transform ${showPresents?'rotate-180':''}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7'/>
              </svg>
            </button>

            {/* Non pointés */}
            <button
              onClick={() => setShowNonPointes(!showNonPointes)}
              className={`flex items-center justify-between p-2.5 rounded-lg bg-white border transition-colors text-left shadow-sm ${
                employesList.filter(e => !e.aPointe).length === 0 
                  ? 'border-green-200 hover:bg-green-50'
                  : 'border-red-200 hover:bg-red-50'
              }`}
            >
              <div className='flex items-center gap-2'>
                <div className={`w-2 h-2 rounded-full ${
                  employesList.filter(e => !e.aPointe).length === 0 ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <div>
                  <div className='text-[10px] text-gray-600'>Non pointés</div>
                  <div className={`text-base font-bold ${
                    employesList.filter(e => !e.aPointe).length === 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {employesList.filter(e => !e.aPointe).length}
                  </div>
                </div>
              </div>
              <svg className={`w-3.5 h-3.5 transition-transform ${
                employesList.filter(e => !e.aPointe).length === 0 ? 'text-green-700' : 'text-red-700'
              } ${showNonPointes?'rotate-180':''}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7'/>
              </svg>
            </button>
          </div>

          {/* Liste des présents */}
          {showPresents && (
            <div className='p-2.5 rounded-lg bg-white border border-green-200 shadow-sm'>
              <div className='text-[10px] font-medium text-green-800 mb-1.5'>✓ Employés présents ({employesList.filter(e => e.aPointe).length})</div>
              <div className='space-y-1.5'>
                {employesList.filter(e => e.aPointe).map(emp => {
                  const heureEntree = emp.heureEntree ? new Date(emp.heureEntree) : null;
                  const heureAffichage = heureEntree && !isNaN(heureEntree.getTime()) 
                    ? heureEntree.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : 'N/A';
                  
                  return (
                    <div key={emp.id} className='flex items-center justify-between gap-2 text-[11px] text-gray-700 bg-green-50 rounded px-2 py-1.5 border border-green-100'>
                      <div className='flex items-center gap-1.5 flex-1 min-w-0'>
                        <div className='w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0'></div>
                        <span className='truncate font-medium' title={emp.nomComplet}>{emp.nomComplet}</span>
                      </div>
                      <div className='flex items-center gap-2 flex-shrink-0'>
                        <span className='text-[10px] text-green-700 font-semibold'>{heureAffichage}</span>
                        {emp.telephone && (
                          <a 
                            href={`tel:${emp.telephone}`} 
                            className='text-green-600 hover:text-green-800'
                            title={`Appeler ${emp.nomComplet}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
                              <path d='M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z'/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Liste des non pointés */}
          {showNonPointes && employesList.filter(e => !e.aPointe).length > 0 && (
            <div className='p-2.5 rounded-lg bg-white border border-red-200 shadow-sm'>
              <div className='text-[10px] font-medium text-red-800 mb-1.5'>⚠️ Employés non pointés ({employesList.filter(e => !e.aPointe).length})</div>
              <div className='space-y-1.5'>
                {employesList.filter(e => !e.aPointe).map(emp => (
                  <div key={emp.id} className='flex items-center justify-between gap-2 text-[11px] text-gray-700 bg-red-50 rounded px-2 py-1.5 border border-red-100'>
                    <div className='flex items-center gap-1.5 flex-1 min-w-0'>
                      <div className='w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0'></div>
                      <span className='truncate font-medium' title={emp.nomComplet}>{emp.nomComplet}</span>
                    </div>
                    <div className='flex items-center gap-1.5 flex-shrink-0'>
                      {emp.email && (
                        <a 
                          href={`mailto:${emp.email}`}
                          className='text-red-600 hover:text-red-800'
                          title={`Envoyer un email à ${emp.nomComplet}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
                            <path d='M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z'/>
                            <path d='M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z'/>
                          </svg>
                        </a>
                      )}
                      {emp.telephone && (
                        <a 
                          href={`tel:${emp.telephone}`}
                          className='text-red-600 hover:text-red-800'
                          title={`Appeler ${emp.nomComplet}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg className='w-3.5 h-3.5' fill='currentColor' viewBox='0 0 20 20'>
                            <path d='M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z'/>
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showNonPointes && employesList.filter(e => !e.aPointe).length === 0 && (
            <div className='p-2 rounded-lg bg-white border border-green-200 text-center shadow-sm'>
              <div className='text-xs font-medium text-green-800'>🎉 Tous les employés ont pointé</div>
            </div>
          )}
        </section>
      )}

      {/* Anomalies & alertes */}
      <section className='bg-white border border-gray-200 rounded-lg p-3 shadow-sm'>
        <button
          onClick={() => setShowAnomalies(!showAnomalies)}
          className='w-full flex items-center justify-between hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-all group'
        >
          <div className='flex items-center gap-2.5'>
            <div className={`p-1.5 rounded-lg transition-colors ${
              hasAnomalies && !loadingShifts && !loadingComparaisons
                ? 'bg-orange-100 text-orange-600 group-hover:bg-orange-200'
                : 'bg-green-100 text-green-600 group-hover:bg-green-200'
            }`}>
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'/>
              </svg>
            </div>
            
            <div className='flex flex-col items-start'>
              <h2 className='text-xs font-semibold text-gray-800'>
                Anomalies & alertes
              </h2>
              {!hasAnomalies && !loadingShifts && !loadingComparaisons && (
                <span className='text-[9px] text-green-600 font-medium'>Aucune anomalie</span>
              )}
              {(loadingShifts || loadingComparaisons) && (
                <span className='text-[9px] text-gray-500'>Analyse en cours...</span>
              )}
            </div>
            
            {hasAnomalies && !loadingShifts && !loadingComparaisons && (
              <div className='flex items-center gap-1 ml-2'>
                <div className='h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse'>
                  {(anomalies.absencesNonPlanifiees.length || 0) + 
                   (anomalies.retards.length || 0) + 
                   (anomalies.horsPlage.length || 0) + 
                   (anomalies.departsAnticipes.length || 0) + 
                   (anomalies.nonAssignes.length || 0)}
                </div>
              </div>
            )}
          </div>

          <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showAnomalies?'rotate-180':''}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7'/>
          </svg>
        </button>

        {/* Message de chargement */}
        {(loadingShifts || loadingComparaisons) && (
          <div className='mt-2 flex items-center gap-2 text-[10px] text-gray-500 p-3 bg-gray-50 rounded-lg'>
            <svg className='animate-spin h-4 w-4 text-blue-600' fill='none' viewBox='0 0 24 24'>
              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
              <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
            </svg>
            <span>Analyse des anomalies en cours...</span>
          </div>
        )}

        {/* Aperçu rapide (toujours visible) - Badges modernisés */}
        {!loadingShifts && !loadingComparaisons && hasAnomalies && !showAnomalies && (
          <div className='mt-3 flex flex-wrap gap-2'>
              {anomalies.absencesNonPlanifiees.length > 0 && (
                <div className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-red-50 to-red-100 border border-red-200 shadow-sm'>
                  <span className='text-sm'>🚨</span>
                  <span className='text-[10px] font-semibold text-red-800'>
                    {anomalies.absencesNonPlanifiees.length} Absence{anomalies.absencesNonPlanifiees.length>1?'s':''}
                  </span>
                </div>
              )}
              {anomalies.retards.length > 0 && (
                <div className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 shadow-sm'>
                  <span className='text-sm'>⚠️</span>
                  <span className='text-[10px] font-semibold text-orange-800'>
                    {anomalies.retards.length} Retard{anomalies.retards.length>1?'s':''}
                  </span>
                </div>
              )}
              {anomalies.horsPlage.length > 0 && (
                <div className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 shadow-sm'>
                  <span className='text-sm'>🔵</span>
                  <span className='text-[10px] font-semibold text-purple-800'>
                    {anomalies.horsPlage.length} Hors-plage
                  </span>
                </div>
              )}
              {anomalies.departsAnticipes.length > 0 && (
                <div className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-red-50 to-red-100 border border-red-200 shadow-sm'>
                  <span className='text-sm'>⏰</span>
                  <span className='text-[10px] font-semibold text-red-800'>
                    {anomalies.departsAnticipes.length} Départ{anomalies.departsAnticipes.length>1?'s':''} anticipé{anomalies.departsAnticipes.length>1?'s':''}
                  </span>
                </div>
              )}
              {anomalies.nonAssignes.length > 0 && (
                <div className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 shadow-sm'>
                  <span className='text-sm'>📋</span>
                  <span className='text-[10px] font-semibold text-gray-800'>
                    {anomalies.nonAssignes.length} Non assigné{anomalies.nonAssignes.length>1?'s':''}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Détails complets (déroulant) */}
          {showAnomalies && !loadingShifts && !loadingComparaisons && hasAnomalies && (
            <ul className='space-y-1.5 text-[10px] text-gray-700'>
              {/* Absences non planifiées */}
              {anomalies.absencesNonPlanifiees.length>0 && (
                <li className='p-2 bg-red-50 rounded border border-red-200'>
                  <div className='flex items-start gap-1.5'>
                    <span className='text-red-600 text-sm'>🚨</span>
                    <div className='flex-1'>
                      <div className='font-semibold text-red-800 mb-1.5 flex items-center justify-between'>
                        <span>{anomalies.absencesNonPlanifiees.length} Absence{anomalies.absencesNonPlanifiees.length>1?'s':''} non planifiée{anomalies.absencesNonPlanifiees.length>1?'s':''}</span>
                        <span className='text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded'>CRITIQUE</span>
                      </div>
                      <div className='space-y-1'>
                        {anomalies.absencesNonPlanifiees.some(a => a.source !== 'stats') ? (
                          anomalies.absencesNonPlanifiees.map((a, idx) => {
                            const emp = employesList.find(e => e.nomComplet === a.employeNom || e.id === a.employeId);
                            return (
                              <div key={idx} className='bg-white rounded px-2 py-1.5 border border-red-100'>
                                <div className='flex items-center justify-between mb-0.5'>
                                  <span className='font-medium text-gray-800 text-[10px]'>{a.employeNom}</span>
                                  <span className='text-[8px] text-red-600 font-semibold'>Aucun pointage</span>
                                </div>
                                <div className='text-[9px] text-gray-600'>
                                  {a.message || 'Employé programmé mais absent'}
                                </div>
                                {emp && (emp.email || emp.telephone) && (
                                  <div className='flex gap-1.5 mt-1'>
                                    {emp.email && (
                                      <a 
                                        href={`mailto:${emp.email}`}
                                        className='text-[8px] px-1.5 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-0.5'
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <svg className='w-2.5 h-2.5' fill='currentColor' viewBox='0 0 20 20'>
                                          <path d='M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z'/>
                                          <path d='M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z'/>
                                        </svg>
                                        Email
                                      </a>
                                    )}
                                    {emp.telephone && (
                                      <a 
                                        href={`tel:${emp.telephone}`}
                                        className='text-[8px] px-1.5 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-0.5'
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <svg className='w-2.5 h-2.5' fill='currentColor' viewBox='0 0 20 20'>
                                          <path d='M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z'/>
                                        </svg>
                                        Appeler
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className='text-[9px] text-gray-600 bg-white rounded px-2 py-1.5'>
                            Aucun pointage enregistré pour {anomalies.absencesNonPlanifiees.length} employé{anomalies.absencesNonPlanifiees.length>1?'s':''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )}

              {/* Retards */}
              {anomalies.retards.length>0 && (
                <li className='p-2 bg-orange-50 rounded border border-orange-200'>
                  <div className='flex items-start gap-1.5'>
                    <span className='text-orange-600 text-sm'>⚠️</span>
                    <div className='flex-1'>
                      <div className='font-semibold text-orange-800 mb-1.5 flex items-center justify-between'>
                        <span>{anomalies.retards.length} Retard{anomalies.retards.length>1?'s':''} en cours</span>
                        <span className='text-[8px] bg-orange-600 text-white px-1.5 py-0.5 rounded'>URGENT</span>
                      </div>
                      <div className='space-y-1'>
                        {anomalies.retards.map((s, idx) => {
                          const start = new Date(s.start);
                          const retardMinutes = Math.floor((now - start) / 60000);
                          const employeeName = s.employeeName || s.employeNom || s.nom || 
                            (s.employe?.prenom && s.employe?.nom ? `${s.employe.prenom} ${s.employe.nom}` : 
                            s.employe?.email || 'Non assigné');
                          const emp = employesList.find(e => e.nomComplet === employeeName || e.id === s.employeeId);
                          const heureDebut = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                          const heureActuelle = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                          
                          return (
                            <div key={idx} className='bg-white rounded px-2 py-1.5 border border-orange-100'>
                              <div className='flex items-center justify-between mb-0.5'>
                                <span className='font-medium text-gray-800 text-[10px]'>{employeeName}</span>
                                <span className='text-[8px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-semibold'>
                                  +{retardMinutes} min
                                </span>
                              </div>
                              <div className='text-[9px] text-gray-600 space-y-0.5'>
                                <div className='flex items-center gap-1'>
                                  <span className='text-gray-500'>Début prévu:</span>
                                  <span className='font-medium'>{heureDebut}</span>
                                </div>
                                <div className='flex items-center gap-1'>
                                  <span className='text-gray-500'>Heure actuelle:</span>
                                  <span className='font-medium text-orange-700'>{heureActuelle}</span>
                                </div>
                              </div>
                              {emp && (emp.email || emp.telephone) && (
                                <div className='flex gap-1.5 mt-1'>
                                  {emp.email && (
                                    <a 
                                      href={`mailto:${emp.email}`}
                                      className='text-[8px] px-1.5 py-0.5 rounded bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-0.5'
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      📧 Email
                                    </a>
                                  )}
                                  {emp.telephone && (
                                    <a 
                                      href={`tel:${emp.telephone}`}
                                      className='text-[8px] px-1.5 py-0.5 rounded bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-0.5'
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      📞 Appeler
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </li>
              )}

              {/* Hors-plage */}
              {anomalies.horsPlage.length>0 && (
                <li className='p-2 bg-purple-50 rounded border border-purple-200'>
                  <div className='flex items-start gap-1.5'>
                    <span className='text-purple-600 text-sm'>🔵</span>
                    <div className='flex-1'>
                      <div className='font-semibold text-purple-800 mb-1.5 flex items-center justify-between'>
                        <span>{anomalies.horsPlage.length} Pointage{anomalies.horsPlage.length>1?'s':''} hors-plage</span>
                        <span className='text-[8px] bg-purple-600 text-white px-1.5 py-0.5 rounded'>INFO</span>
                      </div>
                      <div className='space-y-1'>
                        {anomalies.horsPlage.map((a, idx) => (
                          <div key={idx} className='bg-white rounded px-2 py-1.5 border border-purple-100'>
                            <div className='font-medium text-gray-800 text-[10px] mb-0.5'>{a.employeNom}</div>
                            <div className='text-[9px] text-gray-600'>
                              {a.message || 'Pointage en dehors des horaires prévus'}
                            </div>
                            {a.dureeMinutes && (
                              <div className='text-[8px] text-purple-600 mt-0.5'>
                                Écart: {Math.abs(a.dureeMinutes)} minutes
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              )}

              {/* Départs anticipés */}
              {anomalies.departsAnticipes.length>0 && (
                <li className='p-2 bg-red-50 rounded border border-red-200'>
                  <div className='flex items-start gap-1.5'>
                    <span className='text-red-600 text-sm'>⏰</span>
                    <div className='flex-1'>
                      <div className='font-semibold text-red-800 mb-1.5 flex items-center justify-between'>
                        <span>{anomalies.departsAnticipes.length} Départ{anomalies.departsAnticipes.length>1?'s':''} anticipé{anomalies.departsAnticipes.length>1?'s':''}</span>
                        <span className='text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded'>ATTENTION</span>
                      </div>
                      <div className='space-y-1'>
                        {anomalies.departsAnticipes.map((a, idx) => (
                          <div key={idx} className='bg-white rounded px-2 py-1.5 border border-red-100'>
                            <div className='font-medium text-gray-800 text-[10px] mb-0.5'>{a.employeNom}</div>
                            <div className='text-[9px] text-gray-600'>
                              {a.message || 'Parti avant l\'heure prévue'}
                            </div>
                            {a.dureeMinutes && (
                              <div className='text-[8px] text-red-600 mt-0.5 font-semibold'>
                                Parti {Math.abs(a.dureeMinutes)} min en avance
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              )}

              {/* Shifts non assignés */}
              {anomalies.nonAssignes.length>0 && (
                <li className='p-2 bg-gray-50 rounded border border-gray-200'>
                  <div className='flex items-start gap-1.5'>
                    <span className='text-gray-600 text-sm'>📋</span>
                    <div className='flex-1'>
                      <div className='font-semibold text-gray-800 mb-1.5 flex items-center justify-between'>
                        <span>{anomalies.nonAssignes.length} Shift{anomalies.nonAssignes.length>1?'s':''} non assigné{anomalies.nonAssignes.length>1?'s':''}</span>
                        <span className='text-[8px] bg-gray-600 text-white px-1.5 py-0.5 rounded'>À TRAITER</span>
                      </div>
                      <div className='space-y-1'>
                        {anomalies.nonAssignes.map((s, idx) => {
                          const start = new Date(s.start);
                          const end = new Date(s.end);
                          const heureDebut = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                          const heureFin = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                          const status = start > now ? 'À venir' : start <= now && end > now ? 'En cours' : 'Passé';
                          
                          return (
                            <div key={idx} className='bg-white rounded px-2 py-1.5 border border-gray-200'>
                              <div className='flex items-center justify-between mb-0.5'>
                                <span className='font-medium text-gray-800 text-[10px]'>
                                  {heureDebut} - {heureFin}
                                </span>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-semibold ${
                                  status === 'En cours' ? 'bg-red-600 text-white' :
                                  status === 'À venir' ? 'bg-blue-600 text-white' :
                                  'bg-gray-400 text-white'
                                }`}>
                                  {status}
                                </span>
                              </div>
                              <div className='text-[9px] text-gray-600'>
                                Aucun employé assigné pour ce créneau
                              </div>
                              {status === 'En cours' && (
                                <div className='text-[8px] text-red-600 mt-0.5 font-semibold'>
                                  ⚠️ Nécessite une action immédiate
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          )}

          {/* Message "Tout va bien" */}
          {!loadingShifts && !loadingComparaisons && !hasAnomalies && (
            <div className='text-[10px] text-green-700 p-2 bg-green-50 rounded text-center'>✓ Aucune anomalie détectée</div>
          )}
        </section>

      {/* Remplacements / Demandes de congé - Regroupés */}
      <div className='grid lg:grid-cols-2 gap-4'>
        {/* Demandes de congé en attente */}
        {pendingLeavesList.length > 0 && (
          <section className='bg-white border border-gray-200 rounded-lg p-3'>
            <h2 className='text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5'>
              <svg className='w-4 h-4 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'/>
              </svg>
              Demandes de congé ({pendingConges})
            </h2>
            <div className='space-y-1.5'>
              {pendingLeavesList.slice(0,5).map((c, idx) => {
                const isUrgent = c?.dateDebut && (new Date(c.dateDebut).getTime()-now.getTime()) < 48*3600*1000;
                const joursRestants = c?.dateDebut ? Math.ceil((new Date(c.dateDebut).getTime()-now.getTime()) / (24*3600*1000)) : null;
                
                return (
                  <div 
                    key={c.id||idx} 
                    onClick={() => onGoToConges && onGoToConges()}
                    className={`p-2 rounded border text-[10px] cursor-pointer transition-all hover:shadow-md ${
                      isUrgent
                        ? 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className='flex justify-between items-start gap-2'>
                      <div className='flex-1'>
                        <div className='font-medium text-gray-800'>{c.user?.nom || c.user?.email || 'N/A'}</div>
                        <div className='text-gray-600 mt-0.5'>
                          {c.dateDebut && new Date(c.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {c.dateFin && ` → ${new Date(c.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                        </div>
                        {c.type && <div className='text-gray-500 mt-0.5'>Type: {c.type}</div>}
                        {joursRestants !== null && (
                          <div className={`mt-0.5 text-[9px] ${isUrgent ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            Début dans {joursRestants} jour{joursRestants > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <div className='flex items-center gap-2'>
                        {isUrgent && <span className='text-[8px] px-1.5 py-0.5 rounded bg-red-500 text-white font-semibold'>URGENT</span>}
                        <svg className='w-4 h-4 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7'/>
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {pendingLeavesList.length > 5 && (
              <div className='text-[9px] text-gray-500 italic mt-1.5'>
                +{pendingLeavesList.length-5} autres demandes
              </div>
            )}
            {onGoToConges && (
              <button
                onClick={() => onGoToConges()}
                className='mt-2 w-full px-3 py-1.5 text-[10px] font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5'
              >
                <span>Voir toutes les demandes</span>
                <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 7l5 5m0 0l-5 5m5-5H6'/>
                </svg>
              </button>
            )}
          </section>
        )}

        {/* Remplacements / Échanges */}
        <section className='bg-white border border-gray-200 rounded-lg p-3'>
          <h2 className='text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5'>
            <svg className='w-4 h-4 text-purple-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'/>
            </svg>
            Remplacements
            {replacements.length===0 && <span className='text-[9px] text-green-600 font-medium ml-1'>(Aucun)</span>}
          </h2>
          {loadingShifts ? (
            <div className='text-[10px] text-gray-500 p-2 bg-gray-50 rounded'>Chargement…</div>
          ) : replacements.length>0 ? (
            <>
              {(urgentReplacements.length>0 || ongoingReplacements.length>0) && (
                <div className='flex flex-wrap gap-1.5 text-[9px] mb-2'>
                  {ongoingReplacements.length>0 && <span className='px-1.5 py-0.5 rounded bg-red-600 text-white font-medium'>En cours: {ongoingReplacements.length}</span>}
                  {urgentReplacements.length>0 && <span className='px-1.5 py-0.5 rounded bg-orange-500 text-white font-medium'>Urgent: {urgentReplacements.length}</span>}
                </div>
              )}
              <div className='space-y-1.5'>
                {replacements.slice(0,4).map(r => (
                  <div key={r.id} className='p-2 flex items-center justify-between gap-2 text-[10px] border rounded bg-gray-50'>
                    <div className='flex-1'>
                      <span className='font-medium text-gray-700'>{formatHM(r.start)}–{formatHM(r.end)}</span>
                      <div className='text-gray-500'>{r.employeeName}</div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${r.urgence==='urgent'?'bg-orange-500 text-white': r.urgence==='en cours'?'bg-red-600 text-white': 'bg-gray-200 text-gray-600'}`}>
                      {r.urgence}
                    </span>
                  </div>
                ))}
              </div>
              {replacements.length>4 && <div className='text-[9px] text-gray-500 italic mt-1.5'>+{replacements.length-4} autres</div>}
            </>
          ) : (
            <div className='text-[10px] text-green-700 p-2 bg-green-50 rounded text-center'>✓ Aucun remplacement en attente</div>
          )}
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION CONSIGNES DU JOUR
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
        <div className='flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50'>
          <div className='flex items-center gap-2'>
            <Megaphone className='w-4 h-4 text-red-500' />
            <span className='text-xs font-semibold text-gray-700'>Consignes actives</span>
            <span className='text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600'>
              {consignes.filter(c => c.active).length}
            </span>
          </div>
          <button
            onClick={() => {
              setEditingConsigne(null);
              setConsigneForm({ titre: '', contenu: '', type: 'info', dateFin: '' });
              setShowConsigneModal(true);
            }}
            className='flex items-center gap-1 text-[10px] font-medium text-white px-2 py-1 rounded-md hover:opacity-90 transition-opacity'
            style={{ backgroundColor: '#cf292c' }}
          >
            <Plus className='w-3 h-3' />
            Nouvelle
          </button>
        </div>
        
        <div className='p-2 max-h-[180px] overflow-y-auto'>
          {loadingConsignes ? (
            <div className='h-12 bg-gray-100 rounded animate-pulse' />
          ) : consignes.length === 0 ? (
            <p className='text-xs text-gray-400 text-center py-4'>Aucune consigne créée</p>
          ) : (
            <div className='space-y-1.5'>
              {consignes.map(consigne => (
                <div 
                  key={consigne.id}
                  className={`p-2 rounded-lg flex items-start gap-2 ${
                    !consigne.active 
                      ? 'bg-gray-100 opacity-60'
                      : consigne.type === 'urgent'
                        ? 'bg-red-50 border border-red-200'
                        : consigne.type === 'important'
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                    consigne.type === 'urgent' ? 'bg-red-100' 
                    : consigne.type === 'important' ? 'bg-amber-100' 
                    : 'bg-blue-100'
                  }`}>
                    {consigne.type === 'urgent' ? <AlertTriangle className='w-3 h-3 text-red-600' />
                    : consigne.type === 'important' ? <AlertCircle className='w-3 h-3 text-amber-600' />
                    : <Info className='w-3 h-3 text-blue-600' />}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5'>
                      <span className={`text-xs font-medium ${!consigne.active ? 'text-gray-500' : 'text-gray-800'}`}>
                        {consigne.titre}
                      </span>
                      {!consigne.active && (
                        <span className='text-[9px] px-1 py-0.5 rounded bg-gray-300 text-gray-600'>Inactive</span>
                      )}
                    </div>
                    <p className='text-[10px] text-gray-500 line-clamp-1'>{consigne.contenu}</p>
                  </div>
                  <div className='flex items-center gap-1 shrink-0'>
                    <button
                      onClick={() => handleToggleConsigne(consigne)}
                      className={`p-1 rounded ${consigne.active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}
                      title={consigne.active ? 'Désactiver' : 'Activer'}
                    >
                      <Check className='w-3.5 h-3.5' />
                    </button>
                    <button
                      onClick={() => openEditConsigne(consigne)}
                      className='p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                      title='Modifier'
                    >
                      <Edit2 className='w-3.5 h-3.5' />
                    </button>
                    <button
                      onClick={() => handleDeleteConsigne(consigne.id)}
                      className='p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50'
                      title='Supprimer'
                    >
                      <Trash2 className='w-3.5 h-3.5' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

// Carte simple
const SimpleCard = ({ label, value, sub, tone='neutral', loading=false }) => {
  const toneMap = {
    neutral: 'bg-white border-gray-200 text-gray-700',
    ok: 'bg-green-50 border-green-200 text-green-700',
    warn: 'bg-orange-50 border-orange-200 text-orange-700',
    alert: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  };
  return (
    <div className={`rounded-lg border p-3 text-center ${toneMap[tone]||toneMap.neutral}`}>
      <div className='text-[10px] uppercase tracking-wide font-medium opacity-70 mb-1'>{label}</div>
      <div className='text-lg font-bold leading-none'>{loading? '…' : value}</div>
      {sub && !loading && <div className='text-[11px] opacity-70 mt-1'>{sub}</div>}
    </div>
  );
};

export default DashboardOverview;
