// client/src/pages/MonPlanning.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Clock, ChevronLeft, ChevronRight, Users, 
  AlertCircle, RefreshCw, Sun, Moon, Coffee, UserPlus,
  CheckCircle, XCircle, Send, Eye, Filter, Search
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
      return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Sun, label: 'Matin' };
    case 'soir':
      return { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: Moon, label: 'Soir' };
    case 'nuit':
      return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: Moon, label: 'Nuit' };
    case 'journee':
      return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Sun, label: 'Journée' };
    case 'coupure':
      return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: Coffee, label: 'Coupure' };
    case 'absence':
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: XCircle, label: 'Absence' };
    default:
      return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: Clock, label: type || 'Travail' };
  }
};

const calculateShiftHours = (segments) => {
  if (!segments || !Array.isArray(segments)) return 0;
  
  let totalMinutes = 0;
  segments.forEach(seg => {
    if (seg.type?.toLowerCase() === 'pause' || seg.type?.toLowerCase() === 'break') return;
    
    const start = seg.start || seg.debut;
    const end = seg.end || seg.fin;
    if (!start || !end) return;
    
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    
    let duration = (eH * 60 + eM) - (sH * 60 + sM);
    if (duration < 0) duration += 24 * 60; // Shift de nuit
    
    totalMinutes += duration;
  });
  
  return totalMinutes / 60;
};

const getWeekDates = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi = début de semaine
  
  const monday = new Date(d.setDate(diff));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Carte de shift pour un jour
function ShiftCard({ shift, onDemandeRemplacement }) {
  const style = getShiftTypeStyle(shift?.type);
  const Icon = style.icon;
  const hours = calculateShiftHours(shift?.segments);
  
  // Détecter si c'est un remplacement
  const isRemplacement = shift?.motif?.toLowerCase()?.includes('remplacement de');
  
  if (!shift) {
    return (
      <div className="p-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 text-center">
        <span className="text-gray-400 text-sm">Repos</span>
      </div>
    );
  }
  
  // Extraire les horaires des segments
  const getHoraires = () => {
    if (!shift.segments || shift.segments.length === 0) return null;
    
    const travailSegs = shift.segments.filter(s => 
      s.type?.toLowerCase() !== 'pause' && s.type?.toLowerCase() !== 'break'
    );
    
    if (travailSegs.length === 0) return null;
    
    const firstStart = travailSegs[0].start || travailSegs[0].debut;
    const lastEnd = travailSegs[travailSegs.length - 1].end || travailSegs[travailSegs.length - 1].fin;
    
    return `${firstStart} - ${lastEnd}`;
  };
  
  const horaires = getHoraires();
  const hasPause = shift.segments?.some(s => 
    s.type?.toLowerCase() === 'pause' || s.type?.toLowerCase() === 'break'
  );
  
  return (
    <div className={`p-3 rounded-xl border ${style.border} ${style.bg} transition-all hover:shadow-md ${isRemplacement ? 'ring-2 ring-purple-400' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${style.text}`} />
          <span className={`font-medium text-sm ${style.text}`}>{style.label}</span>
          {isRemplacement && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 border border-purple-300">
              🔄 Remplacement
            </span>
          )}
        </div>
        <span className="text-xs font-semibold bg-white/80 px-2 py-0.5 rounded-full">
          {hours.toFixed(1)}h
        </span>
      </div>
      
      {horaires && (
        <div className="text-sm text-gray-600 mb-2">
          <Clock className="w-3 h-3 inline mr-1" />
          {horaires}
        </div>
      )}
      
      {hasPause && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Coffee className="w-3 h-3" />
          Pause incluse
        </div>
      )}
      
      {shift.motif && !isRemplacement && (
        <div className="mt-2 text-xs text-gray-500 italic">
          {shift.motif}
        </div>
      )}
      
      {isRemplacement && (
        <div className="mt-2 text-xs text-purple-600 font-medium bg-purple-50 rounded px-2 py-1">
          {shift.motif}
        </div>
      )}
      
      {/* Bouton demande de remplacement - désactivé si c'est déjà un remplacement */}
      {onDemandeRemplacement && !isRemplacement && (
        <button
          onClick={() => onDemandeRemplacement(shift)}
          className="mt-2 w-full text-xs py-1.5 rounded-lg border border-gray-300 
                     text-gray-600 hover:bg-white hover:border-gray-400 transition-colors
                     flex items-center justify-center gap-1"
        >
          <UserPlus className="w-3 h-3" />
          Demander un remplacement
        </button>
      )}
      
      {/* Message si c'est un remplacement (non re-remplaçable) */}
      {isRemplacement && (
        <div className="mt-2 text-xs text-center text-purple-500 italic">
          ⚠️ Ce shift ne peut pas être re-remplacé
        </div>
      )}
    </div>
  );
}

// Carte de demande de remplacement
function RemplacementCard({ demande, type = 'demande' }) {
  const shift = demande.shift;
  const style = getShiftTypeStyle(shift?.type);
  
  const getStatutBadge = () => {
    switch (demande.statut) {
      case 'en_attente':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">En attente</span>;
      case 'acceptee':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Acceptée</span>;
      case 'refusee':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Refusée</span>;
      case 'annulee':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">Annulée</span>;
      default:
        return null;
    }
  };
  
  const getPrioriteBadge = () => {
    switch (demande.priorite) {
      case 'urgente':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">🚨 Urgent</span>;
      case 'haute':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">⚠️ Haute</span>;
      default:
        return null;
    }
  };
  
  return (
    <div className={`p-4 rounded-xl border ${style.border} ${style.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium text-gray-900">
            {formatDate(shift?.date)}
          </div>
          <div className="text-sm text-gray-600">
            {type === 'demande' ? 'Votre demande' : 
             `${demande.employeAbsent?.prenom} ${demande.employeAbsent?.nom}`}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {getStatutBadge()}
          {getPrioriteBadge()}
        </div>
      </div>
      
      {demande.motif && (
        <p className="text-sm text-gray-600 mb-2 italic">"{demande.motif}"</p>
      )}
      
      {demande.candidatures && demande.candidatures.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            {demande.candidatures.length} candidature(s)
          </div>
          <div className="flex flex-wrap gap-1">
            {demande.candidatures.slice(0, 3).map(c => (
              <span key={c.id} className="px-2 py-0.5 text-xs rounded-full bg-white border">
                {c.employe?.prenom}
              </span>
            ))}
            {demande.candidatures.length > 3 && (
              <span className="text-xs text-gray-500">+{demande.candidatures.length - 3}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Modal de demande de remplacement
function ModalDemandeRemplacement({ shift, onClose, onSubmit }) {
  const [motif, setMotif] = useState('');
  const [priorite, setPriorite] = useState('normale');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({ shiftId: shift.id, motif, priorite });
    setLoading(false);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Demander un remplacement</h3>
        
        <div className="mb-4 p-3 rounded-lg bg-gray-50">
          <div className="text-sm text-gray-600">Shift concerné :</div>
          <div className="font-medium">{formatDateFull(shift.date)}</div>
          <div className="text-sm text-gray-600">Type : {getShiftTypeStyle(shift.type).label}</div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motif de la demande
            </label>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={3}
              placeholder="Expliquez pourquoi vous avez besoin d'un remplacement..."
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priorité
            </label>
            <div className="flex gap-2">
              {['basse', 'normale', 'haute', 'urgente'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorite(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    priorite === p 
                      ? 'bg-red-50 border-red-300 text-red-700' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !motif}
              className="flex-1 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: brand }}
            >
              {loading ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export default function MonPlanning() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [mesRemplacements, setMesRemplacements] = useState([]);
  const [remplacementsDisponibles, setRemplacementsDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('planning'); // planning, mes-demandes, disponibles
  const [selectedShift, setSelectedShift] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const token = localStorage.getItem('token');
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  
  // Charger les données
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    
    try {
      const startDate = toLocalDateString(weekDates[0]);
      const endDate = toLocalDateString(weekDates[6]);
      
      const [shiftsRes, demandesRes, disponiblesRes] = await Promise.all([
        fetch(`${API_BASE}/shifts/mes-shifts?start=${startDate}&end=${endDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/remplacements/mes-demandes`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/remplacements/disponibles`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (shiftsRes.ok) {
        const data = await shiftsRes.json();
        setShifts(data);
      }
      
      if (demandesRes.ok) {
        const data = await demandesRes.json();
        setMesRemplacements(data);
      }
      
      if (disponiblesRes.ok) {
        const data = await disponiblesRes.json();
        setRemplacementsDisponibles(data);
      }
      
    } catch (err) {
      console.error('Erreur chargement planning:', err);
      setError('Impossible de charger le planning');
    } finally {
      setLoading(false);
    }
  }, [token, weekDates]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Navigation semaine
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
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Trouver le shift pour une date
  const getShiftForDate = (date) => {
    const dateStr = toLocalDateString(date);
    return shifts.find(s => {
      const shiftDate = toLocalDateString(s.date);
      return shiftDate === dateStr;
    });
  };
  
  // Calculer les heures de la semaine
  const weeklyHours = useMemo(() => {
    return shifts.reduce((acc, shift) => {
      return acc + calculateShiftHours(shift.segments);
    }, 0);
  }, [shifts]);
  
  // Demander un remplacement
  const handleDemandeRemplacement = (shift) => {
    setSelectedShift(shift);
    setShowModal(true);
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
        setShowModal(false);
        setSelectedShift(null);
        fetchData(); // Rafraîchir
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur lors de la demande');
      }
    } catch (err) {
      console.error('Erreur demande remplacement:', err);
      alert('Erreur réseau');
    }
  };
  
  // Candidater à un remplacement
  const handleCandidater = async (demandeId) => {
    try {
      const res = await fetch(`${API_BASE}/api/remplacements/${demandeId}/candidater`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ commentaire: '' })
      });
      
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur lors de la candidature');
      }
    } catch (err) {
      console.error('Erreur candidature:', err);
    }
  };
  
  // Vérifier si c'est aujourd'hui
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30 pb-navbar lg:pb-8 pt-header">
      {/* Header */}
      <div 
        className="sticky top-0 z-40 px-4 pt-6 pb-4"
        style={{ background: `linear-gradient(135deg, ${brand} 0%, #a61f22 100%)` }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Mon Planning</h1>
            <p className="text-white/80 text-sm">Semaine du {formatDate(weekDates[0])}</p>
          </div>
          <button 
            onClick={fetchData}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Navigation semaine */}
        <div className="flex items-center justify-between bg-white/10 rounded-xl p-2">
          <button 
            onClick={goToPrevWeek}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          
          <button 
            onClick={goToToday}
            className="px-4 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium"
          >
            Aujourd'hui
          </button>
          
          <button 
            onClick={goToNextWeek}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
        
        {/* Stats de la semaine */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{weeklyHours.toFixed(1)}h</div>
            <div className="text-xs text-white/70">Cette semaine</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{shifts.length}</div>
            <div className="text-xs text-white/70">Shifts prévus</div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="sticky top-[220px] z-30 bg-white border-b px-2 py-2 flex gap-1">
        {[
          { id: 'planning', label: 'Planning', icon: Calendar },
          { id: 'mes-demandes', label: 'Mes demandes', icon: Send, count: mesRemplacements.filter(r => r.statut === 'en_attente').length },
          { id: 'disponibles', label: 'Remplacements', icon: Users, count: remplacementsDisponibles.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
              activeTab === tab.id 
                ? 'bg-red-50 text-red-700' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                {tab.count}
              </span>
            )}
          </button>
        ))}
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
            {/* Vue Planning */}
            {activeTab === 'planning' && (
              <div className="space-y-3">
                {weekDates.map((date, idx) => {
                  const shift = getShiftForDate(date);
                  const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
                  const dayNum = date.getDate();
                  const isPast = date < new Date(new Date().setHours(0,0,0,0));
                  
                  return (
                    <div 
                      key={idx} 
                      className={`bg-white rounded-xl border overflow-hidden ${
                        isToday(date) ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100'
                      } ${isPast ? 'opacity-60' : ''}`}
                    >
                      <div className={`px-4 py-2 flex items-center justify-between ${
                        isToday(date) ? 'bg-red-50' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            isToday(date) 
                              ? 'bg-red-500 text-white' 
                              : 'bg-white text-gray-700'
                          }`}>
                            {dayNum}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 capitalize">{dayName}</div>
                            <div className="text-xs text-gray-500">
                              {date.toLocaleDateString('fr-FR', { month: 'long' })}
                            </div>
                          </div>
                        </div>
                        {isToday(date) && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                            Aujourd'hui
                          </span>
                        )}
                      </div>
                      
                      <div className="p-3">
                        <ShiftCard 
                          shift={shift} 
                          onDemandeRemplacement={!isPast && shift ? handleDemandeRemplacement : null}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Mes demandes de remplacement */}
            {activeTab === 'mes-demandes' && (
              <div className="space-y-3">
                {mesRemplacements.length === 0 ? (
                  <div className="text-center py-12">
                    <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Aucune demande de remplacement</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Cliquez sur un shift dans votre planning pour demander un remplacement
                    </p>
                  </div>
                ) : (
                  mesRemplacements.map(demande => (
                    <RemplacementCard key={demande.id} demande={demande} type="demande" />
                  ))
                )}
              </div>
            )}
            
            {/* Remplacements disponibles */}
            {activeTab === 'disponibles' && (
              <div className="space-y-3">
                {remplacementsDisponibles.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Aucun remplacement disponible</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Les demandes de remplacement de vos collègues apparaîtront ici
                    </p>
                  </div>
                ) : (
                  remplacementsDisponibles.map(demande => (
                    <div key={demande.id} className="bg-white rounded-xl border p-4">
                      <RemplacementCard demande={demande} type="disponible" />
                      
                      <button
                        onClick={() => handleCandidater(demande.id)}
                        className="mt-3 w-full py-2 rounded-lg text-white font-medium flex items-center justify-center gap-2"
                        style={{ backgroundColor: brand }}
                      >
                        <UserPlus className="w-4 h-4" />
                        Me proposer
                      </button>
                      
                      {demande.memeCategorie && (
                        <div className="mt-2 text-xs text-center text-green-600">
                          ✓ Même catégorie que vous
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Modal demande remplacement */}
      {showModal && selectedShift && (
        <ModalDemandeRemplacement
          shift={selectedShift}
          onClose={() => { setShowModal(false); setSelectedShift(null); }}
          onSubmit={submitDemandeRemplacement}
        />
      )}
      
      <BottomNav />
    </div>
  );
}
