// src/components/PlanningRH.jsx

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { normalizeDateLocal, getCurrentDateString, isToday, toLocalDateString } from '../utils/parisTimeUtils';
import { DEBUG_MODE, debugLog, debugWarn, debugError } from '../utils/debugMode';
import { getCategorieEmploye as getCategorieEmployeUtil, CATEGORIES } from '../utils/categoriesConfig';
import { TYPES_CONGES, getTypeConge, getTypesForSelect } from '../config/typesConges';
// Import uuid retire - plus besoin d'IDs uniques pour les segments
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  List,
  Pizza,
  Soup,
  ClipboardList,
  SprayCan,
  ShieldCheck,
  Star,
  Users,
  UsersRound,
  Laptop,
  X,
  Plus,
  UserPlus,
  Check,
  AlertTriangle,
  Clock,
  Ban,
  TrendingUp,
  Coffee,
  Palmtree,
  Stethoscope,
  Baby,
  GraduationCap,
  Heart,
  DollarSign,
  FileText,
  RefreshCw,
  Banknote,
  CheckCircle,
  XCircle,
  AlarmClock,
  LogOut,
  Timer,
  Hourglass,
  PlusCircle,
  Rocket,
  CircleSlash,
  AlertCircle,
  MapPin,
  UserX,
  CircleAlert,
  MessageSquare,
  Minus,
  BarChart3,
  Moon,
  Lock,
  User,
  Briefcase
} from "lucide-react"; // Ajout d'icônes modernes
import ErrorMessage from "./ErrorMessage";
import CreationRapideForm from "./CreationRapideForm";
import NavigationRestoreNotification from "./NavigationRestoreNotification";
import RapportHeuresEmploye from "./RapportHeuresEmploye";
import { useSyncAnomalies } from '../hooks/useAnomalies';
import ModalTraiterAnomalie from './anomalies/ModalTraiterAnomalie';
import AnomalieManager from './anomalies/AnomalieManager';
import AnomalieActionModal from './anomalies/AnomalieActionModal';
import AnomaliesManager from './anomalies/AnomaliesManager';
import { useToast } from './Toast';
import EmployeScorePanel from './EmployeScorePanel';
import ReplacementsManager from './replacements/ReplacementsManager';
import ExtrasManager from './extras/ExtrasManagerKanban';
import { useRemplacementsNotification } from '../hooks/useRemplacementsNotification';

// -------------------------------------------------------------------------------
// ?? PALETTE DE COULEURS UNIFIÉE PAR TYPE DE SHIFT
// Utilisée sur toutes les vues (Jour, Semaine, Mois) pour une cohérence visuelle
// -------------------------------------------------------------------------------
const SHIFT_TYPE_COLORS = {
  // Shift normal (validé)
  normal: {
    gradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
    border: 'border-l-[3px] border-l-blue-400',
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    borderFull: 'border-blue-200',
    text: 'text-blue-600',
    dot: 'bg-blue-500',
    Icon: Clock,
    label: 'Shift'
  },
  // Shift à valider
  aValider: {
    gradient: 'bg-gradient-to-r from-amber-400 to-orange-500',
    border: 'border-l-[3px] border-l-amber-300',
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-50',
    borderFull: 'border-amber-200',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    Icon: AlertCircle,
    label: 'à valider'
  },
  // Extra à payer
  extraAPayer: {
    gradient: 'bg-gradient-to-r from-orange-400 to-amber-500',
    border: 'border-l-[3px] border-l-orange-300',
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-50',
    borderFull: 'border-orange-200',
    text: 'text-orange-600',
    dot: 'bg-orange-500',
    Icon: Star,
    label: 'Extra à payer'
  },
  // Extra payé
  extraPaye: {
    gradient: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    border: 'border-l-[3px] border-l-emerald-400',
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-50',
    borderFull: 'border-emerald-200',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
    Icon: CheckCircle,
    label: 'Extra payé'
  },
  // Shift de nuit
  nuit: {
    gradient: 'bg-gradient-to-r from-indigo-500 to-purple-600',
    border: 'border-l-[3px] border-l-indigo-400',
    bg: 'bg-indigo-500',
    bgLight: 'bg-indigo-50',
    borderFull: 'border-indigo-200',
    text: 'text-indigo-600',
    dot: 'bg-indigo-500',
    Icon: Moon,
    label: 'Nuit'
  },
  // Remplacement effectué
  remplacement: {
    gradient: 'bg-gradient-to-r from-fuchsia-500 to-pink-600',
    border: 'border-l-[3px] border-l-fuchsia-400',
    bg: 'bg-fuchsia-500',
    bgLight: 'bg-fuchsia-50',
    borderFull: 'border-fuchsia-200',
    text: 'text-fuchsia-600',
    dot: 'bg-fuchsia-500',
    Icon: RefreshCw,
    label: 'Remplacement'
  },
  // Remplacé par quelqu'un
  remplace: {
    gradient: 'bg-gradient-to-r from-slate-400 to-gray-500',
    border: 'border-l-[3px] border-l-slate-300',
    bg: 'bg-slate-400',
    bgLight: 'bg-slate-50',
    borderFull: 'border-slate-200',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    Icon: UserX,
    label: 'Remplacé'
  },
  // Repos
  repos: {
    gradient: 'bg-gradient-to-r from-gray-300 to-gray-400',
    border: 'border-l-[3px] border-l-gray-300',
    bg: 'bg-gray-400',
    bgLight: 'bg-gray-100',
    borderFull: 'border-gray-200',
    text: 'text-gray-500',
    dot: 'bg-gray-400',
    Icon: Coffee,
    label: 'Repos'
  },
  // Congé (générique)
  conge: {
    gradient: 'bg-gradient-to-r from-amber-400 to-yellow-500',
    border: 'border-l-[3px] border-l-amber-300',
    bg: 'bg-amber-400',
    bgLight: 'bg-amber-50',
    borderFull: 'border-amber-200',
    text: 'text-amber-600',
    dot: 'bg-amber-400',
    Icon: Palmtree,
    label: 'Congé'
  },
  // Maladie
  maladie: {
    gradient: 'bg-gradient-to-r from-red-300 to-rose-400',
    border: 'border-l-[3px] border-l-red-300',
    bg: 'bg-red-400',
    bgLight: 'bg-red-50',
    borderFull: 'border-red-200',
    text: 'text-red-500',
    dot: 'bg-red-400',
    Icon: Stethoscope,
    label: 'Maladie'
  },
};

// Fonction utilitaire pour déterminer le type de couleur d'un segment
function getShiftTypeColor(segment, shift = {}, isNightShift = false) {
  // Priorité 1: Extra
  if (segment?.isExtra) {
    return segment.paymentStatus === 'payé' || segment.paymentStatus === 'pay\uFFFD' || segment.paymentStatus === 'paye'
      ? SHIFT_TYPE_COLORS.extraPaye
      : SHIFT_TYPE_COLORS.extraAPayer;
  }
  // Priorité 2: À valider
  if (segment?.aValider) {
    return SHIFT_TYPE_COLORS.aValider;
  }
  // Priorit� 3: Remplacement
  if (shift?.motif?.toLowerCase()?.includes('remplacement de')) {
    return SHIFT_TYPE_COLORS.remplacement;
  }
  // Priorité 4: Remplacé
  if (shift?.motif?.toLowerCase()?.includes('remplacé par') || shift?.motif?.toLowerCase()?.includes('remplac\uFFFD par')) {
    return SHIFT_TYPE_COLORS.remplace;
  }
  // Priorit� 5: Nuit
  if (isNightShift) {
    return SHIFT_TYPE_COLORS.nuit;
  }
  // Par défaut: Normal
  return SHIFT_TYPE_COLORS.normal;
}

// -------------------------------------------------------------------------------
// CONFIGURATION DES TYPES DE CONGÉS
// -------------------------------------------------------------------------------
const CONGE_TYPE_COLORS = {
  CP: { Icon: Palmtree, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Congés payés' },
  RTT: { Icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'RTT' },
  sans_solde: { Icon: DollarSign, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', label: 'Sans solde' },
  maladie: { Icon: Stethoscope, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: 'Maladie' },
  maternite: { Icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', label: 'Maternité' },
  paternite: { Icon: Baby, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', label: 'Paternité' },
  deces: { Icon: Heart, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Décès' },
  mariage: { Icon: Heart, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Mariage' },
  formation: { Icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Formation' },
  autre: { Icon: FileText, color: 'text-neutral-600', bg: 'bg-neutral-50', border: 'border-neutral-200', label: 'Autre' }
};

// Fonction pour obtenir la config d'un type de congé
function getCongeTypeColor(type) {
  const normalizedType = type?.toLowerCase?.() || 'autre';
  return CONGE_TYPE_COLORS[normalizedType] || CONGE_TYPE_COLORS[type?.toUpperCase?.()] || CONGE_TYPE_COLORS.autre;
}

// Mapping des icônes SVG par type de congé (ancien - gardé pour compatibilité)
const CONGE_ICONS = {
  CP: { icon: Calendar, colorClass: 'text-blue-600' },
  RTT: { icon: Clock, colorClass: 'text-purple-600' },
  sans_solde: { icon: DollarSign, colorClass: 'text-gray-600' },
  maladie: { icon: Stethoscope, colorClass: 'text-[#cf292c]' },
  maternite: { icon: Heart, colorClass: 'text-pink-600' },
  paternite: { icon: Heart, colorClass: 'text-blue-600' },
  deces: { icon: Users, colorClass: 'text-gray-600' },
  mariage: { icon: Heart, colorClass: 'text-pink-600' },
  formation: { icon: GraduationCap, colorClass: 'text-green-600' },
  autre: { icon: FileText, colorClass: 'text-amber-600' }
};

// Configuration API centralisée
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Fonction utilitaire pour construire les URLs d'API
const buildApiUrl = (endpoint) => `${API_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

// -------------------------------------------------------------------------------
// COMPOSANT LÉGENDE DES COULEURS PAR TYPE
// Affiche une légende compacte des couleurs utilisées dans le planning
// -------------------------------------------------------------------------------
function ShiftColorLegend({ compact = false, showConges = true }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const shiftTypes = [
    { key: 'normal', config: SHIFT_TYPE_COLORS.normal },
    { key: 'aValider', config: SHIFT_TYPE_COLORS.aValider },
    { key: 'extraAPayer', config: SHIFT_TYPE_COLORS.extraAPayer },
    { key: 'extraPaye', config: SHIFT_TYPE_COLORS.extraPaye },
    { key: 'nuit', config: SHIFT_TYPE_COLORS.nuit },
    { key: 'remplacement', config: SHIFT_TYPE_COLORS.remplacement },
    { key: 'repos', config: SHIFT_TYPE_COLORS.repos },
  ];
  
  const congeTypes = showConges ? [
    { key: 'CP', config: CONGE_TYPE_COLORS.CP },
    { key: 'maladie', config: CONGE_TYPE_COLORS.maladie },
  ] : [];
  
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          title="Légende des couleurs"
        >
          <div className="flex -space-x-1">
            <span className={`w-3 h-3 rounded-full ${SHIFT_TYPE_COLORS.normal.dot}`} />
            <span className={`w-3 h-3 rounded-full ${SHIFT_TYPE_COLORS.aValider.dot}`} />
            <span className={`w-3 h-3 rounded-full ${SHIFT_TYPE_COLORS.extraPaye.dot}`} />
            <span className={`w-3 h-3 rounded-full ${SHIFT_TYPE_COLORS.nuit.dot}`} />
          </div>
          <span>Légende</span>
          <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isExpanded && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 p-3 z-50">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Types de shifts</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {shiftTypes.map(({ key, config }) => {
                const Icon = config.Icon;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${config.dot}`} />
                    <Icon size={12} className={config.text} />
                    <span className="text-[10px] text-gray-600 truncate">{config.label}</span>
                  </div>
                );
              })}
            </div>
            {showConges && (
              <>
                <div className="h-px bg-gray-100 my-2" />
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Congés</div>
                <div className="grid grid-cols-2 gap-2">
                  {congeTypes.map(({ key, config }) => {
                    const Icon = config.Icon;
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${config.bg} border ${config.border}`} />
                        <Icon size={12} className={config.color} />
                        <span className="text-[10px] text-gray-600 truncate">{config.label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Version non-compact (inline)
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {shiftTypes.slice(0, 5).map(({ key, config }) => {
        const Icon = config.Icon;
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
            <Icon size={10} className={`${config.text} opacity-60`} />
            <span className="text-[9px] text-gray-500">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Import du panneau de debug (seulement en développement)
const AnomaliesDebugPanel = React.lazy(() => 
  process.env.NODE_ENV === 'development' 
    ? import('./debug/AnomaliesDebugPanel') 
    : Promise.resolve({ default: () => null })
);

// Les fonctions de validation sont maintenant implémentées directement dans le composant

const joursSemaine = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const ItemTypes = { SEGMENT: "segment" }; // ajouté pour le DnD

// Fonctions utilitaires
function getSegmentStyle(segment) {
  if (segment.isExtra) {
    return segment.paymentStatus === 'payé' || segment.paymentStatus === 'pay\uFFFD' || segment.paymentStatus === 'paye'
      ? 'bg-emerald-600 border-emerald-700' 
      : 'bg-emerald-500 border-emerald-600';
  }
  if (segment.aValider) {
    return 'bg-amber-500 border-amber-600';
  }
  return 'bg-blue-500 border-blue-600';
}

function resumeCell(conge, shift) {
  if (conge) {
    return `Congé ${conge.type || 'non défini'} - ${conge.statut || 'en attente'}`;
  }
  if (shift && shift.type === "travail" && Array.isArray(shift.segments)) {
    // Exclure les segments extra (heures au noir) du calcul officiel
    const segmentsOfficiels = shift.segments.filter(seg => !seg.isExtra);
    const totalMinutes = segmentsOfficiels.reduce((acc, seg) => {
      if (!seg.start || !seg.end) return acc;
      const start = seg.start.split(':').map(Number);
      const end = seg.end.split(':').map(Number);
      const startMin = start[0] * 60 + start[1];
      const endMin = end[0] * 60 + end[1];
      
      // ?? RESTAURANT : Gérer shifts de nuit (19:00 ? 00:30)
      let duration = endMin - startMin;
      if (duration < 0) duration += 24 * 60; // Franchit minuit
      
      return acc + Math.max(0, duration);
    }, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `Présence - ${hours}h${minutes.toString().padStart(2, '0')}`;
  }
  if (shift && shift.type === "absence") {
    return `Absence - ${shift.motif || 'non défini'}`;
  }
  return 'Aucune planification';
}

function isWeekend(date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // dimanche = 0, samedi = 6
}

function formatDate(date) {
  if (typeof date === 'string') {
    // Si c'est d�j� une cha�ne au format YYYY-MM-DD, la retourner
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    // Si c'est une string ISO avec timezone, extraire juste la date
    if (/^\d{4}-\d{2}-\d{2}T/.test(date)) return date.split('T')[0];
    date = new Date(date);
  }
  if (!(date instanceof Date) || isNaN(date)) {
    console.warn('formatDate: date invalide', date);
    return getCurrentDateString();
  }
  // Utiliser les m�thodes UTC pour �viter les d�calages de fuseau horaire
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getJour(date) {
  if (typeof date === 'string') date = new Date(date);
  return date.getUTCDate();
}

function getMois(date) {
  if (typeof date === 'string') date = new Date(date);
  return date.getUTCMonth() + 1; // getUTCMonth() retourne 0-11, on veut 1-12
}

function getSemaine(date) {
  if (typeof date === 'string') date = new Date(date);
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const pastDaysOfYear = (date - startOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getUTCDay() + 1) / 7);
}

// Fonctions pour g�n�rer les tableaux de dates selon la vue
function generateWeekDates(date) {
  const week = [];
  const startOfWeek = new Date(date);
  // Utiliser UTC pour �viter les d�calages de fuseau horaire
  const day = startOfWeek.getUTCDay();
  const diff = startOfWeek.getUTCDate() - day + (day === 0 ? -6 : 1); // Lundi comme premier jour
  startOfWeek.setUTCDate(diff);
  startOfWeek.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(Date.UTC(
      startOfWeek.getUTCFullYear(),
      startOfWeek.getUTCMonth(),
      startOfWeek.getUTCDate() + i,
      0, 0, 0, 0
    ));
    week.push(currentDate);
  }
  return week;
}

function generateMonthDates(date) {
  // Utiliser UTC pour éviter les décalages de fuseau horaire
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  
  const dates = [];
  for (let day = 1; day <= lastDay.getUTCDate(); day++) {
    dates.push(new Date(Date.UTC(year, month, day, 0, 0, 0, 0)));
  }
  return dates;
}

function generateDayDates(date) {
  // Utiliser UTC pour cohérence avec les autres vues
  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
  return [utcDate];
}

// Composant CongeBadge
function CongeBadge({ conge, compact = false }) {
  const getCongeStyle = (type, statut) => {
    const baseStyle = "px-2 py-1 rounded-full text-xs font-medium";
    
    if (statut === 'validé' || statut === 'valid\uFFFD') {
      return `${baseStyle} bg-green-100 text-green-800 border border-green-200`;
    }
    if (statut === 'refusé' || statut === 'refus\uFFFD') {
      return `${baseStyle} bg-red-100 text-red-800 border border-red-200`;
    }
    
    // En attente ou autre
    switch (type) {
      case 'CP':
        return `${baseStyle} bg-blue-100 text-blue-800 border border-blue-200`;
      case 'RTT':
        return `${baseStyle} bg-purple-100 text-purple-800 border border-purple-200`;
      case 'Maladie':
        return `${baseStyle} bg-red-100 text-red-800 border border-red-200`;
      case 'Sans solde':
        return `${baseStyle} bg-gray-100 text-gray-800 border border-gray-200`;
      default:
        return `${baseStyle} bg-orange-100 text-orange-800 border border-orange-200`;
    }
  };

  if (!conge) return null;

  return (
    <div className={getCongeStyle(conge.type, conge.statut)}>
      {compact ? (conge.type || 'Congé') : `${conge.type || 'Congé'} - ${conge.statut || 'En attente'}`}
    </div>
  );
}

// Composant réutilisable pour les actions rapides sur les écarts - VERSION PARFAITE
function EcartActions({ ecarts, employeId, date, onUpdate, compact = false }) {
  return (
    <AnomalieManager
      ecarts={ecarts}
      employeId={employeId}
      date={date}
      onUpdateEcarts={onUpdate}
      compact={compact}
    />
  );
}

// Suppression de la fonction ensureSegmentId qui n'est plus utilis�e

// Fonction utilitaire pour formater les dates pour les inputs HTML de type date
function formatDateForInput(dateString) {
  if (!dateString) return '';
  
  // Si la date est d�j� au format YYYY-MM-DD, la renvoyer directement
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  try {
    // Sinon essayer de la convertir au format YYYY-MM-DD
    return dateString.slice(0, 10);
  } catch (e) {
    console.error("Erreur de formatage de date:", e);
    return '';
  }
}

// G�n�rer la semaine courante (lundi � dimanche)
// Créneau drag & drop - Style moderne clair et explicite
function SegmentDraggable({ segment, employeId, date, index, type, shift = {} }) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SEGMENT,
    item: { segment, fromEmployeId: employeId, fromDate: date, fromIndex: index },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  // Calcul de la dur�e du segment
  let durationText;
  let durationMinutes = 0;
  let isNightShift = false;
  if (!segment.start || !segment.end) {
    durationText = '0h';
  } else {
    const [startH, startM] = segment.start.split(':').map(Number);
    const [endH, endM] = segment.end.split(':').map(Number);
    durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
      isNightShift = true;
    }
    if (endH < startH) isNightShift = true;
    
    const durationHours = Math.floor(durationMinutes / 60);
    const durationMins = durationMinutes % 60;
    durationText = durationMins > 0 
      ? `${durationHours}h${durationMins.toString().padStart(2, '0')}` 
      : `${durationHours}h`;
  }

  // Détection du type de shift
  const isAbsence = shift?.type === 'absence' || type === 'absence';
  const isRemplacement = shift?.motif?.toLowerCase()?.includes('remplacement de');
  const isRemplace =
    shift?.motif?.toLowerCase()?.includes('remplacé par') ||
    shift?.motif?.toLowerCase()?.includes('remplac\uFFFD par');
  const isExtra = segment.isExtra;
  const isExtraPaye =
    isExtra && (segment.paymentStatus === 'payé' || segment.paymentStatus === 'pay\uFFFD' || segment.paymentStatus === 'paye');
  const isAValider = segment.aValider && !isExtra;
  
  // Extraire le nom pour remplacement
  let nomRemplace = null;
  if (isRemplacement && shift?.motif) {
    const match = shift.motif.match(/remplacement de (.+)/i);
    if (match) nomRemplace = match[1].trim();
  }

  // Déterminer le type d'absence avec design amélioré
  const getAbsenceConfig = () => {
    const motif = (shift?.motif || segment?.motif || '').toLowerCase();
    if (motif.includes('maladie')) return { label: 'MALADIE', bgColor: 'bg-red-500', icon: Stethoscope };
    if (motif.includes('congé') || motif.includes('cong\uFFFD') || motif.includes('cp') || motif.includes('vacances')) return { label: 'CONGÉ PAYÉ', bgColor: 'bg-orange-500', icon: Palmtree };
    if (motif.includes('rtt')) return { label: 'RTT', bgColor: 'bg-violet-500', icon: Clock };
    if (motif.includes('repos')) return { label: 'REPOS', bgColor: 'bg-slate-500', icon: Coffee };
    if (motif.includes('formation')) return { label: 'FORMATION', bgColor: 'bg-indigo-500', icon: GraduationCap };
    if (motif.includes('maternité') || motif.includes('maternit\uFFFD')) return { label: 'MATERNITÉ', bgColor: 'bg-pink-500', icon: Heart };
    if (motif.includes('paternité') || motif.includes('paternit\uFFFD')) return { label: 'PATERNITÉ', bgColor: 'bg-cyan-500', icon: Baby };
    if (motif.includes('sans solde')) return { label: 'SANS SOLDE', bgColor: 'bg-gray-600', icon: UserX };
    return { label: 'ABSENCE', bgColor: 'bg-rose-500', icon: UserX };
  };

  // Tooltip enrichi
  const getTooltip = () => {
    let tooltip = '';
    if (isAbsence) {
      const absConfig = getAbsenceConfig();
      tooltip = absConfig.label;
      if (shift?.motif && shift.motif !== absConfig.label) tooltip += `\n${shift.motif}`;
    } else {
      tooltip = `${segment.start} - ${segment.end} (${durationText})`;
      if (isNightShift) tooltip += '\nShift de nuit';
      if (isRemplacement && nomRemplace) tooltip += `\nRemplace: ${nomRemplace}`;
      if (isExtra) {
        tooltip += `\nExtra ${isExtraPaye ? 'payé' : 'à payer'}`;
        if (segment.extraMontant) tooltip += ` - ${segment.extraMontant}€`;
      }
      if (isAValider) tooltip += '\nEn attente de validation';
    }
    if (segment.commentaire) tooltip += `\n${segment.commentaire}`;
    return tooltip;
  };
  
  // === RENDU ABSENCE - Design card explicite ===
  if (isAbsence) {
    const absConfig = getAbsenceConfig();
    const AbsIcon = absConfig.icon;
    return (
      <div
        ref={drag}
        className={`${absConfig.bgColor} text-white rounded-xl px-3 py-2.5 cursor-move select-none shadow-md border-l-4 border-white/30 ${isDragging ? "opacity-40 scale-95" : "hover:shadow-lg hover:scale-[1.02]"} transition-all duration-200`}
        title={getTooltip()}
      >
        <div className="flex items-center gap-2">
          <div className="bg-white/20 rounded-lg p-1.5">
            <AbsIcon className="w-4 h-4" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold tracking-wide">{absConfig.label}</span>
            <span className="text-[9px] opacity-80">Journée complète</span>
          </div>
        </div>
      </div>
    );
  }
  
  // === RENDU SHIFT REMPLACEMENT ===
  if (isRemplacement) {
    return (
      <div
        ref={drag}
        className={`bg-fuchsia-500 text-white rounded-xl px-3 py-2 cursor-move select-none shadow-md border-l-4 border-fuchsia-300 ${isDragging ? "opacity-40 scale-95" : "hover:shadow-lg hover:scale-[1.02]"} transition-all duration-200`}
        title={getTooltip()}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="text-[9px] font-bold tracking-wide uppercase">Remplacement</span>
          </div>
          <span className="text-[10px] font-bold bg-white/25 px-2 py-0.5 rounded-full">{durationText}</span>
        </div>
        <div className="text-[12px] font-semibold">{segment.start} - {segment.end}</div>
        {nomRemplace && (
          <div className="text-[9px] mt-1 bg-white/15 rounded px-1.5 py-0.5 truncate">
            → {nomRemplace}
          </div>
        )}
      </div>
    );
  }
  
  // === RENDU SHIFT EXTRA ===
  if (isExtra) {
    if (isExtraPaye) {
      // EXTRA PAYÉ - Vert avec checkmark
      return (
        <div
          ref={drag}
          className={`bg-emerald-500 text-white rounded-xl px-3 py-2 cursor-move select-none shadow-md border-l-4 border-emerald-300 ${isDragging ? "opacity-40 scale-95" : "hover:shadow-lg hover:scale-[1.02]"} transition-all duration-200`}
          title={getTooltip()}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="bg-white/25 rounded-full p-0.5">
                <Check className="w-3 h-3" strokeWidth={3} />
              </div>
              <span className="text-[9px] font-bold tracking-wide uppercase">Extra payé</span>
            </div>
            <span className="text-[10px] font-bold bg-white/25 px-2 py-0.5 rounded-full">{durationText}</span>
          </div>
          <div className="text-[12px] font-semibold">{segment.start} - {segment.end}</div>
          {segment.extraMontant && (
            <div className="text-[10px] mt-1 font-bold bg-white/20 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
              <Banknote className="w-3 h-3" /> {segment.extraMontant}€
            </div>
          )}
        </div>
      );
    } else {
      // EXTRA À PAYER - Orange vif avec alerte
      return (
        <div
          ref={drag}
          className={`bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl px-3 py-2 cursor-move select-none shadow-lg border-l-4 border-orange-300 ring-2 ring-orange-400/50 ${isDragging ? "opacity-40 scale-95" : "hover:shadow-xl hover:scale-[1.02]"} transition-all duration-200`}
          title={getTooltip()}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="bg-white/25 rounded-full p-0.5 animate-pulse">
                <Star className="w-3 h-3" fill="currentColor" />
              </div>
              <span className="text-[9px] font-bold tracking-wide uppercase">Extra</span>
            </div>
            <span className="text-[9px] font-bold bg-red-500 px-2 py-0.5 rounded-full animate-pulse">À PAYER</span>
          </div>
          <div className="text-[12px] font-semibold">{segment.start} - {segment.end}</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] bg-white/20 rounded px-1.5 py-0.5">{durationText}</span>
            {segment.extraMontant && (
              <span className="text-[11px] font-bold bg-white/25 rounded px-2 py-0.5">
                {segment.extraMontant}€
              </span>
            )}
          </div>
        </div>
      );
    }
  }
  
  // === RENDU SHIFT À VALIDER ===
  if (isAValider) {
    return (
      <div
        ref={drag}
        className={`bg-amber-400 text-white rounded-xl px-3 py-2 cursor-move select-none shadow-md border-l-4 border-amber-200 ring-2 ring-amber-300/50 ${isDragging ? "opacity-40 scale-95" : "hover:shadow-lg hover:scale-[1.02]"} transition-all duration-200`}
        title={getTooltip()}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Hourglass className="w-3.5 h-3.5 animate-pulse" strokeWidth={2.5} />
            <span className="text-[9px] font-bold tracking-wide uppercase">À valider</span>
          </div>
          <span className="text-[10px] font-bold bg-white/25 px-2 py-0.5 rounded-full">{durationText}</span>
        </div>
        <div className="text-[12px] font-semibold">{segment.start} - {segment.end}</div>
      </div>
    );
  }
  
  // === RENDU SHIFT DE NUIT ===
  if (isNightShift) {
    return (
      <div
        ref={drag}
        className={`bg-indigo-600 text-white rounded-xl px-3 py-2 cursor-move select-none shadow-md border-l-4 border-indigo-300 ${isDragging ? "opacity-40 scale-95" : "hover:shadow-lg hover:scale-[1.02]"} transition-all duration-200`}
        title={getTooltip()}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5" fill="currentColor" strokeWidth={2} />
            <span className="text-[9px] font-bold tracking-wide uppercase">Nuit</span>
          </div>
          <span className="text-[10px] font-bold bg-white/25 px-2 py-0.5 rounded-full">{durationText}</span>
        </div>
        <div className="text-[12px] font-semibold">{segment.start} - {segment.end}</div>
        <div className="text-[8px] mt-0.5 opacity-80">+1 jour</div>
      </div>
    );
  }
  
  // === RENDU SHIFT NORMAL - Design moderne et explicite ===
  return (
    <div
      ref={drag}
      className={`bg-blue-500 text-white rounded-xl px-3 py-2.5 cursor-move select-none shadow-md border-l-4 border-blue-300 ${isDragging ? "opacity-40 scale-95" : "hover:shadow-lg hover:scale-[1.02]"} transition-all duration-200`}
      title={getTooltip()}
    >
      {/* Header avec label TRAVAIL et durée */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className="bg-white/20 rounded p-0.5">
            <Briefcase className="w-3 h-3" strokeWidth={2.5} />
          </div>
          <span className="text-[9px] font-bold tracking-wide uppercase opacity-90">Travail</span>
        </div>
        <span className="text-[10px] font-bold bg-white/25 px-2 py-0.5 rounded-full">{durationText}</span>
      </div>
      {/* Horaires bien visibles */}
      <div className="text-[13px] font-bold tracking-tight">
        {segment.start} - {segment.end}
      </div>
      {/* Commentaire si présent */}
      {segment.commentaire && (
        <div className="text-[8px] mt-1 opacity-80 truncate flex items-center gap-1">
          <MessageSquare className="w-2.5 h-2.5" />
          {segment.commentaire}
        </div>
      )}
    </div>
  );
}

// Cellule du tableau RH
function CellDrop({ 
  employeId, 
  date, 
  shift, 
  conge, 
  moveSegment, 
  onCellClick, 
  cellSizeClass = "h-16 min-w-[110px]",
  showComparaison = false,
  getEcartsForEmployeeDate = () => [],
  formatEcart = () => ({}),
  denseMode = false,
  handleAnomalieClick = () => {},
  handleQuickAction = () => {}
}) {
  // Déterminer le statut du congé pour gérer le drag & drop et l'affichage
  const statutConge = conge?.statut?.toLowerCase?.() || '';
  const isCongeApprouve =
    statutConge === 'approuvé' ||
    statutConge === 'approuv\uFFFD' ||
    statutConge === 'validé' ||
    statutConge === 'valid\uFFFD' ||
    statutConge === 'approuve' ||
    statutConge === 'valide';
  const isCongeEnAttente = statutConge === 'en_attente' || statutConge === 'en attente';
  const isCongeRefuse = statutConge === 'refuse' || statutConge === 'refusé' || statutConge === 'refus\uFFFD';
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.SEGMENT,
    // Bloquer le drop uniquement si congé approuvé
    canDrop: () => !isCongeApprouve,
    drop: (item) => {
      if (!isCongeApprouve) moveSegment(item, employeId, date);
    }
  });

  // Récupérer les écarts pour cette cellule si le mode comparaison est activé
  const ecarts = showComparaison ? getEcartsForEmployeeDate(employeId, date) : [];
  
  // Vérifier si la date est dans le futur (pas d'anomalies pour dates futures)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cellDate = new Date(date);
  cellDate.setHours(0, 0, 0, 0);
  const isFutureDate = cellDate > today;
  
  if (showComparaison && ecarts.length > 0) {
    const retards = ecarts.filter(e => e.type && e.type.includes('retard'));
    if (retards.length > 0) {
      console.log(`?? CellDrop - RETARDS DANS LA CELLULE employé ${employeId} date ${date}:`, retards);
    }
  }
  
  // DEBUG: Log pour Léa Garcia le 29 novembre
  if (showComparaison && employeId === 56 && date.toString().includes('2025-11-29')) {
    console.log('?? CellDrop Léa 29/11:', {
      employeId,
      date: typeof date === 'string' ? date : date.toISOString?.() || date.toString(),
      ecartsCount: ecarts.length,
      ecarts: ecarts.map(e => ({ type: e.type, heureArriveeReelle: e.heureArriveeReelle }))
    });
  }

  // CAS 1: Congé APPROUVÉ - Bloque la création de shift
  if (conge && isCongeApprouve) {
    // Système de couleurs et icônes par type - utilise la config centralisée
    const typeConfig = getTypeConge(conge.type);
    
    // Mapper vers couleurs modernes avec gradients et bordure latérale
    const modernCongeColors = {
      blue: { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', borderLeft: 'border-l-4 border-l-blue-400' },
      purple: { bg: 'bg-gradient-to-r from-purple-500 to-purple-600', borderLeft: 'border-l-4 border-l-purple-400' },
      red: { bg: 'bg-gradient-to-r from-red-400 to-rose-500', borderLeft: 'border-l-4 border-l-red-400' },
      gray: { bg: 'bg-gradient-to-r from-gray-400 to-gray-500', borderLeft: 'border-l-4 border-l-gray-300' },
      pink: { bg: 'bg-gradient-to-r from-pink-400 to-rose-500', borderLeft: 'border-l-4 border-l-pink-400' },
      cyan: { bg: 'bg-gradient-to-r from-cyan-500 to-sky-600', borderLeft: 'border-l-4 border-l-cyan-400' },
      slate: { bg: 'bg-gradient-to-r from-slate-400 to-slate-500', borderLeft: 'border-l-4 border-l-slate-300' },
      yellow: { bg: 'bg-gradient-to-r from-amber-400 to-yellow-500', borderLeft: 'border-l-4 border-l-amber-400' },
      indigo: { bg: 'bg-gradient-to-r from-indigo-500 to-violet-600', borderLeft: 'border-l-4 border-l-indigo-400' },
      neutral: { bg: 'bg-gradient-to-r from-neutral-400 to-neutral-500', borderLeft: 'border-l-4 border-l-neutral-300' },
      amber: { bg: 'bg-gradient-to-r from-amber-400 to-orange-500', borderLeft: 'border-l-4 border-l-amber-400' }
    };
    
    const congeStyle = modernCongeColors[typeConfig.color] || modernCongeColors.amber;
    
    // Label court pour badge
    const labelCourt = typeConfig.labelCourt || conge.type || 'Congé';
    
    return (
      <div
        ref={drop}
        title={`${typeConfig.label || conge.type || 'Congé'} - ${conge.statut || 'En attente'}`}
        className={`flex-1 h-full relative transition-all duration-150 cursor-pointer border-r border-gray-200/60 ${
          isOver && !canDrop ? 'ring-2 ring-inset ring-orange-400' : ''
        }`}
      >
        {isOver && !canDrop && (
          <div className="absolute inset-0 flex items-center justify-center bg-orange-100/90 z-10">
            <span className="text-orange-600 font-semibold text-[10px]">Interdit</span>
          </div>
        )}
        
        <div 
          className={`${congeStyle.bg} ${congeStyle.borderLeft} rounded-r-lg mx-1 my-0.5 px-2.5 py-2 hover:brightness-95 hover:shadow-md transition-all duration-150 flex items-center justify-between shadow-sm`}
          style={{ minHeight: '40px' }}
        >
          <span className="font-semibold text-[12px] text-white truncate">
            {labelCourt}
          </span>
          <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full flex-shrink-0 flex items-center justify-center">
            <Check className="w-3 h-3" />
          </span>
        </div>
      </div>
    );
  }

  // CAS 2: Congé EN ATTENTE - Shift modifiable AVEC avertissement visuel (?)
  // L'employé peut être planifié car la décision n'est pas prise
  const isTodayCellWithPending = isToday(new Date(date));
  
  if (conge && isCongeEnAttente) {
    const typeConfig = getTypeConge(conge.type);
    const labelCourt = typeConfig.labelCourt || conge.type || 'Congé';
    
    return (
      <div
        ref={drop}
        title={`Demande de ${labelCourt} en attente - Cliquer pour modifier le shift`}
        className={`flex-1 h-full relative group/cell text-center cursor-pointer transition-all duration-200 ease-out overflow-hidden border-r border-gray-200/60 ${
          isTodayCellWithPending 
            ? 'bg-amber-50/40' 
            : isWeekend(new Date(date)) 
              ? 'bg-gray-50/40' 
              : 'bg-white'
        } ${isOver && canDrop ? 'ring-2 ring-inset ring-amber-400 bg-amber-50/50' : ''} hover:bg-amber-50/30`}
        onClick={() => onCellClick(employeId, date)}
      >
        {/* Badge congé en attente - bandeau supérieur */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[8px] font-bold px-1.5 py-1 flex items-center justify-center gap-1 z-10 shadow-sm" title={`${labelCourt} en attente de validation`}>
          <Hourglass className="w-3 h-3 animate-pulse" />
          <span className="uppercase tracking-wide">{labelCourt} en attente</span>
        </div>
        
        {/* Contenu du shift - avec marge pour le bandeau */}
        {shift && shift.type === "travail" && Array.isArray(shift.segments) && shift.segments.length > 0 ? (
          <div className="flex flex-col h-full overflow-hidden p-[3px] pt-6 pointer-events-none">
            <div className="flex flex-col gap-0.5 h-full overflow-hidden">
              {shift.segments.map((s, idx) => {
                if (!s.start || !s.end) return null;
                // Calcul dur�e
                const [startH, startM] = s.start.split(':').map(Number);
                const [endH, endM] = s.end.split(':').map(Number);
                let durationMins = (endH * 60 + endM) - (startH * 60 + startM);
                if (durationMins < 0) durationMins += 24 * 60;
                const durationH = `${Math.floor(durationMins / 60)}h${durationMins % 60 > 0 ? (durationMins % 60).toString().padStart(2, '0') : ''}`;
                
                return (
                  <div
                    key={idx}
                    className="bg-blue-500/80 text-white rounded-md px-2 py-1.5 hover:brightness-110 transition-all border-l-3 border-amber-400"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px]">{s.start} - {s.end}</span>
                      <span className="text-[9px] font-medium bg-black/20 px-1.5 py-0.5 rounded">{durationH}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full pointer-events-none pt-4">
            <span className="text-xs text-amber-600 font-medium">+ Créer shift</span>
          </div>
        )}
      </div>
    );
  }

  // CAS 3: Congé REFUSÉ - Shift normal cliquable avec indicateur visible (?)
  if (conge && isCongeRefuse) {
    const typeConfig = getTypeConge(conge.type);
    const labelCourt = typeConfig.labelCourt || conge.type || 'Congé';
    const isTodayCellRefused = isToday(new Date(date));
    
    return (
      <div
        ref={drop}
        title={`Demande de ${labelCourt} refusée - Cliquer pour modifier le shift`}
        className={`flex-1 h-full relative group/cell text-center cursor-pointer transition-all duration-200 ease-out overflow-hidden border-r border-gray-200/60 ${
          isTodayCellRefused 
            ? 'bg-red-50/30' 
            : isWeekend(new Date(date)) 
              ? 'bg-gray-50/40' 
              : 'bg-white'
        } ${isOver && canDrop ? 'ring-2 ring-inset ring-[#cf292c] bg-red-50/50' : ''} hover:bg-slate-50/80`}
        onClick={() => onCellClick(employeId, date)}
      >
        {/* Badge congé refusé - bandeau supérieur rouge */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-red-500 to-red-600 text-white text-[8px] font-bold px-1.5 py-1 flex items-center justify-center gap-1 z-10 shadow-sm" title={`Demande de ${labelCourt} refusée`}>
          <Ban className="w-3 h-3" />
          <span className="uppercase tracking-wide">{labelCourt} refusé</span>
        </div>
        
        {/* Contenu du shift - avec marge pour le bandeau */}
        {shift && shift.type === "travail" && Array.isArray(shift.segments) && shift.segments.length > 0 ? (
          <div className="flex flex-col h-full overflow-hidden p-[3px] pt-6 pointer-events-none">
            <div className="flex flex-col gap-0.5 h-full overflow-hidden">
              {shift.segments.map((s, idx) => {
                if (!s.start || !s.end) return null;
                // Calcul dur�e
                const [startH, startM] = s.start.split(':').map(Number);
                const [endH, endM] = s.end.split(':').map(Number);
                let durationMins = (endH * 60 + endM) - (startH * 60 + startM);
                if (durationMins < 0) durationMins += 24 * 60;
                const durationH = `${Math.floor(durationMins / 60)}h${durationMins % 60 > 0 ? (durationMins % 60).toString().padStart(2, '0') : ''}`;
                
                return (
                  <div
                    key={idx}
                    className="bg-blue-500 text-white rounded-md px-2 py-1.5 hover:brightness-110 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px]">{s.start} - {s.end}</span>
                      <span className="text-[9px] font-medium bg-black/20 px-1.5 py-0.5 rounded">{durationH}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full pointer-events-none pt-4">
            <span className="text-xs text-red-500 font-medium">+ Ajouter</span>
          </div>
        )}
      </div>
    );
  }

  // Vérifier si c'est le jour actuel
  const isTodayCell = isToday(new Date(date));
  
  // Détecter les types spéciaux de shifts
  const isRemplacement = shift?.motif?.toLowerCase()?.includes('remplacement de');
  const isRemplace =
    shift?.motif?.toLowerCase()?.includes('remplacé par') ||
    shift?.motif?.toLowerCase()?.includes('remplac\uFFFD par');

  return (
    <div
      ref={drop}
      title={resumeCell(conge, shift)}
      className={`relative flex-1 h-full group/cell text-center cursor-pointer transition-all duration-200 ease-out overflow-hidden border-r border-gray-200/60 ${
        isRemplacement
          ? 'bg-fuchsia-50/60'
          : isRemplace
            ? 'bg-slate-100/60'
            : isTodayCell 
              ? 'bg-red-50/30' 
              : isWeekend(new Date(date)) 
                ? 'bg-gray-50/40' 
                : 'bg-white'
      } ${isOver && canDrop ? 'ring-2 ring-inset ring-[#cf292c] bg-red-50/50' : ''} hover:bg-slate-50/80`}
      onClick={() => onCellClick(employeId, date)}
    >
      {/* Badge double shift */}
      {shift && Array.isArray(shift.segments) && shift.segments.length > 1 && (
        <div className="absolute top-0.5 right-0.5 bg-indigo-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10 shadow-sm" title={`${shift.segments.length} créneaux`}>
          ×{shift.segments.length}
        </div>
      )}
      
      {shift && shift.type === "travail" && Array.isArray(shift.segments) && shift.segments.length > 0 ? (
        <div className="flex flex-col h-full overflow-hidden p-1">
          {/* Créneaux de travail - Design épuré avec gestion multi-shifts */}
          <div className={`flex flex-col ${shift.segments.length > 1 ? 'gap-1' : 'gap-0.5'} h-full overflow-y-auto scrollbar-thin`}>
            {shift.segments.map((s, idx) => {
              if (!s.start || !s.end) return null;
              
              // Calcul dur�e pr�vue
              const [startH, startM] = s.start.split(':').map(Number);
              const [endH, endM] = s.end.split(':').map(Number);
              let durationMin = (endH * 60 + endM) - (startH * 60 + startM);
              if (durationMin < 0) durationMin += 24 * 60;
              const durationH = (durationMin / 60).toFixed(1);
              
              // Trouver les écarts pour ce créneau
              const segmentNum = idx + 1;
              const ecartsSegment = showComparaison ? ecarts.filter(e => {
                if (e.segment !== undefined) return e.segment === segmentNum;
                return e.type && (e.type.includes('retard') || e.type.includes('hors_plage') || e.type.includes('heures_sup') || e.type.includes('arrivee') || e.type.includes('depart'));
              }) : [];
              
              // Extraire heures r�elles et minutes d'�cart
              let heureArriveeReelle = null;
              let heureDepartReelle = null;
              let dureeReelleMin = null;
              let retardMinutes = 0;
              let heuresSupMinutes = 0;
              let departAnticipeMinutes = 0;
              
              if (showComparaison && ecartsSegment.length > 0) {
                ecartsSegment.forEach(ecart => {
                  if (ecart.heureArriveeReelle) heureArriveeReelle = ecart.heureArriveeReelle;
                  if (ecart.heureDepartReelle) heureDepartReelle = ecart.heureDepartReelle;
                  
                  const type = ecart.type || '';
                  const mins = Math.abs(ecart.dureeMinutes || ecart.ecartMinutes || 0);
                  
                  if (type.includes('retard')) retardMinutes = mins;
                  if (type.includes('heures_sup') || type.includes('hors_plage_out')) heuresSupMinutes = mins;
                  if (type.includes('depart_premature') || type.includes('depart_anticipe')) departAnticipeMinutes = mins;
                });
                
                if (heureArriveeReelle && heureDepartReelle) {
                  const [arrH, arrM] = heureArriveeReelle.split(':').map(Number);
                  const [depH, depM] = heureDepartReelle.split(':').map(Number);
                  dureeReelleMin = (depH * 60 + depM) - (arrH * 60 + arrM);
                  if (dureeReelleMin < 0) dureeReelleMin += 24 * 60;
                }
              }
              
              const hasRealData = heureArriveeReelle || heureDepartReelle || dureeReelleMin;
              
              // Analyse d�taill�e du statut
              let statutSegment = 'normal';
              let isAbsent = false;
              let hasRetard = false;
              let hasHeuresSup = false;
              let hasDepartAnticipe = false;
              let retardType = null;
              
              // V�rification des anomalies uniquement pour dates pass�es ou aujourd'hui
              if (showComparaison && !isFutureDate) {
                if (ecartsSegment.length === 0 && !hasRealData) {
                  // Pas de pointage trouv� = Absence (uniquement pour dates pass�es)
                  statutSegment = 'absent';
                  isAbsent = true;
                } else if (ecartsSegment.length === 0 && hasRealData) {
                  // Pointage conforme
                  statutSegment = 'ok';
                } else if (ecartsSegment.length > 0) {
                  ecartsSegment.forEach(e => {
                    const type = e.type || '';
                    if (type.includes('retard_modere')) { hasRetard = true; retardType = 'modere'; }
                    if (type.includes('retard_critique')) { hasRetard = true; retardType = 'critique'; }
                    if (type.includes('hors_plage_in')) { hasRetard = true; retardType = retardType || 'modere'; }
                    if (type.includes('depart_premature') || type.includes('depart_anticipe')) { hasDepartAnticipe = true; }
                    if (type.includes('heures_sup') || type.includes('hors_plage_out')) { hasHeuresSup = true; }
                    if (type.includes('absence') || type.includes('absent') || type.includes('segment_non_pointe') || type.includes('missing_in') || type.includes('missing_out')) { isAbsent = true; }
                  });
                  
                  if (isAbsent) statutSegment = 'absent';
                  else if (hasRetard && hasHeuresSup) statutSegment = 'retard_et_heures_sup';
                  else if (hasRetard && hasDepartAnticipe) statutSegment = 'retard_et_depart_anticipe';
                  else if (hasRetard) statutSegment = retardType === 'critique' ? 'retard_critique' : 'retard_modere';
                  else if (hasDepartAnticipe && hasHeuresSup) statutSegment = 'depart_anticipe'; // Cas rare
                  else if (hasDepartAnticipe) statutSegment = 'depart_anticipe';
                  else if (hasHeuresSup) statutSegment = 'heures_sup';
                  else if (hasRealData) statutSegment = 'ok';
                }
              }
              
              // === CALCUL DU SOLDE (diff�rence heures pr�vues vs r�elles) ===
              let soldeMinutes = null;
              let soldeLabel = '';
              if (showComparaison && dureeReelleMin !== null && durationMin) {
                soldeMinutes = dureeReelleMin - durationMin;
                if (soldeMinutes !== 0) {
                  const sign = soldeMinutes > 0 ? '+' : '';
                  const hours = Math.floor(Math.abs(soldeMinutes) / 60);
                  const mins = Math.abs(soldeMinutes) % 60;
                  soldeLabel = hours > 0 ? `${sign}${Math.sign(soldeMinutes) * hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}` : `${sign}${soldeMinutes}min`;
                }
              }
              
              // === DESIGN DYNAMIQUE SELON STATUT - Style moderne avec badges multiples ===
              let bgClass = 'bg-gradient-to-r from-blue-500 to-blue-600';
              let borderLeftClass = 'border-l-4 border-l-blue-400';
              let textClass = 'text-white';
              let statusIcon = null;
              let statusLabel = '';
              let badgeBg = 'bg-white/20';
              let badgeText = 'text-white';
              let ringClass = '';
              
              // Badges multiples pour anomalies combin�es
              let badges = [];
              
              if (showComparaison) {
                switch (statutSegment) {
                  case 'ok':
                    bgClass = 'bg-gradient-to-r from-emerald-500 to-teal-600';
                    borderLeftClass = 'border-l-4 border-l-emerald-400';
                    statusIcon = <CheckCircle className="w-3 h-3" strokeWidth={2.5} />;
                    statusLabel = 'OK';
                    break;
                  case 'absent':
                    bgClass = 'bg-gradient-to-r from-red-500 to-rose-600';
                    borderLeftClass = 'border-l-4 border-l-red-400';
                    textClass = 'text-white';
                    statusIcon = <XCircle className="w-3 h-3" strokeWidth={2.5} />;
                    statusLabel = 'Absent';
                    ringClass = 'ring-2 ring-red-300 ring-offset-1';
                    break;
                  case 'retard_et_heures_sup':
                    // Couleur mixte orange-violet pour retard + heures sup
                    bgClass = 'bg-gradient-to-r from-orange-500 via-red-500 to-purple-500';
                    borderLeftClass = 'border-l-4 border-l-orange-400';
                    ringClass = 'ring-2 ring-orange-300 ring-offset-1';
                    badges = [
                      { icon: <AlarmClock className="w-2.5 h-2.5" />, label: `+${retardMinutes}`, color: 'bg-red-500', title: 'Retard' },
                      { icon: <Timer className="w-2.5 h-2.5" />, label: `+${heuresSupMinutes}`, color: 'bg-purple-500', title: 'Heures sup' }
                    ];
                    break;
                  case 'retard_et_depart_anticipe':
                    bgClass = 'bg-gradient-to-r from-orange-500 to-red-500';
                    borderLeftClass = 'border-l-4 border-l-orange-400';
                    ringClass = 'ring-2 ring-orange-300 ring-offset-1';
                    badges = [
                      { icon: <AlarmClock className="w-2.5 h-2.5" />, label: `+${retardMinutes}`, color: 'bg-red-500', title: 'Retard' },
                      { icon: <LogOut className="w-2.5 h-2.5" />, label: `-${departAnticipeMinutes}`, color: 'bg-orange-500', title: 'Départ anticipé' }
                    ];
                    break;
                  case 'retard_critique':
                    bgClass = 'bg-gradient-to-r from-red-500 to-orange-500';
                    borderLeftClass = 'border-l-4 border-l-red-400';
                    statusIcon = <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />;
                    statusLabel = `+${retardMinutes}min`;
                    ringClass = 'ring-2 ring-red-300 ring-offset-1';
                    break;
                  case 'retard_modere':
                    bgClass = 'bg-gradient-to-r from-amber-400 to-orange-400';
                    borderLeftClass = 'border-l-4 border-l-amber-400';
                    statusIcon = <AlarmClock className="w-3 h-3" strokeWidth={2.5} />;
                    statusLabel = `+${retardMinutes}min`;
                    ringClass = 'ring-2 ring-amber-300 ring-offset-1';
                    break;
                  case 'depart_anticipe':
                    bgClass = 'bg-gradient-to-r from-orange-400 to-red-400';
                    borderLeftClass = 'border-l-4 border-l-orange-400';
                    statusIcon = <LogOut className="w-3 h-3" strokeWidth={2.5} />;
                    statusLabel = `-${departAnticipeMinutes}min`;
                    ringClass = 'ring-2 ring-orange-300 ring-offset-1';
                    break;
                  case 'heures_sup':
                    bgClass = 'bg-gradient-to-r from-indigo-500 to-purple-500';
                    borderLeftClass = 'border-l-4 border-l-indigo-400';
                    statusIcon = <Timer className="w-3 h-3" strokeWidth={2.5} />;
                    statusLabel = `+${heuresSupMinutes}min`;
                    badgeBg = 'bg-purple-100';
                    badgeText = 'text-purple-700';
                    ringClass = 'ring-2 ring-indigo-300 ring-offset-1';
                    break;
                  default:
                    bgClass = 'bg-blue-500';
                    borderLeftClass = '';
                }
              } else {
                // Mode normal - Style Skello épuré (couleurs pleines)
                const isShiftRemplacement = shift?.motif?.toLowerCase()?.includes('remplacement de');
                const isShiftRemplace =
                  shift?.motif?.toLowerCase()?.includes('remplacé par') ||
                  shift?.motif?.toLowerCase()?.includes('remplac\uFFFD par');
                
                if (isShiftRemplacement) {
                  bgClass = 'bg-fuchsia-500';
                  statusIcon = <RefreshCw className="w-3 h-3" strokeWidth={2.5} />;
                } else if (isShiftRemplace) {
                  bgClass = 'bg-slate-400';
                  statusIcon = <UserX className="w-3 h-3" />;
                } else if (s.aValider) {
                  bgClass = 'bg-yellow-500';
                  statusIcon = <Hourglass className="w-3 h-3" />;
                } else if (s.isExtra) {
                  const isPaid = s.paymentStatus === 'payé' || s.paymentStatus === 'pay\uFFFD' || s.paymentStatus === 'paye';
                  bgClass = isPaid ? 'bg-emerald-500' : 'bg-orange-500';
                  statusIcon = isPaid ? <Check className="w-3 h-3" /> : <Star className="w-3 h-3" />;
                } else {
                  // Shift normal - bleu
                  bgClass = 'bg-blue-500';
                  statusIcon = null;
                }
                borderLeftClass = '';
              }
              
              // Style compact
              const isDoubleShift = shift.segments.length > 1;
              const segmentPadding = isDoubleShift ? 'px-2 py-1' : 'px-2 py-1.5';
              const segmentHeight = isDoubleShift ? '32px' : '36px';
              
              // Label type de shift
              const isShiftExtra = s.isExtra;
              const isExtraPaid =
                isShiftExtra && (s.paymentStatus === 'payé' || s.paymentStatus === 'pay\uFFFD' || s.paymentStatus === 'paye');
              let typeLabel = null;
              
              if (isShiftExtra && !showComparaison) {
                typeLabel = isExtraPaid ? 'Extra payé' : 'à payer';
              }
              
              return (
                <div
                  key={idx}
                  className={`relative ${bgClass} rounded-md mx-0.5 my-0.5 overflow-hidden hover:brightness-110 hover:shadow-sm transition-all duration-150 cursor-pointer text-white ${ringClass}`}
                  style={{ minHeight: showComparaison && hasRealData ? '56px' : segmentHeight }}
                  title={`${s.start} - ${s.end} (${durationH}h)${isShiftExtra ? (isExtraPaid ? ' - Extra payé' : ' - Extra à payer') : ''}${hasRealData ? `\nRéel: ${heureArriveeReelle || '--:--'} - ${heureDepartReelle || '--:--'}` : ''}${soldeLabel ? `\nSolde: ${soldeLabel}` : ''}${s.commentaire ? '\n' + s.commentaire : ''}`}
                  onClick={showComparaison && !isFutureDate && (ecartsSegment.length > 0 || isAbsent) ? (e) => {
                    e.stopPropagation();
                    if (ecartsSegment.length > 0) {
                      handleAnomalieClick(employeId, date, ecartsSegment[0]);
                    } else if (isAbsent) {
                      handleAnomalieClick(employeId, date, {
                        type: 'segment_non_pointe',
                        description: `Absence - Shift prévu ${s.start}-${s.end} non pointé`,
                        gravite: 'critique',
                        segment: segmentNum
                      });
                    }
                  } : undefined}
                >
                  {/* Badges multiples en haut pour anomalies combinées */}
                  {showComparaison && badges.length > 0 && (
                    <div className="flex gap-0.5 px-1 pt-1">
                      {badges.map((badge, bidx) => (
                        <div 
                          key={bidx}
                          className={`${badge.color} flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold text-white shadow-sm`}
                          title={badge.title}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Contenu sobre style Skello */}
                  <div className={segmentPadding}>
                    {/* Ligne principale: Horaires + durée/statut */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {statusIcon && badges.length === 0 && <span className="opacity-80">{statusIcon}</span>}
                        <span className={`font-semibold text-[11px] ${isAbsent ? 'line-through opacity-60' : ''}`}>
                          {s.start} - {s.end}
                        </span>
                      </div>
                      {/* Badge simple (pas de badges multiples) */}
                      {badges.length === 0 && (
                        <span className="text-[9px] font-medium bg-black/20 px-1.5 py-0.5 rounded">
                          {showComparaison && statusLabel ? statusLabel : `${durationH}h`}
                        </span>
                      )}
                    </div>
                    
                    {/* Ligne secondaire si extra */}
                    {typeLabel && !showComparaison && (
                      <div className="text-[8px] font-medium mt-0.5 opacity-90">
                        {typeLabel}
                      </div>
                    )}
                    
                    {/* Info remplacement */}
                    {shift?.motif?.toLowerCase()?.includes('remplacement de') && !showComparaison && (
                      <div className="text-[9px] text-white/90 mt-0.5 truncate">
                        → {shift.motif.replace(/remplacement de /i, '')}
                      </div>
                    )}
                    
                    {/* Montant extra si présent */}
                    {!showComparaison && s.isExtra && s.extraMontant && (
                      <div className="text-[10px] text-white font-bold mt-0.5">
                        {s.extraMontant}€
                      </div>
                    )}
                    
                    {/* Mode comparaison: Horaires réels + Solde */}
                    {showComparaison && hasRealData && !isAbsent && (
                      <div className="mt-1 pt-1 border-t border-white/20 text-[9px]">
                        <div className="flex items-center justify-between">
                          <span className="opacity-70">Réel: {heureArriveeReelle || '--'}-{heureDepartReelle || '--'}</span>
                          <span className="opacity-80">{dureeReelleMin ? `${(dureeReelleMin/60).toFixed(1)}h` : ''}</span>
                        </div>
                        {/* Solde (différence heures) */}
                        {soldeLabel && (
                          <div className={`flex items-center justify-end mt-0.5 font-bold ${soldeMinutes > 0 ? 'text-green-200' : 'text-red-200'}`}>
                            <span className="text-[10px]">Solde: {soldeLabel}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Mode comparaison: Absent */}
                    {showComparaison && isAbsent && (
                      <div className="text-[9px] font-bold text-white/90 mt-0.5 flex items-center gap-1">
                        <UserX className="w-3 h-3" /> Aucun pointage
                      </div>
                    )}
                  </div>
                  
                  {/* Indicateur cliquable - uniquement pour dates passées */}
                  {showComparaison && !isFutureDate && (ecartsSegment.length > 0 || isAbsent) && (
                    <div className="absolute top-1 right-1">
                      <span className="flex items-center justify-center w-4 h-4 bg-white/30 rounded-full backdrop-blur-sm">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : shift && shift.type === "absence" ? (
        (() => {
          // Déterminer le type d'absence avec icône et couleur
          const motif = (shift?.motif || '').toLowerCase();
          let absConfig = { label: shift?.motif || 'Absence', color: 'bg-rose-400', Icon: UserX };
          if (motif.includes('maladie')) absConfig = { label: 'Maladie', color: 'bg-red-400', Icon: Stethoscope };
          else if (motif.includes('congé') || motif.includes('cong\uFFFD') || motif.includes('cp')) absConfig = { label: 'Congé', color: 'bg-amber-400', Icon: Palmtree };
          else if (motif.includes('rtt')) absConfig = { label: 'RTT', color: 'bg-purple-400', Icon: Clock };
          else if (motif.includes('repos')) absConfig = { label: 'Repos', color: 'bg-gray-400', Icon: Coffee };
          else if (motif.includes('formation')) absConfig = { label: 'Formation', color: 'bg-indigo-400', Icon: GraduationCap };
          else if (motif.includes('maternité') || motif.includes('maternit\uFFFD')) absConfig = { label: 'Maternité', color: 'bg-pink-400', Icon: Heart };
          else if (motif.includes('paternité') || motif.includes('paternit\uFFFD')) absConfig = { label: 'Paternité', color: 'bg-cyan-400', Icon: Baby };
          
          const AbsIcon = absConfig.Icon;
          return (
            <div 
              className={`${absConfig.color} rounded-lg mx-1 my-1 px-2.5 py-2 hover:brightness-110 hover:shadow-md transition-all duration-150 cursor-pointer shadow-sm`}
              style={{ minHeight: '40px' }}
              title={shift.motif || 'Absence'}
            >
              <div className="flex items-center gap-2 text-white">
                <AbsIcon className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold text-[11px] truncate">{absConfig.label}</span>
              </div>
              {shift.motif && shift.motif !== absConfig.label && (
                <div className="text-[9px] text-white/80 mt-0.5 truncate">{shift.motif}</div>
              )}
            </div>
          );
        })()
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {showComparaison && !isFutureDate && ecarts.length > 0 && ecarts.some(e => ['presence_non_prevue', 'unscheduled', 'absence_planifiee_avec_pointage', 'absence_totale', 'pointage_hors_planning'].includes(e.type)) ? (
            <div className="flex flex-col gap-1 w-full px-1">
              {ecarts.filter(e => ['presence_non_prevue', 'unscheduled', 'absence_planifiee_avec_pointage', 'absence_totale', 'pointage_hors_planning'].includes(e.type)).map((ecart, idx) => {
                const f = formatEcart(ecart);
                const mins = Math.abs(ecart.dureeMinutes || 0);
                const diffPlus = ['retard','heures_supplementaires'].includes(ecart.type);
                const diffMinus = ['arrivee_anticipee','depart_anticipe'].includes(ecart.type);
                const signe = diffPlus ? '+' : diffMinus ? '-' : '';
                const minutesTxt = mins > 0 ? `${signe}${mins}m` : '';
                let text, icon, bgGradient, borderColor;
                
                switch (ecart.type) {
                  case 'retard': 
                    text = `Retard ${minutesTxt}`; 
                    icon = <AlarmClock className="w-3 h-3" strokeWidth={2.5} />;
                    bgGradient = 'from-orange-500 to-red-500';
                    borderColor = 'border-l-orange-400';
                    break;
                  case 'arrivee_anticipee': 
                    text = `Avance ${minutesTxt}`; 
                    icon = <Rocket className="w-3 h-3" strokeWidth={2.5} />;
                    bgGradient = 'from-green-500 to-emerald-600';
                    borderColor = 'border-l-green-400';
                    break;
                  case 'arrivee_a_l_heure': 
                    text = 'Arrivée OK'; 
                    icon = <CheckCircle className="w-3 h-3" strokeWidth={2.5} />;
                    bgGradient = 'from-emerald-500 to-teal-600';
                    borderColor = 'border-l-emerald-400';
                    break;
                  case 'heures_supplementaires': 
                  case 'heures_sup_auto_validees': 
                  case 'heures_sup_a_valider':
                    text = `H.sup ${minutesTxt}`; 
                    icon = <Star className="w-3 h-3" strokeWidth={2.5} />;
                    bgGradient = 'from-emerald-500 to-teal-600';
                    borderColor = 'border-l-emerald-400';
                    break;
                  case 'hors_plage_out_critique': 
                  case 'hors_plage_in':
                    text = `Hors plage ${minutesTxt}`; 
                    icon = <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />;
                    bgGradient = 'from-purple-500 to-indigo-600';
                    borderColor = 'border-l-purple-400';
                    break;
                  case 'depart_anticipe': 
                    text = `Départ tôt ${minutesTxt}`; 
                    icon = <LogOut className="w-3 h-3" strokeWidth={2.5} />;
                    bgGradient = 'from-orange-500 to-red-500';
                    borderColor = 'border-l-orange-400';
                    break;
                  case 'depart_a_l_heure': 
                    text = 'Départ OK'; 
                    icon = <CheckCircle className="w-3 h-3" strokeWidth={2.5} />;
                    bgGradient = 'from-emerald-500 to-teal-600';
                    borderColor = 'border-l-emerald-400';
                    break;
                  case 'absence_totale': 
                    text = 'Absence totale'; 
                    icon = <CircleSlash className="w-3 h-3" strokeWidth={2.5} />;
                    bgGradient = 'from-red-500 to-pink-600';
                    borderColor = 'border-l-red-400';
                    break;
                  case 'presence_non_prevue': 
                  case 'unscheduled':
                    text = 'Non planifié'; 
                    icon = <CircleAlert className="w-3 h-3" strokeWidth={2.5} />;
                    bgGradient = 'from-amber-500 to-orange-600';
                    borderColor = 'border-l-amber-500';
                    break;
                  case 'pointage_hors_planning':
                    text = 'Hors planning'; 
                    icon = <MapPin className="w-3 h-3" strokeWidth={2.5} />;
                    bgGradient = 'from-yellow-500 to-amber-500';
                    borderColor = 'border-l-yellow-400';
                    break;
                  case 'absence_planifiee_avec_pointage':
                    text = 'Absence + Pointage!'; 
                    icon = <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />;
                    bgGradient = 'from-red-500 to-rose-600';
                    borderColor = 'border-l-red-500';
                    break;
                  default: 
                    text = f.label;
                    icon = <AlertCircle className="w-3 h-3" strokeWidth={2.5} />;
                    bgGradient = 'from-[#cf292c] to-red-600';
                    borderColor = 'border-l-blue-400';
                }
                
                const needsAdminAction = ['retard_critique', 'depart_premature_critique', 'hors_plage_out_critique', 'hors_plage_in', 'presence_non_prevue', 'unscheduled', 'absence_planifiee_avec_pointage', 'absence_totale', 'pointage_hors_planning'].includes(ecart.type);
                
                // Extraire les horaires r�els du pointage non planifi�
                const horaireReel = ecart.heureArrivee && ecart.heureDepart 
                  ? `${ecart.heureArrivee?.slice(0,5) || ''} → ${ecart.heureDepart?.slice(0,5) || ''}` 
                  : ecart.heureArrivee 
                    ? `${ecart.heureArrivee?.slice(0,5)} →` 
                    : ecart.reel 
                      ? ecart.reel 
                      : null;
                
                const isNonPlanifie = ['presence_non_prevue', 'unscheduled', 'pointage_hors_planning'].includes(ecart.type);
                
                return (
                  <div
                    key={idx}
                    className={`relative bg-gradient-to-r ${bgGradient} border-l-4 ${borderColor} rounded-r px-2 py-1.5 text-white shadow-md ${
                      needsAdminAction 
                        ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-95' 
                        : 'opacity-90'
                    } transition-all overflow-hidden`}
                    title={needsAdminAction ? `${text}${horaireReel ? `\nHoraire: ${horaireReel}` : ''}\nCliquer pour ouvrir la modale de traitement` : text}
                    onClick={needsAdminAction ? (e) => {
                      e.stopPropagation();
                      handleAnomalieClick(employeId, date, ecart);
                    } : undefined}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="flex-shrink-0">{icon}</span>
                          <span className="font-bold text-[10px] truncate">{text}</span>
                        </div>
                        {needsAdminAction && (
                          <span className="text-[8px] bg-white/30 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 backdrop-blur-sm">TRAITER</span>
                        )}
                      </div>
                      {/* Afficher les horaires r�els pour les shifts non planifi�s */}
                      {isNonPlanifie && horaireReel && (
                        <div className="flex items-center gap-1 text-[9px] text-white/90 bg-white/20 rounded px-1.5 py-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span className="font-medium">{horaireReel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity duration-200">
              <span className="text-gray-400 text-xs font-medium">+ Ajouter un shift</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

  // Tableau Planning RH
// Vue mobile optimisée pour le planning
function PlanningMobileView({ employes, dates, shifts, conges, onCellClick, viewType, formatEmployeeName, getEmployeeInitials, showComparaison, getEcartsForEmployeeDate, formatEcart, getCategorieEmploye = () => ({ label: 'Général', color: 'bg-gray-100 text-gray-800', Icon: User }), employesGroupesParCategorie = [], handleAnomalieClick = () => {}, handleQuickAction = () => {} }) {
  const getCellData = (emp, dateStr) => {
    const normalizeDate = (d) => {
      // Utiliser la fonction standardis�e
      return normalizeDateLocal(d);
    };
    
    const cellDate = normalizeDate(dateStr);
    if (!cellDate) return { shift: null, conge: null };
    
    const shift = shifts.find((s) => {
      try {
        const empIdMatch = parseInt(s.employeId, 10) === parseInt(emp.id, 10);
        const shiftDate = normalizeDate(s.date);
        return empIdMatch && shiftDate === cellDate;
      } catch (e) {
        return false;
      }
    });
    
    const conge = conges.find((c) => {
      try {
        // Debug: vérifier la correspondance employé
        const empMatch = c.userId === emp.id || c.employeId === emp.id;
        if (!empMatch) return false;
        
        // Accepter tous les statuts pour voir les cong�s
        const debutConge = normalizeDate(c.dateDebut);
        const finConge = normalizeDate(c.dateFin);
        const isInPeriod = cellDate && debutConge && finConge && 
               cellDate >= debutConge && 
               cellDate <= finConge;
               
        return isInPeriod;
      } catch (e) {
        console.error("Erreur congé:", e);
        return false;
      }
    });
    
    // LOGIQUE DE PRIORITÉ SELON STATUT DU CONGÉ (même logique que PlanningRHTable):
    // - Congé approuvé/validé ? Priorité absolue, masque le shift
    // - Congé en_attente ? Affiche le shift ET le congé (avertissement)
    // - Congé refusé ? Affiche le shift avec indicateur discret
    if (conge) {
      const statutNormalise = conge.statut?.toLowerCase();
      
      if (statutNormalise === 'approuvé' || statutNormalise === 'validé' || statutNormalise === 'approuv\uFFFD' || statutNormalise === 'valid\uFFFD' || statutNormalise === 'approuve' || statutNormalise === 'valide') {
        // Congé approuvé = priorité absolue
        return { shift: null, conge };
      } else if (statutNormalise === 'en_attente' || statutNormalise === 'en attente') {
        // Congé en attente = on affiche les deux (shift + avertissement congé)
        return { shift: normalizeShift(shift), conge };
      } else if (statutNormalise === 'refuse' || statutNormalise === 'refus\uFFFD') {
        // Congé refusé = on affiche le shift + indicateur discret du refus
        return { shift: normalizeShift(shift), conge }; // Retourne le congé pour afficher l'indicateur
      }
    }
    
    return { shift: normalizeShift(shift), conge: null };
  };
  
  // Normaliser le shift pour s'assurer que segments est toujours un tableau
  const normalizeShift = (shift) => {
    if (!shift) return null;
    return {
      ...shift,
      segments: Array.isArray(shift.segments) ? shift.segments : []
    };
  };

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  };

  if (viewType === 'jour') {
    // Vue jour : Une seule date, liste des employés groupés par catégorie
    const dateStr = formatDate(dates[0]);
    return (
      <div className="space-y-4">
        <div className="text-center bg-gray-50 p-3 rounded-lg">
          <h3 className="font-semibold text-gray-800">
            {dates[0].toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </h3>
        </div>
        
        {/* Affichage group� par cat�gories avec s�parateurs */}
        {employesGroupesParCategorie.length > 0 ? employesGroupesParCategorie.map((groupe, groupeIndex) => (
          <React.Fragment key={groupe.categorie}>
            {/* S�parateur de cat�gorie - Mobile */}
            <div className="flex items-center gap-3 mb-4 mt-6">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${groupe.infosCategorie.color} font-medium text-sm shadow-sm`}>
                {groupe.infosCategorie.Icon && <groupe.infosCategorie.Icon className="w-4 h-4" />}
                <span>{groupe.categorie}</span>
                <span className="bg-white/30 text-xs px-2 py-0.5 rounded-full ml-1">
                  {groupe.employes.length}
                </span>
              </div>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-gray-300 to-transparent rounded-full"></div>
            </div>
            
            {/* Employ�s de cette cat�gorie */}
            {groupe.employes.map(emp => {
              const { shift, conge } = getCellData(emp, dateStr);
              const ecarts = showComparaison ? getEcartsForEmployeeDate(emp.id, dateStr) : [];
              
              // V�rifier si la date est dans le futur
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const cellDate = new Date(dateStr);
              cellDate.setHours(0, 0, 0, 0);
              const isFutureDate = cellDate > today;
              
              return (
                <div 
                  key={emp.id} 
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-3"
                  onClick={() => onCellClick(emp.id, dateStr)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#cf292c] text-white font-medium flex items-center justify-center text-sm">
                      {getEmployeeInitials(emp)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{formatEmployeeName(emp)}</span>
                      </div>
                      {emp.email && <div className="text-xs text-gray-500">{emp.email}</div>}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {conge ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-red-700">
                          <Palmtree className="w-4 h-4" />
                          <span className="font-medium">{conge.type}</span>
                        </div>
                        {conge.motif && <div className="text-sm text-red-600 mt-1">{conge.motif}</div>}
                      </div>
                    ) : shift ? (
                      shift.type === 'absence' ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-orange-700">
                            <Ban className="w-4 h-4" />
                            <span className="font-medium">Absent</span>
                          </div>
                          {shift.motif && <div className="text-sm text-orange-600 mt-1">{shift.motif}</div>}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Badge Remplacement enrichi si applicable */}
                          {shift.motif?.toLowerCase()?.includes('remplacement de') && (
                            <div className="bg-gradient-to-r from-fuchsia-500 to-pink-600 rounded-lg p-3 text-white shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <RefreshCw className="w-4 h-4" />
                                <span className="font-bold text-sm uppercase tracking-wide">Remplacement</span>
                              </div>
                              <div className="flex items-center gap-2 bg-white/20 rounded px-2 py-1">
                                <UserX className="w-4 h-4" />
                                <span className="font-medium text-sm">{shift.motif.replace(/remplacement de /i, '')}</span>
                              </div>
                            </div>
                          )}
                          {/* Badge Remplacé enrichi si applicable */}
                          {(shift.motif?.toLowerCase()?.includes('remplacé par') || shift.motif?.toLowerCase()?.includes('remplac\uFFFD par')) && (
                            <div className="bg-gradient-to-r from-slate-400 to-gray-500 rounded-lg p-3 text-white shadow-sm opacity-80">
                              <div className="flex items-center gap-2 mb-2">
                                <UserX className="w-4 h-4" />
                                <span className="font-bold text-sm uppercase tracking-wide">Remplacé</span>
                              </div>
                              <div className="flex items-center gap-2 bg-white/20 rounded px-2 py-1">
                                <UserPlus className="w-4 h-4" />
                                <span className="font-medium text-sm">{shift.motif.replace(/remplac(?:é|\uFFFD) par /i, 'par ')}</span>
                              </div>
                            </div>
                          )}
                          {Array.isArray(shift.segments) && shift.segments.map((segment, idx) => (
                            <div 
                              key={idx}
                              className={`rounded-lg p-3 ${
                                segment.isExtra
                                  ? (segment.paymentStatus === 'payé' || segment.paymentStatus === 'pay\uFFFD' || segment.paymentStatus === 'paye')
                                    ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-300'
                                    : 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300'
                                  : shift.motif?.toLowerCase()?.includes('remplacement de')
                                    ? 'bg-fuchsia-50 border border-fuchsia-200'
                                    : (shift.motif?.toLowerCase()?.includes('remplacé par') || shift.motif?.toLowerCase()?.includes('remplac\uFFFD par'))
                                      ? 'bg-slate-100 border border-slate-200'
                                      : segment.aValider 
                                        ? 'bg-amber-50 border border-amber-200' 
                                        : 'bg-blue-50 border border-blue-200'
                              }`}
                            >
                              <div className={`flex items-center justify-between ${
                                segment.isExtra
                                  ? (segment.paymentStatus === 'payé' || segment.paymentStatus === 'pay\uFFFD' || segment.paymentStatus === 'paye') ? 'text-emerald-700' : 'text-orange-700'
                                  : shift.motif?.toLowerCase()?.includes('remplacement de')
                                    ? 'text-fuchsia-700'
                                    : (shift.motif?.toLowerCase()?.includes('remplacé par') || shift.motif?.toLowerCase()?.includes('remplac\uFFFD par'))
                                      ? 'text-slate-600'
                                      : segment.aValider ? 'text-amber-700' : 'text-blue-700'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <span className="flex-shrink-0">
                                    {segment.isExtra 
                                      ? <Star className="w-4 h-4 text-orange-500" />
                                      : shift.motif?.toLowerCase()?.includes('remplacement de')
                                        ? <RefreshCw className="w-4 h-4 text-fuchsia-600" />
                                        : (shift.motif?.toLowerCase()?.includes('remplacé par') || shift.motif?.toLowerCase()?.includes('remplac\uFFFD par'))
                                          ? <UserX className="w-4 h-4 text-slate-500" />
                                          : segment.aValider 
                                            ? <Hourglass className="w-4 h-4" /> 
                                            : <CheckCircle className="w-4 h-4" />
                                    }
                                  </span>
                                  <span className={`font-medium ${(shift.motif?.toLowerCase()?.includes('remplacé par') || shift.motif?.toLowerCase()?.includes('remplac\uFFFD par')) ? 'line-through opacity-60' : ''}`}>
                                    {segment.start} - {segment.end}
                                  </span>
                                  {segment.isExtra && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                      segment.paymentStatus === 'payé' || segment.paymentStatus === 'pay\uFFFD' || segment.paymentStatus === 'paye'
                                        ? 'bg-emerald-200 text-emerald-800'
                                        : 'bg-orange-200 text-orange-800'
                                    }`}>
                                      EXTRA
                                    </span>
                                  )}
                                </div>
                                <span className="text-sm font-medium">
                                  {(() => {
                                    if (!segment.start || !segment.end) return '0h';
                                    const [startH, startM] = segment.start.split(':').map(Number);
                                    const [endH, endM] = segment.end.split(':').map(Number);
                                    let minutes = (endH * 60 + endM) - (startH * 60 + startM);
                                    // Gérer les shifts de nuit
                                    if (minutes < 0) minutes += 24 * 60;
                                    return `${(minutes / 60).toFixed(1)}h`;
                                  })()}
                                </span>
                              </div>
                              {segment.commentaire && (
                                <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" /> {segment.commentaire}
                                </div>
                              )}
                              {/* Détails Extra améliorés */}
                              {segment.isExtra && (
                                <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full font-semibold ${
                                      segment.paymentStatus === 'payé' || segment.paymentStatus === 'pay\uFFFD' || segment.paymentStatus === 'paye'
                                        ? 'bg-emerald-100 text-emerald-700' 
                                        : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {segment.paymentStatus === 'payé' || segment.paymentStatus === 'pay\uFFFD' || segment.paymentStatus === 'paye' ? (
                                        <>
                                          <Check className="w-3 h-3" />
                                          Payé {segment.paymentMethod && `(${segment.paymentMethod})`}
                                        </>
                                      ) : (
                                        <>
                                          <Star className="w-3 h-3" />
                                          À payer
                                        </>
                                      )}
                                    </span>
                                    {segment.extraMontant && (
                                      <span className="font-bold text-gray-700">
                                        {segment.extraMontant}€
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                        <span className="text-gray-500 text-sm">Aucun créneau défini</span>
                      </div>
                    )}
                    
                    {/* Écarts pour la comparaison - uniquement pour dates passées */}
                    {showComparaison && !isFutureDate && ecarts.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-600 mb-2">Écarts détectés :</div>
                        <div className="flex flex-wrap gap-1">
                          {ecarts.map((ecart, idx) => {
                            const formatted = formatEcart(ecart);
                            const EcartIcon = formatted.Icon;
                            return (
                              <div
                                key={idx}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${formatted.bg} ${formatted.color}`}
                              >
                                {EcartIcon && <EcartIcon className={`w-3.5 h-3.5 ${formatted.iconColor || ''}`} />}
                                <span>{formatted.label}</span>
                                {formatted.formattedTime && (
                                  <span className="font-bold">{formatted.formattedTime}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        )) : (
          // Affichage traditionnel si pas de groupes
          employes.map(emp => {
            const { shift, conge } = getCellData(emp, dateStr);
            
            return (
              <div 
                key={emp.id} 
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                onClick={() => onCellClick(emp.id, dateStr)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#cf292c] text-white font-medium flex items-center justify-center text-sm">
                    {getEmployeeInitials(emp)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{formatEmployeeName(emp)}</span>
                      
                      {/* Badge de cat�gorie employ� pour mobile */}
                      {(() => {
                        const categorie = getCategorieEmploye(emp);
                        const CatIcon = categorie.Icon;
                        return (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${categorie.color}`} title={`Catégorie: ${categorie.label}`}>
                            {CatIcon && <CatIcon className="w-3 h-3" />}
                            <span>{categorie.label}</span>
                          </span>
                        );
                      })()}
                    </div>
                    {emp.email && <div className="text-xs text-gray-500">{emp.email}</div>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {conge ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-red-700">
                        <Palmtree className="w-4 h-4" />
                        <span className="font-medium">{conge.type}</span>
                      </div>
                      {conge.motif && <div className="text-sm text-red-600 mt-1">{conge.motif}</div>}
                    </div>
                  ) : shift ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <span className="text-blue-700 text-sm">Créneau défini</span>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                      <span className="text-gray-500 text-sm">Aucun créneau défini</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // Vue semaine/mois : Grille compacte par employ�
  return (
    <div className="space-y-4">
      {employes.map(emp => {
        // Calculer les statistiques de la p�riode
        const totalHeures = dates.reduce((acc, date) => {
          const dStr = formatDate(date);
          const { shift, conge } = getCellData(emp, dStr);
          // V�rifier que segments est un tableau avant d'appeler reduce
          if (!conge && shift && shift.type === 'travail' && Array.isArray(shift.segments) && shift.segments.length > 0) {
            const heuresJour = shift.segments.reduce((sum, seg) => {
              if (!seg.start || !seg.end) return sum;
              const [startH, startM] = seg.start.split(':').map(Number);
              const [endH, endM] = seg.end.split(':').map(Number);
              let duration = (endH * 60 + endM) - (startH * 60 + startM);
              // ?? RESTAURANT : G�rer les shifts de nuit
              if (duration < 0) duration += 24 * 60;
              return sum + duration;
            }, 0) / 60;
            return acc + heuresJour;
          }
          return acc;
        }, 0);
        
        const joursPresence = dates.filter(date => {
          const dStr = formatDate(date);
          const { shift, conge } = getCellData(emp, dStr);
          return !conge && shift && shift.type === 'travail';
        }).length;
        
        return (
          <div key={emp.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            {/* En-t�te employ� */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#cf292c] text-white font-medium flex items-center justify-center text-sm">
                {getEmployeeInitials(emp)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{formatEmployeeName(emp)}</span>
                  
                  {/* Badge de cat�gorie employ� pour mobile */}
                  {(() => {
                    const categorie = getCategorieEmploye(emp);
                    const CatIcon = categorie.Icon;
                    return (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${categorie.color}`} title={`Catégorie: ${categorie.label}`}>
                        {CatIcon && <CatIcon className="w-3 h-3" />}
                        <span className="hidden sm:inline">{categorie.label}</span>
                      </span>
                    );
                  })()}
                </div>
                <div className="flex gap-2 mt-1">
                  {totalHeures > 0 && (
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                      {totalHeures.toFixed(1)}h
                    </span>
                  )}
                  {joursPresence > 0 && (
                    <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                      {joursPresence}j
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Grille des jours */}
            <div className="grid grid-cols-7 gap-1">
              {dates.map((date, idx) => {
                const dStr = formatDate(date);
                const { shift, conge } = getCellData(emp, dStr);
                const isToday = new Date().toDateString() === date.toDateString();
                const isWeekend = [0, 6].includes(date.getDay());
                
                return (
                  <div
                    key={idx}
                    onClick={() => onCellClick(emp.id, dStr)}
                    className={`
                      aspect-square rounded-md border text-center text-xs font-medium cursor-pointer transition-all
                      ${isToday ? 'ring-2 ring-[#cf292c] ring-offset-1' : ''}
                      ${isWeekend ? 'bg-gray-50' : 'bg-white'}
                      ${conge 
                        ? 'bg-red-100 text-red-700 border-red-200' 
                        : !shift 
                          ? 'border-gray-200 text-gray-400 hover:bg-gray-50' 
                          : shift.type === 'absence'
                            ? 'bg-orange-100 text-orange-700 border-orange-200'
                            : Array.isArray(shift.segments) && shift.segments.some(s => s.aValider)
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-blue-100 text-blue-700 border-blue-200'
                      }
                    `}
                  >
                    <div className="p-1 h-full flex flex-col justify-between">
                      <div className="text-[10px] leading-none">
                        {date.getDate()}
                      </div>
                      <div className="text-center flex items-center justify-center">
                        {conge ? (
                          <Palmtree className="w-3 h-3 text-red-500" />
                        ) : !shift ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-auto block"></span>
                        ) : shift.type === 'absence' ? (
                          <Ban className="w-3 h-3 text-orange-500" />
                        ) : Array.isArray(shift.segments) && shift.segments.some(s => s.aValider) ? (
                          <Hourglass className="w-3 h-3 text-amber-500" />
                        ) : (
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlanningRHTable({ 
  employes, 
  dates, 
  shifts, 
  conges, 
  setShifts, 
  onCellClick, 
  viewType, 
  formatEmployeeName, 
  getEmployeeInitials,
  showComparaison = false,
  getEcartsForEmployeeDate = () => [],
  formatEcart = () => ({}),
  forceReadable = false,
  skelloMode = false,
  expandedEmployees = new Set(),
  onToggleExpand = () => {},
  onOpenRapport = () => {},
  getCategorieEmploye = () => ({ label: 'Général', color: 'bg-gray-100 text-gray-800', Icon: User }),
  employesGroupesParCategorie = [],
  handleAnomalieClick = () => {},
  handleQuickAction = () => {},
  showToast = () => {},
  isFiltered = false,
  filterLabel = null,
  totalEmployes = 0,
  onResetFilter = () => {}
}) {
  // Les fonctions de formatage sont maintenant pass�es par les props du composant principal
  const globalDense = false; // Mode compact d�sactiv� - affichage unique optimis�

  // Taille cellules adapt�e - Vue mois optimis�e pour voir tous les jours
  // Mode comparaison: augmenter la hauteur pour afficher correctement tous les shifts
  // Hauteur augment�e pour permettre les doubles shifts
  const baseCellSizeClass = viewType === "mois" 
    ? "h-8" 
    : viewType === "jour" 
      ? "h-24 min-w-[180px] sm:h-32 sm:min-w-[220px]" 
      : showComparaison 
        ? "h-32 min-w-[130px] sm:h-36 sm:min-w-[150px]" 
        : "h-28 min-w-[115px] sm:h-28 sm:min-w-[130px]";
  const cellSizeClassBase = globalDense && viewType === 'semaine' ? 'h-12 min-w-[80px] sm:h-12 sm:min-w-[95px]' : baseCellSizeClass;
  
  // Largeur de cellule pour la vue mois - calcul�e pour garantir que TOUS les jours soient visibles
  // Utilise la largeur disponible de l'�cran moins la colonne employ�s (208px) et une marge adapt�e � la taille d'�cran
  const screenWidth = window.innerWidth;
  const isMobile = screenWidth < 768;
  const availableWidth = screenWidth - 208 - (isMobile ? 20 : 50);
  const monthCellWidth = viewType === "mois" ? Math.max(isMobile ? 20 : 24, Math.floor(availableWidth / dates.length)) : 28;
  
  // Donn�es par cellule
  const getCellData = (emp, dStr) => {
    // Fonction utilitaire pour normaliser une date en YYYY-MM-DD
    const normalizeDate = (dateValue) => {
      if (!dateValue) return null;
      
      try {
        // Si c'est une cha�ne, extraire les 10 premiers caract�res (YYYY-MM-DD)
        if (typeof dateValue === 'string') {
          return dateValue.slice(0, 10);
        }
        
        // Si c'est une instance de Date
        if (dateValue instanceof Date) {
          return normalizeDateLocal(dateValue);
        }
        
        // Pour les autres cas, essayer avec normalizeDateLocal
        return normalizeDateLocal(dateValue);
      } catch (error) {
        console.error("Erreur de normalisation de date:", error);
      }
      
      return null;
    };
    
    // Extraction de la date au format YYYY-MM-DD pour la comparaison
    const cellDate = normalizeDate(dStr);
    if (!cellDate) return { shift: null, conge: null };
    
    // Recherche d'un shift correspondant - on teste toutes les combinaisons possibles
    const shift = shifts.find((s) => {
      try {
        // Pour une meilleure pr�cision, convertissons les IDs en nombres
        const empIdMatch = parseInt(s.employeId, 10) === parseInt(emp.id, 10);
        
        // Si l'employ� ne correspond pas, pas besoin d'aller plus loin
        if (!empIdMatch) return false;
        
        const shiftDate = normalizeDate(s.date);
        const dateMatch = shiftDate === cellDate;
        
        // Log uniquement si l'employ� correspond (pour r�duire le bruit)
        if (empIdMatch) {
          console.log(`Test shift: emp ${s.employeId}=${emp.id}, date ${shiftDate}=${cellDate} -> ${dateMatch}`);
        }
        
        // Les deux doivent correspondre
        return empIdMatch && dateMatch;
      } catch (e) {
        console.error("Erreur dans la comparaison des shifts:", e);
        return false;
      }
    });
    
    // Recherche d'un cong� correspondant avec la m�me fonction de normalisation
    const conge = conges.find((c) => {
      try {
        // Tester userId ET employeId pour compatibilit�
        const empMatch = c.userId === emp.id || c.employeId === emp.id;
        if (!empMatch) return false;
        
        // Debug cong� trouv�
        if (empMatch) {
          console.log(`Cong� desktop trouv� pour ${emp.prenom} ${emp.nom}:`, c);
        }
        
        // Normalisation des dates de d�but et de fin de cong�
        const debutConge = normalizeDate(c.dateDebut);
        const finConge = normalizeDate(c.dateFin);
        
        // V�rifier si la date de la cellule est comprise entre le d�but et la fin du cong�
        const isInPeriod = cellDate && debutConge && finConge && 
               cellDate >= debutConge && 
               cellDate <= finConge;
               
        if (empMatch && isInPeriod) {
          console.log(`? Cong� desktop match: ${emp.prenom} le ${cellDate}, statut: ${c.statut}`);
        }
        
        return isInPeriod;
      } catch (e) {
        console.error("Erreur dans la comparaison des cong�s:", e);
        return false;
      }
    });
    
    // Normaliser le shift pour s'assurer que segments est toujours un tableau
    const normalizeShift = (s) => {
      if (!s) return null;
      return {
        ...s,
        segments: Array.isArray(s.segments) ? s.segments : []
      };
    };
    
    // LOGIQUE DE PRIORITÉ SELON STATUT DU CONGÉ:
    // - Congé approuvé/validé ? Priorité absolue, masque le shift
    // - Congé en_attente ? Affiche le shift ET le congé (avertissement)
    // - Congé refusé ? Affiche le shift avec indicateur discret
    if (conge) {
      const statutNormalise = conge.statut?.toLowerCase();
      
      if (statutNormalise === 'approuvé' || statutNormalise === 'validé' || statutNormalise === 'approuv\uFFFD' || statutNormalise === 'valid\uFFFD' || statutNormalise === 'approuve' || statutNormalise === 'valide') {
        // Congé approuvé = priorité absolue
        if (shift) {
          console.log(`?? CONGÉ APPROUVÉ: Masque le shift pour ${emp.prenom} le ${cellDate}`);
        }
        return { shift: null, conge };
      } else if (statutNormalise === 'en_attente' || statutNormalise === 'en attente') {
        // Congé en attente = on affiche les deux (shift + avertissement congé)
        console.log(`?? CONGÉ EN ATTENTE: Shift visible avec avertissement pour ${emp.prenom} le ${cellDate}`);
        return { shift: normalizeShift(shift), conge }; // Retourne les deux pour afficher l'avertissement
      } else if (statutNormalise === 'refuse' || statutNormalise === 'refus\uFFFD') {
        // Congé refusé = on affiche le shift + indicateur discret du refus
        console.log(`? CONGÉ REFUSÉ: Shift visible avec indicateur pour ${emp.prenom} le ${cellDate}`);
        return { shift: normalizeShift(shift), conge }; // Retourne le cong� pour afficher l'indicateur
      }
    }
    
    // Pas de cong�, on retourne le shift s'il existe
    return { shift: normalizeShift(shift), conge: null };
  };  const renderHeaderCell = (date, index) => {
    if (viewType === "mois") {
      const referenceMonth = dates[Math.min(15, dates.length - 1)].getMonth();
      const isCurrentMonth = date.getMonth() === referenceMonth;
      const weekend = isWeekend(date);
      const today = isToday(date);
      const jourCourt = ['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getDay()];
      
      return (
        <div key={index} className={`flex-1 min-w-0 text-center border-r border-gray-200/80 flex flex-col items-center justify-center py-1.5 ${
          weekend ? 'bg-gray-100/70' : 'bg-white'
        } ${today ? 'bg-red-50/50' : ''}`}>
          {/* Jour de la semaine - lettre unique */}
          <span className={`text-[9px] font-medium uppercase ${
            today ? 'text-[#cf292c]' : weekend ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {jourCourt}
          </span>
          {/* Num�ro du jour */}
          <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
            today ? 'bg-[#cf292c] text-white' : ''
          }`}>
            <span className={`text-[10px] font-bold ${
              today 
                ? "text-white" 
                : isCurrentMonth 
                  ? (weekend ? 'text-gray-400' : 'text-gray-700') 
                  : "text-gray-300"
            }`}>
              {date.getDate()}
            </span>
          </div>
        </div>
      );
    }
    const weekend = isWeekend(date);
    const today = isToday(date);
    return (
      <div key={index} className={`relative flex-1 min-w-[110px] px-3 py-2.5 text-center border-r border-gray-200/60 flex flex-col items-center justify-center ${
        today 
          ? 'bg-red-50/20' 
          : weekend 
            ? 'bg-gray-50/80' 
            : 'bg-white'
      }`}>
        {/* Indicateur jour actuel - ligne fine en haut */}
        {today && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#cf292c]" />
        )}
        <span className={`text-[11px] font-medium mb-1 ${
          today ? 'text-[#cf292c]' : weekend ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {viewType === "jour" ? date.toLocaleDateString("fr-FR", { weekday: "short" }) : joursSemaine[index]}
        </span>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
          today 
            ? "bg-[#cf292c] text-white shadow-sm" 
            : ""
        }`}>
          <span className={`text-sm font-semibold ${
            today ? "text-white" : weekend ? 'text-gray-400' : "text-gray-800"
          }`}>
            {date.getDate()}
          </span>
        </div>
      </div>
    );
  };

  // Fonction utilitaire pour v�rifier si un segment est valide
  const isValidSegment = (segment) => {
    if (!segment) return false;
    if (!segment.start || !segment.end) return false;
    
    // V�rifier le format des heures (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(segment.start) || !timeRegex.test(segment.end)) return false;
    
    // V�rifier que l'heure de d�but est avant l'heure de fin
    if (segment.start >= segment.end) return false;
    
    return true;
  };

  // Fonction pour v�rifier les chevauchements d'horaires
  const checkOverlap = (segment1, segment2) => {
    if (!segment1 || !segment2) return false;
    
    // Convertir les heures en minutes pour faciliter la comparaison
    const timeToMinutes = (time) => {
      if (!time) return 0;
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const start1 = timeToMinutes(segment1.start);
    const end1 = timeToMinutes(segment1.end);
    const start2 = timeToMinutes(segment2.start);
    const end2 = timeToMinutes(segment2.end);
    
    // V�rifier s'il y a chevauchement
    return !(end1 <= start2 || end2 <= start1);
  };

  // Fonction pour valider un d�placement avant de l'effectuer
  const validateMove = (segmentToMove, targetEmployeId, targetDate) => {
    const norm = (d) => d.slice(0,10);
    const targetDateKey = norm(targetDate);
    
    // Vérifier s'il y a un congé approuvé pour cet employé à cette date
    const congeConflict = conges.find(c => 
      c.employeId === targetEmployeId && 
      (c.statut === 'approuvé' || c.statut === 'approuv\uFFFD' || c.statut === 'approuve') &&
      targetDateKey >= c.dateDebut.slice(0,10) && 
      targetDateKey <= c.dateFin.slice(0,10)
    );
    
    if (congeConflict) {
      return {
        valid: false,
        reason: `Un congé approuvé (${congeConflict.type}) est prévu pour cette date`
      };
    }
    
    // Trouver le shift de destination existant
    const targetShift = shifts.find(s => 
      s.employeId === targetEmployeId && 
      norm(s.date) === targetDateKey && 
      s.type === 'travail'
    );
    
    if (!targetShift || !targetShift.segments) {
      return { valid: true }; // Pas de shift existant, pas de conflit
    }
    
    // Vérifier les chevauchements avec tous les segments existants
    for (let i = 0; i < targetShift.segments.length; i++) {
      const existingSegment = targetShift.segments[i];
      if (checkOverlap(segmentToMove, existingSegment)) {
        return {
          valid: false,
          reason: `Chevauchement détecté avec le créneau ${existingSegment.start}-${existingSegment.end}`
        };
      }
    }
    
    return { valid: true };
  };

  const moveSegment = async (item, newEmployeId, newDate) => {
    const token = localStorage.getItem('token');
    const authHeaders = token ? { headers:{ Authorization:`Bearer ${token}` }} : {};
    const norm = (d) => d.slice(0,10); // sécurité clé date
    const { fromEmployeId, fromDate, fromIndex, segment } = item;
    
    // Vérifier que le segment à déplacer est valide
    if (!isValidSegment(segment)) {
      window.showNotificationGlobal?.("Impossible de déplacer ce créneau : Le segment est incomplet ou contient des horaires invalides.", "error", 5000);
      return;
    }

    // Valider le déplacement pour éviter les chevauchements
    const validation = validateMove(segment, newEmployeId, newDate);
    if (!validation.valid) {
      window.showNotificationGlobal?.(`Déplacement impossible : ${validation.reason}. Veuillez choisir un autre créneau horaire.`, "error", 6000);
      return;
    }
    
    const srcDateKey = norm(fromDate);
    const dstDateKey = norm(newDate);
    
    // Si c'est un déplacement vers la même cellule, on ignore
    if (fromEmployeId === newEmployeId && srcDateKey === dstDateKey) {
      console.log("Segment déplacé à la même position, opération ignorée");
      return;
    }

    // 1. Snapshot actuel pour rollback possible
    let previousShifts;
    setShifts(curr => { previousShifts = curr; return curr; });

    // 2. Optimistic update locale (retirer du source, ajouter au dest)
    let draftTarget = null;
    let sourceShiftBefore = null;
    let sourceRemainingSegments = null;
    let sourceWasDeleted = false;
    setShifts(curr => {
      const updated = [];
      let movedSegment = { ...segment }; // clone pour éviter mutation partagée
      // removedFromSource supprim� (plus utilis�)
      for (const s of curr) {
        const isSource = s.employeId === fromEmployeId && norm(s.date) === srcDateKey && s.type==='travail';
        if (isSource) {
          sourceShiftBefore = s;
          const newSegs = s.segments.filter((_,i)=> i!==fromIndex);
          if (newSegs.length>0) {
            sourceRemainingSegments = newSegs;
            updated.push({...s, segments:newSegs});
          } else {
            sourceWasDeleted = true; // shift source entièrement vidé
          }
           continue;
        }
        updated.push(s);
      }
      // Destination
      const existingDest = updated.find(s=> s.employeId===newEmployeId && norm(s.date)===dstDateKey && s.type==='travail');
      if (existingDest) {
        existingDest.segments = [...existingDest.segments, movedSegment];
        draftTarget = existingDest;
      } else {
        draftTarget = { __temp:true, employeId:newEmployeId, date:dstDateKey, type:'travail', segments:[movedSegment] };
        updated.push(draftTarget);
      }
      return updated;
    });

    // 3. Persistance: mettre à jour destination + éventuellement source vide déjà supprimée
    try {
      if (!token) return; // offline mode si besoin
      // On n'utilise plus d'ID pour les segments, on utilise juste les index
      
      // 3a. Persister le shift source (update ou delete)
      if (sourceShiftBefore && sourceShiftBefore.id) {
        if (sourceWasDeleted) {
          await axios.delete(buildApiUrl(`/shifts/${sourceShiftBefore.id}`), authHeaders);
        } else if (sourceRemainingSegments) {
          try {
            // Plus besoin d'ensureSegmentId
            await axios.put(buildApiUrl(`/shifts/${sourceShiftBefore.id}`), {
              ...sourceShiftBefore,
              segments: sourceRemainingSegments,
              date: sourceShiftBefore.date,
              version: sourceShiftBefore.version || 0
            }, authHeaders);
          } catch (err) {
            if (err.response?.status === 409) {
              // Conflit version: rafraîchir le shift source
              const res = await axios.get(buildApiUrl(`/shifts/${sourceShiftBefore.id}`), authHeaders);
              console.log("Conflit version shift source, rafraîchi:", res.data);
              throw new Error("Conflit version source shift, relancer l'action"); 
            }
            throw err;
          }
        }
      }
      if (draftTarget.id) {
        try {
          // Récupérer la dernière version du shift avant de le mettre à jour pour éviter les conflits
          let latestTargetShift = draftTarget;
          try {
            const getRes = await axios.get(buildApiUrl(`/shifts/${draftTarget.id}`), authHeaders);
            latestTargetShift = {
              ...getRes.data,
              segments: draftTarget.segments // On garde nos segments � jour
            };
            console.log("Récupération version shift pour update:", latestTargetShift.version);
          } catch (getErr) {
            console.warn("Impossible de récupérer la version du shift, utilisation version locale");
          }
          
          // Mettre � jour avec la derni�re version connue
          const res = await axios.put(buildApiUrl(`/shifts/${draftTarget.id}`), {
            ...latestTargetShift,
            segments: draftTarget.segments,
            date: draftTarget.date,
            version: latestTargetShift.version || 0
          }, authHeaders);
          setShifts(prev => prev.map(s => s===draftTarget ? res.data : s));
        } catch (err) {
          if (err.response?.status === 409) {
            // Conflit version: essayer de rafraîchir le shift cible
            try {
              const res = await axios.get(buildApiUrl(`/shifts/${draftTarget.id}`), authHeaders);
              console.log("Conflit version shift destination, rafraîchi:", res.data);
              
              // Mettre à jour la référence locale avec les données serveur
              draftTarget = res.data;
              setShifts(prev => prev.map(s => s.id === draftTarget.id ? draftTarget : s));
              
              // Message plus informatif
              showToast("Un autre utilisateur a modifié ce planning. Données rafraîchies.", "warning", 4000);
              return; // Sortir de la fonction sans erreur
            } catch (fetchErr) {
              console.warn("Shift non trouvable après conflit:", fetchErr);
              
              // Si le shift n'existe plus (404), on le supprime localement
              if (fetchErr.response?.status === 404) {
                setShifts(prev => prev.filter(s => s.id !== draftTarget.id));
                showToast("Le shift semble avoir été supprimé par ailleurs. L'affichage a été mis à jour.", "warning", 4000);
                return; // Sortir de la fonction sans erreur
              }
            }
          }
          throw err; // Re-throw autres erreurs
        }
      } else {
        // Plus besoin d'assurer des IDs pour les segments
        const res = await axios.post(buildApiUrl('/shifts'), {
          employeId: draftTarget.employeId,
          date: draftTarget.date,
          type:'travail',
          segments: draftTarget.segments || [],
          version: 0
        }, authHeaders);
        setShifts(prev => prev.map(s => (s===draftTarget || (s.__temp && s.employeId===draftTarget.employeId && norm(s.date)===dstDateKey)) ? res.data : s));
        draftTarget = res.data; // maj référence
      }
    } catch (e) {
      console.error('Erreur persistance déplacement segment:', e.response?.data || e.message);
      
      // Gestion personnalis�e selon le type d'erreur
      if (e.response?.status === 404) {
        // Shift non trouvé: données obsolètes, conflit de concurrence
        window.showNotificationGlobal?.("Conflit détecté : Les données de planning ont été modifiées par un autre utilisateur. Le planning a été automatiquement actualisé.", "warning", 5000);
        
        // Recharger directement
        try {
          const currentToken = localStorage.getItem("token");
          const shiftsRes = await axios.get(buildApiUrl('/shifts'), {
            headers: { Authorization: `Bearer ${currentToken}` },
          });
          setShifts(shiftsRes.data);
          return; // Ne pas faire de rollback car on a déjà rechargé les données
        } catch (refreshErr) {
          console.error("Échec du rafraîchissement des données:", refreshErr);
        }
      } else if (e.response?.status === 409) {
        // Conflit de chevauchement ou contrainte
        window.showNotificationGlobal?.("Déplacement impossible : Il y a un chevauchement avec un autre créneau ou une contrainte empêche cette action.", "error", 6000);
      } else if (e.response?.status === 400) {
        // Erreur de validation
        window.showNotificationGlobal?.("Déplacement refusé : Les données ne respectent pas les contraintes (horaires invalides, chevauchement, etc.)", "error", 6000);
      } else {
        // Autres erreurs (r�seau, serveur, etc.)
        window.showNotificationGlobal?.(`Erreur lors du déplacement : ${e.response?.data?.error || e.message || "Problème de connexion au serveur"}`, "error", 5000);
      }
      
      // Rollback aux donn�es pr�c�dentes
      if (previousShifts) setShifts(previousShifts);
    }
  };

  // Ancienne variable cellSizeClass remplac�e par baseCellSizeClass + adaptation denseMode

  // Refs pour synchroniser le scroll entre les deux colonnes
  const employeesScrollRef = React.useRef(null);
  const gridScrollRef = React.useRef(null);
  const headerScrollRef = React.useRef(null);

  // Synchronisation du scroll - la grille contr�le le scroll vertical des employ�s et horizontal de l'en-t�te
  const handleGridScroll = (e) => {
    if (employeesScrollRef.current) {
      employeesScrollRef.current.scrollTop = e.target.scrollTop;
    }
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden min-w-0">
      {/* EN-TÊTES FIXES (Employés + Dates) - Ne scrollent pas */}
      <div className="flex flex-shrink-0 border-b border-gray-200">
        {/* En-tête colonne Employés */}
        <div className={`w-52 sm:w-52 flex-shrink-0 border-r border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 px-3 flex items-center shadow-sm ${viewType === "mois" ? 'py-2 h-10' : 'py-3 h-12'}`}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className={`font-bold text-gray-700 ${viewType === "mois" ? 'text-[11px]' : 'text-xs'}`}>Employés</span>
          </div>
        </div>
        
        {/* En-tête des dates */}
        <div 
          ref={headerScrollRef}
          className={`flex-1 bg-gradient-to-r from-gray-50 to-gray-100 overflow-hidden shadow-sm ${viewType === "mois" ? 'h-10' : 'h-12'}`}
        >
          <div className={`flex h-full ${viewType === "mois" ? 'flex-nowrap w-full' : 'flex-nowrap'}`} style={{ width: viewType === "mois" ? '100%' : 'auto' }}>
            {dates.map((d, i) => renderHeaderCell(d, i))}
          </div>
        </div>
      </div>
      
      {/* CONTENU SCROLLABLE (Liste employ�s + Grille) - PREND TOUTE LA HAUTEUR RESTANTE */}
      <div className="flex flex-1 overflow-hidden">
        {/* COLONNE GAUCHE: Liste des employ�s + remplissage */}
        <div className="w-52 sm:w-52 flex-shrink-0 flex flex-col h-full">
          {/* Liste scrollable des employ�s - synchronis�e avec la grille */}
          <div 
            ref={employeesScrollRef}
            className="overflow-y-hidden overflow-x-hidden"
          >
          {employesGroupesParCategorie.map((groupe, groupeIndex) => (
            <React.Fragment key={groupe.categorie}>
              {/* S�parateur de cat�gorie */}
              <div className="bg-gray-50 border-b border-r border-gray-200 px-3 py-2" style={{ height: '36px' }}>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-[#cf292c] rounded-full" />
                  <span className="text-[11px] font-bold text-gray-800">{groupe.categorie}</span>
                  <span className="text-[10px] text-gray-500 font-medium">({groupe.employes.length})</span>
                </div>
              </div>
              
              {/* Employ�s de cette cat�gorie */}
              {groupe.employes.map((emp, empIndex) => {
                const rowDense = globalDense && !expandedEmployees.has(emp.id);
                const cellSizeClass = rowDense ? cellSizeClassBase : baseCellSizeClass;
                const isLastInGroup = empIndex === groupe.employes.length - 1;
                const isLastGroup = groupeIndex === employesGroupesParCategorie.length - 1;
                const isLastEmployee = isLastInGroup && isLastGroup;
                
                // Calculer l'index global pour l'alternance zebra
                const globalEmpIndex = employesGroupesParCategorie
                  .slice(0, groupeIndex)
                  .reduce((acc, g) => acc + g.employes.length, 0) + empIndex;
                const isEvenRow = globalEmpIndex % 2 === 0;
                
                // Hauteur FIXE pour alignement parfait (pas de minHeight)
                // Vue mois style Skello : hauteur augment�e pour les blocs horaires
                const rowHeight = viewType === "mois" 
                  ? "44px"  // Synchro avec les cellules pour blocs horaires
                  : viewType === "jour" 
                    ? "112px" 
                    : showComparaison 
                      ? "112px" // h-28 = 112px pour aligner parfaitement avec les cellules
                      : rowDense ? "56px" : "96px";
                
                // Calculer heures totales pour vue mois (style Skello)
                const totalHeuresMois = viewType === "mois" ? dates.reduce((acc, date) => {
                  const dStr = formatDate(date);
                  const { shift, conge } = getCellData(emp, dStr);
                  // V�rifier que segments est un tableau avant d'appeler reduce
                  if (!conge && shift && shift.type === 'travail' && Array.isArray(shift.segments) && shift.segments.length > 0) {
                    const heuresJour = shift.segments.reduce((sum, seg) => {
                      if (!seg.start || !seg.end) return sum;
                      const [startH, startM] = seg.start.split(':').map(Number);
                      const [endH, endM] = seg.end.split(':').map(Number);
                      let duration = (endH * 60 + endM) - (startH * 60 + startM);
                      if (duration < 0) duration += 24 * 60;
                      return sum + duration;
                    }, 0) / 60;
                    return acc + heuresJour;
                  }
                  return acc;
                }, 0) : 0;
                
                return (
                  <div 
                    key={emp.id} 
                    className={`relative border-r border-b border-gray-200/80 hover:bg-red-50/30 transition-all group ${isEvenRow ? 'bg-gray-50/30' : 'bg-white'}`}
                    style={{ height: rowHeight }}
                  >
                    {/* Barre lat�rale au hover */}
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#cf292c] opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className={`flex items-center h-full px-2 gap-2 ${viewType === "mois" ? '' : 'pt-2 items-start'}`}>
                      {/* Avatar avec initiales */}
                      <div className={`${viewType === "mois" ? 'w-7 h-7 text-[10px]' : (rowDense ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-[11px]')} rounded-full bg-[#cf292c] text-white font-bold flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        {getEmployeeInitials(emp)}
                      </div>
                      
                      {/* Nom et heures totales */}
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className={`${viewType === "mois" ? 'text-[11px]' : 'text-[12px]'} font-medium text-gray-800 truncate`}>
                            {formatEmployeeName(emp)}
                          </div>
                        </div>
                        {viewType === "mois" && (
                          <div className={`text-[11px] font-bold ${totalHeuresMois > 0 ? 'text-[#cf292c]' : 'text-gray-300'}`}>
                            {totalHeuresMois > 0 ? `${Math.round(totalHeuresMois)}h` : '-'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

        {/* PARTIE DROITE: Grille des cellules - scroll synchronis� */}
        <div 
          ref={gridScrollRef}
          onScroll={handleGridScroll}
          className={`flex-1 flex flex-col h-full ${viewType === "mois" ? "overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden" : "overflow-y-auto overflow-x-auto [&::-webkit-scrollbar]:hidden"}`}
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none' 
          }}
        >
          <div>
          {employesGroupesParCategorie.map((groupe, groupeIndex) => (
            <React.Fragment key={groupe.categorie}>
              {/* S�parateur de cat�gorie - align� avec la colonne gauche */}
              <div className={`bg-gradient-to-r from-gray-100 to-gray-50 border-t border-b border-gray-200 shadow-sm flex ${viewType === "mois" ? 'w-full' : 'flex-nowrap'}`} style={{ minHeight: '36px', width: viewType === "mois" ? '100%' : 'auto' }}>
                {dates.map((_, idx) => (
                  <div key={idx} className={`${viewType === "mois" ? 'flex-1 min-w-0' : 'flex-shrink-0'} h-full border-r border-gray-200`} style={{ width: viewType === "mois" ? 'auto' : '28px' }} />
                ))}
              </div>
              
              {/* Lignes de cellules pour chaque employ� */}
              {groupe.employes.map((emp, empIndex) => {
                const rowDense = globalDense && !expandedEmployees.has(emp.id);
                const cellSizeClass = rowDense ? cellSizeClassBase : baseCellSizeClass;
                const isLastInGroup = empIndex === groupe.employes.length - 1;
                const isLastGroup = groupeIndex === employesGroupesParCategorie.length - 1;
                const isLastEmployee = isLastInGroup && isLastGroup;
                
                // Calculer l'index global pour l'alternance zebra (synchronis� avec colonne employ�s)
                const globalEmpIndex = employesGroupesParCategorie
                  .slice(0, groupeIndex)
                  .reduce((acc, g) => acc + g.employes.length, 0) + empIndex;
                const isEvenRow = globalEmpIndex % 2 === 0;
                
                // Hauteur FIXE identique � la colonne employ�s - CRITIQUE pour alignement
                // Vue mois style Skello : hauteur augment�e pour les blocs horaires
                const rowHeight = viewType === "mois" 
                  ? "44px"  // Plus haut pour afficher les horaires dans les blocs
                  : viewType === "jour" 
                    ? "112px" 
                    : showComparaison 
                      ? "112px" // h-28 = 112px pour aligner parfaitement
                      : rowDense ? "56px" : "96px";
                
                return (
                  <div 
                    key={emp.id}
                    className={`flex items-stretch ${isLastEmployee ? '' : 'border-b border-gray-200'} hover:bg-red-50/30 transition-colors group ${viewType === "mois" ? 'w-full' : 'flex-nowrap'} ${isEvenRow ? 'bg-gray-50/40' : 'bg-white'}`}
                    style={{ 
                      height: rowHeight,
                      width: viewType === "mois" ? '100%' : 'auto'
                    }}
                  >
                    {dates.map((date, i) => {
                      const dStr = formatDate(date);
                      const { shift, conge } = getCellData(emp, dStr);
                      
                      if (viewType === "mois") {
                        const referenceMonth = dates[Math.min(15, dates.length - 1)].getMonth();
                        const isCurrentMonth = date.getMonth() === referenceMonth;
                        const weekend = isWeekend(date);
                        const today = isToday(date);
                        const hasSegments = shift && shift.type === 'travail' && Array.isArray(shift.segments) && shift.segments.length > 0;
                        const hasPending = hasSegments && shift.segments.some(s => s.aValider);
                        const hasExtra = hasSegments && shift.segments.some(s => s.isExtra);
                        
                        // Palette moderne harmonis�e avec l'app - Style professionnel
                        const modernColors = [
                          { bg: 'bg-gradient-to-br from-blue-500 to-blue-600', border: 'border-l-2 border-l-blue-400' },
                          { bg: 'bg-gradient-to-br from-violet-500 to-purple-600', border: 'border-l-2 border-l-violet-400' },
                          { bg: 'bg-gradient-to-br from-pink-500 to-rose-600', border: 'border-l-2 border-l-pink-400' },
                          { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', border: 'border-l-2 border-l-emerald-400' },
                          { bg: 'bg-gradient-to-br from-orange-500 to-amber-600', border: 'border-l-2 border-l-orange-400' },
                          { bg: 'bg-gradient-to-br from-cyan-500 to-sky-600', border: 'border-l-2 border-l-cyan-400' },
                          { bg: 'bg-gradient-to-br from-rose-500 to-red-600', border: 'border-l-2 border-l-rose-400' },
                          { bg: 'bg-gradient-to-br from-teal-500 to-green-600', border: 'border-l-2 border-l-teal-400' },
                          { bg: 'bg-gradient-to-br from-indigo-500 to-blue-600', border: 'border-l-2 border-l-indigo-400' },
                          { bg: 'bg-gradient-to-br from-amber-500 to-yellow-600', border: 'border-l-2 border-l-amber-400' },
                        ];
                        
                        // Couleur attribu�e par employ�
                        const empColorConfig = modernColors[globalEmpIndex % modernColors.length];
                        
                        // Fond de cellule
                        let cellBg = isEvenRow ? 'bg-gray-50/30' : 'bg-white';
                        if (!isCurrentMonth) cellBg = 'bg-gray-100/50';
                        else if (weekend) cellBg = 'bg-gray-100/70';
                        
                        // Contenu de la cellule
                        let cellContent = null;
                        
                        if (conge) {
                          // Cong� - bloc avec ic�ne et style moderne
                          const congeType = conge.type?.toLowerCase() || 'congé';
                          const congeLabel = congeType === 'cp' ? 'CP' : congeType === 'rtt' ? 'RTT' : congeType === 'maladie' ? 'MAL' : 'ABS';
                          cellContent = (
                            <div className="w-full h-full p-0.5">
                              <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 border-l-2 border-l-gray-300 rounded-r-md flex flex-col items-center justify-center shadow-sm">
                                <span className="text-[10px] text-white font-bold leading-tight">{congeLabel}</span>
                              </div>
                            </div>
                          );
                        } else if (shift?.type === 'absence') {
                          // Repos - bloc gris clair moderne
                          cellContent = (
                            <div className="w-full h-full p-0.5">
                              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 border-l-2 border-l-gray-400 rounded-r-md flex flex-col items-center justify-center">
                                <span className="text-[9px] text-gray-600 font-bold leading-tight">OFF</span>
                              </div>
                            </div>
                          );
                        } else if (hasSegments) {
                          // Shift planifi� - bloc color� par employ� (style moderne avec bordure)
                          const seg = shift.segments[0];
                          const startTime = seg.start?.slice(0, 5) || '';
                          const endTime = seg.end?.slice(0, 5) || '';
                          
                          // Couleur selon �tat ou par d�faut couleur employ�
                          let blockStyle = empColorConfig;
                          
                          // �tats sp�ciaux
                          if (hasPending) {
                            blockStyle = { bg: 'bg-gradient-to-br from-amber-500 to-orange-500', border: 'border-l-2 border-l-amber-400' };
                          } else if (hasExtra) {
                            blockStyle = { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', border: 'border-l-2 border-l-emerald-400' };
                          }
                          
                          // Indicateurs de statut
                          let statusIndicator = null;
                          if (hasPending) {
                            statusIndicator = <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-yellow-300 border-l-[6px] border-l-transparent" title="À valider" />;
                          } else if (hasExtra) {
                            statusIndicator = <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-white border-l-[6px] border-l-transparent" title="Extra" />;
                          }
                          
                          cellContent = (
                            <div className="w-full h-full p-0.5">
                              <div className={`relative w-full h-full ${blockStyle.bg} ${blockStyle.border} rounded-r-md flex flex-col items-center justify-center shadow-sm hover:shadow-md hover:brightness-105 transition-all`}>
                                <span className="text-[8px] text-white font-semibold leading-tight opacity-90">{startTime}</span>
                                <span className="text-[8px] text-white font-semibold leading-tight opacity-90">{endTime}</span>
                                {statusIndicator}
                              </div>
                            </div>
                          );
                        }
                        
                        return (
                          <div
                            key={i}
                            onClick={() => onCellClick(emp.id, dStr)}
                            title={conge ? `Congé: ${conge.type || ''}` : hasSegments ? `${shift.segments[0]?.start} - ${shift.segments[0]?.end}` : 'Cliquer pour planifier'}
                            className={`flex-1 min-w-0 h-full border-r border-gray-200/80 cursor-pointer hover:bg-gray-100/50 transition-all ${cellBg} ${today ? 'ring-2 ring-inset ring-[#cf292c]/40 bg-red-50/30' : ''}`}
                          >
                            {cellContent}
                          </div>
                        );
                      }
                      
                      // Vue semaine - CellDrop
                      return (
                        <div key={i} className="flex-1 min-w-[110px] h-full">
                          <CellDrop
                            employeId={emp.id}
                            date={dStr}
                            shift={shift}
                            conge={conge}
                            moveSegment={moveSegment}
                            onCellClick={onCellClick}
                            cellSizeClass="h-full"
                            showComparaison={showComparaison}
                            getEcartsForEmployeeDate={getEcartsForEmployeeDate}
                            formatEcart={formatEcart}
                            denseMode={false}
                            handleAnomalieClick={handleAnomalieClick}
                            handleQuickAction={handleQuickAction}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
          </div>
          {/* Remplissage dynamique droite */}
          <div className="flex-1 bg-white" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Vue MOIS : Calendrier mensuel classique ---------- */
function MonthCalendarView({ 
  dates, 
  employes, 
  shifts, 
  conges, 
  onCellClick, 
  formatEmployeeName,
  getCategorieEmploye 
}) {
  // �tat pour le jour s�lectionn� (pour afficher le d�tail)
  const [selectedDay, setSelectedDay] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [filterEmployee, setFilterEmployee] = useState(null); // Filtre par employ�
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef(null);
  
  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target)) {
        setEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Obtenir l'employ� s�lectionn�
  const selectedEmployee = filterEmployee ? employes.find(e => e.id === filterEmployee) : null;
  
  // Obtenir le mois de r�f�rence (milieu des dates)
  const referenceDate = dates[Math.min(15, dates.length - 1)];
  const referenceMonth = referenceDate.getMonth();
  const referenceYear = referenceDate.getFullYear();
  
  // Construire les semaines du mois
  const weeks = useMemo(() => {
    const firstDay = new Date(referenceYear, referenceMonth, 1);
    const lastDay = new Date(referenceYear, referenceMonth + 1, 0);
    
    let startDate = new Date(firstDay);
    const dayOfWeek = startDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + diff);
    
    const weeksArray = [];
    let currentWeek = [];
    let current = new Date(startDate);
    
    while (current <= lastDay || currentWeek.length > 0) {
      currentWeek.push(new Date(current));
      
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
        if (current > lastDay) break;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return weeksArray;
  }, [referenceMonth, referenceYear]);
  
  // Fonction pour obtenir les shifts/cong�s d'un jour (avec filtre employ�)
  const getDayData = useCallback((date) => {
    const dateStr = date.toISOString().slice(0, 10);
    
    let dayShifts = shifts.filter(s => {
      const shiftDate = s.date?.slice(0, 10);
      return shiftDate === dateStr && s.type === 'travail' && Array.isArray(s.segments) && s.segments.length > 0;
    });
    
    let dayConges = conges.filter(c => {
      const debut = c.dateDebut?.slice(0, 10);
      const fin = c.dateFin?.slice(0, 10);
      return (c.statut === 'approuvé' || c.statut === 'approuv\uFFFD' || c.statut === 'approuve') && dateStr >= debut && dateStr <= fin;
    });
    
    // Appliquer le filtre employ� si actif
    if (filterEmployee) {
      dayShifts = dayShifts.filter(s => s.employeId === filterEmployee);
      dayConges = dayConges.filter(c => c.userId === filterEmployee);
    }
    
    return { dayShifts, dayConges };
  }, [shifts, conges, filterEmployee]);
  
  // Statistiques du mois
  const monthStats = useMemo(() => {
    let totalShifts = 0;
    let totalConges = 0;
    let totalHeures = 0;
    
    weeks.flat().forEach(day => {
      if (day.getMonth() === referenceMonth) {
        const { dayShifts, dayConges } = getDayData(day);
        totalShifts += dayShifts.length;
        totalConges += dayConges.length;
        
        dayShifts.forEach(s => {
          if (!Array.isArray(s.segments)) return;
          s.segments.forEach(seg => {
            if (seg.start && seg.end) {
              const [sh, sm] = seg.start.split(':').map(Number);
              const [eh, em] = seg.end.split(':').map(Number);
              let dur = (eh * 60 + em) - (sh * 60 + sm);
              if (dur < 0) dur += 24 * 60;
              totalHeures += dur / 60;
            }
          });
        });
      }
    });
    
    return { totalShifts, totalConges, totalHeures: Math.round(totalHeures) };
  }, [weeks, referenceMonth, getDayData]);
  
  // Palette de couleurs
  const getEmployeeColor = useCallback((empId) => {
    const colors = [
      { bg: 'bg-gradient-to-r from-[#cf292c] to-[#e53935]', dot: 'bg-[#cf292c]' },
      { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', dot: 'bg-blue-500' },
      { bg: 'bg-gradient-to-r from-violet-500 to-purple-600', dot: 'bg-violet-500' },
      { bg: 'bg-gradient-to-r from-emerald-500 to-teal-600', dot: 'bg-emerald-500' },
      { bg: 'bg-gradient-to-r from-amber-500 to-orange-500', dot: 'bg-amber-500' },
      { bg: 'bg-gradient-to-r from-pink-500 to-rose-500', dot: 'bg-pink-500' },
      { bg: 'bg-gradient-to-r from-cyan-500 to-sky-500', dot: 'bg-cyan-500' },
      { bg: 'bg-gradient-to-r from-indigo-500 to-blue-600', dot: 'bg-indigo-500' },
    ];
    const index = employes.findIndex(e => e.id === empId);
    return colors[index % colors.length];
  }, [employes]);
  
  const joursSemaine = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  
  // Données du jour sélectionné
  const selectedDayData = selectedDay ? getDayData(selectedDay) : null;
  
  return (
    <div className="h-full flex bg-gray-50 overflow-hidden">
      {/* Calendrier principal */}
      <div className="flex-1 flex flex-col bg-white border-r border-gray-200">
        {/* Stats rapides en haut */}
        <div className="flex items-center gap-6 px-5 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#cf292c]/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[#cf292c]" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800">{moisNoms[referenceMonth]} {referenceYear}</div>
            </div>
          </div>
          
          {/* Filtre employ� - Dropdown styl� */}
          <div className="relative" ref={employeeDropdownRef}>
            <button
              onClick={() => setEmployeeDropdownOpen(!employeeDropdownOpen)}
              className="flex items-center gap-2 h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-600 hover:border-gray-300 hover:bg-white focus:outline-none transition-all"
            >
              {selectedEmployee ? (
                <>
                  <div className={`w-5 h-5 rounded-full ${getEmployeeColor(selectedEmployee.id).bg} text-white text-[8px] font-bold flex items-center justify-center`}>
                    {formatEmployeeName(selectedEmployee).split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <span className="font-medium truncate max-w-[80px]">{formatEmployeeName(selectedEmployee).split(' ')[0]}</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium">Employés</span>
                </>
              )}
              <svg className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${employeeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {employeeDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                <div className="px-2.5 py-1.5 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Filtrer par employé</span>
                  <span className="text-[10px] text-gray-400">{employes.length}</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {/* Option "Tous" */}
                  <button
                    onClick={() => { setFilterEmployee(null); setEmployeeDropdownOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-gray-50 transition-colors ${!filterEmployee ? 'bg-red-50/50' : ''}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="w-3 h-3 text-gray-400" />
                    </div>
                    <span className={`flex-1 text-left ${!filterEmployee ? 'font-medium text-[#cf292c]' : 'text-gray-600'}`}>
                      Tous les employés
                    </span>
                    {!filterEmployee && (
                      <svg className="w-3.5 h-3.5 text-[#cf292c]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  
                  {/* S�parateur */}
                  <div className="h-px bg-gray-100 my-1" />
                  
                  {/* Liste des employ�s */}
                  {employes.map(emp => {
                    const colorConfig = getEmployeeColor(emp.id);
                    const categorie = getCategorieEmploye(emp);
                    const isSelected = filterEmployee === emp.id;
                    
                    return (
                      <button
                        key={emp.id}
                        onClick={() => { setFilterEmployee(emp.id); setEmployeeDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-gray-50 transition-colors ${isSelected ? 'bg-red-50/50' : ''}`}
                      >
                        <div className={`w-6 h-6 rounded-full ${colorConfig.bg} text-white text-[9px] font-bold flex items-center justify-center shadow-sm`}>
                          {formatEmployeeName(emp).split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className={`truncate ${isSelected ? 'font-medium text-[#cf292c]' : 'text-gray-700'}`}>
                            {formatEmployeeName(emp)}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">{categorie.label}</div>
                        </div>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-[#cf292c] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Badge reset quand filtre actif */}
          {filterEmployee && (
            <button
              onClick={() => setFilterEmployee(null)}
              className="flex items-center gap-1.5 bg-red-50 text-[#cf292c] rounded-full pl-2 pr-1.5 py-1 hover:bg-red-100 transition-colors"
              title="Réinitialiser le filtre"
            >
              <span className="text-[10px] font-medium">Filtre actif</span>
              <X className="w-3 h-3" />
            </button>
          )}
          
          <div className="flex items-center gap-4 ml-auto text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#cf292c]/5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#cf292c]" />
              <span className="font-semibold text-[#cf292c]">{monthStats.totalShifts}</span>
              <span className="text-gray-500">shifts</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full">
              <Clock className="w-3 h-3 text-blue-500" />
              <span className="font-semibold text-blue-600">{monthStats.totalHeures}h</span>
              <span className="text-gray-500">planifiées</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="font-semibold text-gray-600">{monthStats.totalConges}</span>
              <span className="text-gray-500">congés</span>
            </div>
          </div>
        </div>
        
        {/* En-tête jours de la semaine */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {joursSemaine.map((jour, i) => (
            <div 
              key={jour} 
              className={`py-2 text-center text-[11px] font-bold uppercase tracking-wider border-r last:border-r-0 border-gray-100 ${
                i >= 5 ? 'text-gray-400 bg-gray-50' : 'text-gray-500'
              }`}
            >
              {jour}
            </div>
          ))}
        </div>
        
        {/* Grille des semaines */}
        <div className="flex-1 overflow-y-auto">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0" style={{ minHeight: '100px' }}>
              {week.map((day, dayIndex) => {
                const isCurrentMonth = day.getMonth() === referenceMonth;
                const isWeekend = dayIndex >= 5;
                const dateStr = day.toISOString().slice(0, 10);
                const isToday = dateStr === todayStr;
                const isSelected = selectedDay && day.toISOString().slice(0, 10) === selectedDay.toISOString().slice(0, 10);
                const isHovered = hoveredDay === dateStr;
                const { dayShifts, dayConges } = getDayData(day);
                const totalEvents = dayShifts.length + dayConges.length;
                
                return (
                  <div 
                    key={dayIndex}
                    onClick={() => isCurrentMonth && setSelectedDay(day)}
                    onMouseEnter={() => setHoveredDay(dateStr)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`group border-r last:border-r-0 border-gray-100 p-1.5 flex flex-col cursor-pointer transition-all duration-150 ${
                      !isCurrentMonth 
                        ? 'bg-gray-50/50 opacity-40 cursor-default' 
                        : isSelected
                          ? 'bg-[#cf292c]/5 ring-2 ring-[#cf292c] ring-inset'
                          : isHovered
                            ? 'bg-gray-50'
                            : isWeekend 
                              ? 'bg-gray-50/30' 
                              : 'bg-white'
                    } ${isToday && !isSelected ? 'bg-red-50/50' : ''}`}
                  >
                    {/* Num�ro du jour */}
                    <div className="flex items-center justify-between mb-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                        isToday 
                          ? 'bg-[#cf292c] text-white' 
                          : isSelected
                            ? 'bg-[#cf292c]/10 text-[#cf292c]'
                            : !isCurrentMonth 
                              ? 'text-gray-300' 
                              : isWeekend 
                                ? 'text-gray-400' 
                                : 'text-gray-700'
                      }`}>
                        {day.getDate()}
                      </div>
                      {totalEvents > 0 && isCurrentMonth && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          isSelected ? 'bg-[#cf292c] text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {totalEvents}
                        </span>
                      )}
                    </div>
                    
                    {/* �v�nements - affichage compact avec couleurs par TYPE */}
                    {isCurrentMonth && (
                      <div className="flex-1 space-y-0.5 overflow-hidden">
                        {/* Afficher jusqu'� 3 �v�nements en mode compact */}
                        {[...dayConges.slice(0, 1), ...dayShifts.slice(0, 2)].map((event, idx) => {
                          const isConge = 'dateDebut' in event;
                          const emp = employes.find(e => e.id === (isConge ? event.userId : event.employeId));
                          if (!emp) return null;
                          
                          if (isConge) {
                            // Utiliser la palette unifi�e pour les cong�s
                            const congeConfig = getCongeTypeColor(event.type);
                            const CongeIcon = congeConfig.Icon;
                            return (
                              <div 
                                key={`e-${idx}`}
                                className={`flex items-center gap-1 px-1.5 py-0.5 ${congeConfig.bg} border ${congeConfig.border} rounded text-[9px] ${congeConfig.color} truncate`}
                                onClick={(e) => { e.stopPropagation(); onCellClick(emp.id, dateStr); }}
                              >
                                <CongeIcon size={10} className="flex-shrink-0" />
                                <span className="truncate">{formatEmployeeName(emp).split(' ')[0]}</span>
                              </div>
                            );
                          }
                          
                          // Utiliser la palette unifi�e pour les shifts
                          const seg = event.segments[0];
                          // D�tecter si c'est un shift de nuit
                          const [startH] = (seg?.start || '00:00').split(':').map(Number);
                          const [endH] = (seg?.end || '00:00').split(':').map(Number);
                          const isNightShift = endH < startH;
                          const typeConfig = getShiftTypeColor(seg, event, isNightShift);
                          const TypeIcon = typeConfig.Icon;
                          
                          return (
                            <div 
                              key={`e-${idx}`}
                              className={`${typeConfig.gradient} text-white px-1.5 py-0.5 rounded text-[9px] truncate flex items-center gap-1 shadow-sm`}
                              onClick={(e) => { e.stopPropagation(); onCellClick(emp.id, dateStr); }}
                            >
                              <TypeIcon size={10} className="flex-shrink-0 opacity-80" />
                              <span className="truncate font-medium">{formatEmployeeName(emp).split(' ')[0]}</span>
                              <span className="opacity-75 text-[8px]">{seg.start?.slice(0,5)}</span>
                            </div>
                          );
                        })}
                        
                        {totalEvents > 3 && (
                          <div className="text-[8px] text-gray-400 pl-1 font-medium">
                            +{totalEvents - 3}
                          </div>
                        )}
                        
                        {/* Bouton + pour ajouter un shift sur les jours vides */}
                        {totalEvents === 0 && (
                          <div 
                            className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); onCellClick(employes[0]?.id, dateStr); }}
                          >
                            <div className="w-7 h-7 rounded-full bg-gray-100 hover:bg-[#cf292c]/10 hover:text-[#cf292c] flex items-center justify-center text-gray-400 transition-colors cursor-pointer">
                              <Plus className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Panneau lat�ral - D�tail du jour s�lectionn� */}
      <div className={`w-72 bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ${selectedDay ? 'translate-x-0' : 'translate-x-full hidden'}`}>
        {selectedDay && selectedDayData && (
          <>
            {/* En-t�te du panneau */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-gray-800">
                    {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {selectedDayData.dayShifts.length} shift(s) - {selectedDayData.dayConges.length} congé(s)
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDay(null)}
                  className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Liste des événements */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedDayData.dayConges.length === 0 && selectedDayData.dayShifts.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Aucun événement</p>
                  
                  <p className="text-xs text-gray-400 mt-1">Ce jour est libre</p>
                </div>
              )}
              
              {/* Cong�s */}
              {selectedDayData.dayConges.map((conge, idx) => {
                const emp = employes.find(e => e.id === conge.userId);
                if (!emp) return null;
                
                // Utilise la palette unifi�e pour les cong�s
                const config = getCongeTypeColor(conge.type);
                const IconComponent = config.Icon;
                
                return (
                  <div 
                    key={`conge-${idx}`}
                    onClick={() => onCellClick(emp.id, selectedDay.toISOString().slice(0, 10))}
                    className={`p-3 ${config.bg} rounded-lg cursor-pointer transition-all border ${config.border} hover:shadow-sm`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-600 text-[10px] font-semibold flex items-center justify-center">
                        {formatEmployeeName(emp).split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{formatEmployeeName(emp)}</div>
                        <div className={`flex items-center gap-1 text-[11px] ${config.color}`}>
                          <IconComponent className="w-3 h-3" />
                          <span>{config.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Shifts - utilise la palette unifi�e */}
              {selectedDayData.dayShifts.map((shift, idx) => {
                const emp = employes.find(e => e.id === shift.employeId);
                if (!emp || !Array.isArray(shift.segments) || !shift.segments.length) return null;
                const seg = shift.segments[0];
                
                // Calculer dur�e totale (tous segments)
                let totalDur = 0;
                let isNightShift = false;
                shift.segments.forEach(s => {
                  const [sh, sm] = (s.start || '00:00').split(':').map(Number);
                  const [eh, em] = (s.end || '00:00').split(':').map(Number);
                  let d = (eh * 60 + em) - (sh * 60 + sm);
                  if (d < 0) {
                    d += 24 * 60;
                    isNightShift = true;
                  }
                  if (eh < sh) isNightShift = true;
                  totalDur += d;
                });
                const heures = Math.floor(totalDur / 60);
                const mins = totalDur % 60;
                
                // Utilise la palette unifi�e
                const typeConfig = getShiftTypeColor(seg, shift, isNightShift);
                const TypeIcon = typeConfig.Icon;
                const hasMultipleSegments = shift.segments.length > 1;
                
                return (
                  <div 
                    key={`shift-${idx}`}
                    onClick={() => onCellClick(emp.id, selectedDay.toISOString().slice(0, 10))}
                    className="bg-white rounded-lg cursor-pointer transition-all border border-gray-200 hover:border-gray-300 hover:shadow-sm overflow-hidden"
                  >
                    {/* Barre color�e selon le type */}
                    <div className={`h-1 ${typeConfig.gradient}`} />
                    
                    <div className="p-3">
                      {/* Header */}
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`w-8 h-8 rounded-lg ${typeConfig.bgLight} ${typeConfig.text} text-[10px] font-semibold flex items-center justify-center border ${typeConfig.borderFull}`}>
                          <TypeIcon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{formatEmployeeName(emp)}</div>
                          <div className={`text-[10px] ${typeConfig.text}`}>{typeConfig.label}</div>
                        </div>
                      </div>
                      
                      {/* Horaires */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span className={`font-medium px-2 py-1 rounded ${typeConfig.gradient} text-white`}>
                            {seg.start?.slice(0, 5)} - {seg.end?.slice(0, 5)}
                          </span>
                          {isNightShift && <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1 rounded">+1</span>}
                          {hasMultipleSegments && (
                            <span className="text-[10px] text-gray-400">+{shift.segments.length - 1}</span>
                          )}
                        </div>
                        <span className="font-semibold text-gray-700">
                          {heures}h{mins > 0 ? mins.toString().padStart(2, '0') : ''}
                        </span>
                      </div>
                      
                      {/* Montant extra */}
                      {seg?.isExtra && seg.extraMontant && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
                          <span className="text-gray-500">Montant</span>
                          <span className="font-semibold text-gray-700">{seg.extraMontant}€</span>
                        </div>
                      )}
                      
                      {/* Motif remplacement */}
                      {shift.motif && (shift.motif.toLowerCase().includes('remplacement') || shift.motif.toLowerCase().includes('remplac\uFFFD')) && (
                        <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500 truncate flex items-center gap-1">
                          <RefreshCw size={10} />
                          {shift.motif}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Action rapide */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => onCellClick(employes[0]?.id, selectedDay.toISOString().slice(0, 10))}
                className="w-full px-4 py-2 bg-[#cf292c] hover:bg-[#b52429] text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter un shift
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Vue JOUR : Timeline horizontale style Skello PREMIUM ---------- */
function DayAgenda({ date, employes, shifts, conges, onCellClick, formatEmployeeName, getEmployeeInitials }) {
  const today = new Date();
  const isTodayView = today.toDateString() === date.toDateString();
  const dStr = formatDate(date);
  
  // ---------------------------------------------------------------------------
  // �TATS ET REFS
  // ---------------------------------------------------------------------------
  const [showFullDay, setShowFullDay] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 0.75, 1, 1.25, 1.5
  const [showCoverage, setShowCoverage] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, working, off, available
  const scrollRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Mise � jour du temps r�el toutes les minutes
  useEffect(() => {
    if (!isTodayView) return;
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, [isTodayView]);
  
  // Parser heure:min -> minutes
  const parseTime = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  
  // ---------------------------------------------------------------------------
  // ANALYSE DES SHIFTS
  // ---------------------------------------------------------------------------
  
  const shiftAnalysis = React.useMemo(() => {
    const dayShifts = shifts.filter(s => s.date.slice(0, 10) === dStr && s.type === 'travail');
    
    if (!dayShifts.length || !dayShifts.some(s => Array.isArray(s.segments) && s.segments.length)) {
      return { minHour: 8, maxHour: 20, hasNightShift: false };
    }
    
    let minHour = 24, maxHour = 0, hasNightShift = false;
    
    dayShifts.forEach(s => {
      if (!Array.isArray(s.segments)) return;
      s.segments.forEach(seg => {
        const startMin = parseTime(seg.start);
        let endMin = parseTime(seg.end);
        const [sh] = seg.start.split(':').map(Number);
        
        if (endMin <= startMin) {
          hasNightShift = true;
          endMin += 24 * 60;
        }
        
        if (sh < minHour) minHour = sh;
        const endHour = Math.ceil(endMin / 60);
        if (endHour > maxHour) maxHour = endHour;
      });
    });
    
    return { minHour, maxHour: Math.min(28, maxHour), hasNightShift };
  }, [shifts, dStr]);
  
  // Calcul de la plage horaire
  const { startHour, endHour } = React.useMemo(() => {
    const { minHour, maxHour, hasNightShift } = shiftAnalysis;
    
    if (showFullDay) {
      return { startHour: 0, endHour: hasNightShift ? maxHour : 24 };
    }
    
    const start = Math.max(0, minHour - 1);
    const end = maxHour + 1;
    const minRange = 8;
    
    if (end - start < minRange) {
      const mid = Math.floor((start + end) / 2);
      return { 
        startHour: Math.max(0, mid - minRange / 2), 
        endHour: Math.min(28, mid + minRange / 2) 
      };
    }
    
    return { startHour: start, endHour: end };
  }, [shiftAnalysis, showFullDay]);
  
  const totalHours = endHour - startHour;
  const hours = Array.from({ length: totalHours }, (_, i) => startHour + i);
  const baseWidth = 50 * zoomLevel;

  // Fonctions utilitaires
  const durationMinutes = (start, end) => {
    let duration = parseTime(end) - parseTime(start);
    if (duration < 0) duration += 24 * 60;
    return Math.max(0, duration);
  };

  const getData = (emp) => {
    const shift = shifts.find((s) => s.employeId === emp.id && s.date.slice(0, 10) === dStr);
    const conge = conges.find(
      (c) => c.userId === emp.id && (c.statut === "approuvé" || c.statut === "approuv\uFFFD" || c.statut === "approuve") &&
        dStr >= c.dateDebut.slice(0, 10) && dStr <= c.dateFin.slice(0, 10)
    );
    return { shift: conge ? null : shift, conge };
  };

  // ---------------------------------------------------------------------------
  // STATISTIQUES DU JOUR
  // ---------------------------------------------------------------------------
  
  const dayStats = React.useMemo(() => {
    let working = 0, onLeave = 0, absent = 0, available = 0;
    let totalHoursPlanned = 0, extraHours = 0, pendingValidation = 0;
    
    employes.forEach(emp => {
      const { shift, conge } = getData(emp);
      
      if (conge) {
        onLeave++;
      } else if (shift?.type === 'travail' && Array.isArray(shift.segments) && shift.segments.length) {
        working++;
        shift.segments.forEach(seg => {
          const dur = durationMinutes(seg.start, seg.end);
          totalHoursPlanned += dur;
          if (seg.isExtra) extraHours += dur;
          if (seg.aValider) pendingValidation++;
        });
      } else if (shift?.type === 'absence' || shift?.type === 'repos') {
        absent++;
      } else {
        available++;
      }
    });
    
    return {
      working,
      onLeave,
      absent,
      available,
      totalHoursPlanned: Math.round(totalHoursPlanned / 60 * 10) / 10,
      extraHours: Math.round(extraHours / 60 * 10) / 10,
      pendingValidation
    };
  }, [employes, shifts, conges, dStr]);

  // Heures totales par employ�
  const totalHeuresParEmploye = employes.reduce((acc, emp) => {
    const { shift, conge } = getData(emp);
    if (conge || !shift || shift.type !== 'travail' || !Array.isArray(shift.segments) || !shift.segments.length) {
      acc[emp.id] = 0;
    } else {
      acc[emp.id] = shift.segments.reduce((m, s) => m + durationMinutes(s.start, s.end), 0) / 60;
    }
    return acc;
  }, {});

  // ---------------------------------------------------------------------------
  // CALCUL DE LA COUVERTURE HORAIRE (effectif par tranche)
  // ---------------------------------------------------------------------------
  
  const coverageData = React.useMemo(() => {
    const coverage = {};
    for (let h = startHour; h < endHour; h++) {
      coverage[h] = 0;
    }
    
    employes.forEach(emp => {
      const { shift, conge } = getData(emp);
      if (conge || !shift || shift.type !== 'travail' || !Array.isArray(shift.segments)) return;
      
      shift.segments.forEach(seg => {
        const startMin = parseTime(seg.start);
        let endMin = parseTime(seg.end);
        if (endMin <= startMin) endMin += 24 * 60;
        
        for (let h = startHour; h < endHour; h++) {
          const hourStart = h * 60;
          const hourEnd = (h + 1) * 60;
          if (startMin < hourEnd && endMin > hourStart) {
            coverage[h]++;
          }
        }
      });
    });
    
    return coverage;
  }, [employes, shifts, conges, dStr, startHour, endHour]);
  
  const maxCoverage = Math.max(...Object.values(coverageData), 1);

  // Filtrage des employ�s
  const filteredEmployes = React.useMemo(() => {
    if (filterStatus === 'all') return employes;
    
    return employes.filter(emp => {
      const { shift, conge } = getData(emp);
      switch (filterStatus) {
        case 'working':
          return shift?.type === 'travail' && Array.isArray(shift.segments) && shift.segments.length > 0;
        case 'off':
          return conge || shift?.type === 'repos' || shift?.type === 'absence';
        case 'available':
          return !conge && (!shift || (shift.type === 'travail' && (!Array.isArray(shift.segments) || !shift.segments.length)));
        default:
          return true;
      }
    });
  }, [employes, filterStatus, shifts, conges, dStr]);

  // Position et calculs
  const minuteToPercent = (minute) => {
    const startMin = startHour * 60;
    const endMin = endHour * 60;
    const totalMin = endMin - startMin;
    if (totalMin === 0) return 0;
    return Math.max(0, Math.min(100, ((minute - startMin) / totalMin) * 100));
  };

  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  // Ligne temps r�el
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const showCurrentLine = isTodayView && currentMinutes >= startHour * 60 && currentMinutes < endHour * 60;
  const currentLinePercent = showCurrentLine ? minuteToPercent(currentMinutes) : null;

  // Scroll vers l'heure actuelle au montage
  useEffect(() => {
    if (showCurrentLine && scrollRef.current) {
      const scrollContainer = scrollRef.current;
      const containerWidth = scrollContainer.clientWidth;
      const scrollWidth = scrollContainer.scrollWidth;
      const targetScroll = (currentLinePercent / 100) * scrollWidth - containerWidth / 2;
      scrollContainer.scrollLeft = Math.max(0, targetScroll);
    }
  }, []);

  return (
    <div className="relative border border-gray-200 rounded-xl bg-white shadow-sm h-full flex flex-col overflow-hidden">
      {/* ----------- HEADER ENRICHI ----------- */}
      <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        {/* Ligne 1 : Date et contr�les principaux */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-800">
              {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            {isTodayView && (
              <span className="px-2 py-0.5 bg-[#cf292c] text-white text-[10px] font-medium rounded-full animate-pulse">
                Aujourd'hui
              </span>
            )}
            {isTodayView && (
              <span className="text-xs text-gray-500 font-mono">
                {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Zoom */}
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-1 py-0.5 bg-white">
              <button 
                onClick={() => setZoomLevel(z => Math.max(0.75, z - 0.25))}
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Réduire"
              >
                <Minus size={12} />
              </button>
              <span className="text-[10px] text-gray-500 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button 
                onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.25))}
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                title="Agrandir"
              >
                <Plus size={12} />
              </button>
            </div>
            
            {/* Toggle couverture */}
            <button
              onClick={() => setShowCoverage(v => !v)}
              className={`px-2 py-1 rounded-lg border text-[10px] font-medium transition-colors ${
                showCoverage 
                  ? 'border-blue-300 bg-blue-50 text-blue-600' 
                  : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
              }`}
              title="Afficher la couverture horaire"
            >
              <BarChart3 size={14} />
            </button>
            
            {/* Toggle plage */}
            <button
              onClick={() => setShowFullDay(v => !v)}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg border text-[10px] font-medium transition-colors ${
                showFullDay 
                  ? 'border-[#cf292c]/30 bg-red-50 text-[#cf292c]' 
                  : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {showFullDay ? <><Clock size={12} /> Heures travail</> : <><Calendar size={12} /> 24h</>}
            </button>
            
            {/* L�gende des couleurs */}
            <ShiftColorLegend compact={true} showConges={true} />
          </div>
        </div>
        
        {/* Ligne 2 : Statistiques du jour */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-4 text-[10px]">
            <button 
              onClick={() => setFilterStatus(f => f === 'working' ? 'all' : 'working')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ${
                filterStatus === 'working' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-semibold">{dayStats.working}</span>
              <span>en poste</span>
            </button>
            
            <button 
              onClick={() => setFilterStatus(f => f === 'off' ? 'all' : 'off')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ${
                filterStatus === 'off' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="font-semibold">{dayStats.onLeave + dayStats.absent}</span>
              <span>absents/congés</span>
            </button>
            
            <button 
              onClick={() => setFilterStatus(f => f === 'available' ? 'all' : 'available')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ${
                filterStatus === 'available' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="font-semibold">{dayStats.available}</span>
              <span>disponibles</span>
            </button>
            
            {filterStatus !== 'all' && (
              <button 
                onClick={() => setFilterStatus('all')}
                className="text-gray-400 hover:text-gray-600 text-[10px] underline"
              >
                Voir tous
              </button>
            )}
          </div>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-4 text-[10px] text-gray-500">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span className="font-semibold text-gray-700">{dayStats.totalHoursPlanned}h</span>
              <span>planifiées</span>
            </div>
            {dayStats.extraHours > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <Star size={12} />
                <span className="font-semibold">{dayStats.extraHours}h</span>
                <span>extras</span>
              </div>
            )}
            {dayStats.pendingValidation > 0 && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertCircle size={12} />
                <span className="font-semibold">{dayStats.pendingValidation}</span>
                <span>À valider</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ----------- TIMELINE ----------- */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {/* Header sticky avec heures + couverture */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="flex">
            <div className="w-40 shrink-0 border-r border-gray-200 px-3 py-2 bg-white">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                {filteredEmployes.length} employé{filteredEmployes.length > 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="flex-1 relative" style={{ minWidth: `${Math.max(400, totalHours * baseWidth)}px` }}>
              {/* Barre de couverture */}
              {showCoverage && (
                <div className="flex h-6 border-b border-gray-100">
                  {hours.map(h => {
                    const count = coverageData[h] || 0;
                    const pct = (count / maxCoverage) * 100;
                    return (
                      <div key={h} className="flex-1 flex items-end justify-center px-0.5">
                        <div 
                          className={`w-full rounded-t transition-all ${count > 0 ? 'bg-blue-400' : 'bg-gray-200'}`}
                          style={{ height: `${Math.max(pct, 10)}%` }}
                          title={`${h % 24}h: ${count} employé${count > 1 ? 's' : ''}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Labels heures */}
              <div className="flex h-7 border-r border-gray-200">
                {hours.map((h, idx) => (
                  <div key={h} className={`flex-1 flex items-end justify-start px-1 pb-1 ${idx < hours.length - 1 ? 'border-r border-gray-100' : ''}`}>
                    <span className={`text-[10px] font-medium ${h >= 24 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {String(h % 24).padStart(2, '0')}h{h >= 24 && <span className="text-[7px] ml-0.5">+1</span>}
                    </span>
                    {showCoverage && (
                      <span className="ml-1 text-[8px] text-blue-500 font-semibold">
                        {coverageData[h] || 0}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="w-14 shrink-0 border-l border-gray-200 px-1 py-2 flex items-center justify-center bg-gray-50">
              <span className="text-[9px] font-semibold text-gray-500 uppercase">Total</span>
            </div>
          </div>
        </div>

        {/* Lignes employ�s */}
        {filteredEmployes.map((emp, empIndex) => {
          const { shift, conge } = getData(emp);
          const totalH = totalHeuresParEmploye[emp.id];
          
          // D�terminer le statut pour la couleur de fond
          let rowBg = empIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/30';
          if (conge) rowBg = 'bg-amber-50/30';
          else if (shift?.type === 'repos' || shift?.type === 'absence') rowBg = 'bg-gray-100/50';
          
          return (
            <div 
              key={emp.id} 
              className={`flex border-b border-gray-100 hover:bg-blue-50/40 transition-colors group ${rowBg}`}
              style={{ minHeight: `${40 * zoomLevel}px` }}
            >
              {/* Info employ� */}
              <div className="w-40 shrink-0 border-r border-gray-200 px-2 py-1.5 flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full text-[10px] font-semibold flex items-center justify-center shadow-sm ${
                  conge ? 'bg-amber-100 text-amber-700' :
                  shift?.type === 'travail' && Array.isArray(shift.segments) && shift.segments.length ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {getEmployeeInitials(emp)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-gray-800 truncate">{formatEmployeeName(emp)}</div>
                  <div className="text-[9px] text-gray-400 truncate">{emp.poste || emp.role || ''}</div>
                </div>
              </div>
              
              {/* Timeline avec segments */}
              <div 
                className="flex-1 relative py-1 cursor-pointer border-r border-gray-200"
                style={{ minWidth: `${Math.max(400, totalHours * baseWidth)}px` }}
                onClick={() => onCellClick(emp.id, dStr)}
              >
                {/* Grille verticale */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {hours.map((h, idx) => (
                    <div key={h} className={`flex-1 ${idx < hours.length - 1 ? (h >= 24 ? 'border-r border-orange-100' : 'border-r border-gray-100') : ''}`} />
                  ))}
                </div>
                
                {/* Ligne temps r�el */}
                {showCurrentLine && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 shadow-sm"
                    style={{ left: `${currentLinePercent}%` }}
                  >
                    <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full shadow" />
                  </div>
                )}
                
                {/* Cong� - utilise la palette unifi�e */}
                {conge && (() => {
                  const congeConfig = getCongeTypeColor(conge.type);
                  const CongeIcon = congeConfig.Icon;
                  return (
                    <div className={`absolute inset-y-1 left-0 right-0 mx-1 rounded ${congeConfig.bg} border ${congeConfig.border} flex items-center px-3`}>
                      <CongeIcon size={12} className={`${congeConfig.color} mr-2`} />
                      <span className={`text-[10px] font-medium ${congeConfig.color}`}>{congeConfig.label || conge.type || 'Congé'}</span>
                    </div>
                  );
                })()}
                
                {/* Absence ou Repos - utilise la palette unifi�e */}
                {!conge && shift && (shift.type === 'absence' || shift.type === 'repos') && (() => {
                  const motifLower = shift.motif?.toLowerCase() || '';
                  const isRemplace = motifLower.includes('remplacé par') || motifLower.includes('remplac\uFFFD par');
                  const typeConfig = isRemplace ? SHIFT_TYPE_COLORS.remplace : SHIFT_TYPE_COLORS.repos;
                  const TypeIcon = typeConfig.Icon;
                  return (
                    <div className={`absolute inset-y-1 left-0 right-0 mx-1 rounded flex items-center px-3 ${typeConfig.bgLight} border ${typeConfig.borderFull}`}>
                      <TypeIcon size={12} className={`${typeConfig.text} mr-2`} />
                      <span className={`text-[10px] font-medium ${typeConfig.text}`}>
                        {shift.motif || typeConfig.label}
                      </span>
                    </div>
                  );
                })()}
                
                {/* Segments de travail - utilise la palette unifi�e */}
                {!conge && shift && shift.type === 'travail' && Array.isArray(shift.segments) && shift.segments.map((seg, i) => {
                  const startMin = parseTime(seg.start);
                  let endMin = parseTime(seg.end) || startMin;
                  const isNightShift = endMin <= startMin;
                  if (isNightShift) endMin += 24 * 60;
                  
                  const timelineStart = startHour * 60;
                  const timelineEnd = endHour * 60;
                  if (endMin <= timelineStart || startMin >= timelineEnd) return null;
                  
                  const clampedStart = Math.max(startMin, timelineStart);
                  const clampedEnd = Math.min(endMin, timelineEnd);
                  const leftPct = minuteToPercent(clampedStart);
                  const widthPct = minuteToPercent(clampedEnd) - leftPct;
                  const dureeMin = endMin - startMin;
                  
                  // S'assurer que le shift ne d�borde pas de la timeline
                  const maxWidthPct = 100 - leftPct;
                  const finalWidthPct = Math.min(widthPct, maxWidthPct);
                  
                  // --- UTILISATION DE LA PALETTE UNIFI�E ---
                  const typeConfig = getShiftTypeColor(seg, shift, isNightShift);
                  const TypeIcon = typeConfig.Icon;
                  
                  const isHovered = hoveredSegment === `${emp.id}-${i}`;
                  
                  // D�terminer si on peut afficher le contenu complet ou compact
                  const isCompact = finalWidthPct < 10;
                  
                  return (
                    <div
                      key={seg.id || `seg-${i}`}
                      className={`absolute top-1 bottom-1 ${typeConfig.gradient} ${typeConfig.border} rounded-r shadow-sm flex items-center cursor-pointer transition-all z-10 overflow-hidden ${
                        isHovered ? 'brightness-110 shadow-lg scale-[1.02] z-20' : 'hover:brightness-105'
                      } ${isCompact ? 'justify-center px-1' : 'px-1.5'}`}
                      style={{ 
                        left: `${leftPct}%`, 
                        width: `${Math.max(finalWidthPct, 4)}%`,
                        minWidth: isCompact ? '45px' : '70px',
                        maxWidth: `calc(100% - ${leftPct}%)`
                      }}
                      onClick={(e) => { e.stopPropagation(); onCellClick(emp.id, dStr); }}
                      onMouseEnter={() => setHoveredSegment(`${emp.id}-${i}`)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      title={`${seg.start} → ${seg.end}${isNightShift ? ' (+1j)' : ''} | ${formatDuration(dureeMin)}`}
                    >
                      {isCompact ? (
                        <div className="flex items-center justify-center gap-0.5 text-white text-[8px] font-bold w-full">
                          <TypeIcon size={10} className="text-white/80" />
                          <span className="truncate">{seg.start}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-white text-[9px] font-semibold whitespace-nowrap w-full">
                          <TypeIcon size={10} className="text-white/80" />
                          <span>{seg.start}</span>
                          <span className="opacity-50">→</span>
                          <span>{seg.end}</span>
                          {isNightShift && <span className="bg-white/20 px-0.5 rounded text-[7px]">+1</span>}
                          <span className="ml-auto bg-black/20 px-1 py-0.5 rounded text-[8px]">
                            {formatDuration(dureeMin)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Cellule vide - bouton d'ajout */}
                {!conge && (!shift || (shift.type === 'travail' && (!Array.isArray(shift.segments) || !shift.segments.length))) && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="flex items-center gap-1 text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors">
                      <Plus size={12} />
                      Planifier
                    </button>
                  </div>
                )}
              </div>
              
              {/* Total */}
              <div className="w-14 shrink-0 border-l border-gray-200 px-1 py-1 flex items-center justify-center bg-gray-50/50">
                <span className={`text-[10px] font-bold ${totalH > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                  {totalH > 0 ? formatDuration(Math.round(totalH * 60)) : '-'}
                </span>
              </div>
            </div>
          );
        })}
        
        {/* Message si aucun employé après filtrage */}
        {filteredEmployes.length === 0 && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <div className="text-center">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun employé dans cette catégorie</p>
              <button 
                onClick={() => setFilterStatus('all')}
                className="mt-2 text-xs text-blue-500 hover:underline"
              >
                Voir tous les employés
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Modale �dition shift
function ModalEditionShift({ 
  employe, 
  shift, 
  onSave, 
  onDelete, 
  onClose, 
  token, 
  formatEmployeeName, 
  getEmployeeInitials, 
  isAdmin = false, 
  userRole = null, 
  requiresAdminPrivileges = null 
}) {
  // Normaliser le type pour �viter les valeurs undefined/null
  const normalizedType = shift.type || "travail";
  const [type, setType] = useState(normalizedType);
  const [motif, setMotif] = useState(shift.motif || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null); // Message d'erreur global
  const [segmentErrors, setSegmentErrors] = useState({}); // Erreurs sp�cifiques aux segments
  const [adminWarning, setAdminWarning] = useState(null); // Alerte administrative
  const [segments, setSegments] = useState(() => {
    // Si c'est un shift de pr�sence avec des segments existants
    if (normalizedType === "travail" && Array.isArray(shift.segments) && shift.segments.length > 0) {
      return shift.segments.map(s => ({
        ...s,
        commentaire: s.commentaire || "",
        aValider: s.aValider || false,
        isExtra: s.isExtra || false
      }));
    }
    // Si c'est un shift de pr�sence sans segments, cr�er un segment par d�faut
    else if (normalizedType === "travail") {
      return [{ 
        start: "", 
        end: "", 
        commentaire: "", 
        aValider: false, 
        isExtra: false
      }];
    }
    // Pour les absences, pas de segments
    else {
      return [];
    }
  });
  // ref toujours � jour pour �viter �tat obsol�te dans callbacks async
  const segmentsRef = useRef(segments);
  useEffect(()=>{ segmentsRef.current = segments; }, [segments]);
  
  // Effect to handle type changes
  useEffect(() => {
    // When type changes to 'absence', we don't need segments
    // When type changes to 'travail', ensure we have at least one segment
    if (type === 'travail' && (!segments || segments.length === 0)) {
      const newSegment = { 
        start: "", 
        end: "", 
        commentaire: "", 
        aValider: false, 
        isExtra: false
      };
      setSegments([newSegment]);
    }
    // Reset motif when changing to 'travail'
    if (type === 'travail' && motif) {
      setMotif("");
    }
  }, [type, segments, motif]);

  const isEdit = !!shift.id;

  // ?? Vérifier si un segment extra est payé (donc verrouillé)
  const isSegmentLocked = (seg) => {
    return seg.isExtra && (seg.paymentStatus === 'payé' || seg.paymentStatus === 'paye' || seg.paymentStatus === 'pay\uFFFD');
  };

  // Message pour segment verrouillé
  const [lockedMessage, setLockedMessage] = useState(null);
  const showLockedMessage = (segmentIndex) => {
    setLockedMessage(`Le créneau ${segmentIndex + 1} a été payé et ne peut plus être modifié. Pour corriger, créez un ajustement dans la gestion des extras.`);
    setTimeout(() => setLockedMessage(null), 5000);
  };

  // ?? Vérifier si le shift contient au moins un segment payé
  const hasLockedSegment = segments.some(seg => isSegmentLocked(seg));
  
  // Message global pour tentative de modification interdite
  const showShiftLockedMessage = () => {
    setLockedMessage("Ce shift contient un créneau extra déjà payé. Vous ne pouvez pas le supprimer ou le convertir en absence. Pour corriger, créez un ajustement dans la gestion des extras.");
    setTimeout(() => setLockedMessage(null), 5000);
  };

  const addSegment = () => {
    // Création d'un nouveau segment avec des valeurs par défaut
    const newSegment = { 
      start: "", 
      end: "", 
      commentaire: "", 
      aValider: false, 
      isExtra: false
    };
    
    // Ajout du segment à la liste existante
    setSegments(prevSegments => [...prevSegments, newSegment]);
    
    // Mettre � jour la r�f�rence pour assurer la coh�rence
    segmentsRef.current = [...segmentsRef.current, newSegment];
  };
  const removeSegment = (idx) => setSegments(segments.filter((_, i) => i !== idx));
  
  const changeSegment = (idx, field, value) => {
    // calculer le nouveau tableau avant setState pour le snapshot
    const updatedSegments = segmentsRef.current.map((s, i) => {
      if (i !== idx) return s;
      return { ...s, [field]: value };
    });
    setSegments(updatedSegments);
    segmentsRef.current = updatedSegments;

    // V�rifier si cette modification n�cessite des privil�ges administrateur
    if (requiresAdminPrivileges && (field === 'start' || field === 'end' || field === 'isExtra')) {
      const tempShift = { ...shift, segments: updatedSegments, type: 'travail' };
      const adminCheck = requiresAdminPrivileges(tempShift, shift);
      
      if (adminCheck.required && !isAdmin) {
        setAdminWarning({
          message: adminCheck.message,
          reason: adminCheck.reason,
          segment: idx + 1
        });
      } else {
        setAdminWarning(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Réinitialiser les erreurs
    setErrorMessage(null);
    setSegmentErrors({});
    
    try {
      // Validation c�t� client avant envoi
      const newSegmentErrors = {};
      const segmentsToValidate = [...segmentsRef.current];
      
      // Si c'est un type pr�sence, valider les segments
      if (type === 'travail') {
        // V�rifier que chaque segment a une heure de d�but et de fin valide
        segmentsToValidate.forEach((segment, index) => {
          if (!segment.start) {
            newSegmentErrors[`segments[${index}].start`] = "Heure de prise de poste requise";
          }
          
          if (!segment.end) {
            newSegmentErrors[`segments[${index}].end`] = "Heure de fin de service requise";
          }
          
          // ?? RESTAURANT : Autoriser les shifts de nuit (ex: 19:00 ? 00:30)
          // Ne valider que les dur�es nulles (d�but = fin)
          if (segment.start && segment.end && segment.start === segment.end) {
            newSegmentErrors[`segments[${index}].end`] = "La durée du service ne peut pas être nulle";
          }
          
          // V�rifier les chevauchements avec d'autres segments
          if (segment.start && segment.end) {
            for (let i = 0; i < segmentsToValidate.length; i++) {
              if (i !== index && segmentsToValidate[i].start && segmentsToValidate[i].end) {
                // ?? RESTAURANT : G�rer les chevauchements avec shifts de nuit
                const segmentA = { start: segment.start, end: segment.end };
                const segmentB = { start: segmentsToValidate[i].start, end: segmentsToValidate[i].end };
                
                // Convertir en minutes pour comparaison
                const timeToMinutes = (time) => {
                  const [h, m] = time.split(':').map(Number);
                  return h * 60 + m;
                };
                
                const aStart = timeToMinutes(segmentA.start);
                const aEnd = timeToMinutes(segmentA.end);
                const bStart = timeToMinutes(segmentB.start);
                const bEnd = timeToMinutes(segmentB.end);
                
                // D�tecter si segments franchissent minuit
                const aSpansNight = aEnd < aStart;
                const bSpansNight = bEnd < bStart;
                
                let overlap = false;
                
                if (!aSpansNight && !bSpansNight) {
                  // Cas normal : aucun shift de nuit
                  overlap = (aStart < bEnd && aEnd > bStart);
                } else if (aSpansNight && !bSpansNight) {
                  // A franchit minuit, B normal
                  // A occupe [aStart ? 24:00[ + [00:00 ? aEnd[
                  overlap = (aStart < bEnd && bStart < 24*60) || (bStart < aEnd);
                } else if (!aSpansNight && bSpansNight) {
                  // B franchit minuit, A normal
                  overlap = (bStart < aEnd && aStart < 24*60) || (aStart < bEnd);
                } else {
                  // Les deux franchissent minuit : toujours un chevauchement
                  overlap = true;
                }
                
                if (overlap) {
                  newSegmentErrors[`segments[${index}].overlap`] = `Chevauchement avec le segment ${i + 1}`;
                  break;
                }
              }
            }
          }
        });
      } else if (type === 'absence' && !motif) {
        // Pour les absences, v�rifier le motif
        setErrorMessage("La déclaration d'absence nécessite un motif valide pour assurer le suivi administratif et la conformité légale");
        return;
      }
      
      // Si des erreurs ont �t� trouv�es, ne pas continuer la soumission
      if (Object.keys(newSegmentErrors).length > 0) {
        setSegmentErrors(newSegmentErrors);
        return;
      }
      // Ensure correct data structure based on type
      const shiftToSave = { 
        ...shift, 
        employeId: shift.employeId, 
        date: shift.date, 
        type, 
        // For 'travail', include segments and clear motif
        segments: type === 'travail' ? segmentsToValidate : [],
        // For 'absence', include motif and clear segments
        motif: type !== 'travail' ? motif : '' 
      };
      await onSave(shiftToSave);
      // Note: La synchronisation des PaiementExtra est g�r�e c�t� serveur (shiftController)
      onClose();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      
      // Gestion sp�cifique des erreurs de chevauchement
      const errorMsg = err.response?.data?.error || err.message || 'Erreur lors de la sauvegarde du shift';
      
      if (errorMsg.includes("Chevauchement entre segments")) {
        // Tentative de parser le message d'erreur pour extraire les num�ros de segments
        const regex = /Chevauchement entre segments (\d+) et (\d+)/;
        const match = errorMsg.match(regex);
        
        if (match && match[1] && match[2]) {
          const seg1 = parseInt(match[1]) - 1; // -1 car les indices commencent � 0
          const seg2 = parseInt(match[2]) - 1;
          
          const newSegmentErrors = {};
          const segments = segmentsRef.current;
          
          // Marquer les deux segments en erreur
          if (seg1 >= 0 && seg1 < segments.length) {
            newSegmentErrors[`segments[${seg1}].overlap`] = `Conflit horaire avec la plage ${seg2+1}`;
          }
          
          if (seg2 >= 0 && seg2 < segments.length) {
            newSegmentErrors[`segments[${seg2}].overlap`] = `Conflit horaire avec la plage ${seg1+1}`;
          }
          
          setSegmentErrors(newSegmentErrors);
          setErrorMessage("Attention : Les plages horaires programmées se chevauchent. Selon la législation du travail, les périodes de travail doivent être distinctes.");
          return; // Ne pas fermer le modal pour permettre la correction
        }
      }
      
      // Gestion des autres erreurs
      setErrorMessage(errorMsg);
    }
  };

  useEffect(()=>{
    if(!confirmDelete) return;
    setConfirmCountdown(5);
    const tick = setInterval(()=>{
      setConfirmCountdown(c=>{
        if(c<=1){ clearInterval(tick); setConfirmDelete(false); return 0; }
        return c-1;
      });
    },1000);
    const onKey = (e)=>{ if(e.key==='Escape') setConfirmDelete(false); };
    window.addEventListener('keydown', onKey);
    return ()=>{ clearInterval(tick); window.removeEventListener('keydown', onKey); };
  },[confirmDelete]);

  // Configuration types d'absence avec icônes (style DemandeCongeForm)
  const typesAbsence = [
    { value: 'CP', label: 'Congés Payés', icon: Calendar, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
    { value: 'RTT', label: 'RTT', icon: Clock, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
    { value: 'sans_solde', label: 'Sans Solde', icon: DollarSign, color: 'from-gray-500 to-gray-600', bgColor: 'bg-gray-50', textColor: 'text-gray-700' },
    { value: 'maladie', label: 'Maladie', icon: Stethoscope, color: 'from-red-500 to-red-600', bgColor: 'bg-red-50', textColor: 'text-red-700' },
    { value: 'maternite', label: 'Maternité', icon: Heart, color: 'from-pink-500 to-pink-600', bgColor: 'bg-pink-50', textColor: 'text-pink-700' },
    { value: 'paternite', label: 'Paternité', icon: Heart, color: 'from-cyan-500 to-cyan-600', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700' },
    { value: 'deces', label: 'Décès', icon: Users, color: 'from-slate-500 to-slate-600', bgColor: 'bg-slate-50', textColor: 'text-slate-700' },
    { value: 'formation', label: 'Formation', icon: GraduationCap, color: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  ];

  const [showMotifPicker, setShowMotifPicker] = useState(false);
  const selectedMotifConfig = typesAbsence.find(t => t.value === motif) || typesAbsence[0];
  
  // State pour le time picker personnalis�
  const [activeTimePicker, setActiveTimePicker] = useState(null); // format: "segmentIndex-start" ou "segmentIndex-end"
  
  // Toutes les heures de 00:00 � 23:30 par tranches de 30min
  const timeOptions = Array.from({ length: 48 }, (_, idx) => {
    const h = Math.floor(idx / 2);
    const m = (idx % 2) * 30;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });
  
  // Fermer le picker quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeTimePicker && !e.target.closest('.time-picker-container')) {
        setActiveTimePicker(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeTimePicker]);
  
  // R�f�rence pour calculer la position du dropdown
  const timePickerRef = useRef(null);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-[520px] border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header de la modale */}
        <div className="bg-gradient-to-r from-[#cf292c] to-[#e74c3c] px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm">
              {isEdit ? (
                <FileText className="w-5 h-5 text-white" />
              ) : (
                <PlusCircle className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isEdit ? "Modifier le shift" : "Nouveau shift"}
              </h3>
              <p className="text-xs text-white/80">
                {formatEmployeeName(employe)} • {shift.date ? new Date(shift.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Badge Remplacement */}
            {shift.motif?.toLowerCase()?.includes('remplacement de') && (
              <span className="text-[11px] text-white bg-fuchsia-500/50 px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium backdrop-blur-sm">
                <RefreshCw className="w-3.5 h-3.5" />
                Remplacement
              </span>
            )}
            {/* Badge Remplac� */}
            {(shift.motif?.toLowerCase()?.includes('remplacé par') || shift.motif?.toLowerCase()?.includes('remplac\uFFFD par')) && (
              <span className="text-[11px] text-white bg-slate-500/50 px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium backdrop-blur-sm">
                <UserX className="w-3.5 h-3.5" />
                Remplacé
              </span>
            )}
            {isEdit && shift.id && Array.isArray(shift.segments) && shift.segments.some(s => s.isExtra) && (
              <span className="text-[11px] text-white bg-white/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium backdrop-blur-sm">
                <Banknote className="w-3.5 h-3.5" />
                Extra enregistré
              </span>
            )}
            <button 
              type="button" 
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Badge info remplacement */}
          {shift.motif?.toLowerCase()?.includes('remplacement de') && (
            <div className="bg-gradient-to-r from-fuchsia-50 to-pink-50 border border-fuchsia-200 rounded-lg p-3 flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-fuchsia-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-fuchsia-800">
                  Shift de remplacement
                </div>
                <div className="text-sm text-fuchsia-700 mt-1">
                  Ce shift remplace <strong>{shift.motif.replace(/remplacement de /i, '')}</strong>
                </div>
              </div>
            </div>
          )}
          {(shift.motif?.toLowerCase()?.includes('remplacé par') || shift.motif?.toLowerCase()?.includes('remplac\uFFFD par')) && (
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-200 rounded-lg p-3 flex items-start gap-3">
              <UserX className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-800">
                  Shift original (remplacé)
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  {shift.motif}
                </div>
              </div>
            </div>
          )}
          
          {/* Affichage du message d'erreur global */}
          {errorMessage && (
            <ErrorMessage 
              message={errorMessage} 
              type="error" 
              onDismiss={() => setErrorMessage(null)} 
            />
          )}
          
          {/* ?? Message segment verrouillé */}
          {lockedMessage && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-purple-800">
                  Segment verrouillé
                </div>
                <div className="text-sm text-purple-700 mt-1">
                  {lockedMessage}
                </div>
              </div>
              <button onClick={() => setLockedMessage(null)} className="text-purple-400 hover:text-purple-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* Alerte administrative */}
          {adminWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-amber-800">
                  Validation administrative requise
                </div>
                <div className="text-sm text-amber-700 mt-1">
                  {adminWarning.message}
                  {adminWarning.segment && (
                    <span className="block mt-1 text-xs">
                      Segment concern� : #{adminWarning.segment}
                    </span>
                  )}
                </div>
                {!isAdmin && (
                  <div className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      isAdmin ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isAdmin ? 'ADMIN' : (userRole || 'USER').toUpperCase()}
                    </span>
                    Votre modification sera marqu�e pour validation.
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Section Employ� et Date - align�s */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5">
                <Users className="w-3.5 h-3.5 text-[#cf292c]" />
                Employé
              </label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 h-[46px] bg-gray-50/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#cf292c] to-[#e74c3c] text-white text-xs flex items-center justify-center font-semibold shadow-sm flex-shrink-0">
                  {getEmployeeInitials(employe)}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800 truncate leading-tight">
                    {formatEmployeeName(employe)}
                  </span>
                  {(employe.prenom || employe.nom) && employe.email && (
                    <span className="text-[11px] text-gray-400 truncate leading-tight">{employe.email}</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Date avec ic�ne calendrier */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#cf292c]" />
                Date
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={formatDateForInput(shift.date)} 
                  className="w-full border border-gray-200 rounded-lg px-3 h-[46px] bg-gray-50/50 text-sm text-gray-700 font-medium pr-10 focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] transition-all" 
                  disabled 
                />
                <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
          
          {/* S�lecteur de Type avec style am�lior� */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-[#cf292c]" />
              Type de shift
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('travail');
                  setErrorMessage(null);
                  setSegmentErrors({});
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all font-medium text-sm ${
                  type === 'travail'
                    ? 'border-[#cf292c] bg-red-50 text-[#cf292c] shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <CheckCircle className={`w-4 h-4 ${type === 'travail' ? 'text-[#cf292c]' : 'text-gray-400'}`} />
                Présence
              </button>
              <button
                type="button"
                onClick={() => {
                  // ?? Bloquer si segment payé
                  if (hasLockedSegment) {
                    showShiftLockedMessage();
                    return;
                  }
                  setType('absence');
                  setErrorMessage(null);
                  setSegmentErrors({});
                }}
                disabled={hasLockedSegment}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all font-medium text-sm ${
                  hasLockedSegment
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : type === 'absence'
                      ? 'border-gray-700 bg-gray-100 text-gray-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                {hasLockedSegment ? (
                  <Lock className="w-4 h-4 text-gray-400" />
                ) : (
                  <XCircle className={`w-4 h-4 ${type === 'absence' ? 'text-gray-600' : 'text-gray-400'}`} />
                )}
                Absence
                {hasLockedSegment && <span className="text-[10px] ml-1">(verrouillé)</span>}
              </button>
            </div>

            {type === "absence" && (
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                  <FileText className="w-3.5 h-3.5 text-[#cf292c]" />
                  Motif d'absence
                </label>
                
                {/* Bouton d�clencheur du picker */}
                <button
                  type="button"
                  onClick={() => setShowMotifPicker(!showMotifPicker)}
                  className="w-full flex items-center gap-3 px-4 h-[46px] border border-gray-200 rounded-lg bg-white text-left text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] hover:border-gray-300 transition-all relative"
                >
                  {motif ? (
                    <>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedMotifConfig?.bgColor || 'bg-gray-50'}`}>
                        {selectedMotifConfig?.icon && <selectedMotifConfig.icon className={`w-4 h-4 ${selectedMotifConfig?.textColor || 'text-gray-600'}`} />}
                      </div>
                      <span className="flex-1 font-medium text-gray-800">{selectedMotifConfig?.label || motif}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">
                        <FileText className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="flex-1 text-gray-400">Choisir un motif...</span>
                    </>
                  )}
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showMotifPicker ? 'rotate-90' : ''}`} />
                </button>
                
                {/* Picker dropdown */}
                {showMotifPicker && (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="max-h-[240px] overflow-y-auto divide-y divide-gray-100">
                      {typesAbsence.map((t) => {
                        const TypeIcon = t.icon;
                        const isActive = t.value === motif;
                        return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => { setMotif(t.value); setShowMotifPicker(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                              isActive ? 'bg-gray-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.bgColor} border border-gray-200/60`}>
                              <TypeIcon className={`w-4 h-4 ${t.textColor}`} />
                            </div>
                            <span className="flex-1 text-sm font-medium text-gray-800">{t.label}</span>
                            {isActive && <div className="w-2.5 h-2.5 rounded-full bg-[#cf292c]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Aper�u du type s�lectionn� */}
                {motif && selectedMotifConfig && (
                  <div className={`${selectedMotifConfig.bgColor} rounded-lg px-3 py-2 border border-gray-100`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center bg-white/80`}>
                        <selectedMotifConfig.icon className={`w-3.5 h-3.5 ${selectedMotifConfig.textColor}`} />
                      </div>
                      <span className={`text-sm font-semibold ${selectedMotifConfig.textColor}`}>{selectedMotifConfig.label}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Section Créneaux horaires (Présence) */}
          {type === "travail" ? (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/30">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <Clock className="w-3.5 h-3.5 text-[#cf292c]" />
                  Créneaux horaires
                </label>
                <span className="text-[10px] text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                  {segments.length} {segments.length > 1 ? 'plages' : 'plage'}
                </span>
              </div>
              
              <div className="space-y-2">
                {segments.map((seg, i) => {
                  const locked = isSegmentLocked(seg);
                  return (
                  <div 
                    key={seg.id || `seg-edit-${i}`} 
                    className={`bg-white rounded-lg border p-3 transition-all ${
                      locked
                        ? 'border-purple-300 bg-gradient-to-r from-purple-50/50 to-violet-50/50'
                        : segmentErrors[`segments[${i}].overlap`] 
                          ? 'border-red-300 bg-red-50/30' 
                          : seg.isExtra 
                            ? 'border-amber-300 bg-gradient-to-r from-amber-50/50 to-orange-50/50'
                            : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Header compact : numéro + supprimer */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded text-white text-[10px] font-bold flex items-center justify-center ${locked ? 'bg-purple-500' : 'bg-[#cf292c]'}`}>
                          {locked ? <Lock className="w-3 h-3" /> : (i + 1)}
                        </div>
                        <span className={`text-xs font-medium ${locked ? 'text-purple-600' : 'text-gray-600'}`}>
                          {locked ? 'Créneau payé (verrouillé)' : `Créneau ${i + 1}`}
                        </span>
                        {locked && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                            PAYÉ
                          </span>
                        )}
                      </div>
                      {locked ? (
                        <div 
                          className="w-6 h-6 flex items-center justify-center rounded text-purple-400 cursor-not-allowed"
                          title="Segment payé - modification impossible"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (segments.length > 1) {
                              removeSegment(i);
                            } else {
                              // Réinitialiser le créneau au lieu de supprimer
                              changeSegment(i, 'start', '');
                              changeSegment(i, 'end', '');
                            }
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-[#cf292c] transition-all"
                          title={segments.length > 1 ? 'Supprimer' : 'Effacer'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    
                    {/* S�lection horaires inline */}
                    <div className="flex items-center gap-2">
                      {/* Input d�but */}
                      <div className="flex-1 relative time-picker-container">
                        <div 
                          onClick={() => {
                            if (locked) {
                              showLockedMessage(i);
                              return;
                            }
                            setActiveTimePicker(activeTimePicker === `${i}-start` ? null : `${i}-start`);
                          }}
                          className={`flex items-center gap-2 h-9 px-3 rounded-lg transition-all border ${
                            locked 
                              ? 'border-purple-200 bg-purple-50/50 cursor-not-allowed'
                              : segmentErrors[`segments[${i}].start`] ? 'border-red-400 bg-red-50 cursor-pointer' 
                              : seg.start ? 'border-[#cf292c] bg-[#cf292c]/5 cursor-pointer' : 'border-gray-200 bg-gray-50 hover:border-gray-300 cursor-pointer'
                          }`}
                        >
                          <LogOut className={`w-3.5 h-3.5 flex-shrink-0 ${locked ? 'text-purple-400' : seg.start ? 'text-[#cf292c]' : 'text-gray-400'}`} />
                          <span className={`text-sm font-semibold ${locked ? 'text-purple-500' : seg.start ? 'text-[#cf292c]' : 'text-gray-400'}`}>
                            {seg.start || '--:--'}
                          </span>
                          {locked && <Lock className="w-3 h-3 text-purple-400 ml-auto" />}
                        </div>
                        {/* Dropdown avec scroll auto */}
                        {!locked && activeTimePicker === `${i}-start` && (
                          <div 
                            className="absolute bottom-full left-0 mb-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 w-[72px] max-h-[180px] overflow-y-auto scrollbar-thin"
                            ref={el => {
                              if (el && seg.start) {
                                const idx = timeOptions.indexOf(seg.start);
                                if (idx > 0) el.scrollTop = Math.max(0, idx * 28 - 60);
                              }
                            }}
                          >
                            {timeOptions.map(t => (
                              <button key={t} type="button" onClick={() => { changeSegment(i, 'start', t); setActiveTimePicker(null); }}
                                className={`w-full py-1 px-2 text-xs font-medium text-center transition-colors ${seg.start === t ? 'bg-[#cf292c] text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
                                {t}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <span className={`text-lg ${locked ? 'text-purple-300' : 'text-gray-300'}`}>→</span>
                      
                      {/* Input fin */}
                      <div className="flex-1 relative time-picker-container">
                        <div 
                          onClick={() => {
                            if (locked) {
                              showLockedMessage(i);
                              return;
                            }
                            setActiveTimePicker(activeTimePicker === `${i}-end` ? null : `${i}-end`);
                          }}
                          className={`flex items-center gap-2 h-9 px-3 rounded-lg transition-all border ${
                            locked 
                              ? 'border-purple-200 bg-purple-50/50 cursor-not-allowed'
                              : segmentErrors[`segments[${i}].end`] ? 'border-red-400 bg-red-50 cursor-pointer' 
                              : seg.end ? 'border-[#cf292c] bg-[#cf292c]/5 cursor-pointer' : 'border-gray-200 bg-gray-50 hover:border-gray-300 cursor-pointer'
                          }`}
                        >
                          <Timer className={`w-3.5 h-3.5 flex-shrink-0 ${locked ? 'text-purple-400' : seg.end ? 'text-[#cf292c]' : 'text-gray-400'}`} />
                          <span className={`text-sm font-semibold ${locked ? 'text-purple-500' : seg.end ? 'text-[#cf292c]' : 'text-gray-400'}`}>
                            {seg.end || '--:--'}
                          </span>
                          {locked && <Lock className="w-3 h-3 text-purple-400 ml-auto" />}
                        </div>
                        {/* Dropdown avec scroll auto */}
                        {!locked && activeTimePicker === `${i}-end` && (
                          <div 
                            className="absolute bottom-full right-0 mb-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 w-[72px] max-h-[180px] overflow-y-auto scrollbar-thin"
                            ref={el => {
                              if (el && seg.end) {
                                const idx = timeOptions.indexOf(seg.end);
                                if (idx > 0) el.scrollTop = Math.max(0, idx * 28 - 60);
                              }
                            }}
                          >
                            {timeOptions.map(t => (
                              <button key={t} type="button" onClick={() => { changeSegment(i, 'end', t); setActiveTimePicker(null); }}
                                className={`w-full py-1 px-2 text-xs font-medium text-center transition-colors ${seg.end === t ? 'bg-[#cf292c] text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
                                {t}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Dur�e */}
                      {seg.start && seg.end && (
                        <div className="px-2 py-1 bg-[#cf292c]/10 rounded text-[#cf292c] text-xs font-bold">
                          {(() => {
                            const [sH, sM] = seg.start.split(':').map(Number);
                            const [eH, eM] = seg.end.split(':').map(Number);
                            let m = (eH * 60 + eM) - (sH * 60 + sM);
                            if (m < 0) m += 24 * 60;
                            return `${Math.floor(m/60)}h${m%60 ? (m%60).toString().padStart(2,'0') : ''}`;
                          })()}
                        </div>
                      )}
                    </div>
                    
                    {/* Erreurs */}
                    {(segmentErrors[`segments[${i}].start`] || segmentErrors[`segments[${i}].end`] || segmentErrors[`segments[${i}].overlap`]) && (
                      <div className="mt-3 flex items-center gap-2 text-red-600 text-xs bg-red-100 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{segmentErrors[`segments[${i}].overlap`] || segmentErrors[`segments[${i}].start`] || segmentErrors[`segments[${i}].end`]}</span>
                      </div>
                    )}
                    
                    {/* Options compactes : À valider + Extra - VERROUILLÉ si payé */}
                    {locked ? (
                      <div className="mt-2 pt-2 border-t border-purple-100 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-purple-500">
                          <Lock className="w-3 h-3" />
                          <span className="text-[11px] font-medium">Options verrouillées</span>
                        </div>
                        <span className="text-[10px] text-purple-400">Le paiement a été effectué</span>
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                            seg.aValider ? 'border-amber-500 bg-amber-500' : 'border-gray-300 bg-white group-hover:border-amber-400'
                          }`}>
                            {seg.aValider && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <input type="checkbox" checked={seg.aValider} onChange={e => changeSegment(i, "aValider", e.target.checked)} className="sr-only" />
                          <span className={`text-[11px] font-medium ${seg.aValider ? 'text-amber-600' : 'text-gray-500'}`}>À valider</span>
                        </label>
                        
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                            seg.isExtra ? 'border-orange-500 bg-gradient-to-br from-amber-500 to-orange-500' : 'border-gray-300 bg-white group-hover:border-orange-400'
                          }`}>
                            {seg.isExtra && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <input type="checkbox" checked={seg.isExtra} onChange={e => changeSegment(i, "isExtra", e.target.checked)} className="sr-only" />
                          <span className={`text-[11px] font-medium flex items-center gap-1 ${seg.isExtra ? 'text-orange-600' : 'text-gray-500'}`}>
                            <Banknote className="w-3 h-3" />Extra
                          </span>
                        </label>
                      </div>
                    )}
                    
                    {/* Panneau Extra compact - ou résumé si payé */}
                    {seg.isExtra && (
                      <div className={`mt-2 p-2 rounded-md border flex items-center justify-between ${
                        locked 
                          ? 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200'
                          : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {locked ? <Lock className="w-4 h-4 text-purple-600" /> : <Banknote className="w-4 h-4 text-orange-600" />}
                          <span className={`text-[11px] font-semibold ${locked ? 'text-purple-700' : 'text-orange-700'}`}>
                            {locked ? 'Extra Payé' : 'Heures Extra'}
                          </span>
                        </div>
                        <div className={`text-sm font-bold ${locked ? 'text-purple-700' : 'text-orange-700'}`}>
                          {seg.start && seg.end ? (() => {
                            const [startH, startM] = seg.start.split(':').map(Number);
                            const [endH, endM] = seg.end.split(':').map(Number);
                            let mins = (endH * 60 + endM) - (startH * 60 + startM);
                            if (mins < 0) mins += 24 * 60;
                            return locked ? `${(mins / 60).toFixed(1)}h payées` : `${(mins / 60).toFixed(1)}h à payer`;
                          })() : '0h'}
                        </div>
                      </div>
                    )}
                  </div>
                );})}
              </div>
              
              {/* Bouton ajouter créneau - limité à 2 créneaux max */}
              {segments.length < 2 && (
                <button
                  type="button"
                  onClick={addSegment}
                  className="mt-2 w-full py-2 border-2 border-dashed border-[#cf292c]/30 rounded-lg text-sm text-[#cf292c] hover:border-[#cf292c] hover:bg-red-50/50 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <PlusCircle className="w-4 h-4" />
                  Ajouter un 2ème créneau
                </button>
              )}
              {segments.length >= 2 && (
                <div className="mt-2 text-center text-[11px] text-gray-400">
                  Maximum 2 créneaux par shift
                </div>
              )}
            </div>
          ) : type === "absence" ? (
            null
          ) : null}
        </div>
        
        {/* Footer avec boutons d'action */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isEdit && (
              <div className="relative">
                {hasLockedSegment ? (
                  <button
                    type="button"
                    onClick={showShiftLockedMessage}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-purple-200 text-purple-400 bg-purple-50 cursor-not-allowed text-sm font-medium"
                    title="Suppression impossible - contient un extra payé"
                  >
                    <Lock className="w-4 h-4" />
                    Verrouillé
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={()=> setConfirmDelete(true)}
                    disabled={confirmDelete}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 hover:border-red-300 transition-all text-sm font-medium disabled:opacity-60"
                  >
                    <X className="w-4 h-4" />
                    Supprimer
                  </button>
                )}
                {confirmDelete && !hasLockedSegment && (
                  <div className="absolute left-0 bottom-full mb-2 w-80 bg-white border border-red-200 shadow-xl rounded-xl p-4 z-30">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800 mb-1">Confirmer la suppression ?</p>
                        <p className="text-xs text-gray-500 leading-relaxed">Cette action est définitive et supprimera aussi l'historique de paiement lié.</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button 
                        type="button" 
                        onClick={onDelete} 
                        className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Oui, supprimer
                      </button>
                      <button 
                        type="button" 
                        onClick={()=>setConfirmDelete(false)} 
                        className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                    <div className="mt-3 text-center text-[10px] text-gray-400">
                      Expiration auto dans <span className="font-medium text-gray-500">{confirmCountdown}s</span> - Échap pour annuler
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-[#cf292c] to-[#e74c3c] hover:from-[#b02025] hover:to-[#cf292c] text-white shadow-md hover:shadow-lg transition-all text-sm font-medium"
            >
              <Check className="w-4 h-4" />
              {isEdit ? 'Enregistrer' : 'Créer le shift'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// Panneau d'administration des anomalies
function AdminAnomaliesPanel({ isOpen, onClose, dates, employes, formatEmployeeName, onRefresh, showToast }) {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('en_attente');
  const [selectedEmploye, setSelectedEmploye] = useState('tous');
  const [selectedAnomalie, setSelectedAnomalie] = useState(null);
  
  // Charger les anomalies
  const loadAnomalies = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const dateDebut = dates[0] ? toLocalDateString(dates[0]) : null;
      const dateFin = dates[dates.length - 1] ? toLocalDateString(dates[dates.length - 1]) : null;

      const params = new URLSearchParams({ dateDebut, dateFin, limit: '1000' });
      if (filter !== 'tous') params.append('statut', filter);
      if (selectedEmploye !== 'tous') params.append('employeId', selectedEmploye);

      const response = await fetch(`${API_URL}/api/anomalies?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAnomalies(data.anomalies || []);
      }
    } catch (error) {
      console.error('Erreur chargement anomalies:', error);
      showToast('Erreur de chargement des anomalies', 'error');
    } finally {
      setLoading(false);
    }
  }, [dates, filter, selectedEmploye, showToast]);

  // Action rapide (validation/refus simple)
  const handleQuickAction = useCallback(async (anomalieId, action) => {
    try {
      const token = localStorage.getItem('token');
      const commentaire = action === 'valider' 
        ? 'Validation rapide - justification acceptée' 
        : 'Refus - justification insuffisante';

      const response = await fetch(`${API_URL}/api/anomalies/${anomalieId}/traiter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, commentaire })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur traitement');
      }

      const data = await response.json();
      const label = action === 'valider' ? 'validée' : 'refusée';
      
      showToast(`Anomalie ${label} avec succès !`, action === 'valider' ? 'success' : 'error');
      await loadAnomalies();
      onRefresh();
    } catch (error) {
      console.error('Erreur action rapide:', error);
      showToast(error.message, 'error');
    }
  }, [loadAnomalies, onRefresh, showToast]);

  // Calculer statistiques
  const stats = useMemo(() => {
    const enAttente = anomalies.filter(a => a.statut === 'en_attente').length;
    const validees = anomalies.filter(a => a.statut === 'validee').length;
    const refusees = anomalies.filter(a => a.statut === 'refusee').length;
    return { enAttente, validees, refusees, total: anomalies.length };
  }, [anomalies]);

  // Formatter les d�tails pour affichage
  const getAnomalieDetails = useCallback((anomalie) => {
    try {
      const details = typeof anomalie.details === 'string' 
        ? JSON.parse(anomalie.details) 
        : anomalie.details;
      
      if (details?.ecartMinutes && Math.abs(details.ecartMinutes) > 0) {
        const heures = Math.abs(details.ecartMinutes) / 60;
        const minutes = Math.round(Math.abs(details.ecartMinutes));
        return { heures, minutes };
      }
    } catch (e) {
      return null;
    }
    return null;
  }, []);

  useEffect(() => {
    if (isOpen) loadAnomalies();
  }, [isOpen, loadAnomalies]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header avec statistiques */}
        <div className="p-6 border-b bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Gestion des Anomalies</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Statistiques rapides */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 shadow-sm border border-amber-200">
              <div className="text-2xl font-bold text-amber-700">{stats.enAttente}</div>
              <div className="text-xs text-amber-600">En attente</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 shadow-sm border border-green-200">
              <div className="text-2xl font-bold text-green-700">{stats.validees}</div>
              <div className="text-xs text-green-600">Validées</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 shadow-sm border border-red-200">
              <div className="text-2xl font-bold text-red-700">{stats.refusees}</div>
              <div className="text-xs text-red-600">Refusées</div>
            </div>
          </div>
        </div>

        {/* Filtres compacts */}
        <div className="px-6 py-3 border-b bg-white flex gap-3 items-center">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="en_attente">En attente</option>
            <option value="validee">Validées</option>
            <option value="refusee">Refusées</option>
            <option value="tous">Toutes</option>
          </select>
          
          <select
            value={selectedEmploye}
            onChange={(e) => setSelectedEmploye(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="tous">Tous les employés</option>
            {employes.map(emp => (
              <option key={emp.id} value={emp.id}>
                {formatEmployeeName(emp)}
              </option>
            ))}
          </select>

          <button
            onClick={loadAnomalies}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm hover:shadow flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>

        {/* Liste des anomalies */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : anomalies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune anomalie trouvée pour les critères sélectionnés
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anomalie) => {
                const employe = employes.find(e => e.id === anomalie.employeId);
                const statusColors = {
                  en_attente: 'bg-amber-50 border-amber-200',
                  validee: 'bg-green-50 border-green-200',
                  refusee: 'bg-red-50 border-red-200',
                  traitee: 'bg-blue-50 border-blue-200'
                };

                const details = getAnomalieDetails(anomalie);
                const statusBadge = {
                  en_attente: { Icon: AlertCircle, label: 'En attente', color: 'bg-amber-100 text-amber-800' },
                  validee: { Icon: CheckCircle, label: 'Validée', color: 'bg-green-100 text-green-800' },
                  refusee: { Icon: XCircle, label: 'Refusée', color: 'bg-red-100 text-red-800' },
                  corrigee: { Icon: RefreshCw, label: 'Corrigée', color: 'bg-blue-100 text-blue-800' }
                }[anomalie.statut] || { Icon: AlertTriangle, label: anomalie.statut, color: 'bg-gray-100 text-gray-800' };

                return (
                  <div key={anomalie.id} className={`border rounded-xl p-4 ${statusColors[anomalie.statut] || 'bg-gray-50 border-gray-200'} hover:shadow-md transition-shadow`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* En-t�te */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-lg">
                            {employe ? formatEmployeeName(employe) : `Employé #${anomalie.employeId}`}
                          </span>
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar size={12} /> {new Date(anomalie.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusBadge.color}`}>
                            <statusBadge.Icon size={12} /> {statusBadge.label}
                          </span>
                          {anomalie.gravite === 'critique' && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                              <AlertTriangle size={12} /> Critique
                            </span>
                          )}
                        </div>
                        
                        {/* Type et description */}
                        <div className="text-sm text-gray-700 mb-2">
                          <span className="font-medium">{anomalie.type.replace(/_/g, ' ')}</span>
                          <span className="text-gray-500 mx-2">•</span>
                          <span className="text-gray-600">{anomalie.description}</span>
                        </div>

                        {/* Heures manquantes */}
                        {details && (
                          <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-full text-xs font-medium">
                            <Timer className="w-3 h-3" />
                            <span>{details.heures.toFixed(2)}h ({details.minutes} min)</span>
                          </div>
                        )}

                        {/* Commentaire manager */}
                        {anomalie.commentaireManager && (
                          <div className="mt-2 p-2 bg-white/60 rounded-lg border border-gray-200 text-sm">
                            <span className="font-medium text-gray-700"><FileText className="w-3 h-3 inline mr-1" /></span>
                            <span className="text-gray-600">{anomalie.commentaireManager}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {anomalie.statut === 'en_attente' && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => setSelectedAnomalie(anomalie)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow hover:shadow-lg whitespace-nowrap flex items-center gap-2"
                          >
                            <ClipboardList className="w-4 h-4" /> Traiter
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleQuickAction(anomalie.id, 'valider')}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-all flex items-center justify-center"
                              title="Validation rapide"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleQuickAction(anomalie.id, 'refuser')}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition-all flex items-center justify-center"
                              title="Refus rapide"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {anomalies.length > 0 ? (
              <span>
                <strong>{anomalies.length}</strong> anomalie{anomalies.length > 1 ? 's' : ''} trouvée{anomalies.length > 1 ? 's' : ''}
                {stats.enAttente > 0 && (
                  <span className="ml-2 text-amber-600 font-medium">
                    • {stats.enAttente} à traiter
                  </span>
                )}
              </span>
            ) : (
              <span>Aucune anomalie</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition font-medium"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Modal d�taill� pour traiter l'anomalie avec toutes les options */}
      {selectedAnomalie && (
        <AnomalieActionModal
          anomalie={selectedAnomalie}
          onClose={() => setSelectedAnomalie(null)}
          onSuccess={async () => {
            setSelectedAnomalie(null);
            await loadAnomalies();
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

export default function PlanningRH() {
  // Hook pour les remplacements en attente (badge)
  const { enAttente: remplacementsEnAttente, refresh: refreshRemplacements } = useRemplacementsNotification();
  
  // Panneau lat�ral remplacements
  const [showRemplacementsPanel, setShowRemplacementsPanel] = useState(false);
  
  // Panneau lat�ral extras
  const [showExtrasPanel, setShowExtrasPanel] = useState(false);
  
  // Panneau anomalies
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  // Fermer les modales avec �chap
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showRemplacementsPanel) setShowRemplacementsPanel(false);
        if (showExtrasPanel) setShowExtrasPanel(false);
        if (showAdminPanel) setShowAdminPanel(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showRemplacementsPanel, showExtrasPanel, showAdminPanel]);
  
  // R�cup�ration de la vue sauvegard�e ou "semaine" par d�faut
  const getInitialViewType = () => {
    const savedViewType = localStorage.getItem('planningRH_viewType');
    return savedViewType && ['jour', 'semaine', 'mois'].includes(savedViewType) ? savedViewType : 'semaine';
  };

  // R�cup�ration de la date sauvegard�e ou date actuelle par d�faut
  const getInitialDate = () => {
    const savedDate = localStorage.getItem('planningRH_currentDate');
    return savedDate ? new Date(savedDate) : new Date();
  };

  // Initialisation des dates selon la vue sauvegard�e
  const getInitialDates = () => {
    const initialDate = getInitialDate();
    const initialViewType = getInitialViewType();
    
    switch (initialViewType) {
      case 'jour':
        return generateDayDates(initialDate);
      case 'mois':
        return generateMonthDates(initialDate);
      case 'semaine':
      default:
        return generateWeekDates(initialDate);
    }
  };

  const [viewType, setViewType] = useState(getInitialViewType());
  const [dateCourante, setDateCourante] = useState(getInitialDate());
  const [dates, setDates] = useState(getInitialDates());

  // Sauvegarde automatique de la date courante (utiliser la fonction standardis�e)
  useEffect(() => {
    localStorage.setItem('planningRH_currentDate', dateCourante.toISOString());
  }, [dateCourante]);

  // Sauvegarde automatique de la vue courante
  useEffect(() => {
    localStorage.setItem('planningRH_viewType', viewType);
  }, [viewType]);
  
  const [employes, setEmployes] = useState([]);
  const [shifts, setShifts] = useState([]);
  // Barre de recherche employ�s
  const [searchTerm, setSearchTerm] = useState("");
  // �tat pour le menu mobile responsive
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Filtrage par cat�gorie d'employ�
  const [categorieFilter, setCategorieFilter] = useState("tous");
  const [categorieDropdownOpen, setCategorieDropdownOpen] = useState(false);
  const categorieDropdownRef = useRef(null);
  
  // Mapping des ic�nes par type de cat�gorie
  const categoryIconMap = {
    list: List,
    pizza: Pizza,
    pasta: Soup,
    clipboard: ClipboardList,
    spray: SprayCan,
    shield: ShieldCheck,
    star: Star,
    users: Users,
    laptop: Laptop
  };
  
  // Fonction pour obtenir le composant ic�ne d'une cat�gorie
  const getCategoryIcon = (iconType, className = "w-3.5 h-3.5") => {
    const IconComponent = categoryIconMap[iconType];
    if (!IconComponent) return null;
    return <IconComponent className={className} strokeWidth={2} />;
  };
  
  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categorieDropdownRef.current && !categorieDropdownRef.current.contains(event.target)) {
        setCategorieDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Obtenir la cat�gorie s�lectionn�e
  const selectedCategorie = CATEGORIES.find(c => c.value === categorieFilter) || CATEGORIES[0];
  
  // Fonction pour obtenir la cat�gorie d'un employ� (utilise la fonction centralis�e)
  const getCategorieEmploye = getCategorieEmployeUtil;
  
  // Filtrage des employ�s selon le terme de recherche ET la cat�gorie
  const filteredEmployes = useMemo(() => {
    let filtered = employes;
    
    // Filtrer par terme de recherche
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(e => {
        const nom = (e.nom || "").toLowerCase();
        const prenom = (e.prenom || "").toLowerCase();
        const categorie = (e.categorie || "").toLowerCase();
        const email = (e.email || "").toLowerCase();
        return (
          nom.includes(term) ||
          prenom.includes(term) ||
          `${prenom} ${nom}`.includes(term) ||
          categorie.includes(term) ||
          email.includes(term)
        );
      });
    }
    
    // Filtrer par cat�gorie
    if (categorieFilter !== "tous") {
      filtered = filtered.filter(e => {
        const categorie = getCategorieEmploye(e);
        return categorie.label.toLowerCase() === categorieFilter.toLowerCase();
      });
    }
    
    // Trier par cat�gorie puis par nom
    return filtered.sort((a, b) => {
      const catA = getCategorieEmploye(a).label;
      const catB = getCategorieEmploye(b).label;
      if (catA !== catB) return catA.localeCompare(catB);
      return `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`);
    });
  }, [employes, searchTerm, categorieFilter]);

  // Groupement des employ�s par cat�gorie pour l'affichage avec s�parateurs
  const employesGroupesParCategorie = useMemo(() => {
    if (!filteredEmployes.length) return [];
    
    const groupes = [];
    let currentCategorie = null;
    let currentGroup = [];
    
    filteredEmployes.forEach(employe => {
      const categorie = getCategorieEmploye(employe);
      
      if (categorie.label !== currentCategorie) {
        // Nouveau groupe : sauvegarder le pr�c�dent et commencer un nouveau
        if (currentGroup.length > 0) {
          groupes.push({
            categorie: currentCategorie,
            employes: currentGroup,
            infosCategorie: getCategorieEmploye(currentGroup[0])
          });
        }
        currentCategorie = categorie.label;
        currentGroup = [employe];
      } else {
        // M�me cat�gorie : ajouter � l'groupe actuel
        currentGroup.push(employe);
      }
    });
    
    // Ajouter le dernier groupe
    if (currentGroup.length > 0) {
      groupes.push({
        categorie: currentCategorie,
        employes: currentGroup,
        infosCategorie: getCategorieEmploye(currentGroup[0])
      });
    }
    
    return groupes;
  }, [filteredEmployes]);
  
  const [conges, setConges] = useState([]);
  
  // �tats pour la notification de restauration de navigation
  const [showRestoreNotification, setShowRestoreNotification] = useState(false);
  const [restoreNotificationData, setRestoreNotificationData] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [creationRapideModalOpen, setCreationRapideModalOpen] = useState(false);
  const [showComparaison, setShowComparaison] = useState(false); // Nouvel �tat pour la comparaison
  const [updateTrigger, setUpdateTrigger] = useState(0); // Forcer le rafra�chissement des composants
  // Mode compact supprim� - affichage unique optimis�
  const [expandedEmployees, setExpandedEmployees] = useState(new Set()); // lignes agrandies
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false); // Barre flottante
  const [comparaisons, setComparaisons] = useState([]); // Donn�es de comparaison
  const [loadingComparaison, setLoadingComparaison] = useState(false);
  
  // �tat pour le rapport d'heures employ�
  const [rapportEmployeId, setRapportEmployeId] = useState(null);
  
  // �tat pour le panneau de score d'assiduit�
  const [scoreEmployeData, setScoreEmployeData] = useState(null); // { id, nom, prenom }
  
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null); // Pour afficher des notifications
  
  // ?? �tats pour la gestion des anomalies
  const [anomaliesData, setAnomaliesData] = useState({}); // employeId_date -> anomalies[]
  const [anomalieSelectionnee, setAnomalieSelectionnee] = useState(null); // Anomalie en cours de traitement
  // showAdminPanel d�clar� plus haut avec les autres modales
  
  // �tat pour le panneau de debug (seulement en d�veloppement)  
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Hooks pour la gestion des anomalies
  const { syncAnomaliesFromComparison } = useSyncAnomalies();
  
  // Hook pour les notifications Toast
  const { showToast, ToastContainer } = useToast();
  
  // �tat pour les privil�ges administrateur
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  // Filtres avanc�s pour afficher les �l�ments qui int�ressent l'admin
  // Ancien �tat de filtres supprim� (non utilis�) pour all�ger le composant

  // Fermer le menu mobile lors des changements de vue ou navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [viewType, dateCourante]);

  // Gestion de la barre flottante au scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const shouldShow = scrollY > 200; // Appara�t apr�s 200px de scroll
      setShowFloatingToolbar(shouldShow);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // V�rifier si la position a �t� restaur�e (seulement au premier rendu)
  useEffect(() => {
    const checkNavigationRestore = () => {
      const savedDate = localStorage.getItem('planningRH_currentDate');
      const savedViewType = localStorage.getItem('planningRH_viewType');
      const lastVisit = localStorage.getItem('planningRH_lastVisit');
      
      // Si nous avons des donn�es sauvegard�es et qu'elles ne correspondent pas aux valeurs par d�faut
      const now = new Date();
      const isDateRestored = savedDate && new Date(savedDate).toDateString() !== now.toDateString();
      const isViewRestored = savedViewType && savedViewType !== 'semaine';
      
      if ((isDateRestored || isViewRestored) && lastVisit) {
        const lastVisitDate = new Date(lastVisit);
        const sessionDuration = (now - lastVisitDate) / (1000 * 60); // en minutes
        
        // Afficher la notification seulement si la session est r�cente (moins de 7 jours)
        if (sessionDuration < 10080) { // 7 jours en minutes
          setRestoreNotificationData({
            date: savedDate || now.toISOString(),
            viewType: savedViewType || 'semaine',
            sessionDuration
          });
          setShowRestoreNotification(true);
        }
      }
      
      // Mettre � jour la derni�re visite
      localStorage.setItem('planningRH_lastVisit', now.toISOString());
    };

    checkNavigationRestore();
  }, []); // Ex�cuter seulement au montage

  // Correction: S'assurer que le token est bien r�cup�r� et disponible
  const token = localStorage.getItem("token");
  console.log("PlanningRH - Token disponible:", token ? "Oui" : "Non");
  
  // Fonction utilitaire pour formater les noms des employ�s de fa�on coh�rente
  const formatEmployeeName = useCallback((emp) => {
    if (!emp) return 'Employé inconnu';
    const prenom = emp.prenom?.trim();
    const nom = emp.nom?.trim();
    if (prenom && nom) return `${prenom} ${nom}`;
    if (nom) return nom;
    if (prenom) return prenom;
    if (emp.email) return emp.email;
    return 'Employé sans nom';
  }, []);
  
  // Fonction pour obtenir les initiales d'un employ�
  const getEmployeeInitials = (emp) => {
    if (!emp) return '?';
    const prenom = emp.prenom?.trim();
    const nom = emp.nom?.trim();
    if (prenom && nom) return `${prenom[0]}${nom[0]}`.toUpperCase();
    if (nom) return nom[0].toUpperCase();
    if (prenom) return prenom[0].toUpperCase();
    if (emp.email) return emp.email[0].toUpperCase();
    return '?';
  };
  
  // Effet pour g�rer la disparition automatique des notifications
  useEffect(() => {
    if (notification && notification.duration) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, notification.duration);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fonction globale pour les notifications depuis les fonctions externes
  useEffect(() => {
    window.showNotificationGlobal = (message, type, duration = 5000) => {
      setNotification({ message, type, duration });
    };
    
    // Nettoyage au d�montage du composant
    return () => {
      delete window.showNotificationGlobal;
    };
  }, []);

  // V�rifier les privil�ges utilisateur au chargement
  useEffect(() => {
    const checkUserPrivileges = async () => {
      try {
        const doFetch = async (url) => fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // 1. Essayer d'abord /auth/profile
        let response = await doFetch(buildApiUrl('/auth/profile'));

        // Si 404 (souvent utilisateur supprim� apr�s reset), tenter /user/profile
        if (response.status === 404) {
          console.warn('Profil non trouv� via /auth/profile (404). Tentative /user/profile ...');
          const alt = await doFetch(buildApiUrl('/user/profile'));
          if (alt.ok) {
            response = alt;
          } else if (alt.status === 404) {
            // Cas typique: base r�initialis�e, token pointe vers un ancien user
            console.warn('Utilisateur inexistant (base r�initialis�e). Nettoyage session.');
            localStorage.removeItem('token');
            setIsAdmin(false);
            setUserRole(null);
            setNotification({
              type: 'warning',
              message: 'Session expirée après réinitialisation des données. Merci de vous reconnecter.'
            });
            return; // Stop ici
          }
        }

        if (response.ok) {
          const userData = await response.json();
          console.log('?? Donn�es utilisateur r�cup�r�es:', userData);
          setUserRole(userData.role);
          const isAdminUser = ['admin', 'manager'].includes(userData.role);
          setIsAdmin(isAdminUser);
          console.log('?? Privil�ges:', { role: userData.role, isAdmin: isAdminUser });
        } else if (response.status === 401) {
          console.warn('Token invalide ou expir� (401). Nettoyage.');
          localStorage.removeItem('token');
          setIsAdmin(false);
          setUserRole(null);
        } else {
          console.warn('Erreur lors de la r�cup�ration du profil:', response.status, response.statusText);
          setIsAdmin(false);
          setUserRole('employee');
        }
      } catch (error) {
        console.warn('Impossible de r�cup�rer les privil�ges utilisateur:', error);
        // Par d�faut, consid�rer comme utilisateur normal en cas d'erreur
        setIsAdmin(false);
        setUserRole('employee');
      }
    };

    if (token) {
      checkUserPrivileges();
    } else {
      // Si pas de token, r�initialiser les privil�ges
      setIsAdmin(false);
      setUserRole(null);
    }
  }, [token]);

  // Fonction pour v�rifier si une modification n�cessite des privil�ges administrateur
  const requiresAdminPrivileges = useCallback((shift, originalShift = null) => {
    if (!originalShift && !shift) return { required: false };

    console.log('?? V�rification privil�ges admin:', { shift, originalShift });

    // Nouvelles cr�ations de shifts hors plage normale (avant 6h ou apr�s 23h)
    if (!originalShift && Array.isArray(shift.segments)) {
      const hasOffHoursSegments = shift.segments.some(segment => {
        const startHour = parseInt(segment.start?.split(':')[0] || '0');
        const endHour = parseInt(segment.end?.split(':')[0] || '0');
        const isOffHours = startHour < 6 || endHour > 23 || (endHour === 0 && segment.end !== '00:00');
        
        if (isOffHours) {
          console.log('?? Segment hors plage détecté:', segment, { startHour, endHour });
        }
        
        return isOffHours;
      });
      
      if (hasOffHoursSegments) {
        return {
          required: true,
          reason: 'HORS_PLAGE',
          message: 'Les créneaux en dehors des heures normales (6h-23h) nécessitent une validation administrative'
        };
      }
    }

    // Modifications de shifts existants avec heures suppl�mentaires
    if (originalShift && Array.isArray(shift.segments) && Array.isArray(originalShift.segments)) {
      const originalDuration = originalShift.segments.reduce((acc, seg) => {
        const start = new Date(`1970-01-01T${seg.start}:00`);
        const end = new Date(`1970-01-01T${seg.end}:00`);
        return acc + (end - start) / (1000 * 60 * 60);
      }, 0);

      const newDuration = shift.segments.reduce((acc, seg) => {
        const start = new Date(`1970-01-01T${seg.start}:00`);
        const end = new Date(`1970-01-01T${seg.end}:00`);
        return acc + (end - start) / (1000 * 60 * 60);
      }, 0);

      const hoursDifference = Math.abs(newDuration - originalDuration);
      
      if (hoursDifference > 2) {
        console.log('?? Modification importante d\'heures d�tect�e:', { originalDuration, newDuration, hoursDifference });
        return {
          required: true,
          reason: 'MODIFICATION_IMPORTANTE',
          message: `Modification importante des heures (+${hoursDifference.toFixed(1)}h) nécessite une validation administrative`
        };
      }
    }

    // Création/modification de créneaux extra
    if (Array.isArray(shift.segments) && shift.segments.some(seg => seg.isExtra)) {
      console.log('?? Créneaux extra détectés');
      return {
        required: true,
        reason: 'HEURES_EXTRA',
        message: 'Les heures supplémentaires nécessitent une validation administrative'
      };
    }

    return { required: false };
  }, []);

  // Fonction pour valider une anomalie avec contr�les administrateur
  const validateAnomalieWithAdminCheck = useCallback(async (employeId, date, ecart, action) => {
    // Types d'anomalies n�cessitant des privil�ges administrateur
    const adminRequiredTypes = ['hors_plage', 'heures_sup', 'presence_non_prevue'];
    const criticalActions = ['validate', 'convert_to_extra', 'delete_pointage'];
    
    if ((adminRequiredTypes.includes(ecart.type) || criticalActions.includes(action)) && !isAdmin) {
      setNotification({
        type: 'error',
        message: 'Action non autorisée : privilèges administrateur requis pour ce type d\'anomalie',
        duration: 5000
      });
      return false;
    }

    return true;
  }, [isAdmin]);

  // Fonction r�utilisable pour recharger les shifts
  const refreshShifts = useCallback(async (silentMode = false) => {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) return false;
    
    try {
      console.log("D�but du rechargement des shifts...");
      
      // Assurer qu'aucun filtre de date n'est appliqu� pour r�cup�rer tous les shifts
      const response = await axios.get(buildApiUrl('/shifts'), {
        headers: { Authorization: `Bearer ${currentToken}` },
        // Ne pas filtrer par date pour r�cup�rer tous les shifts, y compris les nouveaux
        params: {}
      });
      
      console.log(`${response.data.length} shifts r�cup�r�s du serveur`);
      
      // Assurons-nous que les dates sont correctement format�es pour la comparaison
      const formattedShifts = response.data.map(shift => {
        // Traitement sp�cial pour les dates
        let formattedDate;
        
        if (shift.date) {
          try {
            // Si c'est d�j� une cha�ne ISO, la garder telle quelle
            if (typeof shift.date === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(shift.date)) {
              formattedDate = shift.date;
            }
            // Si c'est juste une date (YYYY-MM-DD), la convertir en ISO
            else if (typeof shift.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(shift.date)) {
              formattedDate = new Date(shift.date + 'T00:00:00.000Z').toISOString();
            }
            // Pour tout autre format, essayer une conversion standard
            else {
              const dateObj = new Date(shift.date);
              formattedDate = dateObj.toISOString();
            }
          } catch (e) {
            console.error("Erreur lors du formatage de la date:", shift.date);
            formattedDate = null;
          }
        }
        
        return {
          ...shift,
          date: formattedDate,
          // Normaliser le type pour �viter les valeurs undefined/null
          type: shift.type || "travail",
          // Normaliser les autres champs critiques
          motif: shift.motif || "",
          segments: shift.segments || []
        };
      });
      
      console.log("Shifts format�s:", formattedShifts);
      setShifts(formattedShifts);
      return true;
    } catch (err) {
      console.error("Erreur lors du rechargement des shifts:", err);
      if (!silentMode) {
        showToast("Impossible de rafraîchir les données des shifts", "error", 4000);
      }
      return false;
    }
  }, [showToast]);

  // Fonction pour charger les donn�es de comparaison planning vs r�alit�
  const loadComparaisons = useCallback(async () => {
    setLoadingComparaison(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Calculer la plage de dates bas�e sur la vue actuelle
      let dateDebut, dateFin;
      
      if (viewType === 'jour') {
        dateDebut = dateFin = dates[0] ? toLocalDateString(dates[0]) : null;
      } else if (viewType === 'semaine') {
        dateDebut = dates[0] ? toLocalDateString(dates[0]) : null;
        dateFin = dates[6] ? toLocalDateString(dates[6]) : null;
      } else { // mois
        const firstDay = new Date(dateCourante.getFullYear(), dateCourante.getMonth(), 1);
        const lastDay = new Date(dateCourante.getFullYear(), dateCourante.getMonth() + 1, 0);
        dateDebut = toLocalDateString(firstDay);
        dateFin = toLocalDateString(lastDay);
      }



      // R�cup�rer les comparaisons pour tous les employ�s de la p�riode
      const allComparaisons = [];
      
      for (const employe of employes) {
        try {
          const params = new URLSearchParams({
            employeId: employe.id.toString(),
            dateDebut,
            dateFin
          });

          const response = await axios.get(
            buildApiUrl(`/api/comparison/planning-vs-realite?${params}`),
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (response.data.success && response.data.comparaisons.length > 0) {
            allComparaisons.push(...response.data.comparaisons);
          }
        } catch (err) {
          console.warn(`Erreur comparaison pour employ� ${employe.id}:`, err);
        }
      }
      // --- Reconciliation des statuts trait�s localement pour emp�cher la r�apparition des boutons ---
      // Utiliser localStorage pour persister les statuts trait�s m�me apr�s refresh
      let processedMap = {};
      try {
        const stored = localStorage.getItem('processedAnomalies');
        if (stored) {
          processedMap = JSON.parse(stored);
          console.log('?? Cache localStorage lu:', Object.keys(processedMap).length, 'anomalies trait�es');
        }
      } catch (e) {
        console.warn('Erreur lecture processedAnomalies du localStorage:', e);
        processedMap = {};
      }

      const now = Date.now();
      const TTL = 30 * 60 * 1000; // 30 min (nettoyage automatique) 
      const beforeCleanup = Object.keys(processedMap).length;
      // Nettoyer les entr�es expir�es
      Object.keys(processedMap).forEach(id => { 
        if (now - processedMap[id].updatedAt > TTL) {
          delete processedMap[id]; 
        }
      });
      const afterCleanup = Object.keys(processedMap).length;
      if (beforeCleanup !== afterCleanup) {
        console.log('?? Cache nettoy�:', beforeCleanup, '->', afterCleanup, 'entr�es');
      }
      
      // Sauvegarder le cache nettoy�
      try {
        localStorage.setItem('processedAnomalies', JSON.stringify(processedMap));
      } catch (e) {
        console.warn('Erreur sauvegarde processedAnomalies:', e);
      }
      
      // Fallback pour compatibilit�
      window.__processedAnomalies = processedMap;

      console.log('?? D�but r�conciliation comparaisons...', allComparaisons.length, 'comparaisons');
      console.log('?? Donn�es disponibles:', {
        processedMapKeys: Object.keys(processedMap),
        anomaliesDataKeys: Object.keys(anomaliesData || {}),
        comparaisonsCount: allComparaisons.length
      });

      const reconciled = allComparaisons.map(comp => {
        const dateKey = comp.date?.slice(0,10);
        // R�cup�rer les anomalies d�j� en cache pour la cl� employe/date
        const key = `${comp.employeId}_${dateKey}`;
        const anomaliesList = (anomaliesData && anomaliesData[key]) || [];
        const anomaliesById = {};
        anomaliesList.forEach(a => { anomaliesById[a.id] = a; });
        
        console.log(`?? R�conciliation ${key}:`, {
          ecartsCount: comp.ecarts?.length || 0,
          anomaliesCount: anomaliesList.length,
          anomaliesIds: anomaliesList.map(a => ({ id: a.id, type: a.type, statut: a.statut }))
        });
        
        return {
          ...comp,
          ecarts: (comp.ecarts||[]).map(ec => {
            let modified = { ...ec };
            const treatedStatuses = ['validee','refusee','corrigee'];
            const originalStatus = modified.statut;
            
            // 1. Override via processedMap (actions locales récentes)
            if (ec.anomalieId && processedMap[ec.anomalieId]) {
              modified.statut = processedMap[ec.anomalieId].statut;
              modified.statutMisAJour = true;
              console.log(`? écart réconcilié via processedMap: anomalie ${ec.anomalieId} -> ${modified.statut}`);
            }
            // 2. Override via anomaliesData (cache anomalies) si statut final absent ou diff�rent
            else if (ec.anomalieId && anomaliesById[ec.anomalieId] && treatedStatuses.includes(anomaliesById[ec.anomalieId].statut)) {
              if (modified.statut !== anomaliesById[ec.anomalieId].statut) {
                modified.statut = anomaliesById[ec.anomalieId].statut;
                modified.statutMisAJour = true;
                console.log(`? écart réconcilié via anomaliesData: anomalie ${ec.anomalieId} -> ${modified.statut}`);
              }
            }
            // 3. Heuristique si pas anomalieId: essayer de lier à une anomalie traitée de même type
            else if (!ec.anomalieId || !treatedStatuses.includes(modified.statut)) {
              const match = anomaliesList.find(a => treatedStatuses.includes(a.statut) && (
                a.type === ec.type ||
                (a.type?.includes('retard') && ec.type?.includes('retard')) ||
                (a.type?.includes('hors_plage') && ec.type?.includes('hors_plage')) ||
                (a.type?.includes('heures_sup') && ec.type?.includes('heures_sup')) ||
                (a.type?.includes('depart') && ec.type?.includes('depart'))
              ));
              if (match) {
                modified.anomalieId = modified.anomalieId || match.id;
                modified.statut = match.statut;
                modified.statutMisAJour = true;
                console.log(`?? écart lié par heuristique: ${ec.type} -> anomalie ${match.id} (${match.statut})`);
              } else if (!treatedStatuses.includes(originalStatus)) {
                console.log(`?? écart non réconcilié: ${ec.type}, anomalieId: ${ec.anomalieId}, statut: ${originalStatus}`);
              }
            }
            
            return modified;
          })
        };
      });

      setComparaisons(reconciled);
    } catch (err) {
      console.error("? Erreur chargement comparaisons:", err);
      setNotification({
        type: "error",
        message: "Erreur lors du chargement des comparaisons",
        duration: 5000
      });
    } finally {
      setLoadingComparaison(false);
    }
  }, [viewType, dates, dateCourante, employes, anomaliesData]);

  // ?? Stats des comparaisons pour le badge du bouton
  const comparaisonStats = useMemo(() => {
    if (!comparaisons.length) return { total: 0, retards: 0, absences: 0, heuresSup: 0, nonPlanifies: 0, departsAnticipes: 0, critiques: 0, nonTraitees: 0 };
    
    let total = 0;
    let retards = 0;
    let absences = 0;
    let heuresSup = 0;
    let nonPlanifies = 0;
    let departsAnticipes = 0;
    let critiques = 0;
    let nonTraitees = 0;
    
    comparaisons.forEach(comp => {
      if (comp.ecarts && comp.ecarts.length > 0) {
        comp.ecarts.forEach(ecart => {
          const type = ecart.type || '';
          const gravite = ecart.gravite || '';
          const statut = ecart.statut || 'en_attente';
          
          // Ignorer les types "ok" / "info" / "acceptable"
          if (type.includes('acceptable') || type.includes('_ok') || type.includes('conforme') || gravite === 'ok' || gravite === 'info') {
            return;
          }
          
          total++;
          
          // Comptage par cat�gorie
          if (type.includes('retard')) retards++;
          if (type.includes('absence') || type.includes('segment_non_pointe') || type.includes('missing_')) absences++;
          if (type.includes('heures_sup') || type === 'hors_plage_out_critique') heuresSup++;
          if (type.includes('presence_non_prevue') || type.includes('unscheduled') || type.includes('pointage_hors_planning')) nonPlanifies++;
          if (type.includes('depart_premature') || type.includes('depart_anticipe')) departsAnticipes++;
          if (gravite === 'critique' || type.includes('_critique')) critiques++;
          if (statut === 'en_attente' && gravite !== 'ok' && gravite !== 'info') nonTraitees++;
        });
      }
    });
    
    return { total, retards, absences, heuresSup, nonPlanifies, departsAnticipes, critiques, nonTraitees };
  }, [comparaisons]);

  // Fonction helper pour r�cup�rer les �carts d'un employ� pour une date donn�e
  const getEcartsForEmployeeDate = useCallback((employeId, date) => {
    console.log(`?? getEcartsForEmployeeDate appel�: employeId=${employeId}, date=${date}`);
    // DEBUG: Afficher l'�tat de la comparaison
    if (showComparaison && comparaisons.length === 0) {
      console.warn(`?? Mode comparaison activ� mais aucune donn�e charg�e! (${comparaisons.length} comparaisons)`);
    }
    
    if (!showComparaison || !comparaisons.length) return [];
    
    // Normaliser la date au format YYYY-MM-DD
    let dateStr;
    if (date instanceof Date) {
      dateStr = formatDate(date); // Utilise la fonction formatDate existante
    } else {
      dateStr = date.toString().slice(0, 10);
    }
    
    const comparaison = comparaisons.find(c => 
      c.employeId === employeId && c.date === dateStr
    );
    
    if (!comparaison) return [];
    
    // Enrichir les �carts avec les heures r�elles depuis comparaison.reel
    const ecartsEnrichis = comparaison.ecarts.map(ecart => {
      const enrichi = { ...ecart };
      
      // Trouver le segment r�el correspondant
      if (comparaison.reel && comparaison.reel.length > 0) {
        const segmentIndex = (ecart.segment || 1) - 1;
        const reelSegment = comparaison.reel[segmentIndex];
        
        if (reelSegment) {
          enrichi.heureArriveeReelle = reelSegment.arrivee;
          enrichi.heureDepartReelle = reelSegment.depart;
        }
      }
      
      return enrichi;
    });
    
    return ecartsEnrichis;
  }, [showComparaison, comparaisons, updateTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fonction helper pour formater l'affichage d'un �cart - VERSION EXPLICITE avec nouveaux bar�mes et statuts
  const formatEcart = useCallback((ecart) => {
    console.log(`?? formatEcart appel�:`, { type: ecart.type, gravite: ecart.gravite, dureeMinutes: ecart.dureeMinutes });
    
    // Utilisation de updateTrigger comme d�pendance pour forcer le rafra�chissement
    // Debug: afficher le statut de l'�cart
    if (ecart.statut) {
      console.log(`?? Formatage �cart avec statut:`, ecart.type, ecart.statut);
    }
    
    // Gestion des statuts d'anomalies (si l'�cart a un statut)
    const getStatusConfig = (status, baseConfig) => {
      switch (status) {
        case 'validee':
          return {
            ...baseConfig,
            Icon: CheckCircle,
            label: `${baseConfig.label} - Validée`,
            color: 'text-green-700',
            bg: 'bg-green-100',
            badge: 'Validée',
            borderClass: 'border-green-400'
          };
        case 'refusee':
          return {
            ...baseConfig,
            Icon: XCircle,
            label: `${baseConfig.label} - Refusée`,
            color: 'text-red-700',
            bg: 'bg-red-100',
            badge: 'Refusée',
            borderClass: 'border-red-400'
          };
        case 'en_attente':
          return {
            ...baseConfig,
            badge: 'En attente',
            borderClass: 'border-amber-400 animate-pulse'
          };
        case 'traitee':
          return {
            ...baseConfig,
            Icon: RefreshCw,
            label: `${baseConfig.label} - Traitée`,
            color: 'text-blue-700',
            bg: 'bg-blue-100',
            badge: 'Traitée',
            borderClass: 'border-blue-400'
          };
        default:
          return baseConfig;
      }
    };

    const configs = {
      // ?? NOUVEAUX TYPES ARRIVÉE avec barème précis
      hors_plage_in: {
        Icon: CircleAlert,
        iconColor: 'text-purple-600',
        label: 'Hors-plage IN',
        color: 'text-purple-700',
        bg: 'bg-purple-100',
        badge: 'à valider'
      },
      arrivee_acceptable: {
        Icon: CheckCircle,
        iconColor: 'text-green-500',
        label: 'Arrivée OK',
        color: 'text-green-600',
        bg: 'bg-green-50'
      },
      retard_modere: {
        Icon: Clock,
        iconColor: 'text-yellow-500',
        label: 'Retard modéré',
        color: 'text-yellow-600',
        bg: 'bg-yellow-50'
      },
      retard_critique: {
        Icon: XCircle,
        iconColor: 'text-red-500',
        label: 'Retard critique',
        color: 'text-red-600',
        bg: 'bg-red-100'
      },
      retard: {
        Icon: AlarmClock,
        iconColor: 'text-red-500',
        label: 'Retard',
        color: 'text-red-600',
        bg: 'bg-red-50'
      },
      
      // ?? NOUVEAUX TYPES DÉPART avec barème précis
      depart_premature_critique: {
        Icon: LogOut,
        iconColor: 'text-red-600',
        label: 'Départ critique',
        color: 'text-red-700',
        bg: 'bg-red-100'
      },
      depart_anticipe: {
        Icon: LogOut,
        iconColor: 'text-yellow-500',
        label: 'Départ anticipé',
        color: 'text-yellow-600',
        bg: 'bg-yellow-50'
      },
      depart_acceptable: {
        Icon: CheckCircle,
        iconColor: 'text-green-500',
        label: 'Départ OK',
        color: 'text-green-600',
        bg: 'bg-green-50'
      },
      heures_supplementaires: {
        Icon: TrendingUp,
        iconColor: 'text-orange-500',
        label: 'H. supp',
        color: 'text-orange-600',
        bg: 'bg-orange-50'
      },
      // ?? NOUVEAUX TYPES HEURES SUPPLÉMENTAIRES - 3 ZONES
      heures_sup_auto_validees: {
        Icon: DollarSign,
        iconColor: 'text-emerald-500',
        label: 'H. sup auto',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        badge: 'Auto-validées'
      },
      heures_sup_a_valider: {
        Icon: AlertTriangle,
        iconColor: 'text-amber-500',
        label: 'H. sup',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        badge: 'à valider'
      },
      hors_plage_out_critique: {
        Icon: CircleAlert,
        iconColor: 'text-purple-600',
        label: 'Hors-plage OUT',
        color: 'text-purple-700',
        bg: 'bg-purple-100',
        badge: 'Critique'
      },
      hors_plage_out: {
        Icon: CircleAlert,
        iconColor: 'text-purple-600',
        label: 'Hors-plage OUT',
        color: 'text-purple-700',
        bg: 'bg-purple-100',
        badge: 'à valider'
      },
      
      // Types existants conservés pour compatibilité
      arrivee_anticipee: {
        Icon: CheckCircle,
        iconColor: 'text-green-500',
        label: 'En avance',
        color: 'text-green-600',
        bg: 'bg-green-50'
      },
      arrivee_a_l_heure: {
        Icon: Check,
        iconColor: 'text-emerald-500',
        label: 'Arrivée OK',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50'
      },
      depart_a_l_heure: {
        Icon: Check,
        iconColor: 'text-emerald-500',
        label: 'Départ OK',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50'
      },
      absence_totale: {
        Icon: XCircle,
        iconColor: 'text-red-500',
        label: 'Absent',
        color: 'text-red-600',
        bg: 'bg-red-50'
      },
      presence_non_prevue: {
        Icon: AlertCircle,
        iconColor: 'text-purple-500',
        label: 'Non prévu',
        color: 'text-purple-600',
        bg: 'bg-purple-50'
      },
      absence_planifiee_avec_pointage: {
        Icon: AlertTriangle,
        iconColor: 'text-red-600',
        label: 'Anomalie!',
        color: 'text-red-700',
        bg: 'bg-red-100'
      },
      absence_conforme: {
        Icon: CheckCircle,
        iconColor: 'text-green-500',
        label: 'Absence OK',
        color: 'text-green-600',
        bg: 'bg-green-50'
      }
    };
    
    const baseConfig = configs[ecart.type] || configs.presence_non_prevue;
    
    if (!configs[ecart.type]) {
      console.warn(`?? Type d'�cart non reconnu: "${ecart.type}" - utilisation de la config par d�faut`);
    } else {
      console.log(`? Config trouv�e pour type "${ecart.type}":`, { icon: baseConfig.icon, label: baseConfig.label });
    }
    
    // Appliquer le statut si pr�sent (anomalies trait�es par l'admin)
    const finalConfig = ecart.statut ? getStatusConfig(ecart.statut, baseConfig) : baseConfig;
    
    return {
      ...finalConfig,
      minutes: Math.abs(ecart.dureeMinutes || 0),
      formattedTime: (() => {
        const minutes = Math.abs(ecart.dureeMinutes || 0);
        if (minutes === 0) return '';
        if (minutes < 60) return `${minutes}min`;
        const heures = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins === 0 ? `${heures}h` : `${heures}h${mins.toString().padStart(2, '0')}`;
      })(),
      // Informations suppl�mentaires pour les anomalies trait�es
      validatedBy: ecart.validatedBy,
      validatedAt: ecart.validatedAt,
      adminNote: ecart.adminNote
    };
  }, [updateTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // ?? Fonctions pour la gestion des anomalies
  
  // Synchroniser les anomalies apr�s calcul de comparaison
  // eslint-disable-next-line no-unused-vars
  const syncAnomaliesFromEcarts = useCallback(async (employeId, date, ecarts) => {
    if (!ecarts || ecarts.length === 0) return;
    
    // Filtrer les �carts significatifs qui doivent devenir des anomalies
    const ecartsSignificatifs = ecarts.filter(ecart => {
      return ecart.gravite !== 'info' && ecart.gravite !== 'ok' && 
             ecart.type !== 'absence_conforme' && ecart.type !== 'arrivee_acceptable' && 
             ecart.type !== 'depart_acceptable';
    });
    
    if (ecartsSignificatifs.length === 0) return;

    try {
      const result = await syncAnomaliesFromComparison(employeId, date, ecartsSignificatifs);
      
      // Mettre � jour le cache local des anomalies
      const key = `${employeId}_${date}`;
      setAnomaliesData(prev => ({
        ...prev,
        [key]: result.anomalies || []
      }));
      
      console.log(`?? ${result.anomaliesCreees} anomalies synchronis�es pour employ� ${employeId} le ${date}`);
      
    } catch (error) {
      console.error('Erreur sync anomalies:', error);
    }
  }, [syncAnomaliesFromComparison, setAnomaliesData]);

  // R�cup�rer les anomalies pour un employ�/date
  const getAnomaliesForEmployeeDate = useCallback((employeId, date) => {
    const key = `${employeId}_${date}`;
    return anomaliesData[key] || [];
  }, [anomaliesData]);

  // Mettre � jour le statut d'une anomalie localement (pour synchroniser avec le panneau)
  const updateAnomalieStatus = useCallback((employeId, date, anomalieId, newStatus, adminNote = null) => {
    console.log(`?? updateAnomalieStatus appel�:`, { employeId, date, anomalieId, newStatus, adminNote });
    
    const key = `${employeId}_${date}`;
    
    setAnomaliesData(prev => {
      const updatedData = { ...prev };
      
      if (updatedData[key]) {
        updatedData[key] = updatedData[key].map(anomalie => {
          if (anomalie.id === anomalieId) {
            return {
              ...anomalie,
              statut: newStatus,
              ...(adminNote && { adminNote }),
              dateTraitement: new Date().toISOString()
            };
          }
          return anomalie;
        });
      }
      
      return updatedData;
    });

  // Stocker statut trait� pour emp�cher la r�apparition des actions avant propagation backend
  // Utiliser localStorage pour persistance m�me apr�s refresh
  try {
    let processedMap = {};
    const stored = localStorage.getItem('processedAnomalies');
    if (stored) {
      processedMap = JSON.parse(stored);
    }
    
    processedMap[anomalieId] = { 
      statut: newStatus, 
      updatedAt: Date.now(),
      employeId: employeId,
      date: date
    };
    
    localStorage.setItem('processedAnomalies', JSON.stringify(processedMap));
    
    // Fallback pour compatibilit�
    if (!window.__processedAnomalies) window.__processedAnomalies = {};
    window.__processedAnomalies[anomalieId] = processedMap[anomalieId];
    
    console.log('? Statut anomalie sauvegard� localement:', { anomalieId, newStatus });
  } catch (e) {
    console.warn('Erreur sauvegarde statut anomalie:', e);
    // Fallback simple
    if (!window.__processedAnomalies) window.__processedAnomalies = {};
    window.__processedAnomalies[anomalieId] = { statut: newStatus, updatedAt: Date.now() };
  }
    
    // SYNCHRONISATION IMM�DIATE AVEC LES COMPARAISONS
    // Mettre � jour le statut des �carts correspondants dans les comparaisons
    setComparaisons(prev => {
      if (!prev || !prev.length) return prev;
      
      const newComp = [...prev];
      const dateStr = typeof date === 'string' ? date : formatDate(date);
      
      // Trouver la comparaison correspondante
      const compIndex = newComp.findIndex(c => 
        c.employeId === parseInt(employeId) && 
        formatDate(c.date) === formatDate(dateStr)
      );
      
      if (compIndex >= 0 && newComp[compIndex].ecarts) {
        // Marquer le statut de l'�cart dans la comparaison
        newComp[compIndex].ecarts = newComp[compIndex].ecarts.map(ecart => {
          // Si l'�cart a d�j� une anomalieId qui correspond
          if (ecart.anomalieId === anomalieId) {
            console.log(`?? Mise � jour directe �cart avec anomalieId ${anomalieId}:`, ecart.type, '->', newStatus);
            return {
              ...ecart,
              statut: newStatus,
              statutMisAJour: true,
              ...(adminNote && { adminNote })
            };
          }
          
          // Si l'�cart n'a pas d'anomalieId mais pourrait correspondre � cette anomalie
          // (recherche par type et caract�ristiques similaires)
          if (!ecart.anomalieId && !ecart.statut) {
            // Rechercher dans le cache des anomalies pour voir si cette anomalie correspond � cet �cart
            const anomalieCorrespondante = anomaliesData[key]?.find(a => 
              a.id === anomalieId && 
              (a.type === ecart.type || 
               (a.type?.includes('hors_plage') && ecart.type?.includes('hors_plage')) ||
               (a.type?.includes('heures_sup') && ecart.type?.includes('heures_sup')) ||
               (a.type?.includes('retard') && ecart.type?.includes('retard')) ||
               (a.type?.includes('depart') && ecart.type?.includes('depart')))
            );
            
            if (anomalieCorrespondante) {
              console.log(`?? Liaison �cart ${ecart.type} avec anomalie ${anomalieId}:`, newStatus);
              return {
                ...ecart,
                statut: newStatus,
                anomalieId: anomalieId,
                statutMisAJour: true,
                ...(adminNote && { adminNote })
              };
            }
          }
          
          return ecart;
        });
        
        console.log(`?? Comparaison mise � jour pour employ� ${employeId} le ${dateStr}:`, 
          newComp[compIndex].ecarts.filter(e => e.statut).length, '�carts avec statut');
      }
      
      return newComp;
    });
    
    // Forcer un rafra�chissement de l'UI en d�clenchant un �tat
    setUpdateTrigger(prev => prev + 1);
    
    console.log(`?? Anomalie ${anomalieId} mise � jour localement: ${newStatus}`);
  }, [setAnomaliesData, setComparaisons, anomaliesData]); // Ajout d'anomaliesData dans les d�pendances

  // G�rer le clic sur une anomalie
  // eslint-disable-next-line no-unused-vars
  const handleClickAnomalie = useCallback((employeId, date, anomalie) => {
    console.log('Clic sur anomalie:', { employeId, date, anomalie });
    setAnomalieSelectionnee(anomalie);
  }, [setAnomalieSelectionnee]);

  // Actions rapides sur les anomalies
  // eslint-disable-next-line no-unused-vars
  const handleActionRapideAnomalie = useCallback((employeId, date, anomalie, action) => {
    console.log('Action rapide anomalie:', { employeId, date, anomalie, action });
    
    if (action === 'extra') {
      // Convertir en heures suppl�mentaires
      setNotification({
        type: "info",
        message: "Conversion en heures supplémentaires en cours...",
        duration: 3000
      });
    } else if (action === 'error') {
      // Marquer comme erreur de pointage
      setNotification({
        type: "warning",
        message: "Pointage marqué comme erroné",
        duration: 3000
      });
    }
  }, [setNotification]);

  // Charger les anomalies de la p�riode affich�e
  const loadAnomaliesPeriode = useCallback(async () => {
    if (!dates.length) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Calculer la plage de dates
      const dateDebut = dates[0] ? toLocalDateString(dates[0]) : null;
      const dateFin = dates[dates.length - 1] ? toLocalDateString(dates[dates.length - 1]) : null;

      // R�cup�rer les anomalies pour tous les employ�s de la p�riode
      const params = new URLSearchParams({
        dateDebut,
        dateFin,
        limit: '1000' // Limite �lev�e pour r�cup�rer toutes les anomalies
      });

      const response = await axios.get(`${API_URL}/api/anomalies?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Organiser les anomalies par employeId_date
        const newAnomaliesData = {};
        response.data.anomalies.forEach(anomalie => {
          const key = `${anomalie.employeId}_${anomalie.date.split('T')[0]}`;
          if (!newAnomaliesData[key]) {
            newAnomaliesData[key] = [];
          }
          newAnomaliesData[key].push(anomalie);
        });

        setAnomaliesData(newAnomaliesData);
        console.log(`?? ${response.data.anomalies.length} anomalies charg�es`);
      }

    } catch (error) {
      console.error('Erreur chargement anomalies:', error);
      setNotification({
        type: "error",
        message: "Erreur lors du chargement des anomalies",
        duration: 5000
      });
    }
  }, [dates, setAnomaliesData, setNotification]);

  // Charger les anomalies quand on active l'affichage
  useEffect(() => {
    loadAnomaliesPeriode();
  }, [loadAnomaliesPeriode]);

  // Synchronisation p�riodique des statuts d'anomalies pour �viter les d�synchronisations
  useEffect(() => {
    if (!showComparaison) return;
    
    const syncInterval = setInterval(() => {
      console.log('?? Synchronisation p�riodique des statuts anomalies...');
      // Recharger les comparaisons pour avoir les statuts � jour
      loadComparaisons();
    }, 30000); // Toutes les 30 secondes
    
    return () => clearInterval(syncInterval);
  }, [showComparaison, loadComparaisons]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employesRes, shiftsRes, congesRes] = await Promise.all([
          axios.get(buildApiUrl('/admin/employes'), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(buildApiUrl('/shifts'), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(buildApiUrl('/admin/conges'), {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setEmployes(employesRes.data);
        setShifts(shiftsRes.data);
        // Debug: voir tous les cong�s re�us
        console.log("Cong�s re�us du backend:", congesRes.data);
        // Ne plus filtrer - garder tous les cong�s pour les afficher
        setConges(congesRes.data);
       } catch (err) {
        console.error("Erreur d�taill�e:", err.response?.data || err.message);
        setNotification({
          type: "error",
          message: `Erreur lors du chargement des données: ${err.message}`,
          duration: 10000
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  useEffect(() => {
    if (viewType === "jour") setDates(generateDayDates(dateCourante));
    else if (viewType === "semaine") setDates(generateWeekDates(dateCourante));
    else setDates(generateMonthDates(dateCourante));
  }, [viewType, dateCourante]);
  
  // D�bogage - Afficher les dates actuellement visibles
  useEffect(() => {
    console.log("Dates actuellement affich�es dans le planning:", 
      dates.map(d => d instanceof Date ? d.toISOString().slice(0, 10) : d));
    
    // Debug des cong�s charg�s
    if (conges.length > 0) {
      console.log("Cong�s charg�s dans le state:", conges);
      console.log("Nombre de cong�s:", conges.length);
    }
    
    // Debug des employ�s
    if (employes.length > 0) {
      console.log("Premiers employ�s:", employes.slice(0, 2));
    }
    
    // Afficher les shifts correspondant aux dates affich�es
    if (shifts.length > 0 && dates.length > 0) {
      const datesStr = dates.map(d => d instanceof Date ? d.toISOString().slice(0, 10) : d.slice(0, 10));
      const shiftsFiltered = shifts.filter(s => {
        const shiftDate = typeof s.date === 'string' ? s.date.slice(0, 10) : 
                         (s.date instanceof Date ? s.date.toISOString().slice(0, 10) : 
                         new Date(s.date).toISOString().slice(0, 10));
        return datesStr.includes(shiftDate);
      });
      console.log("Shifts correspondant aux dates affich�es:", shiftsFiltered);
    }
  }, [dates, shifts, conges, employes]);

  // Naviguer entre les semaines
  const goPrev = () => {
    const d = new Date(dateCourante);
    if (viewType === "jour") d.setDate(d.getDate() - 1);
    else if (viewType === "semaine") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setDateCourante(d);
  };
  const goNext = () => {
    const d = new Date(dateCourante);
    if (viewType === "jour") d.setDate(d.getDate() + 1);
    else if (viewType === "semaine") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setDateCourante(d);
  };
  const goToday = () => {
    const today = new Date();
    setDateCourante(today);
    // Nettoyer la notification si elle est affich�e
    if (showRestoreNotification) {
      setShowRestoreNotification(false);
    }
  };

  // Ouvrir la modale d'�dition (ajout start/end optionnels pour pr�remplissage)
  const handleCellClick = (employeId, dateStr, startGuess, endGuess) => {
    // V�rifier s'il y a un cong� pour cette date et cet employ�
    const congeFound = conges.find((c) => {
      const empMatch = c.userId === employeId || c.employeId === employeId;
      if (!empMatch) return false;
      
      const cellDate = dateStr.slice(0, 10);
      const debutConge = typeof c.dateDebut === 'string' ? c.dateDebut.slice(0, 10) : new Date(c.dateDebut).toISOString().slice(0, 10);
      const finConge = typeof c.dateFin === 'string' ? c.dateFin.slice(0, 10) : new Date(c.dateFin).toISOString().slice(0, 10);
      
      return cellDate >= debutConge && cellDate <= finConge;
    });
    
    if (congeFound) {
      const statutConge = congeFound.statut?.toLowerCase();
      const isApprouve = statutConge === 'approuvé' || statutConge === 'validé' || statutConge === 'approuv\uFFFD' || statutConge === 'valid\uFFFD' || statutConge === 'approuve' || statutConge === 'valide';
      const isEnAttente = statutConge === 'en_attente' || statutConge === 'en attente';
      
      // ?? CONGÉ APPROUVÉ: Bloquer la création de shift
      if (isApprouve) {
        setNotification({
          type: 'error',
          message: `Création de shift impossible : ${congeFound.type || 'Congé'} approuvé pour cette date`,
          duration: 5000
        });
        return; // Ne pas ouvrir la modale
      }
      
      // ?? CONG� EN ATTENTE: Avertir mais permettre la cr�ation
      if (isEnAttente) {
        setNotification({
          type: 'warning',
          message: `Attention : Une demande de ${congeFound.type || 'congé'} est en attente pour cette date. Le shift sera créé, mais peut entrer en conflit si le congé est approuvé.`,
          duration: 7000
        });
        // Continuer vers l'ouverture de la modale
      }
    }
    
    const found = shifts.find(
      (s) => s.employeId === employeId && s.date.slice(0, 10) === dateStr
    );
    if (found) {
      setSelected({ ...found });
    } else {
      setSelected({
        employeId,
        date: dateStr,
        type: "travail",
        segments: [
          { 
            // Plus besoin d'ID pour les segments
            start: startGuess || "", 
            end: endGuess || "", 
            commentaire: "", 
            aValider: false, 
            isExtra:false, 
            extraMontant:"", 
            paymentStatus:'a_payer', 
            paymentMethod:'', 
            paymentDate:'', 
            paymentNote:'' 
          }
        ],
        // La version n'est plus utilis�e
      });
    }
    setModalOpen(true);
  };

  // Sauvegarde r�elle (POST/PUT)
  const handleSave = useCallback(async (shift) => {
    try {
      // V�rification des privil�ges administrateur pour certaines modifications
      const existingShift = shift.id ? shifts.find(s => s.id === shift.id) : null;
      const adminCheck = requiresAdminPrivileges(shift, existingShift);
      
      if (adminCheck.required && !isAdmin) {
        setNotification({
          type: 'warning',
          message: adminCheck.message + ' - Votre modification sera soumise à validation.',
          duration: 7000
        });
        
        // Pour les utilisateurs non-admin, marquer le shift comme "à valider"
        if (Array.isArray(shift.segments)) {
          shift.segments = shift.segments.map(segment => ({
            ...segment,
            aValider: true,
            adminValidationRequired: true,
            adminValidationReason: adminCheck.reason
          }));
        }
      }
      
      // Les segments n'ont plus besoin d'ID
      
      if (shift.id) {
        // V�rifier si on passe d'absence � pr�sence ou inversement
        const isTypeChange = existingShift && existingShift.type !== shift.type;
        
        if (isTypeChange) {
          console.log(`Changement de type d�tect�: ${existingShift.type} -> ${shift.type}`);
        }
        
        // Envoyer directement sans v�rification de version
        const res = await axios.put(
          buildApiUrl(`/shifts/${shift.id}`),
          { ...shift },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Mise � jour de l'interface
        setShifts((prev) =>
          prev.map((s) => (s.id === shift.id ? res.data : s))
        );
        
        setModalOpen(false);
        setSelected(null);
        
        // Rafra�chir les donn�es si changement de type important
        if (isTypeChange) {
          console.log("Rafra�chissement des donn�es apr�s changement de type");
          setTimeout(() => refreshShifts(true), 100);
        }
      } else {
        const res = await axios.post(
          buildApiUrl('/shifts'),
          { ...shift },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setShifts((prev) => [...prev, res.data]);
        setModalOpen(false);
        setSelected(null);
      }
    } catch (err) {
      console.error("Erreur sauvegarde:", err.response?.data || err);
      
      // Affichage standard de l'erreur
      const errorMsg = err.response?.data?.error || err.message;
      
      if (modalOpen && selected) {
        // Si le modal d'�dition est ouvert, on peut utiliser son syst�me d'erreurs
        // Cette partie sera trait�e par ModalEditionShift
      } else {
        // Utiliser notre syst�me de notification
        setNotification({
          type: "error",
          message: `Erreur lors de la sauvegarde du planning : ${errorMsg}`,
          duration: 7000
        });
      }
    }
  }, [token, modalOpen, selected, refreshShifts, shifts, requiresAdminPrivileges, isAdmin]);

  // Suppression
  const handleDelete = async () => {
    if (!selected?.id) return;
    try {
      // Suppression avec gestion optimiste des erreurs
      await axios.delete(buildApiUrl(`/shifts/${selected.id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Optimistic update - on suppose que la suppression a r�ussi m�me si le serveur n'a pas r�pondu
      setShifts((prev) => prev.filter((s) => s.id !== selected.id));
      setModalOpen(false);
      setSelected(null);
    } catch (err) {
      // Force la suppression locale m�me en cas d'erreur
      setShifts((prev) => prev.filter((s) => s.id !== selected.id));
      setModalOpen(false);
      setSelected(null);
      
      // Simple notification d'erreur sans bloquer l'interface
      console.warn('Note: Probl�me possible lors de la suppression du shift, mais il a �t� retir� de l\'interface:', err.response?.data || err.message);
      
      // En cas d'erreur critique, rafra�chir les donn�es
      if (err.response?.status === 500 || err.response?.status === 409) {
        refreshShifts(true);
      }
    }
  };

  // === GESTION DES ANOMALIES ===
  
  // Fonction pour g�rer le clic sur une anomalie (ouvre modale d�taill�e) - VERSION MISE � JOUR
  const handleAnomalieClick = useCallback(async (employeId, date, ecart) => {
    console.log('Clic sur anomalie:', { employeId, date, ecart });
    
    // V�rifier d'abord les privil�ges pour l'acc�s aux d�tails d'anomalie
    const authorized = await validateAnomalieWithAdminCheck(employeId, date, ecart, 'view_details');
    if (!authorized && ['hors_plage', 'heures_sup', 'presence_non_prevue'].includes(ecart.type)) {
      // Pour les types critiques, limiter l'acc�s aux d�tails
      setNotification({
        type: 'info',
        message: 'Anomalie signalée. Un administrateur examinera cette situation.',
        duration: 5000
      });
      return;
    }
    
    try {
      // Si c'est d�j� une vraie anomalie de base de donn�es (avec ID num�rique), l'utiliser directement
      if (ecart.id && typeof ecart.id === 'number') {
        // V�rifier si l'anomalie a d�j� �t� trait�e
        if (ecart.statut && ['validee', 'refusee', 'corrigee'].includes(ecart.statut)) {
          console.log('Anomalie d�j� trait�e:', ecart.statut);
          setNotification({
            type: 'info',
            message: `Cette anomalie a déjà été ${ecart.statut}`,
            duration: 3000
          });
          // Permettre tout de m�me d'ouvrir la modale pour voir les d�tails
        }
        setAnomalieSelectionnee(ecart);
        return;
      }
      
      // V�rification des donn�es requises avant la synchronisation
      if (!employeId || !date || !ecart || !ecart.type) {
        throw new Error('Données incomplètes pour synchroniser l\'anomalie');
      }
      
      // Sinon, c'est un �cart de comparaison - il faut d'abord le synchroniser en anomalie
      console.log('?? Synchronisation de l\'�cart en anomalie...', { employeId, date, ecart });
      
      // Format de l'�cart pour la synchronisation
      const ecartFormatted = {
        ...ecart,
        description: ecart.description || `Anomalie de type ${ecart.type}`,
        gravite: ecart.gravite || 'attention',
        requiresAdminValidation: !isAdmin && ['hors_plage', 'heures_sup', 'presence_non_prevue'].includes(ecart.type)
      };
      
      const result = await syncAnomaliesFromComparison(employeId, date, [ecartFormatted]);
      console.log('R�sultat synchronisation:', result);
      
      if (result && result.success) {
        // V�rifier si des anomalies ont �t� cr��es ou mises � jour
        if (result.anomalies && result.anomalies.length > 0) {
          // R�cup�rer l'anomalie cr��e avec ses d�tails complets
          const anomalieComplete = {
            ...result.anomalies[0],
            employe: employes.find(e => e.id === employeId)
          };
          
          console.log('? Anomalie synchronis�e:', anomalieComplete);
          setAnomalieSelectionnee(anomalieComplete);
        } else if (result.anomaliesCreees === 0) {
          // Aucune anomalie cr��e - peut-�tre qu'elle existe d�j� ou que l'�cart n'est pas significatif
          setNotification({
            type: 'info',
            message: 'Cette anomalie existe déjà ou n\'est pas significative'
          });
          return false;
        } else {
          // Anomalies cr��es mais pas retourn�es dans le r�sultat
          setNotification({
            type: 'success',
            message: `${result.anomaliesCreees} anomalie(s) synchronisée(s)`
          });
          return true;
        }
      } else {
        throw new Error('Impossible de créer l\'anomalie en base de données: ' + 
          (result && result.error ? result.error : 'Réponse du serveur invalide'));
      }
      
    } catch (error) {
      console.error('? Erreur lors de la synchronisation de l\'anomalie:', error);
      setNotification({
        type: 'error',
        message: `Erreur: ${error.message || 'Impossible de traiter cette anomalie'}`
      });
      // Retourner false pour indiquer l'�chec
      return false;
    }
    
    // Retourner true pour indiquer le succ�s
    return true;
  }, [employes, setAnomalieSelectionnee, syncAnomaliesFromComparison, setNotification, isAdmin, validateAnomalieWithAdminCheck]);

  // Convertir l'anomalie en heures extra
  // eslint-disable-next-line no-unused-vars
  const handleConvertToExtra = useCallback(async (employeId, date, ecart) => {
    try {
      console.log("?? Conversion en extra - donn�es:", { employeId, date, ecart });
      
      // Utiliser directement les informations de l'�cart au lieu de refaire une requ�te
      // L'�cart contient d�j� les informations n�cessaires
      let startTime = "14:30"; // Valeur par d�faut
      let endTime = "18:30";   // Valeur par d�faut
      let duration = 4;        // Dur�e par d�faut en heures
      
      // Si l'�cart contient des informations de timing, les utiliser
      if (ecart.heureArrivee) {
        startTime = ecart.heureArrivee;
      }
      if (ecart.heureDepart) {
        endTime = ecart.heureDepart;
        // Calculer la dur�e bas�e sur les heures
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        let durationMin = (endH * 60 + endM - startH * 60 - startM);
        // ?? RESTAURANT : G�rer les shifts de nuit
        if (durationMin < 0) durationMin += 24 * 60;
        duration = durationMin / 60;
      }

      const newShift = {
        employeId: parseInt(employeId),
        date: date,
        type: "travail",
        segments: [{
          start: startTime,
          end: endTime,
          isExtra: true,
          extraMontant: "", // Laisser vide pour que l'admin le remplisse
          paymentStatus: 'a_payer',
          paymentDate: getCurrentDateString(), // Date d'aujourd'hui
          commentaire: `Converti depuis anomalie: ${ecart.description || ecart.motif || 'Pointage inattendu'}`
        }]
      };

      console.log("?? Nouveau shift extra � cr�er:", newShift);
      await handleSave(newShift);
      
      // Recharger les shifts ET les comparaisons pour mettre � jour l'affichage
      await refreshShifts(true); // Mode silencieux
      await loadComparaisons();
      
      setNotification({
        type: "success",
        message: `Anomalie convertie en heures extra (${duration.toFixed(1)}h) - Veuillez définir le montant`,
        duration: 5000
      });
    } catch (error) {
      console.error("Erreur conversion extra:", error);
      setNotification({
        type: "error",
        message: `Erreur lors de la conversion : ${error.message}`,
        duration: 5000
      });
    }
  }, [handleSave, loadComparaisons, refreshShifts]);

  // Supprimer le pointage erron�
  // eslint-disable-next-line no-unused-vars
  const handleDeletePointageError = useCallback(async (employeId, date, ecart) => {
    const employe = employes.find(e => e.id === employeId);
    if (!employe) return;

    const confirmed = window.confirm(
      `Supprimer le pointage erroné ?\n\n` +
      `Employé: ${formatEmployeeName(employe)}\n` +
      `Date: ${new Date(date).toLocaleDateString('fr-FR')}\n` +
      `Détection: ${ecart.description}\n\n` +
      `Ce pointage sera supprimé définitivement (erreur de pointage).`
    );

    if (!confirmed) return;

    try {
      // Appeler l'API pour supprimer le pointage
      const response = await fetch(buildApiUrl('/pointage/delete-error'), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeId: employeId,
          date: date,
          reason: 'Erreur de pointage - Suppression administrative'
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du pointage');
      }

      // Recharger les donn�es
      await refreshShifts();
      await loadComparaisons();
      
      setNotification({
        type: 'success',
        message: `Pointage erroné supprimé pour ${formatEmployeeName(employe)}`
      });
      
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setNotification({
        type: 'error',
        message: 'Erreur lors de la suppression du pointage'
      });
    }
  }, [employes, formatEmployeeName, token, refreshShifts, loadComparaisons]);


  // File d'action en attente quand on active automatiquement les anomalies
  const pendingQuickActionRef = useRef(null);

  const handleQuickAction = useCallback(async (employeId, date, ecart, action) => {
    const dateStr = typeof date === 'string' ? date : formatDate(date);
    console.log('[QuickAction] Action simple:', { employeId, dateStr, ecart, action });

    // Action sp�ciale 'update' pour mettre � jour l'affichage local
    if (action === 'update') {
      console.log('[QuickAction] Mise � jour locale de l\'�cart:', ecart);
      
      // Mettre � jour les comparaisons locales si l'�cart provient d'une comparaison
      setComparaisons(prevComparaison => {
        if (!prevComparaison || !Array.isArray(prevComparaison)) return prevComparaison;
        
        return prevComparaison.map(comp => {
          if (comp.employeId === parseInt(employeId) && 
              normalizeDateLocal(comp.jour) === dateStr) {
            
            // Mettre � jour l'�cart dans les anomalies de cette comparaison
            const updatedAnomalies = comp.anomalies?.map(a => 
              a.type === ecart.type ? { ...a, statut: ecart.statut } : a
            ) || [];
            
            return { ...comp, anomalies: updatedAnomalies };
          }
          return comp;
        });
      });
      
      // Notification de succ�s
      const actionText = ecart.statut === 'validee' ? 'validée' : 
            ecart.statut === 'refusee' ? 'refusée' : 'traitée';
      
      setNotification({
        type: 'success',
        message: `Anomalie ${actionText} avec succès`,
        duration: 2000
      });
      
      return;
    }

    // Pour les autres actions, afficher un message d'information
    setNotification({
      type: 'info',
      message: `Action "${action}" traitée par le nouveau système`,
      duration: 2000
    });
  }, [setNotification]);

  // Ex�cuter une action diff�r�e une fois les anomalies affich�es
  useEffect(() => {
    if (pendingQuickActionRef.current) {
      const { employeId, dateStr, ecart, action } = pendingQuickActionRef.current;
      console.log('[QuickAction][Deferred] Ex�cution apr�s chargement anomalies');
      pendingQuickActionRef.current = null;
      setTimeout(() => handleQuickAction(employeId, dateStr, ecart, action), 0);
    }
  }, [handleQuickAction]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md mx-auto">
          <div className="text-center">
            {/* Animation de chargement moderne */}
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-[#cf292c] rounded-full animate-spin"></div>
              </div>
              <div className="absolute top-2 left-2 w-12 h-12 bg-gradient-to-r from-[#cf292c] to-[#b31f22] rounded-full flex items-center justify-center">
                <Calendar size={20} className="text-white" />
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Chargement du planning</h2>
            <p className="text-gray-600 text-sm">Récupération des données...</p>
            
            {/* Barre de progression styl�e */}
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-[#cf292c] to-[#b31f22] h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* Toast Notifications */}
        <ToastContainer />
        
        {/* Syst�me de notifications */}
        {notification && (
          <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 max-w-sm shadow-xl rounded-xl overflow-hidden backdrop-blur-sm animate-in slide-in-from-top-4 duration-300 ${
            notification.type === 'warning' ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200' : 
            notification.type === 'error' ? 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200' : 
            'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
          }`}>
            <div className="flex p-5 items-center">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                notification.type === 'warning' ? 'bg-amber-100' : 
                notification.type === 'error' ? 'bg-red-100' : 
                'bg-green-100'
              }`}>
                {notification.type === 'warning' && (
                  <svg className="h-6 w-6 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                {notification.type === 'error' && (
                  <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {notification.type === 'success' && (
                  <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="ml-4 flex-1">
                <p className={`text-sm font-semibold ${
                  notification.type === 'warning' ? 'text-amber-800' : 
                  notification.type === 'error' ? 'text-red-800' : 
                  'text-green-800'
                }`}>
                  {notification.type === 'success' ? 'Succès' : notification.type === 'error' ? 'Erreur' : 'Attention'}
                </p>
                <p className={`text-sm mt-1 ${
                  notification.type === 'warning' ? 'text-amber-700' : 
                  notification.type === 'error' ? 'text-red-700' : 
                  'text-green-700'
                }`}>
                  {notification.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  className={`inline-flex rounded-full p-1.5 hover:bg-white hover:bg-opacity-50 transition-all duration-200 ${
                    notification.type === 'warning' ? 'text-amber-500 hover:text-amber-700' : 
                    notification.type === 'error' ? 'text-red-400 hover:text-red-600' : 
                    'text-green-400 hover:text-green-600'
                  }`}
                  onClick={() => setNotification(null)}
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Barre d'outils flottante (style Skello) */}
        {showFloatingToolbar && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/70 px-4 py-3 flex items-center gap-3">
              {/* Navigation temporelle compacte */}
              <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
                <button
                  onClick={goPrev}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition flex items-center justify-center"
                  title="Période précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToday}
                  className="px-3 py-1.5 text-xs font-medium text-[#cf292c] hover:bg-red-50 rounded-lg transition whitespace-nowrap"
                  title="Aller à aujourd'hui"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={goNext}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition flex items-center justify-center"
                  title="Période suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Sélecteurs de vue */}
              <div className="flex gap-1 pr-3 border-r border-gray-200">
                {['jour','semaine','mois'].map(v => (
                  <button
                    key={v}
                    onClick={() => setViewType(v)}
                    className={`px-2.5 py-1.5 text-xs font-medium capitalize rounded-lg transition ${
                      viewType === v
                        ? 'bg-[#cf292c] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              
              {/* Bouton Remplacements - ouvre modale */}
              <button
                onClick={() => setShowRemplacementsPanel(true)}
                className={`relative px-2.5 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
                  showRemplacementsPanel
                    ? 'bg-[#cf292c] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Remplacements
                {remplacementsEnAttente > 0 && (
                  <span className={`min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full ${
                    showRemplacementsPanel ? 'bg-white text-[#cf292c]' : 'bg-[#cf292c] text-white'
                  }`}>
                    {remplacementsEnAttente}
                  </span>
                )}
              </button>
              
              {/* Bouton Extras - ouvre modale */}
              <button
                onClick={() => setShowExtrasPanel(true)}
                className={`relative px-2.5 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
                  showExtrasPanel
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                Extras
              </button>

              {/* Actions principales */}
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => setShowAdminPanel(v => !v)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${showAdminPanel ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Panneau admin anomalies"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Conteneur principal - Layout flex vertical */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* En-tête du planning - FIXED sous la navbar */}
          <header className="fixed top-16 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40">
            <div className="h-full max-w-[1800px] mx-auto px-4 flex items-center gap-4">
              
              {/* Navigation temporelle */}
              <div className="flex items-center">
                <button
                  aria-label="Période précédente"
                  onClick={goPrev}
                  className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700 rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToday}
                  className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                >
                  Auj.
                </button>
                <button
                  aria-label="Période suivante"
                  onClick={goNext}
                  className="p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700 rounded-lg transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Date affichée */}
              <div className="flex items-center px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200">
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                  {viewType === 'jour' && dateCourante.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  {viewType === 'semaine' && `${dates[0]?.toLocaleDateString('fr-FR', { day: 'numeric' })}-${dates[6]?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                  {viewType === 'mois' && dateCourante.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Sélecteur de vues */}
              <div className="hidden md:flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-md">
                {['jour','semaine','mois'].map(v => (
                  <button
                    key={v}
                    onClick={() => setViewType(v)}
                    className={`px-2.5 py-1 text-xs font-medium capitalize rounded transition-all ${
                      viewType === v
                        ? 'text-gray-900 bg-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Séparateur */}
              <div className="w-px h-5 bg-gray-200 hidden lg:block" />

              {/* Remplacements */}
              <button
                onClick={() => setShowRemplacementsPanel(true)}
                className={`hidden lg:flex h-7 px-2 text-xs font-medium rounded-md transition-all items-center gap-1 border ${
                  showRemplacementsPanel
                    ? 'text-white bg-[#cf292c] border-[#cf292c]'
                    : 'text-gray-600 hover:text-gray-800 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                title="Gestion des remplacements"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Rempl.</span>
                {remplacementsEnAttente > 0 && (
                  <span className={`min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold rounded-full px-0.5 ${
                    showRemplacementsPanel ? 'bg-white text-[#cf292c]' : 'bg-[#cf292c] text-white'
                  }`}>
                    {remplacementsEnAttente}
                  </span>
                )}
              </button>
              
              {/* Extras */}
              <button
                onClick={() => setShowExtrasPanel(true)}
                className={`hidden lg:flex h-7 px-2 text-xs font-medium rounded-md transition-all items-center gap-1 border ${
                  showExtrasPanel
                    ? 'text-white bg-emerald-600 border-emerald-600'
                    : 'text-gray-600 hover:text-gray-800 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                title="Gestion des extras"
              >
                <Banknote className="w-3 h-3" />
                <span>Extras</span>
              </button>

              {/* Espace flexible */}
              <div className="flex-1" />

              {/* Outils de filtrage (Desktop) */}
              <div className="hidden lg:flex items-center gap-1.5">
                {/* Recherche */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-28 h-7 rounded-md border border-gray-200 bg-gray-50 pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#cf292c]/30 focus:border-[#cf292c] focus:bg-white placeholder:text-gray-400"
                  />
                  <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Filtre catégorie */}
                <div className="relative" ref={categorieDropdownRef}>
                  <button
                    onClick={() => setCategorieDropdownOpen(!categorieDropdownOpen)}
                    className="flex items-center gap-1 h-7 rounded-md border border-gray-200 bg-gray-50 px-2 text-xs text-gray-600 hover:border-gray-300 hover:bg-white focus:outline-none transition-all"
                  >
                    <span className="font-medium truncate max-w-[50px]">{selectedCategorie.value === 'tous' ? 'Catég.' : selectedCategorie.label}</span>
                    <svg className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${categorieDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {categorieDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                      <div className="px-2.5 py-1.5 border-b border-gray-100">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Catégorie</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat.value}
                            onClick={() => { setCategorieFilter(cat.value); setCategorieDropdownOpen(false); }}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-gray-50 transition-colors ${categorieFilter === cat.value ? 'bg-red-50/50' : ''}`}
                          >
                            {cat.iconType ? (
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${cat.color || 'bg-gray-100 text-gray-500'}`}>
                                {getCategoryIcon(cat.iconType, "w-3 h-3")}
                              </span>
                            ) : (
                              <span className="w-5 h-5 flex items-center justify-center text-gray-400">
                                {getCategoryIcon('list', "w-3 h-3")}
                              </span>
                            )}
                            <span className={`flex-1 text-left ${categorieFilter === cat.value ? 'font-medium text-[#cf292c]' : 'text-gray-600'}`}>
                              {cat.label}
                            </span>
                            {categorieFilter === cat.value && (
                              <svg className="w-3.5 h-3.5 text-[#cf292c]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Badge compteur + reset quand filtres actifs */}
                {(categorieFilter !== "tous" || searchTerm.trim()) && (
                  <div className="flex items-center gap-1 bg-gray-100 rounded-full pl-2 pr-0.5 py-0.5">
                    <span className="text-[10px] text-gray-600 font-medium">
                      {filteredEmployes.length}/{employes.length}
                    </span>
                    <button
                      onClick={() => { setCategorieFilter("tous"); setSearchTerm(""); }}
                      className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Réinitialiser"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Séparateur */}
                <div className="w-px h-5 bg-gray-200" />

                {/* Bouton Comparaison - Compact */}
                <button
                  onClick={() => { setShowComparaison(!showComparaison); if (!showComparaison) loadComparaisons(); }}
                  disabled={loadingComparaison}
                  className={`h-7 px-2 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                    showComparaison 
                      ? comparaisonStats.nonTraitees > 0
                        ? 'text-white bg-orange-500 hover:bg-orange-600'
                        : comparaisonStats.total > 0
                          ? 'text-white bg-blue-500 hover:bg-blue-600'
                          : 'text-blue-600 bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                  title={showComparaison && comparaisonStats.total > 0 
                    ? `${comparaisonStats.total} écarts: ${comparaisonStats.retards} retards, ${comparaisonStats.absences} absences, ${comparaisonStats.heuresSup} h.sup` 
                    : "Comparer planning vs réalité"}
                >
                  {loadingComparaison ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  )}
                  <span className="hidden sm:inline whitespace-nowrap">
                    {showComparaison 
                      ? comparaisonStats.total > 0 
                        ? `${comparaisonStats.total}`
                        : 'RAS'
                      : 'Écarts'
                    }
                  </span>
                  {/* Badge anomalies non traitées */}
                  {showComparaison && comparaisonStats.nonTraitees > 0 && (
                    <span className="min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold rounded-full px-0.5 bg-red-500 text-white">
                      {comparaisonStats.nonTraitees}
                    </span>
                  )}
                </button>

                {/* Bouton Anomalies */}
                {isAdmin && (
                  <button
                    onClick={() => setShowAdminPanel(v => !v)}
                    className={`h-7 px-2 text-xs font-medium rounded-md transition-all flex items-center gap-1 border ${
                      showAdminPanel 
                        ? 'text-white bg-orange-600 border-orange-600' 
                        : 'text-gray-600 hover:text-gray-800 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Gestion des anomalies"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span className="hidden xl:inline">Anomalies</span>
                  </button>
                )}

                {/* Bouton Nouveau */}
                <button
                  onClick={() => setCreationRapideModalOpen(true)}
                  className="h-7 px-2.5 text-xs font-semibold text-white bg-[#cf292c] hover:bg-[#b52429] rounded-md transition-all shadow-sm flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Nouveau</span>
                </button>
              </div>

              {/* Menu mobile (tablette/mobile) */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                </svg>
              </button>
            </div>

            {/* Menu mobile d�roulant */}
            {mobileMenuOpen && (
              <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 space-y-3 shadow-md">
                <div className="flex gap-2">
                  {['jour','semaine','mois'].map(v => (
                    <button
                      key={v}
                      onClick={() => setViewType(v)}
                      className={`flex-1 px-2.5 py-2 text-xs font-medium capitalize rounded-lg transition ${viewType === v ? 'bg-red-50 text-[#cf292c]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >{v}</button>
                  ))}
                  {/* Bouton Remplacements mobile */}
                  <button
                    onClick={() => setShowRemplacementsPanel(true)}
                    className="relative flex-1 px-2.5 py-2 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1 text-gray-600 hover:bg-gray-50 border border-gray-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Rempl.
                    {remplacementsEnAttente > 0 && (
                      <span className="min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold rounded-full bg-amber-500 text-white px-1">
                        {remplacementsEnAttente}
                      </span>
                    )}
                  </button>
                  {/* Bouton Extras mobile */}
                  <button
                    onClick={() => setShowExtrasPanel(true)}
                    className="relative flex-1 px-2.5 py-2 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1 text-gray-600 hover:bg-gray-50 border border-gray-200"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Extras
                  </button>
                  {/* Bouton Anomalies mobile */}
                  {isAdmin && (
                    <button
                      onClick={() => setShowAdminPanel(true)}
                      className="relative flex-1 px-2.5 py-2 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1 text-gray-600 hover:bg-gray-50 border border-orange-200 bg-orange-50"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                      <span className="text-orange-700">Anomalies</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c]"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                {/* Filtre cat�gorie mobile */}
                <div className="relative">
                  <select
                    value={categorieFilter}
                    onChange={e => setCategorieFilter(e.target.value)}
                    className="w-full h-9 rounded-md border border-gray-200 bg-white pl-8 pr-7 text-xs text-gray-600 appearance-none focus:outline-none focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c]"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <span className={`absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-5 h-5 rounded ${selectedCategorie.color || 'bg-gray-100 text-gray-400'}`}>
                    {getCategoryIcon(selectedCategorie.iconType || 'list', "w-3 h-3")}
                  </span>
                  <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowComparaison(!showComparaison); if (!showComparaison) loadComparaisons(); }}
                    disabled={loadingComparaison}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                      showComparaison 
                        ? comparaisonStats.nonTraitees > 0
                          ? 'bg-orange-500 text-white'
                          : comparaisonStats.total > 0
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {loadingComparaison ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        {showComparaison 
                          ? comparaisonStats.total > 0 
                            ? `${comparaisonStats.total} �carts`
                            : 'RAS'
                          : 'Comparer'
                        }
                        {showComparaison && comparaisonStats.nonTraitees > 0 && (
                          <span className="min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold rounded-full bg-red-500 text-white">
                            {comparaisonStats.nonTraitees}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setCreationRapideModalOpen(true)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[#cf292c] hover:bg-[#b52429]"
                  >
                    + Nouveau
                  </button>
                </div>
              </div>
            )}
          </header>
          
          {/* L�gende des types de segments - toujours visible */}
          <div className="fixed top-[120px] left-0 right-0 bg-white border-b border-gray-100 px-4 py-1.5 z-30 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-gray-500 font-medium">Légende:</span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-gradient-to-r from-blue-500 to-blue-600"></span>
                <span className="text-gray-600">Normal</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-gradient-to-r from-purple-500 to-purple-600"></span>
                <span className="text-gray-600">À valider</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-gradient-to-r from-amber-500 to-orange-500"></span>
                <span className="text-orange-600 font-medium">Extra (à payer)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-gradient-to-r from-emerald-500 to-emerald-600"></span>
                <span className="text-emerald-600 font-medium flex items-center gap-0.5">Extra (payé) <CheckCircle className="w-2.5 h-2.5" /></span>
              </span>
            </div>
            {/* Info rapide extras */}
            {shifts.some(s => Array.isArray(s.segments) && s.segments.some(seg => seg.isExtra)) && (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-gray-400">|</span>
                <span className="flex items-center gap-1 text-orange-600">
                  {shifts.reduce((acc, s) => acc + (Array.isArray(s.segments) ? s.segments.filter(seg => seg.isExtra && !(seg.paymentStatus === 'payé' || seg.paymentStatus === 'paye' || seg.paymentStatus === 'pay\uFFFD')).length : 0), 0)} extra(s) à payer
                </span>
              </div>
            )}
          </div>
          
          {/* Légende mode comparaison */}
          {showComparaison && (
            <div className="fixed top-[148px] left-0 right-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-4 py-2 z-30 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <span className="font-medium text-blue-700 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Mode comparaison actif
                </span>
                <div className="flex items-center gap-3 text-gray-600">
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> OK</span>
                  <span className="flex items-center gap-1"><AlarmClock className="w-3 h-3 text-amber-500" /> Retard</span>
                  <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> Absence</span>
                  <span className="flex items-center gap-1"><LogOut className="w-3 h-3 text-orange-500" /> Départ tôt</span>
                  <span className="flex items-center gap-1"><Timer className="w-3 h-3 text-indigo-500" /> H.Sup</span>
                  <span className="flex items-center gap-1"><CircleAlert className="w-3 h-3 text-amber-600" /> Non planifié</span>
                </div>
              </div>
              {comparaisonStats.total > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-2 text-gray-500 flex-wrap">
                    {comparaisonStats.retards > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><AlarmClock className="w-3 h-3" />{comparaisonStats.retards}</span>}
                    {comparaisonStats.absences > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><XCircle className="w-3 h-3" />{comparaisonStats.absences}</span>}
                    {comparaisonStats.departsAnticipes > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><LogOut className="w-3 h-3" />{comparaisonStats.departsAnticipes}</span>}
                    {comparaisonStats.heuresSup > 0 && <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Timer className="w-3 h-3" />{comparaisonStats.heuresSup}</span>}
                    {comparaisonStats.nonPlanifies > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><CircleAlert className="w-3 h-3" />{comparaisonStats.nonPlanifies}</span>}
                    {comparaisonStats.critiques > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full font-medium animate-pulse flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{comparaisonStats.critiques} critique{comparaisonStats.critiques > 1 ? 's' : ''}</span>}
                  </span>
                  <button
                    onClick={() => setShowComparaison(false)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Fermer comparaison"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
            
            {/* Zone de contenu - Fixed sous navbar (64px) + barre filtres (56px) + legende segments (28px) + legende comparaison si active */}
            <main className={`fixed ${showComparaison ? 'top-[184px]' : 'top-[148px]'} left-0 right-0 bottom-0 overflow-hidden bg-white transition-all duration-200`}>
              {filteredEmployes.length === 0 ? (
                /* Etat vide - Aucun employe trouve */
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <UsersRound className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-700 mb-1.5">
                    {searchTerm ? 'Aucun employé trouvé' : 'Aucun employé'}
                  </h3>
                  <p className="text-gray-500 text-center mb-4 max-w-md text-sm">
                    {searchTerm 
                      ? `Aucun employé ne correspond à "${searchTerm}". Essayez de modifier votre recherche.`
                      : 'Aucun employé n\'a été trouvé dans le système. Ajoutez des employés pour commencer.'
                    }
                  </p>
                  {searchTerm ? (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="px-4 py-2 bg-[#cf292c] hover:bg-[#b31f22] text-white rounded-lg font-medium transition-colors flex items-center gap-1.5 text-sm"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2} />
                      Effacer la recherche
                    </button>
                  ) : (
                    <button
                      onClick={() => setCreationRapideModalOpen(true)}
                      className="px-6 py-3 bg-[#cf292c] hover:bg-[#b31f22] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" strokeWidth={2} />
                      Ajouter un employe
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Vue desktop (masqu�e sur mobile) */}
                  <div className="hidden md:block h-full">
                    <div className="h-full">
                  {/* Vue Planning */}
                  {viewType === 'jour' ? (
                    <DayAgenda
                      date={dates[0]}
                      employes={filteredEmployes}
                      shifts={shifts}
                      conges={conges}
                      onCellClick={handleCellClick}
                      formatEmployeeName={formatEmployeeName}
                      getEmployeeInitials={getEmployeeInitials}
                    />
                  ) : viewType === 'mois' ? (
                    <MonthCalendarView
                      dates={dates}
                      employes={filteredEmployes}
                      shifts={shifts}
                      conges={conges}
                      onCellClick={handleCellClick}
                      formatEmployeeName={formatEmployeeName}
                      getCategorieEmploye={getCategorieEmploye}
                    />
                  ) : (
                    <PlanningRHTable
                        employes={filteredEmployes}
                        dates={dates}
                        shifts={shifts}
                        conges={conges}
                        setShifts={setShifts}
                        onCellClick={handleCellClick}
                        viewType={viewType}
                        formatEmployeeName={formatEmployeeName}
                        getEmployeeInitials={getEmployeeInitials}
                        showComparaison={showComparaison}
                        getEcartsForEmployeeDate={getEcartsForEmployeeDate}
                        formatEcart={formatEcart}
                        forceReadable={false}
                        skelloMode={false}
                        expandedEmployees={expandedEmployees}
                        onToggleExpand={(id)=> setExpandedEmployees(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                        onOpenRapport={setRapportEmployeId}
                        getCategorieEmploye={getCategorieEmploye}
                        employesGroupesParCategorie={employesGroupesParCategorie}
                        getAnomaliesForEmployeeDate={getAnomaliesForEmployeeDate}
                        handleAnomalieClick={handleAnomalieClick}
                        handleQuickAction={handleQuickAction}
                        showToast={showToast}
                        isFiltered={categorieFilter !== "tous" || searchTerm.trim() !== ""}
                        filterLabel={categorieFilter !== "tous" ? selectedCategorie?.label : (searchTerm.trim() ? `"${searchTerm}"` : null)}
                        totalEmployes={employes.length}
                        onResetFilter={() => { setCategorieFilter("tous"); setSearchTerm(""); }}
                      />
                  )}
                </div>
              </div>
              
              {/* Vue mobile (masqu�e sur desktop) */}
              <div className="md:hidden">
                <PlanningMobileView
                  employes={filteredEmployes}
                  dates={dates}
                  shifts={shifts}
                  conges={conges}
                  onCellClick={handleCellClick}
                  viewType={viewType}
                  formatEmployeeName={formatEmployeeName}
                  getEmployeeInitials={getEmployeeInitials}
                  showComparaison={showComparaison}
                  getEcartsForEmployeeDate={getEcartsForEmployeeDate}
                  formatEcart={formatEcart}
                  getCategorieEmploye={getCategorieEmploye}
                  employesGroupesParCategorie={employesGroupesParCategorie}
                  handleAnomalieClick={handleAnomalieClick}
                  handleQuickAction={handleQuickAction}
                />
              </div>
              </>
            )}
            </main>
        </div>

        {/* Modals - en dehors du flux principal */}
        {modalOpen && selected && (
              <ModalEditionShift
                employe={employes.find(e => e.id === selected.employeId)}
                shift={selected}
                onSave={handleSave}
                onDelete={handleDelete}
                onClose={() => setModalOpen(false)}
                token={localStorage.getItem("token")} // R�cup�rer le token directement au moment du passage
                formatEmployeeName={formatEmployeeName}
                getEmployeeInitials={getEmployeeInitials}
                isAdmin={isAdmin}
                userRole={userRole}
                requiresAdminPrivileges={requiresAdminPrivileges}
              />
            )}
            
            {creationRapideModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
                  <div className="p-4 sm:p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                        <span className="hidden sm:inline">Création rapide de planning</span>
                        <span className="sm:hidden">Création rapide</span>
                      </h2>
                      <button 
                        onClick={() => setCreationRapideModalOpen(false)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-6 sm:h-6">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    
                    <CreationRapideForm 
                      employes={employes}
                      onClose={() => setCreationRapideModalOpen(false)} 
                      onSuccess={async (datePremiereCreation) => {
                        console.log("Cr�ation rapide termin�e - Rechargement des plannings...");
                        // Attendre un court instant pour s'assurer que la base de donn�es a �t� mise � jour
                        setTimeout(async () => {
                          const success = await refreshShifts();
                          console.log("Rechargement termin�:", success ? "OK" : "�CHEC");
                          if (success) {
                            console.log("Nouveaux shifts:", shifts.length);
                            
                            // Navigation vers la date de la premi�re cr�ation si disponible
                            if (datePremiereCreation) {
                              console.log("Navigation vers la date:", datePremiereCreation);
                              // Conversion de la date au format YYYY-MM-DD vers un objet Date
                              try {
                                let dateObj;
                                // S'assurer que la date est bien format�e
                                if (typeof datePremiereCreation === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(datePremiereCreation)) {
                                  // Format YYYY-MM-DD
                                  const [year, month, day] = datePremiereCreation.split('-').map(Number);
                                  dateObj = new Date(year, month - 1, day);
                                } else {
                                  dateObj = new Date(datePremiereCreation);
                                }
                                
                                if (!isNaN(dateObj.getTime())) {
                                  console.log("Navigation vers date valide:", dateObj);
                                  // Utiliser setTimeout pour s'assurer que l'�tat est mis � jour apr�s que tous les shifts sont charg�s
                                  setTimeout(() => {
                                    setDateCourante(dateObj);
                                    // S'assurer que les dates sont mises � jour pour la nouvelle date courante
                                    if (viewType === "jour") setDates(generateDayDates(dateObj));
                                    else if (viewType === "semaine") setDates(generateWeekDates(dateObj));
                                    else setDates(generateMonthDates(dateObj));
                                  }, 100);
                                }
                              } catch (e) {
                                console.error("Erreur lors de la navigation vers la date:", e);
                              }
                            }
                            
                            setNotification({
                              type: "success",
                              message: "Plannings créés avec succès",
                              duration: 3000
                            });
                          } else {
                            setNotification({
                              type: "error",
                              message: "Les plannings ont été créés mais n'ont pas pu être chargés",
                              duration: 5000
                            });
                          }
                        }, 500);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
        </div>

      {/* Notification de restauration de navigation */}
      {showRestoreNotification && restoreNotificationData && (
        <NavigationRestoreNotification
          show={showRestoreNotification}
          onDismiss={() => setShowRestoreNotification(false)}
          restoredDate={restoreNotificationData.date}
          restoredViewType={restoreNotificationData.viewType}
          sessionDuration={restoreNotificationData.sessionDuration}
        />
      )}
      
      {/* Rapport d'heures employ� */}
      {rapportEmployeId && (
        <RapportHeuresEmploye
          employeId={rapportEmployeId}
          onClose={() => setRapportEmployeId(null)}
        />
      )}

      {/* Panneau de score d'assiduit� */}
      {scoreEmployeData && (
        <EmployeScorePanel
          employeId={scoreEmployeData.id}
          employeName={`${scoreEmployeData.prenom} ${scoreEmployeData.nom}`}
          onClose={() => setScoreEmployeData(null)}
        />
      )}

      {/* Modale Gestion des Anomalies */}
      {showAdminPanel && isAdmin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
            <AnomaliesManager
              embedded={true}
              onClose={() => setShowAdminPanel(false)}
              showToast={showToast}
            />
          </div>
        </div>
      )}

      {/* Modal pour traiter les anomalies */}
      {anomalieSelectionnee && (
        <ModalTraiterAnomalie
          anomalie={anomalieSelectionnee}
          isOpen={!!anomalieSelectionnee}
          onClose={() => setAnomalieSelectionnee(null)}
          onTraited={(anomalieMAJ) => {
            // Mettre � jour le statut localement pour synchroniser avec le planning
            const dateStr = anomalieMAJ.date || anomalieMAJ.pointage?.date;
            if (dateStr && anomalieMAJ.employeId && anomalieMAJ.id) {
              const formattedDate = typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
              updateAnomalieStatus(
                anomalieMAJ.employeId, 
                formattedDate, 
                anomalieMAJ.id, 
                anomalieMAJ.statut,
                anomalieMAJ.adminNote
              );
              console.log('?? Synchronisation planning apr�s traitement anomalie:', anomalieMAJ.id);
            }
            
            // Refresh pour �tre s�r
            refreshShifts(true);
            loadAnomaliesPeriode(); // Toujours recharger les anomalies avec le nouveau syst�me
            if (showComparaison) {
              console.log('?? Rechargement comparaisons apr�s traitement anomalie');
              loadComparaisons(); // Recharger les comparaisons pour avoir les statuts � jour
            }
            
            // Second refresh apr�s d�lai pour s'assurer que tout est synchronis�
            setTimeout(() => {
              console.log('?? Second refresh apr�s traitement anomalie');
              if (showComparaison) loadComparaisons();
              setUpdateTrigger(prev => prev + 1);
            }, 1000);
          }}
        />
      )}

      {/* Modale Remplacements - Int�gration parfaite style Planning */}
      {showRemplacementsPanel && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6 lg:p-8"
          onClick={(e) => e.target === e.currentTarget && setShowRemplacementsPanel(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-[1100px] flex flex-col overflow-hidden"
            style={{ height: 'min(82vh, 780px)' }}
          >
            {/* Header - Proportions exactes comme AdminAnomaliesPanel */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#cf292c] flex items-center justify-center shadow-sm">
                    <RefreshCw className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Gestion des Remplacements</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Gérez les demandes de remplacement de votre équipe</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRemplacementsPanel(false)}
                  className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Barre d'info avec badge */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {remplacementsEnAttente > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#cf292c]/10 rounded-lg">
                      <span className="w-2 h-2 bg-[#cf292c] rounded-full animate-pulse"></span>
                      <span className="text-sm font-semibold text-[#cf292c]">{remplacementsEnAttente} en attente</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowRemplacementsPanel(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Appuyer sur Échap pour fermer
                </button>
              </div>
            </div>
            
            {/* Contenu - padding ajust� pour coh�rence */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50/30">
              <ReplacementsManager embedded={true} />
            </div>
          </div>
        </div>
      )}

      {/* Modale Extras - Style coh�rent avec Remplacements */}
      {showExtrasPanel && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6 lg:p-8"
          onClick={(e) => e.target === e.currentTarget && setShowExtrasPanel(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-[1100px] flex flex-col overflow-hidden"
            style={{ height: 'min(82vh, 780px)' }}
          >
            {/* Header - Style charte */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#cf292c] flex items-center justify-center shadow-sm">
                    <Banknote className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Extras à payer</h2>
                    <p className="text-sm text-gray-500">Gérez les paiements en espèces</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExtrasPanel(false)}
                  className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* Contenu */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50/30">
              <ExtrasManager embedded={true} onRefresh={() => refreshShifts(true)} />
            </div>
          </div>
        </div>
      )}

      {/* Panneau de debug (seulement en d�veloppement) */}
      {process.env.NODE_ENV === 'development' && (
        <React.Suspense fallback={null}>
          <AnomaliesDebugPanel
            anomaliesData={anomaliesData}
            comparaisons={comparaisons}
            isVisible={showDebugPanel}
            onToggle={() => setShowDebugPanel(!showDebugPanel)}
          />
        </React.Suspense>
      )}
    </DndProvider>
  );
}
