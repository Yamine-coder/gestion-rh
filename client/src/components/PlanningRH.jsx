// src/components/PlanningRH.jsx

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { normalizeDateLocal, getCurrentDateString, isToday } from '../utils/parisTimeUtils';
// Import uuid retiré - plus besoin d'IDs uniques pour les segments
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight
} from "lucide-react"; // Ajout d'icônes modernes
import ErrorMessage from "./ErrorMessage";
import CreationRapideForm from "./CreationRapideForm";
import NavigationRestoreNotification from "./NavigationRestoreNotification";
import RapportHeuresEmploye from "./RapportHeuresEmploye";
import { useSyncAnomalies } from '../hooks/useAnomalies';
import ModalTraiterAnomalie from './anomalies/ModalTraiterAnomalie';
import AnomalieManager from './anomalies/AnomalieManager';

// Configuration API centralisée
const API_URL = 'http://localhost:5000';

// Fonction utilitaire pour construire les URLs d'API
const buildApiUrl = (endpoint) => `${API_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

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
    return segment.paymentStatus === 'payé' 
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
  if (shift && shift.type === "présence" && shift.segments) {
    const totalMinutes = shift.segments.reduce((acc, seg) => {
      if (!seg.start || !seg.end) return acc;
      const start = seg.start.split(':').map(Number);
      const end = seg.end.split(':').map(Number);
      const startMin = start[0] * 60 + start[1];
      const endMin = end[0] * 60 + end[1];
      return acc + Math.max(0, endMin - startMin);
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
  const day = date.getDay();
  return day === 0 || day === 6; // dimanche = 0, samedi = 6
}

function formatDate(date) {
  if (typeof date === 'string') {
    // Si c'est déjà une chaîne au format YYYY-MM-DD, la retourner
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    date = new Date(date);
  }
  if (!(date instanceof Date) || isNaN(date)) {
    console.warn('formatDate: date invalide', date);
    return new Date().toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
}

function getJour(date) {
  if (typeof date === 'string') date = new Date(date);
  return date.getDate();
}

function getMois(date) {
  if (typeof date === 'string') date = new Date(date);
  return date.getMonth() + 1; // getMonth() retourne 0-11, on veut 1-12
}

function getSemaine(date) {
  if (typeof date === 'string') date = new Date(date);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - startOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}

// Fonctions pour générer les tableaux de dates selon la vue
function generateWeekDates(date) {
  const week = [];
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Lundi comme premier jour
  startOfWeek.setDate(diff);

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startOfWeek);
    currentDate.setDate(startOfWeek.getDate() + i);
    week.push(currentDate);
  }
  return week;
}

function generateMonthDates(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  
  const dates = [];
  for (let day = 1; day <= lastDay.getDate(); day++) {
    dates.push(new Date(year, month, day));
  }
  return dates;
}

function generateDayDates(date) {
  return [new Date(date)];
}

// Composant CongeBadge
function CongeBadge({ conge, compact = false }) {
  const getCongeStyle = (type, statut) => {
    const baseStyle = "px-2 py-1 rounded-full text-xs font-medium";
    
    if (statut === 'validé') {
      return `${baseStyle} bg-green-100 text-green-800 border border-green-200`;
    }
    if (statut === 'refusé') {
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

// Suppression de la fonction ensureSegmentId qui n'est plus utilisée

// Fonction utilitaire pour formater les dates pour les inputs HTML de type date
function formatDateForInput(dateString) {
  if (!dateString) return '';
  
  // Si la date est déjà au format YYYY-MM-DD, la renvoyer directement
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

// Générer la semaine courante (lundi à dimanche)
// (Ancien bloc d'affichage d'anomalies supprimé - il avait été collé au niveau racine par erreur)
// Créneau drag & drop (support compactMode)
function SegmentDraggable({ segment, employeId, date, index, type, compactMode=false }) {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SEGMENT,
    item: { segment, fromEmployeId: employeId, fromDate: date, fromIndex: index },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  // Calcul de la durée du segment
  let durationText;
  if (!segment.start || !segment.end) {
    durationText = '0min';
  } else {
    const [startH, startM] = segment.start.split(':').map(Number);
    const [endH, endM] = segment.end.split(':').map(Number);
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const durationHours = Math.floor(durationMinutes / 60);
    const durationMins = durationMinutes % 60;
    durationText = durationHours > 0 
      ? `${durationHours}h${durationMins > 0 ? durationMins.toString().padStart(2, '0') : ''}` 
      : `${durationMins}min`;
  }

  const coreClass = getSegmentStyle(segment);
  if(compactMode){
    return (
      <div
        ref={drag}
        className={`rounded-md px-1.5 py-1 text-[10px] leading-tight font-semibold cursor-move select-none shadow-sm transition border text-white flex items-center gap-1 ${coreClass} ${isDragging? 'opacity-40 scale-95':'hover:brightness-110'}`}
        title={`Créneau ${segment.start}-${segment.end} (${durationText})${segment.isExtra ? ` - EXTRA${segment.extraMontant ? ' ' + segment.extraMontant + '€' : ''}` : ''}${segment.commentaire ? ' - ' + segment.commentaire : ''}`}
      >
        <span>{segment.start}–{segment.end}</span>
        {segment.isExtra && <span className="text-[8px] bg-white/25 px-1 rounded">EXTRA</span>}
        {segment.aValider && <span className="text-[8px] bg-white/25 px-1 rounded">⏳</span>}
      </div>
    );
  }
  return (
    <div
      ref={drag}
      className={`rounded-md p-2 text-xs font-medium cursor-move select-none shadow-sm transition transform border text-white ${coreClass} ${isDragging ? "opacity-40 scale-95" : "hover:brightness-110"}`}
      title={`Créneau ${segment.start}-${segment.end} (${durationText})${segment.isExtra ? ` - EXTRA${segment.extraMontant ? ' ' + segment.extraMontant + '€' : ''}` : ''}${segment.commentaire ? ' - ' + segment.commentaire : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="w-1 h-4 rounded-full bg-white/40 flex-shrink-0" />
          <span className="font-semibold tracking-wide">
            {segment.start}–{segment.end}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        {segment.isExtra && (
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${
            segment.paymentStatus === 'payé' 
              ? 'bg-white/90 text-emerald-700' 
              : 'bg-white/30 text-white'
          }`}>
            EXTRA{segment.extraMontant ? ` ${segment.extraMontant}€` : ''}
            {segment.paymentStatus === 'payé' && ' ✓'}
          </span>
        )}
        {segment.aValider && (
          <span className="bg-white/90 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-bold">
            À VALIDER
          </span>
        )}
      </div>
      {segment.commentaire && (
        <div className="text-[9px] text-white/90 mt-1 flex items-start gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle flex-shrink-0 mt-0.5">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
          <span className="italic">{segment.commentaire}</span>
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
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.SEGMENT,
    canDrop: () => !conge, // drag interdit si congé prioritaire
    drop: (item) => {
      if (!conge) moveSegment(item, employeId, date);
     }
   });

  // Récupérer les écarts pour cette cellule si le mode comparaison est activé
  const ecarts = showComparaison ? getEcartsForEmployeeDate(employeId, date) : [];

  // Priorité : Congé validé
  if (conge) {
    return (
      <td
        ref={drop}
        title={`${resumeCell(conge, shift)} - Déplacement interdit (congé prioritaire)`}
        className={`relative p-2 ${cellSizeClass} text-center align-top transition rounded-md shadow-sm border border-red-200 bg-[#ffe5e5] ${
          isOver && !canDrop ? 'ring-2 ring-red-400 bg-red-100' : ''
        }`}
      >
        <div className="absolute inset-0 rounded-md ring-1 ring-red-300/60 pointer-events-none" />
        {isOver && !canDrop && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100/80 rounded-md">
            <span className="text-red-600 font-medium text-xs">❌ Interdit</span>
          </div>
        )}
        <CongeBadge conge={conge} />
        {/* Afficher les écarts même en cas de congé (important pour les anomalies) */}
        {showComparaison && ecarts.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {ecarts.map((ecart, idx) => {
              const f = formatEcart(ecart);
              const isAnomalie = ecart.type === 'absence_planifiee_avec_pointage';
              
              if (isAnomalie) {
                return (
                  <div key={idx} className="w-full">
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${f.bg} ${f.color} border-2 ${
                        ecart.statut === 'validee' ? 'border-green-400' :
                        ecart.statut === 'refusee' ? 'border-red-400' :
                        ecart.statut === 'traitee' ? 'border-blue-400' :
                        'border-red-300 hover:border-red-400'
                      } cursor-pointer`}
                      title={`${ecart.description || f.label}${ecart.statut ? `\nStatut: ${ecart.statut}` : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnomalieClick(employeId, date, ecart);
                      }}
                    >
                      <span className="text-xs">{f.icon}</span>
                      <span className="whitespace-nowrap flex-1">
                        ANOMALIE!
                        {ecart.statut && (
                          <span className="ml-1 text-[8px] font-bold">
                            ({ecart.statut === 'validee' ? '✅' : ecart.statut === 'refusee' ? '❌' : '🔄'})
                          </span>
                        )}
                      </span>
                      <span className="text-xs">⚙️</span>
                    </div>
                    {/* Actions rapides - masquer pour les anomalies déjà traitées */}
                    {!['validee', 'refusee', 'traitee'].includes(ecart.statut) && (
                      <div className="mt-1">
                        <EcartActions 
                          ecarts={[ecart]}
                          employeId={employeId}
                          date={date}
                          onUpdate={() => {
                            // Recharger les données après traitement
                            handleQuickAction?.(employeId, date, ecart, 'update');
                          }}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>
                );
              } else {
                // 🔧 GESTION AMÉLIORÉE des nouveaux types avec hors-plage et heures sup
                const isHorsPlage = ecart.type === 'hors_plage_in' || ecart.type === 'hors_plage_out' || ecart.type === 'hors_plage_out_critique';
                const isCritique = ecart.gravite === 'critique' || ecart.gravite === 'hors_plage' || ecart.type === 'retard_critique' || ecart.type === 'depart_premature_critique' || ecart.type === 'hors_plage_out_critique';
                const isAValider = ecart.gravite === 'a_valider' || ecart.type === 'heures_sup_a_valider';
                const isAutoValide = ecart.type === 'heures_sup_auto_validees';
                const isOK = ecart.gravite === 'ok' || ecart.gravite === 'info' || ecart.type?.includes('acceptable') || ecart.type?.includes('_a_l_heure') || isAutoValide;
                
                const displayText = f.label + (f.formattedTime ? ` ${f.formattedTime}` : '');
                const borderClass = isHorsPlage ? 'border-purple-400' :
                                  isCritique ? 'border-red-400' :
                                  isAValider ? 'border-amber-400' :
                                  isOK ? 'border-green-300' :
                                  'border-yellow-300';
                
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${f.bg} ${f.color} border ${f.borderClass || borderClass} ${
                      isHorsPlage ? 'animate-pulse' : ''
                    } cursor-pointer hover:brightness-95 group relative`}
                    title={`${ecart.description || f.label}${f.validatedBy ? `\nValidé par: ${f.validatedBy}` : ''}${f.adminNote ? `\nNote: ${f.adminNote}` : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Ne pas permettre de modifier les anomalies déjà validées ou refusées
                      if (!['validee', 'refusee', 'traitee'].includes(ecart.statut)) {
                        handleAnomalieClick(employeId, date, ecart);
                      }
                    }}
                  >
                    <span className="text-xs">{f.icon}</span>
                    <span className="truncate">{displayText}</span>
                    {/* Badge de statut pour anomalies traitées */}
                    {f.badge && (
                      <span className={`px-1 py-0.5 rounded-sm text-[8px] font-bold ${
                        ecart.statut === 'validee' ? 'bg-green-200 text-green-800' :
                        ecart.statut === 'refusee' ? 'bg-red-200 text-red-800' :
                        ecart.statut === 'traitee' ? 'bg-blue-200 text-blue-800' :
                        'bg-white/70 text-purple-700'
                      }`}>
                        {f.badge}
                      </span>
                    )}
                    {/* Indicateur visuel pour anomalies déjà traitées */}
                    {['validee', 'refusee', 'traitee'].includes(ecart.statut) && (
                      <span className="ml-0.5 text-xs">
                        {ecart.statut === 'validee' ? '✅' : ecart.statut === 'refusee' ? '❌' : '🔄'}
                      </span>
                    )}
                    {/* Menu d'actions au hover - uniquement pour anomalies non traitées */}
                    {!['validee', 'refusee', 'traitee'].includes(ecart.statut) && (
                      <div className="absolute left-0 top-full mt-1 hidden group-hover:flex bg-white shadow-lg border rounded-md p-2 z-50 min-w-[200px]">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs font-medium text-gray-700">{f.label}</div>
                          <div className="text-[10px] text-gray-500 mb-2">{ecart.description}</div>
                          <EcartActions 
                            ecarts={[ecart]}
                            employeId={employeId}
                            date={date}
                            onUpdate={() => {
                              handleQuickAction?.(employeId, date, ecart, 'update');
                            }}
                            compact={true}
                          />
                        </div>
                      </div>
                    )}
                    {/* Affichage spécial pour anomalies traitées */}
                    {['validee', 'refusee', 'traitee'].includes(ecart.statut) && (
                      <div className="absolute left-0 top-full mt-1 hidden group-hover:flex bg-white shadow-lg border rounded-md p-2 z-50 min-w-[250px]">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs font-medium text-gray-700">{f.label}</div>
                          <div className="text-[10px] text-gray-500">{ecart.description}</div>
                          {f.validatedBy && (
                            <div className="text-[10px] text-gray-600 mt-2">
                              <strong>Traité par:</strong> {f.validatedBy}
                            </div>
                          )}
                          {f.validatedAt && (
                            <div className="text-[10px] text-gray-600">
                              <strong>Date:</strong> {new Date(f.validatedAt).toLocaleString('fr-FR')}
                            </div>
                          )}
                          {f.adminNote && (
                            <div className="text-[10px] text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                              <strong>Note admin:</strong> {f.adminNote}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
            })}
          </div>
        )}
      </td>
    );
  }

  return (
    <td
      ref={drop}
      title={resumeCell(conge, shift)}
      className={`group p-2 ${cellSizeClass} text-center align-top cursor-pointer transition rounded-md shadow-sm border ${
        isWeekend(new Date(date)) ? 'bg-slate-50 border-gray-200' : 'bg-white border-gray-100'
      } ${isOver && canDrop ? 'ring-1 ring-[#cf292c]' : ''} hover:bg-gray-50`}
      onClick={() => onCellClick(employeId, date)}
    >
      {shift && shift.type === "présence" && shift.segments && shift.segments.length > 0 ? (
        denseMode ? (
          <div className="flex flex-col h-full gap-0.5">
            {/* Mini-blocs horaires lisibles */}
            <div className="flex flex-wrap gap-0.5 items-start">
              {(() => {
                const maxToShow = 3;
                const segs = shift.segments.slice(0, maxToShow);
                return (
                  <>
                    {segs.map((s,idx) => {
                      if (!s.start || !s.end) return null;
                      const [sh,sm] = s.start.split(':');
                      const [eh,em] = s.end.split(':');
                      const color = s.aValider ? 'bg-amber-400/90' : s.isExtra ? 'bg-emerald-600/90' : 'bg-blue-600/90';
                      return (
                        <span key={idx} className={`px-1.5 py-0.5 rounded text-[10px] leading-none font-semibold text-white shadow-sm ${color}`} title={`${s.start} – ${s.end}${s.commentaire? ' | '+s.commentaire:''}${s.isExtra? ' (EXTRA)':''}${s.aValider? ' (À valider)':''}`}>{sh}:{sm}–{eh}:{em}</span>
                      );
                    })}
                    {shift.segments.length > maxToShow && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] leading-none font-medium bg-gray-200 text-gray-700" title={shift.segments.slice(maxToShow).map(s=>`${s.start}-${s.end}`).join(', ')}>+{shift.segments.length - maxToShow}</span>
                    )}
                  </>
                );
              })()}
            </div>
            {/* Durée totale */}
            <div className="mt-auto flex items-center justify-between text-[9px] text-gray-600 font-medium">
              <span className="truncate max-w-[70%]" title={shift.segments.map(s=>`${s.start}-${s.end}`).join(' • ')}>Total</span>
              <span className="bg-gray-100 px-1 py-0.5 rounded">
                {(() => {
                  const totalMinutes = shift.segments.reduce((acc, seg) => {
                    if (!seg.start || !seg.end) return acc;
                    const [startH, startM] = seg.start.split(':').map(Number);
                    const [endH, endM] = seg.end.split(':').map(Number);
                    return acc + ((endH * 60 + endM) - (startH * 60 + startM));
                  }, 0);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  return hours > 0 ? `${hours}h${minutes > 0 ? minutes.toString().padStart(2,'0') : ''}` : `${minutes}m`;
                })()}
              </span>
            </div>
            {showComparaison && ecarts.length > 0 && (
              <div className="flex flex-wrap gap-0.5 pt-0.5 border-t border-gray-100 mt-0.5">
                {ecarts.map((ecart, idx) => {
                  const f = formatEcart(ecart);
                  return (
                    <div key={idx} className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium ${f.bg} ${f.color}`} title={ecart.description || f.label}>
                      <span>{f.icon}</span>
                    </div>
                  );
                })} 
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {/* En-tête du shift avec durée totale */}
            <div className="text-[9px] text-gray-500 font-medium flex items-center justify-between">
              <span>Présence</span>
              <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                {(() => {
                  const totalMinutes = shift.segments.reduce((acc, seg) => {
                    if (!seg.start || !seg.end) return acc;
                    const [startH, startM] = seg.start.split(':').map(Number);
                    const [endH, endM] = seg.end.split(':').map(Number);
                    return acc + ((endH * 60 + endM) - (startH * 60 + startM));
                  }, 0);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  return hours > 0 ? `${hours}h${minutes > 0 ? minutes.toString().padStart(2, '0') : ''}` : `${minutes}min`;
                })()}
              </span>
            </div>
            {shift.segments.map((seg, i) => (
              <SegmentDraggable
                key={i}
                segment={seg}
                employeId={employeId}
                date={date}
                index={i}
                type={shift.type}
                motif={shift.motif}
                compactMode={denseMode}
              />
            ))}
            {showComparaison && ecarts.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {ecarts.map((ecart, idx) => {
                  const f = formatEcart(ecart);
                  const mins = Math.abs(ecart.dureeMinutes || 0);
                  const plusGroup = ['retard','heures_supplementaires','heures_sup_auto_validees','heures_sup_a_valider'];
                  const minusGroup = ['arrivee_anticipee','depart_anticipe'];
                  const signe = plusGroup.includes(ecart.type) ? '+' : minusGroup.includes(ecart.type) ? '-' : '';
                  const mTxt = mins > 0 ? `${signe}${mins}m` : '';
                  let text;
                  switch (ecart.type) {
                    case 'retard': text = `Retard ${mTxt}`; break;
                    case 'arrivee_anticipee': text = `Avance ${mTxt}`; break;
                    case 'arrivee_a_l_heure': text = 'Arrivée ok'; break;
                    case 'heures_supplementaires': text = `${mTxt} supp`; break;
                    case 'heures_sup_auto_validees': text = `${mTxt} auto`; break;
                    case 'heures_sup_a_valider': text = `${mTxt} à valid`; break;
                    case 'hors_plage_out_critique': text = `${mTxt} crit`; break;
                    case 'depart_anticipe': text = `Départ -${mins}m`; break;
                    case 'depart_a_l_heure': text = 'Départ ok'; break;
                    case 'absence_totale': text = 'Absent'; break;
                    case 'presence_non_prevue': text = 'Non prévu'; break;
                    case 'absence_planifiee_avec_pointage': text = 'ANOMALIE!'; break;
                    case 'absence_conforme': text = 'Absence OK'; break;
                    default: text = f.label;
                  }
                  // Vérifier si c'est un écart critique qui nécessite une action admin ou hors plage
                  const needsAdminAction = ['retard_critique', 'depart_premature_critique', 'hors_plage_out_critique', 'hors_plage_in', 'presence_non_prevue', 'absence_planifiee_avec_pointage'].includes(ecart.type);
                  
                  return (
                    <div key={idx} className="flex flex-col gap-1">
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${f.bg} ${f.color} ${needsAdminAction ? 'cursor-pointer hover:shadow-md hover:scale-105 transition-all border-2 border-red-300' : ''}`}
                        title={`${ecart.description || text}${needsAdminAction ? ' - Cliquer pour traiter' : ''}`}
                        onClick={needsAdminAction ? (e) => {
                          e.stopPropagation();
                          handleAnomalieClick(employeId, date, ecart);
                        } : undefined}
                      >
                        <span className="text-xs">{f.icon}</span>
                        <span className="whitespace-nowrap">{text}</span>
                        {needsAdminAction && <span className="text-xs">⚙️</span>}
                      </div>
                      
                      {/* Actions rapides (désormais cachées si statut déjà traité) */}
                      {needsAdminAction && !['validee','refusee','corrigee','traitee'].includes(ecart.statut) && (
                        <EcartActions 
                          ecarts={[ecart]}
                          employeId={employeId}
                          date={date}
                          onUpdate={() => {
                            handleQuickAction?.(employeId, date, ecart, 'update');
                          }}
                          compact={true}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      ) : shift && shift.type === "absence" ? (
        <div className="rounded-md px-2 py-2 text-xs font-medium bg-[#ffd6d6] text-[#cf292c] flex flex-col items-center space-y-1">
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="m15 9-6 6"/>
              <path d="m9 9 6 6"/>
            </svg>
            <span className="font-semibold tracking-wider leading-none">{shift.motif}</span>
          </div>
          <span className="font-normal text-[9px] text-[#cf292c]/70 bg-white/50 px-1.5 py-0.5 rounded-full">Absence</span>
          {/* Afficher les écarts même pour les absences (important pour les anomalies) */}
          {showComparaison && ecarts.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {ecarts.map((ecart, idx) => {
                const f = formatEcart(ecart);
                const isAnomalie = ecart.type === 'absence_planifiee_avec_pointage';
                
                if (isAnomalie) {
                  return (
                    <div key={idx} className="w-full">
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${f.bg} ${f.color} border-2 border-red-300 cursor-pointer hover:border-red-400`}
                        title={ecart.description || f.label}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnomalieClick(employeId, date, ecart);
                        }}
                      >
                        <span className="text-xs">{f.icon}</span>
                        <span className="whitespace-nowrap flex-1">ANOMALIE!</span>
                        <span className="text-xs">⚙️</span>
                      </div>
                      {/* Actions rapides */}
                      <div className="mt-1">
                        <EcartActions 
                          ecarts={[ecart]}
                          employeId={employeId}
                          date={date}
                          onUpdate={() => {
                            handleQuickAction?.(employeId, date, ecart, 'update');
                          }}
                          compact={true}
                        />
                      </div>
                    </div>
                  );
                } else {
                  // Différencier les vrais anomalies des absences conformes et nouveaux types
                  const displayText = ecart.type === 'absence_conforme' ? f.label : 
                                    ecart.type === 'arrivee_a_l_heure' || ecart.type === 'depart_a_l_heure' ? f.label :
                                    ecart.type === 'arrivee_acceptable' || ecart.type === 'depart_acceptable' ? f.label :
                                    ecart.type === 'heures_sup_auto_validees' || ecart.type === 'heures_sup_a_valider' ? f.label :
                                    ecart.type === 'arrivee_anticipee' ? f.label :
                                    'ANOMALIE!';
                  
                  const borderClass = ecart.type === 'absence_conforme' ? 'border-green-300' :
                                    ecart.type === 'arrivee_a_l_heure' || ecart.type === 'depart_a_l_heure' ? 'border-emerald-300' :
                                    ecart.type === 'arrivee_acceptable' || ecart.type === 'depart_acceptable' ? 'border-green-300' :
                                    ecart.type === 'heures_sup_auto_validees' ? 'border-emerald-300' :
                                    ecart.type === 'heures_sup_a_valider' ? 'border-amber-300' :
                                    ecart.type === 'hors_plage_out_critique' ? 'border-purple-400' :
                                    ecart.type === 'arrivee_anticipee' ? 'border-green-300' :
                                    'border-red-300';
                  
                  // Vérifier si c'est un écart qui nécessite une action admin
                  const needsAdminAction = ['retard_critique', 'depart_premature_critique', 'hors_plage_out_critique', 'hors_plage_in', 'presence_non_prevue', 'absence_planifiee_avec_pointage'].includes(ecart.type);
                  
                  return (
                    <div key={idx} className="flex flex-col gap-1">
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${f.bg} ${f.color} border-2 ${borderClass} ${needsAdminAction ? 'cursor-pointer hover:shadow-md' : ''}`}
                        title={`${ecart.description || f.label}${needsAdminAction ? ' - Cliquer pour traiter' : ''}`}
                        onClick={needsAdminAction ? (e) => {
                          e.stopPropagation();
                          handleAnomalieClick(employeId, date, ecart);
                        } : undefined}
                      >
                        <span className="text-xs">{f.icon}</span>
                        <span className="whitespace-nowrap">{displayText}</span>
                        {needsAdminAction && <span className="text-xs">⚙️</span>}
                      </div>
                      
                      {/* Actions rapides pour les écarts critiques - INTERFACE OPTIMISÉE */}
                      {needsAdminAction && (
                        <div className="flex gap-1 text-[8px]">
                          <EcartActions 
                            ecarts={[ecart]}
                            employeId={employeId}
                            date={date}
                            onUpdate={() => {
                              handleQuickAction?.(employeId, date, ecart, 'update');
                            }}
                            compact={true}
                          />
                          
                          {/* Bouton pour ouvrir la modale détaillée */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAnomalieClick(employeId, date, ecart);
                            }}
                            className="bg-blue-50 text-blue-700 px-1.5 py-1 rounded hover:bg-blue-100 border border-blue-200 transition-colors"
                            title="Traitement détaillé"
                          >
                            ⚙️
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <button
            type="button"
            className="w-full flex-1 flex items-center justify-center rounded-md border border-dashed border-gray-300 text-gray-400 text-[10px] font-medium hover:border-[#cf292c] hover:text-[#cf292c] transition bg-white/40"
          >
            +
          </button>
          {/* Affichage des écarts - VERSION SOBRE */}
          {showComparaison && ecarts.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1 w-full">
              {ecarts.map((ecart, idx) => {
                const f = formatEcart(ecart);
                const mins = Math.abs(ecart.dureeMinutes || 0);
                const diffPlus = ['retard','heures_supplementaires'].includes(ecart.type);
                const diffMinus = ['arrivee_anticipee','depart_anticipe'].includes(ecart.type);
                const signe = diffPlus ? '+' : diffMinus ? '-' : '';
                const minutesTxt = mins > 0 ? `${signe}${mins}m` : '';
                let text;
                switch (ecart.type) {
                  case 'retard': text = `Retard ${minutesTxt}`; break;
                  case 'arrivee_anticipee': text = `Avance ${minutesTxt}`; break;
                  case 'arrivee_a_l_heure': text = 'Arrivée conforme'; break;
                  case 'heures_supplementaires': text = `Heures supp ${minutesTxt}`; break;
                  case 'heures_sup_auto_validees': text = `H. sup auto ${minutesTxt}`; break;
                  case 'heures_sup_a_valider': text = `H. sup à valider ${minutesTxt}`; break;
                  case 'hors_plage_out_critique': text = `Hors-plage OUT critique ${minutesTxt}`; break;
                  case 'hors_plage_in': text = `Hors-plage IN ${minutesTxt}`; break;
                  case 'depart_anticipe': text = `Départ anticipé ${minutesTxt}`; break;
                  case 'depart_a_l_heure': text = 'Départ conforme'; break;
                  case 'absence_totale': text = 'Absence totale'; break;
                  case 'presence_non_prevue': text = 'Présence non prévue'; break;
                  default: text = f.label;
                }
                
                // Vérifier si c'est un écart qui nécessite une action admin
                const needsAdminAction = ['retard_critique', 'depart_premature_critique', 'hors_plage_out_critique', 'hors_plage_in', 'presence_non_prevue', 'absence_planifiee_avec_pointage'].includes(ecart.type);
                
                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${f.bg} ${f.color} ${needsAdminAction ? 'cursor-pointer hover:shadow-md border-2 border-red-300' : ''}`}
                      title={`${ecart.description || text}${needsAdminAction ? ' - Cliquer pour traiter' : ''}`}
                      onClick={needsAdminAction ? (e) => {
                        e.stopPropagation();
                        handleAnomalieClick(employeId, date, ecart);
                      } : undefined}
                    >
                      <span className="text-xs">{f.icon}</span>
                      <span className="whitespace-nowrap">{text}</span>
                      {needsAdminAction && <span className="text-xs">⚙️</span>}
                    </div>
                    
                    {/* Actions rapides pour les écarts critiques */}
                    {needsAdminAction && (
                      <div className="flex gap-1 text-[8px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAction(employeId, date, ecart, 'validate');
                          }}
                          className="bg-green-100 text-green-700 px-1 py-0.5 rounded hover:bg-green-200"
                          title="Valider rapidement"
                        >
                          ✅ OK
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAction(employeId, date, ecart, 'extra');
                          }}
                          className="bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded hover:bg-emerald-200"
                          title="Convertir en heures extra"
                        >
                          💼 Extra
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAction(employeId, date, ecart, 'error');
                          }}
                          className="bg-red-100 text-red-700 px-1 py-0.5 rounded hover:bg-red-200"
                          title="Marquer comme erreur"
                        >
                          ❌ Erreur
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </td>
  );
}

  // Tableau Planning RH
// Vue mobile optimisée pour le planning
function PlanningMobileView({ employes, dates, shifts, conges, onCellClick, viewType, formatEmployeeName, getEmployeeInitials, showComparaison, getEcartsForEmployeeDate, formatEcart, getCategorieEmploye = () => ({ label: 'Général', color: 'bg-gray-100 text-gray-800', icon: '👤' }), employesGroupesParCategorie = [], handleAnomalieClick = () => {}, handleQuickAction = () => {} }) {
  const getCellData = (emp, dateStr) => {
    const normalizeDate = (d) => {
      // Utiliser la fonction standardisée
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
        
        // Debug: voir les congés trouvés
        if (empMatch) {
          console.log(`Congé trouvé pour ${emp.prenom} ${emp.nom} (${emp.id}):`, c);
        }
        
        // Accepter tous les statuts pour voir les congés
        const debutConge = normalizeDate(c.dateDebut);
        const finConge = normalizeDate(c.dateFin);
        const isInPeriod = cellDate && debutConge && finConge && 
               cellDate >= debutConge && 
               cellDate <= finConge;
               
        if (empMatch && isInPeriod) {
          console.log(`✅ Congé match: ${emp.prenom} le ${cellDate}, période ${debutConge}-${finConge}`);
        }
        
        return isInPeriod;
      } catch (e) {
        console.error("Erreur congé:", e);
        return false;
      }
    });
    
    return conge ? { shift: null, conge } : { shift, conge: null };
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
        
        {/* Affichage groupé par catégories avec séparateurs */}
        {employesGroupesParCategorie.length > 0 ? employesGroupesParCategorie.map((groupe, groupeIndex) => (
          <React.Fragment key={groupe.categorie}>
            {/* Séparateur de catégorie - Mobile */}
            <div className="flex items-center gap-3 mb-4 mt-6">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${groupe.infosCategorie.color} font-medium text-sm shadow-sm`}>
                <span className="text-lg">{groupe.infosCategorie.icon}</span>
                <span>{groupe.categorie}</span>
                <span className="bg-white/30 text-xs px-2 py-0.5 rounded-full ml-1">
                  {groupe.employes.length}
                </span>
              </div>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-gray-300 to-transparent rounded-full"></div>
            </div>
            
            {/* Employés de cette catégorie */}
            {groupe.employes.map(emp => {
              const { shift, conge } = getCellData(emp, dateStr);
              const ecarts = showComparaison ? getEcartsForEmployeeDate(emp.id, dateStr) : [];
              
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
                          <span className="text-sm">🏖️</span>
                          <span className="font-medium">{conge.type}</span>
                        </div>
                        {conge.motif && <div className="text-sm text-red-600 mt-1">{conge.motif}</div>}
                      </div>
                    ) : shift ? (
                      shift.type === 'absence' ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-orange-700">
                            <span className="text-sm">❌</span>
                            <span className="font-medium">Absent</span>
                          </div>
                          {shift.motif && <div className="text-sm text-orange-600 mt-1">{shift.motif}</div>}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {shift.segments?.map((segment, idx) => (
                            <div 
                              key={idx}
                              className={`rounded-lg p-3 ${
                                segment.aValider 
                                  ? 'bg-amber-50 border border-amber-200' 
                                  : 'bg-blue-50 border border-blue-200'
                              }`}
                            >
                              <div className={`flex items-center justify-between ${
                                segment.aValider ? 'text-amber-700' : 'text-blue-700'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">
                                    {segment.aValider ? '⏳' : '✅'}
                                  </span>
                                  <span className="font-medium">
                                    {segment.start} - {segment.end}
                                  </span>
                                </div>
                                <span className="text-sm font-medium">
                                  {(() => {
                                    if (!segment.start || !segment.end) return '0h';
                                    const [startH, startM] = segment.start.split(':').map(Number);
                                    const [endH, endM] = segment.end.split(':').map(Number);
                                    const minutes = (endH * 60 + endM) - (startH * 60 + startM);
                                    return `${(minutes / 60).toFixed(1)}h`;
                                  })()}
                                </span>
                              </div>
                              {segment.commentaire && (
                                <div className="text-sm text-gray-600 mt-1">
                                  {segment.commentaire}
                                </div>
                              )}
                              {segment.isExtra && (
                                <div className="mt-2">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    segment.paymentStatus === 'payé' 
                                      ? 'bg-emerald-100 text-emerald-700' 
                                      : 'bg-emerald-50 text-emerald-600'
                                  }`}>
                                    EXTRA {segment.extraMontant && `${segment.extraMontant}€`} 
                                    {segment.paymentStatus === 'payé' && ' ✓'}
                                  </span>
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
                    
                    {/* Écarts pour la comparaison */}
                    {showComparaison && ecarts.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-600 mb-2">Écarts détectés :</div>
                        <div className="flex flex-wrap gap-1">
                          {ecarts.map((ecart, idx) => {
                            const formatted = formatEcart(ecart);
                            return (
                              <div
                                key={idx}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${formatted.bg} ${formatted.color}`}
                              >
                                <span>{formatted.icon}</span>
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
                      
                      {/* Badge de catégorie employé pour mobile */}
                      {(() => {
                        const categorie = getCategorieEmploye(emp);
                        return (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${categorie.color}`} title={`Catégorie: ${categorie.label}`}>
                            <span>{categorie.icon}</span>
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
                        <span className="text-sm">🏖️</span>
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

  // Vue semaine/mois : Grille compacte par employé
  return (
    <div className="space-y-4">
      {employes.map(emp => {
        // Calculer les statistiques de la période
        const totalHeures = dates.reduce((acc, date) => {
          const dStr = formatDate(date);
          const { shift, conge } = getCellData(emp, dStr);
          if (!conge && shift && shift.type === 'présence' && shift.segments) {
            const heuresJour = shift.segments.reduce((sum, seg) => {
              if (!seg.start || !seg.end) return sum;
              const [startH, startM] = seg.start.split(':').map(Number);
              const [endH, endM] = seg.end.split(':').map(Number);
              return sum + ((endH * 60 + endM) - (startH * 60 + startM));
            }, 0) / 60;
            return acc + heuresJour;
          }
          return acc;
        }, 0);
        
        const joursPresence = dates.filter(date => {
          const dStr = formatDate(date);
          const { shift, conge } = getCellData(emp, dStr);
          return !conge && shift && shift.type === 'présence';
        }).length;
        
        return (
          <div key={emp.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            {/* En-tête employé */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#cf292c] text-white font-medium flex items-center justify-center text-sm">
                {getEmployeeInitials(emp)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{formatEmployeeName(emp)}</span>
                  
                  {/* Badge de catégorie employé pour mobile */}
                  {(() => {
                    const categorie = getCategorieEmploye(emp);
                    return (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${categorie.color}`} title={`Catégorie: ${categorie.label}`}>
                        <span>{categorie.icon}</span>
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
                            : shift.segments?.some(s => s.aValider)
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-blue-100 text-blue-700 border-blue-200'
                      }
                    `}
                  >
                    <div className="p-1 h-full flex flex-col justify-between">
                      <div className="text-[10px] leading-none">
                        {date.getDate()}
                      </div>
                      <div className="text-center">
                        {conge ? (
                          <span className="text-[10px]">🏖️</span>
                        ) : !shift ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-auto block"></span>
                        ) : shift.type === 'absence' ? (
                          <span className="text-[10px]">❌</span>
                        ) : shift.segments?.some(s => s.aValider) ? (
                          <span className="text-[10px]">⏳</span>
                        ) : (
                          <span className="text-[10px]">✅</span>
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
  getCategorieEmploye = () => ({ label: 'Général', color: 'bg-gray-100 text-gray-800', icon: '👤' }),
  employesGroupesParCategorie = [],
  handleAnomalieClick = () => {},
  handleQuickAction = () => {}
}) {
  // Les fonctions de formatage sont maintenant passées par les props du composant principal
  const globalDense = employes.length >= 18 && !forceReadable; // auto mode compact si pas forcé (seuil à 18)

  // Taille cellules adaptée
  const baseCellSizeClass = viewType === "mois" 
    ? "h-9 min-w-[32px] sm:h-10 sm:min-w-[40px]" 
    : viewType === "jour" 
      ? "h-20 min-w-[180px] sm:h-28 sm:min-w-[220px]" 
      : "h-14 min-w-[90px] sm:h-16 sm:min-w-[110px]";
  const cellSizeClassBase = globalDense && viewType === 'semaine' ? 'h-12 min-w-[80px] sm:h-12 sm:min-w-[95px]' : baseCellSizeClass;
  
  // Données par cellule
  const getCellData = (emp, dStr) => {
    // Fonction utilitaire pour normaliser une date en YYYY-MM-DD
    const normalizeDate = (dateValue) => {
      if (!dateValue) return null;
      
      try {
        // Si c'est une chaîne, extraire les 10 premiers caractères (YYYY-MM-DD)
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
        // Pour une meilleure précision, convertissons les IDs en nombres
        const empIdMatch = parseInt(s.employeId, 10) === parseInt(emp.id, 10);
        
        // Si l'employé ne correspond pas, pas besoin d'aller plus loin
        if (!empIdMatch) return false;
        
        const shiftDate = normalizeDate(s.date);
        const dateMatch = shiftDate === cellDate;
        
        // Log uniquement si l'employé correspond (pour réduire le bruit)
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
    
    // Recherche d'un congé correspondant avec la même fonction de normalisation
    const conge = conges.find((c) => {
      try {
        // Tester userId ET employeId pour compatibilité
        const empMatch = c.userId === emp.id || c.employeId === emp.id;
        if (!empMatch) return false;
        
        // Debug congé trouvé
        if (empMatch) {
          console.log(`Congé desktop trouvé pour ${emp.prenom} ${emp.nom}:`, c);
        }
        
        // Normalisation des dates de début et de fin de congé
        const debutConge = normalizeDate(c.dateDebut);
        const finConge = normalizeDate(c.dateFin);
        
        // Vérifier si la date de la cellule est comprise entre le début et la fin du congé
        const isInPeriod = cellDate && debutConge && finConge && 
               cellDate >= debutConge && 
               cellDate <= finConge;
               
        if (empMatch && isInPeriod) {
          console.log(`✅ Congé desktop match: ${emp.prenom} le ${cellDate}, statut: ${c.statut}`);
        }
        
        return isInPeriod;
      } catch (e) {
        console.error("Erreur dans la comparaison des congés:", e);
        return false;
      }
    });
    
    // PRIORITÉ : Les congés validés par l'admin sont TOUJOURS prioritaires
    // Si un congé approuvé existe, on ne retourne PAS le shift (même s'il existe)
    if (conge) {
      if (shift) {
        console.log(`⚠️ CONFLIT RÉSOLU: Congé "${conge.type}" prioritaire sur shift pour ${emp.prenom} le ${cellDate}`);
      }
      return { shift: null, conge };
    }
    
    // Sinon, on retourne le shift s'il existe
    return { shift, conge: null };
  };  const renderHeaderCell = (date, index) => {
    if (viewType === "mois") {
      const referenceMonth = dates[Math.min(15, dates.length - 1)].getMonth();
      const isCurrentMonth = date.getMonth() === referenceMonth;
      const weekend = isWeekend(date);
      return (
        <th key={index} className="p-1 text-center">
          <div className={`flex flex-col items-center ${weekend ? 'opacity-80' : ''}`}>
            <span className={`uppercase text-[9px] tracking-wider ${isCurrentMonth ? "text-gray-500" : "text-gray-300"}`}>
              {joursSemaine[date.getDay() === 0 ? 6 : date.getDay() - 1].slice(0,1)}
            </span>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition ${
              isToday(date) ? "bg-[#cf292c] text-white shadow" : isCurrentMonth ? (weekend? 'text-red-500' : 'text-gray-700') : "text-gray-300"
            }`}>
              {date.getDate()}
            </span>
          </div>
        </th>
      );
    }
    const weekend = isWeekend(date);
    return (
      <th key={index} className="p-2 text-center">
        <div className="flex flex-col items-center gap-1">
            <span className={`uppercase text-[10px] tracking-wider ${weekend? 'text-red-500':'text-gray-500'}`}>
              {viewType === "jour" ? date.toLocaleDateString("fr-FR", { weekday: "short" }) : joursSemaine[index]}
            </span>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition ${
              isToday(date) ? "bg-[#cf292c] text-white shadow-sm" : weekend? 'text-red-500' : "text-gray-700"
            }`}>
              {date.getDate()}
            </span>
          </div>
      </th>
    );
  };

  // Fonction utilitaire pour vérifier si un segment est valide
  const isValidSegment = (segment) => {
    if (!segment) return false;
    if (!segment.start || !segment.end) return false;
    
    // Vérifier le format des heures (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(segment.start) || !timeRegex.test(segment.end)) return false;
    
    // Vérifier que l'heure de début est avant l'heure de fin
    if (segment.start >= segment.end) return false;
    
    return true;
  };

  // Fonction pour vérifier les chevauchements d'horaires
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
    
    // Vérifier s'il y a chevauchement
    return !(end1 <= start2 || end2 <= start1);
  };

  // Fonction pour valider un déplacement avant de l'effectuer
  const validateMove = (segmentToMove, targetEmployeId, targetDate) => {
    const norm = (d) => d.slice(0,10);
    const targetDateKey = norm(targetDate);
    
    // Vérifier s'il y a un congé approuvé pour cet employé à cette date
    const congeConflict = conges.find(c => 
      c.employeId === targetEmployeId && 
      c.statut === 'approuvé' &&
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
      s.type === 'présence'
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
      window.showNotificationGlobal?.("❌ Impossible de déplacer ce créneau : Le segment est incomplet ou contient des horaires invalides.", "error", 5000);
      return;
    }

    // Valider le déplacement pour éviter les chevauchements
    const validation = validateMove(segment, newEmployeId, newDate);
    if (!validation.valid) {
      window.showNotificationGlobal?.(`❌ Déplacement impossible : ${validation.reason}. Veuillez choisir un autre créneau horaire.`, "error", 6000);
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
      // removedFromSource supprimé (plus utilisé)
      for (const s of curr) {
        const isSource = s.employeId === fromEmployeId && norm(s.date) === srcDateKey && s.type==='présence';
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
      const existingDest = updated.find(s=> s.employeId===newEmployeId && norm(s.date)===dstDateKey && s.type==='présence');
      if (existingDest) {
        existingDest.segments = [...existingDest.segments, movedSegment];
        draftTarget = existingDest;
      } else {
        draftTarget = { __temp:true, employeId:newEmployeId, date:dstDateKey, type:'présence', segments:[movedSegment] };
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
              segments: draftTarget.segments // On garde nos segments à jour
            };
            console.log("Récupération version shift pour update:", latestTargetShift.version);
          } catch (getErr) {
            console.warn("Impossible de récupérer la version du shift, utilisation version locale");
          }
          
          // Mettre à jour avec la dernière version connue
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
              alert("Un autre utilisateur a modifié ce planning. Données rafraîchies.");
              return; // Sortir de la fonction sans erreur
            } catch (fetchErr) {
              console.warn("Shift non trouvable après conflit:", fetchErr);
              
              // Si le shift n'existe plus (404), on le supprime localement
              if (fetchErr.response?.status === 404) {
                setShifts(prev => prev.filter(s => s.id !== draftTarget.id));
                alert("Le shift semble avoir été supprimé par ailleurs. L'affichage a été mis à jour.");
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
          type:'présence',
          segments: draftTarget.segments || [],
          version: 0
        }, authHeaders);
        setShifts(prev => prev.map(s => (s===draftTarget || (s.__temp && s.employeId===draftTarget.employeId && norm(s.date)===dstDateKey)) ? res.data : s));
        draftTarget = res.data; // maj référence
      }
    } catch (e) {
      console.error('Erreur persistance déplacement segment:', e.response?.data || e.message);
      
      // Gestion personnalisée selon le type d'erreur
      if (e.response?.status === 404) {
        // Shift non trouvé: données obsolètes, conflit de concurrence
        window.showNotificationGlobal?.("⚠️ Conflit détecté : Les données de planning ont été modifiées par un autre utilisateur. Le planning a été automatiquement actualisé.", "warning", 5000);
        
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
        window.showNotificationGlobal?.("❌ Déplacement impossible : Il y a un chevauchement avec un autre créneau ou une contrainte empêche cette action.", "error", 6000);
      } else if (e.response?.status === 400) {
        // Erreur de validation
        window.showNotificationGlobal?.("❌ Déplacement refusé : Les données ne respectent pas les contraintes (horaires invalides, chevauchement, etc.)", "error", 6000);
      } else {
        // Autres erreurs (réseau, serveur, etc.)
        window.showNotificationGlobal?.(`❌ Erreur lors du déplacement : ${e.response?.data?.error || e.message || "Problème de connexion au serveur"}`, "error", 5000);
      }
      
      // Rollback aux données précédentes
      if (previousShifts) setShifts(previousShifts);
    }
  };

  // Ancienne variable cellSizeClass remplacée par baseCellSizeClass + adaptation denseMode

  return (
    <div className="overflow-auto max-h-[70vh] rounded-md bg-white p-0.5 shadow-sm border border-gray-100">
  <table className={`min-w-full ${globalDense ? 'text-[10px]' : ''} divide-y divide-gray-100 bg-white rounded-md overflow-hidden text-xs sm:text-sm border-0 ${viewType === "mois" ? "table-fixed" : ""}`}>
        <thead className="sticky top-0 z-20 bg-white text-xs font-medium text-gray-500">
          <tr>
            <th className={`${viewType === "mois" ? "p-0.5 sm:p-1" : "p-1 sm:p-2"} text-left sticky left-0 bg-white z-30`}>
              {viewType === "mois" ? "EMP." : (
                <>
                  <span className="hidden sm:inline">EMPLOYÉ</span>
                  <span className="sm:hidden">EMP.</span>
                </>
              )}
            </th>
            {dates.map((d, i) => renderHeaderCell(d, i))}
          </tr>
        </thead>
  <tbody className={`divide-y divide-gray-100 ${globalDense ? 'align-top' : ''}`}>
          {/* Affichage groupé par catégories avec séparateurs visuels */}
          {employesGroupesParCategorie.map((groupe, groupeIndex) => (
            <React.Fragment key={groupe.categorie}>
              {/* Séparateur de catégorie - Style Skello */}
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200">
                <td colSpan={dates.length + 1} className="p-3 sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${groupe.infosCategorie.color} font-medium text-sm shadow-sm`}>
                      <span className="text-lg">{groupe.infosCategorie.icon}</span>
                      <span>{groupe.categorie}</span>
                      <span className="bg-white/30 text-xs px-2 py-0.5 rounded-full ml-1">
                        {groupe.employes.length}
                      </span>
                    </div>
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-gray-200 to-transparent rounded-full"></div>
                  </div>
                </td>
              </tr>
              
              {/* Employés de cette catégorie */}
              {groupe.employes.map((emp, empIndex) => {
                const rowDense = globalDense && !expandedEmployees.has(emp.id);
                const cellSizeClass = rowDense ? cellSizeClassBase : baseCellSizeClass;
                const isLastInGroup = empIndex === groupe.employes.length - 1;
                const isLastGroup = groupeIndex === employesGroupesParCategorie.length - 1;
                
                return (
                  <tr 
                    key={emp.id} 
                    className={`group ${rowDense ? 'hover:bg-blue-50/60' : 'hover:bg-blue-50'} transition ${
                      isLastInGroup && !isLastGroup ? 'border-b-2 border-gray-100' : ''
                    }`}
                  >
              <td className={`p-0.5 sm:p-1 text-left align-middle whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-100 ${rowDense ? 'min-w-[100px]' : ''}`}>
                <div className={`flex items-center ${rowDense ? 'gap-1' : 'gap-1.5 sm:gap-2'}`}>
                  <button type="button" onClick={()=> globalDense && onToggleExpand(emp.id)} className={`${rowDense? 'opacity-60 hover:opacity-90':'opacity-90 hover:opacity-100'} transition w-4 h-4 flex items-center justify-center text-gray-500`} title={rowDense? 'Agrandir la ligne':'Replier la ligne'}>
                    {globalDense && (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {rowDense ? <path d="m6 9 6 6 6-6"/> : <path d="m18 15-6-6-6 6"/>}
                      </svg>
                    )}
                  </button>
                  <div className={`${rowDense ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 sm:w-7 sm:h-7 text-xs'} rounded-full bg-[#cf292c] text-white font-medium flex items-center justify-center shadow-sm`}>
                    {getEmployeeInitials(emp)}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-gray-800 leading-tight ${rowDense ? 'text-[10px]' : 'text-xs sm:text-sm'}`}>
                        {formatEmployeeName(emp)}
                      </span>
                      
                      {/* Badge de catégorie employé */}
                      {(() => {
                        const categorie = getCategorieEmploye(emp);
                        return (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${categorie.color} ${rowDense ? 'hidden' : ''}`} title={`Catégorie: ${categorie.label}`}>
                            <span>{categorie.icon}</span>
                            <span className="hidden sm:inline">{categorie.label}</span>
                          </span>
                        );
                      })()}
                      
                      {!rowDense && (
                        <button
                          onClick={() => onOpenRapport(emp.id)}
                          className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-blue-600 hover:text-blue-700 transition-all p-1 rounded hover:bg-blue-50"
                          title="Voir le rapport d'heures"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {!rowDense && (emp.prenom || emp.nom) && emp.email && 
                      <span className="text-xs text-gray-500 truncate hidden sm:block">{emp.email}</span>
                    }
                    {!rowDense && (
                      <div className="flex items-center gap-1 sm:gap-2 mt-1">
                        {(() => {
                          const totalHeures = dates.reduce((acc, date) => {
                            const dStr = formatDate(date);
                            const { shift, conge } = getCellData(emp, dStr);
                            if (!conge && shift && shift.type === 'présence' && shift.segments) {
                              const heuresJour = shift.segments.reduce((sum, seg) => {
                                if (!seg.start || !seg.end) return sum;
                                const [startH, startM] = seg.start.split(':').map(Number);
                                const [endH, endM] = seg.end.split(':').map(Number);
                                return sum + ((endH * 60 + endM) - (startH * 60 + startM));
                              }, 0) / 60;
                              return acc + heuresJour;
                            }
                            return acc;
                          }, 0);
                          const joursPresence = dates.filter(date => {
                            const dStr = formatDate(date);
                            const { shift, conge } = getCellData(emp, dStr);
                            return !conge && shift && shift.type === 'présence';
                          }).length;
                          return (
                            <div className="flex gap-2 text-[10px]">
                              {totalHeures > 0 && (
                                <span className="bg-[#cf292c]/10 text-[#cf292c] px-2 py-0.5 rounded font-medium">
                                  {totalHeures.toFixed(1)}h
                                </span>
                              )}
                              {joursPresence > 0 && (
                                <span className="bg-[#cf292c]/10 text-[#cf292c] px-2 py-0.5 rounded font-medium">
                                  {joursPresence}j
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              {dates.map((date, i) => {
                const dStr = formatDate(date);
                const { shift, conge } = getCellData(emp, dStr);
                if (viewType === "mois") {
                  const referenceMonth = dates[Math.min(15, dates.length - 1)].getMonth();
                  const isCurrentMonth = date.getMonth() === referenceMonth;
                  const weekend = isWeekend(date);
                  const baseClasses = `relative p-1 ${cellSizeClass} text-center align-top cursor-pointer transition border border-gray-100`;
                  const bg = !isCurrentMonth ? "bg-gray-50/70 text-gray-300" : weekend? 'bg-slate-50' : 'bg-white';
                  const hasSegments = shift && shift.type==='présence' && shift.segments?.length;
                  const hasPending = hasSegments && shift.segments.some(s=>s.aValider);
                  const stateBg = conge ? 'bg-[#ffe1e1]' : (!conge && shift ? (shift.type==='absence'? 'bg-rose-50' : (hasPending? 'bg-amber-50' : 'bg-blue-50')) : '');
                  const todayRing = isToday(date) ? 'ring-1 ring-[#cf292c] ring-offset-1 ring-offset-white' : '';
                  return (
                    <td
                      key={i}
                      title={resumeCell(conge, shift)}
                      onClick={() => onCellClick(emp.id, dStr)}
                      className={`${baseClasses} ${bg} ${stateBg} ${todayRing}`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {conge && <span className="w-2 h-2 rounded-full bg-[#cf292c]" />}
                        {!conge && shift && shift.type==='présence' && hasPending && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                        {!conge && shift && shift.type==='présence' && !hasPending && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                        {!conge && shift && shift.type==='absence' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                        {!conge && !shift && <span className="w-2 h-2 rounded-full bg-gray-300" />}
                      </div>
                    </td>
                  );
                }
                return (
                  <CellDrop
                    key={`cell-${emp.id}-${dStr}`}
                    employeId={emp.id}
                    date={dStr}
                    shift={shift}
                    conge={conge}
                    moveSegment={moveSegment}
                    onCellClick={onCellClick}
                    cellSizeClass={cellSizeClass}
                    showComparaison={showComparaison}
                    getEcartsForEmployeeDate={getEcartsForEmployeeDate}
                    formatEcart={formatEcart}
                    denseMode={skelloMode || (rowDense === true ? true : false)}
                    handleAnomalieClick={handleAnomalieClick}
                    handleQuickAction={handleQuickAction}
                  />
                );
              })}
            </tr>
                  );
                })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Vue JOUR : Grille horaire verticale (agenda) MULTI-RESSOURCES (améliorée) ---------- */
function DayAgenda({ date, employes, shifts, conges, onCellClick, formatEmployeeName, getEmployeeInitials }) {
  const today = new Date();
  const isTodayView = today.toDateString() === date.toDateString();

  // Date string early (used for dynamic end hour calc)
  const dStr = formatDate(date);
  // Parser heure:min -> minutes
  const parseTime = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  // Configuration plage affichée (restauration: doit aller au moins jusqu'à 24h)
  const [showFullDay, setShowFullDay] = useState(false); // false = vue compacte (06h -> 24h ou +), true = 24h (00h-24h)
  const baseStart = 6; // début compact
  const baseEnd = 24;  // FIN minimale maintenant à 24h (au lieu de 20h) pour pouvoir ajouter des créneaux tardifs
  const latestEndHour = React.useMemo(() => {
    let maxEnd = baseEnd * 60; // base 24h
    shifts.filter(s => s.date.slice(0,10) === dStr && s.type === 'présence').forEach(s => {
      s.segments?.forEach(seg => { const e = parseTime(seg.end); if (e > maxEnd) maxEnd = e; });
    });
    return Math.min(24, Math.ceil(maxEnd / 60)); // plafonné 24 pour l'instant
  }, [shifts, dStr]);
  const startHour = showFullDay ? 0 : baseStart;
  const endHour = showFullDay ? 24 : latestEndHour; // compact atteint au moins 24h
  const minutesWindow = (endHour - startHour) * 60;
  const hourHeight = 44; // px par heure
  const dayHeight = hourHeight * (endHour - startHour);
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, h) => h + startHour);
  const importantLines = new Set([8, 12, 14]);

  const scrollRef = useRef(null);
  const segmentsLayerRef = useRef(null);

  const durationMinutes = (start, end) => Math.max(0, parseTime(end) - parseTime(start));

  const getData = (emp) => {
    const shift = shifts.find((s) => s.employeId === emp.id && s.date.slice(0, 10) === dStr);
    const conge = conges.find(
      (c) =>
        c.userId === emp.id &&
        c.statut === "approuvé" &&
        dStr >= c.dateDebut.slice(0, 10) &&
        dStr <= c.dateFin.slice(0, 10)
    );
    return { shift: conge ? null : shift, conge };
  };

  // Calcul heures totales par employé
  const totalHeures = employes.reduce((acc, emp) => {
    const { shift, conge } = getData(emp);
    if (conge || !shift || shift.type !== 'présence' || !shift.segments) {
      acc[emp.id] = 0;
    } else {
      acc[emp.id] = shift.segments.reduce((m, s) => m + durationMinutes(s.start, s.end), 0) / 60;
    }
    return acc;
  }, {});

  // Auto scroll vers premier segment visible
  useEffect(() => {
    if (!scrollRef.current) return;
    // Trouver la première minute de début dans plage
    let firstStart = null;
    shifts.filter(s => s.date.slice(0,10) === dStr && s.type === 'présence').forEach(s => {
      s.segments?.forEach(seg => {
        const start = parseTime(seg.start);
        if (startHour*60 <= start && start < endHour*60) {
          if (firstStart === null || start < firstStart) firstStart = start;
        }
      });
    });
    const container = scrollRef.current;
    if (firstStart !== null) {
      const offsetMinutes = firstStart - startHour * 60;
      const y = (offsetMinutes / minutesWindow) * dayHeight - 40; // léger offset haut
      container.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    } else if (!showFullDay) {
      // sinon scroll 0
      container.scrollTo({ top: 0 });
    }
  }, [dStr, shifts, startHour, endHour, showFullDay, dayHeight, minutesWindow]);

  // Position minute -> top
  const minuteToTop = (minuteGlobal) => {
    // minuteGlobal = minute depuis 00h
    if (minuteGlobal < startHour*60) return 0;
    const clamped = Math.min(endHour*60, Math.max(startHour*60, minuteGlobal));
    return ((clamped - startHour*60) / minutesWindow) * dayHeight;
  };

  const columnWidth = 170;

  // Ligne temps réel (corrigé: ne pas afficher si hors plage visible)
  const currentMinutes = today.getHours()*60 + today.getMinutes();
  const showCurrentLine = isTodayView && currentMinutes >= startHour*60 && currentMinutes < endHour*60;
  const currentLineTop = showCurrentLine ? minuteToTop(currentMinutes) : null;

  // Helpers supplémentaires
  const roundToQuarter = (minute) => {
    const q = Math.round(minute / 15) * 15; return Math.min(24*60, Math.max(0, q));
  };
  const toTimeStr = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;

  // Overlap detection par shift (présence) pour style
  const buildOverlapMap = (segments=[]) => {
    const map = {}; segments.forEach((_,i)=>map[i]=false);
    for(let i=0;i<segments.length;i++){
      for(let j=i+1;j<segments.length;j++){
        const aS=parseTime(segments[i].start), aE=parseTime(segments[i].end);
        const bS=parseTime(segments[j].start), bE=parseTime(segments[j].end);
        if(aS < bE && bS < aE){ map[i]=true; map[j]=true; }
      }
    }
    return map;
  };

  // Création rapide: double clic dans colonne employé
  const handleQuickCreate = (empId, e) => {
    const col = e.currentTarget;
    const rect = col.getBoundingClientRect();
    const y = e.clientY - rect.top; // px à partir du haut
    const ratio = y / dayHeight;
    const minuteGlobal = startHour*60 + ratio * minutesWindow;
    const startRounded = roundToQuarter(minuteGlobal);
    let endRounded = startRounded + 60; // 1h par défaut
    if (endRounded > endHour*60) endRounded = Math.min(endHour*60, startRounded + 30);
    const startStr = toTimeStr(startRounded);
    const endStr = toTimeStr(endRounded);
    onCellClick(empId, dStr, startStr, endStr);
  };

  return (
    <div className="relative border border-gray-100 rounded-md bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50 text-xs">
        <div className="flex items-center gap-3 font-medium text-gray-700">
          {date.toLocaleDateString('fr-FR',{ weekday:'long', day:'2-digit', month:'long', year:'numeric'})}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFullDay(v => !v)}
            className="px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-medium"
          >
            {showFullDay ? `Vue compacte ${String(baseStart).padStart(2,'0')}h–${String(latestEndHour).padStart(2,'0')}h` : '24h'}
          </button>
        </div>
      </div>
      {/* En-têtes employés + colonne heures sticky dans le scroll */}
      <div ref={scrollRef} className="relative max-h-[600px] overflow-auto">
        {/* Headers */}
        <div className="sticky top-0 z-40 flex bg-white/95 backdrop-blur border-b border-gray-100">
          <div className="w-40 shrink-0 sticky left-0 z-50 bg-white/95 border-r border-gray-100 px-3 py-2 text-[11px] font-semibold text-gray-600">
            Heures
          </div>
          {employes.map(emp => (
            <div key={emp.id} className="w-[170px] shrink-0 px-3 py-1.5 border-r border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#cf292c] text-white text-[11px] flex items-center justify-center font-medium shadow-sm">
                  {getEmployeeInitials(emp)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-gray-700 truncate">
                    {formatEmployeeName(emp)}
                  </div>
                  {(emp.prenom || emp.nom) && emp.email && 
                    <div className="text-[9px] text-gray-400 truncate">{emp.email}</div>
                  }
                  <div className="text-[10px] font-medium text-[#cf292c]">{totalHeures[emp.id].toFixed(1)} h</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Corps timeline */}
        <div className="relative flex" style={{ height: dayHeight }}>
          {/* Colonne heures */}
          <div className="w-40 shrink-0 sticky left-0 z-30 bg-white border-r border-gray-100">
            <div className="relative w-full h-full">
              {hours.map((h,i) => (
                <div key={h} className="absolute left-0 right-0" style={{ top: i*hourHeight, height: hourHeight }}>
                  <div className={`absolute top-0 left-0 right-0 border-t ${importantLines.has(h)?'border-gray-400':'border-gray-200'}`}/>
                  <div className="absolute top-0 -translate-y-1/2 pl-3">
                    <span className={`text-[10px] px-1 rounded ${importantLines.has(h)?'bg-[#cf292c] text-white font-semibold':'bg-white border border-gray-200 text-gray-600'}`}>{String(h).padStart(2,'0')}h</span>
                  </div>
                </div>
              ))}
              <div className="absolute left-0 right-0 border-t border-gray-200" style={{ top: dayHeight }} />
            </div>
          </div>

          {/* Grille horizontale + segments */}
          <div ref={segmentsLayerRef} className="flex-1 relative flex" style={{ height: dayHeight }}>
            {/* Lignes horizontales */}
            <div className="pointer-events-none absolute inset-0">
              {hours.map((h,i) => (
                <div key={h} className={`absolute left-0 right-0 border-t ${importantLines.has(h)?'border-gray-400':'border-gray-200'}`} style={{ top: i*hourHeight }} />
              ))}
              <div className="absolute left-0 right-0 border-t border-gray-200" style={{ top: dayHeight }} />
              {/* Ligne temps réel */}
              {showCurrentLine && (
                <div className="absolute left-0 right-0" style={{ top: currentLineTop }}>
                  <div className="h-px bg-[#cf292c]" />
                  <div className="absolute -top-2 -ml-10 bg-[#cf292c] text-white text-[10px] px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                    Maintenant {today.getHours().toString().padStart(2,'0')}:{today.getMinutes().toString().padStart(2,'0')}
                  </div>
                </div>
              )}
            </div>
            {/* Colonnes employés */}
            {employes.map(emp => {
              const { shift, conge } = getData(emp);
              const overlapMap = (shift && shift.type==='présence') ? buildOverlapMap(shift.segments) : {};
              return (
                <div key={emp.id} className="relative group border-r border-gray-100 last:border-r-0" style={{ width: columnWidth }} onDoubleClick={(e)=>handleQuickCreate(emp.id,e)} title="Double‑clic pour créer un créneau (1h)">
                  {/* Fond zones (matin/pause/aprem) */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* matin */}
                    <div className="absolute left-0 right-0 bg-slate-50/40" style={{ top: 0, height: Math.max(0,(8-startHour))*hourHeight }} />
                    {/* 08-12 */}
                    <div className="absolute left-0 right-0 bg-slate-50/10" style={{ top: Math.max(0,(8-startHour))*hourHeight, height: Math.min(12,endHour)-Math.max(8,startHour) >0 ? (Math.min(12,endHour)-Math.max(8,startHour))*hourHeight:0 }} />
                    {/* 12-14 */}
                    <div className="absolute left-0 right-0 bg-slate-50/30" style={{ top: Math.max(0,(12-startHour))*hourHeight, height: Math.min(14,endHour)-Math.max(12,startHour) >0 ? (Math.min(14,endHour)-Math.max(12,startHour))*hourHeight:0 }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => onCellClick(emp.id, dStr)}
                    className="absolute inset-0 w-full h-full cursor-crosshair"
                    title="Créer / éditer un shift"
                  />
                  {conge && (
                    <div className="absolute inset-1 rounded-md bg-[#ffd6d6] text-[#cf292c] flex flex-col items-center justify-center text-[11px] font-medium shadow-sm">
                      <span>{conge.type}</span>
                      {conge.motif && <span className="text-[10px] text-gray-600">{conge.motif}</span>}
                    </div>
                  )}
                  {!conge && shift && shift.type === 'absence' && (
                    <div className="absolute inset-1 rounded-md bg-rose-100 text-rose-700 flex flex-col items-center justify-center text-[11px] font-medium shadow-sm">
                      <span>{shift.motif || 'Absence'}</span>
                    </div>
                  )}
                  {!conge && shift && shift.type === 'présence' && shift.segments?.map((seg,i) => {
                    const start = parseTime(seg.start);
                    const end = parseTime(seg.end) || start;
                    if (end <= startHour*60 || start >= endHour*60) return null;
                    const adjStart = Math.max(start, startHour*60);
                    const adjEnd = Math.min(end, endHour*60);
                    const top = minuteToTop(adjStart);
                    const height = Math.max(20, ((adjEnd - adjStart)/minutesWindow) * dayHeight);
                    const dureeMin = (end - start);
                    const dureeH = (dureeMin/60).toFixed(dureeMin%60===0?0:2);
                    const overlap = overlapMap[i];
                    return (
                      <div
                        key={seg.id || `seg-${i}`}
                        className={`absolute left-1 right-1 rounded-md px-2 pt-1 pb-1.5 text-[11px] font-medium shadow-sm flex flex-col gap-0.5 overflow-hidden group/seg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cf292c] cursor-pointer transition ${seg.aValider ? 'bg-amber-400 text-white' : 'bg-blue-600 text-white'} ${overlap ? 'ring-2 ring-red-400' : 'hover:brightness-105'} ${seg.aValider ? 'hover:shadow-md' : ''}`}
                        style={{ top, height }}
                        tabIndex={0}
                        aria-label={`Segment ${seg.start} à ${seg.end}${seg.aValider? ' à valider':''}${seg.isExtra?' extra':''}${overlap? ' en conflit':''}`}
                        title={`${seg.start} - ${seg.end} (${dureeMin} min)${seg.commentaire ? '\n' + seg.commentaire : ''}${seg.isExtra?`\nExtra${seg.extraMontant? ' '+seg.extraMontant+'€':''}${seg.paymentStatus==='payé'?' (payé)':''}`:''}${overlap? '\nConflit de chevauchement':''}`}
                        onClick={(e) => { e.stopPropagation(); onCellClick(emp.id, dStr); }}
                        onKeyDown={(e)=>{ if(e.key==='Enter') { e.preventDefault(); onCellClick(emp.id,dStr);} }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-semibold tracking-wide leading-none">{seg.start}–{seg.end}</span>
                          <span className="text-[9px] font-medium opacity-90 leading-none">{dureeH}h</span>
                        </div>
                        {seg.commentaire && <span className="text-[10px] opacity-90 truncate leading-tight">{seg.commentaire}</span>}
                        <div className="mt-auto flex items-center gap-1 flex-wrap">
                          {seg.isExtra && <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${seg.paymentStatus==='payé'?'bg-emerald-500':'bg-emerald-500/80'} text-white`}>EXTRA{seg.extraMontant?` ${seg.extraMontant}€`:''}{seg.paymentStatus==='payé'?' ✓':''}</span>}
                          {seg.aValider && <span className="text-[9px] bg-white/25 px-1 py-0.5 rounded">À valider</span>}
                          {overlap && <span className="text-[9px] bg-red-500/80 px-1 py-0.5 rounded">Conflit</span>}
                        </div>
                        <div className="absolute top-0 right-0 translate-y-[-40%] opacity-0 group-hover/seg:opacity-100 transition flex gap-1 pr-1 pt-1">
                          <button
                            type="button"
                            className="w-5 h-5 rounded bg-white/30 hover:bg-white/60 flex items-center justify-center text-[10px]"
                            title="Éditer"
                            onClick={(e)=>{ e.stopPropagation(); onCellClick(emp.id,dStr); }}
                          >✎</button>
                        </div>
                      </div>
                    );
                  })}
                  {!conge && (!shift || (shift.type === 'présence' && !shift.segments?.length)) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-90 transition">
                      <span className="text-[10px] bg-white/80 border border-dashed border-gray-300 text-gray-600 rounded px-2 py-1">Double‑clic pour créer</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Modale édition shift
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
  // Normaliser le type pour éviter les valeurs undefined/null
  const normalizedType = shift.type || "présence";
  const [type, setType] = useState(normalizedType);
  const [motif, setMotif] = useState(shift.motif || "");
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [compactHistory, setCompactHistory] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null); // Message d'erreur global
  const [segmentErrors, setSegmentErrors] = useState({}); // Erreurs spécifiques aux segments
  const [adminWarning, setAdminWarning] = useState(null); // Alerte administrative
  // Historique affiché (fusion si mode condensé)
  const displayedHistory = useMemo(() => {
    if (!compactHistory) return history;
    const merged = [];
    for (const log of history) {
      const last = merged[merged.length - 1];
      const onlyNoteChange = log.newValues && Object.keys(log.newValues).every(k => k === 'paymentNote');
      if (
        last && onlyNoteChange &&
        last.segmentIndex === log.segmentIndex &&
        last.changedBy?.email === log.changedBy?.email &&
        (new Date(log.createdAt).getTime() - new Date(last.createdAt).getTime()) <= 120000 &&
        last.newValues && Object.keys(last.newValues).every(k => k === 'paymentNote')
      ) {
        last.newValues.paymentNote = log.newValues.paymentNote;
        last._mergedCount = (last._mergedCount || 1) + 1;
        last.createdAt = log.createdAt;
      } else {
        merged.push({ ...log });
      }
    }
    return merged;
  }, [history, compactHistory]);
  const [segments, setSegments] = useState(() => {
    // Si c'est un shift de présence avec des segments existants
    if (normalizedType === "présence" && shift.segments && shift.segments.length > 0) {
      return shift.segments.map(s => ({
        ...s, // Plus besoin d'ensureSegmentId
        commentaire: s.commentaire || "",
        aValider: s.aValider || false,
        isExtra: s.isExtra || false,
        extraMontant: s.extraMontant || "",
        paymentStatus: s.paymentStatus || 'à_payer',
        paymentMethod: s.paymentMethod || '',
        paymentDate: s.paymentDate || '',
        paymentNote: s.paymentNote || ''
      }));
    }
    // Si c'est un shift de présence sans segments, créer un segment par défaut
    else if (normalizedType === "présence") {
      return [{ 
        start: "", 
        end: "", 
        commentaire: "", 
        aValider: false, 
        isExtra: false, 
        extraMontant: "", 
        paymentStatus: 'à_payer', 
        paymentMethod: '', 
        paymentDate: '', 
        paymentNote: '' 
      }];
    }
    // Pour les absences, pas de segments
    else {
      return [];
    }
  });
  // ref toujours à jour pour éviter état obsolète dans callbacks async
  const segmentsRef = useRef(segments);
  useEffect(()=>{ segmentsRef.current = segments; }, [segments]);
  
  // Effect to handle type changes
  useEffect(() => {
    // When type changes to 'absence', we don't need segments
    // When type changes to 'présence', ensure we have at least one segment
    if (type === 'présence' && (!segments || segments.length === 0)) {
      const newSegment = { 
        start: "", 
        end: "", 
        commentaire: "", 
        aValider: false, 
        isExtra: false, 
        extraMontant: "", 
        paymentStatus: 'à_payer', 
        paymentMethod: '', 
        paymentDate: '', 
        paymentNote: '' 
      };
      setSegments([newSegment]);
    }
    // Reset motif when changing to 'présence'
    if (type === 'présence' && motif) {
      setMotif("");
    }
  }, [type, segments, motif]);

  const isEdit = !!shift.id;

  const addSegment = () => {
    // Création d'un nouveau segment avec des valeurs par défaut
    const newSegment = { 
      start: "", 
      end: "", 
      commentaire: "", 
      aValider: false, 
      isExtra: false, 
      extraMontant: "", 
      paymentStatus: 'à_payer', 
      paymentMethod: '', 
      paymentDate: '', 
      paymentNote: '' 
    };
    
    // Ajout du segment à la liste existante
    setSegments(prevSegments => [...prevSegments, newSegment]);
    
    // Mettre à jour la référence pour assurer la cohérence
    segmentsRef.current = [...segmentsRef.current, newSegment];
  };
  const removeSegment = (idx) => setSegments(segments.filter((_, i) => i !== idx));
  // On garde une référence aux timers de debounce pour pouvoir les annuler
  const debounceTimers = useRef({});
  
  const changeSegment = (idx, field, value) => {
    // calculer le nouveau tableau avant setState pour le snapshot
    const updatedSegments = segmentsRef.current.map((s, i) => {
      if (i !== idx) return s;
      let updated = { ...s, [field]: value };
      if (field === 'paymentStatus' && value === 'payé' && !s.paymentDate) {
        updated.paymentDate = getCurrentDateString();
      }
      return updated;
    });
    setSegments(updatedSegments);
    segmentsRef.current = updatedSegments;

    // Vérifier si cette modification nécessite des privilèges administrateur
    if (requiresAdminPrivileges && (field === 'start' || field === 'end' || field === 'isExtra')) {
      const tempShift = { ...shift, segments: updatedSegments, type: 'présence' };
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

    // reste identique sauf qu'on passe un snapshot explicite
    if (isEdit && shift.id && field.startsWith('payment') && updatedSegments[idx].isExtra) {
      const isPaymentField = ['paymentStatus', 'paymentMethod', 'paymentDate', 'paymentNote'].includes(field);
      if (isPaymentField) {
        if (field === 'paymentNote') {
          if (debounceTimers.current[`${idx}-${field}`]) {
            clearTimeout(debounceTimers.current[`${idx}-${field}`]);
          }
          const snapshot = { segmentIndex: idx, segment: { ...updatedSegments[idx] } };
          debounceTimers.current[`${idx}-${field}`] = setTimeout(() => {
            updateExtraPaymentStatus(snapshot);
            debounceTimers.current[`${idx}-${field}`] = null;
          }, 800);
        } else {
          const snapshot = { segmentIndex: idx, segment: { ...updatedSegments[idx] } };
          setTimeout(() => {
            updateExtraPaymentStatus(snapshot);
          }, 50);
        }
      }
    }
  };
  
  // Fonction pour rafraîchir l'historique des paiements extras
  const refreshHistory = async () => {
    if (!isEdit || !shift.id) return;
    const currentToken = localStorage.getItem("token");
    if (!currentToken) return;
    setHistoryLoading(true);
    try {
      const ts = Date.now();
      const response = await axios.get(buildApiUrl(`/shifts/${shift.id}/extra-logs?nocache=${ts}`), { headers: { Authorization: `Bearer ${currentToken}` } });
      const logs = response.data.logs || response.data;
      setHistory(logs);
      if (!showHistory && logs.length > 0) {/* on n'auto-ouvre plus silencieusement ici */}
    } catch (e) {
      console.error('Erreur refreshHistory', e.response?.data || e.message);
    } finally { setHistoryLoading(false); }
  };
  
  // Fonction pour mettre à jour uniquement le statut de paiement d'un segment extra
  const updateExtraPaymentStatus = async (payload) => {
    if (!isEdit || !shift.id) return;
    // accepter ancien appel (index) pour compat
    let segmentIndex, segmentData;
    if (typeof payload === 'number') {
      segmentIndex = payload;
      segmentData = { ...segmentsRef.current[segmentIndex] };
    } else {
      segmentIndex = payload.segmentIndex;
      segmentData = payload.segment;
    }
    if (!segmentData?.isExtra) return;

    const currentToken = localStorage.getItem("token");
    if (!currentToken) { console.error("Token manquant pour la mise à jour du paiement extra"); return; }

    try {
      console.log("PATCH paiement extra snapshot:", { shiftId: shift.id, segmentIndex, ...segmentData });
      const response = await axios.patch(
        buildApiUrl(`/shifts/${shift.id}/extra-payment`),
        {
          segmentIndex,
          paymentStatus: segmentData.paymentStatus,
          paymentMethod: segmentData.paymentMethod,
          paymentDate: segmentData.paymentDate,
          paymentNote: segmentData.paymentNote
        },
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );

      if (response.data?.logs) {
        setHistory(response.data.logs);
        if (!showHistory && response.data.logs.length > 0) setShowHistory(true);
      } else {
        await refreshHistory();
      }
    } catch (err) {
      console.error('Erreur update paiement extra:', err.response?.data || err.message);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Réinitialiser les erreurs
    setErrorMessage(null);
    setSegmentErrors({});
    
    try {
      // Arrêter tous les timers de debounce en cours
      Object.keys(debounceTimers.current).forEach(k => { if (debounceTimers.current[k]) { clearTimeout(debounceTimers.current[k]); debounceTimers.current[k]=null; } });
      
      // Validation côté client avant envoi
      const newSegmentErrors = {};
      const segmentsToValidate = [...segmentsRef.current];
      
      // Si c'est un type présence, valider les segments
      if (type === 'présence') {
        // Vérifier que chaque segment a une heure de début et de fin valide
        segmentsToValidate.forEach((segment, index) => {
          if (!segment.start) {
            newSegmentErrors[`segments[${index}].start`] = "Heure de prise de poste requise";
          }
          
          if (!segment.end) {
            newSegmentErrors[`segments[${index}].end`] = "Heure de fin de service requise";
          }
          
          // Vérifier que l'heure de fin est après l'heure de début
          if (segment.start && segment.end && segment.start >= segment.end) {
            newSegmentErrors[`segments[${index}].end`] = "La fin de service doit être postérieure à la prise de poste";
          }
          
          // Vérifier les chevauchements avec d'autres segments
          if (segment.start && segment.end) {
            for (let i = 0; i < segmentsToValidate.length; i++) {
              if (i !== index && segmentsToValidate[i].start && segmentsToValidate[i].end) {
                // Vérifier le chevauchement
                const segmentA = { start: segment.start, end: segment.end };
                const segmentB = { start: segmentsToValidate[i].start, end: segmentsToValidate[i].end };
                
                if ((segmentA.start < segmentB.end && segmentA.end > segmentB.start)) {
                  newSegmentErrors[`segments[${index}].overlap`] = `Chevauchement avec le segment ${i + 1}`;
                  break;
                }
              }
            }
          }
        });
      } else if (type === 'absence' && !motif) {
        // Pour les absences, vérifier le motif
        setErrorMessage("La déclaration d'absence nécessite un motif valide pour assurer le suivi administratif et la conformité légale");
        return;
      }
      
      // Si des erreurs ont été trouvées, ne pas continuer la soumission
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
        // For 'présence', include segments and clear motif
        segments: type === 'présence' ? segmentsToValidate : [],
        // For 'absence', include motif and clear segments
        motif: type !== 'présence' ? motif : '' 
      };
      await onSave(shiftToSave);
      if (isEdit && shift.id && type === 'présence') {
        const extraSegments = segmentsToValidate.filter(s => s.isExtra);
        if (extraSegments.length) {
          const token = localStorage.getItem('token');
            if (!token) throw new Error('Token manquant');
          let lastResponse=null;
          for (let i=0;i<segmentsToValidate.length;i++) {
            if (!segmentsToValidate[i].isExtra) continue;
            try {
              const response = await axios.patch(buildApiUrl(`/shifts/${shift.id}/extra-payment`), {
                segmentIndex:i,
                paymentStatus: segmentsToValidate[i].paymentStatus,
                paymentMethod: segmentsToValidate[i].paymentMethod,
                paymentDate: segmentsToValidate[i].paymentDate,
                paymentNote: segmentsToValidate[i].paymentNote
              }, { headers:{ Authorization:`Bearer ${token}` }});
              lastResponse=response;
            } catch(err){ console.error('Err maj segment extra', i, err.response?.data || err.message); }
          }
          if (lastResponse?.data?.logs) {
            setHistory(lastResponse.data.logs);
            if (!showHistory && lastResponse.data.logs.length>0) setShowHistory(true);
          } else { await refreshHistory(); }
        }
      }
      onClose();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      
      // Gestion spécifique des erreurs de chevauchement
      const errorMsg = err.response?.data?.error || err.message || 'Erreur lors de la sauvegarde du shift';
      
      if (errorMsg.includes("Chevauchement entre segments")) {
        // Tentative de parser le message d'erreur pour extraire les numéros de segments
        const regex = /Chevauchement entre segments (\d+) et (\d+)/;
        const match = errorMsg.match(regex);
        
        if (match && match[1] && match[2]) {
          const seg1 = parseInt(match[1]) - 1; // -1 car les indices commencent à 0
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

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-md shadow-lg min-w-[320px] max-w-[900px] w-full space-y-3 border border-gray-100">
        {/* Affichage du message d'erreur global */}
        {errorMessage && (
          <ErrorMessage 
            message={errorMessage} 
            type="error" 
            onDismiss={() => setErrorMessage(null)} 
          />
        )}
        
        {/* Alerte administrative */}
        {adminWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.662-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-800">
                Validation administrative requise
              </div>
              <div className="text-sm text-amber-700 mt-1">
                {adminWarning.message}
                {adminWarning.segment && (
                  <span className="block mt-1 text-xs">
                    Segment concerné : #{adminWarning.segment}
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
                  Votre modification sera marquée pour validation.
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium mb-2 text-gray-800">
            {isEdit ? "Éditer le shift" : "Nouveau shift"}
          </h3>
          {isEdit && shift.id && shift.segments?.some(s => s.isExtra) && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md"
                onClick={async () => {
                  const opening = !showHistory;
                  setShowHistory(opening);
                  // Toujours rafraîchir à l'ouverture pour avoir les données les plus récentes
                  if (opening) {
                    await refreshHistory();
                  }
                }}
              >
                {showHistory ? "Masquer l'historique" : "Voir l'historique"}
              </button>
              {showHistory && (
                <button
                  type="button"
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-md"
                  title="Basculer mode condensé"
                  onClick={() => setCompactHistory(v => !v)}
                >
                  {compactHistory ? 'Mode détaillé' : 'Mode condensé'}
                </button>
              )}
              {showHistory && (
                <button
                  type="button"
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-md"
                  title="Rafraîchir"
                  onClick={refreshHistory}
                >↻</button>
              )}
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-600">Employé</label>
          <div className="flex items-center gap-2 border rounded-md p-1.5 w-full bg-gray-50">
            <div className="w-6 h-6 rounded-full bg-[#cf292c] text-white text-xs flex items-center justify-center font-medium shadow-sm">
              {getEmployeeInitials(employe)}
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-sm font-medium text-gray-700">
                {formatEmployeeName(employe)}
              </span>
              {(employe.prenom || employe.nom) && employe.email && (
                <span className="text-xs text-gray-400">{employe.email}</span>
              )}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Date</label>
          <input 
            type="date" 
            value={formatDateForInput(shift.date)} 
            className="border rounded-md p-1.5 w-full bg-gray-50 text-sm" 
            disabled 
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Type</label>
          <select
            value={type}
            onChange={e => {
              setType(e.target.value);
              // Reset any error messages when changing type
              setErrorMessage(null);
              setSegmentErrors({});
            }}
            className="border rounded-md p-1.5 w-full text-sm"
          >
            <option value="présence">Présence</option>
            <option value="absence">Absence</option>
          </select>

          {type === "absence" && (
            <select
              value={motif}
              onChange={e => setMotif(e.target.value)}
              className="border rounded-md p-1.5 w-full mt-2 text-sm"
              required
            >
              <option value="">Sélectionnez le motif</option>
              <option value="CP">Congés Payés</option>
              <option value="RTT">RTT</option>
              <option value="Maladie">Maladie</option>
              <option value="Sans solde">Sans solde</option>
              <option value="Repos">Repos</option>
              <option value="Autre">Autre</option>
            </select>
          )}
        </div>
        {type === "présence" ? (
          <>
            {segments.map((seg, i) => (
              <div key={seg.id || `seg-edit-${i}`} className={`flex flex-wrap gap-2 items-center mb-1 border-b border-gray-50 pb-1 ${segmentErrors[`segments[${i}].overlap`] ? 'bg-red-50 rounded-md p-1' : ''}`}>
                {/* Affichage du numéro de segment */}
                <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full mr-1">Plage {i+1}</span>
                
                <div className="flex flex-col">
                  <input
                    type="time"
                    value={seg.start}
                    onChange={e => changeSegment(i, "start", e.target.value)}
                    className={`border rounded-md p-1.5 w-20 text-xs ${segmentErrors[`segments[${i}].start`] || segmentErrors[`segments[${i}].overlap`] ? 'border-red-500' : ''}`}
                    required
                  />
                  {segmentErrors[`segments[${i}].start`] && (
                    <span className="text-red-500 text-[9px] mt-1">{segmentErrors[`segments[${i}].start`]}</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <input
                    type="time"
                    value={seg.end}
                    onChange={e => changeSegment(i, "end", e.target.value)}
                    className={`border rounded-md p-1.5 w-20 text-xs ${segmentErrors[`segments[${i}].end`] || segmentErrors[`segments[${i}].overlap`] ? 'border-red-500' : ''}`}
                    required
                  />
                  {segmentErrors[`segments[${i}].end`] && (
                    <span className="text-red-500 text-[9px] mt-1">{segmentErrors[`segments[${i}].end`]}</span>
                  )}
                </div>
                
                {/* Affichage de l'erreur de chevauchement */}
                {segmentErrors[`segments[${i}].overlap`] && (
                  <span className="text-red-600 text-[10px] font-medium bg-red-50 px-2 py-1 rounded-sm border border-red-100 w-full mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{segmentErrors[`segments[${i}].overlap`]}</span>
                  </span>
                )}
                <input
                  type="text"
                  placeholder="Commentaire"
                  value={seg.commentaire}
                  onChange={e => changeSegment(i, "commentaire", e.target.value)}
                  className="border rounded-md p-1.5 w-32 text-xs"
                />
                <label className="flex items-center gap-1 text-[10px]">
                  <input
                    type="checkbox"
                    checked={seg.aValider}
                    onChange={e => changeSegment(i, "aValider", e.target.checked)}
                    className="accent-amber-500"
                  />
                  À valider
                </label>
                <label className="flex items-center gap-1 text-[10px]">
                  <input
                    type="checkbox"
                    checked={seg.isExtra}
                    onChange={e => changeSegment(i, "isExtra", e.target.checked)}
                    className="accent-emerald-600"
                  />
                  Extra
                </label>
                {seg.isExtra && (
                  <>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Montant €"
                      value={seg.extraMontant}
                      onChange={e => changeSegment(i, "extraMontant", e.target.value)}
                      className="border rounded-md p-1.5 w-20 text-xs"
                    />
                    <select
                      value={seg.paymentStatus}
                      onChange={e => changeSegment(i, 'paymentStatus', e.target.value)}
                      className="border rounded-md p-1.5 w-24 text-[10px]"
                    >
                      <option value="à_payer">À payer</option>
                      <option value="payé">Payé</option>
                    </select>
                    <select
                      value={seg.paymentMethod}
                      onChange={e => changeSegment(i, 'paymentMethod', e.target.value)}
                      className="border rounded-md p-1.5 w-24 text-[10px]"
                    >
                      <option value="">Méthode</option>
                      <option value="espèces">Espèces</option>
                      <option value="virement">Virement</option>
                      <option value="autre">Autre</option>
                    </select>
                    <input
                      type="date"
                      value={formatDateForInput(seg.paymentDate)}
                      onChange={e => changeSegment(i, 'paymentDate', e.target.value)}
                      className="border rounded-md p-1.5 w-30 text-[10px]"
                    />
                    <input
                      type="text"
                      placeholder="Note"
                      value={seg.paymentNote}
                      onChange={e => changeSegment(i, 'paymentNote', e.target.value)}
                      onBlur={() => {
                        // Annuler le timer de debounce s'il existe
                        if (debounceTimers.current[`${i}-paymentNote`]) {
                          clearTimeout(debounceTimers.current[`${i}-paymentNote`]);
                          debounceTimers.current[`${i}-paymentNote`] = null;
                        }
                        // Envoyer la mise à jour immédiatement lors de la perte de focus
                        if (isEdit && shift.id && seg.isExtra) {
                          updateExtraPaymentStatus(i);
                        }
                      }}
                      className="border rounded-md p-1.5 w-32 text-[10px]"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => removeSegment(i)}
                  className="text-[#cf292c] ml-1 text-xs"
                  title="Supprimer ce créneau"
                >✕</button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSegment}
              className="text-xs text-blue-600 mt-2 flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus-circle"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
              Ajouter un créneau
            </button>
          </>
        ) : type === "absence" ? (
          <input
            type="text"
            placeholder="Motif (RTT, CP, maladie, ...)"
            value={motif}
            onChange={e => setMotif(e.target.value)}
            className="border rounded p-1 w-full"
            required
          />
        ) : null}
        <div className="flex flex-wrap gap-2 mt-4 items-center">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-1.5 shadow-sm text-xs font-medium">Enregistrer</button>
          {isEdit && (
            <div className="relative">
              <button
                type="button"
                onClick={()=> setConfirmDelete(true)}
                disabled={confirmDelete}
                className="bg-[#cf292c] disabled:opacity-60 hover:bg-[#b31f22] text-white rounded-md px-4 py-1.5 shadow-sm text-xs font-medium"
              >Supprimer</button>
              {confirmDelete && (
                <div className="absolute left-0 mt-2 w-72 bg-white border border-red-200 shadow-lg rounded-md p-3 z-20">
                  <p className="text-[11px] leading-snug text-gray-700 mb-2"><span className="font-semibold text-red-600">Confirmer la suppression ?</span><br/>Cette action est définitive et supprimera aussi l'historique de paiement lié.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={onDelete} className="flex-1 bg-[#cf292c] hover:bg-[#b31f22] text-white rounded-md px-2 py-1.5 text-[11px] font-medium">Oui, supprimer</button>
                    <button type="button" onClick={()=>setConfirmDelete(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md px-2 py-1.5 text-[11px] font-medium">Annuler</button>
                  </div>
                  <div className="mt-1 text-[10px] text-gray-400">Expiration auto dans {confirmCountdown}s (Echap pour annuler)</div>
                </div>
              )}
            </div>
          )}
          <button type="button" onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md px-4 py-1.5 text-xs font-medium">Annuler</button>
        </div>
        
        {showHistory && (
          <div className="mt-5 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium mb-3 text-gray-700 flex items-center gap-3">
              <span>Historique des modifications de paiement</span>
              {compactHistory && <span className="text-[10px] text-gray-400">(fusion des frappes sur la note)</span>}
            </h4>
            {historyLoading ? (
              <div className="text-center py-4 text-gray-500 text-sm">Chargement...</div>
            ) : displayedHistory.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">Aucun historique disponible</div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-left text-gray-600">Date</th>
                      <th className="py-2 px-3 text-left text-gray-600">Utilisateur</th>
                      <th className="py-2 px-3 text-left text-gray-600">Segment</th>
                      <th className="py-2 px-3 text-left text-gray-600">Modifications</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedHistory.map((log, idx) => (
                      <tr key={log.id || idx} className="border-t border-gray-100">
                        <td className="py-2 px-3 align-top whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('fr-FR') : 'N/A'}
                          {log._mergedCount && <div className="text-[9px] text-gray-400">{log._mergedCount} frappes</div>}
                        </td>
                        <td className="py-2 px-3 align-top">{log.changedBy?.email || 'Inconnu'}</td>
                        <td className="py-2 px-3 align-top">{typeof log.segmentIndex === 'number' ? `#${log.segmentIndex + 1}` : 'N/A'}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {Object.keys(log.newValues || {}).map(key => {
                              let oldVal = log.oldValues?.[key] ?? '';
                              let newVal = log.newValues[key] ?? '';
                              if (key === 'paymentDate') {
                                if (oldVal && typeof oldVal === 'string' && oldVal.includes('T')) oldVal = oldVal.split('T')[0];
                                if (newVal && typeof newVal === 'string' && newVal.includes('T')) newVal = newVal.split('T')[0];
                              }
                              if (oldVal === newVal) return null;
                              return (
                                <div key={key} className="inline-block bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-[10px] border border-blue-100">
                                  {key === 'paymentStatus' && 'Statut'}
                                  {key === 'paymentMethod' && 'Méthode'}
                                  {key === 'paymentDate' && 'Date'}
                                  {key === 'paymentNote' && 'Note'}
                                  {': '}
                                  <span className="line-through text-gray-500">{oldVal || '—'}</span>
                                  {' → '}
                                  <span className="font-medium">{newVal || '—'}</span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

// Panneau d'administration des anomalies
function AdminAnomaliesPanel({ isOpen, onClose, dates, employes, formatEmployeeName, onRefresh }) {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('en_attente'); // 'en_attente', 'validee', 'refusee', 'tous'
  const [selectedEmploye, setSelectedEmploye] = useState('tous');
  
  // Charger les anomalies
  const loadAnomalies = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Calculer la plage de dates
      const dateDebut = dates[0]?.toISOString().split('T')[0];
      const dateFin = dates[dates.length - 1]?.toISOString().split('T')[0];

      const params = new URLSearchParams({
        dateDebut,
        dateFin,
        limit: '1000'
      });

      if (filter !== 'tous') {
        params.append('statut', filter);
      }

      if (selectedEmploye !== 'tous') {
        params.append('employeId', selectedEmploye);
      }

      const response = await fetch(`${API_URL}/api/anomalies?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAnomalies(data.anomalies || []);
      }
    } catch (error) {
      console.error('Erreur chargement anomalies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Traiter une anomalie (actions backend directes: valider / refuser / corriger)
  const handleAnomalieAction = async (anomalieId, action, note = '') => {
    try {
      const token = localStorage.getItem('token');
      if (!['valider','refuser','corriger'].includes(action)) {
        console.warn('Action anomalie inconnue:', action);
        return;
      }
      const response = await fetch(`${API_URL}/api/anomalies/${anomalieId}/traiter`, {
        method: 'PUT',
        headers: {
          'Content-Type':'application/json',
          'Authorization':`Bearer ${token}`
        },
        body: JSON.stringify({ action, commentaire: note })
      });
      if (!response.ok) throw new Error('API anomalie');
      
      // Rechargement complet après traitement
      console.log('🔄 Rechargement après traitement anomalie', anomalieId, action);
      await loadAnomalies();
      
      // Forcer le refresh complet via onRefresh
      onRefresh();
      
      // Nettoyer le cache localStorage pour cette anomalie après un délai
      setTimeout(() => {
        try {
          const stored = localStorage.getItem('processedAnomalies');
          if (stored) {
            const processedMap = JSON.parse(stored);
            if (processedMap[anomalieId]) {
              delete processedMap[anomalieId];
              localStorage.setItem('processedAnomalies', JSON.stringify(processedMap));
              console.log('🧹 Cache localStorage nettoyé pour anomalie', anomalieId);
            }
          }
        } catch (e) {
          console.warn('Erreur nettoyage cache anomalie:', e);
        }
      }, 2000); // Attendre 2s pour être sûr que le backend est synchronisé
      
    } catch (e) {
      console.error('Erreur traitement anomalie:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAnomalies();
    }
  }, [isOpen, filter, selectedEmploye, dates]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Administration des Anomalies</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filtres */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Statut:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="en_attente">En attente</option>
                <option value="validee">Validées</option>
                <option value="refusee">Refusées</option>
                <option value="tous">Toutes</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Employé:</label>
              <select
                value={selectedEmploye}
                onChange={(e) => setSelectedEmploye(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="tous">Tous</option>
                {employes.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {formatEmployeeName(emp)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadAnomalies}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition"
            >
              Actualiser
            </button>
          </div>
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

                return (
                  <div key={anomalie.id} className={`border rounded-lg p-4 ${statusColors[anomalie.statut] || 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-gray-900">
                            {employe ? formatEmployeeName(employe) : `Employé #${anomalie.employeId}`}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(anomalie.date).toLocaleDateString('fr-FR')}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            anomalie.statut === 'validee' ? 'bg-green-100 text-green-800' :
                            anomalie.statut === 'refusee' ? 'bg-red-100 text-red-800' :
                            anomalie.statut === 'traitee' ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {anomalie.statut === 'validee' ? '✅ Validée' :
                             anomalie.statut === 'refusee' ? '❌ Refusée' :
                             anomalie.statut === 'traitee' ? '🔧 Traitée' :
                             '⏳ En attente'}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-700 mb-2">
                          <strong>Type:</strong> {anomalie.type} | <strong>Gravité:</strong> {anomalie.gravite}
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          {anomalie.description}
                        </div>

                        {anomalie.adminNote && (
                          <div className="mt-2 p-2 bg-white/80 rounded text-sm">
                            <strong>Note admin:</strong> {anomalie.adminNote}
                          </div>
                        )}

                        {anomalie.validatedBy && (
                          <div className="mt-2 text-xs text-gray-500">
                            Traité par: {anomalie.validatedBy} le {new Date(anomalie.validatedAt).toLocaleString('fr-FR')}
                          </div>
                        )}
                      </div>

                      {/* Actions pour anomalies en attente */}
                      {anomalie.statut === 'en_attente' && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              const note = prompt('Note de validation (optionnel):') || 'Validation rapide admin';
                              handleAnomalieAction(anomalie.id, 'valider', note);
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                          >
                            ✅ Valider
                          </button>
                          <button
                            onClick={() => {
                              const note = prompt('Raison du refus:') || 'Refusée par admin';
                              handleAnomalieAction(anomalie.id, 'refuser', note);
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                          >
                            ❌ Refuser
                          </button>
                          <button
                            onClick={() => {
                              const note = prompt('Commentaire de correction:') || 'Corrigée manuellement';
                              handleAnomalieAction(anomalie.id, 'corriger', note);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                          >
                            🔧 Corriger
                          </button>
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
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>{anomalies.length} anomalie(s) trouvée(s)</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlanningRH() {
  // Récupération de la vue sauvegardée ou "semaine" par défaut
  const getInitialViewType = () => {
    const savedViewType = localStorage.getItem('planningRH_viewType');
    return savedViewType && ['jour', 'semaine', 'mois'].includes(savedViewType) ? savedViewType : 'semaine';
  };

  // Récupération de la date sauvegardée ou date actuelle par défaut
  const getInitialDate = () => {
    const savedDate = localStorage.getItem('planningRH_currentDate');
    return savedDate ? new Date(savedDate) : new Date();
  };

  // Initialisation des dates selon la vue sauvegardée
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

  // Sauvegarde automatique de la date courante (utiliser la fonction standardisée)
  useEffect(() => {
    localStorage.setItem('planningRH_currentDate', dateCourante.toISOString());
  }, [dateCourante]);

  // Sauvegarde automatique de la vue courante
  useEffect(() => {
    localStorage.setItem('planningRH_viewType', viewType);
  }, [viewType]);
  
  const [employes, setEmployes] = useState([]);
  const [shifts, setShifts] = useState([]);
  // Barre de recherche employés
  const [searchTerm, setSearchTerm] = useState("");
  // État pour le menu mobile responsive
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Filtrage par catégorie d'employé
  const [categorieFilter, setCategorieFilter] = useState("tous");
  
  // Fonction pour obtenir la catégorie d'un employé (couleur et libellé)
  const getCategorieEmploye = (employe) => {
    // Utiliser le champ 'categorie' de la base de données
    const categorie = (employe.categorie || '').toLowerCase();
    
    // Catégories prédéfinies avec couleurs - basées sur le champ 'categorie'
    if (categorie.includes('cuisine')) {
      return { label: 'Cuisine', color: 'bg-orange-100 text-orange-800', icon: '👨‍🍳' };
    }
    if (categorie.includes('service')) {
      return { label: 'Service', color: 'bg-blue-100 text-blue-800', icon: '🍽️' };
    }
    if (categorie.includes('management') || categorie.includes('admin') || categorie.includes('direction')) {
      return { label: 'Administration', color: 'bg-purple-100 text-purple-800', icon: '💼' };
    }
    if (categorie.includes('technique') || categorie.includes('maintenance')) {
      return { label: 'Technique', color: 'bg-green-100 text-green-800', icon: '🔧' };
    }
    if (categorie.includes('entretien') || categorie.includes('nettoyage')) {
      return { label: 'Entretien', color: 'bg-yellow-100 text-yellow-800', icon: '🧹' };
    }
    if (categorie.includes('operations') || categorie.includes('logistique')) {
      return { label: 'Opérations', color: 'bg-indigo-100 text-indigo-800', icon: '📦' };
    }
    if (categorie.includes('rh') || categorie.includes('ressources')) {
      return { label: 'RH', color: 'bg-pink-100 text-pink-800', icon: '🤝' };
    }
    if (categorie.includes('finance') || categorie.includes('comptabilité')) {
      return { label: 'Finance', color: 'bg-emerald-100 text-emerald-800', icon: '�' };
    }
    
    // Catégorie par défaut - utilise le champ categorie s'il existe, sinon 'Général'
    const labelDefaut = employe.categorie || 'Général';
    return { 
      label: labelDefaut, 
      color: 'bg-gray-100 text-gray-800', 
      icon: '👤' 
    };
  };
  
  // Filtrage des employés selon le terme de recherche ET la catégorie
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
    
    // Filtrer par catégorie
    if (categorieFilter !== "tous") {
      filtered = filtered.filter(e => {
        const categorie = getCategorieEmploye(e);
        return categorie.label.toLowerCase() === categorieFilter.toLowerCase();
      });
    }
    
    // Trier par catégorie puis par nom
    return filtered.sort((a, b) => {
      const catA = getCategorieEmploye(a).label;
      const catB = getCategorieEmploye(b).label;
      if (catA !== catB) return catA.localeCompare(catB);
      return `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`);
    });
  }, [employes, searchTerm, categorieFilter]);

  // Groupement des employés par catégorie pour l'affichage avec séparateurs
  const employesGroupesParCategorie = useMemo(() => {
    if (!filteredEmployes.length) return [];
    
    const groupes = [];
    let currentCategorie = null;
    let currentGroup = [];
    
    filteredEmployes.forEach(employe => {
      const categorie = getCategorieEmploye(employe);
      
      if (categorie.label !== currentCategorie) {
        // Nouveau groupe : sauvegarder le précédent et commencer un nouveau
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
        // Même catégorie : ajouter à l'groupe actuel
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
  
  // États pour la notification de restauration de navigation
  const [showRestoreNotification, setShowRestoreNotification] = useState(false);
  const [restoreNotificationData, setRestoreNotificationData] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [creationRapideModalOpen, setCreationRapideModalOpen] = useState(false);
  const [showComparaison, setShowComparaison] = useState(false); // Nouvel état pour la comparaison
  const [updateTrigger, setUpdateTrigger] = useState(0); // Forcer le rafraîchissement des composants
  const [forceReadable, setForceReadable] = useState(false); // Forcer mode lisible
  const [skelloMode] = useState(false); // Mode compact style Skello - setSkelloMode removed to avoid unused warning
  const [expandedEmployees, setExpandedEmployees] = useState(new Set()); // lignes agrandies
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false); // Barre flottante
  const [comparaisons, setComparaisons] = useState([]); // Données de comparaison
  const [loadingComparaison, setLoadingComparaison] = useState(false);
  
  // État pour le rapport d'heures employé
  const [rapportEmployeId, setRapportEmployeId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null); // Pour afficher des notifications
  
  // 🆕 États pour la gestion des anomalies
  const [anomaliesData, setAnomaliesData] = useState({}); // employeId_date -> anomalies[]
  const [anomalieSelectionnee, setAnomalieSelectionnee] = useState(null); // Anomalie en cours de traitement
  const [showAdminPanel, setShowAdminPanel] = useState(false); // Panneau d'administration des anomalies
  
  // État pour le panneau de debug (seulement en développement)  
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Hooks pour la gestion des anomalies
  const { syncAnomaliesFromComparison } = useSyncAnomalies();
  
  // État pour les privilèges administrateur
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  // Filtres avancés pour afficher les éléments qui intéressent l'admin
  // Ancien état de filtres supprimé (non utilisé) pour alléger le composant

  // Fermer le menu mobile lors des changements de vue ou navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [viewType, dateCourante]);

  // Gestion de la barre flottante au scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const shouldShow = scrollY > 200; // Apparaît après 200px de scroll
      setShowFloatingToolbar(shouldShow);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Vérifier si la position a été restaurée (seulement au premier rendu)
  useEffect(() => {
    const checkNavigationRestore = () => {
      const savedDate = localStorage.getItem('planningRH_currentDate');
      const savedViewType = localStorage.getItem('planningRH_viewType');
      const lastVisit = localStorage.getItem('planningRH_lastVisit');
      
      // Si nous avons des données sauvegardées et qu'elles ne correspondent pas aux valeurs par défaut
      const now = new Date();
      const isDateRestored = savedDate && new Date(savedDate).toDateString() !== now.toDateString();
      const isViewRestored = savedViewType && savedViewType !== 'semaine';
      
      if ((isDateRestored || isViewRestored) && lastVisit) {
        const lastVisitDate = new Date(lastVisit);
        const sessionDuration = (now - lastVisitDate) / (1000 * 60); // en minutes
        
        // Afficher la notification seulement si la session est récente (moins de 7 jours)
        if (sessionDuration < 10080) { // 7 jours en minutes
          setRestoreNotificationData({
            date: savedDate || now.toISOString(),
            viewType: savedViewType || 'semaine',
            sessionDuration
          });
          setShowRestoreNotification(true);
        }
      }
      
      // Mettre à jour la dernière visite
      localStorage.setItem('planningRH_lastVisit', now.toISOString());
    };

    checkNavigationRestore();
  }, []); // Exécuter seulement au montage

  // Correction: S'assurer que le token est bien récupéré et disponible
  const token = localStorage.getItem("token");
  console.log("PlanningRH - Token disponible:", token ? "Oui" : "Non");
  
  // Fonction utilitaire pour formater les noms des employés de façon cohérente
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
  
  // Fonction pour obtenir les initiales d'un employé
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
  
  // Effet pour gérer la disparition automatique des notifications
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
    
    // Nettoyage au démontage du composant
    return () => {
      delete window.showNotificationGlobal;
    };
  }, []);

  // Vérifier les privilèges utilisateur au chargement
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

        // Si 404 (souvent utilisateur supprimé après reset), tenter /user/profile
        if (response.status === 404) {
          console.warn('Profil non trouvé via /auth/profile (404). Tentative /user/profile ...');
          const alt = await doFetch(buildApiUrl('/user/profile'));
          if (alt.ok) {
            response = alt;
          } else if (alt.status === 404) {
            // Cas typique: base réinitialisée, token pointe vers un ancien user
            console.warn('Utilisateur inexistant (base réinitialisée). Nettoyage session.');
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
          console.log('👤 Données utilisateur récupérées:', userData);
          setUserRole(userData.role);
          const isAdminUser = ['admin', 'manager'].includes(userData.role);
          setIsAdmin(isAdminUser);
          console.log('🔐 Privilèges:', { role: userData.role, isAdmin: isAdminUser });
        } else if (response.status === 401) {
          console.warn('Token invalide ou expiré (401). Nettoyage.');
          localStorage.removeItem('token');
          setIsAdmin(false);
          setUserRole(null);
        } else {
          console.warn('Erreur lors de la récupération du profil:', response.status, response.statusText);
          setIsAdmin(false);
          setUserRole('employee');
        }
      } catch (error) {
        console.warn('Impossible de récupérer les privilèges utilisateur:', error);
        // Par défaut, considérer comme utilisateur normal en cas d'erreur
        setIsAdmin(false);
        setUserRole('employee');
      }
    };

    if (token) {
      checkUserPrivileges();
    } else {
      // Si pas de token, réinitialiser les privilèges
      setIsAdmin(false);
      setUserRole(null);
    }
  }, [token]);

  // Fonction pour vérifier si une modification nécessite des privilèges administrateur
  const requiresAdminPrivileges = useCallback((shift, originalShift = null) => {
    if (!originalShift && !shift) return { required: false };

    console.log('🔍 Vérification privilèges admin:', { shift, originalShift });

    // Nouvelles créations de shifts hors plage normale (avant 6h ou après 23h)
    if (!originalShift && shift.segments) {
      const hasOffHoursSegments = shift.segments.some(segment => {
        const startHour = parseInt(segment.start?.split(':')[0] || '0');
        const endHour = parseInt(segment.end?.split(':')[0] || '0');
        const isOffHours = startHour < 6 || endHour > 23 || (endHour === 0 && segment.end !== '00:00');
        
        if (isOffHours) {
          console.log('⚠️ Segment hors plage détecté:', segment, { startHour, endHour });
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

    // Modifications de shifts existants avec heures supplémentaires
    if (originalShift && shift.segments && originalShift.segments) {
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
        console.log('⚠️ Modification importante d\'heures détectée:', { originalDuration, newDuration, hoursDifference });
        return {
          required: true,
          reason: 'MODIFICATION_IMPORTANTE',
          message: `Modification importante des heures (+${hoursDifference.toFixed(1)}h) nécessite une validation administrative`
        };
      }
    }

    // Création/modification de créneaux extra
    if (shift.segments?.some(seg => seg.isExtra)) {
      console.log('⚠️ Créneaux extra détectés');
      return {
        required: true,
        reason: 'HEURES_EXTRA',
        message: 'Les heures supplémentaires nécessitent une validation administrative'
      };
    }

    return { required: false };
  }, []);

  // Fonction pour valider une anomalie avec contrôles administrateur
  const validateAnomalieWithAdminCheck = useCallback(async (employeId, date, ecart, action) => {
    // Types d'anomalies nécessitant des privilèges administrateur
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

  // Fonction réutilisable pour recharger les shifts
  const refreshShifts = useCallback(async (silentMode = false) => {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) return false;
    
    try {
      console.log("Début du rechargement des shifts...");
      
      // Assurer qu'aucun filtre de date n'est appliqué pour récupérer tous les shifts
      const response = await axios.get(buildApiUrl('/shifts'), {
        headers: { Authorization: `Bearer ${currentToken}` },
        // Ne pas filtrer par date pour récupérer tous les shifts, y compris les nouveaux
        params: {}
      });
      
      console.log(`${response.data.length} shifts récupérés du serveur`);
      
      // Assurons-nous que les dates sont correctement formatées pour la comparaison
      const formattedShifts = response.data.map(shift => {
        // Traitement spécial pour les dates
        let formattedDate;
        
        if (shift.date) {
          try {
            // Si c'est déjà une chaîne ISO, la garder telle quelle
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
          // Normaliser le type pour éviter les valeurs undefined/null
          type: shift.type || "présence",
          // Normaliser les autres champs critiques
          motif: shift.motif || "",
          segments: shift.segments || []
        };
      });
      
      console.log("Shifts formatés:", formattedShifts);
      setShifts(formattedShifts);
      return true;
    } catch (err) {
      console.error("Erreur lors du rechargement des shifts:", err);
      if (!silentMode) {
        alert("Impossible de rafraîchir les données des shifts");
      }
      return false;
    }
  }, []);

  // Fonction pour charger les données de comparaison planning vs réalité
  const loadComparaisons = useCallback(async () => {
    setLoadingComparaison(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Calculer la plage de dates basée sur la vue actuelle
      let dateDebut, dateFin;
      
      if (viewType === 'jour') {
        dateDebut = dateFin = dates[0]?.toISOString().split('T')[0];
      } else if (viewType === 'semaine') {
        dateDebut = dates[0]?.toISOString().split('T')[0];
        dateFin = dates[6]?.toISOString().split('T')[0];
      } else { // mois
        const firstDay = new Date(dateCourante.getFullYear(), dateCourante.getMonth(), 1);
        const lastDay = new Date(dateCourante.getFullYear(), dateCourante.getMonth() + 1, 0);
        dateDebut = firstDay.toISOString().split('T')[0];
        dateFin = lastDay.toISOString().split('T')[0];
      }

      // Récupérer les comparaisons pour tous les employés de la période
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
          console.warn(`Erreur comparaison pour employé ${employe.id}:`, err);
        }
      }
      // --- Reconciliation des statuts traités localement pour empêcher la réapparition des boutons ---
      // Utiliser localStorage pour persister les statuts traités même après refresh
      let processedMap = {};
      try {
        const stored = localStorage.getItem('processedAnomalies');
        if (stored) {
          processedMap = JSON.parse(stored);
          console.log('🔍 Cache localStorage lu:', Object.keys(processedMap).length, 'anomalies traitées');
        }
      } catch (e) {
        console.warn('Erreur lecture processedAnomalies du localStorage:', e);
        processedMap = {};
      }

      const now = Date.now();
      const TTL = 30 * 60 * 1000; // 30 min (nettoyage automatique) 
      const beforeCleanup = Object.keys(processedMap).length;
      // Nettoyer les entrées expirées
      Object.keys(processedMap).forEach(id => { 
        if (now - processedMap[id].updatedAt > TTL) {
          delete processedMap[id]; 
        }
      });
      const afterCleanup = Object.keys(processedMap).length;
      if (beforeCleanup !== afterCleanup) {
        console.log('🧹 Cache nettoyé:', beforeCleanup, '->', afterCleanup, 'entrées');
      }
      
      // Sauvegarder le cache nettoyé
      try {
        localStorage.setItem('processedAnomalies', JSON.stringify(processedMap));
      } catch (e) {
        console.warn('Erreur sauvegarde processedAnomalies:', e);
      }
      
      // Fallback pour compatibilité
      window.__processedAnomalies = processedMap;

      console.log('🔄 Début réconciliation comparaisons...', allComparaisons.length, 'comparaisons');
      console.log('📊 Données disponibles:', {
        processedMapKeys: Object.keys(processedMap),
        anomaliesDataKeys: Object.keys(anomaliesData || {}),
        comparaisonsCount: allComparaisons.length
      });

      const reconciled = allComparaisons.map(comp => {
        const dateKey = comp.date?.slice(0,10);
        // Récupérer les anomalies déjà en cache pour la clé employe/date
        const key = `${comp.employeId}_${dateKey}`;
        const anomaliesList = (anomaliesData && anomaliesData[key]) || [];
        const anomaliesById = {};
        anomaliesList.forEach(a => { anomaliesById[a.id] = a; });
        
        console.log(`🔍 Réconciliation ${key}:`, {
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
              console.log(`✅ Écart reconcilié via processedMap: anomalie ${ec.anomalieId} -> ${modified.statut}`);
            }
            // 2. Override via anomaliesData (cache anomalies) si statut final absent ou différent
            else if (ec.anomalieId && anomaliesById[ec.anomalieId] && treatedStatuses.includes(anomaliesById[ec.anomalieId].statut)) {
              if (modified.statut !== anomaliesById[ec.anomalieId].statut) {
                modified.statut = anomaliesById[ec.anomalieId].statut;
                modified.statutMisAJour = true;
                console.log(`✅ Écart reconcilié via anomaliesData: anomalie ${ec.anomalieId} -> ${modified.statut}`);
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
                console.log(`🔗 Écart lié par heuristique: ${ec.type} -> anomalie ${match.id} (${match.statut})`);
              } else if (!treatedStatuses.includes(originalStatus)) {
                console.log(`⚠️ Écart non réconcilié: ${ec.type}, anomalieId: ${ec.anomalieId}, statut: ${originalStatus}`);
              }
            }
            
            return modified;
          })
        };
      });

      setComparaisons(reconciled);
      console.log(`${reconciled.length} comparaisons chargées (reconciliées)`);
      console.log('Détail des comparaisons après reconciliation:', reconciled);
    } catch (err) {
      console.error("Erreur chargement comparaisons:", err);
      setNotification({
        type: "error",
        message: "Erreur lors du chargement des comparaisons",
        duration: 5000
      });
    } finally {
      setLoadingComparaison(false);
    }
  }, [viewType, dates, dateCourante, employes, anomaliesData]);

  // Fonction helper pour récupérer les écarts d'un employé pour une date donnée
  const getEcartsForEmployeeDate = useCallback((employeId, date) => {
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
    
    console.log(`🔍 Recherche écarts pour employé ${employeId} le ${dateStr}:`, 
      comparaison ? `${comparaison.ecarts.length} écarts trouvés` : 'Aucune comparaison');
    
    if (comparaison && comparaison.ecarts.length > 0) {
      const ecartsAvecStatut = comparaison.ecarts.filter(e => e.statut);
      if (ecartsAvecStatut.length > 0) {
        console.log(`📊 Écarts avec statut pour ${employeId}-${dateStr}:`, 
          ecartsAvecStatut.map(e => `${e.type}=${e.statut}`).join(', '));
      }
    }
    
    return comparaison ? comparaison.ecarts : [];
  }, [showComparaison, comparaisons, updateTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fonction helper pour formater l'affichage d'un écart - VERSION EXPLICITE avec nouveaux barèmes et statuts
  const formatEcart = useCallback((ecart) => {
    // Utilisation de updateTrigger comme dépendance pour forcer le rafraîchissement
    // Debug: afficher le statut de l'écart
    if (ecart.statut) {
      console.log(`🎨 Formatage écart avec statut:`, ecart.type, ecart.statut);
    }
    
    // Gestion des statuts d'anomalies (si l'écart a un statut)
    const getStatusConfig = (status, baseConfig) => {
      switch (status) {
        case 'validee':
          return {
            ...baseConfig,
            icon: '✅',
            label: `${baseConfig.label} - Validée`,
            color: 'text-green-700',
            bg: 'bg-green-100',
            badge: 'Validée',
            borderClass: 'border-green-400'
          };
        case 'refusee':
          return {
            ...baseConfig,
            icon: '❌',
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
            icon: '🔧',
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
      // 🔧 NOUVEAUX TYPES ARRIVÉE avec barème précis
      hors_plage_in: {
        icon: '🟣',
        label: 'Hors-plage IN',
        color: 'text-purple-700',
        bg: 'bg-purple-100',
        badge: 'À valider'
      },
      arrivee_acceptable: {
        icon: '🟢',
        label: 'Arrivée OK',
        color: 'text-green-600',
        bg: 'bg-green-50'
      },
      retard_modere: {
        icon: '🟡',
        label: 'Retard modéré',
        color: 'text-yellow-600',
        bg: 'bg-yellow-50'
      },
      retard_critique: {
        icon: '🔴',
        label: 'Retard critique',
        color: 'text-red-600',
        bg: 'bg-red-100'
      },
      
      // 🔧 NOUVEAUX TYPES DÉPART avec barème précis
      depart_premature_critique: {
        icon: '🔴',
        label: 'Départ critique',
        color: 'text-red-700',
        bg: 'bg-red-100'
      },
      depart_anticipe: {
        icon: '🟡',
        label: 'Départ anticipé',
        color: 'text-yellow-600',
        bg: 'bg-yellow-50'
      },
      depart_acceptable: {
        icon: '🟢',
        label: 'Départ OK',
        color: 'text-green-600',
        bg: 'bg-green-50'
      },
      heures_supplementaires: {
        icon: '🟡',
        label: 'H. supp',
        color: 'text-orange-600',
        bg: 'bg-orange-50'
      },
      // 🔧 NOUVEAUX TYPES HEURES SUPPLÉMENTAIRES - 3 ZONES
      heures_sup_auto_validees: {
        icon: '💰',
        label: 'H. sup auto',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        badge: 'Auto-validées'
      },
      heures_sup_a_valider: {
        icon: '⚠️',
        label: 'H. sup',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        badge: 'À valider'
      },
      hors_plage_out_critique: {
        icon: '🟣',
        label: 'Hors-plage OUT',
        color: 'text-purple-700',
        bg: 'bg-purple-100',
        badge: 'Critique'
      },
      hors_plage_out: {
        icon: '🟣',
        label: 'Hors-plage OUT',
        color: 'text-purple-700',
        bg: 'bg-purple-100',
        badge: 'À valider'
      },
      
      // Types existants conservés pour compatibilité
      retard: {
        icon: '⏰',
        label: 'Retard',
        color: 'text-red-600',
        bg: 'bg-red-50'
      },
      arrivee_anticipee: {
        icon: '✅',
        label: 'En avance',
        color: 'text-green-600',
        bg: 'bg-green-50'
      },
      arrivee_a_l_heure: {
        icon: '✔',
        label: 'Arrivée OK',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50'
      },
      depart_a_l_heure: {
        icon: '✔',
        label: 'Départ OK',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50'
      },
      absence_totale: {
        icon: '❌',
        label: 'Absent',
        color: 'text-red-600',
        bg: 'bg-red-50'
      },
      presence_non_prevue: {
        icon: '❓',
        label: 'Non prévu',
        color: 'text-purple-600',
        bg: 'bg-purple-50'
      },
      absence_planifiee_avec_pointage: {
        icon: '🚨',
        label: 'Anomalie!',
        color: 'text-red-700',
        bg: 'bg-red-100'
      },
      absence_conforme: {
        icon: '✅',
        label: 'Absence OK',
        color: 'text-green-600',
        bg: 'bg-green-50'
      }
    };
    
    const baseConfig = configs[ecart.type] || configs.presence_non_prevue;
    
    // Appliquer le statut si présent (anomalies traitées par l'admin)
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
      // Informations supplémentaires pour les anomalies traitées
      validatedBy: ecart.validatedBy,
      validatedAt: ecart.validatedAt,
      adminNote: ecart.adminNote
    };
  }, [updateTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🆕 Fonctions pour la gestion des anomalies
  
  // Synchroniser les anomalies après calcul de comparaison
  // eslint-disable-next-line no-unused-vars
  const syncAnomaliesFromEcarts = useCallback(async (employeId, date, ecarts) => {
    if (!ecarts || ecarts.length === 0) return;
    
    // Filtrer les écarts significatifs qui doivent devenir des anomalies
    const ecartsSignificatifs = ecarts.filter(ecart => {
      return ecart.gravite !== 'info' && ecart.gravite !== 'ok' && 
             ecart.type !== 'absence_conforme' && ecart.type !== 'arrivee_acceptable' && 
             ecart.type !== 'depart_acceptable';
    });
    
    if (ecartsSignificatifs.length === 0) return;

    try {
      const result = await syncAnomaliesFromComparison(employeId, date, ecartsSignificatifs);
      
      // Mettre à jour le cache local des anomalies
      const key = `${employeId}_${date}`;
      setAnomaliesData(prev => ({
        ...prev,
        [key]: result.anomalies || []
      }));
      
      console.log(`📋 ${result.anomaliesCreees} anomalies synchronisées pour employé ${employeId} le ${date}`);
      
    } catch (error) {
      console.error('Erreur sync anomalies:', error);
    }
  }, [syncAnomaliesFromComparison, setAnomaliesData]);

  // Récupérer les anomalies pour un employé/date
  const getAnomaliesForEmployeeDate = useCallback((employeId, date) => {
    const key = `${employeId}_${date}`;
    return anomaliesData[key] || [];
  }, [anomaliesData]);

  // Mettre à jour le statut d'une anomalie localement (pour synchroniser avec le panneau)
  const updateAnomalieStatus = useCallback((employeId, date, anomalieId, newStatus, adminNote = null) => {
    console.log(`🔄 updateAnomalieStatus appelé:`, { employeId, date, anomalieId, newStatus, adminNote });
    
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

  // Stocker statut traité pour empêcher la réapparition des actions avant propagation backend
  // Utiliser localStorage pour persistance même après refresh
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
    
    // Fallback pour compatibilité
    if (!window.__processedAnomalies) window.__processedAnomalies = {};
    window.__processedAnomalies[anomalieId] = processedMap[anomalieId];
    
    console.log('✅ Statut anomalie sauvegardé localement:', { anomalieId, newStatus });
  } catch (e) {
    console.warn('Erreur sauvegarde statut anomalie:', e);
    // Fallback simple
    if (!window.__processedAnomalies) window.__processedAnomalies = {};
    window.__processedAnomalies[anomalieId] = { statut: newStatus, updatedAt: Date.now() };
  }
    
    // SYNCHRONISATION IMMÉDIATE AVEC LES COMPARAISONS
    // Mettre à jour le statut des écarts correspondants dans les comparaisons
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
        // Marquer le statut de l'écart dans la comparaison
        newComp[compIndex].ecarts = newComp[compIndex].ecarts.map(ecart => {
          // Si l'écart a déjà une anomalieId qui correspond
          if (ecart.anomalieId === anomalieId) {
            console.log(`📝 Mise à jour directe écart avec anomalieId ${anomalieId}:`, ecart.type, '->', newStatus);
            return {
              ...ecart,
              statut: newStatus,
              statutMisAJour: true,
              ...(adminNote && { adminNote })
            };
          }
          
          // Si l'écart n'a pas d'anomalieId mais pourrait correspondre à cette anomalie
          // (recherche par type et caractéristiques similaires)
          if (!ecart.anomalieId && !ecart.statut) {
            // Rechercher dans le cache des anomalies pour voir si cette anomalie correspond à cet écart
            const anomalieCorrespondante = anomaliesData[key]?.find(a => 
              a.id === anomalieId && 
              (a.type === ecart.type || 
               (a.type?.includes('hors_plage') && ecart.type?.includes('hors_plage')) ||
               (a.type?.includes('heures_sup') && ecart.type?.includes('heures_sup')) ||
               (a.type?.includes('retard') && ecart.type?.includes('retard')) ||
               (a.type?.includes('depart') && ecart.type?.includes('depart')))
            );
            
            if (anomalieCorrespondante) {
              console.log(`🔗 Liaison écart ${ecart.type} avec anomalie ${anomalieId}:`, newStatus);
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
        
        console.log(`📊 Comparaison mise à jour pour employé ${employeId} le ${dateStr}:`, 
          newComp[compIndex].ecarts.filter(e => e.statut).length, 'écarts avec statut');
      }
      
      return newComp;
    });
    
    // Forcer un rafraîchissement de l'UI en déclenchant un état
    setUpdateTrigger(prev => prev + 1);
    
    console.log(`🔄 Anomalie ${anomalieId} mise à jour localement: ${newStatus}`);
  }, [setAnomaliesData, setComparaisons, anomaliesData]); // Ajout d'anomaliesData dans les dépendances

  // Gérer le clic sur une anomalie
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
      // Convertir en heures supplémentaires
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

  // Charger les anomalies de la période affichée
  const loadAnomaliesPeriode = useCallback(async () => {
    if (!dates.length) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Calculer la plage de dates
      const dateDebut = dates[0]?.toISOString().split('T')[0];
      const dateFin = dates[dates.length - 1]?.toISOString().split('T')[0];

      // Récupérer les anomalies pour tous les employés de la période
      const params = new URLSearchParams({
        dateDebut,
        dateFin,
        limit: '1000' // Limite élevée pour récupérer toutes les anomalies
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
        console.log(`📊 ${response.data.anomalies.length} anomalies chargées`);
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

  // Synchronisation périodique des statuts d'anomalies pour éviter les désynchronisations
  useEffect(() => {
    if (!showComparaison) return;
    
    const syncInterval = setInterval(() => {
      console.log('🔄 Synchronisation périodique des statuts anomalies...');
      // Recharger les comparaisons pour avoir les statuts à jour
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
        // Debug: voir tous les congés reçus
        console.log("Congés reçus du backend:", congesRes.data);
        // Ne plus filtrer - garder tous les congés pour les afficher
        setConges(congesRes.data);
       } catch (err) {
        console.error("Erreur détaillée:", err.response?.data || err.message);
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
  
  // Débogage - Afficher les dates actuellement visibles
  useEffect(() => {
    console.log("Dates actuellement affichées dans le planning:", 
      dates.map(d => d instanceof Date ? d.toISOString().slice(0, 10) : d));
    
    // Debug des congés chargés
    if (conges.length > 0) {
      console.log("Congés chargés dans le state:", conges);
      console.log("Nombre de congés:", conges.length);
    }
    
    // Debug des employés
    if (employes.length > 0) {
      console.log("Premiers employés:", employes.slice(0, 2));
    }
    
    // Afficher les shifts correspondant aux dates affichées
    if (shifts.length > 0 && dates.length > 0) {
      const datesStr = dates.map(d => d instanceof Date ? d.toISOString().slice(0, 10) : d.slice(0, 10));
      const shiftsFiltered = shifts.filter(s => {
        const shiftDate = typeof s.date === 'string' ? s.date.slice(0, 10) : 
                         (s.date instanceof Date ? s.date.toISOString().slice(0, 10) : 
                         new Date(s.date).toISOString().slice(0, 10));
        return datesStr.includes(shiftDate);
      });
      console.log("Shifts correspondant aux dates affichées:", shiftsFiltered);
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
    // Nettoyer la notification si elle est affichée
    if (showRestoreNotification) {
      setShowRestoreNotification(false);
    }
  };

  // Ouvrir la modale d'édition (ajout start/end optionnels pour préremplissage)
  const handleCellClick = (employeId, dateStr, startGuess, endGuess) => {
    const found = shifts.find(
      (s) => s.employeId === employeId && s.date.slice(0, 10) === dateStr
    );
    if (found) {
      setSelected({ ...found });
    } else {
      setSelected({
        employeId,
        date: dateStr,
        type: "présence",
        segments: [
          { 
            // Plus besoin d'ID pour les segments
            start: startGuess || "", 
            end: endGuess || "", 
            commentaire: "", 
            aValider: false, 
            isExtra:false, 
            extraMontant:"", 
            paymentStatus:'à_payer', 
            paymentMethod:'', 
            paymentDate:'', 
            paymentNote:'' 
          }
        ],
        // La version n'est plus utilisée
      });
    }
    setModalOpen(true);
  };

  // Sauvegarde réelle (POST/PUT)
  const handleSave = useCallback(async (shift) => {
    try {
      // Vérification des privilèges administrateur pour certaines modifications
      const existingShift = shift.id ? shifts.find(s => s.id === shift.id) : null;
      const adminCheck = requiresAdminPrivileges(shift, existingShift);
      
      if (adminCheck.required && !isAdmin) {
        setNotification({
          type: 'warning',
          message: adminCheck.message + ' - Votre modification sera soumise à validation.',
          duration: 7000
        });
        
        // Pour les utilisateurs non-admin, marquer le shift comme "à valider"
        if (shift.segments) {
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
        // Vérifier si on passe d'absence à présence ou inversement
        const isTypeChange = existingShift && existingShift.type !== shift.type;
        
        if (isTypeChange) {
          console.log(`Changement de type détecté: ${existingShift.type} -> ${shift.type}`);
        }
        
        // Envoyer directement sans vérification de version
        const res = await axios.put(
          buildApiUrl(`/shifts/${shift.id}`),
          { ...shift },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Mise à jour de l'interface
        setShifts((prev) =>
          prev.map((s) => (s.id === shift.id ? res.data : s))
        );
        
        setModalOpen(false);
        setSelected(null);
        
        // Rafraîchir les données si changement de type important
        if (isTypeChange) {
          console.log("Rafraîchissement des données après changement de type");
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
        // Si le modal d'édition est ouvert, on peut utiliser son système d'erreurs
        // Cette partie sera traitée par ModalEditionShift
      } else {
        // Utiliser notre système de notification
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
      
      // Optimistic update - on suppose que la suppression a réussi même si le serveur n'a pas répondu
      setShifts((prev) => prev.filter((s) => s.id !== selected.id));
      setModalOpen(false);
      setSelected(null);
    } catch (err) {
      // Force la suppression locale même en cas d'erreur
      setShifts((prev) => prev.filter((s) => s.id !== selected.id));
      setModalOpen(false);
      setSelected(null);
      
      // Simple notification d'erreur sans bloquer l'interface
      console.warn('Note: Problème possible lors de la suppression du shift, mais il a été retiré de l\'interface:', err.response?.data || err.message);
      
      // En cas d'erreur critique, rafraîchir les données
      if (err.response?.status === 500 || err.response?.status === 409) {
        refreshShifts(true);
      }
    }
  };

  // === GESTION DES ANOMALIES ===
  
  // Fonction pour gérer le clic sur une anomalie (ouvre modale détaillée) - VERSION MISE À JOUR
  const handleAnomalieClick = useCallback(async (employeId, date, ecart) => {
    console.log('Clic sur anomalie:', { employeId, date, ecart });
    
    // Vérifier d'abord les privilèges pour l'accès aux détails d'anomalie
    const authorized = await validateAnomalieWithAdminCheck(employeId, date, ecart, 'view_details');
    if (!authorized && ['hors_plage', 'heures_sup', 'presence_non_prevue'].includes(ecart.type)) {
      // Pour les types critiques, limiter l'accès aux détails
      setNotification({
        type: 'info',
        message: 'Anomalie signalée. Un administrateur examinera cette situation.',
        duration: 5000
      });
      return;
    }
    
    try {
      // Si c'est déjà une vraie anomalie de base de données (avec ID numérique), l'utiliser directement
      if (ecart.id && typeof ecart.id === 'number') {
        // Vérifier si l'anomalie a déjà été traitée
        if (ecart.statut && ['validee', 'refusee', 'corrigee'].includes(ecart.statut)) {
          console.log('Anomalie déjà traitée:', ecart.statut);
          setNotification({
            type: 'info',
            message: `Cette anomalie a déjà été ${ecart.statut}`,
            duration: 3000
          });
          // Permettre tout de même d'ouvrir la modale pour voir les détails
        }
        setAnomalieSelectionnee(ecart);
        return;
      }
      
      // Vérification des données requises avant la synchronisation
      if (!employeId || !date || !ecart || !ecart.type) {
        throw new Error('Données incomplètes pour synchroniser l\'anomalie');
      }
      
      // Sinon, c'est un écart de comparaison - il faut d'abord le synchroniser en anomalie
      console.log('🔄 Synchronisation de l\'écart en anomalie...', { employeId, date, ecart });
      
      // Format de l'écart pour la synchronisation
      const ecartFormatted = {
        ...ecart,
        description: ecart.description || `Anomalie de type ${ecart.type}`,
        gravite: ecart.gravite || 'attention',
        requiresAdminValidation: !isAdmin && ['hors_plage', 'heures_sup', 'presence_non_prevue'].includes(ecart.type)
      };
      
      const result = await syncAnomaliesFromComparison(employeId, date, [ecartFormatted]);
      console.log('Résultat synchronisation:', result);
      
      if (result && result.success) {
        // Vérifier si des anomalies ont été créées ou mises à jour
        if (result.anomalies && result.anomalies.length > 0) {
          // Récupérer l'anomalie créée avec ses détails complets
          const anomalieComplete = {
            ...result.anomalies[0],
            employe: employes.find(e => e.id === employeId)
          };
          
          console.log('✅ Anomalie synchronisée:', anomalieComplete);
          setAnomalieSelectionnee(anomalieComplete);
        } else if (result.anomaliesCreees === 0) {
          // Aucune anomalie créée - peut-être qu'elle existe déjà ou que l'écart n'est pas significatif
          setNotification({
            type: 'info',
            message: 'Cette anomalie existe déjà ou n\'est pas significative'
          });
          return false;
        } else {
          // Anomalies créées mais pas retournées dans le résultat
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
      console.error('❌ Erreur lors de la synchronisation de l\'anomalie:', error);
      setNotification({
        type: 'error',
        message: `Erreur: ${error.message || 'Impossible de traiter cette anomalie'}`
      });
      // Retourner false pour indiquer l'échec
      return false;
    }
    
    // Retourner true pour indiquer le succès
    return true;
  }, [employes, setAnomalieSelectionnee, syncAnomaliesFromComparison, setNotification, isAdmin, validateAnomalieWithAdminCheck]);

  // Convertir l'anomalie en heures extra
  // eslint-disable-next-line no-unused-vars
  const handleConvertToExtra = useCallback(async (employeId, date, ecart) => {
    try {
      console.log("💼 Conversion en extra - données:", { employeId, date, ecart });
      
      // Utiliser directement les informations de l'écart au lieu de refaire une requête
      // L'écart contient déjà les informations nécessaires
      let startTime = "14:30"; // Valeur par défaut
      let endTime = "18:30";   // Valeur par défaut
      let duration = 4;        // Durée par défaut en heures
      
      // Si l'écart contient des informations de timing, les utiliser
      if (ecart.heureArrivee) {
        startTime = ecart.heureArrivee;
      }
      if (ecart.heureDepart) {
        endTime = ecart.heureDepart;
        // Calculer la durée basée sur les heures
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        duration = (endH * 60 + endM - startH * 60 - startM) / 60;
      }

      const newShift = {
        employeId: parseInt(employeId),
        date: date,
        type: "présence",
        segments: [{
          start: startTime,
          end: endTime,
          isExtra: true,
          extraMontant: "", // Laisser vide pour que l'admin le remplisse
          paymentStatus: 'à_payer',
          paymentDate: new Date().toISOString().split('T')[0], // Date d'aujourd'hui
          commentaire: `Converti depuis anomalie: ${ecart.description || ecart.motif || 'Pointage inattendu'}`
        }]
      };

      console.log("💼 Nouveau shift extra à créer:", newShift);
      await handleSave(newShift);
      
      // Recharger les shifts ET les comparaisons pour mettre à jour l'affichage
      await refreshShifts(true); // Mode silencieux
      await loadComparaisons();
      
      setNotification({
        type: "success",
        message: `✅ Anomalie convertie en heures extra (${duration.toFixed(1)}h) - Veuillez définir le montant`,
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

  // Supprimer le pointage erroné
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

      // Recharger les données
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

    // Action spéciale 'update' pour mettre à jour l'affichage local
    if (action === 'update') {
      console.log('[QuickAction] Mise à jour locale de l\'écart:', ecart);
      
      // Mettre à jour les comparaisons locales si l'écart provient d'une comparaison
      setComparaisons(prevComparaison => {
        if (!prevComparaison || !Array.isArray(prevComparaison)) return prevComparaison;
        
        return prevComparaison.map(comp => {
          if (comp.employeId === parseInt(employeId) && 
              normalizeDateLocal(comp.jour) === dateStr) {
            
            // Mettre à jour l'écart dans les anomalies de cette comparaison
            const updatedAnomalies = comp.anomalies?.map(a => 
              a.type === ecart.type ? { ...a, statut: ecart.statut } : a
            ) || [];
            
            return { ...comp, anomalies: updatedAnomalies };
          }
          return comp;
        });
      });
      
      // Notification de succès
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

  // Exécuter une action différée une fois les anomalies affichées
  useEffect(() => {
    if (pendingQuickActionRef.current) {
      const { employeId, dateStr, ecart, action } = pendingQuickActionRef.current;
      console.log('[QuickAction][Deferred] Exécution après chargement anomalies');
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
            
            {/* Barre de progression stylée */}
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
      <div className="min-h-screen bg-gray-50 py-1">
        {/* Système de notifications */}
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
                  {notification.type === 'success' ? '✨ Succès' : notification.type === 'error' ? '⚠️ Erreur' : '⚡ Attention'}
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

              {/* Actions principales */}
              <div className="flex items-center gap-2">
                {employes.length >= 15 && (
                  <button
                    onClick={() => { setForceReadable(v => !v); if (!forceReadable) setExpandedEmployees(new Set()); }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                      forceReadable 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    title={forceReadable ? 'Mode compact' : 'Mode lisible'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={forceReadable ? 'M4 6h16M4 12h16M4 18h7' : 'M4 8h16M4 16h16'} />
                    </svg>
                  </button>
                )}
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
        
        {/* Conteneur principal optimisé pour l'espace */}
        <div className="w-full max-w-[98%] mx-auto px-2 sm:px-3 lg:px-4">
          {/* En-tête amélioré (non sticky) */}
          <div className="rounded-b-md shadow-sm border border-gray-200/70 bg-white mb-3">
            <div className="h-1 bg-gradient-to-r from-[#cf292c] via-rose-500 to-orange-400" />
            <div className="px-2 sm:px-3 py-2 sm:py-3">
              <div className="flex flex-col gap-2 lg:gap-3">
                {/* Ligne principale - plus compacte */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="relative">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[#cf292c] to-red-700 flex items-center justify-center shadow-inner text-white">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                      </div>
                      <div className="leading-tight">
                        <h1 className="text-sm sm:text-base font-semibold text-gray-900 tracking-tight">Planning RH</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gray-100 text-[9px] sm:text-xs text-gray-600 font-medium">
                            {filteredEmployes.length} visible
                          </span>
                          {searchTerm && (
                            <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 text-[9px] sm:text-xs text-amber-700 font-medium">
                              filtre actif
                            </span>
                          )}
                          {showComparaison && (
                            <span className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-100 text-[9px] sm:text-xs text-blue-700 font-medium">
                              comparaison
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Navigation temporelle */}
                    <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-3 border-l border-gray-200">
                      <button
                        aria-label="Période précédente"
                        onClick={goPrev}
                        className="group rounded-md p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        aria-label="Période suivante"
                        onClick={goNext}
                        className="group rounded-md p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={goToday}
                        className="text-[11px] sm:text-xs md:text-sm font-medium px-2.5 py-1.5 rounded-md bg-white shadow-sm border border-gray-200 hover:border-[#cf292c] hover:text-[#cf292c] transition"
                      >
                        Aujourd'hui
                      </button>
                    </div>

                    {/* Période affichée */}
                    <div className="hidden md:flex items-center text-xs md:text-sm font-medium text-gray-700 bg-gray-50 rounded-md px-3 py-1.5 border border-gray-200">
                      {viewType === 'jour' && dateCourante.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      {viewType === 'semaine' && `${dates[0]?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${dates[6]?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      {viewType === 'mois' && dateCourante.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </div>
                  </div>

                  {/* Bouton menu mobile */}
                  <div className="flex items-center gap-2">
                    <div className="md:hidden text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                      {viewType === 'jour' && dateCourante.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      {viewType === 'semaine' && `${dates[0]?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${dates[6]?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                      {viewType === 'mois' && dateCourante.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
                    </div>
                    <button
                      aria-label="Ouvrir le menu"
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Ligne secondaire (desktop) */}
                <div className="hidden lg:flex items-center justify-between gap-4 pt-1">
                  {/* Sélecteur de vue */}
                  <div className="inline-flex rounded-lg bg-gray-100 p-1 border border-gray-200 shadow-inner">
                    {['jour','semaine','mois'].map(v => (
                      <button
                        key={v}
                        onClick={() => setViewType(v)}
                        className={`relative px-3.5 py-1.5 text-xs font-medium capitalize rounded-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cf292c]/40 ${
                          viewType === v
                            ? 'bg-white shadow-sm text-[#cf292c] ring-1 ring-[#cf292c]/30'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  {/* Recherche + Filtre catégorie + actions */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-48 xl:w-64">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Rechercher employé..."
                        className="w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] placeholder:text-gray-400"
                      />
                      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                      </svg>
                    </div>

                    {/* Filtre par catégorie */}
                    <div className="relative">
                      <select
                        value={categorieFilter}
                        onChange={e => setCategorieFilter(e.target.value)}
                        className="rounded-md border border-gray-200 bg-white px-3 py-2 pr-8 text-xs md:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] appearance-none"
                      >
                        <option value="tous">Toutes catégories</option>
                        <option value="Cuisine">👨‍🍳 Cuisine</option>
                        <option value="Service">🍽️ Service</option>
                        <option value="Administration">💼 Administration</option>
                        <option value="Technique">🔧 Technique</option>
                        <option value="Entretien">🧹 Entretien</option>
                        <option value="Sécurité">🛡️ Sécurité</option>
                        <option value="Général">👤 Général</option>
                      </select>
                      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <button
                      onClick={() => { setShowComparaison(!showComparaison); if (!showComparaison) loadComparaisons(); }}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs md:text-sm font-medium border transition ${showComparaison ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800'}`}
                      disabled={loadingComparaison}
                    >
                      {loadingComparaison ? '...' : 'Comparaison'}
                    </button>
                    {employes.length >= 15 && (
                      <button
                        onClick={() => { setForceReadable(v => !v); if (!forceReadable) setExpandedEmployees(new Set()); }}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs md:text-sm font-medium border transition ${forceReadable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800'}`}
                        title={forceReadable ? 'Revenir au mode compact' : 'Améliorer la lisibilité (désactiver le compact automatique)'}
                      >
                        {forceReadable ? 'Mode compact' : 'Mode lisible'}
                      </button>
                    )}
                    <button
                      onClick={() => setCreationRapideModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs md:text-sm font-medium text-white bg-gradient-to-r from-[#cf292c] to-red-600 hover:from-[#d93437] hover:to-red-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#cf292c]/50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      Nouveau
                    </button>
                  </div>
                </div>

                {/* Menu mobile déroulant */}
                <div className={`lg:hidden overflow-hidden transition-all duration-300 ${mobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'} space-y-3`}>                  
                  <div className="flex gap-2">
                    {['jour','semaine','mois'].map(v => (
                      <button
                        key={v}
                        onClick={() => setViewType(v)}
                        className={`flex-1 px-2.5 py-2 text-xs font-medium capitalize rounded-md border transition ${viewType === v ? 'bg-white border-[#cf292c] text-[#cf292c] shadow-sm' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                      >{v}</button>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Rechercher employé..."
                      className="w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] placeholder:text-gray-400"
                    />
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" /></svg>
                  </div>
                  
                  {/* Filtre par catégorie mobile */}
                  <div className="relative">
                    <select
                      value={categorieFilter}
                      onChange={e => setCategorieFilter(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 pr-8 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#cf292c]/30 focus:border-[#cf292c] appearance-none"
                    >
                      <option value="tous">Toutes catégories</option>
                      <option value="Cuisine">👨‍🍳 Cuisine</option>
                      <option value="Service">🍽️ Service</option>
                      <option value="Administration">💼 Administration</option>
                      <option value="Technique">🔧 Technique</option>
                      <option value="Entretien">🧹 Entretien</option>
                      <option value="Sécurité">🛡️ Sécurité</option>
                      <option value="Général">👤 Général</option>
                    </select>
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowComparaison(!showComparaison); if (!showComparaison) loadComparaisons(); }}
                      className={`flex-1 px-2.5 py-2 rounded-md text-xs font-medium border transition ${showComparaison ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      disabled={loadingComparaison}
                    >{loadingComparaison ? '...' : 'Comparaison'}</button>
                    {employes.length >= 15 && (
                      <button
                        onClick={() => { setForceReadable(v => !v); if (!forceReadable) setExpandedEmployees(new Set()); }}
                        className={`flex-1 px-2.5 py-2 rounded-md text-xs font-medium border transition ${forceReadable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >{forceReadable ? 'Compact' : 'Lisible'}</button>
                    )}
                    <button
                      onClick={() => setCreationRapideModalOpen(true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-medium text-white bg-[#cf292c] hover:bg-red-600 shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      Nouveau
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
            
            {/* Vue selon type - Planning principal optimisé */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {filteredEmployes.length === 0 ? (
                /* État vide - Aucun employé trouvé */
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.121m0 0A1 1 0 0116 15h-3a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1v4a1 1 0 01-1 1m-5 5v-2a3 3 0 00-3-3H8a3 3 0 00-3 3v2h8z" />
                    </svg>
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
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Effacer la recherche
                    </button>
                  ) : (
                    <button
                      onClick={() => setCreationRapideModalOpen(true)}
                      className="px-6 py-3 bg-[#cf292c] hover:bg-[#b31f22] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Ajouter un employé
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Vue desktop (masquée sur mobile) */}
                  <div className="hidden md:block">
                    <div className="overflow-x-auto p-1">
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
                        forceReadable={forceReadable}
                        skelloMode={skelloMode}
                        expandedEmployees={expandedEmployees}
                        onToggleExpand={(id)=> setExpandedEmployees(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                        onOpenRapport={setRapportEmployeId}
                        getCategorieEmploye={getCategorieEmploye}
                        employesGroupesParCategorie={employesGroupesParCategorie}
                        getAnomaliesForEmployeeDate={getAnomaliesForEmployeeDate}
                        handleAnomalieClick={handleAnomalieClick}
                        handleQuickAction={handleQuickAction}
                      />
                  )}
                </div>
              </div>
              
              {/* Vue mobile (masquée sur desktop) */}
              <div className="md:hidden p-2">
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
            </div>            {modalOpen && selected && (
              <ModalEditionShift
                employe={employes.find(e => e.id === selected.employeId)}
                shift={selected}
                onSave={handleSave}
                onDelete={handleDelete}
                onClose={() => setModalOpen(false)}
                token={localStorage.getItem("token")} // Récupérer le token directement au moment du passage
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
                        console.log("Création rapide terminée - Rechargement des plannings...");
                        // Attendre un court instant pour s'assurer que la base de données a été mise à jour
                        setTimeout(async () => {
                          const success = await refreshShifts();
                          console.log("Rechargement terminé:", success ? "OK" : "ÉCHEC");
                          if (success) {
                            console.log("Nouveaux shifts:", shifts.length);
                            
                            // Navigation vers la date de la première création si disponible
                            if (datePremiereCreation) {
                              console.log("Navigation vers la date:", datePremiereCreation);
                              // Conversion de la date au format YYYY-MM-DD vers un objet Date
                              try {
                                let dateObj;
                                // S'assurer que la date est bien formatée
                                if (typeof datePremiereCreation === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(datePremiereCreation)) {
                                  // Format YYYY-MM-DD
                                  const [year, month, day] = datePremiereCreation.split('-').map(Number);
                                  dateObj = new Date(year, month - 1, day);
                                } else {
                                  dateObj = new Date(datePremiereCreation);
                                }
                                
                                if (!isNaN(dateObj.getTime())) {
                                  console.log("Navigation vers date valide:", dateObj);
                                  // Utiliser setTimeout pour s'assurer que l'état est mis à jour après que tous les shifts sont chargés
                                  setTimeout(() => {
                                    setDateCourante(dateObj);
                                    // S'assurer que les dates sont mises à jour pour la nouvelle date courante
                                    if (viewType === "jour") setDates(getJour(dateObj));
                                    else if (viewType === "semaine") setDates(getSemaine(dateObj));
                                    else setDates(getMois(dateObj));
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
      
      {/* Rapport d'heures employé */}
      {rapportEmployeId && (
        <RapportHeuresEmploye
          employeId={rapportEmployeId}
          onClose={() => setRapportEmployeId(null)}
        />
      )}

      {/* Panneau d'administration des anomalies */}
      {showAdminPanel && isAdmin && (
        <AdminAnomaliesPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          dates={dates}
          employes={employes}
          formatEmployeeName={formatEmployeeName}
          onRefresh={async () => {
            // Refresh intelligent : seulement ce qui est nécessaire
            const refreshPromises = [];
            
            console.log('🔄 Refresh intelligent après traitement anomalie...');
            
            // 1. Recharger anomalies (toujours actif avec le nouveau système)
            console.log('📋 Rechargement anomalies...');
            refreshPromises.push(loadAnomaliesPeriode());
            
            // 2. Attendre les anomalies puis recharger comparaisons
            try {
              await Promise.all(refreshPromises);
              
              if (showComparaison) {
                console.log('📊 Rechargement comparaisons après anomalies...');
                await loadComparaisons();
              }
              
              console.log('✅ Refresh intelligent terminé');
            } catch (error) {
              console.warn('⚠️ Erreur refresh intelligent:', error);
              // Fallback : refresh minimal
              if (showComparaison) {
                loadComparaisons();
              }
            }
          }}
        />
      )}

      {/* Modal pour traiter les anomalies */}
      {anomalieSelectionnee && (
        <ModalTraiterAnomalie
          anomalie={anomalieSelectionnee}
          isOpen={!!anomalieSelectionnee}
          onClose={() => setAnomalieSelectionnee(null)}
          onTraited={(anomalieMAJ) => {
            // Mettre à jour le statut localement pour synchroniser avec le planning
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
              console.log('🔄 Synchronisation planning après traitement anomalie:', anomalieMAJ.id);
            }
            
            // Refresh pour être sûr
            refreshShifts(true);
            loadAnomaliesPeriode(); // Toujours recharger les anomalies avec le nouveau système
            if (showComparaison) {
              console.log('🔄 Rechargement comparaisons après traitement anomalie');
              loadComparaisons(); // Recharger les comparaisons pour avoir les statuts à jour
            }
            
            // Second refresh après délai pour s'assurer que tout est synchronisé
            setTimeout(() => {
              console.log('🔄 Second refresh après traitement anomalie');
              if (showComparaison) loadComparaisons();
              setUpdateTrigger(prev => prev + 1);
            }, 1000);
          }}
        />
      )}

      {/* Panneau de debug (seulement en développement) */}
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
