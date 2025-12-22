import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, CloudSun, CloudDrizzle,
  Thermometer, Droplets, Eye, Umbrella, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, ExternalLink
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * ☀️ Météo & Terrasse - Widget Compact
 * Focus sur LA décision : ouvrir la terrasse ou non ?
 */
const MeteoTerrasse = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/external/smart-analysis`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data.weather);
      }
    } catch (err) {
      console.error('Erreur météo:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000); // 30min
    return () => clearInterval(interval);
  }, [fetchWeather]);

  // Icône météo
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

  // Condition en français
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

  // Décision terrasse avec couleur
  const getDecisionTerrasse = () => {
    if (!weather?.terrasseConfort) {
      return { 
        decision: 'Données indisponibles', 
        color: 'gray',
        icon: AlertTriangle,
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        border: 'border-gray-200'
      };
    }
    
    const niveau = weather.terrasseConfort.niveau;
    const raison = weather.terrasseConfort.raison;
    
    if (niveau === 'bon') {
      return { 
        decision: 'Terrasse ouvrable', 
        detail: raison || 'Conditions idéales',
        color: 'green',
        icon: CheckCircle,
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200'
      };
    } else if (niveau === 'moyen') {
      return { 
        decision: 'Terrasse limite', 
        detail: raison || 'À surveiller',
        color: 'amber',
        icon: AlertTriangle,
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200'
      };
    } else {
      return { 
        decision: 'Terrasse déconseillée', 
        detail: raison || 'Conditions défavorables',
        color: 'red',
        icon: XCircle,
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200'
      };
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="flex gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
          <div className="flex-1 space-y-2">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="text-center text-gray-500 py-4">
          <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Météo indisponible</p>
        </div>
      </div>
    );
  }

  const WeatherIcon = getWeatherIcon(weather.condition);
  const decision = getDecisionTerrasse();
  const DecisionIcon = decision.icon;
  const temp = Math.round(weather.temperature);
  const feelsLike = Math.round(weather.feelsLike ?? weather.temperature);
  const humidity = weather.humidity;
  const rainForecast = weather.rainForecast;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          Météo & Terrasse
        </h3>
        <button 
          onClick={fetchWeather}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Contenu principal */}
      <div className="px-4 pb-3 flex-1">
        {/* Température + Condition */}
        <div className="flex items-center gap-4 mb-3">
          {/* Icône météo */}
          <div className={`p-3 rounded-xl ${
            weather.condition === 'soleil' ? 'bg-amber-100' :
            weather.condition === 'pluie' || weather.condition === 'orage' ? 'bg-blue-100' :
            'bg-slate-100'
          }`}>
            <WeatherIcon className={`w-8 h-8 ${
              weather.condition === 'soleil' ? 'text-amber-500' :
              weather.condition === 'pluie' || weather.condition === 'orage' ? 'text-blue-500' :
              'text-slate-500'
            }`} />
          </div>
          
          {/* Température */}
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">{temp}°</span>
              <span className="text-gray-400 text-sm">C</span>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Thermometer className="w-3 h-3" />
              Ressenti {feelsLike}°
            </div>
          </div>
          
          {/* Condition + Humidité */}
          <div className="ml-auto text-right">
            <p className="text-sm font-medium text-gray-700">
              {getConditionLabel(weather.condition)}
            </p>
            {humidity && (
              <p className="text-xs text-gray-400 flex items-center justify-end gap-1">
                <Droplets className="w-3 h-3" />
                {humidity}%
              </p>
            )}
          </div>
        </div>

        {/* Alerte pluie */}
        {rainForecast?.pluieDans !== null && rainForecast?.pluieDans <= 120 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100 mb-3 text-xs">
            <Umbrella className="w-4 h-4 text-blue-500" />
            <span className="text-blue-700">
              {rainForecast.pluieDans === 0 
                ? "Pluie actuellement"
                : `Pluie prévue dans ${rainForecast.pluieDans} min`}
            </span>
          </div>
        )}
      </div>

      {/* Décision Terrasse - Footer */}
      <div className={`px-4 py-3 ${decision.bg} border-t ${decision.border}`}>
        <div className="flex items-center gap-3">
          <DecisionIcon className={`w-5 h-5 ${decision.text}`} />
          <div className="flex-1">
            <p className={`font-semibold text-sm ${decision.text}`}>
              {decision.decision}
            </p>
            {decision.detail && (
              <p className="text-xs text-gray-500 mt-0.5">
                {decision.detail}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeteoTerrasse;
