import React, { useEffect, useState, useMemo, useContext } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Clock, History, Timer, ArrowRight, QrCode, Scan, CheckCircle2 } from 'lucide-react';
import BottomNav from "../components/BottomNav";
import { ThemeContext } from '../context/ThemeContext';


const Pointage = () => {
  const [heureActuelle, setHeureActuelle] = useState(new Date());
  const { theme } = useContext(ThemeContext); // eslint-disable-line no-unused-vars
  const [historique, setHistorique] = useState([]);
  const [totalHeures, setTotalHeures] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [plannedShift, setPlannedShift] = useState(null);

  const token = localStorage.getItem('token');

  // Historique trié chronologiquement (plus ancien en premier)
  const sortedHistorique = useMemo(() => {
    if (!historique || historique.length === 0) return [];
    
    // Trier par horodatage croissant (plus ancien en premier)
    const sorted = [...historique].sort((a, b) => {
      const dateA = new Date(a.horodatage);
      const dateB = new Date(b.horodatage);
      return dateA - dateB;
    });
    
  // Log debug minimal (désactiver en prod)
  // console.log('Tri pointages OK', sorted.length);
    
    return sorted;
  }, [historique]);

  useEffect(() => {
  // console.log('Token présent ?', !!token);
    
    const fetchHistorique = async () => {
      try {
        // Utiliser l'endpoint principal qui fonctionne
        const res = await axios.get('http://localhost:5000/pointage/mes-pointages', {
          headers: { Authorization: `Bearer ${token}` }
        });
  // console.log('Pointages bruts reçus:', res.data?.length || 0);
        
        // Filtrer pour aujourd'hui côté frontend si nécessaire
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        
        const pointagesAujourdhui = res.data.filter(p => {
          const pointageDate = new Date(p.horodatage);
          const pointageDateStr = pointageDate.toISOString().split('T')[0];
          return pointageDateStr === todayStr;
        });
        
  // console.log('Pointages aujourd\'hui:', pointagesAujourdhui.length);
        setHistorique(pointagesAujourdhui);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'historique:', err);
        console.error('Status:', err.response?.status);
        console.error('Data:', err.response?.data);
        setHistorique([]);
      }
    };

    const fetchTotalHeures = async () => {
      try {
        const res = await axios.get('http://localhost:5000/pointage/total-aujourdhui', {
          headers: { Authorization: `Bearer ${token}` }
        });
  // console.log('Total heures (serveur):', res.data?.totalHeures);
        setTotalHeures(res.data.totalHeures || 0);
      } catch (err) {
        console.error('Erreur lors du chargement du total heures:', err);
        console.error('Status:', err.response?.status);
        console.error('Data:', err.response?.data);
        setTotalHeures(0);
      }
    };

    const fetchPlannedShift = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        console.log('🔍 DEBUG: Fetching planning employé pour la date:', today);
        
        const res = await axios.get(`http://localhost:5000/shifts/mes-shifts?start=${today}&end=${today}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('🔍 DEBUG: Réponse API mes-shifts:', res.data);
        console.log('🔍 DEBUG: Nombre de shifts reçus:', res.data?.length || 0);
        
        // Trouver le shift de l'utilisateur pour aujourd'hui (présence OU absence)
        const userShift = res.data.find(shift => {
          const shiftDate = new Date(shift.date).toISOString().split('T')[0];
          console.log('🔍 DEBUG: Shift trouvé - employeId:', shift.employeId, 'date:', shiftDate, 'type:', shift.type);
          return shiftDate === today; // Prendre tous les types de shifts
        });
        
        console.log('🔍 DEBUG: Shift utilisateur trouvé:', userShift);
        setPlannedShift(userShift);
      } catch (err) {
        console.error('Erreur lors du chargement du planning:', err);
        console.error('🔍 DEBUG: Détails erreur:', err.response?.status, err.response?.data);
        setPlannedShift(null);
      }
    };

    const interval = setInterval(() => setHeureActuelle(new Date()), 1000);
    fetchHistorique();
    fetchTotalHeures();
    fetchPlannedShift();
    return () => clearInterval(interval);
  }, [token]);

  // Format heures/minutes
  const heures = Math.floor(totalHeures);
  const minutes = Math.round((totalHeures - heures) * 60);
  const timeStr = `${heures.toString().padStart(2, '0')}h${minutes.toString().padStart(2, '0')}`;

  // Système de gestion des horaires complet
  const workingHoursSystem = useMemo(() => {
    // Déterminer le scénario de travail
    const getWorkingScenario = () => {
      // Cas 1: Shift d'absence planifiée
      if (plannedShift && plannedShift.type === 'absence') {
        return {
          type: 'absence_planifiee',
          title: 'Absence planifiée',
          icon: '🚫',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          motif: plannedShift.motif || 'Non spécifié'
        };
      }

      // Cas 2: Shift de présence planifié
      if (plannedShift && plannedShift.type === 'présence' && plannedShift.segments && plannedShift.segments.length > 0) {
        let totalMinutes = 0;
        const segmentDetails = [];

        plannedShift.segments.forEach(segment => {
          if (segment.start && segment.end) {
            const [startH, startM] = segment.start.split(':').map(Number);
            const [endH, endM] = segment.end.split(':').map(Number);
            
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            const duration = endMinutes - startMinutes;
            
            if (duration > 0) {
              totalMinutes += duration;
              segmentDetails.push({
                start: segment.start,
                end: segment.end,
                duration: duration / 60,
                isExtra: segment.isExtra || false,
                commentaire: segment.commentaire
              });
            }
          }
        });

        return {
          type: 'planifie',
          title: 'Selon planning',
          icon: '📅',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          total: totalMinutes / 60,
          segments: segmentDetails
        };
      }

      // Cas 3: Travail sans planning (extra/imprévu)
      if (!plannedShift && totalHeures > 0) {
        return {
          type: 'extra_non_planifie',
          title: 'Travail non planifié',
          icon: '⚡',
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          total: 7, // Objectif par défaut
          isExtra: true
        };
      }

      // Cas 4: Journée de repos/pas de planning
      if (!plannedShift && totalHeures === 0) {
        return {
          type: 'repos',
          title: 'Journée de repos',
          icon: '😴',
          color: 'text-gray-600 dark:text-slate-400',
          bgColor: 'bg-gray-50 dark:bg-slate-700/20',
          total: 0
        };
      }

      // Cas 5: Planning vide mais avec des heures (shift planifié sans segments)
      return {
        type: 'planifie_vide',
        title: 'Planning sans détail',
        icon: '📋',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        total: 7 // Objectif par défaut
      };
    };

    const scenario = getWorkingScenario();
    const target = scenario.total || 0;
    const percentJournee = target > 0 ? Math.min(Math.round((totalHeures / target) * 100), 100) : 0;
    
    // Couleur de progression adaptée au scénario
    let progressColor = 'bg-gray-300'; // Par défaut
    
    if (scenario.type === 'absence_planifiee') {
      progressColor = totalHeures > 0 ? 'bg-red-500' : 'bg-gray-300'; // Rouge si pointage malgré absence
    } else if (scenario.type === 'repos') {
      progressColor = totalHeures > 0 ? 'bg-orange-500' : 'bg-gray-300'; // Orange si travail un jour de repos
    } else if (scenario.type === 'extra_non_planifie') {
      progressColor = 'bg-orange-500'; // Orange pour le travail non planifié
    } else {
      // Progression normale pour travail planifié
      if (percentJournee >= 100) progressColor = 'bg-emerald-600';
      else if (percentJournee >= 85) progressColor = 'bg-green-500';
      else if (percentJournee >= 50) progressColor = 'bg-blue-500';
      else progressColor = 'bg-amber-500';
    }

    // Messages contextuels adaptés
    let statusMessage = '';
    let statusColor = scenario.color;
    
    switch (scenario.type) {
      case 'absence_planifiee':
        if (totalHeures > 0 || sortedHistorique.length > 0) {
          statusMessage = `Absence avec pointage détecté`;
          statusColor = 'text-red-600 dark:text-red-400';
        } else {
          statusMessage = `Absence planifiée: ${scenario.motif}`;
          statusColor = 'text-gray-600 dark:text-slate-400';
        }
        break;
        
      case 'planifie':
        if (totalHeures === 0) {
          statusMessage = 'Service pas encore commencé';
        } else if (percentJournee < 50) {
          statusMessage = 'Service en cours selon planning';
        } else if (percentJournee < 100) {
          statusMessage = 'Bientôt fini selon planning';
        } else {
          statusMessage = 'Objectif planning atteint';
          statusColor = 'text-green-600 dark:text-green-400';
        }
        break;
        
      case 'extra_non_planifie':
        statusMessage = 'Travail en cours (non planifié)';
        statusColor = 'text-orange-600 dark:text-orange-400';
        break;
        
      case 'repos':
        if (totalHeures > 0) {
          statusMessage = 'Travail sur jour de repos';
          statusColor = 'text-orange-600 dark:text-orange-400';
        } else {
          statusMessage = 'Journée de repos';
        }
        break;
        
      case 'planifie_vide':
        statusMessage = 'Planning prévu sans détail horaire';
        break;
        
      default:
        statusMessage = 'Statut indéterminé';
    }

    // Écart avec le planning
    const variance = totalHeures - target;

    return {
      scenario,
      target,
      percentJournee,
      progressColor,
      statusMessage,
      statusColor,
      variance,
      isOverTarget: variance > 0.25,
      isUnderTarget: variance < -0.25,
      isAnomalous: (scenario.type === 'absence_planifiee' && (totalHeures > 0 || sortedHistorique.length > 0)) || 
                   (scenario.type === 'repos' && (totalHeures > 0 || sortedHistorique.length > 0))
    };
  }, [totalHeures, plannedShift, sortedHistorique.length]);

  // Première / Dernière heure
  const firstTime = sortedHistorique.length ? format(new Date(sortedHistorique[0]?.horodatage), 'HH:mm') : null;
  const lastTime = sortedHistorique.length > 1 ? format(new Date(sortedHistorique[sortedHistorique.length - 1]?.horodatage), 'HH:mm') : null;

  // Historique enrichi avec timeline et durées de session
  const timelineData = useMemo(() => {
    if (!sortedHistorique.length) return [];
    
    let lastArrivee = null;
    const now = new Date();
    
    return sortedHistorique.map((entry, idx) => {
      const dateObj = new Date(entry.horodatage);
      const isArrivee = entry.type === 'arrivee';
      let sessionDuration = null;
      let isOngoing = false;
      
      if (isArrivee) {
        lastArrivee = dateObj;
        // Si c'est la dernière entrée et c'est une arrivée, la session est en cours
        if (idx === sortedHistorique.length - 1) {
          const diffMinutes = Math.floor((now - dateObj) / 60000);
          const h = Math.floor(diffMinutes / 60);
          const m = (diffMinutes % 60).toString().padStart(2, '0');
          sessionDuration = `${h}h${m}`;
          isOngoing = true;
        }
      } else if (!isArrivee && lastArrivee) {
        // C'est un départ, calculer la durée depuis la dernière arrivée
        const diffMinutes = Math.floor((dateObj - lastArrivee) / 60000);
        const h = Math.floor(diffMinutes / 60);
        const m = (diffMinutes % 60).toString().padStart(2, '0');
        sessionDuration = `${h}h${m}`;
        lastArrivee = null;
      }
      
      return {
        ...entry,
        dateObj,
        isArrivee,
        timeStr: format(dateObj, 'HH:mm'),
        sessionDuration,
        isOngoing,
        isLast: idx === sortedHistorique.length - 1,
        isFirst: idx === 0
      };
    });
  }, [sortedHistorique]);


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-24 lg:pb-8 pt-4 lg:pt-20 transition-colors">
      <div className="max-w-4xl lg:max-w-6xl mx-auto px-4 lg:px-8 space-y-6">
        {/* SECTION ACTION / HORLOGE */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 lg:p-6 shadow-sm w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-lg bg-[#cf292c]/10 dark:bg-[#cf292c]/15 flex items-center justify-center">
                <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-[#cf292c]" />
              </div>
              <div>
                <h1 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white leading-tight">Pointage</h1>
                <p className="text-xs lg:text-sm text-gray-500 dark:text-slate-400">{format(heureActuelle, 'dd MMMM yyyy', { locale: undefined })}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xl lg:text-2xl font-bold text-[#cf292c] leading-none">{format(heureActuelle,'HH:mm:ss')}</div>
              <div className="flex items-center gap-1 justify-end mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#cf292c] animate-pulse" />
                <span className="text-[10px] lg:text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">Live</span>
              </div>
            </div>
          </div>
          {/* Étapes visuelles */}
          <div className="mt-5 flex items-center justify-center gap-3 text-[11px] lg:text-xs font-medium text-gray-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 lg:w-7 lg:h-7 rounded-md bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <QrCode className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#cf292c]" />
              </span>
              <span>QR</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-400" />
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 lg:w-7 lg:h-7 rounded-md bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <Scan className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#cf292c]" />
              </span>
              <span>Scan</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-400" />
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 lg:w-7 lg:h-7 rounded-md bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-500" />
              </span>
              <span>OK</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] lg:text-xs text-gray-600 dark:text-slate-400 leading-relaxed text-center bg-gray-100/70 dark:bg-slate-700/40 rounded-md px-3 py-2">
            Ouvrez le QR via la barre du bas puis scannez-le sur la tablette pour enregistrer votre arrivée ou départ.
          </div>
        </div>

        {/* TEMPS TRAVAILLÉ - GESTION COMPLETE DES SCENARIOS */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 lg:p-6 shadow-sm w-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-lg bg-[#cf292c]/10 dark:bg-[#cf292c]/15 flex items-center justify-center">
                <Timer className="w-5 h-5 lg:w-6 lg:h-6 text-[#cf292c]" />
              </div>
              <div>
                <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Temps travaillé</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs">{workingHoursSystem.scenario.icon}</span>
                  <span className={`text-xs font-medium ${workingHoursSystem.scenario.color}`}>
                    {workingHoursSystem.scenario.title}
                  </span>
                  {workingHoursSystem.isAnomalous && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs font-medium">
                      Anomalie
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right leading-tight">
              <div className="font-mono text-lg lg:text-xl font-bold text-gray-900 dark:text-white">{timeStr}</div>
              <span className="text-[11px] lg:text-sm text-gray-500 dark:text-slate-400">
                {workingHoursSystem.scenario.type === 'repos' ? 'Repos' : 
                 workingHoursSystem.scenario.type === 'absence_planifiee' ? 'Absence' :
                 `Objectif ${workingHoursSystem.target.toFixed(1)}h`}
              </span>
            </div>
          </div>

          {/* Scénarios spécifiques */}
          
          {/* ABSENCE PLANIFIEE */}
          {workingHoursSystem.scenario.type === 'absence_planifiee' && (
            <div className={`mb-3 p-3 ${workingHoursSystem.scenario.bgColor} rounded-lg border border-red-200 dark:border-red-800`}>
              <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">
                🚫 Absence planifiée - Motif: {workingHoursSystem.scenario.motif}
              </div>
              {(totalHeures > 0 || sortedHistorique.length > 0) && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  ⚠️ Pointages détectés malgré l'absence planifiée
                </div>
              )}
            </div>
          )}

          {/* PLANNING AVEC SEGMENTS */}
          {workingHoursSystem.scenario.type === 'planifie' && workingHoursSystem.scenario.segments.length > 0 && (
            <div className={`mb-3 p-3 ${workingHoursSystem.scenario.bgColor} rounded-lg border border-blue-200 dark:border-blue-800`}>
              <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Planning prévu :</div>
              <div className="flex flex-wrap gap-1">
                {workingHoursSystem.scenario.segments.map((seg, idx) => (
                  <span key={idx} className={`px-2 py-1 rounded text-xs font-medium ${
                    seg.isExtra 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}>
                    {seg.start}–{seg.end}
                    {seg.isExtra && ' (Extra)'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TRAVAIL NON PLANIFIE */}
          {workingHoursSystem.scenario.type === 'extra_non_planifie' && (
            <div className={`mb-3 p-3 ${workingHoursSystem.scenario.bgColor} rounded-lg border border-orange-200 dark:border-orange-800`}>
              <div className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-2">
                ⚡ Travail non planifié détecté
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400">
                Ce travail sera comptabilisé comme heures supplémentaires
              </div>
            </div>
          )}

          {/* REPOS AVEC TRAVAIL */}
          {workingHoursSystem.scenario.type === 'repos' && totalHeures > 0 && (
            <div className={`mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800`}>
              <div className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-2">
                ⚡ Travail détecté sur jour de repos
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400">
                Toutes les heures seront comptées comme extra
              </div>
            </div>
          )}

          {/* Statut du service */}
          <div className={`text-center text-sm font-medium mb-3 ${workingHoursSystem.statusColor}`}>
            {workingHoursSystem.statusMessage}
            {workingHoursSystem.isOverTarget && workingHoursSystem.scenario.type !== 'extra_non_planifie' && (
              <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded-full text-xs">
                +{(workingHoursSystem.variance).toFixed(1)}h
              </span>
            )}
            {workingHoursSystem.isUnderTarget && workingHoursSystem.scenario.type === 'planifie' && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs">
                -{Math.abs(workingHoursSystem.variance).toFixed(1)}h
              </span>
            )}
          </div>

          {/* Barre de progression adaptée */}
          {workingHoursSystem.target > 0 && (
            <div className="h-2 lg:h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${workingHoursSystem.progressColor} transition-all duration-500`} 
                style={{ width: `${Math.min(workingHoursSystem.percentJournee, 100)}%` }} 
              />
            </div>
          )}
          
          {workingHoursSystem.target > 0 && (
            <div className="flex justify-between text-[10px] lg:text-xs mt-2 text-gray-500 dark:text-slate-400">
              <span>0h</span>
              <span>
                {workingHoursSystem.scenario.type === 'extra_non_planifie' ? 
                  `${timeStr} (Extra)` : 
                  `${workingHoursSystem.percentJournee}%`
                }
              </span>
              <span>{workingHoursSystem.target.toFixed(1)}h</span>
            </div>
          )}

          {/* Journée de repos complète */}
          {workingHoursSystem.scenario.type === 'repos' && totalHeures === 0 && (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">😴</div>
              <div className="text-sm font-medium text-gray-600 dark:text-slate-400">
                Profitez bien de votre repos !
              </div>
            </div>
          )}

          <button
            onClick={() => setShowDetails(v => !v)}
            className="mt-4 w-full text-xs lg:text-sm font-medium text-[#cf292c] hover:underline flex items-center justify-center gap-1"
          >
            {showDetails ? 'Masquer détails' : 'Voir détails'}
          </button>

          {showDetails && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] lg:text-xs">
              <div className="p-2 lg:p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                <p className="text-gray-500 dark:text-slate-400">Premier</p>
                <p className="font-mono text-sm lg:text-base font-semibold text-green-600 dark:text-green-400">{firstTime || '--'}</p>
              </div>
              <div className="p-2 lg:p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                <p className="text-gray-500 dark:text-slate-400">Dernier</p>
                <p className="font-mono text-sm lg:text-base font-semibold text-blue-600 dark:text-blue-400">{lastTime || '--'}</p>
              </div>
              <div className="p-2 lg:p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                <p className="text-gray-500 dark:text-slate-400">
                  {workingHoursSystem.scenario.type === 'extra_non_planifie' ? 'Tout extra' :
                   workingHoursSystem.scenario.type === 'repos' && totalHeures > 0 ? 'Tout extra' :
                   workingHoursSystem.scenario.type === 'absence_planifiee' ? 'Inattendu' :
                   'Écart planning'}
                </p>
                <p className={`font-mono text-sm lg:text-base font-semibold ${
                  workingHoursSystem.scenario.type === 'extra_non_planifie' || 
                  (workingHoursSystem.scenario.type === 'repos' && totalHeures > 0) ?
                    'text-orange-600 dark:text-orange-400' :
                  workingHoursSystem.scenario.type === 'absence_planifiee' && totalHeures > 0 ?
                    'text-red-600 dark:text-red-400' :
                  workingHoursSystem.variance > 0.25 ? 'text-orange-600 dark:text-orange-400' :
                  workingHoursSystem.variance < -0.25 ? 'text-blue-600 dark:text-blue-400' :
                  'text-green-600 dark:text-green-400'
                }`}>
                  {workingHoursSystem.scenario.type === 'extra_non_planifie' || 
                   (workingHoursSystem.scenario.type === 'repos' && totalHeures > 0) ? 
                    `+${totalHeures.toFixed(1)}h` :
                   workingHoursSystem.scenario.type === 'absence_planifiee' && totalHeures > 0 ?
                    `${totalHeures.toFixed(1)}h` :
                   workingHoursSystem.target > 0 ?
                    `${workingHoursSystem.variance >= 0 ? '+' : ''}${workingHoursSystem.variance.toFixed(1)}h` :
                    '--'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

          {/* HISTORIQUE COMPACT */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 lg:p-6 shadow-sm w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-lg bg-[#cf292c]/10 dark:bg-[#cf292c]/15 flex items-center justify-center">
                <History className="w-5 h-5 lg:w-6 lg:h-6 text-[#cf292c]" />
              </div>
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Timeline</h3>
            </div>
            <span className="text-xs lg:text-sm text-gray-500 dark:text-slate-400">{sortedHistorique.length} entrées</span>
          </div>

          {timelineData.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <Clock className="w-8 h-8 text-gray-400 dark:text-slate-500" />
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Aucun pointage aujourd'hui</p>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Votre timeline apparaîtra ici</p>
            </div>
          )}

          {timelineData.length > 0 && (
            <div className="relative">
              {/* Timeline principale */}
              <div className="space-y-1 max-h-80 lg:max-h-96 overflow-y-auto pr-2">
                {timelineData.map((entry, idx) => (
                  <div key={idx} className="relative flex items-start">
                    {/* Timeline verticale */}
                    <div className="flex flex-col items-center mr-4">
                      {/* Point de la timeline */}
                      <div className={`relative z-10 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        entry.isArrivee 
                          ? 'bg-green-500 border-green-600 shadow-lg shadow-green-500/30' 
                          : 'bg-red-500 border-red-600 shadow-lg shadow-red-500/30'
                      } ${
                        entry.isLast ? 'animate-pulse ring-2 ring-[#cf292c]/30' : ''
                      }`}>
                        {entry.isOngoing && (
                          <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping"></div>
                        )}
                      </div>
                      
                      {/* Ligne de connexion */}
                      {!entry.isLast && (
                        <div className="w-px h-12 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-slate-600 dark:to-slate-700 mt-1"></div>
                      )}
                    </div>

                    {/* Contenu de l'entrée */}
                    <div className={`flex-1 pb-6 ${entry.isLast ? 'pb-0' : ''}`}>
                      <div className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                        entry.isLast 
                          ? 'bg-gradient-to-r from-[#cf292c]/5 to-transparent border-[#cf292c]/20 shadow-sm' 
                          : 'bg-gray-50/80 dark:bg-slate-700/40 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600/60'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                              {entry.timeStr}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              entry.isArrivee
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              {entry.isArrivee ? 'Arrivée' : 'Départ'}
                            </span>
                          </div>
                          {entry.isLast && (
                            <span className="px-2 py-1 bg-[#cf292c]/10 text-[#cf292c] text-xs font-medium rounded-full">
                              Actuel
                            </span>
                          )}
                        </div>

                        {/* Durée de session */}
                        {entry.sessionDuration && (
                          <div className="flex items-center gap-2 mt-2">
                            <Timer className="w-4 h-4 text-blue-500" />
                            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                              entry.isOngoing 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-slate-600/50 dark:text-slate-300'
                            }`}>
                              {entry.isOngoing ? `En cours depuis ${entry.sessionDuration}` : `Session de ${entry.sessionDuration}`}
                            </span>
                            {entry.isOngoing && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BottomNav - en dehors de la grille pour éviter les conflits */}
      <BottomNav />
    </div>
  );
};

export default Pointage;