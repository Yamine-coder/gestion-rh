import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, 
  Trophy, RefreshCw, CloudSun, Calendar, Tv, Flame, Circle,
  Droplets, GraduationCap, Users, TrendingUp, TrendingDown, Minus, Umbrella, ThermometerSun,
  Activity
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const IntelligenceHero = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [affluence, setAffluence] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [analysisRes, matchesRes, affluenceRes] = await Promise.all([
        fetch(`${API_BASE}/api/external/smart-analysis`),
        fetch(`${API_BASE}/api/external/matches`),
        fetch(`${API_BASE}/api/external/affluence`)
      ]);
      if (analysisRes.ok) setData(await analysisRes.json());
      if (matchesRes.ok) {
        const m = await matchesRes.json();
        setUpcomingMatches(m.matches || []);
      }
      if (affluenceRes.ok) setAffluence(await affluenceRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getWeatherIcon = (condition) => {
    const icons = { 'soleil': Sun, 'nuageux': Cloud, 'pluie': CloudRain, 'pluie_legere': CloudRain, 'neige': CloudSnow, 'orage': CloudLightning, 'brouillard': Wind };
    return icons[condition] || CloudSun;
  };

  const getDaysUntil = (dateStr) => {
    const target = new Date(dateStr);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  };

  const getDeliveryImpact = (match) => {
    if (!match || match.impact === 'très_faible') return { livraison: 0, level: 'none' };
    const days = getDaysUntil(match.date);
    let base = match.importance === 5 ? 45 : match.importance === 4 ? 32 : match.importance === 3 ? 20 : 10;
    const mult = days === 0 ? 1 : days === 1 ? 0.9 : days <= 3 ? 0.7 : days <= 7 ? 0.5 : 0.3;
    const livraison = Math.round(base * mult);
    return { livraison, level: livraison >= 35 ? 'critical' : livraison >= 20 ? 'high' : 'medium' };
  };

  const getVacancesInfo = () => {
    const now = new Date();
    const vacances = [
      { nom: 'Noël', debut: new Date('2025-12-21'), fin: new Date('2026-01-05') },
      { nom: 'Hiver', debut: new Date('2026-02-14'), fin: new Date('2026-03-02') },
    ];
    for (const v of vacances) {
      if (now >= v.debut && now <= v.fin) return { enCours: true, nom: v.nom, jours: getDaysUntil(v.fin) };
      const j = getDaysUntil(v.debut);
      if (j > 0 && j <= 14) return { enCours: false, nom: v.nom, jours: j };
    }
    return null;
  };

  // Calcul de l'impact météo sur les décisions
  const getWeatherDecision = (weather) => {
    if (!weather) return { livraison: 0, affluence: 0, action: null };
    
    const temp = weather.feelsLike ?? weather.temperature ?? 15;
    const condition = weather.condition;
    const terrasseOk = weather.terrasseConfort?.niveau === 'bon';
    const terrasseMoyen = weather.terrasseConfort?.niveau === 'moyen';
    const pluiePrevue = weather.rainForecast?.pluieDans !== null && weather.rainForecast?.pluieDans <= 60;
    
    // Impact livraison (météo mauvaise = plus de livraisons)
    let livraison = 0;
    if (condition === 'pluie' || condition === 'pluie_legere') livraison = 20;
    else if (condition === 'orage' || condition === 'neige') livraison = 30;
    else if (temp < 5) livraison = 15;
    else if (condition === 'soleil' && temp >= 20 && temp <= 28) livraison = -10;
    
    // Impact affluence salle (-20% à +20%)
    let affluence = 0;
    if (condition === 'soleil' && temp >= 15 && temp <= 28) affluence = 15;
    else if (condition === 'soleil' && temp > 28) affluence = -5; // trop chaud
    else if (condition === 'nuageux' && temp >= 12) affluence = 5;
    else if (condition === 'pluie' || condition === 'pluie_legere') affluence = -15;
    else if (condition === 'orage' || condition === 'neige') affluence = -20;
    else if (temp < 5) affluence = -10;
    
    // Action prioritaire
    let action = null;
    if (pluiePrevue && (terrasseOk || terrasseMoyen)) action = { type: 'warning', text: 'Rentrer mobilier', icon: Umbrella };
    else if (terrasseOk && temp >= 20) action = { type: 'success', text: 'Ouvrir terrasse', icon: Sun };
    else if (temp > 30) action = { type: 'warning', text: 'Boissons fraîches', icon: ThermometerSun };
    else if (livraison >= 20) action = { type: 'info', text: 'Renforcer livraison', icon: TrendingUp };
    
    return { livraison, affluence, action };
  };

  if (loading && !data) {
    return (
      <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm p-4">
        <div className="flex items-center gap-4 animate-pulse">
          <div className="w-16 h-8 bg-slate-100 rounded-xl"></div>
          <div className="w-20 h-8 bg-slate-100 rounded-lg"></div>
          <div className="w-16 h-8 bg-slate-100 rounded-lg"></div>
          <div className="w-16 h-8 bg-slate-100 rounded-lg"></div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="w-32 h-8 bg-slate-100 rounded-lg"></div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="flex-1 h-8 bg-slate-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const weather = data?.weather;
  const holidays = data?.holidays;
  const WeatherIcon = getWeatherIcon(weather?.condition);
  const nextHoliday = holidays?.upcoming?.[0];
  const vacances = getVacancesInfo();
  const feelsLike = weather?.feelsLike ?? weather?.temperature;
  const terrasseConfort = weather?.terrasseConfort;
  const rainForecast = weather?.rainForecast;
  
  // 🎯 Utiliser les données staffing du backend si disponibles
  const staffing = weather?.staffingRecommendation;
  const weatherDecision = staffing ? {
    // Utiliser les données du backend Open-Meteo
    livraison: 0, // Pas de livraison calculée côté backend pour l'instant
    affluence: staffing.impactPercentage || 0,
    action: staffing.detailedRecommendations?.[0] ? {
      type: staffing.alertLevel === 'alerte' ? 'warning' : staffing.alertLevel === 'attention' ? 'warning' : 'info',
      text: staffing.detailedRecommendations[0],
      icon: staffing.alertLevel === 'alerte' ? Umbrella : staffing.alertLevel === 'attention' ? ThermometerSun : TrendingUp
    } : null
  } : getWeatherDecision(weather);
  
  // 🎯 Filtrage matchs : SEULEMENT les vrais événements impactants pour Vincennes
  // - PSG (Ligue 1 ou Champions League) = TOUJOURS
  // - Équipe de France = TOUJOURS  
  // - CAN équipes suivies = OUI
  // - Autres Ligue 1 (Lyon, Marseille, etc.) = NON (on s'en fiche)
  const matchesFiltered = upcomingMatches
    .filter(m => {
      // PSG = toujours (importance 5)
      if (m.importance === 5) return true;
      // Champions League gros matchs (hors L1)
      if (m.competitionCode === 'CL' && m.importance >= 4) return true;
      // CAN
      if (m.competitionCode === 'CAN' || m.competitionCode === 'AFCON') return true;
      // Coupe du Monde / Euro
      if (m.competitionCode === 'WC' || m.competitionCode === 'EC') return true;
      // Ligue 1 sans PSG = on n'affiche pas
      return false;
    })
    .filter(m => getDaysUntil(m.date) >= 0 && getDaysUntil(m.date) <= 35)  // Dans les 35 jours (CL incluse)
    .map(m => ({ ...m, days: getDaysUntil(m.date) }))
    .sort((a, b) => {
      // Trier par date croissante d'abord, puis par importance
      if (a.days !== b.days) return a.days - b.days;
      return b.importance - a.importance;
    });
  
  // 🎯 Trouver les matchs du jour le plus proche (peut y en avoir plusieurs!)
  const topMatch = matchesFiltered[0];
  const sameDayMatches = topMatch 
    ? matchesFiltered.filter(m => m.days === topMatch.days).slice(0, 3) // Max 3 matchs affichés
    : [];
  
  // 📈 Calculer l'impact business CONCRET (sur place, emporter, livraison)
  // Basé sur un restaurant type : salle + emporter + Uber/Deliveroo
  // Chiffres réalistes basés sur observations terrain
  const getMatchesBusinessImpact = () => {
    if (sameDayMatches.length === 0) return null;
    
    const days = topMatch.days;
    const nbMatchs = sameDayMatches.length;
    const isTopMatch = topMatch.importance === 5;
    
    // Impact réaliste selon type de match et proximité
    // Match importance 5 = PSG, Algérie, Maroc, Sénégal (gros impact local)
    let livraisonBase = isTopMatch ? 18 : 10;  // +18% max pour gros match
    let salleBase = isTopMatch ? -10 : -5;      // Salle baisse un peu
    let emporterBase = isTopMatch ? 12 : 8;     // Emporter augmente
    
    // Multiplicateur si plusieurs matchs le même soir (max +30%)
    const matchMult = nbMatchs >= 2 ? 1.3 : 1;
    
    // Multiplicateur proximité (effet surtout le jour J et J-1)
    const proxMult = days === 0 ? 1 : days === 1 ? 0.7 : days <= 3 ? 0.3 : 0.1;
    
    // Calculs finaux
    const livraison = Math.round(livraisonBase * matchMult * proxMult);
    const salle = Math.round(salleBase * proxMult);
    const emporter = Math.round(emporterBase * matchMult * proxMult);
    
    // Estimation commandes supplémentaires (base ~60 livraisons/soir normal)
    const commandesSupp = Math.round((livraison / 100) * 60);
    
    return {
      livraison,      // % augmentation Uber/Deliveroo
      salle,          // % variation salle (souvent négatif)
      emporter,       // % augmentation emporter
      commandesSupp,  // Nb commandes livraison en plus
      level: livraison >= 20 ? 'critical' : livraison >= 12 ? 'high' : 'medium'
    };
  };
  
  const businessImpact = getMatchesBusinessImpact();
  const ActionIcon = weatherDecision.action?.icon;
  
  // 🎯 Prévisions des prochains jours
  const forecast3Days = weather?.forecast3Days || [];
  
  // 📊 Affluence Google (depuis Gist GitHub Actions)
  const getAffluenceDisplay = () => {
    if (!affluence || affluence.error) return null;
    
    const score = affluence.score;
    const trend = affluence.trend;
    const source = affluence.source;
    
    // Couleurs selon niveau
    let bgClass = 'bg-gray-100';
    let textClass = 'text-gray-600';
    let dotColor = 'bg-gray-400';
    
    if (score >= 70) {
      bgClass = 'bg-red-100';
      textClass = 'text-red-700';
      dotColor = 'bg-red-500';
    } else if (score >= 50) {
      bgClass = 'bg-amber-100';
      textClass = 'text-amber-700';
      dotColor = 'bg-amber-500';
    } else if (score >= 30) {
      bgClass = 'bg-green-100';
      textClass = 'text-green-700';
      dotColor = 'bg-green-500';
    } else if (score !== null) {
      bgClass = 'bg-emerald-50';
      textClass = 'text-emerald-600';
      dotColor = 'bg-emerald-400';
    }
    
    return {
      score,
      trend,
      source,
      bgClass,
      textClass,
      dotColor,
      label: score >= 70 ? 'Très chargé' : score >= 50 ? 'Modéré' : score >= 30 ? 'Calme' : 'Très calme',
      dataAge: affluence.dataAge || null
    };
  };
  
  const affluenceDisplay = getAffluenceDisplay();

  return (
    <div className="bg-white border border-slate-200/70 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 h-full overflow-hidden">
      {/* Ligne principale - Météo & Stats */}
      <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-sm p-3 lg:p-4">
      
      {/* Indicateur LIVE */}
      {weather && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-xl border border-emerald-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Live</span>
        </div>
      )}

      {/* Météo + Décisions */}
      <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
        {/* Conditions */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <WeatherIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900">{weather?.temperature ?? '--'}°</span>
            <span className="text-gray-400 text-[10px]">({feelsLike}°)</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5">Ressenti</span>
        </div>

        {/* Terrasse */}
        <div className="flex flex-col items-center">
          <span 
            className={`text-[10px] lg:text-xs px-1.5 lg:px-2 py-0.5 lg:py-1 rounded whitespace-nowrap ${
              terrasseConfort?.niveau === 'bon' ? 'bg-green-50 text-green-600' :
              terrasseConfort?.niveau === 'moyen' ? 'bg-amber-50 text-amber-600' :
              'bg-red-50 text-red-600'
            }`}
          >
            {terrasseConfort?.niveau === 'bon' ? '✓' : terrasseConfort?.niveau === 'moyen' ? '~' : '✗'} 
            <span className="hidden sm:inline ml-0.5">{terrasseConfort?.niveau === 'bon' ? 'Terrasse' : terrasseConfort?.niveau === 'moyen' ? 'Limite' : 'Fermée'}</span>
          </span>
          <span className="text-[10px] text-gray-400 mt-0.5">Extérieur</span>
        </div>

        {/* Impact affluence */}
        <div className="flex flex-col items-center">
          <div className={`flex items-center gap-0.5 text-[10px] lg:text-xs font-bold px-1.5 lg:px-2 py-1 rounded-lg border ${
            weatherDecision.affluence >= 15 ? 'bg-green-100 text-green-700 border-green-200' :
            weatherDecision.affluence >= 5 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
            weatherDecision.affluence > -10 ? 'bg-gray-100 text-gray-600 border-gray-200' :
            weatherDecision.affluence > -20 ? 'bg-orange-100 text-orange-700 border-orange-200' :
            'bg-red-100 text-red-700 border-red-200'
          }`}>
            {weatherDecision.affluence > 0 ? <TrendingUp className="w-3 h-3" /> :
             weatherDecision.affluence < 0 ? <TrendingDown className="w-3 h-3" /> :
             <Minus className="w-3 h-3" />}
            {weatherDecision.affluence > 0 ? '+' : ''}{weatherDecision.affluence}%
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5">Affluence</span>
        </div>
      </div>

      {/* Recommandation Staffing */}
      {staffing && (
        <>
          <div className="hidden lg:block w-px h-8 bg-slate-200/70" />
          <div className="flex flex-col">
            <span className={`text-[10px] lg:text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
              staffing.alertLevel === 'alerte' ? 'bg-red-100 text-red-700' :
              staffing.alertLevel === 'attention' ? 'bg-amber-100 text-amber-700' :
              weatherDecision.affluence >= 10 ? 'bg-green-100 text-green-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {staffing.recommendation}
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">Recommandation</span>
          </div>
        </>
      )}

      <div className="hidden lg:block w-px h-8 bg-slate-200/70" />

      {/* Événements */}
      <div className="flex flex-col flex-shrink-0">
        <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
          {nextHoliday && nextHoliday.daysUntil <= 14 && (
            <div className="flex items-center gap-1 text-gray-600 whitespace-nowrap text-xs">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="hidden sm:inline">{nextHoliday.nom}</span>
              <span className="text-[10px] font-medium text-primary-600">J-{nextHoliday.daysUntil}</span>
            </div>
          )}
          {vacances && (
            <div className="flex items-center gap-1 text-gray-600 whitespace-nowrap text-xs">
              <GraduationCap className="w-3 h-3 text-gray-400" />
              <span className="hidden sm:inline">Vac. {vacances.nom}</span>
              <span className="text-[10px] font-medium text-amber-600">
                {vacances.enCours ? `${vacances.jours}j` : `${vacances.jours}j`}
              </span>
            </div>
          )}
        </div>
        <span className="text-[10px] text-gray-400 mt-0.5">Anticiper le planning</span>
      </div>

      <div className="hidden lg:block w-px h-8 bg-slate-200/70" />

      {/* Matchs importants - Compacté */}
      <div className="flex flex-col flex-shrink-0 min-w-0">
        {sameDayMatches.length > 0 ? (
          <>
            <div className="flex items-center gap-2">
              {/* Icône */}
              <div className="relative flex-shrink-0">
                <Tv className={`w-3.5 h-3.5 ${topMatch.importance === 5 ? 'text-amber-500' : 'text-gray-400'}`} />
              </div>
              
              {/* Match principal seulement */}
              <div className="flex items-center gap-1 text-xs min-w-0">
                <span className="text-gray-700 font-medium truncate">
                  {sameDayMatches[0].homeTeam.split(' ')[0].replace('Paris', 'PSG')}
                </span>
                <span className="text-gray-400 text-[10px]">vs</span>
                <span className="text-gray-700 font-medium truncate">
                  {sameDayMatches[0].awayTeam.split(' ')[0].replace('RD', 'RDC')}
                </span>
              </div>
              
              {/* Badge J-X */}
              <div className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${
                topMatch.days === 0 ? 'bg-red-100 text-red-700' :
                topMatch.days === 1 ? 'bg-orange-100 text-orange-700' :
                topMatch.importance === 5 ? 'bg-amber-100 text-amber-700' : 
                'bg-gray-100 text-gray-600'
              }`}>
                {topMatch.days === 0 ? 'CE SOIR' : `J-${topMatch.days}`}
              </div>
            </div>
            
            {/* Impact Uber */}
            {businessImpact && businessImpact.commandesSupp > 0 && (
              <span className="text-[10px] text-green-600 mt-0.5">
                🛵 Uber/Deliveroo : +{businessImpact.commandesSupp} cmd estimées
              </span>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <Tv className="w-3.5 h-3.5" />
            <span>Aucun match</span>
          </div>
        )}
      </div>

      {/* Refresh */}
      <button 
        onClick={fetchData} 
        className="p-1.5 lg:p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 ml-auto"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
      </div>
      
      {/* 🎯 Ligne secondaire : Prévisions + Alertes */}
      {(forecast3Days.length > 0 || staffing?.tomorrowAlert || staffing?.detailedRecommendations?.length > 0) && (
        <div className="px-3 lg:px-4 py-2 bg-slate-50/50 border-t border-slate-100 flex flex-wrap items-center gap-2 lg:gap-4 text-xs overflow-hidden">
          
          {/* Prévisions 2-3 jours */}
          {forecast3Days.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-400 font-medium text-[10px]">Prévisions:</span>
              {forecast3Days.slice(0, 2).map((day, i) => {
                const DayIcon = getWeatherIcon(day.condition);
                return (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-gray-500 text-[10px]">{day.jour}</span>
                    <DayIcon className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600 text-[10px]">{day.tempMax}°</span>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Alerte demain */}
          {staffing?.tomorrowAlert && (
            <>
              <div className="hidden sm:block w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                <span className="font-medium">⚠️ {staffing.tomorrowAlert.message}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default IntelligenceHero;
