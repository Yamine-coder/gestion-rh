import React, { useEffect, useState, useMemo, useContext, useCallback } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Clock, History, Timer, ArrowRight, QrCode, Scan, CheckCircle2, AlertTriangle, ChevronRight, CheckCircle, Calendar, TrendingUp, TrendingDown, Minus, Zap, Coffee, Bell, Activity, ChevronDown, LogIn, LogOut, Moon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import BottomNav from "../components/BottomNav";
import { ThemeContext } from '../context/ThemeContext';
import useNotificationHighlight from '../hooks/useNotificationHighlight';
import { toLocalDateString, parseLocalDate } from '../utils/parisTimeUtils';


const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Pointage = () => {
  const location = useLocation();
  const [heureActuelle, setHeureActuelle] = useState(new Date());
  const { theme } = useContext(ThemeContext); // eslint-disable-line no-unused-vars
  const [historique, setHistorique] = useState([]);
  const [totalHeures, setTotalHeures] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [plannedShift, setPlannedShift] = useState(null);
  
  // Hooks pour le highlight des sections depuis les notifications
  const { isHighlighted: isHistoriqueHighlighted } = useNotificationHighlight('historique-pointages');
  const { isHighlighted: isAnomaliesHighlighted } = useNotificationHighlight('anomalies-section');
  const { isHighlighted: isPointageActionsHighlighted } = useNotificationHighlight('pointage-actions');
  const { isHighlighted: isHeuresHighlighted } = useNotificationHighlight('heures-section');
  
  // État pour les anomalies officielles
  const [mesAnomalies, setMesAnomalies] = useState([]);
  const [anomaliesLoading, setAnomaliesLoading] = useState(true);
  
  // État pour le rappel de pointage
  const [rappelPointage, setRappelPointage] = useState(null);

  const token = localStorage.getItem('token');

  // État pour stocker le jour de travail effectif (déterminé par le shift le plus proche)
  const [effectiveWorkDay, setEffectiveWorkDay] = useState(null);

  /**
   * 🎯 LOGIQUE STANDARD SIRH : Déterminer la journée de travail
   * 
   * La journée de travail est déterminée par le SHIFT, pas par l'heure.
   * Un shift du 17/12 qui commence à 3h30 = journée de travail du 17/12
   * Un shift du 16/12 qui finit à 2h00 le 17/12 = journée de travail du 16/12
   */
  const workDayInfo = useMemo(() => {
    const now = heureActuelle;
    const hour = now.getHours();
    
    // Si on a détecté un shift, utiliser sa date comme journée de travail
    if (effectiveWorkDay) {
      return {
        date: parseLocalDate(effectiveWorkDay),
        isNightShift: hour < 6 || hour >= 22,
        displayLabel: (hour < 6 || hour >= 22) ? 'Service de nuit' : 'Journée de travail'
      };
    }
    
    // Fallback : utiliser la date actuelle (avant détection du shift)
    return {
      date: new Date(now),
      isNightShift: hour < 6 || hour >= 22,
      displayLabel: (hour < 6 || hour >= 22) ? 'Service de nuit' : 'Journée de travail'
    };
  }, [heureActuelle, effectiveWorkDay]);

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

  // Scroll automatique vers la section highlightée depuis notification
  useEffect(() => {
    if (location.state?.fromNotification && location.state?.highlightSection) {
      const sectionId = location.state.highlightSection;
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [location.state]);

  useEffect(() => {
  // console.log('Token présent ?', !!token);
    
    // Fonction utilitaire pour calculer la journée de travail (06h-06h)
    const getWorkDay = (date) => {
      const d = new Date(date);
      const hour = d.getHours();
      // Si avant 6h du matin, c'est encore la journée de travail de la veille
      if (hour < 6) {
        d.setDate(d.getDate() - 1);
      }
      return toLocalDateString(d); // Utilise l'utilitaire centralisé
    };

    const fetchHistorique = async (workDayFilter = null) => {
      try {
        // Utiliser l'endpoint principal qui fonctionne
        const res = await axios.get(`${API_BASE}/pointage/mes-pointages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // 🎯 LOGIQUE SIRH : Si on a un jour de travail effectif, l'utiliser
        // Sinon, utiliser la date calendaire du pointage
        const now = new Date();
        const todayStr = toLocalDateString(now);
        const yesterdayStr = toLocalDateString(new Date(now.getTime() - 24*60*60*1000));
        
        // Filtrer les pointages de J et J-1 (pour couvrir les shifts de nuit)
        const pointagesJournee = res.data.filter(p => {
          const pointageDate = new Date(p.horodatage);
          const pointageDateStr = toLocalDateString(pointageDate);
          
          // Si on a un workDayFilter (effectiveWorkDay), filtrer dessus
          if (workDayFilter) {
            return pointageDateStr === workDayFilter;
          }
          
          // Sinon, prendre les pointages d'aujourd'hui et d'hier
          return pointageDateStr === todayStr || pointageDateStr === yesterdayStr;
        });
        
        console.log('📅 [SIRH] Pointages filtrés - workDay:', workDayFilter || 'auto', '- trouvés:', pointagesJournee.length);
        setHistorique(pointagesJournee);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'historique:', err);
        console.error('Status:', err.response?.status);
        console.error('Data:', err.response?.data);
        setHistorique([]);
      }
    };

    const fetchTotalHeures = async () => {
      try {
        const res = await axios.get(`${API_BASE}/pointage/total-aujourdhui`, {
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

    /**
     * 🎯 LOGIQUE STANDARD SIRH : Trouver le shift le plus pertinent
     * 
     * 1. Récupérer les shifts de J et J-1
     * 2. Pour chaque shift, calculer l'écart avec l'heure actuelle
     * 3. Retourner le shift avec le plus petit écart (max 4h de tolérance)
     */
    const fetchPlannedShift = async () => {
      try {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const today = toLocalDateString(now);
        
        // Calculer hier
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toLocalDateString(yesterday);
        
        console.log('🎯 [SIRH] Recherche shift - maintenant:', currentHour + 'h', '- aujourd\'hui:', today, '- hier:', yesterdayStr);
        
        // Récupérer les shifts de J et J-1
        const [resToday, resYesterday] = await Promise.all([
          axios.get(`${API_BASE}/shifts/mes-shifts?start=${today}&end=${today}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_BASE}/shifts/mes-shifts?start=${yesterdayStr}&end=${yesterdayStr}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        const shiftsToday = resToday.data.filter(s => toLocalDateString(s.date) === today);
        const shiftsYesterday = resYesterday.data.filter(s => toLocalDateString(s.date) === yesterdayStr);
        
        console.log('🎯 [SIRH] Shifts aujourd\'hui:', shiftsToday.length, '- hier:', shiftsYesterday.length);
        
        // Fonction pour calculer l'écart en minutes entre l'heure actuelle et le début du shift
        const getShiftStartMinutes = (shift) => {
          const segments = Array.isArray(shift.segments) ? shift.segments : [];
          const workSegment = segments.find(s => s.type?.toLowerCase() !== 'pause' && !s.isExtra);
          if (!workSegment) return null;
          
          const startTime = workSegment.start || workSegment.debut;
          if (!startTime) return null;
          
          const [h, m] = startTime.split(':').map(Number);
          return h * 60 + m;
        };
        
        // Calculer le meilleur shift
        let bestShift = null;
        let bestDistance = Infinity;
        let bestWorkDay = today;
        
        // Vérifier les shifts d'aujourd'hui
        for (const shift of shiftsToday) {
          const shiftStart = getShiftStartMinutes(shift);
          if (shiftStart === null) continue;
          
          // Distance en minutes (gérer le passage minuit)
          let distance = Math.abs(currentMinutes - shiftStart);
          // Si le shift commence demain matin tôt, ajuster
          if (shiftStart < 360 && currentMinutes > 1200) { // shift avant 6h, on est après 20h
            distance = Math.abs(currentMinutes - (shiftStart + 1440)); // +24h
          }
          
          console.log(`  📋 Shift ${shift.id} (${today}): début ${shiftStart}min, distance ${distance}min`);
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestShift = shift;
            bestWorkDay = today;
          }
        }
        
        // Vérifier les shifts d'hier (pour les shifts de nuit qui débordent)
        for (const shift of shiftsYesterday) {
          const segments = Array.isArray(shift.segments) ? shift.segments : [];
          const workSegment = segments.find(s => s.type?.toLowerCase() !== 'pause' && !s.isExtra);
          if (!workSegment) continue;
          
          const endTime = workSegment.end || workSegment.fin;
          if (!endTime) continue;
          
          const [endH, endM] = endTime.split(':').map(Number);
          const endMinutes = endH * 60 + endM;
          
          // Si le shift d'hier finit après minuit (ex: 02:00 = 120min)
          // et qu'on est avant cette heure, c'est pertinent
          if (endMinutes < 360 && currentMinutes < endMinutes + 60) { // finit avant 6h, on est proche
            const shiftStart = getShiftStartMinutes(shift);
            // Calculer distance depuis le début du shift (hier soir)
            const distance = currentMinutes + (1440 - (shiftStart || 0)); // distance depuis hier
            
            console.log(`  📋 Shift ${shift.id} (${yesterdayStr}, nuit): fin ${endMinutes}min, distance ${distance}min`);
            
            if (distance < bestDistance && distance < 600) { // Max 10h de distance
              bestDistance = distance;
              bestShift = shift;
              bestWorkDay = yesterdayStr;
            }
          }
        }
        
        // Tolérance max : 4h (240 min) avant le début du shift
        if (bestShift && bestDistance > 240 && currentMinutes < getShiftStartMinutes(bestShift)) {
          console.log('🎯 [SIRH] Shift trop loin dans le futur, pas encore de shift actif');
          // Garder le shift pour l'affichage mais noter qu'il n'est pas encore actif
        }
        
        console.log('🎯 [SIRH] Meilleur shift:', bestShift?.id, '- Jour:', bestWorkDay, '- Distance:', bestDistance + 'min');
        
        setEffectiveWorkDay(bestWorkDay);
        setPlannedShift(bestShift);
      } catch (err) {
        console.error('Erreur lors du chargement du planning:', err);
        setPlannedShift(null);
      }
    };

    // Fetch des anomalies officielles pour la journée de travail
    // Note: Cette fonction sera re-appelée quand effectiveWorkDay change via un autre useEffect
    const fetchMesAnomalies = async (workDayOverride) => {
      try {
        // Utiliser le workDay passé en paramètre ou calculer
        let workDay = workDayOverride;
        if (!workDay) {
          const now = new Date();
          const workDayDate = new Date(now);
          if (now.getHours() < 6) {
            workDayDate.setDate(workDayDate.getDate() - 1);
          }
          workDay = toLocalDateString(workDayDate);
        }
        
        console.log('🔍 Fetch anomalies pour journée de travail:', workDay);
        
        const response = await fetch(`${API_BASE}/api/anomalies?dateDebut=${workDay}&dateFin=${workDay}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success) {
            // Filtrer pour n'avoir que les anomalies non-obsolètes ET du jour exact
            // (l'API élargit la recherche pour le timezone, on refiltre ici)
            const anomaliesActives = (data.anomalies || []).filter(a => {
              if (a.statut === 'obsolete') return false;
              // Vérifier que la date de l'anomalie correspond au jour demandé
              const anomalieDate = new Date(a.date).toISOString().slice(0, 10);
              return anomalieDate === workDay;
            });
            console.log(`📋 Anomalies filtrées pour ${workDay}:`, anomaliesActives.length);
            setMesAnomalies(anomaliesActives);
          }
        }
      } catch (err) {
        console.error('Erreur chargement anomalies:', err);
      } finally {
        setAnomaliesLoading(false);
      }
    };

    // Fetch du rappel de pointage
    const fetchRappelPointage = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/alertes/mon-statut`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.rappel) {
            setRappelPointage(data.rappel);
          } else {
            setRappelPointage(null);
          }
        }
      } catch (err) {
        console.error('Erreur chargement rappel:', err);
      }
    };

    const interval = setInterval(() => setHeureActuelle(new Date()), 1000);
    fetchHistorique();
    fetchTotalHeures();
    fetchPlannedShift();
    fetchMesAnomalies(); // Appel initial avec logique par défaut
    fetchRappelPointage();
    
    // Rafraîchir le rappel toutes les minutes
    const rappelInterval = setInterval(fetchRappelPointage, 60 * 1000);
    
    // 🔄 Polling léger des anomalies (60s) - temps réel gratuit
    const anomaliesPollingInterval = setInterval(() => fetchMesAnomalies(effectiveWorkDay), 60 * 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(rappelInterval);
      clearInterval(anomaliesPollingInterval);
    };
  }, [token]);

  // Re-fetch anomalies quand le jour de travail effectif est détecté
  useEffect(() => {
    if (effectiveWorkDay && token) {
      console.log('🔄 Re-fetch anomalies pour jour effectif:', effectiveWorkDay);
      setAnomaliesLoading(true);
      
      const fetchAnomaliesForWorkDay = async () => {
        try {
          const response = await fetch(`${API_BASE}/api/anomalies?dateDebut=${effectiveWorkDay}&dateFin=${effectiveWorkDay}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const userId = JSON.parse(atob(token.split('.')[1])).userId || JSON.parse(atob(token.split('.')[1])).id;
            const anomaliesActives = (data.anomalies || []).filter(a => 
              a.employe_id === userId && 
              ['pending', 'validated'].includes(a.status) &&
              toLocalDateString(a.date_anomalie) === effectiveWorkDay
            );
            console.log(`📋 Anomalies pour ${effectiveWorkDay}:`, anomaliesActives.length);
            setMesAnomalies(anomaliesActives);
          }
        } catch (err) {
          console.error('Erreur re-fetch anomalies:', err);
        } finally {
          setAnomaliesLoading(false);
        }
      };
      
      fetchAnomaliesForWorkDay();
    }
  }, [effectiveWorkDay, token]);

  // 🎯 SIRH : Re-fetch des pointages quand le jour de travail effectif est détecté
  useEffect(() => {
    if (effectiveWorkDay && token) {
      console.log('🔄 [SIRH] Re-fetch pointages pour jour effectif:', effectiveWorkDay);
      
      const fetchPointagesForWorkDay = async () => {
        try {
          const res = await axios.get(`${API_BASE}/pointage/mes-pointages`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Filtrer pour le jour de travail effectif
          const pointagesJournee = res.data.filter(p => {
            const pointageDate = new Date(p.horodatage);
            const pointageDateStr = toLocalDateString(pointageDate);
            return pointageDateStr === effectiveWorkDay;
          });
          
          console.log('📅 [SIRH] Pointages pour', effectiveWorkDay, ':', pointagesJournee.length);
          setHistorique(pointagesJournee);
        } catch (err) {
          console.error('Erreur re-fetch pointages:', err);
        }
      };
      
      fetchPointagesForWorkDay();
    }
  }, [effectiveWorkDay, token]);

  // Format heures/minutes
  const heures = Math.floor(totalHeures);
  const minutes = Math.round((totalHeures - heures) * 60);
  const timeStr = `${heures.toString().padStart(2, '0')}h${minutes.toString().padStart(2, '0')}`;

  // Helper: Formater une durée intelligemment (minutes si < 1h, heures sinon)
  const formatDuration = (hours, showSign = false) => {
    const absHours = Math.abs(hours);
    const sign = showSign ? (hours >= 0 ? '+' : '-') : (hours < 0 ? '-' : '');
    
    if (absHours < 1) {
      // Moins d'une heure: afficher en minutes
      const mins = Math.round(absHours * 60);
      return `${sign}${mins} min`;
    } else {
      // Une heure ou plus: afficher en heures avec 1 décimale
      return `${sign}${absHours.toFixed(1)}h`;
    }
  };

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

      // Cas 2: Shift de travail planifié - tout type SAUF absence, tant qu'il a des segments
      // Types supportés: présence, travail, nuit, matin, soir, journee, coupure, etc.
      const isWorkShift = plannedShift && 
                          plannedShift.type !== 'absence' && 
                          plannedShift.segments && 
                          plannedShift.segments.length > 0;
      
      if (isWorkShift) {
        let totalMinutes = 0;
        let totalMinutesExtra = 0; // Heures extra (espèces) - comptées séparément
        const segmentDetails = [];
        let latestEndMinutes = 0; // Pour trouver l'heure de fin du shift

        plannedShift.segments.forEach(segment => {
          // Ignorer les pauses - elles ne comptent pas comme temps de travail
          const segmentType = segment.type?.toLowerCase();
          if (segmentType === 'pause' || segmentType === 'break') {
            return; // Skip les pauses
          }
          
          // Support des deux formats: start/end (ancien) et debut/fin (nouveau)
          const segStart = segment.start || segment.debut;
          const segEnd = segment.end || segment.fin;
          
          if (segStart && segEnd) {
            const [startH, startM] = segStart.split(':').map(Number);
            const [endH, endM] = segEnd.split(':').map(Number);
            
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            let duration = endMinutes - startMinutes;
            // 🌙 RESTAURANT : Gérer les shifts de nuit
            if (duration < 0) duration += 24 * 60;
            
            // Trouver l'heure de fin la plus tardive
            if (endMinutes > latestEndMinutes) {
              latestEndMinutes = endMinutes;
            }
            
            if (duration > 0) {
              // 💰 Séparer heures officielles et heures extra (espèces)
              if (segment.isExtra) {
                totalMinutesExtra += duration;
              } else {
                totalMinutes += duration;
              }
              segmentDetails.push({
                start: segStart,
                end: segEnd,
                duration: duration / 60,
                isExtra: segment.isExtra || false,
                commentaire: segment.commentaire
              });
            }
          }
        });

        // Vérifier si le shift est terminé
        // Logique: Si l'heure de fin est entre 06:00 et 23:59 (shift de jour)
        // et l'heure actuelle est après l'heure de fin OU après minuit (00:00-05:59)
        // alors le shift est terminé
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        
        // Shift de jour typique (fin avant minuit)
        const isNightTime = nowMinutes < 6 * 60; // Entre 00:00 et 05:59
        const isShiftDayShift = latestEndMinutes >= 6 * 60 && latestEndMinutes <= 23 * 60; // Fin entre 06:00 et 23:00
        
        // Le shift est terminé si:
        // 1. On est après l'heure de fin (même jour)
        // 2. OU on est après minuit (00:00-05:59) et le shift finissait avant minuit
        const isShiftFinished = (nowMinutes > latestEndMinutes) || 
                                (isNightTime && isShiftDayShift) ||
                                latestEndMinutes === 0;

        // CAS SPÉCIAL: Shift 100% extra
        const isExtraOnly = totalMinutes === 0 && totalMinutesExtra > 0;
        
        if (isExtraOnly) {
          return {
            type: 'extra_only',
            title: 'Heures supplémentaires',
            icon: 'zap',
            color: 'text-amber-600 dark:text-amber-400',
            bgColor: 'bg-amber-50 dark:bg-amber-900/20',
            total: totalMinutesExtra / 60, // L'objectif = les heures extra prévues
            totalExtra: totalMinutesExtra / 60,
            segments: segmentDetails,
            isShiftFinished,
            shiftEndMinutes: latestEndMinutes
          };
        }

        return {
          type: 'planifie',
          title: 'Selon planning',
          icon: '📅',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          total: totalMinutes / 60, // Heures officielles uniquement
          totalExtra: totalMinutesExtra / 60, // Heures extra (espèces) - non comptées officiellement
          segments: segmentDetails,
          isShiftFinished, // Nouveau: indique si le shift est terminé
          shiftEndMinutes: latestEndMinutes // Pour debug
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
          total: 0, // Pas d'objectif si pas de planning prévu
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
    // NE PAS limiter à 100% pour permettre l'affichage des heures sup
    const percentJournee = target > 0 ? Math.round((totalHeures / target) * 100) : 0;
    
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
        if (scenario.isShiftFinished) {
          // Shift terminé
          if (percentJournee >= 100) {
            statusMessage = 'Journée terminée';
            statusColor = 'text-green-600 dark:text-green-400';
          } else {
            statusMessage = 'Journée terminée - heures manquantes';
            statusColor = 'text-red-500 dark:text-red-400';
          }
        } else {
          // Shift en cours
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

    // Écart avec le planning (sur heures officielles seulement)
    const variance = totalHeures - target;
    
    // Heures extra (espèces) - provient du calcul des segments
    const extraHours = scenario.totalExtra || 0;

    return {
      scenario,
      target,
      percentJournee,
      progressColor,
      statusMessage,
      statusColor,
      variance,
      extraHours, // Heures extra non officielles
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
      // Support des deux formats: 'arrivee'/'depart' et 'ENTRÉE'/'SORTIE'
      const typeNormalise = entry.type?.toLowerCase();
      const isArrivee = typeNormalise === 'arrivee' || typeNormalise === 'entrée' || entry.type === 'ENTRÉE';
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

  // ========== DÉTECTION AUTOMATIQUE DES ÉCARTS (retard, départ anticipé) ==========
  const detectedEcarts = useMemo(() => {
    if (!timelineData.length || !plannedShift || plannedShift.type === 'absence') {
      return { retard: null, departAnticipe: null };
    }

    // Récupérer les segments de travail OFFICIELS (exclure pauses ET extras)
    const workSegments = (plannedShift.segments || []).filter(seg => {
      const segType = seg.type?.toLowerCase();
      const isPause = segType === 'pause' || segType === 'break';
      const isExtra = seg.isExtra === true;
      return !isPause && !isExtra;
    });

    if (!workSegments.length) {
      return { retard: null, departAnticipe: null };
    }

    // Trouver le premier segment de travail (heure de début prévue)
    const firstSegment = workSegments[0];
    const planStart = firstSegment.start || firstSegment.debut;
    
    // Trouver le dernier segment de travail (heure de fin prévue)
    const lastSegment = workSegments[workSegments.length - 1];
    const planEnd = lastSegment.end || lastSegment.fin;

    let retard = null;
    let departAnticipe = null;
    let arriveeEnAvance = null;

    // === DÉTECTION RETARD / ARRIVÉE EN AVANCE ===
    // Première arrivée
    const premiereArrivee = timelineData.find(e => e.isArrivee);
    if (premiereArrivee && planStart) {
      const [planH, planM] = planStart.split(':').map(Number);
      const planMinutes = planH * 60 + planM;
      
      const arriveDate = premiereArrivee.dateObj;
      const arriveeMinutes = arriveDate.getHours() * 60 + arriveDate.getMinutes();
      
      const ecartMinutes = arriveeMinutes - planMinutes;
      
      // Retard si arrivée > 5 minutes après l'heure prévue (tolérance de 5min)
      if (ecartMinutes > 5) {
        retard = {
          ecartMinutes,
          heurePrevue: planStart,
          heureReelle: premiereArrivee.timeStr,
          label: 'Retard',
          type: 'retard'
        };
      }
      // Arrivée très en avance si > 30 minutes avant l'heure prévue
      else if (ecartMinutes < -30) {
        arriveeEnAvance = {
          ecartMinutes: Math.abs(ecartMinutes),
          heurePrevue: planStart,
          heureReelle: premiereArrivee.timeStr,
          label: 'Arrivée en avance',
          type: 'hors_plage_in'
        };
      }
    }

    // === DÉTECTION DÉPART ANTICIPÉ ===
    // Dernier départ (si le shift est terminé)
    const dernierDepart = [...timelineData].reverse().find(e => !e.isArrivee);
    if (dernierDepart && planEnd) {
      const [planH, planM] = planEnd.split(':').map(Number);
      const planMinutes = planH * 60 + planM;
      
      const departDate = dernierDepart.dateObj;
      const departMinutes = departDate.getHours() * 60 + departDate.getMinutes();
      
      const ecartMinutes = planMinutes - departMinutes;
      
      // Départ anticipé si départ > 5 minutes avant l'heure prévue (tolérance de 5min)
      if (ecartMinutes > 5) {
        departAnticipe = {
          ecartMinutes,
          heurePrevue: planEnd,
          heureReelle: dernierDepart.timeStr,
          label: 'Départ anticipé',
          type: 'depart_anticipe'
        };
      }
    }

    return { retard, departAnticipe, arriveeEnAvance };
  }, [timelineData, plannedShift]);

  // ========== ALERTE POINTAGE MANQUANT (absence/retard non pointé) ==========
  const alertePointageManquant = useMemo(() => {
    // Si pas de shift planifié ou si c'est un jour de repos/absence, pas d'alerte
    if (!plannedShift || plannedShift.type === 'absence') {
      return null;
    }

    // Récupérer les segments de travail OFFICIELS (exclure les pauses ET les extras)
    const workSegments = (plannedShift.segments || []).filter(seg => {
      const segType = seg.type?.toLowerCase();
      const isPause = segType === 'pause' || segType === 'break';
      const isExtra = seg.isExtra === true;
      return !isPause && !isExtra; // Exclure pauses ET extras
    });

    // Si aucun segment officiel (shift 100% extra), pas d'alerte
    if (!workSegments.length) return null;

    const firstSegment = workSegments[0];
    const lastSegment = workSegments[workSegments.length - 1];
    const planStart = firstSegment.start || firstSegment.debut;
    const planEnd = lastSegment.end || lastSegment.fin;

    if (!planStart) return null;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = planStart.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const [endH, endM] = (planEnd || '23:59').split(':').map(Number);
    const endMinutes = endH * 60 + endM;

    // Vérifier si on a au moins une arrivée
    const hasArrivee = sortedHistorique.some(p => {
      const t = p.type?.toLowerCase();
      return t === 'arrivee' || t === 'entrée' || p.type === 'ENTRÉE';
    });

    // CAS 1: Shift terminé sans aucun pointage = ABSENCE
    if (nowMinutes > endMinutes && !hasArrivee) {
      return {
        type: 'absence',
        gravite: 'critique',
        color: 'red',
        icon: '🚫',
        title: 'Absence non justifiée',
        message: `Aucun pointage enregistré pour votre shift ${planStart} - ${planEnd}`,
        action: 'Contactez votre manager pour régulariser'
      };
    }

    // CAS 2: Shift en cours sans pointage = RETARD/ABSENCE PROBABLE
    if (nowMinutes >= startMinutes && nowMinutes <= endMinutes && !hasArrivee) {
      const retardMinutes = nowMinutes - startMinutes;
      
      if (retardMinutes > 60) {
        // Plus d'1h de retard = absence probable
        return {
          type: 'absence_probable',
          gravite: 'haute',
          color: 'red',
          icon: '⚠️',
          title: 'Absence probable',
          message: `Vous n'avez pas pointé - ${Math.floor(retardMinutes / 60)}h${retardMinutes % 60 > 0 ? (retardMinutes % 60).toString().padStart(2, '0') : ''} de retard`,
          action: 'Pointez maintenant ou contactez votre manager'
        };
      } else if (retardMinutes > 15) {
        // 15-60min de retard
        return {
          type: 'retard',
          gravite: 'moyenne',
          color: 'orange',
          icon: '⏰',
          title: 'Retard significatif',
          message: `Vous n'avez pas encore pointé - ${retardMinutes} min de retard (prévu ${planStart})`,
          action: 'Pointez maintenant'
        };
      } else if (retardMinutes > 5) {
        // 5-15min de retard
        return {
          type: 'retard_leger',
          gravite: 'basse',
          color: 'orange',
          icon: '⏰',
          title: 'Pensez à pointer',
          message: `Votre shift a commencé à ${planStart} (${retardMinutes} min)`,
          action: null
        };
      }
    }

    // CAS 3: Shift pas encore commencé mais proche (dans les 15 prochaines minutes)
    if (nowMinutes < startMinutes && (startMinutes - nowMinutes) <= 15 && !hasArrivee) {
      return {
        type: 'rappel',
        gravite: 'info',
        color: 'blue',
        icon: '📋',
        title: 'Shift imminent',
        message: `Votre shift commence dans ${startMinutes - nowMinutes} min (${planStart})`,
        action: null
      };
    }

    return null;
  }, [plannedShift, sortedHistorique, heureActuelle]);


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-32 lg:pb-8 lg:pt-20 transition-colors" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 5rem)' }}>
      <div className="max-w-4xl lg:max-w-6xl mx-auto px-4 lg:px-8 space-y-4">
        
        {/* RAPPEL DE POINTAGE */}
        {rappelPointage && (
          <div className={`rounded-xl border p-4 flex items-start gap-3 animate-slideDown ${
            rappelPointage.color === 'red' 
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
              : rappelPointage.color === 'orange'
              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              rappelPointage.color === 'red' 
                ? 'bg-red-500' 
                : rappelPointage.color === 'orange'
                ? 'bg-orange-500'
                : 'bg-blue-500'
            }`}>
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 pt-1">
              <p className={`font-medium text-sm ${
                rappelPointage.color === 'red' 
                  ? 'text-red-800 dark:text-red-200' 
                  : rappelPointage.color === 'orange'
                  ? 'text-orange-800 dark:text-orange-200'
                  : 'text-blue-800 dark:text-blue-200'
              }`}>
                {rappelPointage.message}
              </p>
            </div>
          </div>
        )}
        
        {/* SECTION ACTION / HORLOGE */}
        <div 
          id="pointage-actions"
          className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm scroll-mt-highlight transition-all duration-500 ${isPointageActionsHighlighted ? 'ring-2 ring-[#cf292c] animate-pulse' : ''}`}
        >
          <div className="p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-xl bg-[#cf292c] flex items-center justify-center">
                  <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">Pointage</h1>
                    {workDayInfo.isNightShift && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] lg:text-xs font-semibold bg-[#cf292c] text-white rounded-full shadow-sm">
                        <Moon className="w-3 h-3 hidden sm:inline" />
                        <span>Nuit</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs lg:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                    {format(workDayInfo.date, 'EEEE d MMMM', { locale: undefined })}
                  </p>
                </div>
              </div>
              
              {/* Horloge digitale */}
              <div className="text-right">
                <div className="font-mono text-2xl lg:text-3xl font-bold text-[#cf292c]">
                  {format(heureActuelle,'HH:mm:ss')}
                </div>
                <div className="flex items-center gap-1.5 justify-end mt-1">
                  <span className="w-2 h-2 rounded-full bg-[#cf292c] animate-pulse" />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Live</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stepper */}
          <div className="px-5 lg:px-6 pb-5 lg:pb-6">
            <div className="flex items-center justify-center gap-3 lg:gap-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-[#cf292c]" />
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300 hidden sm:inline">QR</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 flex items-center justify-center">
                  <Scan className="w-4 h-4 text-[#cf292c]" />
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300 hidden sm:inline">Scan</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300 hidden sm:inline">OK</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] lg:text-xs text-gray-500 dark:text-slate-400 text-center">
              Scannez votre QR code sur la tablette pour pointer
            </p>
          </div>
        </div>

        {/* TEMPS TRAVAILLÉ / HEURES */}
        <div 
          id="heures-section"
          className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden scroll-mt-highlight transition-all duration-500 ${
          isHeuresHighlighted ? 'ring-2 ring-[#cf292c] animate-pulse' : ''
        } ${
          workingHoursSystem.scenario.type === 'extra_only' 
            ? 'border-amber-200 dark:border-amber-700' 
            : 'border-gray-200 dark:border-slate-700'
        }`}>
          
          {/* Header */}
          <div className="p-5 lg:p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  workingHoursSystem.scenario.type === 'extra_only'
                    ? 'bg-gradient-to-br from-amber-400 to-amber-500'
                    : 'bg-[#cf292c]'
                }`}>
                  {workingHoursSystem.scenario.type === 'extra_only' 
                    ? <Zap className="w-5 h-5 text-white" />
                    : <Timer className="w-5 h-5 text-white" />
                  }
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                      {workingHoursSystem.scenario.type === 'extra_only' ? 'Heures supplémentaires' : 'Temps travaillé'}
                    </h2>
                    {workingHoursSystem.scenario.type === 'extra_only' && (
                      <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded">
                        EXTRA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {workingHoursSystem.scenario.type === 'repos' ? 'Jour de repos' : 
                     workingHoursSystem.scenario.type === 'absence_planifiee' ? 'Absence planifiée' :
                     workingHoursSystem.scenario.type === 'extra_only' ? 'Heures supplémentaires prévues' :
                     format(workDayInfo.date, 'EEEE d MMMM', { locale: undefined })}
                  </p>
                </div>
              </div>
              
              {/* Compteur principal */}
              <div className="text-right">
                <div className={`font-mono text-2xl lg:text-3xl font-bold ${
                  workingHoursSystem.scenario.type === 'extra_only' 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-[#cf292c]'
                }`}>
                  {timeStr}
                </div>
                {/* Objectif affiché - unifié pour tous les types */}
                {workingHoursSystem.target > 0 && workingHoursSystem.scenario.type !== 'extra_only' && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    sur {workingHoursSystem.target.toFixed(0)}h
                    {workingHoursSystem.extraHours > 0 && (
                      <span className="text-amber-500 dark:text-amber-400 ml-1">
                        (+{workingHoursSystem.extraHours.toFixed(1)}h extra)
                      </span>
                    )}
                  </p>
                )}
                {/* Objectif pour shift 100% extra */}
                {workingHoursSystem.scenario.type === 'extra_only' && (
                  <p className="text-xs text-amber-500 dark:text-amber-400 mt-0.5">
                    sur {workingHoursSystem.target.toFixed(0)}h
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Planning prévu */}
          {(workingHoursSystem.scenario.type === 'planifie' || workingHoursSystem.scenario.type === 'extra_only') && workingHoursSystem.scenario.segments.length > 0 && (
            <div className="mx-4 sm:mx-5 lg:mx-6 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#cf292c] flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Prévu</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {workingHoursSystem.scenario.segments.map((seg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border ${
                        seg.isExtra 
                          ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600' 
                          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600'
                      }`}
                    >
                      {seg.isExtra && <Zap className="w-3 h-3 text-amber-500" />}
                      <span className={`font-mono text-[10px] sm:text-xs font-semibold ${
                        seg.isExtra ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-slate-200'
                      }`}>{seg.start}</span>
                      <span className={`text-[10px] sm:text-xs ${seg.isExtra ? 'text-amber-500' : 'text-gray-400'}`}>→</span>
                      <span className={`font-mono text-[10px] sm:text-xs font-semibold ${
                        seg.isExtra ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-slate-200'
                      }`}>{seg.end}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Jauge de progression - unifiée pour tous les types de shifts */}
          {(workingHoursSystem.target > 0 || workingHoursSystem.scenario.type === 'extra_only') && (
            <div className="px-5 lg:px-6 pb-4">
              {workingHoursSystem.percentJournee > 100 ? (
                /* Mode DÉPASSEMENT */
                <>
                  {/* Barre avec dépassement visible */}
                  <div className="relative">
                    <div className="h-2.5 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700">
                      {/* Partie objectif atteint (vert) */}
                      <div 
                        className="absolute top-0 left-0 h-full bg-emerald-500 rounded-l-full"
                        style={{ width: `${100 * 100 / workingHoursSystem.percentJournee}%` }}
                      />
                      {/* Partie dépassement (rouge charte) */}
                      <div 
                        className="absolute top-0 h-full bg-[#cf292c] rounded-r-full"
                        style={{ 
                          left: `${100 * 100 / workingHoursSystem.percentJournee}%`,
                          width: `${100 - (100 * 100 / workingHoursSystem.percentJournee)}%`
                        }}
                      />
                    </div>
                    
                    {/* Marqueur 100% - trait fin */}
                    <div 
                      className="absolute top-0 h-2.5 w-[2px] bg-white dark:bg-slate-900"
                      style={{ left: `${100 * 100 / workingHoursSystem.percentJournee}%` }}
                    />
                  </div>
                  
                  {/* Indicateurs - responsive amélioré */}
                  <div className="flex justify-between items-center mt-2 gap-2">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 flex-shrink-0">0h</span>
                    
                    {/* Objectif centré */}
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0 flex items-center gap-0.5">
                      {workingHoursSystem.target.toFixed(0)}h <CheckCircle className="w-3 h-3" />
                    </span>
                    
                    {/* Badge dépassement */}
                    <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-[#cf292c] text-white text-[10px] font-bold rounded-full flex-shrink-0">
                      <TrendingUp className="w-3 h-3 hidden sm:block" />
                      +{formatDuration(workingHoursSystem.variance, false)}
                    </span>
                  </div>
                </>
              ) : (
                /* Mode NORMAL */
                <>
                  <div className={`relative h-2.5 rounded-full overflow-hidden ${
                    workingHoursSystem.scenario.type === 'extra_only'
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : 'bg-gray-200 dark:bg-slate-700'
                  }`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        workingHoursSystem.scenario.type === 'extra_only'
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                          : workingHoursSystem.scenario.isShiftFinished
                            ? workingHoursSystem.percentJournee >= 100 
                              ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                              : 'bg-gradient-to-r from-red-400 to-red-500'
                            : workingHoursSystem.percentJournee >= 50
                              ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                              : 'bg-gradient-to-r from-amber-400 to-amber-500'
                      }`}
                      style={{ width: `${Math.max(workingHoursSystem.percentJournee, 2)}%` }} 
                    />
                  </div>
                  
                  {/* Indicateurs - responsive */}
                  <div className="flex justify-between items-center mt-2 gap-2">
                    <span className={`text-[10px] flex-shrink-0 ${
                      workingHoursSystem.scenario.type === 'extra_only'
                        ? 'text-amber-500/70 dark:text-amber-400/50'
                        : 'text-gray-400 dark:text-slate-500'
                    }`}>0h</span>
                    
                    <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                      workingHoursSystem.scenario.type === 'extra_only'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : workingHoursSystem.percentJournee >= 100
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : workingHoursSystem.scenario.isShiftFinished
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {Math.round(workingHoursSystem.percentJournee)}%
                    </span>
                    
                    <span className={`text-[10px] flex-shrink-0 ${
                      workingHoursSystem.scenario.type === 'extra_only'
                        ? 'text-amber-500/70 dark:text-amber-400/50'
                        : 'text-gray-400 dark:text-slate-500'
                    }`}>
                      {workingHoursSystem.target.toFixed(0)}h
                    </span>
                  </div>
                </>
              )}
              
            </div>
          )}

          {/* Message de statut - pour heures manquantes/restantes */}
          <div className="px-5 lg:px-6 pb-4">
            {/* Message pour shifts normaux */}
            {workingHoursSystem.isUnderTarget && workingHoursSystem.scenario.type === 'planifie' && (
              <div className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg ${
                workingHoursSystem.scenario.isShiftFinished 
                  ? 'bg-red-50 dark:bg-red-900/20' 
                  : 'bg-blue-50 dark:bg-blue-900/20'
              }`}>
                <Clock className={`w-4 h-4 ${
                  workingHoursSystem.scenario.isShiftFinished 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-blue-600 dark:text-blue-400'
                }`} />
                <span className={`text-sm font-medium ${
                  workingHoursSystem.scenario.isShiftFinished 
                    ? 'text-red-700 dark:text-red-300' 
                    : 'text-blue-700 dark:text-blue-300'
                }`}>
                  {formatDuration(Math.abs(workingHoursSystem.variance), false)} {
                    workingHoursSystem.scenario.isShiftFinished ? 'manquantes' : 'restantes'
                  }
                </span>
              </div>
            )}
            
            {/* Message spécial travail non planifié */}
            {workingHoursSystem.scenario.type === 'extra_non_planifie' && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-[#cf292c]/30 dark:border-[#cf292c]/40">
                <div className="w-10 h-10 rounded-lg bg-[#cf292c]/10 dark:bg-[#cf292c]/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[#cf292c]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#cf292c] dark:text-red-300">
                    {totalHeures >= 8 ? "Mamma mia ! 8h sans planning, Antoine va s'étouffer avec ses gnocchis !" :
                     totalHeures >= 6 ? "Che cosa ?! T'es pas sur le planning aujourd'hui !" :
                     totalHeures >= 4 ? "La pizza était trop bonne hier ? Tu reviens en douce ?" :
                     totalHeures >= 1 ? "Hé oh ! C'est pas l'heure de l'apéro, t'es hors planning !" :
                     "Tu viens piquer des antipasti ou quoi ?"}
                  </p>
                  <p className="text-xs text-[#cf292c]/70 dark:text-red-400/80 mt-0.5">
                    Aucun shift prévu — Contacte ton manager pour régulariser
                  </p>
                </div>
              </div>
            )}
            
            {/* Message pour shifts extra - heures restantes */}
            {workingHoursSystem.scenario.type === 'extra_only' && workingHoursSystem.isUnderTarget && (
              <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  {formatDuration(Math.abs(workingHoursSystem.variance), false)} restantes
                </span>
              </div>
            )}
          </div>

          {/* Journée de repos */}
          {workingHoursSystem.scenario.type === 'repos' && totalHeures === 0 && (
            <div className="px-5 lg:px-6 pb-5">
              <div className="text-center py-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Coffee className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Profitez de votre repos !
                </p>
              </div>
            </div>
          )}

          {/* Bouton détails */}
          <div className="px-5 lg:px-6 pb-5">
            <button
              onClick={() => setShowDetails(v => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-[#cf292c] hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              {showDetails ? 'Masquer les détails' : 'Voir les détails'}
            </button>
          </div>

          {/* Détails */}
          {showDetails && (
            <div className="px-5 lg:px-6 pb-5 border-t border-gray-100 dark:border-slate-700">
              <div className="grid grid-cols-3 gap-3 pt-4">
                <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">Premier</p>
                  <p className="font-mono text-lg font-semibold text-emerald-600 dark:text-emerald-400">{firstTime || '--:--'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">Dernier</p>
                  <p className="font-mono text-lg font-semibold text-blue-600 dark:text-blue-400">{lastTime || '--:--'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-1">Écart</p>
                  <p className={`font-mono text-lg font-semibold ${
                    workingHoursSystem.variance >= 0 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {workingHoursSystem.target > 0 
                      ? formatDuration(workingHoursSystem.variance, true)
                      : formatDuration(totalHeures, true)
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

          {/* TIMELINE */}
        <div 
          id="historique-pointages"
          className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden scroll-mt-highlight transition-all duration-500 ${
            isHistoriqueHighlighted ? 'highlight-glow' : ''
          }`}
        >
          {/* Header Timeline */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#cf292c] flex items-center justify-center flex-shrink-0">
                  <History className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Chronologie</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 truncate">
                    {sortedHistorique.length} point{sortedHistorique.length > 1 ? 's' : ''} aujourd'hui
                  </p>
                </div>
              </div>
              
              {/* Badge anomalies (exclut les anomalies légales pause/amplitude) */}
              {(() => {
                const anomaliesGerees = mesAnomalies.filter(a => !['pause_non_prise', 'depassement_amplitude'].includes(a.type));
                const count = anomaliesGerees.length;
                
                if (anomaliesLoading || count === 0) return null;
                
                return (
                  <Link 
                    to="/mes-anomalies"
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-[#cf292c] rounded-lg hover:bg-[#b32426] transition-colors flex-shrink-0"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    <span className="text-[10px] sm:text-xs font-medium text-white whitespace-nowrap">
                      {count} <span className="hidden xs:inline">anomalie{count > 1 ? 's' : ''}</span>
                    </span>
                    <ChevronRight className="w-3 h-3 text-white/80 hidden sm:block" />
                  </Link>
                );
              })()}
              
              {/* Badge OK (quand aucune anomalie gérée) */}
              {(() => {
                const anomaliesGerees = mesAnomalies.filter(a => !['pause_non_prise', 'depassement_amplitude'].includes(a.type));
                if (anomaliesLoading) return null;
                if (anomaliesGerees.length > 0) return null;
                if (detectedEcarts.retard || detectedEcarts.departAnticipe || detectedEcarts.arriveeEnAvance) return null;
                if (sortedHistorique.length === 0) return null;
                
                return (
                  <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-500 rounded-lg flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    <span className="text-[10px] sm:text-xs font-medium text-white">RAS</span>
                  </div>
                );
              })()}
              
              {/* Badge anomalies détectées (pas encore en BDD mais écarts détectés) */}
              {(() => {
                const anomaliesGerees = mesAnomalies.filter(a => !['pause_non_prise', 'depassement_amplitude'].includes(a.type));
                if (anomaliesLoading) return null;
                if (anomaliesGerees.length > 0) return null;
                if (!detectedEcarts.retard && !detectedEcarts.departAnticipe && !detectedEcarts.arriveeEnAvance) return null;
                
                const nbEcarts = [detectedEcarts.retard, detectedEcarts.departAnticipe, detectedEcarts.arriveeEnAvance].filter(Boolean).length;
                return (
                  <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-amber-500 rounded-lg flex-shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    <span className="text-[10px] sm:text-xs font-medium text-white">
                      {nbEcarts} anomalie{nbEcarts > 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Contenu Timeline */}
          <div className="p-5 lg:p-6">
            {/* Alerte détaillée travail non planifié */}
            {workingHoursSystem.scenario.type === 'extra_non_planifie' && (
              <div className="mb-4 p-4 bg-[#cf292c]/5 dark:bg-[#cf292c]/10 border border-[#cf292c]/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#cf292c]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4 text-[#cf292c]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#cf292c] dark:text-red-300">
                      Pointages hors planning
                    </p>
                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                      Tu n'as aucun shift prévu aujourd'hui mais tu as quand même pointé. 
                      Ces heures seront comptabilisées comme <span className="font-medium text-[#cf292c]">travail non planifié</span>.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-600">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-600 dark:text-slate-300">{totalHeures}h travaillées</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-600">
                        <AlertTriangle className="w-3 h-3 text-[#cf292c]" />
                        <span className="text-xs text-gray-600 dark:text-slate-300">À régulariser</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {timelineData.length === 0 && (
              <div className="text-center py-6">
                {/* Alerte intégrée si pointage manquant */}
                {alertePointageManquant ? (
                  <div className={`rounded-xl border p-4 text-left ${
                    alertePointageManquant.color === 'red' 
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                      : alertePointageManquant.color === 'orange'
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        alertePointageManquant.color === 'red' 
                          ? 'bg-red-500' 
                          : alertePointageManquant.color === 'orange'
                          ? 'bg-orange-500'
                          : 'bg-blue-500'
                      }`}>
                        <span className="text-2xl">{alertePointageManquant.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold ${
                          alertePointageManquant.color === 'red' 
                            ? 'text-red-800 dark:text-red-200' 
                            : alertePointageManquant.color === 'orange'
                            ? 'text-orange-800 dark:text-orange-200'
                            : 'text-blue-800 dark:text-blue-200'
                        }`}>
                          {alertePointageManquant.title}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          alertePointageManquant.color === 'red' 
                            ? 'text-red-700 dark:text-red-300' 
                            : alertePointageManquant.color === 'orange'
                            ? 'text-orange-700 dark:text-orange-300'
                            : 'text-blue-700 dark:text-blue-300'
                        }`}>
                          {alertePointageManquant.message}
                        </p>
                        {alertePointageManquant.action && (
                          <p className={`text-xs mt-2 font-medium ${
                            alertePointageManquant.color === 'red' 
                              ? 'text-red-600 dark:text-red-400' 
                              : alertePointageManquant.color === 'orange'
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            → {alertePointageManquant.action}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Lien vers anomalies si elles existent */}
                    {!anomaliesLoading && mesAnomalies.length > 0 && (
                      <Link 
                        to="/mes-anomalies"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/50 dark:bg-slate-800/50 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors border border-current/20"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Voir {mesAnomalies.length} anomalie{mesAnomalies.length > 1 ? 's' : ''} enregistrée{mesAnomalies.length > 1 ? 's' : ''}
                        </span>
                      </Link>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                      <Clock className="w-7 h-7 text-gray-400 dark:text-slate-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Aucun pointage aujourd'hui</p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Votre timeline apparaîtra ici</p>
                    
                    {/* Anomalies même sans pointage */}
                    {!anomaliesLoading && mesAnomalies.length > 0 && (
                      <Link 
                        to="/mes-anomalies"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#cf292c] rounded-lg hover:bg-[#b32426] transition-colors"
                      >
                        <AlertTriangle className="w-4 h-4 text-white" />
                        <span className="text-sm font-medium text-white">
                          {mesAnomalies.length} anomalie{mesAnomalies.length > 1 ? 's' : ''}
                        </span>
                      </Link>
                    )}
                  </>
                )}
              </div>
            )}

            {timelineData.length > 0 && (
              <div className="space-y-3">
                {timelineData.map((entry, idx) => {
                  const isLast = idx === timelineData.length - 1;
                  
                  // Anomalies liées (depuis la BDD)
                  const anomaliesLiees = mesAnomalies.filter(a => {
                    const isArriveeType = a.type.includes('retard') || a.type === 'missing_in' || a.type === 'hors_plage_in';
                    const isDepartType = a.type.includes('depart') || a.type === 'missing_out' || a.type.includes('heures_sup') || a.type === 'hors_plage_out_critique';
                    const isPauseType = a.type === 'pause_excessive' || a.type === 'pause_non_prise';
                    const isHorsPlanningType = a.type === 'pointage_hors_planning' || a.type === 'pointage_sans_shift' || a.type === 'pointage_pendant_conge';
                    
                    // Anomalie hors planning → afficher sur la première arrivée
                    if (isHorsPlanningType && entry.isFirst && entry.isArrivee) {
                      return true;
                    }
                    
                    // Match arrivée avec anomalies d'arrivée
                    if (entry.isArrivee && isArriveeType) {
                      if (entry.isFirst) return true;
                      const heureReelle = a.details?.heureReelle;
                      if (heureReelle && entry.timeStr === heureReelle) return true;
                    }
                    
                    // Match départ avec anomalies de départ
                    if (!entry.isArrivee && isDepartType) {
                      if (entry.isLast) return true;
                      const heureReelle = a.details?.heureReelle;
                      if (heureReelle && entry.timeStr === heureReelle) return true;
                    }
                    
                    // Match pause_excessive sur le retour de pause (2ème+ arrivée)
                    if (entry.isArrivee && !entry.isFirst && isPauseType) {
                      return true;
                    }
                    
                    return false;
                  });
                  
                  // ====== ÉCART DÉTECTÉ AUTOMATIQUEMENT (si pas d'anomalie BDD) ======
                  let ecartDetecte = null;
                  if (anomaliesLiees.length === 0) {
                    // Retard sur première arrivée
                    if (entry.isFirst && entry.isArrivee && detectedEcarts.retard) {
                      ecartDetecte = detectedEcarts.retard;
                    }
                    // Arrivée très en avance sur première arrivée
                    if (entry.isFirst && entry.isArrivee && detectedEcarts.arriveeEnAvance) {
                      ecartDetecte = detectedEcarts.arriveeEnAvance;
                    }
                    // Départ anticipé sur dernier départ
                    if (entry.isLast && !entry.isArrivee && detectedEcarts.departAnticipe) {
                      ecartDetecte = detectedEcarts.departAnticipe;
                    }
                  }
                  
                  const hasAnomalie = anomaliesLiees.length > 0;
                  const hasEcart = ecartDetecte !== null;
                  const anomaliePrincipale = anomaliesLiees[0];
                  
                  const getAnomalieInfo = (anomalie) => {
                    if (!anomalie) return null;
                    const type = anomalie.type;
                    const details = anomalie.details || {};
                    const statut = anomalie.statut || 'en_attente';
                    const gravite = anomalie.gravite || 'moyenne';
                    
                    // Mapping complet de tous les types d'anomalies
                    const anomalieConfig = {
                      // Retards
                      'retard_modere': { label: 'Retard modéré', icon: '⏰', color: 'amber', getValue: () => details.ecartMinutes ? `${Math.abs(details.ecartMinutes)} min` : '' },
                      'retard_critique': { label: 'Retard critique', icon: '🚨', color: 'red', getValue: () => details.ecartMinutes ? `${Math.abs(details.ecartMinutes)} min` : '' },
                      
                      // Départs
                      'depart_anticipe_modere': { label: 'Départ anticipé', icon: '🚪', color: 'amber', getValue: () => details.ecartMinutes ? `${Math.abs(details.ecartMinutes)} min` : '' },
                      'depart_anticipe_critique': { label: 'Départ anticipé critique', icon: '🚨', color: 'red', getValue: () => details.ecartMinutes ? `${Math.abs(details.ecartMinutes)} min` : '' },
                      
                      // Hors plage
                      'hors_plage_in': { label: 'Arrivée hors plage', icon: '📍', color: 'amber', getValue: () => details.ecart ? `${details.ecart}` : '' },
                      'hors_plage_out_critique': { label: 'Sortie hors plage', icon: '📍', color: 'red', getValue: () => details.ecart ? `${details.ecart}` : '' },
                      
                      // Heures supplémentaires
                      'heures_supplementaires_moderees': { label: 'Heures sup.', icon: '⏱️', color: 'emerald', isPositive: true, getValue: () => details.heuresSupp ? `+${formatDuration(parseFloat(details.heuresSupp), false)}` : '' },
                      'heures_supplementaires_excessives': { label: 'Heures sup. excessives', icon: '⚠️', color: 'amber', getValue: () => details.heuresSupp ? `+${formatDuration(parseFloat(details.heuresSupp), false)}` : '' },
                      
                      // Pointages manquants
                      'missing_in': { label: 'Entrée manquante', icon: '❓', color: 'red', getValue: () => '' },
                      'missing_out': { label: 'Sortie manquante', icon: '❓', color: 'red', getValue: () => '' },
                      
                      // Pause excessive (temps de pause dépassé)
                      'pause_excessive': { label: 'Pause prolongée', icon: '☕', color: 'amber', getValue: () => {
                        // Extraire les minutes de la description si pas dans details
                        if (details.depassementMinutes) return `+${details.depassementMinutes} min`;
                        // Parser depuis la description "Pause excessive de XXmin..."
                        const match = anomalie.description?.match(/de (\d+)min/);
                        return match ? `+${match[1]} min` : '';
                      }},
                      
                      // Pause et amplitude (Code du travail) - Désactivés
                      'pause_non_prise': { label: 'Pause non prise', icon: '☕', color: 'red', getValue: () => details.dureeTravailContinu ? `${details.dureeTravailContinu}` : '6h+ continu' },
                      'depassement_amplitude': { label: 'Amplitude excessive', icon: '⚖️', color: 'red', getValue: () => details.amplitude ? `${details.amplitude}` : '>10h' },
                      
                      // Hors planning
                      'pointage_hors_planning': { label: 'Hors planning', icon: '📅', color: 'amber', getValue: () => '' },
                      'pointage_sans_shift': { label: 'Sans shift', icon: '📅', color: 'amber', getValue: () => '' },
                      'pointage_pendant_conge': { label: 'Pendant congé', icon: '🏖️', color: 'red', getValue: () => '' },
                      
                      // Absence
                      'absence_injustifiee': { label: 'Absence injustifiée', icon: '❌', color: 'red', getValue: () => '' },
                    };
                    
                    // Chercher la config exacte ou par préfixe
                    let config = anomalieConfig[type];
                    if (!config) {
                      // Fallback par préfixe
                      if (type.includes('retard')) config = { label: 'Retard', icon: '⏰', color: 'amber', getValue: () => details.ecartMinutes ? `${Math.abs(details.ecartMinutes)} min` : '' };
                      else if (type.includes('depart')) config = { label: 'Départ anticipé', icon: '🚪', color: 'amber', getValue: () => details.ecartMinutes ? `${Math.abs(details.ecartMinutes)} min` : '' };
                      else if (type.includes('heures_sup')) config = { label: 'Heures sup.', icon: '⏱️', color: 'emerald', isPositive: true, getValue: () => details.heuresSupp ? `+${formatDuration(parseFloat(details.heuresSupp), false)}` : '' };
                      else if (type.includes('hors_plage')) config = { label: 'Hors plage', icon: '📍', color: 'amber', getValue: () => '' };
                      else if (type.includes('missing')) config = { label: 'Pointage manquant', icon: '❓', color: 'red', getValue: () => '' };
                      else if (type.includes('pause')) config = { label: 'Pause non prise', icon: '☕', color: 'red', getValue: () => '' };
                      else if (type.includes('amplitude')) config = { label: 'Amplitude excessive', icon: '⚖️', color: 'red', getValue: () => '' };
                      else config = { label: type.replace(/_/g, ' '), icon: '⚠️', color: gravite === 'critique' ? 'red' : 'amber', getValue: () => '' };
                    }
                    
                    return {
                      label: config.label,
                      icon: config.icon,
                      value: config.getValue(),
                      isPositive: config.isPositive || false,
                      color: config.color,
                      statut,
                      gravite
                    };
                  };
                  
                  const anomalieInfo = getAnomalieInfo(anomaliePrincipale);
                  
                  return (
                    <div key={idx} className="flex gap-3">
                      {/* Timeline gauche */}
                      <div className="flex flex-col items-center w-5">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${
                          workingHoursSystem.scenario.type === 'extra_non_planifie' 
                            ? 'bg-[#cf292c]' 
                            : hasAnomalie || hasEcart 
                              ? 'bg-amber-500' 
                              : entry.isArrivee 
                                ? 'bg-emerald-500' 
                                : 'bg-blue-500'
                        }`} />
                        {!isLast && <div className={`w-px flex-1 mt-1 ${
                          workingHoursSystem.scenario.type === 'extra_non_planifie'
                            ? 'border-l-2 border-dashed border-[#cf292c]/40'
                            : 'bg-gray-200 dark:bg-slate-700'
                        }`} />}
                      </div>
                      
                      {/* Contenu */}
                      <div className="flex-1 pb-1">
                        {/* Ligne principale */}
                        <div className={`flex items-center justify-between p-3 rounded-lg ${
                          workingHoursSystem.scenario.type === 'extra_non_planifie'
                            ? 'bg-[#cf292c]/5 dark:bg-[#cf292c]/10 border-2 border-dashed border-[#cf292c]/40'
                            : 'bg-gray-50 dark:bg-slate-700/50'
                        }`}>
                          <div className="flex items-center gap-3">
                            {/* Heure */}
                            <span className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                              {entry.timeStr}
                            </span>
                            {/* Type */}
                            <span className={`text-sm font-medium ${
                              workingHoursSystem.scenario.type === 'extra_non_planifie'
                                ? 'text-[#cf292c]'
                                : entry.isArrivee ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                            }`}>
                              {entry.isArrivee ? 'Arrivée' : 'Départ'}
                            </span>
                            {/* Badge hors planning */}
                            {workingHoursSystem.scenario.type === 'extra_non_planifie' && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide rounded bg-[#cf292c]/10 text-[#cf292c] border border-[#cf292c]/30">
                                Hors planning
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Durée session */}
                            {entry.sessionDuration && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                                <Timer className="w-3 h-3" />
                                <span>{entry.sessionDuration}</span>
                              </div>
                            )}
                            {/* Badge en cours */}
                            {entry.isOngoing && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                <span className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
                                En cours
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Anomalie (depuis BDD) - affiche la description réelle */}
                        {hasAnomalie && anomaliePrincipale && (
                          <div className={`mt-2 px-3 py-2 rounded-lg border ${
                            anomaliePrincipale.gravite === 'critique' 
                              ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50'
                              : anomaliePrincipale.type.includes('heures_sup') && !anomaliePrincipale.type.includes('excessive')
                              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50' 
                              : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50'
                          }`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {/* Description réelle de la BDD */}
                                <p className={`text-sm ${
                                  anomaliePrincipale.gravite === 'critique' 
                                    ? 'text-red-700 dark:text-red-300'
                                    : anomaliePrincipale.type.includes('heures_sup') && !anomaliePrincipale.type.includes('excessive')
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-amber-700 dark:text-amber-300'
                                }`}>
                                  {anomaliePrincipale.description}
                                </p>
                              </div>
                              {/* Statut */}
                              <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                                anomaliePrincipale.statut === 'validee' ? 'bg-emerald-500 text-white' :
                                anomaliePrincipale.statut === 'refusee' ? 'bg-red-500 text-white' :
                                'bg-amber-500 text-white'
                              }`}>
                                {anomaliePrincipale.statut === 'validee' ? 'Validée' : anomaliePrincipale.statut === 'refusee' ? 'Refusée' : 'En attente'}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Écart détecté automatiquement (pas d'anomalie BDD) */}
                        {!hasAnomalie && hasEcart && ecartDetecte && (
                          <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-lg border bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                {ecartDetecte.label}
                                <span className="ml-1 font-semibold">{ecartDetecte.ecartMinutes} min</span>
                              </span>
                            </div>
                            {/* Info prévu */}
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                              Prévu: {ecartDetecte.heurePrevue}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Récapitulatif des écarts détectés (si pas d'anomalies gérées en BDD) */}
            {(() => {
              const anomaliesGerees = mesAnomalies.filter(a => !['pause_non_prise', 'depassement_amplitude'].includes(a.type));
              if (timelineData.length === 0) return null;
              if (anomaliesGerees.length > 0) return null;
              if (!detectedEcarts.retard && !detectedEcarts.departAnticipe && !detectedEcarts.arriveeEnAvance) return null;
              
              return (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800/50">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                          Écarts détectés par rapport au planning
                        </h4>
                        <div className="mt-2 space-y-1.5">
                          {detectedEcarts.retard && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-amber-700 dark:text-amber-400">
                                Retard à l'arrivée
                              </span>
                              <span className="font-semibold text-amber-800 dark:text-amber-300">
                                +{detectedEcarts.retard.ecartMinutes} min (prévu {detectedEcarts.retard.heurePrevue})
                              </span>
                            </div>
                          )}
                          {detectedEcarts.arriveeEnAvance && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-amber-700 dark:text-amber-400">
                                Arrivée très en avance
                              </span>
                              <span className="font-semibold text-amber-800 dark:text-amber-300">
                                -{detectedEcarts.arriveeEnAvance.ecartMinutes} min (prévu {detectedEcarts.arriveeEnAvance.heurePrevue})
                              </span>
                            </div>
                          )}
                          {detectedEcarts.departAnticipe && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-amber-700 dark:text-amber-400">
                                Départ anticipé
                              </span>
                              <span className="font-semibold text-amber-800 dark:text-amber-300">
                                -{detectedEcarts.departAnticipe.ecartMinutes} min (prévu {detectedEcarts.departAnticipe.heurePrevue})
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400/80">
                          Ces écarts seront analysés par votre manager
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
                
            {/* Lien vers historique (seulement si anomalies en BDD, exclut les légales) */}
            {(() => {
              const anomaliesGerees = mesAnomalies.filter(a => !['pause_non_prise', 'depassement_amplitude'].includes(a.type));
              if (anomaliesGerees.length === 0) return null;
              
              return (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
                  <Link 
                    to="/mes-anomalies"
                    className="flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-[#cf292c] hover:underline"
                  >
                    <span>Voir l'historique complet</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* BottomNav - en dehors de la grille pour éviter les conflits */}
      <BottomNav />
    </div>
  );
};

export default Pointage;