// client/src/pages/MonPlanning.jsx - Style App RH
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Users, 
  AlertCircle, RefreshCw, UserPlus, Clock,
  FileText, ArrowLeftRight, UtensilsCrossed,
  User, CheckCircle2, X, Send, Eye, Hand,
  Inbox, UserCheck, XCircle, Hourglass,
  Calendar, Briefcase, RotateCcw, UserX, Layers,
  Palmtree, Stethoscope, Baby, GraduationCap, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import BottomNav from '../components/BottomNav';
import ConfirmModal from '../components/ConfirmModal';
import { toLocalDateString, isShiftInPast, isShiftStarted, isShiftStartingWithin } from '../utils/parisTimeUtils';
import { getCreneauFromSegments, getCreneauStyle } from '../utils/creneauUtils';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const brand = '#cf292c'; // Rouge app

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

const formatWeekRange = (start, end) => {
  const startStr = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const endStr = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${startStr} au ${endStr}`;
};

// Parser les segments si c'est une chaîne JSON
const parseSegments = (segments) => {
  if (!segments) return [];
  if (typeof segments === 'string') {
    try {
      return JSON.parse(segments);
    } catch {
      return [];
    }
  }
  return Array.isArray(segments) ? segments : [];
};

const calculateShiftDuration = (segments) => {
  const segs = parseSegments(segments);
  if (segs.length === 0) return { hours: 0, minutes: 0, pauseMinutes: 0 };
  
  let totalMinutes = 0;
  let pauseMinutes = 0;
  
  segs.forEach(seg => {
    const start = seg.start || seg.debut;
    const end = seg.end || seg.fin;
    if (!start || !end) return;
    
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    
    let duration = (eH * 60 + eM) - (sH * 60 + sM);
    if (duration < 0) duration += 24 * 60;
    
    if (seg.type?.toLowerCase() === 'pause' || seg.type?.toLowerCase() === 'break') {
      pauseMinutes += duration;
    } else {
      totalMinutes += duration;
    }
  });
  
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    pauseMinutes
  };
};

const formatDuration = (duration) => {
  if (duration.minutes > 0) {
    return `${duration.hours}h${duration.minutes.toString().padStart(2, '0')}`;
  }
  return `${duration.hours}h`;
};

const getShiftHoraires = (shift) => {
  const segments = parseSegments(shift?.segments);
  if (segments.length === 0) return { start: '--:--', end: '--:--', hasCoupure: false, allRanges: [] };
  const segs = segments.filter(s => 
    s.type?.toLowerCase() !== 'pause' && s.type?.toLowerCase() !== 'break'
  );
  if (segs.length === 0) return { start: '--:--', end: '--:--', hasCoupure: false, allRanges: [] };
  
  const first = segs[0].start || segs[0].debut;
  const last = segs[segs.length - 1].end || segs[segs.length - 1].fin;
  
  // Détecter s'il y a une coupure (gap >= 2h entre segments)
  let hasCoupure = false;
  const allRanges = [];
  
  for (let i = 0; i < segs.length; i++) {
    const segStart = (segs[i].start || segs[i].debut)?.slice(0,5);
    const segEnd = (segs[i].end || segs[i].fin)?.slice(0,5);
    allRanges.push({ start: segStart, end: segEnd });
    
    if (i < segs.length - 1) {
      const currentEnd = segs[i].end || segs[i].fin;
      const nextStart = segs[i + 1].start || segs[i + 1].debut;
      if (currentEnd && nextStart) {
        const [endH, endM] = currentEnd.split(':').map(Number);
        const [startH, startM] = nextStart.split(':').map(Number);
        const gapMinutes = (startH * 60 + startM) - (endH * 60 + endM);
        if (gapMinutes >= 120) {
          hasCoupure = true;
        }
      }
    }
  }
  
  return { 
    start: first?.slice(0,5) || '--:--', 
    end: last?.slice(0,5) || '--:--',
    hasCoupure,
    allRanges
  };
};

const getWeekDates = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0,0,0,0);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const newDate = new Date(monday);
    newDate.setDate(monday.getDate() + i);
    dates.push(newDate);
  }
  return dates;
};

// Générer les 5 semaines autour de la semaine courante
const getWeeksAround = (currentOffset) => {
  const weeks = [];
  for (let i = -2; i <= 2; i++) {
    const today = new Date();
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) + ((currentOffset + i) * 7);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0,0,0,0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    weeks.push({ start: startOfWeek, end: endOfWeek, offset: currentOffset + i });
  }
  return weeks;
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Icône pour type de congé
function CongeIcon({ type }) {
  const t = (type || '').toLowerCase();
  if (t.includes('maladie') || t.includes('médical')) return <Stethoscope className="w-3.5 h-3.5" />;
  if (t.includes('maternité') || t.includes('paternité') || t.includes('parental')) return <Baby className="w-3.5 h-3.5" />;
  if (t.includes('formation')) return <GraduationCap className="w-3.5 h-3.5" />;
  if (t.includes('vacances') || t.includes('congé payé') || t.includes('cp')) return <Palmtree className="w-3.5 h-3.5" />;
  return <UserX className="w-3.5 h-3.5" />;
}

// Carte de shift compacte avec bouton remplacement
function ShiftCardSkello({ shift, onClick, showEmploye = false, onDemandeRemplacement, isMyShift = false, otherShiftsToday = [] }) {
  const horaires = getShiftHoraires(shift);
  const duration = calculateShiftDuration(shift.segments);
  const creneau = getCreneauFromSegments(shift.segments);
  const creneauStyle = creneau ? getCreneauStyle(creneau) : null;
  const CreneauIcon = creneauStyle?.Icon || Briefcase;
  
  const isRemplacement = shift?.motif?.toLowerCase()?.includes('remplacement');
  const remplacePourMatch = shift?.motif?.match(/remplacement\s+(?:de\s+)?(.+)/i);
  const remplacePour = remplacePourMatch ? remplacePourMatch[1].trim() : null;
  
  const poste = shift.employe?.categorie || shift.employe?.categories?.[0] || 'Équipier';
  const employeName = showEmploye && shift.employe 
    ? `${shift.employe.prenom} ${shift.employe.nom?.charAt(0)}.`
    : null;
  
  const shiftDate = new Date(shift.date);
  const today = new Date();
  today.setHours(0,0,0,0);
  const isFuture = shiftDate >= today;
  
  // Double shift : calculer les horaires et durée totale
  const isDoubleShift = otherShiftsToday.length > 0;
  const otherHoraires = otherShiftsToday.map(s => getShiftHoraires(s));
  
  // Calculer durée totale si double shift
  let totalDuration = duration;
  if (isDoubleShift) {
    otherShiftsToday.forEach(s => {
      const d = calculateShiftDuration(s.segments);
      totalDuration = {
        hours: totalDuration.hours + d.hours + Math.floor((totalDuration.minutes + d.minutes) / 60),
        minutes: (totalDuration.minutes + d.minutes) % 60,
        pauseMinutes: totalDuration.pauseMinutes + d.pauseMinutes
      };
    });
  }
  
  const handleRemplacementClick = (e) => {
    e.stopPropagation();
    if (onDemandeRemplacement) onDemandeRemplacement(shift);
  };
  
  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
    >
      <div className="flex">
        {/* Barre colorée */}
        <div 
          className="w-1.5 flex-shrink-0 rounded-l-xl"
          style={{ backgroundColor: isRemplacement ? '#8b5cf6' : (creneauStyle?.colorHex || brand) }}
        />
        
        <div className="flex-1 p-3">
          {/* Ligne 1 : Nom employé + Badge créneau */}
          {employeName && (
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {employeName}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {poste}
              </span>
            </div>
          )}
          
          {/* Ligne 2 : Horaires */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Afficher les créneaux séparés si coupure dans le même shift */}
            {horaires.hasCoupure && horaires.allRanges.length > 1 ? (
              <>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {horaires.allRanges[0].start} - {horaires.allRanges[0].end}
                </span>
                {horaires.allRanges.slice(1).map((r, i) => (
                  <span key={i} className="text-base font-semibold text-orange-600 dark:text-orange-400">
                    + {r.start} - {r.end}
                  </span>
                ))}
              </>
            ) : (
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {horaires.start} - {horaires.end}
              </span>
            )}
            {/* Double shifts (shifts séparés) */}
            {isDoubleShift && otherHoraires.map((h, i) => (
              <span key={i} className="text-base font-semibold text-blue-600 dark:text-blue-400">
                + {h.start} - {h.end}
              </span>
            ))}
          </div>
          
          {/* Ligne 3 : Durée + Repas + Badge créneau + Bouton remplacement */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <span 
                className="text-sm font-medium"
                style={{ color: creneauStyle?.colorHex || brand }}
              >
                {formatDuration(isDoubleShift ? totalDuration : duration)}
                {isDoubleShift && <span className="text-blue-500 ml-1">(total)</span>}
              </span>
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span className="font-medium">{isDoubleShift ? otherShiftsToday.length + 1 : 1} repas</span>
              </div>
            </div>
            
            {/* Badge créneau + Bouton remplacement */}
            <div className="flex items-center gap-2">
              {/* Badge type de créneau */}
              <div 
                className="px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1"
                style={{ 
                  backgroundColor: isRemplacement ? '#f3e8ff' : `${creneauStyle?.colorHex || brand}15`,
                  color: isRemplacement ? '#7c3aed' : (creneauStyle?.colorHex || brand)
                }}
              >
                {isRemplacement ? (
                  <>
                    <RotateCcw className="w-3 h-3" />
                    Rempl.
                  </>
                ) : (
                  <>
                    <CreneauIcon className="w-3 h-3" />
                    {creneauStyle?.label || 'Travail'}
                  </>
                )}
              </div>
              {isMyShift && isFuture && !isRemplacement && onDemandeRemplacement && (
                <button
                  onClick={handleRemplacementClick}
                  className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-500 dark:text-purple-400 transition-colors"
                  title="Demander un remplacement"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Info remplacement */}
          {isRemplacement && remplacePour && (
            <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 mt-1.5">
              <ArrowLeftRight className="w-3 h-3 flex-shrink-0" />
              <span>Remplace {remplacePour}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal détail du shift style Skello
function ShiftDetailModal({ shift, onClose, onDemandeRemplacement, currentUserId, otherShifts = [] }) {
  if (!shift) return null;
  
  const horaires = getShiftHoraires(shift);
  const duration = calculateShiftDuration(shift.segments);
  const creneau = getCreneauFromSegments(shift.segments);
  const creneauStyle = creneau ? getCreneauStyle(creneau) : null;
  const poste = shift.employe?.categorie || shift.employe?.categories?.[0] || 'Équipier';
  const lieu = shift.etablissement || 'Restaurant';
  const isRemplacement = shift?.motif?.toLowerCase()?.includes('remplacement');
  const isPast = isShiftInPast(shift.date, horaires.end);
  
  // Extraire le nom de la personne remplacée
  const remplacePourMatch = shift?.motif?.match(/remplacement\s+(?:de\s+)?(.+)/i);
  const remplacePour = remplacePourMatch ? remplacePourMatch[1].trim() : null;
  
  // Déterminer si c'est mon shift ou celui d'un collègue
  const isMyShift = shift.employeId === currentUserId || shift.employe?.id === currentUserId;
  const employeName = shift.employe ? `${shift.employe.prenom} ${shift.employe.nom?.charAt(0)}.` : null;
  
  // Double shift : autres shifts du même jour pour le même employé
  const isDoubleShift = otherShifts.length > 0;
  const otherHoraires = otherShifts.map(s => getShiftHoraires(s));
  
  // Calculer durée totale si double shift
  let totalDuration = { ...duration };
  let totalRepas = 1;
  if (isDoubleShift) {
    otherShifts.forEach(s => {
      const d = calculateShiftDuration(s.segments);
      totalDuration = {
        hours: totalDuration.hours + d.hours + Math.floor((totalDuration.minutes + d.minutes) / 60),
        minutes: (totalDuration.minutes + d.minutes) % 60,
        pauseMinutes: totalDuration.pauseMinutes + d.pauseMinutes
      };
      totalRepas++;
    });
  }
  
  const shiftDate = new Date(shift.date);
  const dateFormatted = shiftDate.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60]" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <button 
            onClick={onClose}
            className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Fermer
          </button>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isMyShift ? 'Mon shift' : `Shift de ${employeName || 'collègue'}`}
          </h2>
          <div className="w-12" />
        </div>
        
        {/* Carte du shift */}
        <div className="p-4">
          <div 
            className="rounded-xl p-4 text-white"
            style={{ backgroundColor: isRemplacement ? '#7c3aed' : brand }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm opacity-90 capitalize">{dateFormatted}</div>
                <div className="font-medium">{lieu}</div>
              </div>
              <div className="text-right">
                {/* Horaires - afficher séparément si coupure */}
                {horaires.hasCoupure && horaires.allRanges.length > 1 ? (
                  <>
                    <div className="text-lg font-bold">{horaires.allRanges[0].start} - {horaires.allRanges[0].end}</div>
                    {horaires.allRanges.slice(1).map((r, i) => (
                      <div key={i} className="text-base font-semibold opacity-90">+ {r.start} - {r.end}</div>
                    ))}
                  </>
                ) : (
                  <div className="text-lg font-bold">{horaires.start} - {horaires.end}</div>
                )}
                {/* Double shifts séparés */}
                {isDoubleShift && otherHoraires.map((h, i) => (
                  <div key={i} className="text-base font-semibold opacity-90">+ {h.start} - {h.end}</div>
                ))}
              </div>
            </div>
            
            {/* Badge poste ou remplacement */}
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white/20">
                {isRemplacement ? (
                  <span className="flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4" />
                    Remplacement
                  </span>
                ) : poste}
              </div>
              {isRemplacement && remplacePour && (
                <div className="text-sm opacity-90">
                  → {remplacePour}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Note */}
        {shift.motif && !isRemplacement && (
          <div className="px-4 pb-4">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                <FileText className="w-4 h-4" />
                Note
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-300 pl-4">
                <li className="list-disc">{shift.motif}</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Info remplacement détaillée */}
        {isRemplacement && (
          <div className="px-4 pb-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                <ArrowLeftRight className="w-4 h-4" />
                Shift de remplacement
              </div>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                {isMyShift 
                  ? `Vous remplacez ${remplacePour || 'un collègue'} sur ce créneau.`
                  : `${employeName} remplace ${remplacePour || 'un collègue'} sur ce créneau.`
                }
              </p>
            </div>
          </div>
        )}
        
        {/* Détails du shift */}
        <div className="px-4 pb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Détails du shift</h3>
          
          <div className="space-y-0">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {isDoubleShift ? 'Durée totale' : 'Durée du shift'}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDuration(isDoubleShift ? totalDuration : duration)}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Pause</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {(isDoubleShift ? totalDuration.pauseMinutes : duration.pauseMinutes) > 0 
                  ? `${isDoubleShift ? totalDuration.pauseMinutes : duration.pauseMinutes} min` 
                  : '-'}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Créneau</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {creneauStyle?.label || 'Journée'}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">Repas</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                <UtensilsCrossed className="w-4 h-4 text-amber-500" />
                {totalRepas}
              </span>
            </div>
            
            {/* Afficher si double shift */}
            {isDoubleShift && (
              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700">
                <span className="text-sm text-gray-500 dark:text-gray-400">Double shift</span>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Layers className="w-4 h-4" />
                  Oui ({otherShifts.length + 1} shifts)
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Bouton remplacement - uniquement pour MES shifts */}
        {isMyShift && !isPast && !isRemplacement && onDemandeRemplacement && (
          <div className="px-4 pb-6 pt-2">
            <button
              onClick={() => onDemandeRemplacement(shift)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-blue-50"
              style={{ color: brand }}
            >
              <ArrowLeftRight className="w-5 h-5" />
              Demander un remplacement
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Modal de demande de remplacement
function ModalDemandeRemplacement({ shift, onClose, onSubmit }) {
  const [motif, setMotif] = useState('');
  const [priorite, setPriorite] = useState('normale');
  const [loading, setLoading] = useState(false);
  
  const horaires = getShiftHoraires(shift);
  const shiftDate = new Date(shift.date);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({ shiftId: shift.id, motif, priorite });
    setLoading(false);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60]" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <button 
            onClick={onClose}
            className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Annuler
          </button>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Demander un remplacement</h2>
          <div className="w-12" />
        </div>
        
        {/* Info shift */}
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Shift concerné</div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {shiftDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">{horaires.start} - {horaires.end}</div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          {/* Motif */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Motif de la demande
            </label>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              rows={3}
              placeholder="Expliquez pourquoi vous avez besoin d'un remplacement..."
              required
            />
          </div>
          
          {/* Priorité */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Priorité
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'basse', label: 'Basse' },
                { value: 'normale', label: 'Normale' },
                { value: 'haute', label: 'Haute' },
                { value: 'urgente', label: 'Urgente' }
              ].map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriorite(p.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    priorite === p.value 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !motif}
            className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50 transition-colors"
            style={{ backgroundColor: brand }}
          >
            {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export default function MonPlanning() {
  const [planningWeekOffset, setPlanningWeekOffset] = useState(0);
  const [planningView, setPlanningView] = useState('perso'); // 'perso' | 'equipe' | 'remplacements'
  const [selectedEquipeDay, setSelectedEquipeDay] = useState(null); // null = aujourd'hui pour la vue équipe
  
  const [shifts, setShifts] = useState([]);
  const [teamShifts, setTeamShifts] = useState([]);
  const [teamConges, setTeamConges] = useState([]); // Congés de l'équipe
  const [teamEmployes, setTeamEmployes] = useState([]); // Liste des collègues
  const [remplacementsDisponibles, setRemplacementsDisponibles] = useState([]);
  const [mesDemandes, setMesDemandes] = useState([]);
  const [mesCandidatures, setMesCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRemplacementModal, setShowRemplacementModal] = useState(false);
  
  // Modal de confirmation
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning'
  });
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };
  
  const token = localStorage.getItem('token');
  
  // Calcul de la semaine
  const weekRange = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) + (planningWeekOffset * 7);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0,0,0,0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return { start: startOfWeek, end: endOfWeek };
  }, [planningWeekOffset]);
  
  const weekDates = useMemo(() => getWeekDates(weekRange.start), [weekRange.start]);
  const weeksNavigation = useMemo(() => getWeeksAround(planningWeekOffset), [planningWeekOffset]);
  
  // Charger les shifts
  const fetchShifts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    
    try {
      const startStr = toLocalDateString(weekRange.start);
      const endStr = toLocalDateString(weekRange.end);
      
      const [myRes, teamRes] = await Promise.all([
        axios.get(`${API_BASE}/shifts/mes-shifts?start=${startStr}&end=${endStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/shifts/equipe?start=${startStr}&end=${endStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { shifts: [] } }))
      ]);
      
      setShifts(Array.isArray(myRes.data) ? myRes.data : []);
      const teamData = teamRes.data;
      setTeamShifts(Array.isArray(teamData) ? teamData : (teamData?.shifts || []));
      setTeamConges(teamData?.conges || []);
      setTeamEmployes(teamData?.employes || []);
    } catch (err) {
      console.error('Erreur chargement shifts:', err);
      setError('Impossible de charger le planning');
    } finally {
      setLoading(false);
    }
  }, [token, weekRange]);
  
  // Charger les remplacements disponibles + mes demandes + mes candidatures
  const fetchRemplacements = useCallback(async () => {
    if (!token) return;
    try {
      const [disponiblesRes, demandesRes, candidaturesRes] = await Promise.all([
        axios.get(`${API_BASE}/api/remplacements/disponibles`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/api/remplacements/mes-demandes`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/remplacements/mes-candidatures`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);
      setRemplacementsDisponibles(Array.isArray(disponiblesRes.data) ? disponiblesRes.data : []);
      setMesDemandes(Array.isArray(demandesRes.data) ? demandesRes.data : []);
      setMesCandidatures(Array.isArray(candidaturesRes.data) ? candidaturesRes.data : []);
    } catch (err) {
      console.error('Erreur chargement remplacements:', err);
    }
  }, [token]);
  
  useEffect(() => {
    fetchShifts();
    fetchRemplacements();
  }, [fetchShifts, fetchRemplacements]);
  
  // Navigation
  const goToWeek = (offset) => setPlanningWeekOffset(offset);
  const goToPrevWeek = () => setPlanningWeekOffset(w => w - 1);
  const goToNextWeek = () => setPlanningWeekOffset(w => w + 1);
  
  // Grouper les shifts par date
  const shiftsByDate = useMemo(() => {
    const currentShifts = planningView === 'perso' ? shifts : teamShifts;
    const grouped = {};
    
    weekDates.forEach(date => {
      const dateStr = toLocalDateString(date);
      grouped[dateStr] = {
        date,
        shifts: currentShifts.filter(s => toLocalDateString(s.date) === dateStr)
          .sort((a, b) => {
            const aStart = getShiftHoraires(a).start;
            const bStart = getShiftHoraires(b).start;
            return aStart.localeCompare(bStart);
          })
      };
    });
    
    return grouped;
  }, [weekDates, shifts, teamShifts, planningView]);
  
  // ID de l'utilisateur courant (obtenu depuis ses shifts)
  const currentUserId = useMemo(() => {
    if (shifts.length > 0) {
      return shifts[0].employeId || shifts[0].employe?.id;
    }
    return null;
  }, [shifts]);
  
  // Heures de la semaine
  const weeklyStats = useMemo(() => {
    let totalMinutes = 0;
    let shiftCount = 0;
    
    shifts.forEach(shift => {
      const duration = calculateShiftDuration(shift.segments);
      totalMinutes += duration.hours * 60 + duration.minutes;
      shiftCount++;
    });
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      count: shiftCount
    };
  }, [shifts]);
  
  // Calculer les absents par jour (congés approuvés)
  const absentsByDate = useMemo(() => {
    const absents = {};
    
    weekDates.forEach(date => {
      const dateStr = toLocalDateString(date);
      absents[dateStr] = [];
      
      teamConges.forEach(conge => {
        const debut = new Date(conge.dateDebut);
        const fin = new Date(conge.dateFin);
        debut.setHours(0,0,0,0);
        fin.setHours(23,59,59,999);
        
        if (date >= debut && date <= fin && conge.user) {
          absents[dateStr].push({
            ...conge.user,
            typeConge: conge.type || 'congé',
            motif: conge.motif
          });
        }
      });
    });
    
    return absents;
  }, [weekDates, teamConges]);
  
  // Détecter les doubles shifts (même employé, même jour)
  const doublesShiftsByDate = useMemo(() => {
    const doubles = {};
    
    weekDates.forEach(date => {
      const dateStr = toLocalDateString(date);
      const dayShifts = teamShifts.filter(s => toLocalDateString(s.date) === dateStr);
      
      // Compter les shifts par employé
      const shiftsParEmploye = {};
      dayShifts.forEach(shift => {
        const empId = shift.employeId || shift.employe?.id;
        if (!empId) return;
        if (!shiftsParEmploye[empId]) {
          shiftsParEmploye[empId] = { employe: shift.employe, shifts: [] };
        }
        shiftsParEmploye[empId].shifts.push(shift);
      });
      
      // Filtrer ceux qui ont 2+ shifts
      doubles[dateStr] = Object.values(shiftsParEmploye).filter(e => e.shifts.length >= 2);
    });
    
    return doubles;
  }, [weekDates, teamShifts]);
  
  // Actions
  const handleShiftClick = (shift) => {
    setSelectedShift(shift);
    setShowDetailModal(true);
  };
  
  const handleDemandeRemplacement = (shift) => {
    setSelectedShift(shift);
    setShowDetailModal(false);
    setShowRemplacementModal(true);
  };
  
  const submitDemandeRemplacement = async (data) => {
    try {
      const res = await fetch(`${API_BASE}/api/remplacements/demande`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      if (res.ok) {
        setShowRemplacementModal(false);
        setSelectedShift(null);
        fetchShifts();
        fetchRemplacements();
        showToast('Demande envoyée avec succès !');
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur lors de la demande', 'error');
      }
    } catch (err) {
      console.error('Erreur:', err);
      showToast('Erreur réseau', 'error');
    }
  };
  
  const handleCandidater = async (demandeId) => {
    try {
      await axios.post(`${API_BASE}/api/remplacements/${demandeId}/candidater`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRemplacements();
      showToast('Candidature envoyée !');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur', 'error');
    }
  };
  
  const handleAnnulerDemande = (demandeId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Annuler la demande',
      message: 'Êtes-vous sûr de vouloir annuler cette demande de remplacement ?\n\nCette action est irréversible.',
      type: 'warning',
      onConfirm: async () => {
        try {
          await axios.delete(`${API_BASE}/api/remplacements/${demandeId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          fetchRemplacements();
          showToast('Demande annulée');
        } catch (err) {
          showToast(err.response?.data?.error || 'Erreur lors de l\'annulation', 'error');
        }
      }
    });
  };
  
  const handleRetirerCandidature = (candidatureId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Retirer ma candidature',
      message: 'Voulez-vous vraiment retirer votre candidature à ce remplacement ?',
      type: 'warning',
      onConfirm: async () => {
        try {
          await axios.delete(`${API_BASE}/api/remplacements/candidature/${candidatureId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          fetchRemplacements();
          showToast('Candidature retirée');
        } catch (err) {
          showToast(err.response?.data?.error || 'Erreur', 'error');
        }
      }
    });
  };
  
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-navbar pt-header">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl shadow-lg text-white text-sm font-medium ${
          toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 sticky top-[calc(60px+env(safe-area-inset-top,0px))] z-30">
        {/* Titre */}
        <div className="px-4 pt-3 pb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Mon Planning</h1>
          <button 
            onClick={() => { fetchShifts(); fetchRemplacements(); }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-gray-400 dark:text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Toggle 3 onglets */}
        <div className="px-4 pb-3">
          <div className="flex bg-gray-100 dark:bg-slate-700 rounded-xl p-1 gap-1">
            <button
              onClick={() => setPlanningView('perso')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                planningView === 'perso' 
                  ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Mes shifts</span>
              <span className="sm:hidden">Shifts</span>
            </button>
            <button
              onClick={() => setPlanningView('equipe')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                planningView === 'equipe' 
                  ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Équipe
            </button>
            <button
              onClick={() => setPlanningView('remplacements')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all relative ${
                planningView === 'remplacements' 
                  ? 'bg-white dark:bg-slate-600 shadow-sm text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span className="hidden sm:inline">Remplacements</span>
              <span className="sm:hidden">Rempl.</span>
              {(remplacementsDisponibles.length > 0 || mesDemandes.filter(d => d.statut === 'en_attente').length > 0) && planningView !== 'remplacements' && (
                <span 
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-bold"
                  style={{ backgroundColor: brand }}
                >
                  {remplacementsDisponibles.length + mesDemandes.filter(d => d.statut === 'en_attente').length}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Navigation semaines - masqué pour équipe et remplacements */}
        {planningView !== 'remplacements' && planningView !== 'equipe' && (
        <div className="px-4 pb-2">
          {/* Semaine selector inline */}
          <div className="flex items-center gap-2 mb-2">
            <button 
              onClick={goToPrevWeek}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </button>
            
            <div className="flex-1 flex items-center justify-center gap-3">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {weekRange.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {weekRange.end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
              {planningWeekOffset !== 0 && (
                <button
                  onClick={() => setPlanningWeekOffset(0)}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:shadow-sm active:scale-95 text-white"
                  style={{ backgroundColor: brand }}
                >
                  <RotateCcw className="w-3 h-3" />
                  Aujourd'hui
                </button>
              )}
            </div>
            
            <button 
              onClick={goToNextWeek}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all active:scale-95"
            >
              <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </button>
          </div>
          
          {/* Mini-calendrier compact */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-2">
            <div className="grid grid-cols-7 gap-0.5">
              {weekDates.map((date, idx) => {
                const isTodayDate = date.toDateString() === new Date().toDateString();
                const hasShift = shifts.some(s => toLocalDateString(s.date) === toLocalDateString(date));
                const dayNames = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
                
                return (
                  <div 
                    key={idx} 
                    className={`flex flex-col items-center py-1 rounded-lg transition-all ${
                      isTodayDate ? '' : hasShift ? 'bg-gray-50 dark:bg-slate-700/50' : ''
                    }`}
                    style={isTodayDate ? { backgroundColor: `${brand}10` } : {}}
                  >
                    <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase">
                      {dayNames[idx]}
                    </span>
                    <span 
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                        isTodayDate 
                          ? 'text-white' 
                          : hasShift 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-300 dark:text-gray-600'
                      }`}
                      style={isTodayDate ? { backgroundColor: brand } : {}}
                    >
                      {date.getDate()}
                    </span>
                    {hasShift && (
                      <div 
                        className="w-1 h-1 rounded-full mt-0.5"
                        style={{ backgroundColor: isTodayDate ? 'white' : brand }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}
      </div>
      
      {/* Contenu */}
      <div className="px-4 py-4">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
          </div>
        )}
        
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24 mb-4" />
                <div className="h-20 bg-gray-100 dark:bg-slate-700/50 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats compactes */}
            {planningView === 'perso' && (
              <div className="flex gap-2">
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="w-4 h-4" style={{ color: brand }} />
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {weeklyStats.hours}h{weeklyStats.minutes > 0 && <span className="text-sm text-gray-500 dark:text-gray-400">{weeklyStats.minutes.toString().padStart(2, '0')}</span>}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Heures</div>
                </div>
                
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Calendar className="w-4 h-4" style={{ color: brand }} />
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{weeklyStats.count}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Shift{weeklyStats.count > 1 ? 's' : ''}</div>
                </div>
                
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Briefcase className="w-4 h-4" style={{ color: brand }} />
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{new Set(shifts.map(s => toLocalDateString(s.date))).size}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Jours</div>
                </div>
              </div>
            )}
            
            {/* Liste par jour - vue "perso" affiche tous les jours */}
            {planningView === 'perso' && Object.entries(shiftsByDate).map(([dateStr, { date, shifts: dayShifts }]) => {
              const isTodayDate = isToday(date);
              const hasShifts = dayShifts.length > 0;
              
              return (
                <div key={dateStr}>
                  {/* En-tête du jour */}
                  <div className={`flex items-center gap-2 mb-2 ${isTodayDate ? '' : 'text-gray-500'}`} style={isTodayDate ? { color: brand } : {}}>
                    {isTodayDate && (
                      <span 
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: brand }}
                      >
                        {date.getDate()}
                      </span>
                    )}
                    <span className={`text-sm font-medium capitalize`} style={isTodayDate ? { color: brand } : {}}>
                      {date.toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        day: isTodayDate ? undefined : 'numeric', 
                        month: 'short' 
                      })}
                    </span>
                    {isTodayDate && (
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${brand}15`, color: brand }}
                      >
                        Aujourd'hui
                      </span>
                    )}
                  </div>
                  
                  {/* Shifts du jour */}
                  {hasShifts ? (
                    <div className="space-y-2">
                      {dayShifts.map((shift, idx) => {
                        const employeId = shift.employeId || shift.employe?.id;
                        const otherShiftsToday = dayShifts.filter(s => 
                          (s.employeId || s.employe?.id) === employeId && s.id !== shift.id
                        );
                        
                        return (
                          <ShiftCardSkello
                            key={shift.id}
                            shift={shift}
                            onClick={() => handleShiftClick(shift)}
                            showEmploye={false}
                            onDemandeRemplacement={handleDemandeRemplacement}
                            isMyShift={true}
                            otherShiftsToday={otherShiftsToday}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-600 p-4 text-center">
                      <div className="text-gray-400 dark:text-gray-500 text-sm">Repos</div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Vue Équipe - Sélecteur de jour + liste du jour sélectionné */}
            {planningView === 'equipe' && (() => {
              const todayStr = toLocalDateString(new Date());
              const displayDateStr = selectedEquipeDay || todayStr;
              const dayData = shiftsByDate[displayDateStr];
              const dayShifts = dayData?.shifts || [];
              const dayDate = dayData?.date || new Date(displayDateStr);
              const dayAbsents = absentsByDate[displayDateStr] || [];
              
              return (
                <>
                  {/* Navigation semaine */}
                  <div className="flex items-center gap-2 mb-3">
                    <button 
                      onClick={goToPrevWeek}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </button>
                    
                    <div className="flex-1 flex items-center justify-center gap-3">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {weekRange.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {weekRange.end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                      {planningWeekOffset !== 0 && (
                        <button
                          onClick={() => setPlanningWeekOffset(0)}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all hover:shadow-sm active:scale-95 text-white"
                          style={{ backgroundColor: brand }}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Auj.
                        </button>
                      )}
                    </div>
                    
                    <button 
                      onClick={goToNextWeek}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </button>
                  </div>

                  {/* Sélecteur de jour compact */}
                  <div className="grid grid-cols-7 gap-1 mb-4 bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm border border-gray-100 dark:border-slate-700">
                    {Object.entries(shiftsByDate).map(([dateStr, { date }], idx) => {
                      const isToday = dateStr === todayStr;
                      const isSelected = dateStr === displayDateStr;
                      const shiftsCount = shiftsByDate[dateStr]?.shifts?.length || 0;
                      const hasAbsents = (absentsByDate[dateStr] || []).length > 0;
                      
                      return (
                        <button
                          key={dateStr}
                          onClick={() => setSelectedEquipeDay(isToday ? null : dateStr)}
                          className={`flex flex-col items-center py-2 rounded-lg transition-all ${
                            isSelected 
                              ? 'ring-2 ring-offset-1'
                              : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                          }`}
                          style={isSelected ? { 
                            backgroundColor: `${brand}10`,
                            '--tw-ring-color': brand
                          } : {}}
                        >
                          <span className={`text-[10px] font-medium uppercase ${
                            isSelected ? '' : 'text-gray-400 dark:text-gray-500'
                          }`} style={isSelected ? { color: brand } : {}}>
                            {date.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0,2)}
                          </span>
                          <span className={`text-sm font-bold ${
                            isSelected ? '' : 'text-gray-700 dark:text-gray-300'
                          }`} style={isSelected ? { color: brand } : {}}>
                            {date.getDate()}
                          </span>
                          <div className="flex gap-0.5 mt-0.5">
                            {shiftsCount > 0 && (
                              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: brand }}></div>
                            )}
                            {hasAbsents && (
                              <div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* En-tête du jour sélectionné */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                      {dayDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <div className="flex items-center gap-2">
                      {dayAbsents.length > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <UserX className="w-3 h-3" />
                          {dayAbsents.length} absent{dayAbsents.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400">
                        {dayShifts.length} shift{dayShifts.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Absents du jour */}
                  {dayAbsents.length > 0 && (
                    <div className="mb-3 p-2.5 rounded-xl border-l-4 bg-red-50 dark:bg-red-900/20" style={{ borderColor: '#ef4444' }}>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Absents ce jour
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {dayAbsents.map((absent, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 shadow-sm text-xs">
                            <CongeIcon type={absent.typeConge} />
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {absent.prenom} {absent.nom?.charAt(0)}.
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 text-[10px] capitalize">
                              {absent.typeConge}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Liste des shifts - avec scroll limité */}
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {dayShifts.length > 0 ? (
                      dayShifts.map((shift) => {
                        const employeId = shift.employeId || shift.employe?.id;
                        const otherShiftsToday = dayShifts.filter(s => 
                          (s.employeId || s.employe?.id) === employeId && s.id !== shift.id
                        );
                        
                        return (
                          <ShiftCardSkello
                            key={shift.id}
                            shift={shift}
                            onClick={() => handleShiftClick(shift)}
                            showEmploye={true}
                            onDemandeRemplacement={null}
                            isMyShift={false}
                            otherShiftsToday={otherShiftsToday}
                          />
                        );
                      })
                    ) : (
                      <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-600 p-6 text-center">
                        <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <div className="text-gray-400 dark:text-gray-500 text-sm">Aucun collègue planifié</div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
            
            {/* Message si aucun shift */}
            {planningView === 'perso' && weeklyStats.count === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Aucun shift cette semaine</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Profitez de votre repos !</p>
              </div>
            )}

            {/* ═══ VUE REMPLACEMENTS ═══ */}
            {planningView === 'remplacements' && (
              <div className="space-y-5">
                {/* Section: Shifts à pourvoir */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: brand }}>
                      Shifts à pourvoir
                    </h3>
                    {remplacementsDisponibles.length > 0 && (
                      <span 
                        className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: brand }}
                      >
                        {remplacementsDisponibles.length}
                      </span>
                    )}
                  </div>
                  
                  {remplacementsDisponibles.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 text-center">
                      <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${brand}10` }}>
                        <CheckCircle2 className="w-5 h-5" style={{ color: brand }} />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Aucun shift à pourvoir</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {remplacementsDisponibles.map(demande => {
                        const shiftDate = demande.shift?.date ? new Date(demande.shift.date) : null;
                        const horaires = getShiftHoraires(demande.shift);
                        const isPrioritaire = demande.priorite === 'urgente' || demande.priorite === 'haute';
                        
                        return (
                          <div key={demande.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {shiftDate?.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  </span>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {horaires.start} - {horaires.end}
                                  </span>
                                  {isPrioritaire && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400">
                                      Urgent
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                  {demande.employeAbsent?.prenom} {demande.employeAbsent?.nom?.charAt(0)}.
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleCandidater(demande.id)}
                                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                                style={{ backgroundColor: brand }}
                              >
                                Candidater
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section: Mes demandes */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: brand }}>
                      Mes demandes
                    </h3>
                    {mesDemandes.length > 0 && (
                      <span 
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${brand}15`, color: brand }}
                      >
                        {mesDemandes.length}
                      </span>
                    )}
                  </div>
                  
                  {mesDemandes.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 text-center">
                      <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${brand}10` }}>
                        <Send className="w-5 h-5" style={{ color: brand }} />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Aucune demande</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mesDemandes.map(demande => {
                        const shiftDate = demande.shift?.date ? new Date(demande.shift.date) : null;
                        const horaires = getShiftHoraires(demande.shift);
                        const nbCandidats = demande.candidatures?.length || 0;
                        const statut = demande.statut || 'en_attente';
                        const remplacant = demande.employeRemplacant;
                        
                        return (
                          <div key={demande.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {shiftDate?.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  </span>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {horaires.start} - {horaires.end}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                  {remplacant ? (
                                    <span className="text-emerald-500 dark:text-emerald-400">
                                      → {remplacant.prenom} {remplacant.nom?.charAt(0)}.
                                    </span>
                                  ) : nbCandidats > 0 ? (
                                    <span>{nbCandidats} candidat{nbCandidats > 1 ? 's' : ''}</span>
                                  ) : (
                                    <span>En attente...</span>
                                  )}
                                </div>
                              </div>
                              
                              <span className={`px-2 py-1 rounded-md text-[10px] font-medium ${
                                statut === 'validee' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                                statut === 'acceptee' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                                statut === 'refusee' ? 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400' :
                                'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                              }`}>
                                {statut === 'en_attente' ? 'En attente' : 
                                 statut === 'acceptee' ? 'À valider' :
                                 statut === 'validee' ? 'Confirmé' :
                                 statut === 'refusee' ? 'Refusée' : statut}
                              </span>
                              
                              {/* Bouton annuler pour demandes en attente */}
                              {statut === 'en_attente' && (
                                <button
                                  onClick={() => handleAnnulerDemande(demande.id)}
                                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-xs font-medium"
                                  title="Annuler la demande"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Annuler</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section: Mes candidatures */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: brand }}>
                      Mes candidatures
                    </h3>
                    {mesCandidatures.length > 0 && (
                      <span 
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${brand}15`, color: brand }}
                      >
                        {mesCandidatures.length}
                      </span>
                    )}
                  </div>
                  
                  {mesCandidatures.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 text-center">
                      <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${brand}10` }}>
                        <Hand className="w-5 h-5" style={{ color: brand }} />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Aucune candidature</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mesCandidatures.map(candidature => {
                        const demande = candidature.demandeRemplacement;
                        const shiftDate = demande?.shift?.date ? new Date(demande.shift.date) : null;
                        const horaires = getShiftHoraires(demande?.shift);
                        const statut = candidature.statut;
                        
                        return (
                          <div key={candidature.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {shiftDate?.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  </span>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {horaires.start} - {horaires.end}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                  {demande?.employeAbsent?.prenom} {demande?.employeAbsent?.nom?.charAt(0)}.
                                </div>
                              </div>
                              
                              <span className={`px-2 py-1 rounded-md text-[10px] font-medium ${
                                statut === 'acceptee' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                                statut === 'refusee' ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500' :
                                'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                              }`}>
                                {statut === 'en_attente' ? 'En attente' : 
                                 statut === 'acceptee' ? 'Acceptée' :
                                 statut === 'refusee' ? 'Refusée' : statut}
                              </span>
                              
                              {/* Bouton retirer candidature en attente */}
                              {statut === 'en_attente' && (
                                <button
                                  onClick={() => handleRetirerCandidature(candidature.id)}
                                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-xs font-medium"
                                  title="Retirer ma candidature"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Retirer</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Modals */}
      {showDetailModal && selectedShift && (() => {
        // Calculer les autres shifts du même jour pour le même employé
        const shiftDate = toLocalDateString(selectedShift.date);
        const employeId = selectedShift.employeId || selectedShift.employe?.id;
        const allDayShifts = (planningView === 'perso' ? shifts : teamShifts)
          .filter(s => toLocalDateString(s.date) === shiftDate && (s.employeId || s.employe?.id) === employeId);
        const otherShifts = allDayShifts.filter(s => s.id !== selectedShift.id);
        
        return (
          <ShiftDetailModal
            shift={selectedShift}
            currentUserId={currentUserId}
            onClose={() => { setShowDetailModal(false); setSelectedShift(null); }}
            onDemandeRemplacement={handleDemandeRemplacement}
            otherShifts={otherShifts}
          />
        );
      })()}
      
      {showRemplacementModal && selectedShift && (
        <ModalDemandeRemplacement
          shift={selectedShift}
          onClose={() => { setShowRemplacementModal(false); setSelectedShift(null); }}
          onSubmit={submitDemandeRemplacement}
        />
      )}
      
      {/* Modal de confirmation */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Confirmer"
        cancelText="Annuler"
      />
      
      <BottomNav />
      
      {/* CSS */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
