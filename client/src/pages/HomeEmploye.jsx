import { useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, Calendar, FileText, User, ChevronRight, Timer, AlertCircle, Sun, Moon, Coffee, Users, ChevronLeft, Briefcase, Hand, Check, X, UserX, CalendarOff, PlayCircle, PauseCircle, TrendingUp, Zap, Award, Flame, Megaphone, CalendarDays, GraduationCap, Stethoscope, AlertTriangle, Target, Plane, Trophy, CheckCircle2, CalendarCheck, UserPlus, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import BottomNav from '../components/BottomNav';
import { ThemeContext } from '../context/ThemeContext';
import useNotificationHighlight from '../hooks/useNotificationHighlight';
import { isShiftInPast, isShiftStarted, isShiftStartingWithin, createLocalDateTime, toLocalDateString } from '../utils/parisTimeUtils';

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
  
  // Hooks pour le highlight des sections depuis les notifications
  const { isHighlighted: isPlanningHighlighted } = useNotificationHighlight('planning-section');
  const { isHighlighted: isConsignesHighlighted, highlightId: highlightedConsigneId } = useNotificationHighlight('consignes-section');
  
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
  const [planningWeekOffset, setPlanningWeekOffset] = useState(0);
  const [planningView, setPlanningView] = useState('perso'); // 'perso' | 'equipe' | 'remplacements'
  
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
  
  // ═══ NOUVEAUX WIDGETS ═══
  // Consignes du jour
  const [consignes, setConsignes] = useState([]);
  const [loadingConsignes, setLoadingConsignes] = useState(true);
  const [showAllConsignes, setShowAllConsignes] = useState(false);
  
  // Stats ponctualité
  const [statsPonctualite, setStatsPonctualite] = useState(null);
  const [loadingPonctualite, setLoadingPonctualite] = useState(true);
  
  // Anomalies employé
  const [mesAnomalies, setMesAnomalies] = useState([]);
  const [loadingAnomalies, setLoadingAnomalies] = useState(true);
  
  // Événements à venir (congés, remplacements, formations...)
  const [evenementsAVenir, setEvenementsAVenir] = useState([]);
  const [loadingEvenements, setLoadingEvenements] = useState(true);

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
  }, [fetchConsignes, fetchPonctualite, fetchAnomalies, fetchEvenements]);

  // Candidater à un remplacement (avec confirmation)
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
      message: `Voulez-vous candidater pour ce remplacement ?${displayDate ? `\n\n📅 ${displayDate}` : ''}${heureStr ? `\n⏰ ${heureStr}` : ''}`,
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
    
    // ═══ PROTECTIONS INTELLIGENTES (utilisant parisTimeUtils) ═══
    
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
    
    // ═══ Tout est OK, ouvrir le modal ═══
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-navbar lg:pb-8 lg:pt-14 flex flex-col transition-colors pt-header">
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
      
      {/* Cards de statut - Style épuré */}
      <div className="px-4 -mt-5">
        <div className="grid grid-cols-3 gap-2.5" aria-live="polite">
          {/* Card 1: Statut pointage */}
          <Link 
            to="/pointage" 
            className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="flex flex-col items-center text-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-1.5 ${
                pointageStatus.status === 'working' 
                  ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                  : pointageStatus.status === 'ended'
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                {pointageStatus.status === 'working' ? (
                  <PlayCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : pointageStatus.status === 'ended' ? (
                  <PauseCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="text-[9px] text-gray-400 uppercase font-medium tracking-wide">Statut</div>
              <div className={`text-[11px] font-semibold mt-0.5 truncate w-full ${
                pointageStatus.status === 'working' 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : pointageStatus.status === 'ended'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
              }`}>
                {pointageStatus.label}
              </div>
            </div>
          </Link>
          
          {/* Card 2: Ponctualité */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-center text-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-1.5 ${
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
              <div className="text-[9px] text-gray-400 uppercase font-medium tracking-wide">Ponctualité</div>
              {loadingPonctualite ? (
                <div className="h-3.5 w-8 rounded bg-gray-200 dark:bg-gray-600 animate-pulse mt-1" />
              ) : (
                <div className={`text-[11px] font-semibold mt-0.5 ${
                  statsPonctualite?.ponctualiteMois >= 95 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {statsPonctualite?.ponctualiteMois ?? '—'}%
                </div>
              )}
            </div>
          </div>
          
          {/* Card 3: Anomalies */}
          <Link 
            to="/mes-anomalies" 
            className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 relative"
          >
            {mesAnomalies.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-red-500">
                {mesAnomalies.length > 9 ? '9+' : mesAnomalies.length}
              </span>
            )}
            <div className="flex flex-col items-center text-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-1.5 ${
                mesAnomalies.length > 0 
                  ? 'bg-amber-100 dark:bg-amber-900/30' 
                  : 'bg-emerald-100 dark:bg-emerald-900/30'
              }`}>
                <AlertTriangle className={`w-4 h-4 ${
                  mesAnomalies.length > 0 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-emerald-600 dark:text-emerald-400'
                }`} />
              </div>
              <div className="text-[9px] text-gray-400 uppercase font-medium tracking-wide">Anomalies</div>
              {loadingAnomalies ? (
                <div className="h-3.5 w-10 rounded bg-gray-200 dark:bg-gray-600 animate-pulse mt-1" />
              ) : (
                <div className={`text-xs font-bold mt-0.5 ${
                  mesAnomalies.length > 0 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {mesAnomalies.length > 0 ? `${mesAnomalies.length} à voir` : 'Aucune'}
                </div>
              )}
            </div>
          </Link>
        </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION PLANNING PRINCIPALE (intégrée directement)
      ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 px-4 mt-6">
        <section className="mb-5">
          {/* Header Planning avec navigation semaine */}
          <div 
            id="planning-section"
            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden scroll-mt-highlight transition-all duration-300 ${
              isPlanningHighlighted ? 'ring-2 ring-[#cf292c]' : ''
            }`}
          >
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${brand}20 0%, ${brand}10 100%)` }}
                  >
                    <Calendar className="w-5 h-5" style={{color: brand}} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Mon Planning</h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {getWeekDates.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {getWeekDates.end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                  <button 
                    onClick={() => setPlanningWeekOffset(w => w - 1)}
                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-600 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                  <button 
                    onClick={() => setPlanningWeekOffset(0)}
                    disabled={planningWeekOffset === 0}
                    className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Auj.
                  </button>
                  <button 
                    onClick={() => setPlanningWeekOffset(w => w + 1)}
                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-600 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
              
              {/* Onglets Planning - Style moderne segmented control */}
              <div className="flex gap-1 mt-4 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                <button
                  onClick={() => setPlanningView('perso')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    planningView === 'perso' 
                      ? 'text-white shadow-sm' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
                  style={planningView === 'perso' ? { backgroundColor: brand } : {}}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Mes shifts</span>
                </button>
                <button
                  onClick={() => setPlanningView('equipe')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    planningView === 'equipe' 
                      ? 'text-white shadow-sm' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
                  style={planningView === 'equipe' ? { backgroundColor: brand } : {}}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Équipe</span>
                </button>
                <button
                  onClick={() => setPlanningView('remplacements')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 relative ${
                    planningView === 'remplacements' 
                      ? 'text-white shadow-sm' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                  }`}
                  style={planningView === 'remplacements' ? { backgroundColor: brand } : {}}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Rempl.</span>
                  {remplacementsDisponibles.length > 0 && planningView !== 'remplacements' && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold shadow-sm">
                      {remplacementsDisponibles.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            {/* ═══ PLANNING COMPACT - Timeline horizontale ═══ */}
            <div className="p-3 sm:p-4">
              {loadingShifts && planningView !== 'remplacements' ? (
                <div className="flex sm:grid sm:grid-cols-7 gap-2 overflow-x-auto pb-2 sm:overflow-visible snap-x snap-mandatory sm:snap-none">
                  {[1,2,3,4,5,6,7].map(i => (
                    <div key={i} className="flex-shrink-0 w-[68px] sm:w-auto aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse snap-start" />
                  ))}
                </div>
              ) : planningView === 'perso' ? (
                /* ═══ VUE MES SHIFTS - Scroll horizontal mobile, grille desktop ═══ */
                <div>
                  {/* Scroll horizontal mobile / Grille 7 cols desktop */}
                  <div className="flex sm:grid sm:grid-cols-7 gap-2 overflow-x-auto pb-2 sm:overflow-visible snap-x snap-mandatory sm:snap-none">
                    {(() => {
                      // Générer les 7 jours de la semaine
                      const days = [];
                      const start = new Date(getWeekDates.start);
                      for (let i = 0; i < 7; i++) {
                        const day = new Date(start);
                        day.setDate(start.getDate() + i);
                        days.push(day);
                      }
                      
                      return days.map((day, idx) => {
                        const dayStr = toLocalDateString(day);
                        const dayShifts = myShifts.filter(s => {
                          const sd = toLocalDateString(s.date);
                          return sd === dayStr;
                        });
                        const isToday = day.toDateString() === new Date().toDateString();
                        const isPast = day < new Date(new Date().setHours(0,0,0,0));
                        const hasShift = dayShifts.length > 0;
                        const shift = dayShifts[0]; // Premier shift du jour
                        const isEnConge = shift?.estEnConge;
                        const remplacementStatut = shift?.remplacementStatut;
                        const isRemplacement = shift?.isRemplacement || shift?.motif?.toLowerCase()?.includes('remplacement de');
                        const style = shift ? getTypeStyle(shift.type) : null;
                        const canRequestReplacement = hasShift && !isPast && !remplacementStatut && !isEnConge && !isRemplacement;
                        const hasRemplacementInfo = remplacementStatut && ['en_attente', 'acceptee', 'validee'].includes(remplacementStatut);
                        const isClickable = canRequestReplacement || hasRemplacementInfo || isRemplacement;
                        const horaires = shift ? getShiftHoraires(shift) : null;
                        const [heureDebut, heureFin] = horaires ? horaires.split(' - ') : [null, null];
                        
                        // Handler de clic selon le contexte
                        const handleShiftClick = () => {
                          if (canRequestReplacement) {
                            handleOpenDemandeModal(shift);
                          } else if (hasRemplacementInfo || isRemplacement) {
                            setSelectedShiftDetails(shift);
                            setShowShiftDetailsModal(true);
                          }
                        };
                        
                        return (
                          <div 
                            key={idx}
                            onClick={handleShiftClick}
                            className={`flex-shrink-0 w-[68px] sm:w-auto snap-start relative rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-200 border-2 ${
                              isEnConge
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                                : isRemplacement
                                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-400 dark:border-purple-600'
                                  : isToday 
                                    ? 'bg-white dark:bg-gray-800 shadow-md' 
                                    : hasShift
                                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                      : 'bg-gray-50 dark:bg-gray-800/50 border-dashed border-gray-200 dark:border-gray-700'
                            } ${isPast && !isToday ? 'opacity-50' : ''} ${isClickable ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : ''}`}
                            style={isToday && !isRemplacement ? { borderColor: brand } : (remplacementStatut === 'validee' ? { borderColor: '#10b981' } : {})}
                          >
                            {/* En-tête jour */}
                            <div className={`text-center py-1 sm:py-1.5 ${
                              isToday 
                                ? 'text-white' 
                                : 'bg-gray-50 dark:bg-gray-700/50'
                            }`}
                            style={isToday ? { backgroundColor: brand } : {}}
                            >
                              {/* Badge Aujourd'hui - visible seulement desktop */}
                              {isToday && (
                                <div className="hidden sm:block text-[8px] uppercase font-bold tracking-wider text-white/80 mb-0.5">
                                  Aujourd'hui
                                </div>
                              )}
                              <div className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wide ${
                                isToday ? 'text-white/90' : 'text-gray-400 dark:text-gray-500'
                              }`}>
                                {day.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').slice(0, 3)}
                              </div>
                              <div className={`text-base sm:text-lg font-bold ${
                                isToday ? 'text-white' : 'text-gray-800 dark:text-gray-200'
                              }`}>
                                {day.getDate()}
                              </div>
                            </div>
                            
                            {/* Contenu */}
                            <div className="p-1.5 sm:p-2 min-h-[48px] sm:min-h-[52px] flex flex-col items-center justify-center">
                              {hasShift ? (
                                <>
                                  {isEnConge ? (
                                    <div className="text-center">
                                      <Plane className="w-4 h-4 sm:w-5 sm:h-5 mx-auto text-emerald-500" />
                                      <p className="text-[8px] sm:text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Congé</p>
                                    </div>
                                  ) : (
                                    <>
                                      {/* Badge Remplacement - Bien positionné */}
                                      {isRemplacement && (
                                        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
                                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-gray-800">
                                            <ArrowPathIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Type badge */}
                                      <div className={`inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wide ${
                                        isRemplacement ? 'bg-purple-100 text-purple-700' : (style?.bg || 'bg-gray-100')
                                      } ${isRemplacement ? '' : (style?.text || 'text-gray-600')}`}>
                                        <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
                                          isRemplacement ? 'bg-purple-500' :
                                          shift.type === 'matin' ? 'bg-amber-500' : 
                                          shift.type === 'soir' ? 'bg-indigo-500' : 
                                          'bg-orange-500'
                                        }`}></span>
                                        {isRemplacement ? 'R' : (shift.type?.slice(0,4) || 'Work')}
                                      </div>
                                      
                                      {/* Horaires */}
                                      <div className="text-xs sm:text-sm font-mono font-bold mt-0.5 sm:mt-1 text-gray-900 dark:text-gray-100">
                                        {heureDebut}
                                      </div>
                                      <div className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500">
                                        → {heureFin}
                                      </div>
                                      
                                      {/* Statut remplacement - Libellés explicites */}
                                      {remplacementStatut === 'en_attente' && (
                                        <div className="mt-0.5 sm:mt-1 flex flex-col items-center">
                                          <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                                            <Users className="w-2.5 h-2.5" /> Recherche
                                          </span>
                                        </div>
                                      )}
                                      {remplacementStatut === 'acceptee' && (
                                        <div className="mt-0.5 sm:mt-1 flex flex-col items-center">
                                          <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-0.5">
                                            <Clock className="w-2.5 h-2.5" /> À valider
                                          </span>
                                        </div>
                                      )}
                                      {remplacementStatut === 'validee' && (
                                        <div className="mt-0.5 sm:mt-1 flex flex-col items-center">
                                          <span className="text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                                            <CheckCircle2 className="w-2.5 h-2.5" /> Confirmé
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </>
                              ) : (
                                <div className="text-center">
                                  <div className="text-gray-300 dark:text-gray-600 text-base sm:text-lg">—</div>
                                  <p className="text-[8px] sm:text-[9px] text-gray-400 dark:text-gray-500">Repos</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  
                  {/* Légende rapide et stats */}
                  <div className="mt-3 flex items-center justify-between text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400"></span> Matin
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-400"></span> Soir
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-400"></span> Coupure
                      </span>
                    </div>
                    <span className="font-medium">
                      {myShifts.length} shift{myShifts.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {/* Shift du jour en focus (si existe) - masqué sur mobile */}
                  {(() => {
                    const todayShift = myShifts.find(s => new Date(s.date).toDateString() === new Date().toDateString());
                    if (!todayShift) return null;
                    
                    const style = getTypeStyle(todayShift.type);
                    const TypeIcon = style.icon;
                    const isRemplacement = todayShift?.isRemplacement || todayShift?.motif?.toLowerCase()?.includes('remplacement de');
                    const canRequest = !todayShift.estEnConge && !todayShift.remplacementStatut && !isRemplacement;
                    
                    return (
                      <div className={`hidden sm:block mt-4 p-3 rounded-2xl border ${
                        isRemplacement 
                          ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700' 
                          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                            isRemplacement ? 'bg-purple-100 dark:bg-purple-800' : style.bg
                          } border border-gray-100 dark:border-gray-600`}>
                            {isRemplacement ? (
                              <span className="text-lg">🔄</span>
                            ) : (
                              <TypeIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${style.text}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">Aujourd'hui</span>
                              <span className="flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full opacity-75" style={{backgroundColor: isRemplacement ? '#a855f7' : brand}}></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{backgroundColor: isRemplacement ? '#a855f7' : brand}}></span>
                              </span>
                              {isRemplacement && (
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-purple-200 text-purple-700">REMPLACEMENT</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">{getShiftHoraires(todayShift)}</span>
                              <span className={`text-[10px] sm:text-xs font-medium ${isRemplacement ? 'text-purple-700 bg-purple-100' : style.text + ' ' + style.bg} capitalize px-1.5 sm:px-2 py-0.5 rounded-full`}>
                                {isRemplacement ? 'Remplacement' : todayShift.type}
                              </span>
                            </div>
                            {isRemplacement && todayShift.motif && (
                              <p className="text-[10px] text-purple-600 mt-1 truncate">{todayShift.motif}</p>
                            )}
                          </div>
                          {canRequest && (
                            <button
                              onClick={() => handleOpenDemandeModal(todayShift)}
                              className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all active:scale-95 flex-shrink-0"
                              title="Demander un remplacement"
                            >
                              <Hand className="w-4 h-4 text-gray-500" />
                            </button>
                          )}
                          {isRemplacement && (
                            <div className="p-2 sm:p-2.5 rounded-xl bg-purple-100 dark:bg-purple-800 flex-shrink-0" title="Ce shift ne peut pas être re-remplacé">
                              <span className="text-purple-600 dark:text-purple-300 text-xs">🔒</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : planningView === 'equipe' ? (
                /* ═══ VUE ÉQUIPE - Scroll horizontal mobile, grille desktop ═══ */
                teamShifts.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Aucun collègue cette semaine</p>
                  </div>
                ) : (
                  <div>
                    {/* Scroll horizontal mobile / Grille 7 cols desktop */}
                    <div className="flex sm:grid sm:grid-cols-7 gap-2 overflow-x-auto pb-2 sm:overflow-visible snap-x snap-mandatory sm:snap-none pl-1 pr-1 sm:px-0 -mx-1 sm:mx-0">
                      {(() => {
                        // Générer les 7 jours de la semaine
                        const days = [];
                        const start = new Date(getWeekDates.start);
                        for (let i = 0; i < 7; i++) {
                          const day = new Date(start);
                          day.setDate(start.getDate() + i);
                          days.push(day);
                        }
                        
                        // Grouper les shifts par jour
                        const shiftsByDay = teamShifts.reduce((acc, shift) => {
                          const dateKey = toLocalDateString(shift.date);
                          if (!acc[dateKey]) acc[dateKey] = [];
                          acc[dateKey].push(shift);
                          return acc;
                        }, {});
                        
                        return days.map((day, idx) => {
                          const dayStr = toLocalDateString(day);
                          const dayShifts = shiftsByDay[dayStr] || [];
                          const isToday = day.toDateString() === new Date().toDateString();
                          const isPast = day < new Date(new Date().setHours(0,0,0,0));
                          const hasShifts = dayShifts.length > 0;
                          
                          // Trier les shifts par heure
                          const sortedShifts = dayShifts.sort((a, b) => 
                            (a.segments?.[0]?.start || '').localeCompare(b.segments?.[0]?.start || '')
                          );
                          
                          return (
                            <div 
                              key={idx}
                              className={`flex-shrink-0 w-[100px] sm:w-auto snap-start rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-200 ${
                                isToday 
                                  ? 'bg-white dark:bg-gray-800 ring-2 shadow-lg' 
                                  : hasShifts
                                    ? 'bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700'
                                    : 'bg-gray-50 dark:bg-gray-800/50 ring-1 ring-dashed ring-gray-200 dark:ring-gray-700'
                              } ${isPast && !isToday ? 'opacity-50' : ''}`}
                              style={isToday ? { '--tw-ring-color': brand } : {}}
                            >
                              {/* En-tête jour */}
                              <div className={`text-center py-1 sm:py-1.5 ${
                                isToday 
                                  ? 'text-white' 
                                  : 'bg-gray-50 dark:bg-gray-700/50'
                              }`}
                              style={isToday ? { backgroundColor: brand } : {}}
                              >
                                {isToday && (
                                  <div className="hidden sm:block text-[8px] uppercase font-bold tracking-wider text-white/80 mb-0.5">
                                    Aujourd'hui
                                  </div>
                                )}
                                <div className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wide ${
                                  isToday ? 'text-white/90' : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                  {day.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').slice(0, 3)}
                                </div>
                                <div className={`text-base sm:text-lg font-bold ${
                                  isToday ? 'text-white' : 'text-gray-800 dark:text-gray-200'
                                }`}>
                                  {day.getDate()}
                                </div>
                              </div>
                              
                              {/* Liste des collègues */}
                              <div className="p-1 sm:p-1.5 min-h-[70px] sm:min-h-[80px] max-h-[120px] sm:max-h-[150px] overflow-y-auto">
                                {hasShifts ? (
                                  <div className="space-y-0.5 sm:space-y-1">
                                    {sortedShifts.slice(0, 4).map((shift, shiftIdx) => {
                                      const isEnConge = shift.estEnConge;
                                      const isRemplacement = shift.isRemplacement || shift.motif?.toLowerCase()?.includes('remplacement de');
                                      const initials = `${shift.employe?.prenom?.[0] || ''}${shift.employe?.nom?.[0] || ''}`;
                                      const horairesComplets = getShiftHoraires(shift); // "09:00 - 17:00"
                                      const heureDebut = horairesComplets.split(' - ')[0];
                                      
                                      return (
                                        <div 
                                          key={shiftIdx} 
                                          className={`flex items-center gap-1 sm:gap-1.5 p-0.5 sm:p-1 rounded-md sm:rounded-lg ${
                                            isEnConge 
                                              ? 'bg-amber-50 dark:bg-amber-900/20' 
                                              : isRemplacement
                                                ? 'bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-200'
                                                : 'bg-gray-50 dark:bg-gray-700/50'
                                          }`}
                                        >
                                          {/* Avatar initiales */}
                                          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center text-[8px] sm:text-[9px] font-bold flex-shrink-0 ${
                                            isEnConge 
                                              ? 'bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300' 
                                              : isRemplacement
                                                ? 'bg-gradient-to-br from-purple-400 to-purple-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                          }`}>
                                            {isEnConge ? (
                                              <UserX className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                            ) : isRemplacement ? (
                                              <ArrowPathIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                            ) : (
                                              initials
                                            )}
                                          </div>
                                          
                                          {/* Infos */}
                                          <div className="flex-1 min-w-0">
                                            <div className={`text-[9px] sm:text-[10px] font-semibold truncate flex items-center gap-1 ${
                                              isEnConge 
                                                ? 'text-amber-600 dark:text-amber-400 line-through' 
                                                : isRemplacement
                                                  ? 'text-purple-700 dark:text-purple-300'
                                                  : 'text-gray-800 dark:text-gray-200'
                                            }`}>
                                              {shift.employe?.prenom}
                                              {isRemplacement && (
                                                <span className="text-[7px] sm:text-[8px] px-1 py-0.5 bg-purple-500 text-white rounded font-bold">R</span>
                                              )}
                                            </div>
                                            <div className={`text-[8px] sm:text-[9px] font-mono ${
                                              isEnConge 
                                                ? 'text-amber-500 dark:text-amber-400' 
                                                : isRemplacement
                                                  ? 'text-purple-500 dark:text-purple-400'
                                                  : 'text-gray-500 dark:text-gray-400'
                                            }`}>
                                              {/* Mobile: heure début seulement, Desktop: horaires complets */}
                                              <span className="sm:hidden">{isEnConge ? 'Abs' : heureDebut}</span>
                                              <span className="hidden sm:inline">{isEnConge ? 'Absent' : horairesComplets}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {/* Indicateur s'il y a plus de collègues */}
                                    {sortedShifts.length > 4 && (
                                      <div className="text-[8px] sm:text-[9px] text-center text-gray-400 dark:text-gray-500 font-medium">
                                        +{sortedShifts.length - 4}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full py-3">
                                    <div className="text-gray-300 dark:text-gray-600 text-lg">—</div>
                                    <p className="text-[9px] text-gray-400 dark:text-gray-500">Aucun</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    
                    {/* Résumé */}
                    <div className="mt-3 flex items-center justify-between text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 px-1 sm:px-0">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-300 dark:bg-gray-600"></span> Présent
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400"></span> Absent
                        </span>
                      </div>
                      <span className="font-medium">
                        {(() => {
                          const uniqueCollegues = [...new Set(teamShifts.map(s => s.employe?.id))].length;
                          return `${uniqueCollegues} collègue${uniqueCollegues > 1 ? 's' : ''}`;
                        })()}
                      </span>
                    </div>
                  </div>
                )
              ) : null}
              
              {/* Vue Remplacements */}
              {planningView === 'remplacements' && (
                <div className="space-y-4">
                  {loadingRemplacements ? (
                    <div className="space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* Demandes disponibles pour candidater */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                          <Hand className="w-3.5 h-3.5" />
                          Shifts à pourvoir ({remplacementsDisponibles.length})
                        </h4>
                        {remplacementsDisponibles.length === 0 ? (
                          <div className="text-center py-6 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-xs">Aucun remplacement disponible</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {remplacementsDisponibles.slice(0, 5).map(demande => {
                              const shiftDate = demande.shift?.date ? new Date(demande.shift.date) : null;
                              const style = getTypeStyle(demande.shift?.type);
                              const TypeIcon = style.icon;
                              
                              return (
                                <div key={demande.id} className={`p-3 rounded-lg border ${demande.memeCategorie ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}`}>
                                  <div className="flex items-start gap-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                                      <TypeIcon className={`w-4 h-4 ${style.text}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                          {shiftDate ? shiftDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date ?'}
                                        </span>
                                        {demande.priorite === 'urgente' && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 font-medium">
                                            Urgent
                                          </span>
                                        )}
                                        {demande.memeCategorie && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 font-medium">
                                            Même catégorie
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        <span className="capitalize">{demande.shift?.type || 'Shift'}</span>
                                        <span className="mx-1">•</span>
                                        <span>{demande.employeAbsent?.prenom} {demande.employeAbsent?.nom?.[0]}.</span>
                                      </div>
                                      {demande.motif && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">« {demande.motif} »</p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handleCandidater(demande.id, demande)}
                                      disabled={candidatingId === demande.id}
                                      className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
                                      style={{ backgroundColor: brand }}
                                    >
                                      {candidatingId === demande.id ? '...' : 'Candidater'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Mes candidatures en cours */}
                      {mesCandidatures.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <Check className="w-3.5 h-3.5" />
                            Mes candidatures ({mesCandidatures.length})
                          </h4>
                          <div className="space-y-2">
                            {mesCandidatures.map(candidature => {
                              const demande = candidature.demandeRemplacement;
                              const shiftDate = demande?.shift?.date ? new Date(demande.shift.date) : null;
                              const style = getTypeStyle(demande?.shift?.type);
                              const isAccepted = candidature.statut === 'acceptee';
                              const isRefused = candidature.statut === 'refusee';
                              
                              // Handler pour voir les détails
                              const handleViewDetails = () => {
                                const shiftDetails = {
                                  ...demande?.shift,
                                  remplacementStatut: demande?.statut,
                                  candidatureStatut: candidature.statut,
                                  employeAbsent: demande?.employeAbsent,
                                  isMyCandidate: true
                                };
                                setSelectedShiftDetails(shiftDetails);
                                setShowShiftDetailsModal(true);
                              };
                              
                              return (
                                <div 
                                  key={candidature.id} 
                                  onClick={handleViewDetails}
                                  className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
                                    isAccepted
                                      ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20'
                                      : isRefused
                                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 opacity-60'
                                        : 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                      isAccepted
                                        ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                        : isRefused
                                          ? 'bg-gray-100 dark:bg-gray-700'
                                          : style.bg
                                    }`}>
                                      {isAccepted ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                      ) : isRefused ? (
                                        <X className="w-5 h-5 text-gray-400" />
                                      ) : (
                                        <Clock className={`w-5 h-5 ${style.text}`} />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                          {shiftDate ? shiftDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date ?'}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                                        <span>Remplacement de</span>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                          {demande?.employeAbsent?.prenom || '?'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isAccepted ? (
                                        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" /> Confirmé
                                        </span>
                                      ) : isRefused ? (
                                        <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 font-semibold">
                                          Refusé
                                        </span>
                                      ) : (
                                        <>
                                          <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                                            <span className="animate-pulse">●</span> En cours
                                          </span>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleAnnulerCandidature(candidature.id); }}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Retirer ma candidature"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </>
                                      )}
                                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Mes demandes de remplacement */}
                      {mesDemandes.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Mes demandes ({mesDemandes.length})
                          </h4>
                          <div className="space-y-2">
                            {mesDemandes.map(demande => {
                              const shiftDate = demande.shift?.date ? new Date(demande.shift.date) : null;
                              const nbCandidats = demande.candidatures?.length || 0;
                              const statut = demande.statut || 'en_attente';
                              const isPending = statut === 'en_attente' || statut === 'pending';
                              const isAccepted = statut === 'acceptee' || statut === 'accepted';
                              const isValidated = statut === 'validee' || statut === 'validated';
                              const isPourvu = isAccepted || isValidated || demande.employeRemplacant;
                              
                              // Handler pour ouvrir les détails
                              const handleViewDetails = () => {
                                // Construire un objet shift-like pour le modal
                                const shiftDetails = {
                                  ...demande.shift,
                                  remplacementStatut: demande.statut,
                                  remplacant: demande.employeRemplacant,
                                  demandeId: demande.id,
                                  nbCandidats: nbCandidats,
                                  motifDemande: demande.motif,
                                  priorite: demande.priorite
                                };
                                setSelectedShiftDetails(shiftDetails);
                                setShowShiftDetailsModal(true);
                              };
                              
                              return (
                                <div 
                                  key={demande.id} 
                                  onClick={handleViewDetails}
                                  className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
                                    isValidated
                                      ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20'
                                      : isAccepted
                                        ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20'
                                        : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                      isValidated
                                        ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                        : isAccepted 
                                          ? 'bg-blue-100 dark:bg-blue-900/40'
                                          : 'bg-amber-100 dark:bg-amber-900/40'
                                    }`}>
                                      {isValidated ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                      ) : isAccepted ? (
                                        <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                      ) : (
                                        <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                          {shiftDate ? shiftDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date ?'}
                                        </span>
                                        {demande.priorite === 'urgente' && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold uppercase">Urgent</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {isPourvu && demande.employeRemplacant ? (
                                          <span className="flex items-center gap-1">
                                            <span>Remplacé par</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                              {demande.employeRemplacant.prenom} {demande.employeRemplacant.nom?.[0]}.
                                            </span>
                                          </span>
                                        ) : (
                                          <span>{nbCandidats} candidat{nbCandidats > 1 ? 's' : ''}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isValidated ? (
                                        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" /> Confirmé
                                        </span>
                                      ) : isAccepted ? (
                                        <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                                          <Clock className="w-3 h-3" /> À valider
                                        </span>
                                      ) : (
                                        <>
                                          <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                            <Users className="w-3 h-3" /> Recherche
                                          </span>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleAnnulerDemande(demande.id); }}
                                            disabled={annulationDemandeId === demande.id}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                            title="Annuler la demande"
                                          >
                                            {annulationDemandeId === demande.id ? (
                                              <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <X className="w-4 h-4" />
                                            )}
                                          </button>
                                        </>
                                      )}
                                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════════
            WIDGETS INFORMATIFS - Split Layout: Infos du jour / À venir
        ═══════════════════════════════════════════════════════════════════════════ */}
        
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

            {/* Widget: À venir - Design sobre */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header sobre */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-900/30">
                  <CalendarCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">À venir</h3>
                {evenementsAVenir.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium">
                    {evenementsAVenir.length}
                  </span>
                )}
              </div>
              <div className="p-3">
                {loadingEvenements ? (
                  <div className="space-y-2">
                    <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                  </div>
                ) : evenementsAVenir.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-2">
                      <CalendarCheck className="w-6 h-6 text-purple-400 opacity-40" />
                    </div>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Rien de prévu</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {evenementsAVenir.slice(0, 4).map((evt, idx) => {
                      // Icône et couleur selon le type
                      const getEventStyle = (type) => {
                        switch(type) {
                          case 'conge':
                            return { icon: Plane, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' };
                          case 'remplacement':
                            return { icon: UserCheck, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' };
                          case 'formation':
                            return { icon: GraduationCap, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800' };
                          case 'visite_medicale':
                            return { icon: Stethoscope, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800' };
                          case 'shift_special':
                            return { icon: CalendarDays, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' };
                          default:
                            return { icon: Calendar, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-700', border: 'border-gray-200 dark:border-gray-700' };
                        }
                      };
                      const style = getEventStyle(evt.type);
                      const EventIcon = style.icon;
                      
                      // Formatage date
                      const evtDate = new Date(evt.date);
                      const dateFormatted = evtDate.toLocaleDateString('fr-FR', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short' 
                      });
                      
                      return (
                        <div 
                          key={`${evt.type}-${evt.id || idx}`}
                          className={`p-2.5 rounded-xl ${style.bg} border ${style.border} flex items-center gap-3`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg}`}>
                            <EventIcon className={`w-4 h-4 ${style.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold ${style.color} truncate`}>
                              {evt.label || evt.type}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                              {dateFormatted}
                              {evt.details && ` • ${evt.details}`}
                            </p>
                          </div>
                          {evt.statut && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                              evt.statut === 'approuve' || evt.statut === 'validee'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            }`}>
                              {evt.statut === 'approuve' || evt.statut === 'validee' ? '✓ Validé' : 'En attente'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Lien voir plus si plus de 4 événements */}
                    {evenementsAVenir.length > 4 && (
                      <Link
                        to="/mes-conges"
                        className="w-full py-2 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        Voir tout ({evenementsAVenir.length})
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                )}
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
                    {new Date(selectedShiftForDemande.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })} • {getShiftHoraires(selectedShiftForDemande)}
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
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${
                      selectedShiftDetails.type === 'matin' 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : selectedShiftDetails.type === 'soir'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                      {selectedShiftDetails.type}
                    </span>
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
                        ? '✓ Votre candidature a été acceptée ! Vous devez effectuer ce shift.'
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

      <BottomNav />
    </div>
  );
}

export default HomeEmploye;
