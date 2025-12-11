// client/src/pages/PlanningEquipe.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Clock, ChevronLeft, ChevronRight, Users, 
  AlertCircle, RefreshCw, Sun, Moon, Coffee, User,
  Filter, Search, Eye, UserPlus, Palmtree
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

const getShiftTypeStyle = (type) => {
  switch (type?.toLowerCase()) {
    case 'matin':
      return { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🌅' };
    case 'soir':
      return { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: '🌆' };
    case 'nuit':
      return { bg: 'bg-purple-100', text: 'text-purple-700', icon: '🌙' };
    case 'journee':
      return { bg: 'bg-blue-100', text: 'text-blue-700', icon: '☀️' };
    case 'coupure':
      return { bg: 'bg-orange-100', text: 'text-orange-700', icon: '☕' };
    case 'absence':
      return { bg: 'bg-red-100', text: 'text-red-700', icon: '❌' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', icon: '📋' };
  }
};

const getWeekDates = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  
  const monday = new Date(d.setDate(diff));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
};

const getInitials = (nom, prenom) => {
  return `${prenom?.charAt(0) || ''}${nom?.charAt(0) || ''}`.toUpperCase();
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Avatar employé
function EmployeAvatar({ employe, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };
  
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
  ];
  
  const colorIndex = (employe?.id || 0) % colors.length;
  
  if (employe?.photoProfil) {
    return (
      <img 
        src={`${API_BASE}${employe.photoProfil}`}
        alt={`${employe.prenom} ${employe.nom}`}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }
  
  return (
    <div className={`${sizeClasses[size]} ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-medium`}>
      {getInitials(employe?.nom, employe?.prenom)}
    </div>
  );
}

// Cellule de shift dans le tableau
function ShiftCell({ shift, conge, isCurrentUser }) {
  if (conge) {
    return (
      <div className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs text-center">
        <Palmtree className="w-3 h-3 inline mr-1" />
        {conge.type}
      </div>
    );
  }
  
  if (!shift) {
    return (
      <div className="px-2 py-1 text-center text-gray-300 text-xs">
        —
      </div>
    );
  }
  
  const style = getShiftTypeStyle(shift.type);
  
  // Extraire les horaires
  const getHoraires = () => {
    if (!shift.segments || shift.segments.length === 0) return '';
    const travailSegs = shift.segments.filter(s => 
      s.type?.toLowerCase() !== 'pause' && s.type?.toLowerCase() !== 'break'
    );
    if (travailSegs.length === 0) return '';
    const first = travailSegs[0].start || travailSegs[0].debut;
    const last = travailSegs[travailSegs.length - 1].end || travailSegs[travailSegs.length - 1].fin;
    return `${first?.slice(0,5)}-${last?.slice(0,5)}`;
  };
  
  return (
    <div className={`px-2 py-1 rounded ${style.bg} ${style.text} text-xs text-center ${
      isCurrentUser ? 'ring-2 ring-red-400' : ''
    }`}>
      <span className="mr-1">{style.icon}</span>
      <span className="font-medium">{getHoraires()}</span>
    </div>
  );
}

// Ligne employé dans le tableau
function EmployeRow({ employe, weekDates, shifts, conges, isCurrentUser }) {
  // Trouver les shifts et congés pour chaque jour
  const getDataForDate = (date) => {
    const dateStr = toLocalDateString(date);
    
    const shift = shifts.find(s => {
      const shiftDate = toLocalDateString(s.date);
      return shiftDate === dateStr && s.employeId === employe.id;
    });
    
    const conge = conges.find(c => {
      const debut = new Date(c.dateDebut);
      const fin = new Date(c.dateFin);
      return c.userId === employe.id && date >= debut && date <= fin;
    });
    
    return { shift, conge };
  };
  
  return (
    <tr className={`border-b border-gray-100 ${isCurrentUser ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
      <td className="sticky left-0 bg-white z-10 px-3 py-2 border-r border-gray-100">
        <div className="flex items-center gap-2 min-w-[120px]">
          <EmployeAvatar employe={employe} size="sm" />
          <div className="truncate">
            <div className="font-medium text-sm text-gray-900 truncate">
              {employe.prenom}
              {isCurrentUser && <span className="ml-1 text-xs text-red-500">(vous)</span>}
            </div>
            <div className="text-xs text-gray-500 truncate">{employe.nom}</div>
          </div>
        </div>
      </td>
      
      {weekDates.map((date, idx) => {
        const { shift, conge } = getDataForDate(date);
        const isToday = date.toDateString() === new Date().toDateString();
        
        return (
          <td 
            key={idx} 
            className={`px-1 py-2 text-center ${isToday ? 'bg-yellow-50' : ''}`}
          >
            <ShiftCell shift={shift} conge={conge} isCurrentUser={isCurrentUser} />
          </td>
        );
      })}
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export default function PlanningEquipe() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState({ employes: [], shifts: [], conges: [], categorie: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyWorking, setShowOnlyWorking] = useState(false);
  
  const token = localStorage.getItem('token');
  const currentUserId = parseInt(localStorage.getItem('userId') || '0');
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  
  // Charger les données
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    
    try {
      const startDate = toLocalDateString(weekDates[0]);
      const endDate = toLocalDateString(weekDates[6]);
      
      const res = await fetch(
        `${API_BASE}/shifts/equipe?start=${startDate}&end=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        throw new Error('Erreur de chargement');
      }
    } catch (err) {
      console.error('Erreur chargement planning équipe:', err);
      setError('Impossible de charger le planning');
    } finally {
      setLoading(false);
    }
  }, [token, weekDates]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Navigation
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
  
  // Filtrer les employés
  const filteredEmployes = useMemo(() => {
    let result = data.employes;
    
    // Recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.prenom?.toLowerCase().includes(term) ||
        e.nom?.toLowerCase().includes(term)
      );
    }
    
    // Filtrer ceux qui travaillent cette semaine
    if (showOnlyWorking) {
      const employesAvecShift = new Set(data.shifts.map(s => s.employeId));
      result = result.filter(e => employesAvecShift.has(e.id));
    }
    
    // Mettre l'utilisateur actuel en premier
    result.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });
    
    return result;
  }, [data.employes, data.shifts, searchTerm, showOnlyWorking, currentUserId]);
  
  // Stats
  const stats = useMemo(() => {
    const today = toLocalDateString(new Date());
    const todayShifts = data.shifts.filter(s => {
      const shiftDate = toLocalDateString(s.date);
      return shiftDate === today;
    });
    
    return {
      totalEmployes: data.employes.length,
      presentAujourdhui: todayShifts.length,
      totalShiftsSemaine: data.shifts.length
    };
  }, [data]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-navbar lg:pb-8 pt-header">
      {/* Header */}
      <div 
        className="sticky top-0 z-40 px-4 pt-6 pb-4"
        style={{ background: `linear-gradient(135deg, #2563eb 0%, #1e40af 100%)` }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Planning Équipe
            </h1>
            <p className="text-white/80 text-sm">
              {data.categorie ? `Équipe ${data.categorie}` : 'Tous les employés'}
            </p>
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
          
          <div className="text-center">
            <div className="text-white font-medium">
              {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
            </div>
            <button 
              onClick={goToToday}
              className="text-xs text-white/70 hover:text-white"
            >
              Revenir à aujourd'hui
            </button>
          </div>
          
          <button 
            onClick={goToNextWeek}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
        
        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <div className="text-lg font-bold text-white">{stats.totalEmployes}</div>
            <div className="text-xs text-white/70">Équipiers</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <div className="text-lg font-bold text-white">{stats.presentAujourdhui}</div>
            <div className="text-xs text-white/70">Aujourd'hui</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2 text-center">
            <div className="text-lg font-bold text-white">{stats.totalShiftsSemaine}</div>
            <div className="text-xs text-white/70">Shifts/sem.</div>
          </div>
        </div>
      </div>
      
      {/* Filtres */}
      <div className="sticky top-[200px] z-30 bg-white border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowOnlyWorking(!showOnlyWorking)}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
              showOnlyWorking 
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 inline mr-1" />
            Actifs
          </button>
        </div>
      </div>
      
      {/* Contenu */}
      <div className="px-2 py-4">
        {error && (
          <div className="mx-2 mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 z-10 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-200">
                    Employé
                  </th>
                  {weekDates.map((date, idx) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });
                    const dayNum = date.getDate();
                    
                    return (
                      <th 
                        key={idx}
                        className={`px-2 py-2 text-center text-xs font-medium min-w-[70px] ${
                          isToday ? 'bg-yellow-100 text-yellow-800' : 'text-gray-500'
                        }`}
                      >
                        <div className="capitalize">{dayName}</div>
                        <div className={`text-lg font-bold ${isToday ? 'text-yellow-700' : 'text-gray-700'}`}>
                          {dayNum}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredEmployes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Aucun employé trouvé</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployes.map(employe => (
                    <EmployeRow
                      key={employe.id}
                      employe={employe}
                      weekDates={weekDates}
                      shifts={data.shifts}
                      conges={data.conges}
                      isCurrentUser={employe.id === currentUserId}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Légende */}
        <div className="mt-6 px-2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Légende</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'matin', label: 'Matin' },
              { type: 'soir', label: 'Soir' },
              { type: 'nuit', label: 'Nuit' },
              { type: 'journee', label: 'Journée' },
              { type: 'coupure', label: 'Coupure' }
            ].map(item => {
              const style = getShiftTypeStyle(item.type);
              return (
                <div key={item.type} className={`px-2 py-1 rounded text-xs ${style.bg} ${style.text}`}>
                  {style.icon} {item.label}
                </div>
              );
            })}
            <div className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
              🌴 Congé
            </div>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
}
