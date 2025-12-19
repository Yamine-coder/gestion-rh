/**
 * Service pour les APIs externes (Météo, Football, Événements)
 * Avec cache intelligent pour respecter les limites gratuites
 * 
 * 🌤️ MÉTÉO: Open-Meteo (100% gratuit, sans clé API, prévisions 7 jours)
 */

const axios = require('axios');

// Cache en mémoire avec TTL
const cache = {
  weather: { data: null, lastFetch: null, ttl: 15 * 60 * 1000 }, // 15 min (Open-Meteo est gratuit)
  matches: { data: null, lastFetch: null, ttl: 60 * 60 * 1000 }, // 1 heure
  events: { data: null, lastFetch: null, ttl: 60 * 60 * 1000 }, // 1 heure
};

// Coordonnées des villes (pour Open-Meteo qui nécessite lat/lon)
const CITY_COORDS = {
  'Paris': { lat: 48.8566, lon: 2.3522 },
  'Lyon': { lat: 45.7640, lon: 4.8357 },
  'Marseille': { lat: 43.2965, lon: 5.3698 },
  'Bordeaux': { lat: 44.8378, lon: -0.5792 },
  'Lille': { lat: 50.6292, lon: 3.0573 },
  'Toulouse': { lat: 43.6047, lon: 1.4442 },
  'Nice': { lat: 43.7102, lon: 7.2620 },
  'Nantes': { lat: 47.2184, lon: -1.5536 },
  'Strasbourg': { lat: 48.5734, lon: 7.7521 },
  'Montpellier': { lat: 43.6108, lon: 3.8767 },
};

// ============================================
// MÉTÉO - Open-Meteo API (100% gratuit, sans clé)
// https://open-meteo.com/
// ============================================
async function getWeather() {
  const city = process.env.RESTAURANT_CITY || 'Paris';
  const coords = CITY_COORDS[city] || CITY_COORDS['Paris'];

  // Vérifier le cache
  if (cache.weather.data && cache.weather.lastFetch) {
    const age = Date.now() - cache.weather.lastFetch;
    if (age < cache.weather.ttl) {
      console.log('☁️ [WEATHER] Retour cache météo');
      return cache.weather.data;
    }
  }

  try {
    // Open-Meteo API - 100% gratuit, pas de clé requise
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Europe/Paris&forecast_days=3`,
      { timeout: 8000 }
    );

    const data = response.data;
    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;
    
    const temp = Math.round(current.temperature_2m);
    const feelsLike = Math.round(current.apparent_temperature);
    const windKmh = Math.round(current.wind_speed_10m);
    const weatherCode = current.weather_code;
    
    // Mapper le code météo Open-Meteo
    const condition = mapOpenMeteoCondition(weatherCode);
    const description = getWeatherDescription(weatherCode);
    
    // Évaluer le confort terrasse
    const terrasseConfort = evaluateTerrasseConfort(temp, feelsLike, windKmh, weatherCode);
    
    // 🎯 CALCUL IMPACT MÉTIER RESTAURANT
    const staffingRecommendation = calculateStaffingImpact(temp, feelsLike, weatherCode, windKmh, daily);
    
    // Prévisions des prochaines heures (pour pluie)
    const rainForecast = analyzeRainForecast(hourly);
    
    // Prévisions 3 jours pour planification
    const forecast3Days = buildForecast3Days(daily);
    
    const weather = {
      temperature: temp,
      feelsLike: feelsLike,
      tempMin: Math.round(daily.temperature_2m_min[0]),
      tempMax: Math.round(daily.temperature_2m_max[0]),
      humidity: current.relative_humidity_2m,
      wind: {
        speed: windKmh,
        direction: getWindDirection(current.wind_direction_10m)
      },
      precipitation: current.precipitation || 0,
      description: description,
      condition: condition,
      weatherCode: weatherCode,
      city: city,
      terrasseConfort: terrasseConfort,
      rainForecast: rainForecast,
      forecast3Days: forecast3Days,
      // 🎯 RECOMMANDATIONS MÉTIER
      staffingRecommendation: staffingRecommendation,
      timestamp: new Date().toISOString(),
      source: 'open-meteo',
      coords: coords
    };

    // Mettre en cache
    cache.weather.data = weather;
    cache.weather.lastFetch = Date.now();
    
    console.log(`☀️ [WEATHER] Open-Meteo: ${temp}°C (ressenti ${feelsLike}°C), ${description}`);
    console.log(`📊 [WEATHER] Impact staffing: ${staffingRecommendation.impactPercentage}% - ${staffingRecommendation.recommendation}`);
    
    return weather;

  } catch (error) {
    console.error('❌ [WEATHER] Erreur API Open-Meteo:', error.message);
    return cache.weather.data || getFallbackWeather();
  }
}

// 🎯 CALCUL IMPACT MÉTIER - Recommandations staffing basées sur la météo
function calculateStaffingImpact(temp, feelsLike, weatherCode, windKmh, daily) {
  let impactPercentage = 0;
  let reasons = [];
  let recommendations = [];
  let alertLevel = 'normal'; // normal, attention, alerte
  
  // === TEMPÉRATURE ===
  if (feelsLike >= 20 && feelsLike <= 26) {
    // Température idéale terrasse
    impactPercentage += 20;
    reasons.push('🌡️ Température idéale terrasse');
    recommendations.push('+1 serveur terrasse');
  } else if (feelsLike > 26 && feelsLike <= 32) {
    impactPercentage += 10;
    reasons.push('☀️ Beau temps chaud');
  } else if (feelsLike > 32) {
    impactPercentage -= 15;
    reasons.push('🥵 Canicule - clients évitent sorties');
    recommendations.push('Prévoir pauses hydratation équipe');
    alertLevel = 'attention';
  } else if (feelsLike < 5) {
    impactPercentage -= 20;
    reasons.push('🥶 Grand froid');
    recommendations.push('Équipe réduite possible');
    alertLevel = 'attention';
  } else if (feelsLike < 12) {
    impactPercentage -= 10;
    reasons.push('❄️ Temps frais');
  }
  
  // === PRÉCIPITATIONS ===
  // Codes Open-Meteo: 51-67 = bruine/pluie, 71-77 = neige, 80-82 = averses, 95-99 = orages
  if (weatherCode >= 61 && weatherCode <= 67) {
    // Pluie modérée à forte
    impactPercentage -= 25;
    reasons.push('🌧️ Pluie - terrasse fermée');
    recommendations.push('-1 à -2 serveurs');
    alertLevel = 'attention';
  } else if (weatherCode >= 51 && weatherCode <= 55) {
    // Bruine légère
    impactPercentage -= 10;
    reasons.push('🌦️ Bruine légère');
  } else if (weatherCode >= 71 && weatherCode <= 77) {
    // Neige
    impactPercentage -= 35;
    reasons.push('❄️ Neige - déplacements difficiles');
    recommendations.push('Anticiper absences/retards');
    recommendations.push('Équipe minimale');
    alertLevel = 'alerte';
  } else if (weatherCode >= 95 && weatherCode <= 99) {
    // Orages
    impactPercentage -= 30;
    reasons.push('⛈️ Orages');
    recommendations.push('Terrasse impossible');
    alertLevel = 'alerte';
  } else if (weatherCode >= 80 && weatherCode <= 82) {
    // Averses
    impactPercentage -= 15;
    reasons.push('🌧️ Averses');
  } else if (weatherCode === 0 || weatherCode === 1) {
    // Ciel dégagé
    impactPercentage += 15;
    reasons.push('☀️ Beau temps');
  }
  
  // === VENT ===
  if (windKmh > 40) {
    impactPercentage -= 20;
    reasons.push('💨 Vent très fort');
    recommendations.push('Terrasse dangereuse');
    alertLevel = 'alerte';
  } else if (windKmh > 25) {
    impactPercentage -= 10;
    reasons.push('💨 Vent fort');
  }
  
  // === JOUR DE LA SEMAINE ===
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 5 || dayOfWeek === 6) {
    // Vendredi/Samedi
    impactPercentage += 15;
    reasons.push('📅 Week-end');
  } else if (dayOfWeek === 0) {
    // Dimanche - peut varier selon le restaurant
    impactPercentage += 5;
    reasons.push('📅 Dimanche');
  }
  
  // === PRÉVISION DEMAIN (alerte planification) ===
  let tomorrowAlert = null;
  if (daily && daily.weather_code && daily.weather_code[1]) {
    const tomorrowCode = daily.weather_code[1];
    const tomorrowPrecipProb = daily.precipitation_probability_max?.[1] || 0;
    
    if (tomorrowCode >= 61 || tomorrowPrecipProb > 70) {
      tomorrowAlert = {
        type: 'pluie',
        message: `Demain: pluie probable (${tomorrowPrecipProb}%)`,
        recommendation: 'Prévoir équipe réduite demain'
      };
    } else if (tomorrowCode >= 71 && tomorrowCode <= 77) {
      tomorrowAlert = {
        type: 'neige',
        message: 'Demain: neige attendue',
        recommendation: 'Anticiper absences demain'
      };
    } else if (daily.temperature_2m_max[1] > 32) {
      tomorrowAlert = {
        type: 'canicule',
        message: `Demain: canicule (${Math.round(daily.temperature_2m_max[1])}°C)`,
        recommendation: 'Prévoir pauses renforcées'
      };
    }
  }
  
  // Limiter l'impact entre -40% et +35%
  impactPercentage = Math.max(-40, Math.min(35, impactPercentage));
  
  // Générer la recommandation principale
  let recommendation;
  if (impactPercentage >= 20) {
    recommendation = 'Rush probable - renforcer équipe';
  } else if (impactPercentage >= 10) {
    recommendation = 'Affluence normale à bonne';
  } else if (impactPercentage > -10) {
    recommendation = 'Journée standard';
  } else if (impactPercentage > -25) {
    recommendation = 'Affluence réduite probable';
  } else {
    recommendation = 'Journée calme - équipe minimale';
  }
  
  return {
    impactPercentage: impactPercentage,
    impactLabel: impactPercentage > 0 ? `+${impactPercentage}%` : `${impactPercentage}%`,
    recommendation: recommendation,
    reasons: reasons,
    detailedRecommendations: recommendations,
    alertLevel: alertLevel,
    tomorrowAlert: tomorrowAlert
  };
}

// Analyser les prévisions de pluie des prochaines heures
function analyzeRainForecast(hourly) {
  if (!hourly || !hourly.precipitation_probability) return null;
  
  const now = new Date();
  const currentHour = now.getHours();
  
  // Analyser les 6 prochaines heures
  let pluieDans = null;
  let maxProb = 0;
  
  for (let i = 0; i < Math.min(6, hourly.precipitation_probability.length); i++) {
    const prob = hourly.precipitation_probability[i];
    if (prob > maxProb) maxProb = prob;
    
    if (prob > 50 && pluieDans === null) {
      pluieDans = i; // heures avant la pluie
    }
  }
  
  return {
    pluieDans: pluieDans !== null ? pluieDans * 60 : null, // en minutes
    probabiliteMax: maxProb,
    message: pluieDans !== null 
      ? pluieDans === 0 
        ? `Pluie probable maintenant (${maxProb}%)`
        : `Pluie dans ~${pluieDans}h (${maxProb}%)`
      : maxProb > 30 
        ? `Risque pluie ${maxProb}%`
        : 'Pas de pluie prévue (6h)'
  };
}

// Construire les prévisions sur 3 jours
function buildForecast3Days(daily) {
  if (!daily) return [];
  
  const jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const forecasts = [];
  
  for (let i = 1; i <= 2; i++) { // Demain et après-demain
    if (daily.weather_code[i] !== undefined) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const code = daily.weather_code[i];
      const impact = calculateSimpleImpact(code, daily.temperature_2m_max[i]);
      
      forecasts.push({
        jour: jours[date.getDay()],
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        tempMax: Math.round(daily.temperature_2m_max[i]),
        condition: mapOpenMeteoCondition(code),
        description: getWeatherDescription(code),
        precipProb: daily.precipitation_probability_max?.[i] || 0,
        impact: impact
      });
    }
  }
  
  return forecasts;
}

// Impact simplifié pour les prévisions
function calculateSimpleImpact(weatherCode, tempMax) {
  if (weatherCode >= 61 || weatherCode >= 95) return { label: '-20%', color: 'red' };
  if (weatherCode >= 71 && weatherCode <= 77) return { label: '-30%', color: 'red' };
  if (weatherCode >= 51 && weatherCode <= 55) return { label: '-10%', color: 'orange' };
  if (tempMax > 32) return { label: '-10%', color: 'orange' };
  if (weatherCode <= 3 && tempMax >= 18 && tempMax <= 28) return { label: '+15%', color: 'green' };
  return { label: '~', color: 'gray' };
}

// Mapper les codes météo Open-Meteo vers nos conditions
function mapOpenMeteoCondition(code) {
  // Codes WMO: https://open-meteo.com/en/docs
  if (code === 0) return 'soleil';
  if (code === 1 || code === 2) return 'nuageux';
  if (code === 3) return 'nuageux';
  if (code >= 45 && code <= 48) return 'brouillard';
  if (code >= 51 && code <= 55) return 'pluie_legere';
  if (code >= 56 && code <= 57) return 'pluie_legere'; // verglas
  if (code >= 61 && code <= 65) return 'pluie';
  if (code >= 66 && code <= 67) return 'pluie'; // pluie verglaçante
  if (code >= 71 && code <= 77) return 'neige';
  if (code >= 80 && code <= 82) return 'pluie';
  if (code >= 85 && code <= 86) return 'neige';
  if (code >= 95 && code <= 99) return 'orage';
  return 'normal';
}

// Description en français des codes météo
function getWeatherDescription(code) {
  const descriptions = {
    0: 'Ciel dégagé',
    1: 'Principalement dégagé',
    2: 'Partiellement nuageux',
    3: 'Couvert',
    45: 'Brouillard',
    48: 'Brouillard givrant',
    51: 'Bruine légère',
    53: 'Bruine modérée',
    55: 'Bruine dense',
    56: 'Bruine verglaçante légère',
    57: 'Bruine verglaçante dense',
    61: 'Pluie légère',
    63: 'Pluie modérée',
    65: 'Pluie forte',
    66: 'Pluie verglaçante légère',
    67: 'Pluie verglaçante forte',
    71: 'Neige légère',
    73: 'Neige modérée',
    75: 'Neige forte',
    77: 'Grains de neige',
    80: 'Averses légères',
    81: 'Averses modérées',
    82: 'Averses violentes',
    85: 'Averses de neige légères',
    86: 'Averses de neige fortes',
    95: 'Orage',
    96: 'Orage avec grêle légère',
    99: 'Orage avec grêle forte'
  };
  return descriptions[code] || 'Variable';
}

// Évaluer le confort terrasse (adapté pour codes Open-Meteo WMO)
function evaluateTerrasseConfort(temp, feelsLike, windKmh, weatherCode) {
  let score = 100;
  let raisons = [];
  
  // Température
  if (feelsLike < 10) {
    score -= 40;
    raisons.push('froid');
  } else if (feelsLike < 15) {
    score -= 20;
    raisons.push('frais');
  } else if (feelsLike > 30) {
    score -= 30;
    raisons.push('chaleur');
  }
  
  // Vent
  if (windKmh > 30) {
    score -= 40;
    raisons.push('vent fort');
  } else if (windKmh > 20) {
    score -= 20;
    raisons.push('vent');
  }
  
  // Pluie/Mauvais temps (codes Open-Meteo WMO)
  // 51-67: bruine/pluie, 71-77: neige, 80-82: averses, 95-99: orages
  if ((weatherCode >= 51 && weatherCode <= 67) || 
      (weatherCode >= 80 && weatherCode <= 82) ||
      (weatherCode >= 95 && weatherCode <= 99)) {
    score -= 50;
    raisons.push('intempéries');
  } else if (weatherCode >= 71 && weatherCode <= 77) {
    score -= 60;
    raisons.push('neige');
  } else if (weatherCode >= 45 && weatherCode <= 48) {
    score -= 20;
    raisons.push('brouillard');
  }
  
  score = Math.max(0, score);
  
  return {
    score: score,
    niveau: score >= 70 ? 'bon' : score >= 40 ? 'moyen' : 'mauvais',
    raisons: raisons,
    impactLivraison: score < 50 ? '+20%' : score < 70 ? '+10%' : null,
    message: score >= 70 
      ? 'Terrasse agréable' 
      : score >= 40 
        ? `Terrasse limitée (${raisons.join(', ')})`
        : `Terrasse fermée`
  };
}

// Direction du vent
function getWindDirection(deg) {
  if (deg === undefined) return '';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
}

// Mapper les codes météo OpenWeather vers nos conditions
function mapWeatherCondition(weatherId) {
  // Codes OpenWeatherMap: https://openweathermap.org/weather-conditions
  if (weatherId >= 200 && weatherId < 300) return 'orage';
  if (weatherId >= 300 && weatherId < 400) return 'pluie_legere';
  if (weatherId >= 500 && weatherId < 600) return 'pluie';
  if (weatherId >= 600 && weatherId < 700) return 'neige';
  if (weatherId >= 700 && weatherId < 800) return 'brouillard';
  if (weatherId === 800) return 'soleil';
  if (weatherId > 800) return 'nuageux';
  return 'normal';
}

function getFallbackWeather() {
  // Données de fallback basées sur la saison
  const month = new Date().getMonth();
  let temp, condition;
  
  if (month >= 11 || month <= 1) { // Hiver
    temp = 5 + Math.floor(Math.random() * 5);
    condition = 'froid';
  } else if (month >= 2 && month <= 4) { // Printemps
    temp = 12 + Math.floor(Math.random() * 8);
    condition = 'nuageux';
  } else if (month >= 5 && month <= 8) { // Été
    temp = 22 + Math.floor(Math.random() * 10);
    condition = 'soleil';
  } else { // Automne
    temp = 10 + Math.floor(Math.random() * 8);
    condition = 'pluie_legere';
  }

  return {
    temperature: temp,
    tempMin: temp - 3,
    tempMax: temp + 3,
    humidity: 60,
    description: 'Données simulées (configurez OPENWEATHER_API_KEY)',
    condition,
    city: process.env.RESTAURANT_CITY || 'Paris',
    timestamp: new Date().toISOString(),
    source: 'fallback'
  };
}

// ============================================
// FOOTBALL - Football-Data.org API (gratuit)
// ============================================
async function getUpcomingMatches() {
  const apiKey = process.env.FOOTBALL_API_KEY;

  // Vérifier le cache
  if (cache.matches.data && cache.matches.lastFetch) {
    const age = Date.now() - cache.matches.lastFetch;
    if (age < cache.matches.ttl) {
      console.log('⚽ [FOOTBALL] Retour cache matchs');
      return cache.matches.data;
    }
  }

  if (!apiKey) {
    console.log('⚠️ [FOOTBALL] Pas de clé API Football-Data, utilisation fallback');
    return getFallbackMatches();
  }

  try {
    const today = new Date();
    const dateFrom = today.toISOString().split('T')[0];
    // Chercher sur 30 jours pour voir les gros matchs à venir
    const dateTo = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Compétitions gratuites pertinentes:
    // FL1 = Ligue 1, CL = Champions League, SA = Serie A, EC = Euro
    // PL = Premier League, BL1 = Bundesliga, PD = La Liga
    const competitions = ['FL1', 'CL', 'SA', 'PL', 'BL1', 'PD', 'WC', 'EC'];
    
    const allMatches = [];

    for (const comp of competitions) {
      try {
        const response = await axios.get(
          `https://api.football-data.org/v4/competitions/${comp}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
          {
            headers: { 'X-Auth-Token': apiKey },
            timeout: 5000
          }
        );

        const matches = response.data.matches || [];
        
        matches.forEach(match => {
          // Filtrer pour garder les matchs pertinents pour PARIS
          const isImportant = isImportantMatch(match, comp);
          if (isImportant) {
            allMatches.push({
              id: match.id,
              competition: response.data.competition?.name || comp,
              competitionCode: comp,
              homeTeam: match.homeTeam.name,
              awayTeam: match.awayTeam.name,
              date: match.utcDate,
              status: match.status,
              importance: getMatchImportance(match, comp),
              impact: getRestaurantImpact(match, comp)
            });
          }
        });

        // Pause pour respecter la limite de 10 appels/minute
        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (err) {
        console.warn(`⚠️ [FOOTBALL] Erreur compétition ${comp}:`, err.message);
      }
    }

    // Trier par date et importance
    allMatches.sort((a, b) => {
      if (a.importance !== b.importance) return b.importance - a.importance;
      return new Date(a.date) - new Date(b.date);
    });

    const result = {
      matches: allMatches.slice(0, 10), // Max 10 matchs
      lastUpdate: new Date().toISOString(),
      source: 'football-data.org'
    };

    // Mettre en cache
    cache.matches.data = result;
    cache.matches.lastFetch = Date.now();

    console.log(`⚽ [FOOTBALL] ${allMatches.length} matchs importants trouvés`);
    return result;

  } catch (error) {
    console.error('❌ [FOOTBALL] Erreur API football:', error.message);
    return cache.matches.data || getFallbackMatches();
  }
}

// Vérifier si c'est un match important pour un resto à VINCENNES (clientèle jeune, diverse)
function isImportantMatch(match, competition) {
  const homeTeam = match.homeTeam?.name || '';
  const awayTeam = match.awayTeam?.name || '';
  const teams = `${homeTeam} ${awayTeam}`.toLowerCase();

  // === PRIORITÉ 1: Équipe de France === (TOUJOURS important)
  if (teams.includes('france')) return true;

  // === PRIORITÉ 2: PSG === (On est en région parisienne!)
  if (teams.includes('paris saint-germain') || teams.includes('psg')) return true;

  // === PRIORITÉ 3: Ligue 1 - Gros matchs ===
  if (competition === 'FL1') {
    const grosClubesL1 = [
      'paris', 'psg', 'marseille', 'olympique marseille', 
      'lyon', 'olympique lyon', 'monaco', 'as monaco',
      'lille', 'lens', 'rennes', 'nice', 'nantes', 'strasbourg'
    ];
    return grosClubesL1.some(club => teams.includes(club));
  }

  // === PRIORITÉ 4: Champions League === (Toutes les grosses affiches!)
  if (competition === 'CL') {
    // Phases finales = TOUJOURS
    if (match.stage && (match.stage.includes('FINAL') || match.stage.includes('SEMI') || match.stage.includes('QUARTER'))) return true;
    // Gros clubs européens
    const grosCLubs = [
      'real madrid', 'barcelona', 'bayern', 'manchester united', 'manchester city',
      'liverpool', 'chelsea', 'arsenal', 'tottenham',
      'juventus', 'milan', 'inter', 'napoli', 'roma',
      'psg', 'paris', 'marseille',
      'atletico', 'dortmund', 'benfica', 'porto'
    ];
    return grosCLubs.some(club => teams.includes(club));
  }

  // === PRIORITÉ 5: DERBYS EUROPÉENS LÉGENDAIRES ===
  const derbysEuropeens = [
    // El Clasico
    { teams: ['real madrid', 'barcelona'], name: 'El Clasico' },
    // Derby de Milan
    { teams: ['ac milan', 'inter'], name: 'Derby della Madonnina' },
    // Derby de Manchester
    { teams: ['manchester united', 'manchester city'], name: 'Manchester Derby' },
    // North West Derby
    { teams: ['liverpool', 'manchester united'], name: 'North West Derby' },
    // Derby de Londres
    { teams: ['arsenal', 'tottenham'], name: 'North London Derby' },
    { teams: ['chelsea', 'arsenal'], name: 'London Derby' },
    // Classique français
    { teams: ['paris', 'marseille'], name: 'Le Classique' },
    // Derby de Rome
    { teams: ['roma', 'lazio'], name: 'Derby della Capitale' },
    // Derby de Turin  
    { teams: ['juventus', 'torino'], name: 'Derby della Mole' },
    // Der Klassiker
    { teams: ['bayern', 'dortmund'], name: 'Der Klassiker' },
  ];
  
  for (const derby of derbysEuropeens) {
    if (derby.teams.every(team => teams.includes(team))) {
      console.log(`🔥 [DERBY] ${derby.name} détecté !`);
      return true;
    }
  }

  // === PRIORITÉ 6: Coupe du Monde ===
  if (competition === 'WC') return true;

  // === PRIORITÉ 7: Euro ===
  if (competition === 'EC') return true;

  // === PRIORITÉ 8: CAN (Coupe d'Afrique des Nations) ===
  // Très important pour clientèle diverse!
  if (competition === 'AFCON' || competition === 'CAF') return true;

  // === BONUS: Serie A - Matchs avec au moins 1 gros club ===
  if (competition === 'SA') {
    const grosClubs = ['juventus', 'milan', 'inter', 'roma', 'napoli', 'lazio', 'atalanta', 'fiorentina'];
    const matchingClubs = grosClubs.filter(club => teams.includes(club));
    return matchingClubs.length >= 1; // Au moins 1 gros club
  }

  // === BONUS: Premier League (PL) - Gros clubs ===
  if (competition === 'PL') {
    const grosClubsPL = [
      'manchester united', 'manchester city', 'liverpool', 'chelsea', 
      'arsenal', 'tottenham', 'newcastle', 'west ham', 'aston villa'
    ];
    return grosClubsPL.some(club => teams.includes(club));
  }

  // === BONUS: Bundesliga (BL1) - Gros clubs ===
  if (competition === 'BL1') {
    const grosClubsBL = ['bayern', 'dortmund', 'leipzig', 'leverkusen'];
    return grosClubsBL.some(club => teams.includes(club));
  }

  // === BONUS: La Liga (PD) - Gros clubs ===
  if (competition === 'PD') {
    const grosClubsPD = ['real madrid', 'barcelona', 'atletico madrid', 'sevilla', 'valencia'];
    return grosClubsPD.some(club => teams.includes(club));
  }

  return false;
}

// ============================================
// LOGIQUE D'IMPACT POUR RESTAURANT À PARIS
// ============================================
// Priorité : 
// 1. PSG, Équipe de France = TOUT LE MONDE regarde = livraisons +++
// 2. Ligue 1 (OM, Lyon, Monaco) = rivalité = beaucoup regardent
// 3. Champions League avec clubs français = intérêt fort
// 4. Coupe du Monde, Euro avec France = événement national
// 5. Gros derbys européens (El Clasico, etc.) = fans hardcore
// 6. Autres championnats étrangers = impact faible à Paris

function getMatchImportance(match, competition) {
  const homeTeam = match.homeTeam?.name || '';
  const awayTeam = match.awayTeam?.name || '';
  const teams = `${homeTeam} ${awayTeam}`.toLowerCase();

  // === NIVEAU 5 : ÉVÉNEMENTS NATIONAUX (tout le monde regarde) ===
  
  // PSG = On est à Paris !
  if (teams.includes('paris saint-germain') || teams.includes('psg')) {
    return 5;
  }
  
  // Équipe de France
  if (teams.includes('france')) {
    return 5;
  }
  
  // Le Classique PSG-OM (même si PSG déjà couvert)
  if ((teams.includes('paris') || teams.includes('psg')) && teams.includes('marseille')) {
    return 5;
  }

  // === NIVEAU 4 : LIGUE 1 GROS MATCHS ===
  if (competition === 'FL1') {
    const grosClubesL1 = ['marseille', 'lyon', 'monaco', 'lille', 'lens'];
    const hasGrosClub = grosClubesL1.some(club => teams.includes(club));
    if (hasGrosClub) {
      return 4; // Rivalités L1
    }
    return 3; // Autres matchs L1
  }

  // === NIVEAU 4 : CHAMPIONS LEAGUE AVEC CLUBS FRANÇAIS ===
  if (competition === 'CL') {
    // PSG en CL = déjà couvert niveau 5
    // Finales CL = événement
    if (match.stage && (match.stage.includes('FINAL') || match.stage.includes('SEMI'))) {
      return 4;
    }
    // Gros derbys européens
    const derbysEuropeens = [
      ['real madrid', 'barcelona'],
      ['manchester united', 'manchester city'],
      ['liverpool', 'manchester'],
      ['ac milan', 'inter'],
      ['bayern', 'dortmund'],
    ];
    for (const derby of derbysEuropeens) {
      if (derby.every(team => teams.includes(team))) {
        return 4;
      }
    }
    return 3; // Autres matchs CL
  }

  // === NIVEAU 4-5 : COUPE DU MONDE / EURO ===
  if (competition === 'WC' || competition === 'EC') {
    if (teams.includes('france')) {
      return 5;
    }
    if (match.stage && (match.stage.includes('FINAL') || match.stage.includes('SEMI'))) {
      return 4;
    }
    return 3;
  }

  // === NIVEAU 3 : CAN (Coupe d'Afrique) ===
  // Important pour clientèle diverse en région parisienne
  if (competition === 'AFCON' || competition === 'CAF') {
    const equipesSuivies = ['senegal', 'algerie', 'algeria', 'maroc', 'morocco', 
                            'cameroun', 'cameroon', 'cote d\'ivoire', 'mali', 'tunisie', 'tunisia'];
    if (equipesSuivies.some(eq => teams.includes(eq))) {
      return 4;
    }
    return 3;
  }

  // === NIVEAU 2 : CHAMPIONNATS ÉTRANGERS (impact limité à Paris) ===
  // Serie A, Premier League, Bundesliga, La Liga
  // Seuls les gros derbys peuvent intéresser les fans
  if (competition === 'SA' || competition === 'PL' || competition === 'BL1' || competition === 'PD') {
    const derbysInteressants = [
      ['real madrid', 'barcelona'],      // El Clasico
      ['ac milan', 'inter'],             // Derby Milan
      ['manchester united', 'manchester city'],
      ['liverpool', 'manchester'],
      ['arsenal', 'tottenham'],
      ['juventus', 'inter'],
      ['roma', 'lazio'],
      ['bayern', 'dortmund'],
    ];
    for (const derby of derbysInteressants) {
      if (derby.every(team => teams.includes(team))) {
        return 3; // Derby = un peu d'intérêt
      }
    }
    return 1; // Autres matchs étrangers = très faible impact à Paris
  }

  return 1; // Par défaut
}

// Estimer l'impact sur le restaurant (livraisons/à emporter)
// Basé sur : heure du match + importance locale
function getRestaurantImpact(match, competition) {
  const importance = getMatchImportance(match, competition);
  const matchDate = new Date(match.utcDate);
  const hour = matchDate.getHours();
  
  // Matchs en soirée (18h-23h) = heure des repas = impact max
  const isSoiree = hour >= 18 && hour <= 23;
  
  // Matchs midi (12h-14h) = déjeuner
  const isMidi = hour >= 12 && hour < 14;
  
  // === CALCUL IMPACT ===
  
  // Importance 5 (PSG, France) en soirée = TRÈS ÉLEVÉ
  if (importance === 5 && isSoiree) {
    return 'très_élevé';
  }
  
  // Importance 5 midi ou Importance 4 soirée = ÉLEVÉ
  if ((importance === 5 && isMidi) || (importance === 4 && isSoiree)) {
    return 'élevé';
  }
  
  // Importance 4 midi ou Importance 3 soirée = MOYEN
  if ((importance === 4 && isMidi) || (importance === 3 && isSoiree)) {
    return 'moyen';
  }
  
  // Importance 3 midi ou Importance 2 = FAIBLE
  if ((importance === 3 && isMidi) || importance === 2) {
    return 'faible';
  }
  
  // Reste = TRÈS FAIBLE (championnats étrangers hors soirée)
  return 'très_faible';
}

function getFallbackMatches() {
  return {
    matches: [],
    lastUpdate: new Date().toISOString(),
    source: 'fallback',
    message: 'Configurez FOOTBALL_API_KEY pour voir les matchs'
  };
}

// ============================================
// JOURS FÉRIÉS FRANÇAIS (calculés localement)
// ============================================
function getJoursFeries(year) {
  const feries = [];
  
  // Fêtes fixes
  feries.push({ date: `${year}-01-01`, nom: 'Jour de l\'An', type: 'fixe' });
  feries.push({ date: `${year}-05-01`, nom: 'Fête du Travail', type: 'fixe' });
  feries.push({ date: `${year}-05-08`, nom: 'Victoire 1945', type: 'fixe' });
  feries.push({ date: `${year}-07-14`, nom: 'Fête Nationale', type: 'fixe' });
  feries.push({ date: `${year}-08-15`, nom: 'Assomption', type: 'fixe' });
  feries.push({ date: `${year}-11-01`, nom: 'Toussaint', type: 'fixe' });
  feries.push({ date: `${year}-11-11`, nom: 'Armistice', type: 'fixe' });
  feries.push({ date: `${year}-12-25`, nom: 'Noël', type: 'fixe' });

  // Pâques et jours mobiles (calcul de Pâques)
  const paques = calculateEaster(year);
  const lundiPaques = new Date(paques);
  lundiPaques.setDate(lundiPaques.getDate() + 1);
  
  const ascension = new Date(paques);
  ascension.setDate(ascension.getDate() + 39);
  
  const lundiPentecote = new Date(paques);
  lundiPentecote.setDate(lundiPentecote.getDate() + 50);

  feries.push({ date: formatDate(lundiPaques), nom: 'Lundi de Pâques', type: 'mobile' });
  feries.push({ date: formatDate(ascension), nom: 'Ascension', type: 'mobile' });
  feries.push({ date: formatDate(lundiPentecote), nom: 'Lundi de Pentecôte', type: 'mobile' });

  return feries;
}

// Algorithme de calcul de Pâques (Meeus/Jones/Butcher)
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Vérifier si aujourd'hui ou demain est férié
function checkUpcomingHolidays() {
  const today = new Date();
  const year = today.getFullYear();
  const feries = [...getJoursFeries(year), ...getJoursFeries(year + 1)];
  
  const todayStr = formatDate(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);
  
  const results = {
    isHolidayToday: false,
    isHolidayTomorrow: false,
    holidayToday: null,
    holidayTomorrow: null,
    upcoming: []
  };

  feries.forEach(f => {
    if (f.date === todayStr) {
      results.isHolidayToday = true;
      results.holidayToday = f;
    }
    if (f.date === tomorrowStr) {
      results.isHolidayTomorrow = true;
      results.holidayTomorrow = f;
    }
    // Prochain férié dans les 14 jours
    const fDate = new Date(f.date);
    const diff = (fDate - today) / (1000 * 60 * 60 * 24);
    if (diff > 0 && diff <= 14) {
      results.upcoming.push({
        ...f,
        daysUntil: Math.ceil(diff)
      });
    }
  });

  return results;
}

// ============================================
// ANALYSE INTELLIGENTE COMBINÉE
// ============================================
async function getSmartAnalysis() {
  const [weather, matches, holidays] = await Promise.all([
    getWeather(),
    getUpcomingMatches(),
    Promise.resolve(checkUpcomingHolidays())
  ]);

  const today = new Date();
  const dayOfWeek = today.getDay();
  const dayOfMonth = today.getDate();
  const hour = today.getHours();

  // Analyser les facteurs
  const factors = [];
  let affluenceScore = 50; // Base 50%
  let alertLevel = 'normal'; // normal, attention, alerte

  // 1. Jour de la semaine
  if (dayOfWeek === 5) { // Vendredi
    factors.push({
      type: 'jour',
      icon: 'calendar',
      message: 'Vendredi soir - Rush attendu',
      impact: 'positif',
      score: 15
    });
    affluenceScore += 15;
  } else if (dayOfWeek === 6) { // Samedi
    factors.push({
      type: 'jour',
      icon: 'calendar',
      message: 'Samedi - Pic d\'activité',
      impact: 'positif',
      score: 20
    });
    affluenceScore += 20;
  } else if (dayOfWeek === 0) { // Dimanche
    factors.push({
      type: 'jour',
      icon: 'calendar',
      message: 'Dimanche - Activité modérée',
      impact: 'neutre',
      score: 5
    });
    affluenceScore += 5;
  } else if (dayOfWeek === 1) { // Lundi
    factors.push({
      type: 'jour',
      icon: 'calendar',
      message: 'Lundi - Journée plus calme',
      impact: 'négatif',
      score: -10
    });
    affluenceScore -= 10;
  }

  // 2. Fin de mois (moins de budget)
  if (dayOfMonth >= 25) {
    factors.push({
      type: 'finance',
      icon: 'wallet',
      message: 'Fin de mois - Budget clients réduit',
      impact: 'négatif',
      score: -10
    });
    affluenceScore -= 10;
  } else if (dayOfMonth <= 5) {
    factors.push({
      type: 'finance',
      icon: 'wallet',
      message: 'Début de mois - Clients plus dépensiers',
      impact: 'positif',
      score: 10
    });
    affluenceScore += 10;
  }

  // 3. Météo
  if (weather.source !== 'fallback') {
    if (weather.condition === 'pluie' || weather.condition === 'orage') {
      factors.push({
        type: 'meteo',
        icon: 'cloud-rain',
        message: `Pluie prévue (${weather.temperature}°C) - Clients cherchent un abri`,
        impact: 'positif',
        score: 10
      });
      affluenceScore += 10;
    } else if (weather.condition === 'neige') {
      factors.push({
        type: 'meteo',
        icon: 'snowflake',
        message: 'Neige - Certains clients resteront chez eux',
        impact: 'négatif',
        score: -15
      });
      affluenceScore -= 15;
      alertLevel = 'attention';
    } else if (weather.temperature >= 28) {
      factors.push({
        type: 'meteo',
        icon: 'thermometer',
        message: `Forte chaleur (${weather.temperature}°C) - Terrasse prisée, pensez ventilation`,
        impact: 'positif',
        score: 10
      });
      affluenceScore += 10;
    } else if (weather.temperature <= 5) {
      factors.push({
        type: 'meteo',
        icon: 'thermometer-snowflake',
        message: `Froid vif (${weather.temperature}°C) - Plats chauds en demande`,
        impact: 'neutre',
        score: 5
      });
      affluenceScore += 5;
    } else if (weather.condition === 'soleil' && weather.temperature >= 18 && weather.temperature <= 25) {
      factors.push({
        type: 'meteo',
        icon: 'sun',
        message: `Beau temps (${weather.temperature}°C) - Concurrence des terrasses`,
        impact: 'négatif',
        score: -5
      });
      affluenceScore -= 5;
    }
  }

  // 4. Matchs de foot
  const todayMatches = matches.matches?.filter(m => {
    const matchDate = new Date(m.date);
    return matchDate.toDateString() === today.toDateString();
  }) || [];

  if (todayMatches.length > 0) {
    const bestMatch = todayMatches.sort((a, b) => b.importance - a.importance)[0];
    const matchHour = new Date(bestMatch.date).getHours();
    
    let matchMessage = `${bestMatch.homeTeam} vs ${bestMatch.awayTeam}`;
    let score = 0;
    
    if (matchHour >= 18 && matchHour <= 22) {
      matchMessage += ' - Rush commandes attendu';
      score = 25;
      alertLevel = 'alerte';
    } else if (matchHour >= 12 && matchHour < 18) {
      matchMessage += ' - Pic midi possible';
      score = 15;
    }

    if (bestMatch.importance >= 4) {
      matchMessage = '⚽ GROS MATCH: ' + matchMessage;
      score += 10;
      alertLevel = 'alerte';
    }

    factors.push({
      type: 'match',
      icon: 'trophy',
      message: matchMessage,
      impact: 'positif',
      score,
      details: {
        competition: bestMatch.competition,
        time: new Date(bestMatch.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }
    });
    affluenceScore += score;
  }

  // 5. Jours fériés
  if (holidays.isHolidayToday) {
    factors.push({
      type: 'ferie',
      icon: 'calendar-check',
      message: `Jour férié: ${holidays.holidayToday.nom}`,
      impact: 'attention',
      score: 0
    });
    alertLevel = 'attention';
  }

  if (holidays.isHolidayTomorrow) {
    factors.push({
      type: 'ferie',
      icon: 'calendar-plus',
      message: `Veille de férié (${holidays.holidayTomorrow.nom}) - Soirée animée prévue`,
      impact: 'positif',
      score: 20
    });
    affluenceScore += 20;
  }

  if (holidays.upcoming.length > 0 && !holidays.isHolidayToday && !holidays.isHolidayTomorrow) {
    const next = holidays.upcoming[0];
    factors.push({
      type: 'ferie',
      icon: 'calendar',
      message: `${next.nom} dans ${next.daysUntil} jour${next.daysUntil > 1 ? 's' : ''}`,
      impact: 'info',
      score: 0
    });
  }

  // Limiter le score
  affluenceScore = Math.max(10, Math.min(100, affluenceScore));

  // Déterminer le niveau d'affluence
  let affluenceLevel = 'normale';
  if (affluenceScore >= 75) affluenceLevel = 'très_élevée';
  else if (affluenceScore >= 60) affluenceLevel = 'élevée';
  else if (affluenceScore >= 40) affluenceLevel = 'moyenne';
  else if (affluenceScore >= 25) affluenceLevel = 'calme';
  else affluenceLevel = 'très_calme';

  // Message principal intelligent basé sur le score et les facteurs
  let mainMessage = '';
  const hasMatch = todayMatches.length > 0;
  const hasHoliday = holidays.isHolidayToday;
  
  if (affluenceScore >= 75) {
    if (hasMatch) {
      mainMessage = '⚽ Soirée match ! Rush attendu ce soir';
    } else if (hasHoliday) {
      mainMessage = '🎉 Jour férié - Affluence forte prévue';
    } else {
      mainMessage = '🔥 Forte affluence attendue aujourd\'hui';
    }
  } else if (affluenceScore >= 55) {
    if (hasMatch) {
      mainMessage = '⚽ Match ce soir - Préparez le service';
    } else {
      mainMessage = '📈 Bonne journée en perspective';
    }
  } else if (affluenceScore >= 35) {
    mainMessage = '📊 Journée classique prévue';
  } else {
    mainMessage = '📉 Journée plus calme - Idéal pour la préparation';
  }

  return {
    weather,
    matches: {
      today: todayMatches,
      upcoming: matches.matches?.slice(0, 5) || []
    },
    holidays,
    factors,
    affluence: {
      score: affluenceScore,
      level: affluenceLevel,
      percentage: affluenceScore
    },
    alertLevel,
    mainMessage,
    lastUpdate: new Date().toISOString()
  };
}

module.exports = {
  getWeather,
  getUpcomingMatches,
  getJoursFeries,
  checkUpcomingHolidays,
  getSmartAnalysis
};
