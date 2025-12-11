// client/src/pages/Planning.jsx
// Page unifiée Planning : Mon Planning + Équipe + Remplacements
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Clock, ChevronLeft, ChevronRight, Users, 
  AlertCircle, RefreshCw, Sun, Moon, Coffee, UserPlus,
  CheckCircle, XCircle, Send, Eye, Filter, Search,
  CalendarDays, Palmtree, User, X, Plus, Trash2
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { toLocalDateString } from '../utils/parisTimeUtils';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const brand = '#cf292c';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
};

const formatDateFull = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const getShiftTypeStyle = (type) => {
  switch (type?.toLowerCase()) {
    case 'matin':
      return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', icon: Sun };
    case 'soir':
      return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', icon: Moon };
    case 'nuit':
      return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', icon: Moon };
    case 'journee':
      return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', icon: Sun };
    case 'coupure':
      return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', icon: Coffee };
    case 'absence':
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: XCircle };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', icon: Calendar };
  }
};

const getWeekDates = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const newDate = new Date(monday);
    newDate.setDate(monday.getDate() + i);
    dates.push(newDate);
  }
  return dates;
};

const getInitials = (nom, prenom) => {
  return `${prenom?.charAt(0) || ''}${nom?.charAt(0) || ''}`.toUpperCase();
};

const calculateWeeklyHours = (shifts) => {
  let total = 0;
  shifts.forEach(shift => {
    if (shift.segments && shift.segments.length > 0) {
      shift.segments.forEach(seg => {
        if (seg.type?.toLowerCase() !== 'pause' && seg.type?.toLowerCase() !== 'break') {
          const start = seg.start || seg.debut;
          const end = seg.end || seg.fin;
          if (start && end) {
            const [sh, sm] = start.split(':').map(Number);
            const [eh, em] = end.split(':').map(Number);
            let diff = (eh * 60 + em) - (sh * 60 + sm);
            if (diff < 0) diff += 24 * 60;
            total += diff;
          }
        }
      });
    }
  });
  return { hours: Math.floor(total / 60), minutes: total % 60 };
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS COMMUNS
// ═══════════════════════════════════════════════════════════════════════════════

function EmployeAvatar({ employe, size = 'md' }) {
  const sizeClasses = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' };
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
  const colorIndex = (employe?.id || 0) % colors.length;
  
  if (employe?.photoProfil) {
    return (
      <img src={`${API_BASE}${employe.photoProfil}`} alt={`${employe.prenom} ${employe.nom}`}
        className={`${sizeClasses[size]} rounded-full object-cover`} />
    );
  }
  return (
    <div className={`${sizeClasses[size]} ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-medium`}>
      {getInitials(employe?.nom, employe?.prenom)}
    </div>
  );
}

// Carte shift personnel
function ShiftCard({ shift, onRequestReplacement }) {
  const style = getShiftTypeStyle(shift.type);
  const IconComponent = style.icon;
  
  const getHoraires = () => {
    if (!shift.segments || shift.segments.length === 0) return 'Horaires non définis';
    const travailSegs = shift.segments.filter(s => 
      s.type?.toLowerCase() !== 'pause' && s.type?.toLowerCase() !== 'break'
    );
    if (travailSegs.length === 0) return 'Horaires non définis';
    const first = travailSegs[0].start || travailSegs[0].debut;
    const last = travailSegs[travailSegs.length - 1].end || travailSegs[travailSegs.length - 1].fin;
    return `${first?.slice(0,5)} - ${last?.slice(0,5)}`;
  };
  
  const getDuree = () => {
    if (!shift.segments || shift.segments.length === 0) return '';
    let total = 0;
    shift.segments.forEach(seg => {
      if (seg.type?.toLowerCase() !== 'pause' && seg.type?.toLowerCase() !== 'break') {
        const start = seg.start || seg.debut;
        const end = seg.end || seg.fin;
        if (start && end) {
          const [sh, sm] = start.split(':').map(Number);
          const [eh, em] = end.split(':').map(Number);
          let diff = (eh * 60 + em) - (sh * 60 + sm);
          if (diff < 0) diff += 24 * 60;
          total += diff;
        }
      }
    });
    return `${Math.floor(total / 60)}h${total % 60 > 0 ? (total % 60).toString().padStart(2, '0') : ''}`;
  };
  
  const isPast = new Date(shift.date) < new Date(new Date().setHours(0,0,0,0));
  
  return (
    <div className={`p-3 rounded-xl border ${style.border} ${style.bg} ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-white/60`}>
            <IconComponent className={`w-4 h-4 ${style.text}`} />
          </div>
          <div>
            <div className={`font-semibold ${style.text} capitalize`}>{shift.type || 'Shift'}</div>
            <div className="text-xs text-gray-600">{formatDateFull(shift.date)}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`font-bold ${style.text}`}>{getHoraires()}</div>
          <div className="text-xs text-gray-500">{getDuree()}</div>
        </div>
      </div>
      
      {!isPast && onRequestReplacement && (
        <button
          onClick={() => onRequestReplacement(shift)}
          className="mt-2 w-full py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-white/50 transition-colors flex items-center justify-center gap-1"
        >
          <UserPlus className="w-3 h-3" />
          Demander remplacement
        </button>
      )}
    </div>
  );
}

// Cellule équipe
function ShiftCellEquipe({ shift, conge, isCurrentUser }) {
  if (conge) {
    return (
      <div className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs text-center">
        <Palmtree className="w-3 h-3 inline mr-1" />
        {conge.type?.slice(0,6)}
      </div>
    );
  }
  if (!shift) return <div className="px-2 py-1 text-center text-gray-300 text-xs">—</div>;
  
  const style = getShiftTypeStyle(shift.type);
  const getHoraires = () => {
    if (!shift.segments || shift.segments.length === 0) return '';
    const travailSegs = shift.segments.filter(s => s.type?.toLowerCase() !== 'pause' && s.type?.toLowerCase() !== 'break');
    if (travailSegs.length === 0) return '';
    const first = travailSegs[0].start || travailSegs[0].debut;
    const last = travailSegs[travailSegs.length - 1].end || travailSegs[travailSegs.length - 1].fin;
    return `${first?.slice(0,5)}-${last?.slice(0,5)}`;
  };
  
  return (
    <div className={`px-1.5 py-1 rounded ${style.bg} ${style.text} text-[10px] text-center ${isCurrentUser ? 'ring-2 ring-red-400' : ''}`}>
      <span className="font-medium">{getHoraires()}</span>
    </div>
  );
}

// Carte demande remplacement
function RemplacementCard({ demande, type, onAction }) {
  const statusColors = {
    en_attente: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    validee: 'bg-green-100 text-green-700 border-green-300',
    refusee: 'bg-red-100 text-red-700 border-red-300',
    annulee: 'bg-gray-100 text-gray-500 border-gray-300'
  };
  
  const statusLabels = {
    en_attente: 'En attente',
    validee: 'Validée',
    refusee: 'Refusée',
    annulee: 'Annulée'
  };
  
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium text-gray-900">
            {type === 'disponible' ? `Shift de ${demande.employeAbsent?.prenom}` : `Mon shift`}
          </div>
          <div className="text-xs text-gray-500">
            {demande.shift ? formatDateFull(demande.shift.date) : 'Date non définie'}
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[demande.statut]}`}>
          {statusLabels[demande.statut]}
        </span>
      </div>
      
      {demande.motif && (
        <p className="text-sm text-gray-600 mb-2 italic">"{demande.motif}"</p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{demande.candidatures?.length || 0} candidature(s)</span>
        
        {type === 'disponible' && demande.statut === 'en_attente' && (
          <button
            onClick={() => onAction('candidater', demande.id)}
            className="px-3 py-1 rounded-lg text-white text-xs font-medium flex items-center gap-1"
            style={{ backgroundColor: brand }}
          >
            <Send className="w-3 h-3" />
            Candidater
          </button>
        )}
        
        {type === 'ma-demande' && demande.statut === 'en_attente' && (
          <button
            onClick={() => onAction('annuler', demande.id)}
            className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium flex items-center gap-1 hover:bg-gray-200"
          >
            <X className="w-3 h-3" />
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

// Modal demande remplacement
function ModalDemandeRemplacement({ isOpen, onClose, shift, onSubmit }) {
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(false);
  
  if (!isOpen) return null;
  
  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit(shift.id, motif);
    setLoading(false);
    setMotif('');
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Demande de remplacement</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-xl">
          <div className="text-sm text-gray-600">Shift concerné :</div>
          <div className="font-medium text-gray-900">{shift ? formatDateFull(shift.date) : ''}</div>
          <div className="text-sm text-gray-600 capitalize">{shift?.type}</div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motif (optionnel)
          </label>
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Expliquez pourquoi vous avez besoin d'un remplaçant..."
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 font-medium text-gray-600 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: brand }}
          >
            {loading ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export default function Planning() {
  // Vue active : 'perso', 'equipe', 'remplacements'
  const [activeView, setActiveView] = useState('perso');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Données perso
  const [myShifts, setMyShifts] = useState([]);
  const [myDemandes, setMyDemandes] = useState([]);
  const [demandesDisponibles, setDemandesDisponibles] = useState([]);
  
  // Données équipe
  const [equipeData, setEquipeData] = useState({ employes: [], shifts: [], conges: [], categorie: '' });
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  
  // Filtres équipe
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyWorking, setShowOnlyWorking] = useState(false);
  
  const token = localStorage.getItem('token');
  const currentUserId = parseInt(localStorage.getItem('userId') || '0');
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH DATA
  // ═══════════════════════════════════════════════════════════════════════════
  
  const fetchMyShifts = useCallback(async () => {
    if (!token) return;
    try {
      const startDate = toLocalDateString(weekDates[0]);
      const endDate = toLocalDateString(weekDates[6]);
      const res = await fetch(`${API_BASE}/shifts/mes-shifts?start=${startDate}&end=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyShifts(data);
      }
    } catch (err) {
      console.error('Erreur chargement shifts:', err);
    }
  }, [token, weekDates]);
  
  const fetchRemplacements = useCallback(async () => {
    if (!token) return;
    try {
      const [demandesRes, disponiblesRes] = await Promise.all([
        fetch(`${API_BASE}/api/remplacements/mes-demandes`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/remplacements/disponibles`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (demandesRes.ok) setMyDemandes(await demandesRes.json());
      if (disponiblesRes.ok) setDemandesDisponibles(await disponiblesRes.json());
    } catch (err) {
      console.error('Erreur chargement remplacements:', err);
    }
  }, [token]);
  
  const fetchEquipeData = useCallback(async () => {
    if (!token) return;
    try {
      const startDate = toLocalDateString(weekDates[0]);
      const endDate = toLocalDateString(weekDates[6]);
      const res = await fetch(`${API_BASE}/shifts/equipe?start=${startDate}&end=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setEquipeData(await res.json());
      }
    } catch (err) {
      console.error('Erreur chargement équipe:', err);
    }
  }, [token, weekDates]);
  
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchMyShifts(), fetchRemplacements(), fetchEquipeData()]);
    } catch (err) {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [fetchMyShifts, fetchRemplacements, fetchEquipeData]);
  
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION SEMAINE
  // ═══════════════════════════════════════════════════════════════════════════
  
  const goToPrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };
  
  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };
  
  const goToToday = () => setCurrentDate(new Date());
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIONS REMPLACEMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleRequestReplacement = (shift) => {
    setSelectedShift(shift);
    setShowModal(true);
  };
  
  const handleSubmitReplacement = async (shiftId, motif) => {
    try {
      const res = await fetch(`${API_BASE}/api/remplacements/demande`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId, motif })
      });
      if (res.ok) {
        fetchRemplacements();
      }
    } catch (err) {
      console.error('Erreur création demande:', err);
    }
  };
  
  const handleRemplacementAction = async (action, id) => {
    try {
      if (action === 'candidater') {
        await fetch(`${API_BASE}/api/remplacements/${id}/candidater`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
      } else if (action === 'annuler') {
        await fetch(`${API_BASE}/api/remplacements/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      fetchRemplacements();
    } catch (err) {
      console.error('Erreur action:', err);
    }
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DONNÉES CALCULÉES
  // ═══════════════════════════════════════════════════════════════════════════
  
  const weeklyHours = useMemo(() => calculateWeeklyHours(myShifts), [myShifts]);
  
  const filteredEmployes = useMemo(() => {
    let result = equipeData.employes;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => e.prenom?.toLowerCase().includes(term) || e.nom?.toLowerCase().includes(term));
    }
    if (showOnlyWorking) {
      const employesAvecShift = new Set(equipeData.shifts.map(s => s.employeId));
      result = result.filter(e => employesAvecShift.has(e.id));
    }
    result.sort((a, b) => (a.id === currentUserId ? -1 : b.id === currentUserId ? 1 : 0));
    return result;
  }, [equipeData, searchTerm, showOnlyWorking, currentUserId]);
  
  const stats = useMemo(() => ({
    totalEmployes: equipeData.employes.length,
    presentAujourdhui: equipeData.shifts.filter(s => 
      toLocalDateString(s.date) === toLocalDateString(new Date())
    ).length,
    demandesEnAttente: demandesDisponibles.length
  }), [equipeData, demandesDisponibles]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/20 pb-navbar lg:pb-8 pt-header">
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 pt-6 pb-3" style={{ background: `linear-gradient(135deg, ${brand} 0%, #a61f22 100%)` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Planning
            </h1>
            <p className="text-white/80 text-sm">
              {activeView === 'perso' ? 'Mon planning' : activeView === 'equipe' ? `Équipe ${equipeData.categorie || ''}` : 'Remplacements'}
            </p>
          </div>
          <button onClick={fetchAll} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Toggle vue */}
        <div className="flex bg-white/10 rounded-xl p-1 mb-3">
          {[
            { key: 'perso', icon: User, label: 'Mon planning' },
            { key: 'equipe', icon: Users, label: 'Équipe' },
            { key: 'remplacements', icon: UserPlus, label: 'Remplacements' }
          ].map(view => (
            <button
              key={view.key}
              onClick={() => setActiveView(view.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                activeView === view.key 
                  ? 'bg-white text-red-700 shadow-sm' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <view.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{view.label}</span>
              <span className="sm:hidden">{view.key === 'perso' ? 'Perso' : view.key === 'equipe' ? 'Équipe' : 'Rempl.'}</span>
            </button>
          ))}
        </div>
        
        {/* Navigation semaine */}
        <div className="flex items-center justify-between bg-white/10 rounded-xl p-2">
          <button onClick={goToPrevWeek} className="p-2 rounded-lg hover:bg-white/20">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <div className="text-white font-medium text-sm">
              {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
            </div>
            <button onClick={goToToday} className="text-xs text-white/70 hover:text-white">Aujourd'hui</button>
          </div>
          <button onClick={goToNextWeek} className="p-2 rounded-lg hover:bg-white/20">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      
      {/* Contenu */}
      <div className="px-4 py-4">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mb-3" />
            <span className="text-gray-500">Chargement...</span>
          </div>
        ) : (
          <>
            {/* ═══════ VUE PERSO ═══════ */}
            {activeView === 'perso' && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                      <Calendar className="w-4 h-4" />
                      Shifts cette semaine
                    </div>
                    <div className="text-2xl font-bold" style={{ color: brand }}>{myShifts.length}</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                      <Clock className="w-4 h-4" />
                      Heures prévues
                    </div>
                    <div className="text-2xl font-bold" style={{ color: brand }}>
                      {weeklyHours.hours}h{weeklyHours.minutes > 0 ? weeklyHours.minutes.toString().padStart(2,'0') : ''}
                    </div>
                  </div>
                </div>
                
                {/* Liste shifts */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Mes shifts</h3>
                  {myShifts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      Aucun shift cette semaine
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myShifts.sort((a,b) => new Date(a.date) - new Date(b.date)).map(shift => (
                        <ShiftCard 
                          key={shift.id} 
                          shift={shift} 
                          onRequestReplacement={handleRequestReplacement}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* ═══════ VUE ÉQUIPE ═══════ */}
            {activeView === 'equipe' && (
              <div>
                {/* Stats équipe */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-white rounded-xl p-3 shadow-sm border text-center">
                    <div className="text-xl font-bold text-gray-900">{stats.totalEmployes}</div>
                    <div className="text-xs text-gray-500">Équipiers</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border text-center">
                    <div className="text-xl font-bold text-green-600">{stats.presentAujourdhui}</div>
                    <div className="text-xs text-gray-500">Aujourd'hui</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm border text-center">
                    <div className="text-xl font-bold text-orange-500">{stats.demandesEnAttente}</div>
                    <div className="text-xs text-gray-500">À remplacer</div>
                  </div>
                </div>
                
                {/* Filtres */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowOnlyWorking(!showOnlyWorking)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      showOnlyWorking ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Tableau équipe */}
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full min-w-[550px] border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="sticky left-0 bg-gray-50 z-10 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r">
                          Équipier
                        </th>
                        {weekDates.map((date, idx) => {
                          const isToday = date.toDateString() === new Date().toDateString();
                          return (
                            <th key={idx} className={`px-1 py-2 text-center text-xs font-medium min-w-[60px] ${isToday ? 'bg-yellow-100' : ''}`}>
                              <div className="capitalize">{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                              <div className={`text-base font-bold ${isToday ? 'text-yellow-700' : 'text-gray-700'}`}>{date.getDate()}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployes.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-500">
                            <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            Aucun équipier
                          </td>
                        </tr>
                      ) : (
                        filteredEmployes.map(employe => {
                          const isCurrentUser = employe.id === currentUserId;
                          return (
                            <tr key={employe.id} className={`border-b ${isCurrentUser ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                              <td className="sticky left-0 bg-white z-10 px-2 py-2 border-r">
                                <div className="flex items-center gap-1.5 min-w-[90px]">
                                  <EmployeAvatar employe={employe} size="sm" />
                                  <div className="truncate">
                                    <div className="font-medium text-xs text-gray-900 truncate">
                                      {employe.prenom}
                                      {isCurrentUser && <span className="text-red-500 ml-1">(moi)</span>}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              {weekDates.map((date, idx) => {
                                const dateStr = toLocalDateString(date);
                                const shift = equipeData.shifts.find(s => 
                                  toLocalDateString(s.date) === dateStr && s.employeId === employe.id
                                );
                                const conge = equipeData.conges.find(c => 
                                  c.userId === employe.id && date >= new Date(c.dateDebut) && date <= new Date(c.dateFin)
                                );
                                const isToday = date.toDateString() === new Date().toDateString();
                                return (
                                  <td key={idx} className={`px-1 py-2 ${isToday ? 'bg-yellow-50' : ''}`}>
                                    <ShiftCellEquipe shift={shift} conge={conge} isCurrentUser={isCurrentUser} />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Légende */}
                <div className="mt-4">
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {[{type:'matin',label:'Matin'},{type:'soir',label:'Soir'},{type:'nuit',label:'Nuit'},{type:'journee',label:'Journée'}].map(item => {
                      const style = getShiftTypeStyle(item.type);
                      return <div key={item.type} className={`px-2 py-0.5 rounded ${style.bg} ${style.text}`}>{item.label}</div>;
                    })}
                    <div className="px-2 py-0.5 rounded bg-green-100 text-green-700">🌴 Congé</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* ═══════ VUE REMPLACEMENTS ═══════ */}
            {activeView === 'remplacements' && (
              <div className="space-y-6">
                {/* Mes demandes */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Mes demandes de remplacement
                  </h3>
                  {myDemandes.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-xl text-gray-500 text-sm">
                      Aucune demande en cours
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myDemandes.map(d => (
                        <RemplacementCard key={d.id} demande={d} type="ma-demande" onAction={handleRemplacementAction} />
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Disponibles */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Demandes de collègues ({demandesDisponibles.length})
                  </h3>
                  {demandesDisponibles.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-xl text-gray-500 text-sm">
                      Aucune demande disponible
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {demandesDisponibles.map(d => (
                        <RemplacementCard key={d.id} demande={d} type="disponible" onAction={handleRemplacementAction} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Modal */}
      <ModalDemandeRemplacement
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        shift={selectedShift}
        onSubmit={handleSubmitReplacement}
      />
      
      <BottomNav />
    </div>
  );
}
