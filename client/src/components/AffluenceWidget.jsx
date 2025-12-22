import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Clock, TrendingUp, TrendingDown, Minus, Users, MapPin } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Widget d'affluence style Google Maps
 * Affiche les Popular Times avec barres par heure
 */
const AffluenceWidget = () => {
  const [affluence, setAffluence] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAffluence = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/external/affluence`);
      if (res.ok) {
        const data = await res.json();
        setAffluence(data);
      }
    } catch (err) {
      console.error('Erreur affluence:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAffluence();
    const interval = setInterval(fetchAffluence, 5 * 60 * 1000); // Refresh toutes les 5 min
    return () => clearInterval(interval);
  }, [fetchAffluence]);

  // Données d'affluence typiques pour un restaurant (quand pas de données Google)
  const getTypicalAffluence = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    
    // Pattern typique restaurant
    const weekdayPattern = {
      9: 10, 10: 15, 11: 35, 12: 85, 13: 75, 14: 40,
      15: 20, 16: 15, 17: 20, 18: 35, 19: 70, 20: 90, 21: 80, 22: 50, 23: 25
    };
    
    const weekendPattern = {
      9: 15, 10: 25, 11: 45, 12: 95, 13: 90, 14: 60,
      15: 35, 16: 25, 17: 30, 18: 50, 19: 85, 20: 100, 21: 95, 22: 70, 23: 40
    };
    
    return isWeekend ? weekendPattern : weekdayPattern;
  };

  const currentHour = new Date().getHours();
  const typicalData = getTypicalAffluence();
  
  // Heures d'ouverture restaurant
  const openingHours = [11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 23];
  const displayHours = [11, 12, 13, 14, 19, 20, 21, 22];
  
  // Score actuel
  const currentScore = affluence?.score || typicalData[currentHour] || null;
  const isOpen = currentHour >= 11 && currentHour <= 23 && !(currentHour >= 15 && currentHour < 18);
  
  // Statut
  const getStatus = () => {
    if (!isOpen) return { text: 'Fermé', color: 'text-gray-400', bg: 'bg-gray-100' };
    if (currentScore >= 80) return { text: 'Très fréquenté', color: 'text-red-600', bg: 'bg-red-100' };
    if (currentScore >= 60) return { text: 'Assez fréquenté', color: 'text-orange-600', bg: 'bg-orange-100' };
    if (currentScore >= 40) return { text: 'Modérément fréquenté', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { text: 'Peu fréquenté', color: 'text-green-600', bg: 'bg-green-100' };
  };
  
  const status = getStatus();

  // Couleur des barres
  const getBarColor = (value, hour) => {
    const isCurrent = hour === currentHour && isOpen;
    if (isCurrent) return 'bg-blue-500';
    if (value >= 80) return 'bg-red-400';
    if (value >= 60) return 'bg-orange-400';
    if (value >= 40) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="flex gap-1 h-24">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex-1 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Affluence en direct</h3>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <MapPin className="w-3 h-3" />
                <span>{affluence?.placeName || 'Chez Antoine'}</span>
              </div>
            </div>
          </div>
          
          {/* Live indicator */}
          {isOpen && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 uppercase">Live</span>
            </div>
          )}
        </div>

        {/* Current status */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`px-3 py-1.5 rounded-lg ${status.bg}`}>
            <span className={`text-sm font-semibold ${status.color}`}>{status.text}</span>
          </div>
          
          {isOpen && currentScore && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-2xl font-bold text-gray-900">{currentScore}%</span>
              </div>
              {affluence?.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
              {affluence?.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
              {affluence?.trend === 'stable' && <Minus className="w-4 h-4 text-gray-400" />}
            </div>
          )}
          
          {affluence?.dataAge && (
            <span className="text-[10px] text-gray-400 ml-auto">
              Mis à jour il y a {affluence.dataAge}
            </span>
          )}
        </div>
      </div>

      {/* Graphique barres - Style Google */}
      <div className="px-4 pb-4">
        <div className="flex items-end gap-[3px] h-20">
          {displayHours.map((hour) => {
            const value = typicalData[hour] || 0;
            const height = Math.max(8, (value / 100) * 100);
            const isCurrent = hour === currentHour && isOpen;
            
            return (
              <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className={`w-full rounded-t transition-all duration-300 ${getBarColor(value, hour)} ${isCurrent ? 'ring-2 ring-blue-300 ring-offset-1' : 'opacity-70 hover:opacity-100'}`}
                  style={{ height: `${height}%` }}
                  title={`${hour}h: ${value}%`}
                />
              </div>
            );
          })}
        </div>
        
        {/* Heures labels */}
        <div className="flex gap-[3px] mt-1">
          {displayHours.map((hour) => (
            <div key={hour} className="flex-1 text-center">
              <span className={`text-[9px] ${hour === currentHour && isOpen ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
                {hour}h
              </span>
            </div>
          ))}
        </div>
        
        {/* Légende */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span>Calme</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <span>Modéré</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-400"></div>
              <span>Chargé</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span>Très chargé</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Clock className="w-3 h-3" />
            <span>Données typiques</span>
          </div>
        </div>
      </div>
      
      {/* Footer - Recommandation business */}
      {isOpen && currentScore && (
        <div className={`px-4 py-2.5 border-t ${currentScore >= 70 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center gap-2">
            {currentScore >= 70 ? (
              <>
                <span className="text-lg">🔥</span>
                <span className="text-xs text-amber-700">
                  <strong>Rush prévu</strong> — Anticipez les commandes livraison (+{Math.round(currentScore * 0.2)}% estimé)
                </span>
              </>
            ) : currentScore >= 40 ? (
              <>
                <span className="text-lg">📊</span>
                <span className="text-xs text-blue-700">
                  <strong>Affluence normale</strong> — Flux de commandes standard attendu
                </span>
              </>
            ) : (
              <>
                <span className="text-lg">💡</span>
                <span className="text-xs text-green-700">
                  <strong>Période calme</strong> — Idéal pour la mise en place ou préparation
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AffluenceWidget;
