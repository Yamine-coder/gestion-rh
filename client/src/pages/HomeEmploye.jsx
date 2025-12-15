import { useEffect, useState, useMemo, useCallback, useContext, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, Calendar, FileText, User, ChevronRight, Timer, AlertCircle, Sun, Moon, Coffee, Users, ChevronLeft, Briefcase, Hand, Check, X, UserX, CalendarOff, PlayCircle, PauseCircle, TrendingUp, Zap, Award, Flame, Megaphone, CalendarDays, GraduationCap, Stethoscope, AlertTriangle, Target, Plane, Trophy, CheckCircle2, CalendarCheck, UserPlus, ChevronDown, ChevronUp, UserCheck, ThumbsUp, Star, Medal, Gem, BarChart3, Lock, MessageCircle, Search, CheckCircle, Handshake, Home, Sparkles } from 'lucide-react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import BottomNav from '../components/BottomNav';
import ScoreWidget from '../components/ScoreWidget';
import { BadgesPreview, BADGES, BadgesList } from '../components/BadgesSystem';
import { getNiveau, NIVEAUX } from '../services/scoringService';
import { ThemeContext } from '../context/ThemeContext';
import useNotificationHighlight from '../hooks/useNotificationHighlight';
import { isShiftInPast, isShiftStarted, isShiftStartingWithin, createLocalDateTime, toLocalDateString } from '../utils/parisTimeUtils';
import { getCreneauFromSegments, getCreneauStyle, isWorkShift, isCongeShift } from '../utils/creneauUtils';
import MobileOnboarding, { useOnboarding } from '../components/onboarding/MobileOnboarding';
import SplashScreen, { useSplashScreen } from '../components/onboarding/SplashScreen';
import InstallPWABanner from '../components/InstallPWABanner';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Couleur de marque centrale (utilisée aussi sur la page Pointage)
const brand = '#cf292c';

// Limite de caractères pour les messages de consigne avant troncature
const MAX_CONSIGNE_LENGTH = 120;

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT CONSIGNE CARD - Design sobre et épuré
// ═══════════════════════════════════════════════════════════════════════════
const ConsigneCard = ({ consigne, isHighlighted }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongMessage = consigne.contenu.length > MAX_CONSIGNE_LENGTH;
  
  const displayContent = isExpanded || !isLongMessage 
    ? consigne.contenu 
    : consigne.contenu.substring(0, MAX_CONSIGNE_LENGTH) + '...';

  // Styles sobres par type de consigne
  const getTypeStyle = () => {
    switch (consigne.type) {
      case 'urgent':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          iconColor: 'text-red-600 dark:text-red-400',
          titleColor: 'text-red-700 dark:text-red-300'
        };
      case 'important':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          iconColor: 'text-amber-600 dark:text-amber-400',
          titleColor: 'text-amber-700 dark:text-amber-300'
        };
      default: // info
        return {
          bg: 'bg-gray-50 dark:bg-gray-700/50',
          border: 'border-gray-200 dark:border-gray-600',
          iconBg: `bg-gray-100 dark:bg-gray-600`,
          iconColor: 'text-gray-500 dark:text-gray-400',
          titleColor: 'text-gray-700 dark:text-gray-200'
        };
    }
  };

  const style = getTypeStyle();

  return (
    <div 
      id={`consigne-${consigne.id}`}
      className={`p-3 rounded-lg flex items-start gap-3 transition-all duration-200 border ${style.bg} ${style.border} ${
        isHighlighted ? 'ring-2 ring-[#cf292c]' : ''
      }`}
    >
      {/* Icône sobre */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.iconBg}`}>
        {consigne.type === 'urgent' ? (
          <AlertTriangle className={`w-4 h-4 ${style.iconColor}`} />
        ) : consigne.type === 'important' ? (
          <AlertCircle className={`w-4 h-4 ${style.iconColor}`} />
        ) : (
          <Megaphone className={`w-4 h-4 ${style.iconColor}`} />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className={`text-sm font-medium ${style.titleColor}`}>
            {consigne.titre}
          </h4>
          {consigne.type === 'urgent' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500 text-white font-semibold uppercase">
              Urgent
            </span>
          )}
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mt-1 whitespace-pre-wrap">
          {displayContent}
        </p>
        {isLongMessage && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Voir moins
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Voir plus
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

function HomeEmploye() {
  const { theme } = useContext(ThemeContext); // eslint-disable-line no-unused-vars
  const location = useLocation();
  
  // Hook onboarding pour les nouveaux utilisateurs
  const { showOnboarding, completeOnboarding } = useOnboarding();
  
  // Hook splash screen
  const { showSplash, completeSplash } = useSplashScreen();
  
  // Hooks pour le highlight des sections depuis les notifications
  const { isHighlighted: isPlanningHighlighted } = useNotificationHighlight('planning-section');
  const { isHighlighted: isConsignesHighlighted, highlightId: highlightedConsigneId } = useNotificationHighlight('consignes-section');
  const { isHighlighted: isRemplacementsHighlighted } = useNotificationHighlight('remplacements-section');
  
  const [prenom, setPrenom] = useState('Employé');
  const [nom, setNom] = useState('');
  const [now, setNow] = useState(new Date());
  
  // Stats temps réel
  const [journeeHeures, setJourneeHeures] = useState(null); // ex: "05h12"
  const [pointagesCount, setPointagesCount] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [pointages, setPointages] = useState([]); // liste brute
  // Planning intégré dans l'accueil
  const [myShifts, setMyShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [teamShifts, setTeamShifts] = useState([]);
  const [teamConges, setTeamConges] = useState([]);
  const [planningWeekOffset, setPlanningWeekOffset] = useState(0);
  const [planningView, setPlanningView] = useState('perso'); // 'perso' | 'equipe' | 'remplacements'
  const [selectedTeamDayIdx, setSelectedTeamDayIdx] = useState(null); // Pour la vue équipe mobile
  const [selectedMyDayIdx, setSelectedMyDayIdx] = useState(null); // Pour la vue mes shifts mobile
  const [selectedWidgetDay, setSelectedWidgetDay] = useState(null); // Jour sélectionné dans le widget planning (null = aujourd'hui)
  
  // Remplacements
  const [remplacementsDisponibles, setRemplacementsDisponibles] = useState([]);
  const [mesDemandes, setMesDemandes] = useState([]);
  const [mesCandidatures, setMesCandidatures] = useState([]);
  const [loadingRemplacements, setLoadingRemplacements] = useState(false);
  const [candidatingId, setCandidatingId] = useState(null); // ID de la demande en cours de candidature
  
  // Modal demande de remplacement
  const [showDemandeModal, setShowDemandeModal] = useState(false);
  const [selectedShiftForDemande, setSelectedShiftForDemande] = useState(null);
  const [demandeMotif, setDemandeMotif] = useState('');
  const [demandePriorite, setDemandePriorite] = useState('normale');
  const [demandeCommentaire, setDemandeCommentaire] = useState('');
  const [creatingDemande, setCreatingDemande] = useState(false);
  
  // Modal détails shift (pour voir les infos d'un remplacement)
  const [showShiftDetailsModal, setShowShiftDetailsModal] = useState(false);
  const [selectedShiftDetails, setSelectedShiftDetails] = useState(null);
  
  // Modals de confirmation et notifications
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'warning' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Anomalies du jour (simplifié)
  const [todayAnomalies, setTodayAnomalies] = useState([]);
  
  // ═══ NOUVEAUX WIDGETS •••
  // Consignes du jour
  const [consignes, setConsignes] = useState([]);
  const [loadingConsignes, setLoadingConsignes] = useState(true);
  const [showAllConsignes, setShowAllConsignes] = useState(false);
  
  // Stats ponctualité
  const [statsPonctualite, setStatsPonctualite] = useState(null);
  const [loadingPonctualite, setLoadingPonctualite] = useState(true);
  
  // Score et badges pour les KPIs gamifiés
  const [scoreData, setScoreData] = useState(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  
  // Feedbacks peer-to-peer
  const [feedbacksRecus, setFeedbacksRecus] = useState([]);
  const [feedbacksEnvoyes, setFeedbacksEnvoyes] = useState([]);
  const [feedbacksRestants, setFeedbacksRestants] = useState(2);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  
  // Anomalies employé
  const [mesAnomalies, setMesAnomalies] = useState([]);
  const [loadingAnomalies, setLoadingAnomalies] = useState(true);
  
  // Événements à venir (congés, remplacements, formations...)
  const [evenementsAVenir, setEvenementsAVenir] = useState([]);
  const [loadingEvenements, setLoadingEvenements] = useState(true);
  const [filtreEvenements, setFiltreEvenements] = useState('all'); // all, conge, formation, visite_medicale
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);

  // ═══ ANIMATION LEVEL UP - Style Jeu Vidéo ═══
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpOldNiveau, setLevelUpOldNiveau] = useState(null);
  const [levelUpNewNiveau, setLevelUpNewNiveau] = useState(null);
  const [levelUpPhase, setLevelUpPhase] = useState(0);
  const previousScoreRef = useRef(null);

  // Configuration des niveaux pour l'animation
  const NIVEAUX_CONFIG = [
    { min: -Infinity, max: 0, label: 'À surveiller', icon: AlertTriangle, iconColor: 'text-red-500', bgColor: 'from-red-500 to-red-600', btnColor: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' },
    { min: 0, max: 100, label: 'Bronze', icon: Medal, iconColor: 'text-amber-600', bgColor: 'from-amber-500 to-orange-500', btnColor: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' },
    { min: 100, max: 300, label: 'Argent', icon: Medal, iconColor: 'text-gray-400', bgColor: 'from-slate-400 to-gray-500', btnColor: 'from-slate-400 to-gray-500 hover:from-slate-500 hover:to-gray-600' },
    { min: 300, max: 500, label: 'Or', icon: Medal, iconColor: 'text-yellow-500', bgColor: 'from-yellow-400 to-amber-500', btnColor: 'from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600' },
    { min: 500, max: Infinity, label: 'Diamant', icon: Gem, iconColor: 'text-cyan-500', bgColor: 'from-cyan-400 to-blue-500', btnColor: 'from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600' }
  ];

  const getNiveauIndex = (points) => {
    if (points < 0) return 0; // "À surveiller"
    return NIVEAUX_CONFIG.findIndex(n => points >= n.min && points < n.max);
  };

  // Déclencher l'animation Level Up
  const triggerLevelUpAnimation = (oldNiv, newNiv) => {
    setLevelUpOldNiveau(oldNiv);
    setLevelUpNewNiveau(newNiv);
    setShowLevelUp(true);
    setLevelUpPhase(1);
    
    // Phase 1: Ancien rang visible (1.5s)
    setTimeout(() => setLevelUpPhase(2), 1500);
    
    // Phase 2: Transition LEVEL UP (1.8s)
    setTimeout(() => setLevelUpPhase(3), 3300);
    
    // Phase 3: Nouveau rang apparaît avec blur (0.8s)
    setTimeout(() => setLevelUpPhase(4), 4100);
    
    // Phase 4: Affichage final - attend le clic utilisateur
  };

  // Fonctions de test exposées sur window pour toutes les transitions
  useEffect(() => {
    // À surveiller → Bronze
    window.testLevelUp0 = () => {
      triggerLevelUpAnimation(NIVEAUX_CONFIG[0], NIVEAUX_CONFIG[1]);
    };
    // Bronze → Argent
    window.testLevelUp = () => {
      triggerLevelUpAnimation(NIVEAUX_CONFIG[1], NIVEAUX_CONFIG[2]);
    };
    // Argent → Or
    window.testLevelUp2 = () => {
      triggerLevelUpAnimation(NIVEAUX_CONFIG[2], NIVEAUX_CONFIG[3]);
    };
    // Or → Diamant
    window.testLevelUp3 = () => {
      triggerLevelUpAnimation(NIVEAUX_CONFIG[3], NIVEAUX_CONFIG[4]);
    };
    return () => { 
      delete window.testLevelUp0;
      delete window.testLevelUp; 
      delete window.testLevelUp2; 
      delete window.testLevelUp3; 
    };
  }, [scoreData]);

  // Détecter le changement de niveau
  useEffect(() => {
    if (scoreData?.score) {
      const currentPoints = scoreData.score.total_points || scoreData.score.score_total || 0;
      const storedPoints = localStorage.getItem('lastScorePoints_home');
      
      console.log('🎮 [LEVEL] currentPoints:', currentPoints, 'storedPoints:', storedPoints);
      
      if (storedPoints !== null) {
        const lastPoints = parseInt(storedPoints, 10);
        const oldIdx = getNiveauIndex(lastPoints);
        const newIdx = getNiveauIndex(currentPoints);
        
        console.log('🎮 [LEVEL] oldIdx:', oldIdx, 'newIdx:', newIdx, 'oldLevel:', NIVEAUX_CONFIG[oldIdx]?.label, 'newLevel:', NIVEAUX_CONFIG[newIdx]?.label);
        
        // Si le niveau a changé (monté)
        if (newIdx > oldIdx && newIdx >= 0) {
          console.log('🎮 [LEVEL] LEVEL UP DETECTED! Triggering animation...');
          triggerLevelUpAnimation(NIVEAUX_CONFIG[oldIdx], NIVEAUX_CONFIG[newIdx]);
        }
      }
      
      // Sauvegarder les points actuels
      localStorage.setItem('lastScorePoints_home', currentPoints.toString());
      previousScoreRef.current = currentPoints;
    }
  }, [scoreData]);

  // Récupération prénom
  useEffect(() => {
    const storedPrenom = localStorage.getItem('prenom');
    if (storedPrenom) setPrenom(storedPrenom);
    const storedNom = localStorage.getItem('nom');
    if (storedNom) setNom(storedNom);
  }, []);

  // Horloge temps réel
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Format date humanisée FR (fallback sans locale importée)
  const dateStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }).format(now);
    } catch {
      return now.toLocaleDateString();
    }
  }, [now]);

  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Fallback API pour récupérer nom/prenom si pas en localStorage
  useEffect(()=>{
    if (!token) return;
    if (prenom && prenom !== 'Employé' && nom) return; // déjà complet
    (async()=>{
      try {
        const res = await axios.get(`${API_BASE}/user/profile`, { headers: { Authorization: `Bearer ${token}` }});
        if (res.data) {
          if (res.data.prenom && (!prenom || prenom === 'Employé')) { setPrenom(res.data.prenom); try { localStorage.setItem('prenom', res.data.prenom); } catch {} }
          if (res.data.nom && !nom) { setNom(res.data.nom); try { localStorage.setItem('nom', res.data.nom); } catch {} }
        }
      } catch { /* silencieux */ }
    })();
  }, [token, prenom, nom]);

  const formatHeures = (totalHeures) => {
    if (totalHeures == null) return null;
    const h = Math.floor(totalHeures);
    const m = Math.round((totalHeures - h) * 60);
    return `${h.toString().padStart(2,'0')}h${m.toString().padStart(2,'0')}`;
  };

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoadingStats(true);
    setStatsError(null);
    try {
  const [totalRes, pointagesRes] = await Promise.all([
        axios.get(`${API_BASE}/pointage/total-aujourdhui`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API_BASE}/pointage/mes-pointages`, { headers: { Authorization: `Bearer ${token}` }})
      ]);
      setJourneeHeures(formatHeures(totalRes.data.totalHeures || 0));
  const arr = Array.isArray(pointagesRes.data) ? pointagesRes.data : [];
  setPointages(arr);
  setPointagesCount(arr.length);
    } catch (e) {
      setStatsError("Impossible de charger les statistiques");
    } finally {
      setLoadingStats(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 60_000); // refresh auto chaque minute
    return () => clearInterval(id);
  }, [fetchStats]);

  // Charger les shifts de la semaine (personnels et équipe)
  const fetchShifts = useCallback(async () => {
    if (!token) return;
    setLoadingShifts(true);
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) + (planningWeekOffset * 7);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const startStr = toLocalDateString(startOfWeek);
      const endStr = toLocalDateString(endOfWeek);
      
      // Charger mes shifts et les shifts équipe en parallèle
      const [myRes, teamRes] = await Promise.all([
        axios.get(`${API_BASE}/shifts/mes-shifts?start=${startStr}&end=${endStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/shifts/equipe?start=${startStr}&end=${endStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { shifts: [] } })) // Fallback si pas accès équipe
      ]);
      
      setMyShifts(Array.isArray(myRes.data) ? myRes.data : []);
      // L'API équipe renvoie { employes, shifts, conges, categorie }
      const teamData = teamRes.data;
      setTeamShifts(Array.isArray(teamData) ? teamData : (teamData?.shifts || []));
      setTeamConges(teamData?.conges || []);
    } catch (err) {
      console.error('Erreur chargement shifts:', err);
    } finally {
      setLoadingShifts(false);
    }
  }, [token, planningWeekOffset]);

  // Charger les shifts au mont et quand la semaine change
  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Charger les remplacements disponibles
  const fetchRemplacements = useCallback(async () => {
    if (!token) return;
    setLoadingRemplacements(true);
    try {
      const [disponiblesRes, demandesRes, candidaturesRes] = await Promise.all([
        axios.get(`${API_BASE}/api/remplacements/disponibles`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/api/remplacements/mes-demandes`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/api/remplacements/mes-candidatures`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setRemplacementsDisponibles(Array.isArray(disponiblesRes.data) ? disponiblesRes.data : []);
      // Filtrer les demandes annulées/refusées côté client aussi (sécurité)
      const demandesActives = Array.isArray(demandesRes.data) 
        ? demandesRes.data.filter(d => !['annulee', 'refusee', 'expiree'].includes(d.statut))
        : [];
      setMesDemandes(demandesActives);
      setMesCandidatures(Array.isArray(candidaturesRes.data) ? candidaturesRes.data : []);
    } catch (err) {
      console.error('Erreur chargement remplacements:', err);
    } finally {
      setLoadingRemplacements(false);
    }
  }, [token]);

  // Charger les remplacements quand on passe sur cet onglet OU au montage (pour avoir mesDemandes)
  useEffect(() => {
    // Charger au montage pour connaître les demandes existantes
    fetchRemplacements();
  }, [fetchRemplacements]);

  useEffect(() => {
    if (planningView === 'remplacements') {
      fetchRemplacements();
    }
  }, [planningView, fetchRemplacements]);

  // Gérer la navigation depuis les notifications vers remplacements
  useEffect(() => {
    if (location.state?.fromNotification && location.state?.highlightSection === 'remplacements-section') {
      setPlanningView('remplacements');
      setTimeout(() => {
        const section = document.getElementById('remplacements-section');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      // Nettoyer le state pour éviter les boucles de redirection
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.state]);

  // ═══════════════════════════════════════════════════════════════════════════
  // NOUVEAUX WIDGETS - Fetch des données
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Charger les consignes du jour
  const fetchConsignes = useCallback(async () => {
    if (!token) return;
    setLoadingConsignes(true);
    try {
      const res = await axios.get(`${API_BASE}/api/consignes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConsignes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erreur chargement consignes:', err);
    } finally {
      setLoadingConsignes(false);
    }
  }, [token]);

  // Charger les stats de ponctualité
  const fetchPonctualite = useCallback(async () => {
    if (!token) return;
    setLoadingPonctualite(true);
    try {
      const res = await axios.get(`${API_BASE}/api/consignes/stats/ponctualite`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatsPonctualite(res.data);
    } catch (err) {
      console.error('Erreur chargement ponctualité:', err);
    } finally {
      setLoadingPonctualite(false);
    }
  }, [token]);

  // Charger le score et les badges
  const fetchScore = useCallback(async () => {
    if (!token) return;
    setLoadingScore(true);
    try {
      const res = await axios.get(`${API_BASE}/api/scoring/mon-score`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScoreData(res.data?.data || null);
    } catch (err) {
      console.error('Erreur chargement score:', err);
    } finally {
      setLoadingScore(false);
    }
  }, [token]);

  // Charger les feedbacks reçus et envoyés
  const fetchFeedbacks = useCallback(async () => {
    if (!token) return;
    setLoadingFeedbacks(true);
    try {
      const [recusRes, envoyesRes] = await Promise.all([
        axios.get(`${API_BASE}/api/scoring/peer-feedback/mes-recus`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/api/scoring/peer-feedback/mes-envois`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setFeedbacksRecus(recusRes.data?.data || []);
      setFeedbacksEnvoyes(envoyesRes.data?.data || []);
      setFeedbacksRestants(envoyesRes.data?.remaining ?? 2);
    } catch (err) {
      console.error('Erreur chargement feedbacks:', err);
    } finally {
      setLoadingFeedbacks(false);
    }
  }, [token]);

  // Charger les anomalies de l'employé
  const fetchAnomalies = useCallback(async () => {
    if (!token) return;
    setLoadingAnomalies(true);
    try {
      const res = await axios.get(`${API_BASE}/api/anomalies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filtrer seulement les anomalies en attente
      const enAttente = (res.data?.anomalies || res.data || []).filter(a => a.statut === 'en_attente');
      setMesAnomalies(enAttente);
    } catch (err) {
      console.error('Erreur chargement anomalies:', err);
    } finally {
      setLoadingAnomalies(false);
    }
  }, [token]);

  // Charger les événements à venir (congés, remplacements validés, formations...)
  const fetchEvenements = useCallback(async () => {
    if (!token) return;
    setLoadingEvenements(true);
    try {
      const res = await axios.get(`${API_BASE}/api/consignes/stats/evenements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // L'API renvoie directement un tableau
      setEvenementsAVenir(Array.isArray(res.data) ? res.data : res.data?.evenements || []);
    } catch (err) {
      console.error('Erreur chargement événements:', err);
    } finally {
      setLoadingEvenements(false);
    }
  }, [token]);

  // Charger les widgets au montage
  useEffect(() => {
    fetchConsignes();
    fetchPonctualite();
    fetchAnomalies();
    fetchEvenements();
    fetchScore();
    fetchFeedbacks();
  }, [fetchConsignes, fetchPonctualite, fetchAnomalies, fetchEvenements, fetchScore, fetchFeedbacks]);

  // Candidater í  un remplacement (avec confirmation)
  const [pendingCandidatureId, setPendingCandidatureId] = useState(null);
  
  const handleCandidater = (demandeId, demande) => {
    if (!token || candidatingId) return;
    
    // Récupérer la date et heure du shift
    const shiftDate = demande?.shift?.date || demande?.date;
    const shiftStartTime = demande?.shift?.heureDebut || demande?.heureDebut || '09:00';
    
    if (shiftDate) {
      // Utiliser les utilitaires centralisés pour éviter les problèmes de timezone
      
      // Vérifier si le shift a déjà commencé
      if (isShiftStarted(shiftDate, shiftStartTime)) {
        showToast('Ce créneau a déjà commencé, impossible de candidater', 'error');
        return;
      }
      
      // Délai minimum 1h (60 minutes) avant
      if (isShiftStartingWithin(shiftDate, shiftStartTime, 60)) {
        showToast('Délai trop court ! Impossible de candidater moins d\'1h avant le créneau', 'error');
        return;
      }
    }
    
    setPendingCandidatureId(demandeId);
    
    // Construire un message informatif avec formatage correct
    const shiftEnd = demande?.shift?.heureFin || demande?.heureFin;
    const shiftDateTime = createLocalDateTime(shiftDate, '12:00');
    const displayDate = shiftDateTime 
      ? shiftDateTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';
    const heureStr = shiftStartTime && shiftEnd ? `${shiftStartTime.slice(0,5)} - ${shiftEnd.slice(0,5)}` : '';
    
    setConfirmModal({
      show: true,
      title: 'Confirmer la candidature',
      message: `Voulez-vous candidater pour ce remplacement ?${displayDate ? `\n\n📅 ${displayDate}` : ''}${heureStr ? `\n° ${heureStr}` : ''}`,
      type: 'info',
      onConfirm: () => confirmCandidater(demandeId)
    });
  };
  
  const confirmCandidater = async (demandeId) => {
    setConfirmModal({ show: false, title: '', message: '', onConfirm: null, type: 'warning' });
    setCandidatingId(demandeId);
    try {
      await axios.post(`${API_BASE}/api/remplacements/${demandeId}/candidater`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Rafraîchir les données
      fetchRemplacements();
      showToast('Candidature envoyée avec succès !', 'success');
    } catch (err) {
      console.error('Erreur candidature:', err);
      showToast(err.response?.data?.error || 'Erreur lors de la candidature', 'error');
    } finally {
      setCandidatingId(null);
      setPendingCandidatureId(null);
    }
  };

  // Annuler une candidature
  const handleAnnulerCandidature = async (candidatureId) => {
    if (!token) return;
    try {
      await axios.delete(`${API_BASE}/api/remplacements/candidature/${candidatureId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRemplacements();
      showToast('Candidature annulée', 'success');
    } catch (err) {
      console.error('Erreur annulation:', err);
      showToast(err.response?.data?.error || 'Erreur lors de l\'annulation', 'error');
    }
  };
  
  // Fonction utilitaire pour afficher un toast
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Annuler ma demande de remplacement
  const [annulationDemandeId, setAnnulationDemandeId] = useState(null);
  const [pendingAnnulationId, setPendingAnnulationId] = useState(null);
  
  const handleAnnulerDemande = (demandeId) => {
    if (!token || annulationDemandeId) return;
    setPendingAnnulationId(demandeId);
    setConfirmModal({
      show: true,
      title: 'Annuler la demande',
      message: 'Êtes-vous sûr de vouloir annuler cette demande de remplacement ?',
      type: 'warning',
      onConfirm: () => confirmAnnulerDemande(demandeId)
    });
  };
  
  const confirmAnnulerDemande = async (demandeId) => {
    setConfirmModal({ show: false, title: '', message: '', onConfirm: null, type: 'warning' });
    setAnnulationDemandeId(demandeId);
    try {
      await axios.delete(`${API_BASE}/api/remplacements/${demandeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRemplacements();
      showToast('Demande annulée avec succès', 'success');
    } catch (err) {
      console.error('Erreur annulation demande:', err);
      showToast(err.response?.data?.error || 'Erreur lors de l\'annulation', 'error');
    } finally {
      setAnnulationDemandeId(null);
      setPendingAnnulationId(null);
    }
  };

  // Ouvrir le modal pour demander un remplacement sur un shift
  const handleOpenDemandeModal = (shift) => {
    // Récupérer l'heure de début du shift
    const shiftStartTime = shift.segments?.[0]?.start || shift.heureDebut || '09:00';
    
    // ═══ PROTECTIONS INTELLIGENTES (utilisant parisTimeUtils) •••
    
    // 1. Shift passé (date entièrement passée)
    if (isShiftInPast(shift.date)) {
      showToast('Impossible de demander un remplacement pour un shift passé', 'error');
      return;
    }
    
    // 2. Shift déjà commencé
    if (isShiftStarted(shift.date, shiftStartTime)) {
      showToast('Ce créneau a déjà commencé, impossible de demander un remplacement', 'error');
      return;
    }
    
    // 3. Délai minimum de préavis (2h = 120 minutes avant le début)
    if (isShiftStartingWithin(shift.date, shiftStartTime, 120)) {
      showToast('Délai trop court ! Prévenez au moins 2h avant le début du créneau', 'error');
      return;
    }
    
    // 4. Vérifier si une demande existe déjà pour ce shift
    const existingDemande = mesDemandes.find(d => d.shiftId === shift.id || d.shift_id === shift.id);
    if (existingDemande) {
      const statutDemande = existingDemande.statut || 'en attente';
      if (statutDemande === 'en attente') {
        showToast('Une demande est déjà en attente pour ce shift', 'error');
      } else if (statutDemande === 'acceptee' || statutDemande === 'acceptée') {
        showToast('Un remplaçant a déjà été trouvé pour ce shift', 'error');
      } else {
        showToast('Une demande existe déjà pour ce shift', 'error');
      }
      return;
    }
    
    // 5. Limite de demandes actives (max 3 en simultané pour éviter abus)
    const demandesActives = mesDemandes.filter(d => 
      d.statut === 'en attente' || d.statut === 'en_attente'
    );
    if (demandesActives.length >= 3) {
      showToast('Vous avez déjà 3 demandes de remplacement en cours. Attendez qu\'une soit traitée.', 'error');
      return;
    }
    
    // 6. Vérifier si c'est un shift en congé (ne devrait pas arriver mais sécurité)
    if (shift.estEnConge) {
      showToast('Vous êtes en congé ce jour-là, pas besoin de remplacement', 'error');
      return;
    }
    
    // ═══ Tout est OK, ouvrir le modal •••
    setSelectedShiftForDemande(shift);
    setDemandeMotif('');
    setDemandePriorite('normale');
    setDemandeCommentaire('');
    setShowDemandeModal(true);
  };

  // Créer une demande de remplacement
  const handleCreerDemande = async () => {
    if (!token || !selectedShiftForDemande || !demandeMotif.trim()) return;
    setCreatingDemande(true);
    try {
      await axios.post(`${API_BASE}/api/remplacements/demande`, {
        shiftId: selectedShiftForDemande.id,
        motif: demandeMotif.trim(),
        priorite: demandePriorite,
        commentaire: demandeCommentaire.trim() || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowDemandeModal(false);
      setSelectedShiftForDemande(null);
      // Rafraîchir les demandes
      fetchRemplacements();
      showToast('Demande de remplacement créée avec succès !', 'success');
    } catch (err) {
      console.error('Erreur création demande:', err);
      showToast(err.response?.data?.error || 'Erreur lors de la création', 'error');
    } finally {
      setCreatingDemande(false);
    }
  };

  // Dérivés utiles (mémo pour éviter recalculs) - simplifié
  const derived = useMemo(() => {
    if (!pointages || pointages.length === 0) return {
      last: null,
      first: null,
      sorted: [],
      anomaly: false
    };
    const getDate = (p) => new Date(p.horodatage || p.date || p.createdAt || p.timestamp || p.time);
    const sorted = [...pointages].sort((a,b)=>getDate(a)-getDate(b));
    const first = sorted[0];
    const last = sorted[sorted.length-1];
    const anomaly = sorted.length % 2 === 1;
    return { last, first, sorted, anomaly };
  }, [pointages]);

  const formatTime = (p) => {
    if (!p) return '--:--';
    const d = new Date(p.horodatage || p.date || p.createdAt || p.timestamp || p.time);
    if (isNaN(d)) return '--:--';
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const pointageType = (p) => (p?.type || p?.type_pointage || p?.nature || '').toString();

  // Calcul de la semaine affichée pour le planning
  const getWeekDates = useMemo(() => {
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

  // Helper pour formater les horaires d'un shift
  const getShiftHoraires = (shift) => {
    if (!shift.segments || shift.segments.length === 0) return '--:--';
    const segs = shift.segments.filter(s => s.type?.toLowerCase() !== 'pause');
    if (segs.length === 0) return '--:--';
    const first = segs[0].start || segs[0].debut;
    const last = segs[segs.length - 1].end || segs[segs.length - 1].fin;
    return `${first?.slice(0,5)} - ${last?.slice(0,5)}`;
  };

  // Style par type de shift
  const getTypeStyle = (type) => {
    switch(type?.toLowerCase()) {
      case 'matin': return { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', icon: Sun };
      case 'soir': return { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-400', icon: Moon };
      case 'nuit': return { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400', icon: Moon };
      case 'coupure': return { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', icon: Coffee };
      default: return { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', icon: Briefcase };
    }
  };

  // Calculer le prochain shift
  const nextShift = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return myShifts
      .filter(s => new Date(s.date) >= today && !s.estEnConge)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  }, [myShifts]);

  // Statut de pointage actuel
  const pointageStatus = useMemo(() => {
    if (!pointages || pointages.length === 0) return { status: 'none', label: 'Non pointé' };
    const isOdd = pointages.length % 2 === 1;
    if (isOdd) return { status: 'working', label: 'En service' };
    return { status: 'ended', label: 'Journée terminée' };
  }, [pointages]);

  // Scroll automatique vers la section highlightée
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

  // Auto-expand et scroll vers la consigne spécifique si highlightée
  useEffect(() => {
    if (highlightedConsigneId && consignes.length > 0) {
      // Trouver l'index de la consigne highlightée
      const highlightedIndex = consignes.findIndex(c => c.id === Number(highlightedConsigneId));
      
      // Si la consigne est au-delà des 3 premières, on expand la liste
      if (highlightedIndex >= 3) {
        setShowAllConsignes(true);
      }
      
      // Scroll vers la consigne spécifique après un délai
      setTimeout(() => {
        const consigneElement = document.getElementById(`consigne-${highlightedConsigneId}`);
        if (consigneElement) {
          consigneElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
    }
  }, [highlightedConsigneId, consignes]);

  // Calculer si les données principales sont chargées
  const isDataLoading = loadingStats || loadingShifts || loadingScore;

  // Afficher le splash screen au démarrage (pendant le chargement des données)
  if (showSplash) {
    return <SplashScreen onComplete={completeSplash} isLoading={isDataLoading} minDuration={1500} />;
  }

  // Afficher l'onboarding pour les nouveaux utilisateurs
  if (showOnboarding) {
    return <MobileOnboarding onComplete={completeOnboarding} userName={prenom} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-navbar lg:pb-8 lg:pt-14 flex flex-col transition-colors pt-header">
      
      {/* ══════════════════════════════════════════════════════════════════
          ANIMATION LEVEL UP - Style Jeu Vidéo
      ══════════════════════════════════════════════════════════════════ */}
      {showLevelUp && (
        <LevelUpAnimation 
          oldNiveau={levelUpOldNiveau}
          newNiveau={levelUpNewNiveau}
          phase={levelUpPhase}
          onClose={() => {
            setShowLevelUp(false);
            setLevelUpPhase(0);
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BOUTON TEST LEVEL UP (à supprimer en prod)
      ══════════════════════════════════════════════════════════════════ */}
      <button
        onClick={() => triggerLevelUpAnimation(NIVEAUX_CONFIG[0], NIVEAUX_CONFIG[1])}
        className="fixed bottom-24 right-4 z-50 bg-red-600 text-white px-3 py-2 rounded-full shadow-lg text-xs font-bold hover:bg-red-700"
      >
        🚨 Test À surveiller → Bronze
      </button>

      {/* ══════════════════════════════════════════════════════════════════
          BANNIÈRE INSTALLATION PWA
      ══════════════════════════════════════════════════════════════════ */}
      <InstallPWABanner autoShow={true} delay={10000} position="bottom" />

      {/* ══════════════════════════════════════════════════════════════════
          HEADER SOBRE & MODERNE
      ══════════════════════════════════════════════════════════════════ */}
      <div style={{ backgroundColor: brand }} className="px-4 pt-5 pb-8">
        {/* Salutation + Heure */}
        <div className="flex items-center justify-between">
          {/* Salutation */}
          <div className="min-w-0">
            <p className="text-white/80 text-sm">Bienvenue</p>
            <h1 className="text-xl font-semibold text-white mt-0.5">
              {prenom}
            </h1>
          </div>
          
          {/* Horloge simple */}
          <div className="text-right">
            <div className="font-mono text-3xl font-light text-white tabular-nums">
              {timeStr.slice(0, 5)}
            </div>
            <p className="text-white/60 text-xs capitalize">{dateStr}</p>
          </div>
        </div>
      </div>
      
      {/* Cards de gamification - Score | Ponctualité | Badges | Feedback */}
      <div className="px-4 -mt-5">
        <div className="grid grid-cols-4 gap-2" aria-live="polite">
          {/* Card 1: Score & Niveau */}
          <button 
            onClick={() => setShowScoreModal(true)}
            className="bg-white dark:bg-gray-800 rounded-xl p-2.5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
          >
            <div className="flex flex-col items-center text-center">
              {loadingScore ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse mb-1" />
                  <div className="h-2 w-6 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
                </>
              ) : (
                <>
                  {(() => {
                    const totalPts = scoreData?.score?.total_points || scoreData?.score?.score_total || 0;
                    const isNeg = totalPts < 0;
                    const niveau = getNiveau(totalPts);
                    
                    // Couleurs du badge selon le score
                    let badgeBg = 'bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30';
                    let textColor = 'text-amber-600 dark:text-amber-400';
                    let icon = <Medal className="w-4 h-4 text-amber-600" />;
                    
                    if (isNeg) {
                      badgeBg = 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30';
                      textColor = 'text-red-600 dark:text-red-400';
                      icon = <AlertTriangle className="w-4 h-4 text-red-500" />;
                    } else if (niveau.label === 'Diamant') {
                      badgeBg = 'bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30';
                      textColor = 'text-cyan-600 dark:text-cyan-400';
                      icon = <Gem className="w-4 h-4 text-cyan-500" />;
                    } else if (niveau.label === 'Or') {
                      badgeBg = 'bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30';
                      textColor = 'text-yellow-600 dark:text-yellow-400';
                      icon = <Medal className="w-4 h-4 text-yellow-500" />;
                    } else if (niveau.label === 'Argent') {
                      badgeBg = 'bg-gradient-to-br from-slate-100 to-gray-200 dark:from-slate-800/30 dark:to-gray-700/30';
                      textColor = 'text-gray-500 dark:text-gray-400';
                      icon = <Medal className="w-4 h-4 text-gray-400" />;
                    }
                    
                    return (
                      <>
                        <div className={`w-8 h-8 rounded-full ${badgeBg} flex items-center justify-center mb-1 ${isNeg ? 'animate-pulse' : ''}`}>
                          {icon}
                        </div>
                        <div className="text-[8px] text-gray-400 uppercase font-medium">Score</div>
                        <div className={`text-[10px] font-bold ${textColor}`}>
                          {totalPts}
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </button>
          
          {/* Card 2: Ponctualité */}
          <Link 
            to="/pointage"
            className="bg-white dark:bg-gray-800 rounded-xl p-2.5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col items-center text-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                statsPonctualite?.ponctualiteMois >= 95 
                  ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                  : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                <Trophy className={`w-4 h-4 ${
                  statsPonctualite?.ponctualiteMois >= 95 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-amber-600 dark:text-amber-400'
                }`} />
              </div>
              <div className="text-[8px] text-gray-400 uppercase font-medium">Ponctualité</div>
              {loadingPonctualite ? (
                <div className="h-3 w-6 rounded bg-gray-200 dark:bg-gray-600 animate-pulse" />
              ) : (
                <div className={`text-[10px] font-semibold ${
                  statsPonctualite?.ponctualiteMois >= 95 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {statsPonctualite?.ponctualiteMois ?? '--'}%
                </div>
              )}
            </div>
          </Link>
          
          {/* Card 3: Badges */}
          <button 
            onClick={() => setShowBadgesModal(true)}
            className="bg-white dark:bg-gray-800 rounded-xl p-2.5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 flex items-center justify-center mb-1">
                <Award className="w-4 h-4 text-red-500 dark:text-red-400" />
              </div>
              <div className="text-[8px] text-gray-400 uppercase font-medium">Badges</div>
              <div className="text-[10px] font-semibold text-red-500 dark:text-red-400">
                {scoreData?.stats ? BADGES.filter(b => b.condition(scoreData.stats)).length : 0}/{BADGES.length}
              </div>
            </div>
          </button>
          
          {/* Card 4: Feedback */}
          <Link 
            to="/feedback"
            className="bg-white dark:bg-gray-800 rounded-xl p-2.5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 flex items-center justify-center mb-1 relative">
                <ThumbsUp className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                {feedbacksRestants > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {feedbacksRestants}
                  </span>
                )}
              </div>
              <div className="text-[8px] text-gray-400 uppercase font-medium">Feedback</div>
              <div className="text-[10px] font-semibold text-pink-600 dark:text-pink-400">
                {feedbacksRecus.filter(f => f.statut === 'approved' || f.status === 'approved').length} reçu{feedbacksRecus.filter(f => f.statut === 'approved' || f.status === 'approved').length > 1 ? 's' : ''}
              </div>
            </div>
          </Link>
        </div>
        
        {/* Barre de progression vers prochain niveau */}
        {!loadingScore && scoreData?.score && (() => {
          const totalPoints = scoreData.score.total_points || scoreData.score.score_total || 0;
          const isNegative = totalPoints < 0;
          const niveaux = [
            { min: 0, max: 100, label: 'Bronze', icon: <Medal className="w-4 h-4 text-amber-600" /> },
            { min: 100, max: 300, label: 'Argent', icon: <Medal className="w-4 h-4 text-gray-400" /> },
            { min: 300, max: 500, label: 'Or', icon: <Medal className="w-4 h-4 text-yellow-500" /> },
            { min: 500, max: Infinity, label: 'Diamant', icon: <Gem className="w-4 h-4 text-cyan-500" /> }
          ];
          
          // Gestion des scores négatifs
          if (isNegative) {
            const pointsToZero = Math.abs(totalPoints);
            // Progression: plus on approche de 0, plus la barre se remplit (vers la droite = Bronze)
            // Ex: -100pts = 0%, -50pts = 50%, -10pts = 90%, 0pts = 100%
            const maxNegative = 100; // On considère -100 comme le pire cas
            const negativeProgress = Math.max(0, Math.min(100, ((maxNegative - pointsToZero) / maxNegative) * 100));
            
            return (
              <div className="mt-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5 shadow-sm border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <div className="flex items-center relative">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[7px] text-red-400 font-medium whitespace-nowrap">Alerte</span>
                  </div>
                  <div className="flex-1 h-2.5 bg-gradient-to-r from-red-200 via-red-100 to-amber-100 dark:from-red-900/50 dark:via-red-800/30 dark:to-amber-900/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 via-orange-400 to-amber-400 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${negativeProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center relative">
                    <Medal className="w-4 h-4 text-amber-600" />
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[7px] text-amber-500 font-medium">Bronze</span>
                  </div>
                </div>
                <p className="text-[10px] text-red-500 dark:text-red-400 text-center mt-4">
                  Gagnez <span className="font-semibold text-red-600 dark:text-red-400">{pointsToZero} pts</span> pour atteindre Bronze
                </p>
              </div>
            );
          }
          
          const currentIdx = niveaux.findIndex(n => totalPoints >= n.min && totalPoints < n.max);
          const current = niveaux[Math.max(0, currentIdx === -1 ? niveaux.length - 1 : currentIdx)];
          const next = currentIdx < niveaux.length - 1 ? niveaux[currentIdx + 1] : null;
          const progress = current.max === Infinity ? 100 : Math.min(100, ((totalPoints - current.min) / (current.max - current.min)) * 100);
          
          return next ? (
            <div className="mt-2.5 bg-white dark:bg-gray-800 rounded-xl px-3 py-2.5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {current.icon}
                </div>
                <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center">
                  {next.icon}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1.5">
                Plus que <span className="font-semibold text-amber-600 dark:text-amber-400">{next.min - totalPoints} pts</span> pour {next.label}
              </p>
            </div>
          ) : (
            <div className="mt-2.5 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl px-3 py-2.5 border border-cyan-200 dark:border-cyan-800/50">
              <p className="text-xs text-center text-cyan-700 dark:text-cyan-300 flex items-center justify-center gap-1.5">
                <Gem className="w-4 h-4 text-cyan-500" />
                <span className="font-medium">Niveau max ! Tu es une légende</span>
                <Gem className="w-4 h-4 text-cyan-500" />
              </p>
            </div>
          );
        })()}
        
        {/* Widget Score Personnel - masqué car intégré dans la jauge KPI */}
        {/* <ScoreWidget className="mt-4" /> */}
        
        {/* Preview Badges - masqué car intégré dans KPI */}
        {/* <BadgesPreview className="mt-3" /> */}
      </div>
      
      {/* ═══════════════════════════════════════════════════════════════════════════
          WIDGET PLANNING - Design épuré cohérent avec la charte de l'app
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="px-3 sm:px-4 mt-4 sm:mt-6">
        <section className="mb-5">
          <div 
            id="planning-section"
            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden scroll-mt-highlight transition-all duration-300 ${
              isPlanningHighlighted ? 'ring-2 ring-[#cf292c]' : ''
            }`}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${brand}10` }}
                  >
                    <Calendar className="w-4 h-4" style={{color: brand}} />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Mon Planning</h2>
                </div>
                <Link 
                  to="/planning"
                  className="flex items-center gap-1 text-xs font-medium transition-all hover:opacity-70"
                  style={{ color: brand }}
                >
                  <span>Voir tout</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Contenu */}
            <div className="p-3">
              {loadingShifts ? (
                <div className="space-y-2">
                  <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                  <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                </div>
              ) : (
                <>
                  {(() => {
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const todayStr = toLocalDateString(today);
                    
                    // Calculer les dates de la semaine
                    const getWeekDatesArray = () => {
                      const d = new Date(today);
                      const day = d.getDay();
                      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                      const monday = new Date(d.setDate(diff));
                      monday.setHours(0,0,0,0);
                      return Array.from({ length: 7 }, (_, i) => {
                        const date = new Date(monday);
                        date.setDate(monday.getDate() + i);
                        return date;
                      });
                    };
                    
                    const weekDates = getWeekDatesArray();
                    const joursSemaine = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
                    
                    // Stats
                    const weekShifts = myShifts.filter(s => {
                      const sDate = toLocalDateString(s.date);
                      return weekDates.some(d => toLocalDateString(d) === sDate);
                    });
                    
                    const joursTravailes = weekShifts.filter(s => !s.estEnConge && s.type !== 'absence').length;
                    
                    const totalMinutes = weekShifts
                      .filter(s => !s.estEnConge && s.type !== 'absence')
                      .reduce((acc, s) => {
                        const segments = s.segments || [];
                        return acc + segments.reduce((sum, seg) => {
                          if (seg.type?.toLowerCase() === 'pause') return sum;
                          const start = seg.start || seg.debut;
                          const end = seg.end || seg.fin;
                          if (!start || !end) return sum;
                          const [sH, sM] = start.split(':').map(Number);
                          const [eH, eM] = end.split(':').map(Number);
                          let dur = (eH * 60 + eM) - (sH * 60 + sM);
                          if (dur < 0) dur += 24 * 60;
                          return sum + dur;
                        }, 0);
                      }, 0);
                    const heuresTotal = Math.floor(totalMinutes / 60);
                    const minutesReste = totalMinutes % 60;

                    // Jour sélectionné (null = aujourd'hui)
                    const selectedDateStr = selectedWidgetDay || todayStr;
                    const selectedDate = weekDates.find(d => toLocalDateString(d) === selectedDateStr) || today;
                    const isSelectedToday = selectedDateStr === todayStr;
                    
                    // Shift du jour sélectionné
                    const shiftSelectionne = myShifts
                      .filter(s => {
                        const sDate = toLocalDateString(s.date);
                        return sDate === selectedDateStr && !s.estEnConge && s.type !== 'absence';
                      })[0];

                    return (
                      <>
                        {/* Mini calendrier semaine cliquable */}
                        <div className="grid grid-cols-7 gap-1 mb-3">
                          {weekDates.map((date, idx) => {
                            const dateStr = toLocalDateString(date);
                            const isToday = dateStr === todayStr;
                            const isSelected = dateStr === selectedDateStr;
                            const isPast = date < today && !isToday;
                            const shift = myShifts.find(s => toLocalDateString(s.date) === dateStr);
                            const hasShift = !!shift && !shift.estEnConge && shift.type !== 'absence';
                            const isConge = shift?.estEnConge || shift?.type === 'absence';
                            
                            return (
                              <button 
                                key={idx}
                                onClick={() => setSelectedWidgetDay(isToday ? null : dateStr)}
                                className={`flex flex-col items-center py-1.5 rounded-lg transition-all cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  isSelected 
                                    ? 'ring-2 ring-offset-1' 
                                    : isPast ? 'opacity-50' : ''
                                }`}
                                style={isSelected ? { 
                                  backgroundColor: `${brand}10`,
                                  '--tw-ring-color': brand
                                } : {}}
                              >
                                <span className={`text-[9px] font-medium ${
                                  isSelected ? '' : 'text-gray-400 dark:text-gray-500'
                                }`} style={isSelected ? { color: brand } : {}}>
                                  {joursSemaine[idx]}
                                </span>
                                <span className={`text-xs font-bold ${
                                  isSelected ? '' : 'text-gray-700 dark:text-gray-300'
                                }`} style={isSelected ? { color: brand } : {}}>
                                  {date.getDate()}
                                </span>
                                <div className="mt-0.5 h-1.5 w-1.5 rounded-full" style={{
                                  backgroundColor: hasShift 
                                    ? brand 
                                    : isConge ? '#10b981' : 'transparent'
                                }}></div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Stats inline */}
                        <div className="flex items-center justify-between px-2 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-3">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{heuresTotal}h{minutesReste > 0 ? String(minutesReste).padStart(2,'0') : ''}</span>
                              <p className="text-[9px] text-gray-500">cette sem.</p>
                            </div>
                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-600"></div>
                            <div className="text-center">
                              <span className="text-sm font-bold" style={{ color: brand }}>{joursTravailes}</span>
                              <p className="text-[9px] text-gray-500">jours</p>
                            </div>
                          </div>
                          {/* Créneau du shift sélectionné (calculé dynamiquement) */}
                          {shiftSelectionne && (() => {
                            // Calculer le créneau depuis les segments
                            const creneau = getCreneauFromSegments(shiftSelectionne.segments);
                            if (!creneau) return null;
                            
                            const style = getCreneauStyle(creneau);
                            const CreneauIcon = style.Icon;
                            
                            return (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: `${style.colorHex}15` }}>
                                <CreneauIcon className="w-3.5 h-3.5" style={{ color: style.colorHex }} />
                                <span className="text-xs font-semibold" style={{ color: style.colorHex }}>
                                  {style.label}
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Shift du jour sélectionné card */}
                        {shiftSelectionne ? (
                          <Link to="/planning" className="block">
                            {(() => {
                              const creneau = getCreneauFromSegments(shiftSelectionne.segments);
                              const style = creneau ? getCreneauStyle(creneau) : { Icon: Briefcase, colorHex: brand, label: 'Travail' };
                              const CreneauIcon = style.Icon;
                              
                              return (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                  {/* Icône créneau */}
                                  <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: `${style.colorHex}15` }}
                                  >
                                    <CreneauIcon className="w-5 h-5" style={{ color: style.colorHex }} />
                                  </div>
                                  
                                  {/* Infos */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {(() => {
                                          const segments = shiftSelectionne.segments?.filter(s => s.type?.toLowerCase() !== 'pause') || [];
                                          if (segments.length === 0) return '--:-- → --:--';
                                          
                                          // Détecter si coupure (gap >= 2h entre segments)
                                          let hasCoupure = false;
                                          for (let i = 0; i < segments.length - 1; i++) {
                                            const currentEnd = segments[i].end || segments[i].fin;
                                            const nextStart = segments[i + 1].start || segments[i + 1].debut;
                                            if (currentEnd && nextStart) {
                                              const [endH, endM] = currentEnd.split(':').map(Number);
                                              const [startH, startM] = nextStart.split(':').map(Number);
                                              if ((startH * 60 + startM) - (endH * 60 + endM) >= 120) {
                                                hasCoupure = true;
                                                break;
                                              }
                                            }
                                          }
                                          
                                          if (hasCoupure && segments.length > 1) {
                                            // Afficher premier créneau seulement
                                            const first = segments[0];
                                            return `${(first.start || first.debut)?.slice(0,5)} → ${(first.end || first.fin)?.slice(0,5)}`;
                                          } else {
                                            const heureDebut = segments[0]?.start || segments[0]?.debut;
                                            const heureFin = segments[segments.length - 1]?.end || segments[segments.length - 1]?.fin;
                                            return `${heureDebut?.slice(0,5) || '--:--'} → ${heureFin?.slice(0,5) || '--:--'}`;
                                          }
                                        })()}
                                      </span>
                                      {/* Afficher autres créneaux si coupure */}
                                      {(() => {
                                        const segments = shiftSelectionne.segments?.filter(s => s.type?.toLowerCase() !== 'pause') || [];
                                        if (segments.length <= 1) return null;
                                        
                                        let hasCoupure = false;
                                        for (let i = 0; i < segments.length - 1; i++) {
                                          const currentEnd = segments[i].end || segments[i].fin;
                                          const nextStart = segments[i + 1].start || segments[i + 1].debut;
                                          if (currentEnd && nextStart) {
                                            const [endH, endM] = currentEnd.split(':').map(Number);
                                            const [startH, startM] = nextStart.split(':').map(Number);
                                            if ((startH * 60 + startM) - (endH * 60 + endM) >= 120) {
                                              hasCoupure = true;
                                              break;
                                            }
                                          }
                                        }
                                        
                                        if (!hasCoupure) return null;
                                        
                                        return segments.slice(1).map((seg, i) => (
                                          <span key={i} className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                                            + {(seg.start || seg.debut)?.slice(0,5)} → {(seg.end || seg.fin)?.slice(0,5)}
                                          </span>
                                        ));
                                      })()}
                                      {isSelectedToday && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ backgroundColor: brand }}>
                                          AUJOURD'HUI
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                      {style.label} · {new Date(shiftSelectionne.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                                    </p>
                                  </div>
                                  
                                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                </div>
                              );
                            })()}
                          </Link>
                        ) : (
                          <div className="text-center py-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                            <CalendarOff className="w-6 h-6 mx-auto text-gray-300 dark:text-gray-600 mb-1" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {isSelectedToday ? "Pas de shift aujourd'hui" : `Pas de shift le ${selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}`}
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Bandeau remplacements */}
                  {remplacementsDisponibles.length > 0 && (
                    <Link 
                      to="/planning?tab=remplacements"
                      id="remplacements-section"
                      className={`mt-3 flex items-center justify-between p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 transition-all hover:bg-purple-100 dark:hover:bg-purple-900/30 ${
                        isRemplacementsHighlighted ? 'ring-2 ring-[#cf292c]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                          <UserPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-xs font-medium text-purple-900 dark:text-purple-100">
                          {remplacementsDisponibles.length} remplacement{remplacementsDisponibles.length > 1 ? 's' : ''} dispo
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-purple-400" />
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          WIDGETS INFORMATIFS - Split Layout: Infos du jour / À venir
       */}
      <div className="px-3 sm:px-4 mt-4 sm:mt-6">
        <section className="mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            
            {/* Widget: Consignes du jour - Design sobre */}
            <div 
              id="consignes-section"
              className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden scroll-mt-highlight transition-all duration-300 ${
                isConsignesHighlighted ? 'ring-2 ring-[#cf292c]' : ''
              }`}
            >
              {/* Header sobre */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center" 
                  style={{ backgroundColor: `${brand}10` }}
                >
                  <Megaphone className="w-4 h-4" style={{ color: brand }} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">Infos du jour</h3>
                {consignes.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium">
                    {consignes.length}
                  </span>
                )}
              </div>

              {/* Contenu */}
              <div className="p-3">
                {loadingConsignes ? (
                  <div className="space-y-2">
                    <div className="h-14 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                  </div>
                ) : consignes.length === 0 ? (
                  <div className="text-center py-6">
                    <div 
                      className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${brand}08` }}
                    >
                      <Megaphone className="w-6 h-6" style={{ color: brand, opacity: 0.4 }} />
                    </div>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Aucune consigne</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(showAllConsignes ? consignes : consignes.slice(0, 3)).map(consigne => (
                      <ConsigneCard 
                        key={consigne.id} 
                        consigne={consigne} 
                        isHighlighted={highlightedConsigneId && consigne.id === Number(highlightedConsigneId)}
                      />
                    ))}
                    
                    {/* Bouton Voir plus / Voir moins - sobre */}
                    {consignes.length > 3 && (
                      <button
                        onClick={() => setShowAllConsignes(!showAllConsignes)}
                        className="w-full py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        {showAllConsignes ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Réduire
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            +{consignes.length - 3} message{consignes.length - 3 > 1 ? 's' : ''}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Widget: À venir - Design épuré */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center" 
                    style={{ backgroundColor: `${brand}10` }}
                  >
                    <CalendarCheck className="w-4 h-4" style={{ color: brand }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">À venir</span>
                  {evenementsAVenir.length > 0 && (
                    <span 
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${brand}15`, color: brand }}
                    >
                      {evenementsAVenir.length}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Contenu */}
              <div className="p-3">
                {loadingEvenements ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700 rounded" />
                          <div className="h-2.5 w-14 bg-gray-100 dark:bg-gray-700 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : evenementsAVenir.length === 0 ? (
                  <div className="text-center py-5">
                    <div 
                      className="w-11 h-11 mx-auto rounded-lg flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${brand}08` }}
                    >
                      <CalendarCheck className="w-5 h-5" style={{ color: brand, opacity: 0.4 }} />
                    </div>
                    <p className="text-xs text-gray-400">Rien de prévu</p>
                  </div>
                ) : (() => {
                  const today = new Date();
                  
                  return (
                    <div className="space-y-1">
                      {evenementsAVenir.slice(0, 4).map((evt, idx) => {
                        const getEventStyle = (type) => {
                          switch(type) {
                            case 'conge': return { icon: Plane, color: '#10b981', label: 'Congé' };
                            case 'remplacement': return { icon: UserCheck, color: '#3b82f6', label: 'Remplacement' };
                            case 'formation': return { icon: GraduationCap, color: '#8b5cf6', label: 'Formation' };
                            case 'visite_medicale': return { icon: Stethoscope, color: '#f43f5e', label: 'Visite médicale' };
                            case 'shift_special': return { icon: CalendarDays, color: '#f59e0b', label: 'Shift spécial' };
                            default: return { icon: Calendar, color: '#6b7280', label: 'Événement' };
                          }
                        };
                        const style = getEventStyle(evt.type);
                        const EventIcon = style.icon;
                        
                        const evtDate = new Date(evt.date);
                        const diffTime = evtDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        const dateLabel = evtDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                        
                        return (
                          <div 
                            key={`${evt.type}-${evt.id || idx}`}
                            className="flex items-center gap-3 p-2 rounded-lg"
                          >
                            {/* Icône */}
                            <div 
                              className="w-9 h-9 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${style.color}12` }}
                            >
                              <EventIcon className="w-4 h-4" style={{ color: style.color }} />
                            </div>
                            
                            {/* Contenu */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
                                {evt.label || style.label}
                              </p>
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
                                {dateLabel}
                              </p>
                            </div>
                            
                            {/* Badge J-X */}
                            <span className={`text-[10px] font-semibold ${
                              diffDays <= 1 ? 'text-rose-500' : 
                              diffDays <= 3 ? 'text-amber-500' : 
                              'text-gray-400'
                            }`}>
                              J-{diffDays}
                            </span>
                          </div>
                        );
                      })}
                      
                      {/* Footer */}
                      <Link
                        to="/mes-conges"
                        className="flex items-center justify-center gap-1.5 w-full py-2 mt-1 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: `${brand}10`, color: brand }}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Gérer
                      </Link>
                    </div>
                  );
                })()}
              </div>
            </div>
            
          </div>
        </section>

      </div>

      {/* Modal de demande de remplacement */}
      {showDemandeModal && selectedShiftForDemande && (
        <>
          {/* Overlay - z-index supérieur à la navbar pour couvrir tout */}
          <div 
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDemandeModal(false)}
          />
          
          {/* Container adaptatif - fullscreen collé en bas */}
          <div className="fixed inset-0 z-[61] flex items-end lg:items-center lg:justify-center lg:p-6">
            {/* Sheet mobile / Modal desktop */}
            <div className="w-full lg:w-[420px] max-h-full lg:max-h-[85vh] flex flex-col bg-white dark:bg-gray-800 rounded-t-3xl lg:rounded-2xl shadow-2xl overflow-hidden">
              
              {/* Header mobile avec poignée et X */}
              <div className="lg:hidden flex items-center justify-between px-4 pt-3 pb-1">
                <div className="w-8" />
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <button
                  onClick={() => setShowDemandeModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Header desktop */}
              <div className="hidden lg:flex px-5 py-4 items-center justify-between border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: brand + '15' }}>
                    <Hand className="w-5 h-5" style={{ color: brand }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Demande de remplacement</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(selectedShiftForDemande.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDemandeModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Header info mobile */}
              <div className="lg:hidden px-4 py-2 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: brand + '15' }}>
                  <Hand className="w-4 h-4" style={{ color: brand }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Demande de remplacement</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(selectedShiftForDemande.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })} · {getShiftHoraires(selectedShiftForDemande)}
                  </p>
                </div>
              </div>

              {/* Contenu scrollable */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
                
                {/* Motifs - grille compacte 3 colonnes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Motif
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'personnel', label: 'Personnel', icon: User, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
                      { value: 'sante', label: 'Santé', icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
                      { value: 'famille', label: 'Famille', icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
                      { value: 'etudes', label: 'Études', icon: FileText, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30' },
                      { value: 'transport', label: 'Transport', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
                      { value: 'autre', label: 'Autre', icon: Calendar, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' }
                    ].map(m => {
                      const MotifIcon = m.icon;
                      const isSelected = demandeMotif === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setDemandeMotif(m.value)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                            isSelected 
                              ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20' 
                              : `border-transparent ${m.bg}`
                          }`}
                        >
                          <MotifIcon className={`w-5 h-5 ${isSelected ? 'text-red-600 dark:text-red-400' : m.color}`} />
                          <span className={`text-xs font-medium ${isSelected ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                            {m.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priorité - boutons compacts */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Urgence
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'basse', label: 'Faible', activeBg: 'bg-gray-500' },
                      { value: 'normale', label: 'Normale', activeBg: 'bg-blue-500' },
                      { value: 'haute', label: 'Urgente', activeBg: 'bg-red-500' }
                    ].map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setDemandePriorite(p.value)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          demandePriorite === p.value 
                            ? `${p.activeBg} text-white shadow-md`
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Commentaire */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Commentaire <span className="text-gray-400 font-normal normal-case">(optionnel)</span>
                  </label>
                  <textarea
                    value={demandeCommentaire}
                    onChange={(e) => setDemandeCommentaire(e.target.value)}
                    placeholder="Précisez votre situation..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Actions - avec safe-area bottom pour iOS */}
              <div className="px-5 py-3 pb-safe border-t border-gray-100 dark:border-gray-700 flex gap-3 flex-shrink-0 bg-white dark:bg-gray-800" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
                <button
                  onClick={() => setShowDemandeModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreerDemande}
                  disabled={!demandeMotif || creatingDemande}
                  className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{ backgroundColor: brand }}
                >
                  {creatingDemande ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      <span>Envoi...</span>
                    </>
                  ) : (
                    'Envoyer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ Modal de détails du shift (remplacement info) ═══ */}
      {showShiftDetailsModal && selectedShiftDetails && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={() => setShowShiftDetailsModal(false)}
          />
          
          {/* Modal - fullscreen collé en bas */}
          <div className="fixed inset-0 z-[61] flex items-end lg:items-center lg:justify-center lg:p-6">
            <div className="w-full lg:w-[400px] max-h-full lg:max-h-[80vh] flex flex-col bg-white dark:bg-gray-800 rounded-t-3xl lg:rounded-2xl shadow-2xl overflow-hidden">
              
              {/* Header mobile avec poignée */}
              <div className="lg:hidden flex items-center justify-between px-4 pt-3 pb-1">
                <div className="w-8" />
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <button
                  onClick={() => setShowShiftDetailsModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Icône selon le statut */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      selectedShiftDetails.isRemplacement || selectedShiftDetails.motif?.toLowerCase()?.includes('remplacement')
                        ? 'bg-purple-100 dark:bg-purple-900/30'
                        : selectedShiftDetails.remplacementStatut === 'validee'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : selectedShiftDetails.remplacementStatut === 'acceptee'
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : 'bg-amber-100 dark:bg-amber-900/30'
                    }`}>
                      {selectedShiftDetails.isRemplacement || selectedShiftDetails.motif?.toLowerCase()?.includes('remplacement') ? (
                        <ArrowPathIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      ) : selectedShiftDetails.remplacementStatut === 'validee' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : selectedShiftDetails.remplacementStatut === 'acceptee' ? (
                        <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Détails du shift</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(selectedShiftDetails.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowShiftDetailsModal(false)}
                    className="hidden lg:flex p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Contenu */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                
                {/* Info shift de base */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Horaires</span>
                    {(() => {
                      const creneau = getCreneauFromSegments(selectedShiftDetails.segments);
                      const style = creneau ? getCreneauStyle(creneau) : null;
                      return style ? (
                        <span 
                          className="text-xs font-semibold px-2 py-1 rounded-full capitalize"
                          style={{ backgroundColor: `${style.colorHex}20`, color: style.colorHex }}
                        >
                          {style.label}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                    {getShiftHoraires(selectedShiftDetails)}
                  </div>
                  
                  {/* Priorité si c'est une demande */}
                  {selectedShiftDetails.priorite && selectedShiftDetails.priorite !== 'normale' && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                        selectedShiftDetails.priorite === 'urgente'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : selectedShiftDetails.priorite === 'haute'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                      }`}>
                        {selectedShiftDetails.priorite}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Info candidature - SI c'est ma candidature */}
                {selectedShiftDetails.isMyCandidate && selectedShiftDetails.employeAbsent && (
                  <div className="rounded-xl p-4 border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Votre candidature</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-gray-400">
                        {selectedShiftDetails.employeAbsent.prenom?.[0] || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedShiftDetails.employeAbsent.prenom} {selectedShiftDetails.employeAbsent.nom}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Employé à remplacer</p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                      {selectedShiftDetails.candidatureStatut === 'acceptee'
                        ? ' Votre candidature a été acceptée ! Vous devez effectuer ce shift.'
                        : selectedShiftDetails.candidatureStatut === 'refusee'
                          ? 'Votre candidature n\'a pas été retenue.'
                          : 'Votre candidature est en attente de validation par le manager.'}
                    </p>
                  </div>
                )}

                {/* Statut du remplacement si applicable (et pas une candidature) */}
                {!selectedShiftDetails.isMyCandidate && (selectedShiftDetails.remplacementStatut || selectedShiftDetails.isRemplacement || selectedShiftDetails.motif?.toLowerCase()?.includes('remplacement')) && (
                  <div className={`rounded-xl p-4 border ${
                    selectedShiftDetails.isRemplacement || selectedShiftDetails.motif?.toLowerCase()?.includes('remplacement')
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                      : selectedShiftDetails.remplacementStatut === 'validee'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                        : selectedShiftDetails.remplacementStatut === 'acceptee'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  }`}>
                    {/* Si c'est un remplacement que TU effectues */}
                    {(selectedShiftDetails.isRemplacement || selectedShiftDetails.motif?.toLowerCase()?.includes('remplacement')) ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <ArrowPathIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Vous êtes remplaçant</span>
                        </div>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          {selectedShiftDetails.motif || 'Vous effectuez ce shift en remplacement d\'un collègue.'}
                        </p>
                      </>
                    ) : (
                      <>
                        {/* Statut de la demande */}
                        <div className="flex items-center gap-2 mb-3">
                          {selectedShiftDetails.remplacementStatut === 'validee' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Remplacement confirmé</span>
                            </>
                          ) : selectedShiftDetails.remplacementStatut === 'acceptee' ? (
                            <>
                              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">En attente validation manager</span>
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Recherche d'un remplaçant</span>
                            </>
                          )}
                        </div>
                        
                        {/* Info remplaçant si validé */}
                        {selectedShiftDetails.remplacementStatut === 'validee' && selectedShiftDetails.remplacant && (
                          <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: brand }}>
                              {selectedShiftDetails.remplacant.prenom?.[0] || 'R'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {selectedShiftDetails.remplacant.prenom} {selectedShiftDetails.remplacant.nom}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Remplaçant confirmé</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Message en attente */}
                        {selectedShiftDetails.remplacementStatut === 'en_attente' && (
                          <div className="mt-3 space-y-2">
                            {selectedShiftDetails.nbCandidats > 0 && (
                              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                {selectedShiftDetails.nbCandidats} candidat{selectedShiftDetails.nbCandidats > 1 ? 's' : ''} en attente de validation
                              </p>
                            )}
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              {selectedShiftDetails.nbCandidats > 0 
                                ? 'Un manager doit valider l\'une des candidatures.'
                                : 'Votre demande est visible par vos collègues. Vous serez notifié dès qu\'un remplaçant se propose.'}
                            </p>
                          </div>
                        )}
                        
                        {/* Message accepté mais pas encore validé */}
                        {selectedShiftDetails.remplacementStatut === 'acceptee' && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Un collègue s'est proposé. En attente de validation par le manager.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Info complémentaire / Motif de la demande */}
                {(selectedShiftDetails.motifDemande || (selectedShiftDetails.motif && !selectedShiftDetails.motif.toLowerCase().includes('remplacement'))) && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
                      {selectedShiftDetails.motifDemande ? 'Motif de la demande' : 'Note'}
                    </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedShiftDetails.motifDemande || selectedShiftDetails.motif}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer - avec safe-area pour iOS */}
              <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
                <button
                  onClick={() => setShowShiftDetailsModal(false)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de confirmation personnalisé */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                confirmModal.type === 'warning' 
                  ? 'bg-amber-100 dark:bg-amber-900/30' 
                  : confirmModal.type === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                <AlertCircle className={`w-7 h-7 ${
                  confirmModal.type === 'warning' 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : confirmModal.type === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-blue-600 dark:text-blue-400'
                }`} />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                {confirmModal.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null, type: 'warning' })}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                  style={{ backgroundColor: confirmModal.type === 'error' ? '#dc2626' : brand }}
                >
                  <Check className="w-4 h-4" />
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast.show && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[300] px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[280px] max-w-sm mx-4 ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : toast.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white'
        }`}>
          {toast.type === 'success' ? (
            <Check className="w-5 h-5 flex-shrink-0" />
          ) : toast.type === 'error' ? (
            <X className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          <button 
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal Score Détaillé */}
      {showScoreModal && scoreData && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowScoreModal(false)}>
          <div 
            className="bg-white dark:bg-gray-800 w-full max-w-[360px] sm:max-w-md rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header dynamique selon le niveau */}
            {(() => {
              const totalPoints = scoreData.score?.total_points || scoreData.score?.score_total || 0;
              const niveau = getNiveau(totalPoints);
              const isNegative = totalPoints < 0;
              const headerStyles = {
                'Diamant': 'from-cyan-500 via-blue-500 to-purple-600',
                'Or': 'from-yellow-400 via-amber-500 to-orange-500',
                'Argent': 'from-slate-400 via-gray-400 to-slate-500',
                'Bronze': 'from-amber-500 via-orange-500 to-amber-600',
                'Alerte': 'from-red-500 via-red-600 to-red-700'
              };
              const displayLabel = isNegative ? 'À surveiller' : niveau.label;
              const headerStyle = isNegative ? headerStyles['Alerte'] : (headerStyles[niveau.label] || headerStyles['Bronze']);
              
              return (
                <div className={`bg-gradient-to-r ${headerStyle} p-4 sm:p-5 text-white relative`}>
                  <button 
                    onClick={() => setShowScoreModal(false)}
                    className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
                      {isNegative ? <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" /> : niveau.label === 'Diamant' ? <Gem className="w-6 h-6 sm:w-7 sm:h-7" /> : <Medal className="w-6 h-6 sm:w-7 sm:h-7" />}
                    </div>
                    <div>
                      <p className="text-white/80 text-[10px] sm:text-xs uppercase tracking-wider font-medium">Mon niveau</p>
                      <h2 className="text-lg sm:text-xl font-bold">{displayLabel}</h2>
                      <p className="text-xl sm:text-2xl font-black tabular-nums">
                        {totalPoints} <span className="text-sm font-normal opacity-80">pts</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Contenu */}
            <div className="p-3 sm:p-4 space-y-3 overflow-y-auto max-h-[calc(85vh-180px)]">
              
              {/* Progression vers prochain niveau */}
              {(() => {
                const totalPoints = scoreData.score?.total_points || scoreData.score?.score_total || 0;
                const niveaux = [
                  { min: 0, max: 100, label: 'Bronze', gradient: 'from-amber-500 to-orange-500', color: 'amber' },
                  { min: 100, max: 300, label: 'Argent', gradient: 'from-slate-400 to-gray-500', color: 'gray' },
                  { min: 300, max: 500, label: 'Or', gradient: 'from-yellow-400 to-amber-500', color: 'yellow' },
                  { min: 500, max: Infinity, label: 'Diamant', gradient: 'from-cyan-400 to-blue-500', color: 'cyan' }
                ];
                
                // Gestion des scores négatifs
                const isNegative = totalPoints < 0;
                const currentIdx = isNegative ? -1 : niveaux.findIndex(n => totalPoints >= n.min && totalPoints < n.max);
                const safeIdx = currentIdx === -1 ? 0 : currentIdx; // Fallback to Bronze
                const currentNiveau = niveaux[safeIdx];
                const nextNiveau = isNegative ? niveaux[0] : niveaux[safeIdx + 1];
                
                // Calcul de progression
                let progress = 0;
                if (isNegative) {
                  progress = 0;
                } else if (currentNiveau.max === Infinity) {
                  progress = 100;
                } else {
                  progress = Math.min(100, Math.max(0, ((totalPoints - currentNiveau.min) / (currentNiveau.max - currentNiveau.min)) * 100));
                }
                
                // Affichage spécial pour score négatif
                if (isNegative) {
                  const pointsToZero = Math.abs(totalPoints);
                  // Jauge inversée: plus on est négatif, moins la barre est remplie
                  const negativeProgress = Math.max(0, Math.min(100, 100 - (pointsToZero / 100) * 100));
                  
                  return (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 sm:p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          À surveiller
                        </span>
                        <span className="text-[10px] sm:text-xs text-red-500 font-medium">
                          Score négatif
                        </span>
                      </div>
                      
                      {/* Jauge */}
                      <div className="h-3 bg-red-100 dark:bg-red-900/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-700"
                          style={{ width: `${negativeProgress}%` }}
                        />
                      </div>
                      
                      {/* Infos */}
                      <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-red-500">
                        <span className="font-semibold">{totalPoints} pts</span>
                        <span>Objectif: 0 pts</span>
                      </div>
                      
                      {/* Message */}
                      <p className="text-center text-[11px] sm:text-xs text-red-600 dark:text-red-400 mt-2">
                        Gagnez <span className="font-bold">{pointsToZero}</span> pts pour revenir à 0
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Progression
                      </span>
                      {nextNiveau && (
                        <span className="text-[10px] sm:text-xs text-gray-500">
                          Prochain: <span className="font-semibold">{nextNiveau.label}</span>
                        </span>
                      )}
                    </div>
                    
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${currentNiveau.gradient} rounded-full transition-all duration-700`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-gray-500">
                      <span>{currentNiveau.label} ({currentNiveau.min})</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round(progress)}%</span>
                      <span>{currentNiveau.max === Infinity ? '∞' : currentNiveau.max} pts</span>
                    </div>
                    
                    {nextNiveau ? (
                      <p className="text-center text-[11px] sm:text-xs text-gray-500 mt-2">
                        Plus que <span className="font-bold" style={{ color: brand }}>{Math.max(0, nextNiveau.min - totalPoints)}</span> pts pour <span className="font-semibold">{nextNiveau.label}</span>
                      </p>
                    ) : (
                      <p className="text-center text-[11px] sm:text-xs text-cyan-600 dark:text-cyan-400 mt-2 flex items-center justify-center gap-1">
                        <Gem className="w-3 h-3" />
                        <span className="font-semibold">Niveau max atteint ! Tu es une légende</span>
                        <Gem className="w-3 h-3" />
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Tous les niveaux - Affichage horizontal compact */}
              <div className="flex gap-1.5 sm:gap-2">
                {(() => {
                  const totalPoints = scoreData.score?.total_points || scoreData.score?.score_total || 0;
                  const niveaux = [
                    { min: 0, label: 'Bronze', icon: Medal, gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600' },
                    { min: 100, label: 'Argent', icon: Medal, gradient: 'from-gray-300 to-slate-400', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500' },
                    { min: 300, label: 'Or', icon: Medal, gradient: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600' },
                    { min: 500, label: 'Diamant', icon: Gem, gradient: 'from-cyan-400 to-blue-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600' }
                  ];
                  
                  return niveaux.map((niv, idx) => {
                    const isUnlocked = totalPoints >= niv.min;
                    const Icon = niv.icon;
                    return (
                      <div 
                        key={niv.label}
                        className={`flex-1 p-2 sm:p-2.5 rounded-xl text-center transition-all ${
                          isUnlocked 
                            ? `${niv.bg} ring-1 ring-inset ring-black/5` 
                            : 'bg-gray-100 dark:bg-gray-800 opacity-40'
                        }`}
                      >
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 mx-auto rounded-lg flex items-center justify-center ${
                          isUnlocked ? `bg-gradient-to-br ${niv.gradient}` : 'bg-gray-300 dark:bg-gray-600'
                        }`}>
                          {isUnlocked ? (
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          ) : (
                            <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                          )}
                        </div>
                        <p className={`text-[9px] sm:text-[10px] font-semibold mt-1.5 ${isUnlocked ? niv.text : 'text-gray-400'}`}>
                          {niv.label}
                        </p>
                        <p className="text-[8px] sm:text-[9px] text-gray-400">{niv.min}+ pts</p>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Détail des points - Toutes les catégories */}
              <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3 space-y-1">
                {[
                  { key: 'pointage', icon: Clock, label: 'Ponctualité', value: scoreData.score?.pointage_points || 0, color: 'emerald' },
                  { key: 'presence', icon: CalendarCheck, label: 'Assiduité', value: scoreData.score?.presence_points || 0, color: 'green' },
                  { key: 'comportement', icon: Star, label: 'Comportement', value: scoreData.score?.comportement_points || 0, color: 'amber' },
                  { key: 'remplacement', icon: Users, label: 'Entraide', value: scoreData.score?.remplacement_points || 0, color: 'blue' },
                  { key: 'extra', icon: Zap, label: 'Extras', value: scoreData.score?.extra_points || 0, color: 'orange' },
                  { key: 'conge', icon: Plane, label: 'Congés', value: scoreData.score?.conge_points || 0, color: 'cyan' },
                  { key: 'anomalie', icon: AlertTriangle, label: 'Anomalies', value: scoreData.score?.anomalie_points || 0, color: 'red' },
                  { key: 'feedback', icon: ThumbsUp, label: 'Feedbacks', value: scoreData.score?.feedback_points || 0, color: 'purple', hasGauge: true },
                  { key: 'special', icon: Award, label: 'Bonus spéciaux', value: scoreData.score?.special_points || 0, color: 'pink' }
                ].filter(item => item.value !== 0).map((item) => {
                  const Icon = item.icon;
                  const colorMap = {
                    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-500', valuePos: 'text-emerald-600 dark:text-emerald-400', valueNeg: 'text-red-500' },
                    green: { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-500', valuePos: 'text-green-600 dark:text-green-400', valueNeg: 'text-red-500' },
                    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-500', valuePos: 'text-amber-600 dark:text-amber-400', valueNeg: 'text-red-500' },
                    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-500', valuePos: 'text-blue-600 dark:text-blue-400', valueNeg: 'text-red-500' },
                    orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', icon: 'text-orange-500', valuePos: 'text-orange-600 dark:text-orange-400', valueNeg: 'text-red-500' },
                    cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', icon: 'text-cyan-500', valuePos: 'text-cyan-600 dark:text-cyan-400', valueNeg: 'text-red-500' },
                    red: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-500', valuePos: 'text-green-600 dark:text-green-400', valueNeg: 'text-red-500' },
                    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-500', valuePos: 'text-purple-600 dark:text-purple-400', valueNeg: 'text-red-500' },
                    pink: { bg: 'bg-pink-50 dark:bg-pink-900/20', icon: 'text-pink-500', valuePos: 'text-pink-600 dark:text-pink-400', valueNeg: 'text-red-500' }
                  };
                  const colors = colorMap[item.color];
                  const isNegative = item.value < 0;
                  return (
                    <div key={item.key} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${colors.icon}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
                          <span className={`text-sm font-semibold ${isNegative ? colors.valueNeg : colors.valuePos}`}>
                            {isNegative ? '' : '+'}{item.value}
                          </span>
                        </div>
                        {item.hasGauge && scoreData.plafondFeedback && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1 bg-purple-100 dark:bg-purple-900/30 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (scoreData.plafondFeedback.utilise / scoreData.plafondFeedback.plafond) * 100)}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-gray-400">{scoreData.plafondFeedback.utilise}/{scoreData.plafondFeedback.plafond}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feedbacks récents - Compact */}
              {feedbacksRecus.filter(f => f.statut === 'approved' || f.status === 'approved').length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                    <h4 className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-pink-500" />
                      Feedbacks reçus
                    </h4>
                  </div>
                  <div className="p-2 sm:p-3 space-y-1.5">
                    {feedbacksRecus
                      .filter(f => f.statut === 'approved' || f.status === 'approved')
                      .slice(0, 2)
                      .map((feedback, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                          <div className="w-7 h-7 rounded-full bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-pink-500" />
                          </div>
                          <p className="flex-1 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">
                            "{feedback.message?.substring(0, 35)}..."
                          </p>
                          <span className="text-[10px] sm:text-xs font-bold text-emerald-500">+{feedback.points || 0}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Boutons sobres */}
            <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-2 sm:gap-3">
              <Link 
                to="/feedback"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 bg-[#cf292c] hover:bg-[#b82528] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all active:scale-[0.98]"
                onClick={() => setShowScoreModal(false)}
              >
                <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Feedback</span>
              </Link>
              <Link 
                to="/mon-score"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all border-2 border-[#cf292c] text-[#cf292c] hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-[0.98]"
                onClick={() => setShowScoreModal(false)}
              >
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Historique</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal Badges */}
      {showBadgesModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowBadgesModal(false)}>
          <div 
            className="bg-white dark:bg-gray-800 w-full max-w-[360px] sm:max-w-md rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header avec couleur brand */}
            <div style={{ backgroundColor: brand }} className="p-4 sm:p-5 text-white relative">
              <button 
                onClick={() => setShowBadgesModal(false)}
                className="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
                  <Award className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <p className="text-white/80 text-[10px] sm:text-xs uppercase tracking-wider font-medium">Récompenses</p>
                  <h2 className="text-lg sm:text-xl font-bold">Mes badges</h2>
                  <p className="text-xl sm:text-2xl font-black tabular-nums">
                    {scoreData?.stats ? BADGES.filter(b => b.condition(scoreData.stats)).length : 0}
                    <span className="text-sm font-normal opacity-80"> / {BADGES.length}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Contenu */}
            <div className="p-3 sm:p-4 overflow-y-auto max-h-[calc(85vh-120px)]">
              {scoreData?.stats ? (
                <BadgesList stats={scoreData.stats} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Chargement des badges...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

// =====================================================
// ANIMATION LEVEL UP - Style Jeu Vidéo
// =====================================================

function LevelUpAnimation({ oldNiveau, newNiveau, phase, onClose }) {
  const [particles, setParticles] = useState([]);

  // Générer les particules pour l'effet d'explosion
  useEffect(() => {
    if (phase === 2) {
      const newParticles = [];
      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2;
        const distance = 80 + Math.random() * 60;
        newParticles.push({
          id: i,
          endX: Math.cos(angle) * distance,
          endY: Math.sin(angle) * distance,
          size: Math.random() * 8 + 4,
          delay: Math.random() * 0.4,
          duration: 1 + Math.random() * 0.5,
          emoji: ['✨', '⭐', '💫', '🌟', '⚡', '✦'][Math.floor(Math.random() * 6)]
        });
      }
      setParticles(newParticles);
    }
  }, [phase]);

  if (!oldNiveau || !newNiveau) return null;

  const OldIcon = oldNiveau.icon || Medal;
  const NewIcon = newNiveau.icon || Medal;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.95) 100%)' }}
    >
      {/* Fond animé avec lueur */}
      <div 
        className={`absolute inset-0 transition-all duration-1000 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
          background: phase >= 3 
            ? `radial-gradient(circle at 50% 40%, ${newNiveau.label === 'Argent' ? 'rgba(148,163,184,0.3)' : newNiveau.label === 'Or' ? 'rgba(250,204,21,0.3)' : newNiveau.label === 'Diamant' ? 'rgba(34,211,238,0.3)' : 'rgba(251,146,60,0.3)'} 0%, transparent 60%)`
            : 'transparent'
        }}
      />

      {/* Container principal centré */}
      <div className="relative flex flex-col items-center justify-center w-full h-full">
        
        {/* ═══════════════════════════════════════════════════════════
            PHASE 1: ANCIEN RANG - Apparition élégante
        ═══════════════════════════════════════════════════════════ */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out ${
          phase === 1 ? 'opacity-100 scale-100' : phase === 2 ? 'opacity-0 scale-75 -translate-y-20' : 'opacity-0 scale-0'
        }`}>
          {/* Aura */}
          <div className={`absolute w-40 h-40 rounded-full bg-gradient-to-br ${oldNiveau.bgColor} blur-3xl opacity-30 animate-pulse`} />
          
          {/* Badge ancien rang */}
          <div className={`relative w-32 h-32 rounded-full bg-gradient-to-br ${oldNiveau.bgColor} flex items-center justify-center shadow-2xl`}
            style={{ 
              boxShadow: `0 0 40px rgba(255,255,255,0.2), inset 0 -4px 20px rgba(0,0,0,0.3)`,
              border: '3px solid rgba(255,255,255,0.3)'
            }}
          >
            <OldIcon className="w-14 h-14 text-white drop-shadow-lg" />
          </div>
          
          {/* Label */}
          <p className="mt-5 text-xl font-bold text-white tracking-wide">{oldNiveau.label}</p>
          <p className="mt-2 text-white/50 text-sm">Rang actuel</p>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            PHASE 2: TRANSITION LEVEL UP - Explosion spectaculaire
        ═══════════════════════════════════════════════════════════ */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
          phase === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}>
          {/* Particules explosives */}
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute text-2xl pointer-events-none"
              style={{
                left: '50%',
                top: '50%',
                fontSize: `${p.size * 2.5}px`,
                animation: phase === 2 ? `particle-fly ${p.duration}s ease-out ${p.delay}s forwards` : 'none',
                '--end-x': `${p.endX}px`,
                '--end-y': `${p.endY}px`,
              }}
            >
              {p.emoji}
            </div>
          ))}

          {/* Cercles d'énergie pulsants */}
          <div className="absolute w-64 h-64 rounded-full border-2 border-yellow-400/60 animate-ping" style={{ animationDuration: '1s' }} />
          <div className="absolute w-48 h-48 rounded-full border-2 border-amber-400/50 animate-ping" style={{ animationDuration: '1s', animationDelay: '0.2s' }} />
          <div className="absolute w-32 h-32 rounded-full border-2 border-orange-400/40 animate-ping" style={{ animationDuration: '1s', animationDelay: '0.4s' }} />
          
          {/* Centre lumineux */}
          <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-white via-yellow-100 to-amber-200 blur-md animate-pulse" />
          <div className="absolute w-16 h-16 rounded-full bg-white blur-sm animate-pulse" />
          
          {/* Texte LEVEL UP */}
          <div className="relative flex flex-col items-center">
            <span 
              className="text-5xl font-black tracking-widest animate-bounce"
              style={{ 
                background: 'linear-gradient(135deg, #fef08a 0%, #fbbf24 50%, #f97316 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.8)) drop-shadow(0 0 40px rgba(251,191,36,0.4))'
              }}
            >
              LEVEL UP!
            </span>
            <div className="flex items-center gap-2 mt-3">
              <Sparkles className="w-6 h-6 text-yellow-300 animate-spin" style={{ animationDuration: '2s' }} />
              <Star className="w-5 h-5 text-amber-300 animate-pulse" />
              <Sparkles className="w-6 h-6 text-yellow-300 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            PHASE 3-4: NOUVEAU RANG - Révélation premium
        ═══════════════════════════════════════════════════════════ */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ease-out ${
          phase >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-150'
        } ${phase === 3 ? 'blur-sm' : 'blur-0'}`}>
          
          {/* Glow effect derrière le badge */}
          <div className={`absolute w-52 h-52 rounded-full bg-gradient-to-br ${newNiveau.bgColor} blur-3xl opacity-50 animate-pulse`} />
          
          {/* Anneaux orbitaux */}
          {phase >= 4 && (
            <>
              <div className="absolute w-52 h-52 rounded-full border border-white/10 animate-spin" style={{ animationDuration: '10s' }}>
                <div className="absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-white/40" />
              </div>
              <div className="absolute w-60 h-60 rounded-full border border-white/5 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}>
                <div className="absolute -top-1 left-1/2 w-1.5 h-1.5 rounded-full bg-white/30" />
              </div>
            </>
          )}
          
          {/* Badge principal */}
          <div 
            className={`relative w-36 h-36 rounded-full bg-gradient-to-br ${newNiveau.bgColor} flex items-center justify-center shadow-2xl ${phase >= 4 ? 'animate-float' : ''}`}
            style={{ 
              boxShadow: `0 0 60px rgba(255,255,255,0.3), 0 0 100px rgba(255,255,255,0.1), inset 0 -6px 30px rgba(0,0,0,0.3)`,
              border: '4px solid rgba(255,255,255,0.4)'
            }}
          >
            <NewIcon className="w-16 h-16 text-white drop-shadow-xl" />
            
            {/* Brillance sur le badge */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/30 to-transparent rotate-45" />
            </div>
            
            {/* Étoiles décoratives */}
            {phase >= 4 && (
              <>
                <Sparkles className="absolute -top-4 -right-4 w-8 h-8 text-yellow-200 animate-pulse drop-shadow-lg" />
                <Sparkles className="absolute -bottom-4 -left-4 w-7 h-7 text-white/70 animate-pulse drop-shadow-lg" style={{ animationDelay: '0.3s' }} />
                <Star className="absolute top-0 -left-6 w-5 h-5 text-yellow-300/80 animate-pulse" style={{ animationDelay: '0.6s' }} />
                <Star className="absolute bottom-0 -right-6 w-4 h-4 text-white/60 animate-pulse" style={{ animationDelay: '0.9s' }} />
              </>
            )}
          </div>

          {/* Labels */}
          <div className="mt-8 text-center">
            <p className="text-white/60 text-xs font-semibold tracking-[0.3em] uppercase mb-2">Nouveau Rang</p>
            <h2 
              className="text-4xl font-black text-white tracking-wider"
              style={{ textShadow: '0 0 40px rgba(255,255,255,0.4)' }}
            >
              {newNiveau.label}
            </h2>
          </div>

          {/* Message de félicitations */}
          {phase >= 4 && (
            <div 
              className="mt-6 px-6 py-3 rounded-2xl flex items-center gap-3 animate-fade-in"
              style={{ 
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)'
              }}
            >
              <Trophy className="w-5 h-5 text-yellow-400" />
              <p className="text-white/90 text-sm font-medium">
                Félicitations ! Continuez comme ça !
              </p>
            </div>
          )}

          {/* Bouton Continuer */}
          {phase >= 4 && (
            <button
              onClick={onClose}
              className={`mt-8 px-12 py-4 bg-gradient-to-r ${newNiveau.btnColor} text-white font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 animate-fade-in flex items-center gap-3`}
              style={{ 
                animationDelay: '0.2s',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4), 0 0 20px rgba(255,255,255,0.1)'
              }}
            >
              <CheckCircle className="w-5 h-5" />
              <span className="text-lg">Continuer</span>
            </button>
          )}
        </div>
      </div>

      {/* CSS pour l'animation des particules */}
      <style>{`
        @keyframes particle-fly {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default HomeEmploye;
