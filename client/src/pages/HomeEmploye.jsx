import { useEffect, useState, useMemo, useCallback, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Calendar, FileText, User, ChevronRight, Timer, QrCode, RefreshCw, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import axios from 'axios';
import BottomNav from '../components/BottomNav';
import { ThemeContext } from '../context/ThemeContext';

// Couleur de marque centrale (utilisée aussi sur la page Pointage)
const brand = '#cf292c';

function HomeEmploye() {
  const { theme } = useContext(ThemeContext); // eslint-disable-line no-unused-vars
  const [prenom, setPrenom] = useState('Employé');
  const [nom, setNom] = useState('');
  const [now, setNow] = useState(new Date());
  // Stats temps réel
  const [journeeHeures, setJourneeHeures] = useState(null); // ex: "05h12"
  const [pointagesCount, setPointagesCount] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [pointages, setPointages] = useState([]); // liste brute
  const [weeklyHours, setWeeklyHours] = useState(null);
  const [weeklyProgress, setWeeklyProgress] = useState(0);
  const [compact, setCompact] = useState(()=>{
    try { return localStorage.getItem('home_compact') === '1'; } catch { return false; }
  });
  // Offline queue (mode hors-ligne)
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [syncingOffline, setSyncingOffline] = useState(false);
  const [offlineMsg, setOfflineMsg] = useState(null);
  // Qualité & comportement states
  const [expectedStart, setExpectedStart] = useState(()=>{
    try { return localStorage.getItem('expected_start_time') || '09:00'; } catch { return '09:00'; }
  });
  const [periodDays, setPeriodDays] = useState(()=>{
    try { const v = localStorage.getItem('punctuality_period_days'); return v? parseInt(v,10):7; } catch { return 7; }
  });
  const [avgDelayMin, setAvgDelayMin] = useState(null);
  const [punctualityScore, setPunctualityScore] = useState(null); // 0-100
  const [streakDays, setStreakDays] = useState(0);
  const [todayAnomalies, setTodayAnomalies] = useState([]);

  // Objectif quotidien configurable
  const [dailyTarget, setDailyTarget] = useState(()=>{
    try {
      const saved = localStorage.getItem('daily_target_hours');
      return saved ? parseFloat(saved) : 8;
    } catch { return 8; }
  });
  const WEEKLY_DAYS_STANDARD = 5;
  const weeklyTarget = useMemo(()=> (dailyTarget || 0) * WEEKLY_DAYS_STANDARD, [dailyTarget]);
  const WEEKLY_TARGET = weeklyTarget; // alias pour usages existants
  const [editingTarget, setEditingTarget] = useState(false);
  const OFFLINE_KEY = 'offline_pointages_queue';

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
        const res = await axios.get('http://localhost:5000/user/profile', { headers: { Authorization: `Bearer ${token}` }});
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
        axios.get('http://localhost:5000/pointage/total-aujourdhui', { headers: { Authorization: `Bearer ${token}` }}),
        axios.get('http://localhost:5000/pointage/mes-pointages', { headers: { Authorization: `Bearer ${token}` }})
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

  // Cartes d'actions configurables
  const actions = [
    {
      label: 'Pointage',
      to: '/pointage',
      desc: 'Accéder & scanner',
      icon: Clock,
      accent: 'from-green-50 via-white to-green-50',
      chip: 'Temps réel'
    },
    {
      label: 'Mes congés',
      to: '/mes-conges',
      desc: 'Demandes & soldes',
      icon: Calendar,
      accent: 'from-amber-50 via-white to-amber-50',
      chip: 'Congés'
    },
    {
      label: 'Mes documents',
      to: '/documents',
      desc: 'Bulletins & PDFs',
      icon: FileText,
      accent: 'from-blue-50 via-white to-blue-50',
      chip: 'PDF'
    },
    {
      label: 'Mon profil',
      to: '/employee/profil',
      desc: 'Infos personnelles',
      icon: User,
      accent: 'from-gray-50 via-white to-gray-50',
      chip: null
    }
  ];

  // Dérivés utiles (mémo pour éviter recalculs)
  const derived = useMemo(() => {
    if (!pointages || pointages.length === 0) return {
      last: null,
      first: null,
      sorted: [],
      progress: 0,
      workedHoursFloat: journeeHeures ? parseFloat(journeeHeures.replace('h', '.')) : 0,
      anomaly: false,
      suggestion: 'Commencez votre journée avec un pointage.'
    };
    // Essayer de déterminer champ d'horodatage
    const getDate = (p) => new Date(p.horodatage || p.date || p.createdAt || p.timestamp || p.time);
    const sorted = [...pointages].sort((a,b)=>getDate(a)-getDate(b));
    const first = sorted[0];
    const last = sorted[sorted.length-1];
    // Reconvertir journeeHeures (string "05h12") en heures décimales si dispo
    let workedHoursFloat = 0;
    if (journeeHeures) {
      const match = /^(\d{2})h(\d{2})$/.exec(journeeHeures);
      if (match) workedHoursFloat = parseInt(match[1],10) + parseInt(match[2],10)/60;
    }
  const progress = Math.min(100, Math.round((workedHoursFloat / (dailyTarget||8)) * 100));
    const anomaly = sorted.length % 2 === 1; // arrivée sans départ potentiellement
    let suggestion = '';
    if (progress >= 100) suggestion = 'Objectif atteint. Pensez à finaliser votre départ.';
    else if (progress >= 75) suggestion = 'Dernière ligne droite, plus que ' + ((dailyTarget - workedHoursFloat).toFixed(1)) + 'h.';
    else if (progress >= 50) suggestion = 'Bonne progression, restez régulier.';
    else if (progress > 0) suggestion = 'Continuez, objectif à ' + dailyTarget + 'h.';
    else suggestion = 'Commencez votre journée avec un pointage.';
    return { last, first, sorted, progress, workedHoursFloat, anomaly, suggestion };
  }, [pointages, journeeHeures, dailyTarget]);

  // Calculs complémentaires semaine + estimation
  useEffect(()=>{
    if (!pointages || pointages.length === 0) {
      setWeeklyHours(0);
      setWeeklyProgress(0);
      return;
    }
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7; // 0 = lundi
    const monday = new Date(today); monday.setHours(0,0,0,0); monday.setDate(today.getDate()-dayOfWeek);
    const nextMonday = new Date(monday); nextMonday.setDate(monday.getDate()+7);
    const getDate = (p) => new Date(p.horodatage || p.date || p.createdAt || p.timestamp || p.time);
    const weekPoints = pointages.filter(p=>{ const d = getDate(p); return d>=monday && d<nextMonday; });
    const sorted = weekPoints.sort((a,b)=>getDate(a)-getDate(b));
    // Pairing pour heures
    let totalMs = 0; let open = null;
    for (const p of sorted){
      const t = (p.type || p.type_pointage || p.nature || '').toLowerCase();
      const d = getDate(p);
      if (['arrivee','entrée','entree','in'].includes(t)) {
        if (!open) open = d; // ignore si déjà ouvert
      } else if (['depart','sortie','out'].includes(t)) {
        if (open) { totalMs += Math.max(0, d - open); open = null; }
      }
    }
    const weekHours = totalMs / 1000 / 3600;
    setWeeklyHours(weekHours);
    setWeeklyProgress(Math.min(100, Math.round((weekHours / WEEKLY_TARGET) * 100)));
  }, [pointages, derived.workedHoursFloat, dailyTarget, WEEKLY_TARGET]);

  // Charger la file hors-ligne
  useEffect(()=>{
    try {
      const raw = localStorage.getItem(OFFLINE_KEY);
      if (raw) setOfflineQueue(JSON.parse(raw));
    } catch {}
  }, []);

  const flushOffline = async () => {
    if (!offlineQueue.length) return;
    setSyncingOffline(true);
    setOfflineMsg(null);
    try {
      // Tentative d'envoi séquentielle (adapter endpoint réel si différent)
      const remaining = [];
      for (const item of offlineQueue) {
        try {
          await axios.post('http://localhost:5000/pointage/enregistrer', item, { headers: { Authorization: `Bearer ${token}` }});
        } catch (e) {
          remaining.push(item); // conserve si échec
        }
      }
      setOfflineQueue(remaining);
      try { localStorage.setItem(OFFLINE_KEY, JSON.stringify(remaining)); } catch {}
      setOfflineMsg(remaining.length ? 'Certaines entrées n\'ont pas pu être synchronisées.' : 'File synchronisée.');
      if (!remaining.length) fetchStats();
    } catch (e) {
      setOfflineMsg('Erreur de synchronisation.');
    } finally {
      setSyncingOffline(false);
    }
  };

  const toggleCompact = () => {
    setCompact(c=>{ const n=!c; try { localStorage.setItem('home_compact', n?'1':'0'); } catch {} return n; });
  };

  const formatTime = (p) => {
    if (!p) return '--:--';
    const d = new Date(p.horodatage || p.date || p.createdAt || p.timestamp || p.time);
    if (isNaN(d)) return '--:--';
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const pointageType = (p) => (p?.type || p?.type_pointage || p?.nature || '').toString();

  // --- Qualité & Comportement Logic ---
  useEffect(()=>{
    // Only process when we have today's pointages (pointages list already is for today)
    const anomalies = [];
    if (pointages && pointages.length){
      // Sorted copy
      const getDate = (p) => new Date(p.horodatage || p.date || p.createdAt || p.timestamp || p.time);
      const sorted = [...pointages].sort((a,b)=>getDate(a)-getDate(b));
      // Track duplicates
      for (let i=1;i<sorted.length;i++){
        const prevType = pointageType(sorted[i-1]).toLowerCase();
        const currType = pointageType(sorted[i]).toLowerCase();
        if ([prevType,currType].every(t=>['arrivee','entrée','entree','in'].includes(t))){
          anomalies.push({ type:'doublon_arrivee', label: 'Doublon arrivée', time: getDate(sorted[i]).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) });
        }
        if ([prevType,currType].every(t=>['depart','sortie','out'].includes(t))){
          anomalies.push({ type:'doublon_depart', label: 'Doublon départ', time: getDate(sorted[i]).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) });
        }
      }
      if (sorted.length %2 ===1){
        anomalies.push({ type:'arrivee_sans_depart', label:'Arrivée sans départ (séquence ouverte)', time: getDate(sorted[sorted.length-1]).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) });
      }
    }
    setTodayAnomalies(anomalies);

    // Update punctuality & streak history in localStorage
    try {
      const dateKey = new Date().toISOString().slice(0,10);
      const arrivalEvent = pointages ? pointages.find(p=>['arrivee','entrée','entree','in'].includes(pointageType(p).toLowerCase())):null;
      if (arrivalEvent){
        const d = new Date(arrivalEvent.horodatage || arrivalEvent.date || arrivalEvent.createdAt || arrivalEvent.timestamp || arrivalEvent.time);
        const hh = d.getHours().toString().padStart(2,'0');
        const mm = d.getMinutes().toString().padStart(2,'0');
        const arrivalHistoryRaw = localStorage.getItem('arrival_history');
        const arrivalHistory = arrivalHistoryRaw? JSON.parse(arrivalHistoryRaw):{};
        if (!arrivalHistory[dateKey]){ // store once
          arrivalHistory[dateKey] = `${hh}:${mm}`;
          localStorage.setItem('arrival_history', JSON.stringify(arrivalHistory));
        }
      }
      // completeness quality (no anomalies & even length & >0)
      const qualityHistoryRaw = localStorage.getItem('quality_history');
      const qualityHistory = qualityHistoryRaw? JSON.parse(qualityHistoryRaw):{};
      const isCompleteNoAnom = pointages && pointages.length>0 && todayAnomalies.length===0;
      qualityHistory[dateKey] = isCompleteNoAnom;
      localStorage.setItem('quality_history', JSON.stringify(qualityHistory));

      // Compute punctuality over periodDays
      const arrivalHistoryRaw2 = localStorage.getItem('arrival_history');
      const arrivalHistory2 = arrivalHistoryRaw2? JSON.parse(arrivalHistoryRaw2):{};
      const expectedParts = expectedStart.split(':');
      const expMinutes = parseInt(expectedParts[0]||'9',10)*60 + parseInt(expectedParts[1]||'0',10);
      const dates = Object.keys(arrivalHistory2).sort().slice(-periodDays);
      let totalDelay = 0; let counted = 0;
      for (const dKey of dates){
        const arr = arrivalHistory2[dKey];
        if (/^\d{2}:\d{2}$/.test(arr)){
          const [ah,am] = arr.split(':').map(n=>parseInt(n,10));
          const arrMin = ah*60+am;
          const delay = arrMin - expMinutes;
            if (delay>0){ totalDelay += delay; }
          counted++;
        }
      }
      if (counted>0){
        const avg = totalDelay / counted;
        setAvgDelayMin(avg);
        // Score simple: 100 - (avgDelay / 30min *100) capped
        const score = Math.max(0, Math.min(100, Math.round(100 - (avg/30)*100)));
        setPunctualityScore(score);
      } else {
        setAvgDelayMin(null); setPunctualityScore(null);
      }
      // Compute streak of consecutive complete days
      const qh = qualityHistory; // already updated today
      let streak = 0;
      for (let i=0;i<60;i++){ // max lookback 60 days
        const d = new Date(); d.setDate(d.getDate()-i);
        const dk = d.toISOString().slice(0,10);
        if (qh[dk]) streak++; else break;
      }
      setStreakDays(streak);
    } catch {/* ignore */}
  }, [pointages, expectedStart, periodDays, todayAnomalies.length]);

  const handleExpectedStartChange = (e) => {
    const v = e.target.value;
    setExpectedStart(v);
    try { localStorage.setItem('expected_start_time', v); } catch {}
  };
  const handlePeriodDaysChange = (e) => {
    const v = parseInt(e.target.value,10); setPeriodDays(v); try { localStorage.setItem('punctuality_period_days', String(v)); } catch {} };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 lg:pt-14 flex flex-col transition-colors">
      {/* Bandeau / Hero */}
  <div className="relative">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(207,41,44,0.25),transparent),linear-gradient(120deg,#fff,rgba(207,41,44,0.05))] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(207,41,44,0.15),transparent),linear-gradient(120deg,#121214,rgba(207,41,44,0.08))] transition-colors" />
    <div className="relative px-5 pt-8 lg:pt-8 pb-10 sm:px-8 sm:pt-10 sm:pb-12">
          <div className="flex items-start justify-between gap-4">
            <div>
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Tableau de bord</p>
      <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                Bonjour <span style={{color: brand}}>{prenom}{nom ? ' ' + nom : ''}</span> 👋
              </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 capitalize">{dateStr}</p>
            </div>
            <div className="flex flex-col items-end">
      <span className="font-mono text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{timeStr}</span>
      <span className="text-[11px] tracking-wide uppercase text-gray-400 dark:text-gray-500 mt-1">Temps réel</span>
            </div>
          </div>

      {/* Statistiques rapides */}
  <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4" aria-live="polite">
            <div className="col-span-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-3 sm:px-4 sm:py-4 flex flex-col shadow-sm focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#cf292c]" tabIndex={0} aria-label="Heures travaillées aujourd'hui">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Heures</span>
                <Timer className="w-4 h-4" style={{color: brand}} aria-hidden="true" />
              </div>
              {loadingStats ? (
                <div className="h-6 w-16 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ) : statsError ? (
                <button onClick={fetchStats} className="flex items-center gap-1 text-[10px] text-red-600 hover:underline">
                  <AlertCircle className="w-3 h-3" /> Retry
                </button>
              ) : (
                <span className="font-mono text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">{journeeHeures}</span>
              )}
              <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Aujourd'hui</span>
            </div>
            <div className="col-span-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-3 sm:px-4 sm:py-4 flex flex-col shadow-sm focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#cf292c]" tabIndex={0} aria-label="Nombre de pointages d'aujourd'hui">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Pointages</span>
                <QrCode className="w-4 h-4" style={{color: brand}} aria-hidden="true" />
              </div>
              {loadingStats ? (
                <div className="h-6 w-10 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ) : statsError ? (
                <button onClick={fetchStats} className="flex items-center gap-1 text-[10px] text-red-600 hover:underline">
                  <AlertCircle className="w-3 h-3" /> Retry
                </button>
              ) : (
                <span className="font-mono text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">{pointagesCount}</span>
              )}
              <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Aujourd'hui</span>
            </div>
            <div className="col-span-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-3 sm:px-4 sm:py-4 flex flex-col shadow-sm" tabIndex={0} aria-label="Statut actuel">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">Statut</span>
                <Clock className="w-4 h-4" style={{color: brand}} aria-hidden="true" />
              </div>
              <span className="text-sm font-medium text-green-600">Actif</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Session ouverte</span>
            </div>
            <div className="col-span-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-3 sm:px-4 sm:py-4 flex flex-col shadow-sm" tabIndex={0} aria-label="Profil utilisateur">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">Profil</span>
                <User className="w-4 h-4" style={{color: brand}} aria-hidden="true" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[140px]">{prenom}{nom ? ' ' + nom : ''}</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Employé</span>
            </div>
            {/* Weekly progress */}
            <div className="col-span-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-3 sm:px-4 sm:py-4 flex flex-col shadow-sm" tabIndex={0} aria-label="Progression hebdomadaire">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Semaine</span>
                <span className="text-[10px] text-gray-400">{weeklyHours? weeklyHours.toFixed(1)+'h':''}</span>
              </div>
              <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
                <div className="h-full" style={{background: brand, width: weeklyProgress+'%'}} />
              </div>
              <span className="text-[11px] text-gray-400 mt-1">{weeklyProgress}% / {WEEKLY_TARGET}h</span>
            </div>
            {/* Cartes supprimées: streak & estimation fin */}
          </div>
        </div>
      </div>

      {/* Actions principales */}
  <div className="flex-1 px-5 sm:px-8 mt-6 mb-6">
          {/* Valeur ajoutée : Suivi quotidien */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400">Suivi</h2>
            <button onClick={toggleCompact} className="text-[11px] px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">{compact ? 'Mode complet' : 'Mode compact'}</button>
          </div>
          <div className={`mb-8 grid gap-4 ${compact ? 'md:grid-cols-3' : 'md:grid-cols-5'}`}>
            <div className={`${compact ? 'md:col-span-2' : 'md:col-span-3'} bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-5 relative overflow-hidden`}>
              <div className="absolute inset-0 pointer-events-none opacity-5" style={{background: 'radial-gradient(circle at 85% 15%, '+brand+' 0%, transparent 60%)'}} />
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Progression de la journée</h3>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 tracking-wide flex items-center gap-1">
                  Objectif {dailyTarget}h
                  <button
                    onClick={()=>setEditingTarget(v=>!v)}
                    className="text-[10px] px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    type="button"
                    aria-label="Modifier l'objectif quotidien"
                  >{editingTarget? 'OK':'✎'}</button>
                </span>
              </div>
              {editingTarget && (
                <div className="mt-2 flex items-center gap-2">
                  <select
                    className="text-xs border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#cf292c]"
                    value={dailyTarget}
                    onChange={(e)=>{ const v=parseFloat(e.target.value); setDailyTarget(v); try{localStorage.setItem('daily_target_hours', String(v));}catch{} }}
                  >
                    {[6,6.5,7,7.5,8,8.5,9,9.5,10].map(h=> <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <button
                    onClick={()=>{ setEditingTarget(false); }}
                    className="text-[11px] px-2 py-1 rounded bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    type="button"
                  >Valider</button>
                </div>
              )}
              <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{background: brand, width: derived.progress+'%'}} />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>{journeeHeures || '--:--'} travaillées</span>
                <span>{derived.progress}%</span>
              </div>
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{derived.suggestion}</p>
              {derived.anomaly && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-md px-2 py-1">
                  <AlertCircle className="w-3 h-3" /> Séquence incomplète : pensez à pointer votre sortie.
                </div>
              )}
            </div>
            <div className={`${compact ? 'md:col-span-1' : 'md:col-span-2'} grid gap-4`}>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Dernier pointage</h3>
                {loadingStats ? (
                  <div className="animate-pulse h-8 bg-gray-100 dark:bg-gray-700 rounded" />
                ) : derived.last ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-mono font-semibold text-gray-900 dark:text-gray-100">{formatTime(derived.last)}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                        {pointageType(derived.last) || 'Pointage'}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <span>Premier: {formatTime(derived.first)}</span>
                      <span className="text-gray-300">•</span>
                      <span>Total: {pointagesCount ?? 0}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Aucun pointage encore aujourd'hui.</p>
                )}
                <Link to="/pointage" className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[color:var(--brand,#cf292c)] hover:underline">
                  Accéder au pointage <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {!compact && <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Récents</h3>
                {loadingStats ? (
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                ) : derived.sorted.length > 0 ? (
                  <ul className="space-y-2 text-xs">
                    {derived.sorted.slice(-3).reverse().map((p,i)=>(
                      <li key={i} className="flex items-center justify-between rounded-md px-2 py-1 bg-gray-50 dark:bg-gray-700">
                        <span className="font-mono text-gray-800 dark:text-gray-100">{formatTime(p)}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                          {pointageType(p) || 'Pointage'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rien pour l'instant.</p>
                )}
              </div>}
            </div>
          </div>
        {/* Assistance */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 mb-3">Aide & Assistance</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Suggestion automatique */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Suggestion</h3>
              {(() => {
                const first = derived.first; const remaining = (dailyTarget || 0) - derived.workedHoursFloat;
                if (!first) return <p className="text-xs text-gray-500 dark:text-gray-400">Commencez avec un pointage d'arrivée.</p>;
                if (remaining <= 0) return <p className="text-xs text-green-600">Objectif atteint, vous pouvez clôturer.</p>;
                const est = new Date(Date.now() + remaining * 3600 * 1000);
                return <p className="text-xs text-gray-600 dark:text-gray-300">Pensez à pointer votre sortie vers <span className="font-medium" style={{color: brand}}>{est.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>.</p>;
              })()}
            </div>
            {/* Checklist du jour (adaptée au système réel pauses: départ midi -> retour) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Checklist du jour</h3>
              {(() => {
                const norm = (t) => (t||'').toLowerCase();
                const events = derived.sorted.map(p => ({ raw:p, type: norm(p.type||p.type_pointage||p.nature), date: new Date(p.horodatage||p.date||p.createdAt||p.timestamp||p.time) }));
                const hasArrivee = events.some(e=>['arrivee','entrée','entree','in'].includes(e.type));
                const hasDepartFinal = (()=>{ // dernier événement est un départ
                  if (!events.length) return false;
                  const last = events[events.length-1];
                  return ['depart','sortie','out'].includes(last.type);
                })();
                // Pause midi: pattern depart -> arrivee plus tard avec écart >= 30m
                let pauseTaken = false; let pauseDurationMin = null;
                for (let i=0;i<events.length;i++) {
                  const e = events[i];
                  if (['depart','sortie','out'].includes(e.type)) {
                    // chercher prochaine arrivée
                    for (let j=i+1;j<events.length;j++) {
                      const r = events[j];
                      if (['arrivee','entrée','entree','in'].includes(r.type)) {
                        const diffMin = Math.round((r.date - e.date)/60000);
                        if (diffMin >= 30 && diffMin <= 180) { // plausible pause déjeuner
                          pauseTaken = true; pauseDurationMin = diffMin; break;
                        }
                      }
                    }
                    if (pauseTaken) break;
                  }
                }
                const Item = ({done,label,extra}) => (
                  <li className="flex items-center justify-between py-1 text-xs">
                    <div className="flex items-center gap-2">
                      {done ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
                      <span className={done? 'line-through text-gray-400 dark:text-gray-500':'text-gray-700 dark:text-gray-300'}>{label}</span>
                    </div>
                    {extra && <span className="text-[10px] text-gray-500 dark:text-gray-400">{extra}</span>}
                  </li>
                );
                const pauseExtra = pauseDurationMin!=null ? `${Math.floor(pauseDurationMin/60)}h${(pauseDurationMin%60).toString().padStart(2,'0')}` : null;
                return (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    <Item done={hasArrivee} label="Arrivée" />
                    <Item done={pauseTaken} label="Pause déjeuner" extra={pauseExtra} />
                    <Item done={hasDepartFinal} label="Départ" />
                  </ul>
                );
              })()}
            </div>
            {/* Mode hors ligne */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Mode hors ligne</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">Pointages en attente : <span className="font-medium" style={{color: brand}}>{offlineQueue.length}</span></p>
              <div className="flex items-center gap-2">
                <button disabled={!offlineQueue.length || syncingOffline} onClick={flushOffline} className="text-[11px] px-2 py-1 rounded bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed">
                  {syncingOffline ? 'Sync...' : 'Synchroniser'}
                </button>
                <button onClick={()=>{ try { localStorage.setItem(OFFLINE_KEY,'[]'); setOfflineQueue([]); } catch {} }} disabled={!offlineQueue.length || syncingOffline} className="text-[11px] px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40">Vider</button>
              </div>
              {offlineMsg && <p className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">{offlineMsg}</p>}
              <p className="mt-3 text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">Les pointages hors ligne sont stockés localement et envoyés quand la connexion revient.</p>
            </div>
          </div>
        </section>
        {/* Qualité & Comportement */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 mb-3">Qualité & Comportement</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Ponctualité */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Ponctualité</h3>
                {punctualityScore!=null && <span className="text-[11px] font-medium" style={{color: brand}}>{punctualityScore}%</span>}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">Moyenne des retards sur {periodDays} jours.</p>
              {avgDelayMin!=null ? (
                <p className="text-xs text-gray-700 dark:text-gray-300">Retard moyen: <span className="font-medium" style={{color: brand}}>{Math.round(avgDelayMin)} min</span></p>
              ) : <p className="text-xs text-gray-400 dark:text-gray-500">Pas encore de données suffisantes.</p>}
              <div className="mt-3 flex items-center gap-2">
                <input type="time" value={expectedStart} onChange={handleExpectedStartChange} className="text-[11px] border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#cf292c]" />
                <select value={periodDays} onChange={handlePeriodDaysChange} className="text-[11px] border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#cf292c]">
                  {[3,5,7,14,21,30].map(d=> <option key={d} value={d}>{d}j</option>)}
                </select>
              </div>
              <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">Arrivée attendue {expectedStart}</p>
            </div>
            {/* Streak */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Streak jours complets</h3>
              <p className="text-2xl font-semibold" style={{color: brand}}>{streakDays}<span className="text-sm text-gray-400 dark:text-gray-500 ml-1">jour{streakDays>1?'s':''}</span></p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Jours consécutifs sans anomalies.</p>
              <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">Basé sur l'intégrité des séquences (arrivées/départs).</p>
            </div>
            {/* Anomalies */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">Anomalies ouvertes {todayAnomalies.length>0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700">{todayAnomalies.length}</span>}</h3>
              {todayAnomalies.length ? (
                <ul className="space-y-1 mb-3">
                  {todayAnomalies.slice(0,4).map((a,i)=>(
                    <li key={i} className="flex items-center justify-between text-[11px] bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-700 rounded px-2 py-1 text-red-700 dark:text-red-400">
                      <span className="truncate">{a.label}</span>
                      {a.time && <span className="ml-2 font-mono">{a.time}</span>}
                    </li>
                  ))}
                  {todayAnomalies.length>4 && <li className="text-[10px] text-red-600 dark:text-red-400">+{todayAnomalies.length-4} autres...</li>}
                </ul>
              ) : <p className="text-[11px] text-gray-500 dark:text-gray-400">Aucune anomalie détectée.</p>}
              <Link to="/pointage" className="mt-auto inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                Corriger <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </section>
        <h2 className="text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 mb-3">Raccourcis</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="list">
          {actions.map(({ label, to, desc, icon: Icon, accent, chip }) => (
            <Link
              key={to}
              to={to}
              className={`group relative overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-gradient-to-br ${accent} dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 p-4 sm:p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#cf292c] focus:ring-offset-white dark:focus:ring-offset-gray-900`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
      role="listitem"
      aria-label={label}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform" style={{backgroundColor: brand + '1A', color: brand, boxShadow: 'inset 0 0 0 1px '+brand+'33'}} aria-hidden="true">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{label}</p>
                  {chip && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 dark:bg-gray-700/60 backdrop-blur border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium">
                      {chip}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-500 transition-colors group-hover:text-current" style={{color: brand}} aria-hidden="true" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 opacity-0 group-hover:opacity-60 transition-opacity" style={{background: `linear-gradient(90deg,transparent, ${brand}, transparent)`}} />
            </Link>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-2">
          <button onClick={fetchStats} disabled={loadingStats} className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#cf292c] focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900" aria-label="Rafraîchir les statistiques">
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} /> Rafraîchir
          </button>
          {statsError && <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {statsError}</span>}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default HomeEmploye;
