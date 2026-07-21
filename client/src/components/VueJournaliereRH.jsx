import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import NavigationRestoreNotification from "./NavigationRestoreNotification";
import { saveNavigation, restoreNavigation, getSessionDuration } from "../utils/navigationUtils";
import { API_BASE } from '../config/api';

function VueJournaliereRH() {
  // Helper pour obtenir la date locale au format YYYY-MM-DD
  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Restaurer la date sauvegardée
  const getInitialDate = () => {
    const restored = restoreNavigation('vueJournaliereRH');
    return restored.date || getLocalDateString();
  };

  const [date, setDate] = useState(getInitialDate());
  const [pointages, setPointages] = useState([]);
  const [pendingPointages, setPendingPointages] = useState([]);
  const [exportingPresence, setExportingPresence] = useState(false);
  const [presenceMois, setPresenceMois] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const monthPickerRef = useRef(null);
  
  // États pour la notification de restauration
  const [showRestoreNotification, setShowRestoreNotification] = useState(false);
  const [restoreNotificationData, setRestoreNotificationData] = useState(null);

  // 🛠️ Complétion manuelle d'un départ non pointé (admin)
  const [completingUser, setCompletingUser] = useState(null); // { id, nom, prenom, email }
  const [completeTime, setCompleteTime] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');

  // ✏️ Correction d'un pointage existant (erreur de saisie admin)
  const [correctingUserId, setCorrectingUserId] = useState(null);
  const [correctValues, setCorrectValues] = useState({}); // { [pointageId]: "HH:mm" }
  const [correctSaving, setCorrectSaving] = useState(null); // pointageId en cours d'enregistrement
  const [correctFeedback, setCorrectFeedback] = useState({}); // { [pointageId]: 'success' | 'error' }
  const [blocsToShow, setBlocsToShow] = useState(1); // nombre de blocs affichés dans la modale (existants + ajoutés manuellement)

  // 🔍 Recherche & filtre de statut
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | enposte | termine | anomalie
  // ⏱️ Horloge live pour le temps écoulé "en poste"
  const [now, setNow] = useState(new Date());

  const token = localStorage.getItem("token");

  // Vérifier si la position a été restaurée (seulement au premier rendu)
  useEffect(() => {
    const checkNavigationRestore = () => {
      const restored = restoreNavigation('vueJournaliereRH');
      const today = getLocalDateString();
      
      // Si la date restaurée est différente d'aujourd'hui et qu'il y a une dernière visite
      if (restored.wasRestored && restored.date !== today && restored.lastVisit) {
        const sessionDuration = getSessionDuration(restored.lastVisit);
        
        // Afficher la notification si la session est récente (moins de 7 jours)
        if (sessionDuration && sessionDuration < 10080) { // 7 jours en minutes
          setRestoreNotificationData({
            date: restored.date,
            viewType: 'jour', // Vue journalière
            sessionDuration
          });
          setShowRestoreNotification(true);
        }
      }
    };

    checkNavigationRestore();
  }, []); // Exécuter seulement au montage

  // Sauvegarde automatique de la date
  useEffect(() => {
    saveNavigation('vueJournaliereRH', { date });
  }, [date]);

  // ⏱️ Tick toutes les minutes pour rafraîchir le temps écoulé "en poste"
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const handleExportExcel = () => {
    const rows = [];

    pointages.forEach((user) => {
      if (user.blocs.length > 0) {
        user.blocs.forEach((bloc) => {
          rows.push({
            Email: user.email,
            Nom: user.nom || '',
            Prénom: user.prenom || '',
            Arrivée: bloc.arrivee || '—',
            Départ: bloc.depart || '—',
            "Durée du bloc": bloc.duree || '-',
          });
        });
        rows.push({
          Email: "",
          Nom: "",
          Prénom: "",
          Arrivée: "",
          Départ: "Total",
          "Durée du bloc": user.total,
        });
      } else {
        rows.push({
          Email: user.email,
          Nom: user.nom || '',
          Prénom: user.prenom || '',
          Arrivée: '—',
          Départ: '—',
          "Durée du bloc": '-',
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vue Journalière RH");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `vue_journaliere_${date}.xlsx`);
  };

  const handleExportFichePresence = async () => {
    try {
      setExportingPresence(true);
      const res = await axios.get(
        `${API_BASE}/api/stats/rapports/export-presence?mois=${presenceMois}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const [annee, moisNum] = presenceMois.split('-');
      const d = new Date(parseInt(annee), parseInt(moisNum) - 1, 1);
      const moisFr = d.toLocaleDateString('fr-FR', { month: 'long' });
      const moisCap = moisFr.charAt(0).toUpperCase() + moisFr.slice(1);
      saveAs(blob, `Fiche_Presence_${moisCap}_${annee}.xlsx`);
    } catch (err) {
      console.error('Erreur export fiche de présence:', err);
      alert('Erreur lors de l\'export de la fiche de présence');
    } finally {
      setExportingPresence(false);
    }
  };

  const fetchPointages = useCallback(async () => {
    // 🧪 PREVIEW : données de démonstration pour visualiser le rendu (mettre à false pour revenir au réel)
    const PREVIEW_MOCK = false;
    if (PREVIEW_MOCK && date === getLocalDateString()) {
      setPointages([
        { id: 101, email: 'sophie.martin@chez-antoine.fr', prenom: 'Sophie', nom: 'Martin', total: '', blocs: [{ arrivee: '08:30', depart: null, duree: '-' }] },
        { id: 102, email: 'antoine.garcia@chez-antoine.fr', prenom: 'Antoine', nom: 'Garcia', total: '', blocs: [{ arrivee: '07:45', depart: '12:00', duree: '4h15' }, { arrivee: '12:45', depart: null, duree: '-' }] },
        { id: 103, email: 'karim.benali@chez-antoine.fr', prenom: 'Karim', nom: 'Benali', total: '', blocs: [{ arrivee: '11:15', depart: null, duree: '-' }] },
        { id: 104, email: 'julie.dubois@chez-antoine.fr', prenom: 'Julie', nom: 'Dubois', total: '7h30', blocs: [{ arrivee: '08:00', depart: '12:00', duree: '4h00' }, { arrivee: '13:00', depart: '16:30', duree: '3h30' }] },
        { id: 105, email: 'thomas.petit@chez-antoine.fr', prenom: 'Thomas', nom: 'Petit', total: '6h00', blocs: [{ arrivee: '09:00', depart: '15:00', duree: '6h00' }] },
        { id: 106, email: 'lea.moreau@chez-antoine.fr', prenom: 'Léa', nom: 'Moreau', total: '0h00', blocs: [] },
      ]);
      setPendingPointages([]);
      return;
    }
    try {
      const [resPointages, resPending] = await Promise.all([
        axios.get(
          `${API_BASE}/pointage/admin/pointages/jour/${date}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `${API_BASE}/pointage/admin/pending/${date}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => ({ data: [] })) // Silencieux si erreur
      ]);
      setPointages(resPointages.data);
      setPendingPointages(resPending.data || []);
    } catch (err) {
      console.error("Erreur chargement pointages :", err);
    }
  }, [date, token]);

  useEffect(() => {
    fetchPointages();
    
    // Auto-refresh toutes les 30s si on regarde aujourd'hui
    const today = getLocalDateString();
    let intervalId;
    if (date === today) {
      intervalId = setInterval(fetchPointages, 30000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [fetchPointages]);

  // Fermer le picker au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target)) {
        setShowMonthPicker(false);
      }
    };
    if (showMonthPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMonthPicker]);

  const moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const moisLabelLong = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  // ── Helpers présence temps réel ─────────────────────────────────────
  const isToday = date === getLocalDateString();

  const parseHeure = (val) => {
    if (!val) return null;
    const d = typeof val === 'string' && val.includes('T') ? dayjs(val) : dayjs(`${date}T${val}`);
    return d.isValid() ? d : null;
  };

  // Arrivée du bloc ouvert (arrivée sans départ) = personne encore en poste
  const getOpenArrivee = (user) => {
    if (!user.blocs || user.blocs.length === 0) return null;
    const last = user.blocs[user.blocs.length - 1];
    return (last.arrivee && !last.depart) ? parseHeure(last.arrivee) : null;
  };

  const getUserStatus = (user) => {
    if (!user.blocs || user.blocs.length === 0) return 'absent';
    const last = user.blocs[user.blocs.length - 1];
    const open = last.arrivee && !last.depart;
    if (open) return isToday ? 'enposte' : 'anomalie'; // bloc ouvert sur jour passé = sortie oubliée
    return 'termine';
  };

  // Un bloc est ouvert (arrivée pointée sans départ) → nécessite éventuellement une complétion manuelle
  const hasOpenBloc = (user) => {
    if (!user.blocs || user.blocs.length === 0) return false;
    const last = user.blocs[user.blocs.length - 1];
    return !!(last.arrivee && !last.depart);
  };

  const openCompleteModal = (user) => {
    setCompleteError('');
    setCompleteTime(user.heureFinPrevue || dayjs(now).format('HH:mm'));
    setCompletingUser(user);
  };

  const closeCompleteModal = () => {
    if (completing) return;
    setCompletingUser(null);
    setCompleteError('');
  };

  const handleConfirmComplete = async () => {
    if (!completingUser || !completeTime) return;
    setCompleting(true);
    setCompleteError('');
    try {
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = completeTime.split(':').map(Number);
      let horodatage = new Date(year, month - 1, day, hour, minute, 0);

      // Si le départ tombe avant (ou au même instant que) l'arrivée, c'est qu'il
      // a lieu après minuit (service traversant minuit) → on passe au jour suivant
      const lastBloc = completingUser.blocs?.[completingUser.blocs.length - 1];
      if (lastBloc?.arrivee && horodatage <= new Date(lastBloc.arrivee)) {
        horodatage = new Date(horodatage.getTime() + 24 * 60 * 60 * 1000);
      }

      await axios.post(
        `${API_BASE}/pointage/manuel`,
        { type: 'depart', horodatage: horodatage.toISOString(), userId: completingUser.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompletingUser(null);
      fetchPointages();
    } catch (err) {
      console.error('Erreur complétion départ:', err);
      setCompleteError(err.response?.data?.error || "Impossible d'enregistrer ce départ");
    } finally {
      setCompleting(false);
    }
  };

  // ✏️ Correction / ajout d'un pointage (erreur de saisie ou pointage manquant)
  const blocTimeToHHMM = (val) => {
    if (!val) return '';
    return typeof val === 'string' && val.includes('T') ? dayjs(val).format('HH:mm') : val;
  };

  const openCorrectModal = (user) => {
    const initialValues = {};
    user.blocs.forEach((bloc, blocIdx) => {
      initialValues[`${blocIdx}-arrivee`] = blocTimeToHHMM(bloc.arrivee);
      initialValues[`${blocIdx}-depart`] = blocTimeToHHMM(bloc.depart);
    });
    setCorrectValues(initialValues);
    setCorrectFeedback({});
    setBlocsToShow(Math.max(user.blocs.length, 1));
    setCorrectingUserId(user.id);
  };

  const closeCorrectModal = () => {
    setCorrectingUserId(null);
    setCorrectValues({});
    setCorrectFeedback({});
    setBlocsToShow(1);
  };

  const handleSaveField = async (blocIdx, field) => {
    const key = `${blocIdx}-${field}`;
    const timeStr = correctValues[key];
    if (!timeStr || !correctingUser) return;
    const bloc = correctingUser.blocs[blocIdx] || {};
    const pointageId = field === 'arrivee' ? bloc?.arriveeId : bloc?.departId;
    setCorrectSaving(key);
    setCorrectFeedback((prev) => ({ ...prev, [key]: null }));
    try {
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = timeStr.split(':').map(Number);
      let horodatage = new Date(year, month - 1, day, hour, minute, 0);

      // Départ avant (ou au même instant que) l'arrivée du même bloc → service
      // traversant minuit, on passe au jour suivant
      if (field === 'depart' && bloc?.arrivee && horodatage <= new Date(bloc.arrivee)) {
        horodatage = new Date(horodatage.getTime() + 24 * 60 * 60 * 1000);
      }

      if (pointageId) {
        // Le pointage existe déjà → on corrige son heure
        await axios.put(
          `${API_BASE}/pointage/corriger`,
          { pointageId, horodatage: horodatage.toISOString() },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Le pointage n'existe pas (oubli) → on le crée
        await axios.post(
          `${API_BASE}/pointage/manuel`,
          { type: field, horodatage: horodatage.toISOString(), userId: correctingUser.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setCorrectFeedback((prev) => ({ ...prev, [key]: 'success' }));
      fetchPointages();
    } catch (err) {
      console.error('Erreur correction pointage:', err);
      setCorrectFeedback((prev) => ({ ...prev, [key]: err.response?.data?.error || 'Erreur' }));
    } finally {
      setCorrectSaving(null);
    }
  };


  const getInitials = (user) => {
    if (user.nom && user.prenom) return `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();
    const base = user.nom || user.prenom || user.email || '?';
    return (base.charAt(0) + (base.charAt(1) || '')).toUpperCase();
  };

  const getNomComplet = (user) =>
    user.nom && user.prenom ? `${user.prenom} ${user.nom}` : (user.nom || user.prenom || user.email);

  const formatElapsed = (arrivee) => {
    if (!arrivee) return '';
    const mins = Math.max(0, dayjs(now).diff(arrivee, 'minute'));
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
  };

  const enPosteUsers = pointages.filter((u) => getUserStatus(u) === 'enposte');

  const statusCounts = pointages.reduce((acc, u) => {
    const s = getUserStatus(u);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const filteredPointages = pointages.filter((u) => {
    const s = getUserStatus(u);
    if (statusFilter !== 'all' && s !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const hay = `${u.email || ''} ${u.nom || ''} ${u.prenom || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const correctingUser = correctingUserId ? pointages.find((u) => u.id === correctingUserId) || null : null;

  const renderStatutBadge = (user) => {
    const s = getUserStatus(user);
    if (s === 'enposte') {
      const arr = getOpenArrivee(user);
      return (
        <div className="inline-flex flex-col items-center gap-0.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <span className="inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            En poste
          </span>
          {arr && <span className="text-[10px] text-gray-400 whitespace-nowrap">depuis {formatElapsed(arr)}</span>}
        </div>
      );
    }
    if (s === 'anomalie') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          Sortie manquante
        </span>
      );
    }
    if (s === 'termine') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Terminé
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 text-gray-400 text-xs font-medium border border-gray-200">
        Absent
      </span>
    );
  };

  return (
    <div className="bg-white p-3 sm:p-6 rounded-xl shadow-md border border-gray-100">
      {/* Barre de navigation + exports */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        {/* Gauche : Navigation date */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-700 mr-1">Date :</span>
          <button
            onClick={() => {
              const yesterday = new Date(date);
              yesterday.setDate(yesterday.getDate() - 1);
              setDate(getLocalDateString(yesterday));
            }}
            className="p-1.5 text-gray-400 hover:text-[#cf292c] hover:bg-gray-50 rounded transition"
            title="Jour précédent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] outline-none"
          />
          <button
            onClick={() => {
              const tomorrow = new Date(date);
              tomorrow.setDate(tomorrow.getDate() + 1);
              setDate(getLocalDateString(tomorrow));
            }}
            className="p-1.5 text-gray-400 hover:text-[#cf292c] hover:bg-gray-50 rounded transition"
            title="Jour suivant"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            onClick={() => {
              setDate(getLocalDateString());
              if (showRestoreNotification) setShowRestoreNotification(false);
            }}
            disabled={date === getLocalDateString()}
            className={`ml-1 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              date === getLocalDateString()
                ? 'bg-gray-100 text-gray-400 cursor-default'
                : 'bg-[#cf292c] text-white hover:bg-[#cf292c]/90'
            }`}
          >
            Aujourd'hui
          </button>
        </div>

        {/* Droite : Exports alignés */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 bg-[#cf292c] text-white px-3.5 py-1.5 rounded-lg hover:bg-[#cf292c]/90 transition-colors text-sm font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export du jour
          </button>

          <div className="w-px h-7 bg-gray-200" />

          <div className="relative" ref={monthPickerRef}>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => { setPickerYear(parseInt(presenceMois.split('-')[0])); setShowMonthPicker(!showMonthPicker); }}
                className="inline-flex items-center gap-2 border border-gray-300 border-r-0 rounded-l-lg px-3 py-1.5 text-sm bg-white hover:bg-gray-50 transition text-gray-700 font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {moisLabelLong[parseInt(presenceMois.split('-')[1]) - 1]} {presenceMois.split('-')[0]}
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showMonthPicker ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <button
                onClick={handleExportFichePresence}
                disabled={exportingPresence}
                className="inline-flex items-center gap-2 bg-white text-[#cf292c] border border-[#cf292c] px-3.5 py-1.5 rounded-r-lg hover:bg-[#cf292c]/5 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {exportingPresence ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                Fiche de présence
              </button>
            </div>

            {/* Dropdown calendrier mois */}
            {showMonthPicker && (
              <div className="absolute top-full mt-1.5 left-0 z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-[260px] animate-fade-in">
                {/* Navigation année */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setPickerYear(y => y - 1)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#cf292c] transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-sm font-bold text-gray-800">{pickerYear}</span>
                  <button
                    onClick={() => setPickerYear(y => y + 1)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#cf292c] transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
                {/* Grille mois */}
                <div className="grid grid-cols-4 gap-1">
                  {moisLabels.map((label, i) => {
                    const moisVal = `${pickerYear}-${String(i + 1).padStart(2, '0')}`;
                    const isSelected = presenceMois === moisVal;
                    const now = new Date();
                    const isCurrent = pickerYear === now.getFullYear() && i === now.getMonth();
                    return (
                      <button
                        key={i}
                        onClick={() => { setPresenceMois(moisVal); setShowMonthPicker(false); }}
                        className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-[#cf292c] text-white shadow-sm'
                            : isCurrent
                              ? 'bg-[#cf292c]/10 text-[#cf292c] font-semibold hover:bg-[#cf292c]/20'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cartes statistiques responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Employés présents</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">
            {pointages.filter(p => p.blocs.length > 0).length}
            <span className="text-xs sm:text-sm text-gray-500 font-normal ml-1">/{pointages.length}</span>
          </p>
        </div>
        {/* En poste actuellement (live) */}
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1.5">
            {isToday && enPosteUsers.length > 0 && (
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
            En poste
          </p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">
            {isToday ? enPosteUsers.length : '—'}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total des heures</p>
          <p className="text-xl sm:text-2xl font-bold text-[#cf292c]">
            {pointages.reduce((total, user) => {
              const heures = user.total ? parseInt(user.total.split('h')[0], 10) : 0;
              const minutes = user.total ? parseInt(user.total.split('h')[1] || 0, 10) : 0;
              return total + heures + minutes/60;
            }, 0).toFixed(1)}h
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            <span className="hidden sm:inline">Arrivée la plus tôt</span>
            <span className="sm:hidden">Plus tôt</span>
          </p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">
            {(() => {
              let earliestTime = null;
              pointages.forEach(user => {
                user.blocs.forEach(bloc => {
                  if (bloc.arrivee) {
                    const time = typeof bloc.arrivee === 'string' && bloc.arrivee.includes('T')
                      ? dayjs(bloc.arrivee)
                      : dayjs(`${date}T${bloc.arrivee}`);
                    
                    if (time.isValid() && (!earliestTime || time.isBefore(earliestTime))) {
                      earliestTime = time;
                    }
                  }
                });
              });
              return earliestTime ? earliestTime.format('HH:mm') : '--:--';
            })()}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            <span className="hidden sm:inline">Départ le plus tard</span>
            <span className="sm:hidden">Plus tard</span>
          </p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">
            {(() => {
              let latestTime = null;
              pointages.forEach(user => {
                user.blocs.forEach(bloc => {
                  if (bloc.depart) {
                    const time = typeof bloc.depart === 'string' && bloc.depart.includes('T')
                      ? dayjs(bloc.depart)
                      : dayjs(`${date}T${bloc.depart}`);
                    
                    if (time.isValid() && (!latestTime || time.isAfter(latestTime))) {
                      latestTime = time;
                    }
                  }
                });
              });
              return latestTime ? latestTime.format('HH:mm') : '--:--';
            })()}
          </p>
        </div>
        {/* Carte pointages en attente */}
        <div className={`p-3 sm:p-4 rounded-lg border shadow-sm ${
          pendingPointages.length > 0 
            ? 'bg-amber-50 border-amber-300' 
            : 'bg-white border-gray-200'
        }`}>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            <span className="hidden sm:inline">En attente de sync</span>
            <span className="sm:hidden">En attente</span>
          </p>
          <p className={`text-xl sm:text-2xl font-bold ${pendingPointages.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            {pendingPointages.reduce((sum, g) => sum + g.pendingPointages.length, 0)}
            {pendingPointages.length > 0 && (
              <span className="text-xs sm:text-sm font-normal ml-1 text-amber-500">
                ({pendingPointages.length} emp.)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* En poste actuellement (live) */}
      {isToday && enPosteUsers.length > 0 && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm p-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <h3 className="text-sm font-semibold text-gray-800">En poste actuellement</h3>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">{enPosteUsers.length}</span>
            </div>
            <span className="text-xs text-gray-400">Maj {dayjs(now).format('HH:mm')}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {enPosteUsers.map((user, i) => {
              const arr = getOpenArrivee(user);
              return (
                <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full pl-1 pr-2.5 py-0.5" title={arr ? `Arrivé à ${arr.format('HH:mm')}` : ''}>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-bold">{getInitials(user)}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{getNomComplet(user)}</span>
                  <span className="text-[11px] font-semibold text-emerald-600 whitespace-nowrap">{formatElapsed(arr)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* �📴 Bannière pointages en attente de synchronisation */}
      {pendingPointages.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-800">
                Pointages en attente de synchronisation
              </h4>
              <p className="text-xs text-amber-600 mt-0.5">
                Ces pointages ont été enregistrés sur la tablette hors-ligne et n'ont pas encore été synchronisés avec le serveur.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {pendingPointages.map((group) => (
              <div key={group.userId} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-amber-100">
                {/* Avatar */}
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {group.prenom && group.nom
                      ? `${group.prenom.charAt(0)}${group.nom.charAt(0)}`.toUpperCase()
                      : (group.email || '?').charAt(0).toUpperCase()
                    }
                  </span>
                </div>
                {/* Info employé */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {group.prenom && group.nom ? `${group.prenom} ${group.nom}` : group.email || 'Employé inconnu'}
                  </div>
                  <div className="text-xs text-gray-500">{group.email}</div>
                </div>
                {/* Badges des horaires en attente */}
                <div className="flex flex-wrap gap-1 justify-end">
                  {group.pendingPointages.map((pp) => (
                    <div key={pp.id} className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium border border-amber-200">
                      <svg className="w-3 h-3 mr-1 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {dayjs(pp.timestamp).format('HH:mm')}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔍 Barre de recherche + filtres de statut */}
      {pointages.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="relative w-full sm:w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" /></svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un employé..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: 'all', label: 'Tous', count: pointages.length },
              { key: 'enposte', label: 'En poste', count: statusCounts.enposte || 0 },
              { key: 'termine', label: 'Terminés', count: statusCounts.termine || 0 },
              ...(statusCounts.anomalie ? [{ key: 'anomalie', label: 'Sortie manquante', count: statusCounts.anomalie }] : []),
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === f.key
                    ? 'bg-[#cf292c] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusFilter === f.key ? 'bg-white/20 text-white' : 'bg-white text-gray-500'}`}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vue desktop : Tableau amélioré */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                Employé
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                Arrivée
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                Départ
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                Durée travaillée
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredPointages.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-600">
                      {pointages.length === 0 ? 'Aucun pointage enregistré pour cette date' : 'Aucun employé ne correspond à votre recherche'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {pointages.length === 0 ? 'Les données apparaîtront ici une fois les pointages effectués' : 'Essayez un autre filtre ou terme de recherche'}
                    </p>
                  </div>
                </td>
              </tr>
            )}

            {filteredPointages.map((user, userIdx) => {
              // Extraire toutes les arrivées et départs pour les afficher sur une ligne
              const arrivees = user.blocs
                .filter(bloc => bloc.arrivee)
                .map(bloc => typeof bloc.arrivee === 'string' && bloc.arrivee.includes('T') 
                  ? dayjs(bloc.arrivee).format('HH:mm')
                  : bloc.arrivee);
              
              const departs = user.blocs
                .filter(bloc => bloc.depart)
                .map(bloc => typeof bloc.depart === 'string' && bloc.depart.includes('T')
                  ? dayjs(bloc.depart).format('HH:mm')
                  : bloc.depart);

              const durees = user.blocs
                .filter(bloc => bloc.duree)
                .map(bloc => bloc.duree);

              const status = getUserStatus(user);

              return (
                <tr key={userIdx} className={`hover:bg-gray-50 transition-all duration-200 group ${status === 'enposte' ? 'bg-emerald-50/40' : ''}`}>
                  <td className="px-6 py-4 border-r border-gray-100">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-[#cf292c] rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-white text-sm font-bold">
                          {(() => {
                            if (user.nom && user.prenom) {
                              return `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();
                            } else if (user.nom || user.prenom) {
                              const name = user.nom || user.prenom;
                              return name.charAt(0).toUpperCase() + (name.charAt(1) || '').toUpperCase();
                            } else {
                              return user.email.charAt(0).toUpperCase() + (user.email.charAt(1) || '').toUpperCase();
                            }
                          })()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{user.email}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {user.nom && user.prenom ? (
                            `${user.prenom} ${user.nom}`
                          ) : user.nom || user.prenom ? (
                            user.nom || user.prenom
                          ) : (
                            "Nom non renseigné"
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center border-r border-gray-100">
                    {arrivees.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-1">
                        {arrivees.map((arrivee, idx) => (
                          <div key={idx} className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium border border-green-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {arrivee}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center border-r border-gray-100">
                    {departs.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-1">
                        {departs.map((depart, idx) => (
                          <div key={idx} className="inline-flex items-center px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium border border-red-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {depart}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user.total || durees.length > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        {/* Total principal (calculé par le backend) */}
                        {user.total && (
                          <div className="inline-flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-sm font-medium">{user.total}</span>
                          </div>
                        )}
                        {/* Détail des segments individuels si multiples */}
                        {durees.length > 1 && (
                          <div className="text-[10px] text-gray-400">
                            {durees.length} segments: {durees.join(' + ')}
                          </div>
                        )}
                        {/* Si pas de total mais des durées individuelles */}
                        {!user.total && durees.length > 0 && (
                          <div className="text-xs text-gray-600">
                            {durees.length === 1 ? durees[0] : `${durees.length} blocs: ${durees.join(' + ')}`}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center border-l border-gray-100">
                    <div className="flex flex-col items-center gap-1.5">
                      {renderStatutBadge(user)}
                      {hasOpenBloc(user) && (
                        <button
                          onClick={() => openCompleteModal(user)}
                          className="text-[11px] font-medium text-[#cf292c] hover:text-[#a82124] hover:underline"
                        >
                          Compléter le départ
                        </button>
                      )}
                      <button
                        onClick={() => openCorrectModal(user)}
                        className="text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:underline"
                      >
                        {user.blocs.length > 0 ? 'Corriger un pointage' : 'Ajouter un pointage'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vue mobile : Cardes (masquée sur desktop) */}
      <div className="md:hidden">
        {filteredPointages.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-gray-600">
              {pointages.length === 0 ? 'Aucun pointage enregistré pour cette date' : 'Aucun employé ne correspond à votre recherche'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPointages.map((user, userIdx) => (
              <div key={userIdx} className="bg-white border border-gray-200 rounded-lg p-4">
                {/* Header avec nom employé */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <div className="flex-1 min-w-0 mr-2">
                    <h3 className="font-medium text-gray-800 truncate">{user.email}</h3>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {user.nom && user.prenom ? (
                        <span>{user.prenom} {user.nom}</span>
                      ) : user.nom || user.prenom ? (
                        <span>{user.nom || user.prenom}</span>
                      ) : (
                        <span className="italic opacity-75">Nom non renseigné</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {renderStatutBadge(user)}
                    {user.total && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#ffd6d6] text-[#cf292c] whitespace-nowrap">
                        {user.total}
                      </span>
                    )}
                    {hasOpenBloc(user) && (
                      <button
                        onClick={() => openCompleteModal(user)}
                        className="text-[11px] font-medium text-[#cf292c] hover:text-[#a82124] hover:underline"
                      >
                        Compléter le départ
                      </button>
                    )}
                    <button
                      onClick={() => openCorrectModal(user)}
                      className="text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:underline"
                    >
                      {user.blocs.length > 0 ? 'Corriger un pointage' : 'Ajouter un pointage'}
                    </button>
                  </div>
                </div>

                {/* Blocs de pointage */}
                {user.blocs.length > 0 ? (
                  <div className="space-y-2">
                    {user.blocs.map((bloc, blocIdx) => (
                      <div key={blocIdx} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center space-x-3">
                          {/* Arrivée */}
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Arrivée</p>
                            {bloc.arrivee ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700">
                                {typeof bloc.arrivee === 'string' && bloc.arrivee.includes('T') 
                                  ? dayjs(bloc.arrivee).format("HH:mm")
                                  : bloc.arrivee}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </div>

                          {/* Séparateur */}
                          <div className="text-gray-300">→</div>

                          {/* Départ */}
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Départ</p>
                            {bloc.depart ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700">
                                {typeof bloc.depart === 'string' && bloc.depart.includes('T')
                                  ? dayjs(bloc.depart).format("HH:mm")
                                  : bloc.depart}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </div>
                        </div>

                        {/* Durée du bloc */}
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">Durée</p>
                          {bloc.duree ? (
                            <span className="text-xs font-medium text-gray-700">
                              {bloc.duree}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    <p className="text-sm">Aucun pointage pour cette journée</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4 px-2 text-sm text-gray-500 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Données actualisées pour le {new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
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

      {/* 🛠️ Modale de complétion manuelle d'un départ non pointé */}
      {completingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeCompleteModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Compléter le départ</h3>
            <p className="text-sm text-gray-500 mb-1">
              {getNomComplet(completingUser)} n'a pas pointé son départ pour le {dayjs(date).format('DD/MM/YYYY')}.
            </p>
            {completingUser.heureFinPrevue && (
              <p className="text-sm text-gray-600 mb-3">
                Fin de service prévue à <span className="font-semibold text-gray-900">{completingUser.heureFinPrevue}</span> (heure pré-remplie ci-dessous, modifiable si besoin).
              </p>
            )}
            <label className="block text-xs font-medium text-gray-600 mb-1">Heure de départ</label>
            <input
              type="time"
              value={completeTime}
              onChange={(e) => setCompleteTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] outline-none mb-3"
            />
            {completeError && (
              <p className="text-xs text-red-600 mb-3">{completeError}</p>
            )}
            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={closeCompleteModal}
                disabled={completing}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmComplete}
                disabled={completing || !completeTime}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-white bg-[#cf292c] hover:bg-[#a82124] transition disabled:opacity-60"
              >
                {completing ? 'Enregistrement…' : 'Confirmer le départ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ Modale de correction / ajout d'un pointage (erreur de saisie ou oubli) */}
      {correctingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeCorrectModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Corriger un pointage</h3>
            <p className="text-sm text-gray-500 mb-4">
              {getNomComplet(correctingUser)} — {dayjs(date).format('DD/MM/YYYY')}. Modifiez ou renseignez l'heure en cas d'erreur ou d'oubli de saisie (ajoutez un bloc pour une coupure).
            </p>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
              {Array.from({ length: Math.max(blocsToShow, correctingUser.blocs.length) }).map((_, blocIdx) => {
                const bloc = correctingUser.blocs[blocIdx] || {};
                const arriveeKey = `${blocIdx}-arrivee`;
                const departKey = `${blocIdx}-depart`;
                return (
                  <div key={blocIdx} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">Bloc {blocIdx + 1}</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-14 flex-shrink-0">Arrivée</span>
                        <input
                          type="time"
                          value={correctValues[arriveeKey] ?? ''}
                          onChange={(e) => setCorrectValues((prev) => ({ ...prev, [arriveeKey]: e.target.value }))}
                          className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] outline-none"
                        />
                        <button
                          onClick={() => handleSaveField(blocIdx, 'arrivee')}
                          disabled={correctSaving === arriveeKey || !correctValues[arriveeKey]}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-gray-700 hover:bg-gray-800 transition disabled:opacity-60 flex-shrink-0"
                        >
                          {correctSaving === arriveeKey ? '…' : (bloc.arriveeId ? 'OK' : 'Ajouter')}
                        </button>
                      </div>
                      {correctFeedback[arriveeKey] === 'success' && (
                        <p className="text-[11px] text-emerald-600 pl-16">✓ Heure d'arrivée enregistrée</p>
                      )}
                      {correctFeedback[arriveeKey] && correctFeedback[arriveeKey] !== 'success' && (
                        <p className="text-[11px] text-red-600 pl-16">{correctFeedback[arriveeKey]}</p>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-14 flex-shrink-0">Départ</span>
                        <input
                          type="time"
                          value={correctValues[departKey] ?? ''}
                          onChange={(e) => setCorrectValues((prev) => ({ ...prev, [departKey]: e.target.value }))}
                          className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[#cf292c]/20 focus:border-[#cf292c] outline-none"
                        />
                        <button
                          onClick={() => handleSaveField(blocIdx, 'depart')}
                          disabled={correctSaving === departKey || !correctValues[departKey]}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-gray-700 hover:bg-gray-800 transition disabled:opacity-60 flex-shrink-0"
                        >
                          {correctSaving === departKey ? '…' : (bloc.departId ? 'OK' : 'Ajouter')}
                        </button>
                      </div>
                      {correctFeedback[departKey] === 'success' && (
                        <p className="text-[11px] text-emerald-600 pl-16">✓ Heure de départ enregistrée</p>
                      )}
                      {correctFeedback[departKey] && correctFeedback[departKey] !== 'success' && (
                        <p className="text-[11px] text-red-600 pl-16">{correctFeedback[departKey]}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setBlocsToShow((c) => Math.min(Math.max(c, correctingUser.blocs.length) + 1, 5))}
                disabled={Math.max(blocsToShow, correctingUser.blocs.length) >= 5}
                className="text-[11px] font-medium text-[#cf292c] hover:text-[#a82124] hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
              >
                + Ajouter un bloc (coupure)
              </button>
              <button
                onClick={closeCorrectModal}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
              >
                Fermer
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default VueJournaliereRH;
