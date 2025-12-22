import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, Trophy, PartyPopper, GraduationCap,
  Utensils, Star, AlertCircle, Clock, MapPin, Users, Tv, Gift, Heart,
  Flame, Sparkles
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * 📅 Événements à Venir - Calendrier 7 jours
 * Vue des événements impactant l'activité du restaurant
 */
const EvenementsCalendrier = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  // Fetch matchs depuis l'API
  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/external/matches`);
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error('Erreur matchs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // ═══════════════════════════════════════════════════════════════
  // 📅 GÉNÉRATION DES ÉVÉNEMENTS
  // ═══════════════════════════════════════════════════════════════
  const generateEvents = useMemo(() => {
    const events = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // ═══ FÊTES ET JOURS FÉRIÉS 2024-2026 ═══
    const fetes = [
      // 2025
      { date: '2025-01-01', nom: 'Jour de l\'An', type: 'ferie', impact: 'high', icon: PartyPopper, emoji: '🎆' },
      { date: '2025-02-14', nom: 'Saint-Valentin', type: 'fete', impact: 'critical', icon: Heart, emoji: '❤️' },
      { date: '2025-04-20', nom: 'Pâques', type: 'ferie', impact: 'medium', icon: Gift, emoji: '🐣' },
      { date: '2025-04-21', nom: 'Lundi de Pâques', type: 'ferie', impact: 'medium', icon: Gift, emoji: '🐣' },
      { date: '2025-05-01', nom: 'Fête du Travail', type: 'ferie', impact: 'high', icon: Star, emoji: '🌺' },
      { date: '2025-05-08', nom: 'Victoire 1945', type: 'ferie', impact: 'medium', icon: Star, emoji: '🎖️' },
      { date: '2025-05-25', nom: 'Fête des Mères', type: 'fete', impact: 'critical', icon: Heart, emoji: '👩' },
      { date: '2025-05-29', nom: 'Ascension', type: 'ferie', impact: 'medium', icon: Star, emoji: '✨' },
      { date: '2025-06-08', nom: 'Pentecôte', type: 'ferie', impact: 'low', icon: Star, emoji: '✨' },
      { date: '2025-06-15', nom: 'Fête des Pères', type: 'fete', impact: 'high', icon: Heart, emoji: '👨' },
      { date: '2025-07-14', nom: 'Fête Nationale', type: 'ferie', impact: 'high', icon: PartyPopper, emoji: '🇫🇷' },
      { date: '2025-08-15', nom: 'Assomption', type: 'ferie', impact: 'medium', icon: Star, emoji: '⭐' },
      { date: '2025-10-31', nom: 'Halloween', type: 'fete', impact: 'medium', icon: PartyPopper, emoji: '🎃' },
      { date: '2025-11-01', nom: 'Toussaint', type: 'ferie', impact: 'low', icon: Star, emoji: '🕯️' },
      { date: '2025-11-11', nom: 'Armistice', type: 'ferie', impact: 'medium', icon: Star, emoji: '🎖️' },
      { date: '2025-12-24', nom: 'Réveillon Noël', type: 'fete', impact: 'critical', icon: Gift, emoji: '🎄' },
      { date: '2025-12-25', nom: 'Noël', type: 'ferie', impact: 'high', icon: Gift, emoji: '🎁' },
      { date: '2025-12-31', nom: 'Réveillon Nouvel An', type: 'fete', impact: 'critical', icon: PartyPopper, emoji: '🥂' },
      // 2026
      { date: '2026-01-01', nom: 'Jour de l\'An', type: 'ferie', impact: 'high', icon: PartyPopper, emoji: '🎆' },
      { date: '2026-02-14', nom: 'Saint-Valentin', type: 'fete', impact: 'critical', icon: Heart, emoji: '❤️' },
    ];

    // Ajouter les fêtes dans les 30 prochains jours
    fetes.forEach(fete => {
      const feteDate = new Date(fete.date);
      feteDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((feteDate - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays <= 30) {
        events.push({
          ...fete,
          dateObj: feteDate,
          daysUntil: diffDays,
          category: 'fete'
        });
      }
    });

    // ═══ VACANCES SCOLAIRES (Zone C - Paris) ═══
    const vacances = [
      { debut: '2025-12-21', fin: '2026-01-05', nom: 'Vacances de Noël' },
      { debut: '2026-02-14', fin: '2026-03-02', nom: 'Vacances d\'Hiver' },
      { debut: '2026-04-11', fin: '2026-04-27', nom: 'Vacances de Printemps' },
      { debut: '2026-07-04', fin: '2026-09-01', nom: 'Vacances d\'Été' },
    ];

    vacances.forEach(vac => {
      const debutDate = new Date(vac.debut);
      const finDate = new Date(vac.fin);
      debutDate.setHours(0, 0, 0, 0);
      finDate.setHours(0, 0, 0, 0);
      
      // Si on est pendant les vacances
      if (today >= debutDate && today <= finDate) {
        const joursRestants = Math.ceil((finDate - today) / (1000 * 60 * 60 * 24));
        events.push({
          date: vac.debut,
          dateObj: today,
          nom: `${vac.nom} (en cours)`,
          type: 'vacances',
          impact: 'medium',
          icon: GraduationCap,
          emoji: '🎓',
          daysUntil: 0,
          detail: `Encore ${joursRestants} jours`,
          category: 'vacances'
        });
      }
      // Si les vacances arrivent dans les 14 jours
      else {
        const diffDays = Math.ceil((debutDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && diffDays <= 14) {
          events.push({
            date: vac.debut,
            dateObj: debutDate,
            nom: `Début ${vac.nom}`,
            type: 'vacances',
            impact: 'medium',
            icon: GraduationCap,
            emoji: '🎓',
            daysUntil: diffDays,
            category: 'vacances'
          });
        }
      }
    });

    // ═══ MATCHS ═══
    matches
      .filter(m => {
        // Filtrer uniquement les matchs impactants
        if (m.importance >= 4) return true; // PSG, gros matchs
        if (m.competitionCode === 'CAN' || m.competitionCode === 'AFCON') return true; // CAN
        return false;
      })
      .forEach(match => {
        const matchDate = new Date(match.date);
        matchDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((matchDate - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays <= 14) {
          // Formater les noms d'équipes
          const homeShort = match.homeTeam?.replace('Paris Saint-Germain', 'PSG').split(' ')[0] || '?';
          const awayShort = match.awayTeam?.replace('Paris Saint-Germain', 'PSG').split(' ')[0] || '?';
          
          events.push({
            date: match.date,
            dateObj: matchDate,
            nom: `${homeShort} vs ${awayShort}`,
            type: 'match',
            impact: match.importance >= 5 ? 'critical' : 'high',
            icon: Tv,
            emoji: '⚽',
            daysUntil: diffDays,
            detail: match.competition || 'Football',
            heure: match.time || '21:00',
            category: 'match'
          });
        }
      });

    // Trier par date
    return events.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [matches]);

  // ═══════════════════════════════════════════════════════════════
  // 📆 GÉNÉRATION DES 7 PROCHAINS JOURS
  // ═══════════════════════════════════════════════════════════════
  const next7Days = useMemo(() => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      date.setHours(0, 0, 0, 0);
      
      const dayEvents = generateEvents.filter(e => 
        e.dateObj.toDateString() === date.toDateString()
      );
      
      // Calculer le score d'intensité du jour
      let intensity = 0;
      dayEvents.forEach(e => {
        if (e.impact === 'critical') intensity += 40;
        else if (e.impact === 'high') intensity += 25;
        else if (e.impact === 'medium') intensity += 15;
        else intensity += 5;
      });
      
      // Bonus week-end
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 5) intensity += 15; // Vendredi
      if (dayOfWeek === 6) intensity += 20; // Samedi
      if (dayOfWeek === 0) intensity += 10; // Dimanche
      
      days.push({
        date,
        dayName: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        dayNum: date.getDate(),
        isToday: i === 0,
        events: dayEvents,
        intensity: Math.min(100, intensity)
      });
    }
    
    return days;
  }, [generateEvents]);

  // Style selon impact
  const getImpactStyle = (impact) => {
    switch (impact) {
      case 'critical': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
      case 'high': return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' };
      case 'medium': return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
      default: return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
    }
  };

  // Intensité couleur
  const getIntensityColor = (intensity) => {
    if (intensity >= 60) return 'bg-red-500';
    if (intensity >= 40) return 'bg-orange-500';
    if (intensity >= 20) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="flex gap-2 mb-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-1 h-16 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-12 bg-gray-100 rounded"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <div className="p-1.5 bg-[#cf292c]/10 rounded-lg">
              <Calendar className="w-4 h-4 text-[#cf292c]" />
            </div>
            Événements à venir
          </h3>
          <span className="text-xs text-[#cf292c] bg-[#cf292c]/10 px-2 py-1 rounded-full font-medium">7 jours</span>
        </div>
      </div>

      {/* Timeline 7 jours */}
      <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="flex gap-1.5">
          {next7Days.map((day, i) => (
            <button
              key={i}
              onClick={() => setSelectedDate(selectedDate?.toDateString() === day.date.toDateString() ? null : day.date)}
              className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-xl transition-all ${
                selectedDate?.toDateString() === day.date.toDateString()
                  ? 'bg-[#cf292c] text-white shadow-lg shadow-[#cf292c]/30'
                  : day.isToday 
                    ? 'bg-[#cf292c]/10 ring-2 ring-[#cf292c]/40' 
                    : 'bg-white hover:bg-gray-50 border border-gray-100'
              }`}
            >
              <span className={`text-[10px] uppercase font-medium ${
                selectedDate?.toDateString() === day.date.toDateString()
                  ? 'text-white/80'
                  : day.isToday ? 'text-[#cf292c] font-bold' : 'text-gray-400'
              }`}>
                {day.isToday ? "Auj." : day.dayName}
              </span>
              <span className={`text-xl font-bold ${
                selectedDate?.toDateString() === day.date.toDateString()
                  ? 'text-white'
                  : day.isToday ? 'text-[#cf292c]' : 'text-gray-700'
              }`}>
                {day.dayNum}
              </span>
              
              {/* Points indicateurs événements */}
              {day.events.length > 0 && (
                <div className="flex gap-0.5 mt-1.5">
                  {day.events.slice(0, 3).map((e, j) => (
                    <div 
                      key={j} 
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedDate?.toDateString() === day.date.toDateString()
                          ? 'bg-white/70'
                          : getImpactStyle(e.impact).dot
                      }`}
                    />
                  ))}
                </div>
              )}
              
              {/* Barre d'intensité */}
              <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${
                selectedDate?.toDateString() === day.date.toDateString()
                  ? 'bg-[#cf292c]/50'
                  : 'bg-gray-200'
              }`}>
                <div 
                  className={`h-full transition-all rounded-full ${
                    selectedDate?.toDateString() === day.date.toDateString()
                      ? 'bg-white'
                      : getIntensityColor(day.intensity)
                  }`}
                  style={{ width: `${Math.max(day.intensity, 5)}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Liste des événements */}
      <div className="px-4 py-3 space-y-2 flex-1 overflow-y-auto">
        {generateEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">Aucun événement prévu</p>
            <p className="text-xs">Les prochains jours s'annoncent calmes</p>
          </div>
        ) : (
          generateEvents
            .filter(e => !selectedDate || e.dateObj.toDateString() === selectedDate.toDateString())
            .slice(0, 5)
            .map((event, i) => {
              const style = getImpactStyle(event.impact);
              const EventIcon = event.icon;
              
              return (
                <div 
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl ${style.bg} border ${style.border} transition-all hover:shadow-md hover:scale-[1.01]`}
                >
                  {/* Icône */}
                  <div className={`p-2 rounded-lg bg-white/60`}>
                    <EventIcon className={`w-5 h-5 ${style.text}`} />
                  </div>
                  
                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm ${style.text} truncate`}>
                        {event.nom}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {event.heure && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.heure}
                        </span>
                      )}
                      {event.detail && (
                        <span className="text-xs text-gray-500 truncate">{event.detail}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Badge J-X */}
                  <div className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                    event.daysUntil === 0 
                      ? 'bg-red-500 text-white shadow-sm' 
                      : event.daysUntil <= 2 
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-white/80 text-gray-600 border border-gray-200'
                  }`}>
                    {event.daysUntil === 0 ? "Aujourd'hui" : `J-${event.daysUntil}`}
                  </div>
                </div>
              );
            })
        )}
        
        {/* Voir plus */}
        {generateEvents.length > 5 && !selectedDate && (
          <button className="w-full py-2.5 text-sm text-[#cf292c] hover:text-[#cf292c]/80 font-medium hover:bg-[#cf292c]/5 rounded-lg transition-colors">
            Voir les {generateEvents.length} événements
          </button>
        )}
      </div>
    </div>
  );
};

export default EvenementsCalendrier;
