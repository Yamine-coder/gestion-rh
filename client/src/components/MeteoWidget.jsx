import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, 
  Thermometer, TrendingUp, TrendingDown, Umbrella,
  Users, AlertTriangle, Droplets, Snowflake, BarChart3,
  Trophy, Calendar, Wallet, Clock, RefreshCw, Loader2,
  CalendarCheck, CalendarPlus, ThermometerSun, CloudSun,
  Zap, AlertCircle, CheckCircle2, Info, Gift, MapPin, CloudDrizzle
} from 'lucide-react';

// Noms des jours en français
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Mapping des icônes météo
const weatherIcons = {
  'soleil': Sun,
  'nuageux': Cloud,
  'pluie': CloudRain,
  'pluie_legere': CloudRain,
  'neige': CloudSnow,
  'orage': CloudLightning,
  'brouillard': Wind,
  'froid': Snowflake,
  'normal': CloudSun,
};

// Mapping des icônes pour les facteurs
const factorIcons = {
  'calendar': Calendar,
  'calendar-check': CalendarCheck,
  'calendar-plus': CalendarPlus,
  'wallet': Wallet,
  'cloud-rain': CloudRain,
  'snowflake': Snowflake,
  'thermometer': Thermometer,
  'thermometer-snowflake': Snowflake,
  'sun': Sun,
  'trophy': Trophy,
  'clock': Clock,
};

const MeteoWidget = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/api/external/smart-analysis`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des données');
      }
      
      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error('Erreur MeteoWidget:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Rafraîchir toutes les 30 minutes
    const interval = setInterval(fetchData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getWeatherIcon = (condition) => {
    const Icon = weatherIcons[condition] || CloudSun;
    return Icon;
  };

  const getFactorIcon = (iconName) => {
    return factorIcons[iconName] || Info;
  };

  // Gradient selon météo
  const getWeatherGradient = (condition) => {
    switch (condition) {
      case 'soleil': return 'from-amber-400 via-orange-400 to-yellow-500';
      case 'nuageux': return 'from-slate-400 via-gray-500 to-slate-600';
      case 'pluie':
      case 'pluie_legere': return 'from-blue-500 via-blue-600 to-indigo-600';
      case 'neige':
      case 'froid': return 'from-cyan-400 via-blue-400 to-indigo-500';
      case 'orage': return 'from-purple-600 via-indigo-700 to-slate-800';
      case 'brouillard': return 'from-gray-400 via-slate-400 to-gray-500';
      default: return 'from-blue-500 via-blue-600 to-indigo-600';
    }
  };

  // Obtenir la date formatée
  const getFormattedDate = () => {
    const now = new Date();
    return `${JOURS[now.getDay()]} ${now.getDate()} ${MOIS[now.getMonth()]}`;
  };

  const getAffluenceColor = (level) => {
    switch (level) {
      case 'très_élevée': return 'bg-red-500';
      case 'élevée': return 'bg-orange-500';
      case 'moyenne': return 'bg-yellow-500';
      case 'calme': return 'bg-blue-500';
      case 'très_calme': return 'bg-blue-300';
      default: return 'bg-gray-400';
    }
  };

  const getAffluenceLabel = (level) => {
    switch (level) {
      case 'très_élevée': return 'Très élevée';
      case 'élevée': return 'Élevée';
      case 'moyenne': return 'Moyenne';
      case 'calme': return 'Calme';
      case 'très_calme': return 'Très calme';
      default: return 'Normale';
    }
  };

  const getAlertBadge = (alertLevel) => {
    switch (alertLevel) {
      case 'alerte':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <Zap className="w-3 h-3" />
            Rush prévu
          </span>
        );
      case 'attention':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            <AlertCircle className="w-3 h-3" />
            Attention
          </span>
        );
      default:
        return null;
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'positif': return 'text-green-600 bg-green-50 border-green-200';
      case 'négatif': return 'text-red-600 bg-red-50 border-red-200';
      case 'attention': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getImpactIcon = (impact) => {
    switch (impact) {
      case 'positif': return TrendingUp;
      case 'négatif': return TrendingDown;
      case 'attention': return AlertTriangle;
      default: return Info;
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-500">Chargement analyse...</span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
          <button 
            onClick={fetchData}
            className="ml-auto text-red-700 hover:text-red-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const weather = data?.weather;
  const factors = data?.factors || [];
  const affluence = data?.affluence;
  const matches = data?.matches;
  const holidays = data?.holidays;
  
  // 🎯 Nouvelles données staffing
  const staffing = weather?.staffingRecommendation;
  const forecast3Days = weather?.forecast3Days || [];
  const rainForecast = weather?.rainForecast;

  const WeatherIcon = getWeatherIcon(weather?.condition);
  
  // Couleur selon impact staffing
  const getImpactBadgeColor = (percentage) => {
    if (percentage >= 15) return 'bg-green-100 text-green-700 border-green-200';
    if (percentage >= 5) return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (percentage > -10) return 'bg-gray-100 text-gray-600 border-gray-200';
    if (percentage > -25) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };
  
  const getAlertLevelStyle = (level) => {
    switch(level) {
      case 'alerte': return 'bg-red-50 border-red-200 text-red-700';
      case 'attention': return 'bg-orange-50 border-orange-200 text-orange-700';
      default: return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header météo compact */}
      <div className={`bg-gradient-to-br ${getWeatherGradient(weather?.condition)} text-white p-3 relative overflow-hidden`}>
        {/* Pattern décoratif */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/20" />
        </div>
        
        <div className="relative">
          <div className="flex items-center justify-between">
            {/* Météo principale */}
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                <WeatherIcon className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">{weather?.temperature || '--'}°</span>
                  <span className="text-white/60 text-sm">({weather?.feelsLike || '--'}° ressenti)</span>
                </div>
                <p className="text-white/80 text-xs capitalize">
                  {weather?.description || 'Chargement...'}
                </p>
              </div>
            </div>
            
            {/* Stats + refresh */}
            <div className="text-right">
              <button 
                onClick={fetchData}
                disabled={loading}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors mb-1"
                title="Rafraîchir"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div className="flex items-center gap-3 text-xs text-white/70">
                <span className="flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" />{weather?.tempMin || '--'}°
                </span>
                <span className="flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />{weather?.tempMax || '--'}°
                </span>
                <span className="flex items-center gap-0.5">
                  <Droplets className="w-3 h-3" />{weather?.humidity || '--'}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Date et ville sur une ligne */}
          <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-white/60 text-xs">
            <span className="font-medium">{getFormattedDate()}</span>
            {weather?.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {weather.city}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 🎯 SECTION IMPACT STAFFING - NOUVEAU */}
      {staffing && (
        <div className={`p-3 border-b-2 ${getAlertLevelStyle(staffing.alertLevel)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="font-semibold text-sm">Impact Staffing</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getImpactBadgeColor(staffing.impactPercentage)}`}>
              {staffing.impactLabel}
            </span>
          </div>
          
          {/* Recommandation principale */}
          <p className="text-sm font-medium mb-2">{staffing.recommendation}</p>
          
          {/* Raisons */}
          {staffing.reasons?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {staffing.reasons.map((reason, i) => (
                <span key={i} className="text-xs bg-white/60 px-2 py-0.5 rounded">
                  {reason}
                </span>
              ))}
            </div>
          )}
          
          {/* Recommandations détaillées */}
          {staffing.detailedRecommendations?.length > 0 && (
            <div className="mt-2 pt-2 border-t border-current/20">
              <p className="text-xs font-medium mb-1">💡 Actions suggérées :</p>
              <ul className="text-xs space-y-0.5">
                {staffing.detailedRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-current rounded-full" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Alerte demain */}
          {staffing.tomorrowAlert && (
            <div className="mt-2 pt-2 border-t border-current/20 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-medium">{staffing.tomorrowAlert.message}</p>
                <p className="opacity-80">{staffing.tomorrowAlert.recommendation}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prévision pluie */}
      {rainForecast && rainForecast.pluieDans !== null && (
        <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2 text-xs text-blue-700">
          <Umbrella className="w-3.5 h-3.5" />
          <span className="font-medium">{rainForecast.message}</span>
        </div>
      )}

      {/* Terrasse */}
      {weather?.terrasseConfort && (
        <div className={`px-3 py-2 border-b border-gray-100 flex items-center justify-between text-xs ${
          weather.terrasseConfort.niveau === 'bon' ? 'bg-green-50 text-green-700' :
          weather.terrasseConfort.niveau === 'moyen' ? 'bg-yellow-50 text-yellow-700' :
          'bg-red-50 text-red-700'
        }`}>
          <span className="flex items-center gap-1.5">
            <ThermometerSun className="w-3.5 h-3.5" />
            <span className="font-medium">{weather.terrasseConfort.message}</span>
          </span>
          <span className="font-bold">{weather.terrasseConfort.score}%</span>
        </div>
      )}

      {/* 🎯 PRÉVISIONS 3 JOURS - NOUVEAU */}
      {forecast3Days.length > 0 && (
        <div className="p-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Prévisions planification</p>
          <div className="grid grid-cols-2 gap-2">
            {forecast3Days.map((day, i) => {
              const DayIcon = getWeatherIcon(day.condition);
              return (
                <div key={i} className="bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DayIcon className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs font-medium text-gray-700">{day.jour}</p>
                      <p className="text-[10px] text-gray-500">{day.tempMin}° / {day.tempMax}°</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    day.impact.color === 'green' ? 'bg-green-100 text-green-700' :
                    day.impact.color === 'red' ? 'bg-red-100 text-red-700' :
                    day.impact.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {day.impact.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Facteurs d'influence - compact */}
      {factors.length > 0 && (
        <div className="p-3 border-b border-gray-100">
          <div className="space-y-1.5">
            {factors.slice(0, 3).map((factor, index) => {
              const FactorIcon = getFactorIcon(factor.icon);
              
              return (
                <div 
                  key={index}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-sm ${getImpactColor(factor.impact)}`}
                >
                  <FactorIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium truncate">{factor.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Matchs à venir (si présents) */}
      {matches?.today?.length > 0 && (
        <div className="p-3 border-t border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Match{matches.today.length > 1 ? 's' : ''} ce soir - Rush prévu !
            </span>
          </div>
          {matches.today.slice(0, 2).map((match, index) => (
            <div key={index} className="flex items-center justify-between py-1 text-sm">
              <span className="font-medium text-gray-700">
                {match.homeTeam} <span className="text-gray-400">vs</span> {match.awayTeam}
              </span>
              {match.details?.time && (
                <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                  {match.details.time}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Prochain férié */}
      {holidays?.upcoming?.length > 0 && !holidays.isHolidayToday && (
        <div className="px-3 py-2 border-t border-gray-100 bg-purple-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-purple-700">
            <Gift className="w-3.5 h-3.5" />
            <span className="font-medium">{holidays.upcoming[0].nom}</span>
          </div>
          <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
            J-{holidays.upcoming[0].daysUntil}
          </span>
        </div>
      )}

      {/* Jour férié aujourd'hui */}
      {holidays?.isHolidayToday && (
        <div className="px-3 py-2 border-t border-gray-100 bg-amber-50 flex items-center gap-2 text-xs text-amber-700">
          <span>🎉</span>
          <span className="font-semibold">Aujourd'hui : {holidays.todayHoliday}</span>
        </div>
      )}

      {/* Footer compact */}
      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
        {weather?.source === 'open-meteo' ? (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
            Live (Open-Meteo)
          </span>
        ) : weather?.source === 'openweathermap' ? (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
            Live
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5 text-orange-500" />
            Démo
          </span>
        )}
        {lastRefresh && (
          <span>{lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>
    </div>
  );
};

export default MeteoWidget;
