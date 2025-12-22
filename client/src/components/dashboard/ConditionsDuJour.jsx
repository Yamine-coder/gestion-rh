import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, CloudSun, CloudDrizzle,
  Thermometer, Droplets, Umbrella, CheckCircle, XCircle, AlertTriangle,
  Activity, TrendingUp, TrendingDown, Minus, MapPin, Clock, Users,
  RefreshCw, Sparkles, Coffee, Moon, Flame, BarChart3, Utensils
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * 📊 Conditions du Jour - Widget Fusionné
 * Combine Météo/Terrasse + Affluence en direct
 * 
 * "L'affluence s'explique par la météo"
 */
const ConditionsDuJour = () => {
  const [weather, setWeather] = useState(null);
  const [affluence, setAffluence] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [analysisRes, affluenceRes] = await Promise.all([
        fetch(`${API_BASE}/api/external/smart-analysis`),
        fetch(`${API_BASE}/api/external/affluence`)
      ]);
      
      if (analysisRes.ok) {
        const data = await analysisRes.json();
        setWeather(data.weather);
      }
      if (affluenceRes.ok) {
        const data = await affluenceRes.json();
        setAffluence(data);
      }
    } catch (err) {
      console.error('Erreur conditions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // 5min
    return () => clearInterval(interval);
  }, [fetchData]);

  // ═══════════════════════════════════════════════════════════════
  // 🌤️ MÉTÉO HELPERS
  // ═══════════════════════════════════════════════════════════════
  const getWeatherIcon = (condition) => {
    const icons = {
      'soleil': Sun,
      'nuageux': Cloud,
      'partiellement_nuageux': CloudSun,
      'pluie': CloudRain,
      'pluie_legere': CloudDrizzle,
      'neige': CloudSnow,
      'orage': CloudLightning,
      'brouillard': Wind
    };
    return icons[condition] || CloudSun;
  };

  const getConditionLabel = (condition) => {
    const labels = {
      'soleil': 'Ensoleillé',
      'nuageux': 'Nuageux',
      'partiellement_nuageux': 'Partiellement nuageux',
      'pluie': 'Pluie',
      'pluie_legere': 'Pluie légère',
      'neige': 'Neige',
      'orage': 'Orage',
      'brouillard': 'Brouillard'
    };
    return labels[condition] || condition;
  };

  // Décision terrasse
  const getDecisionTerrasse = () => {
    if (!weather?.terrasseConfort) return null;
    
    const niveau = weather.terrasseConfort.niveau;
    if (niveau === 'bon') return { ok: true, label: 'Terrasse OK', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (niveau === 'moyen') return { ok: null, label: 'Limite', color: 'text-amber-600', bg: 'bg-amber-100' };
    return { ok: false, label: 'Fermée', color: 'text-red-600', bg: 'bg-red-100' };
  };

  // Impact météo sur affluence
  const getWeatherImpact = () => {
    if (!weather) return null;
    
    const temp = weather.temperature;
    const condition = weather.condition;
    
    if (condition === 'soleil' && temp >= 18 && temp <= 28) {
      return { percent: '+15%', label: 'Beau temps favorable', positive: true };
    } else if (condition === 'pluie' || condition === 'orage') {
      return { percent: '-15%', label: 'Mauvais temps', positive: false };
    } else if (condition === 'pluie_legere') {
      return { percent: '-10%', label: 'Pluie légère', positive: false };
    } else if (temp < 8) {
      return { percent: '-10%', label: 'Froid', positive: false };
    } else if (temp > 32) {
      return { percent: '-5%', label: 'Trop chaud', positive: false };
    }
    return null;
  };

  // ═══════════════════════════════════════════════════════════════
  // 📊 AFFLUENCE HELPERS  
  // ═══════════════════════════════════════════════════════════════
  const currentHour = new Date().getHours();
  const isOpen = currentHour >= 11 && currentHour <= 23 && !(currentHour >= 15 && currentHour < 18);

  // Pattern affluence typique
  const getTypicalAffluence = () => {
    const dayOfWeek = new Date().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    
    const weekdayPattern = {
      11: 35, 12: 85, 13: 75, 14: 40, 18: 35, 19: 70, 20: 90, 21: 80, 22: 50, 23: 25
    };
    const weekendPattern = {
      11: 45, 12: 95, 13: 90, 14: 60, 18: 50, 19: 85, 20: 100, 21: 95, 22: 70, 23: 40
    };
    
    return isWeekend ? weekendPattern : weekdayPattern;
  };

  const typicalData = getTypicalAffluence();
  const displayHours = [11, 12, 13, 14, 19, 20, 21, 22];
  const usualForThisHour = typicalData[currentHour] || 50;
  
  // Score actuel : données Google si disponibles, sinon estimation
  const currentScore = affluence?.score || typicalData[currentHour] || 0;

  // ═══════════════════════════════════════════════════════════════
  // 📊 COMPARAISON VS HABITUEL (uniquement données Google réelles)
  // ═══════════════════════════════════════════════════════════════
  const getComparisonVsUsual = () => {
    if (!isOpen) return null;
    
    // Si on a les données Google avec trend
    if (affluence?.trend) {
      if (affluence.trend === 'busier') {
        return { 
          text: 'Plus fréquenté que d\'habitude', 
          icon: TrendingUp, 
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200'
        };
      } else if (affluence.trend === 'less_busy') {
        return { 
          text: 'Moins fréquenté que d\'habitude', 
          icon: TrendingDown, 
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200'
        };
      } else if (affluence.trend === 'normal') {
        return { 
          text: 'Aussi fréquenté que d\'habitude', 
          icon: Minus, 
          color: 'text-gray-500',
          bg: 'bg-gray-50',
          border: 'border-gray-200'
        };
      }
    }
    
    // Si on a livePercentage et usualPercentage de Google
    if (affluence?.livePercentage && affluence?.usualPercentage) {
      const diff = affluence.livePercentage - affluence.usualPercentage;
      if (diff > 15) {
        return { 
          text: `+${diff}% vs habituel`, 
          icon: TrendingUp, 
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200'
        };
      } else if (diff < -15) {
        return { 
          text: `${diff}% vs habituel`, 
          icon: TrendingDown, 
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200'
        };
      }
    }
    
    // Pas de données Google = pas de comparaison (pas d'estimation)
    return null;
  };

  const comparisonVsUsual = getComparisonVsUsual();

  // Status affluence
  const getStatus = () => {
    if (!isOpen) return { text: 'Fermé', color: 'text-slate-400', bg: 'bg-slate-100', icon: Moon };
    if (currentScore >= 80) return { text: 'Très fréquenté', color: 'text-red-600', bg: 'bg-red-100', icon: Flame };
    if (currentScore >= 60) return { text: 'Assez fréquenté', color: 'text-orange-600', bg: 'bg-orange-100', icon: TrendingUp };
    if (currentScore >= 40) return { text: 'Modéré', color: 'text-amber-600', bg: 'bg-amber-100', icon: BarChart3 };
    return { text: 'Calme', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: Coffee };
  };

  const getBarColor = (value, hour) => {
    const isCurrent = hour === currentHour && isOpen;
    if (isCurrent) return 'bg-[#cf292c]';
    if (value >= 80) return 'bg-red-400';
    if (value >= 60) return 'bg-orange-400';
    if (value >= 40) return 'bg-amber-400';
    return 'bg-emerald-400';
  };

  const status = getStatus();
  const terrasse = getDecisionTerrasse();
  const weatherImpact = getWeatherImpact();
  const WeatherIcon = weather ? getWeatherIcon(weather.condition) : Cloud;

  // ═══════════════════════════════════════════════════════════════
  // 🎨 RENDER
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="flex gap-4 mb-4">
          <div className="w-16 h-16 bg-gray-100 rounded-xl"></div>
          <div className="flex-1 space-y-2">
            <div className="h-8 bg-gray-100 rounded"></div>
            <div className="h-4 bg-gray-100 rounded w-2/3"></div>
          </div>
        </div>
        <div className="h-20 bg-gray-100 rounded"></div>
      </div>
    );
  }

  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      {/* ════════ HEADER ════════ */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <div className="p-1.5 bg-[#cf292c]/10 rounded-lg">
            <Utensils className="w-4 h-4 text-[#cf292c]" />
          </div>
          Conditions du jour
        </h3>
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          {isOpen && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-200">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-semibold text-emerald-700 uppercase">Live</span>
            </div>
          )}
          <button 
            onClick={fetchData}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ════════ MÉTÉO + TERRASSE (Ligne compacte) ════════ */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
          {/* Icône météo */}
          <div className={`p-2 rounded-lg ${
            weather?.condition === 'soleil' ? 'bg-amber-100' :
            weather?.condition?.includes('pluie') || weather?.condition === 'orage' ? 'bg-blue-100' :
            'bg-slate-100'
          }`}>
            <WeatherIcon className={`w-6 h-6 ${
              weather?.condition === 'soleil' ? 'text-amber-500' :
              weather?.condition?.includes('pluie') || weather?.condition === 'orage' ? 'text-blue-500' :
              'text-slate-500'
            }`} />
          </div>
          
          {/* Température */}
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">
              {weather ? Math.round(weather.temperature) : '--'}°
            </span>
            <span className="text-xs text-gray-400">
              {weather ? getConditionLabel(weather.condition) : ''}
            </span>
          </div>
          
          {/* Séparateur */}
          <div className="w-px h-8 bg-slate-200 mx-1"></div>
          
          {/* Décision terrasse */}
          {terrasse && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${terrasse.bg}`}>
              {terrasse.ok === true && <CheckCircle className={`w-3.5 h-3.5 ${terrasse.color}`} />}
              {terrasse.ok === false && <XCircle className={`w-3.5 h-3.5 ${terrasse.color}`} />}
              {terrasse.ok === null && <AlertTriangle className={`w-3.5 h-3.5 ${terrasse.color}`} />}
              <span className={`text-xs font-medium ${terrasse.color}`}>{terrasse.label}</span>
            </div>
          )}
          
          {/* Alerte pluie */}
          {weather?.rainForecast?.pluieDans !== null && weather?.rainForecast?.pluieDans <= 60 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-lg ml-auto">
              <Umbrella className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[10px] font-medium text-blue-700">
                Pluie {weather.rainForecast.pluieDans === 0 ? 'en cours' : `dans ${weather.rainForecast.pluieDans}min`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ════════ AFFLUENCE ACTUELLE ════════ */}
      <div className="px-4 pb-4 flex-1">
        {/* Status + Score */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${status.bg}`}>
              <StatusIcon className={`w-5 h-5 ${status.color}`} />
            </div>
            <div>
              <span className={`text-sm font-semibold ${status.color}`}>{status.text}</span>
              {weatherImpact && isOpen && (
                <div className={`flex items-center gap-1 text-xs mt-0.5 ${weatherImpact.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {weatherImpact.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {weatherImpact.percent} météo
                </div>
              )}
            </div>
          </div>
          
          {isOpen && (
            <div className="text-right">
              <span className="text-3xl font-bold text-gray-900">{currentScore}</span>
              <span className="text-lg text-gray-400">%</span>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">affluence</div>
            </div>
          )}
        </div>

        {/* ═══ COMPARAISON VS HABITUEL (données Google uniquement) ═══ */}
        {comparisonVsUsual && isOpen && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 border ${comparisonVsUsual.bg} ${comparisonVsUsual.border}`}>
            <comparisonVsUsual.icon className={`w-4 h-4 ${comparisonVsUsual.color}`} />
            <span className={`text-xs font-medium ${comparisonVsUsual.color}`}>
              {comparisonVsUsual.text}
            </span>
            <span className="text-[9px] text-gray-400 ml-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Google
            </span>
          </div>
        )}

        {/* Graphique barres */}
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-2 text-[10px] text-gray-500">
            <Clock className="w-3 h-3" />
            <span>Affluence typique par heure</span>
          </div>
          <div className="flex items-end gap-2 h-20 mb-2">
            {displayHours.map((hour) => {
              const value = typicalData[hour] || 0;
              const heightPx = Math.max(12, (value / 100) * 80); // 80px = h-20
              const isCurrent = hour === currentHour && isOpen;
              
              return (
                <div key={hour} className="flex-1 flex flex-col justify-end h-full">
                  <div 
                    className={`w-full rounded-t-md transition-all duration-300 ${getBarColor(value, hour)} ${
                      isCurrent ? 'ring-2 ring-[#cf292c]/40 ring-offset-1 shadow-md opacity-100' : 'opacity-60 hover:opacity-90'
                    }`}
                    style={{ height: `${heightPx}px` }}
                    title={`${hour}h: ${value}%`}
                  />
                </div>
              );
            })}
          </div>

          {/* Labels heures */}
          <div className="flex gap-1">
            {displayHours.map((hour) => (
              <div key={hour} className="flex-1 text-center">
                <span className={`text-[10px] font-medium ${
                  hour === currentHour && isOpen ? 'text-[#cf292c] font-semibold' : 'text-gray-400'
                }`}>
                  {hour}h
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════ FOOTER - Recommandation ════════ */}
      <div className={`px-4 py-3 border-t ${
        !isOpen
          ? 'bg-slate-50 border-slate-100'
          : currentScore >= 70 
            ? 'bg-amber-50 border-amber-100' 
            : currentScore >= 40 
              ? 'bg-[#cf292c]/5 border-[#cf292c]/20'
              : 'bg-emerald-50 border-emerald-100'
      }`}>
        <div className="flex items-center gap-3 text-sm">
          {!isOpen ? (
            <>
              <Moon className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">
                <strong>Restaurant fermé</strong> — Réouverture à 11h ou 18h
              </span>
            </>
          ) : currentScore >= 70 ? (
            <>
              <Flame className="w-4 h-4 text-amber-600" />
              <span className="text-amber-700">
                <strong>Rush en cours</strong> — Pic de commandes estimé
              </span>
            </>
          ) : currentScore >= 40 ? (
            <>
              <BarChart3 className="w-4 h-4 text-[#cf292c]" />
              <span className="text-[#cf292c]">
                <strong>Activité normale</strong> — Flux standard
              </span>
            </>
          ) : (
            <>
              <Coffee className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">
                <strong>Période calme</strong> — Idéal pour la mise en place
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConditionsDuJour;
