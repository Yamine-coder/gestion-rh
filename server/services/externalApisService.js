/**
 * Service pour les APIs externes (Météo, Football, Événements)
 * Avec cache intelligent pour respecter les limites gratuites
 */

const axios = require('axios');

// Cache en mémoire avec TTL
const cache = {
  weather: { data: null, lastFetch: null, ttl: 30 * 60 * 1000 }, // 30 min
  matches: { data: null, lastFetch: null, ttl: 60 * 60 * 1000 }, // 1 heure
  events: { data: null, lastFetch: null, ttl: 60 * 60 * 1000 }, // 1 heure
};

// ============================================
// MÉTÉO - OpenWeatherMap API 2.5 (gratuit)
// ============================================
async function getWeather() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const city = process.env.RESTAURANT_CITY || 'Paris';
  const country = process.env.RESTAURANT_COUNTRY || 'FR';

  // Vérifier le cache
  if (cache.weather.data && cache.weather.lastFetch) {
    const age = Date.now() - cache.weather.lastFetch;
    if (age < cache.weather.ttl) {
      console.log('☁️ [WEATHER] Retour cache météo');
      return cache.weather.data;
    }
  }

  // Si pas de clé API, retourner les données de fallback
  if (!apiKey) {
    console.log('⚠️ [WEATHER] Pas de clé API OpenWeather, utilisation fallback');
    return getFallbackWeather();
  }

  try {
    // API Current Weather 2.5 (gratuite - 1M appels/mois)
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&appid=${apiKey}&units=metric&lang=fr`,
      { timeout: 5000 }
    );

    const data = response.data;
    
    // Calcul du ressenti thermique
    const feelsLike = Math.round(data.main.feels_like);
    const windSpeed = data.wind?.speed || 0; // m/s
    const windKmh = Math.round(windSpeed * 3.6); // Convertir en km/h
    
    // Évaluer le confort extérieur (terrasse)
    const terrasseConfort = evaluateTerrasseConfort(data.main.temp, feelsLike, windKmh, data.weather[0].id);
    
    const weather = {
      temperature: Math.round(data.main.temp),
      feelsLike: feelsLike,
      tempMin: Math.round(data.main.temp_min),
      tempMax: Math.round(data.main.temp_max),
      humidity: data.main.humidity,
      wind: {
        speed: windKmh,
        direction: getWindDirection(data.wind?.deg)
      },
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      condition: mapWeatherCondition(data.weather[0].id),
      city: data.name,
      terrasseConfort: terrasseConfort,
      timestamp: new Date().toISOString(),
      source: 'openweathermap',
      // Coordonnées pour les prévisions pluie
      coords: { lat: data.coord.lat, lon: data.coord.lon }
    };

    // Récupérer prévisions pluie (nowcasting)
    try {
      const rainForecast = await getRainForecast(data.coord.lat, data.coord.lon, apiKey);
      weather.rainForecast = rainForecast;
    } catch (e) {
      weather.rainForecast = null;
    }

    // Mettre en cache
    cache.weather.data = weather;
    cache.weather.lastFetch = Date.now();
    
    console.log(`☀️ [WEATHER] Météo récupérée: ${weather.temperature}°C (ressenti ${feelsLike}°C), vent ${windKmh}km/h`);
    return weather;

  } catch (error) {
    console.error('❌ [WEATHER] Erreur API météo:', error.message);
    return cache.weather.data || getFallbackWeather();
  }
}

// Prévisions pluie pour les 60 prochaines minutes (nowcasting)
async function getRainForecast(lat, lon, apiKey) {
  try {
    // API One Call 3.0 - minutely forecast (pluie minute par minute)
    // Note: One Call 3.0 nécessite souscription, on utilise 2.5 forecast comme fallback
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=fr&cnt=4`,
      { timeout: 5000 }
    );
    
    const forecasts = response.data.list || [];
    
    // Analyser les 3 prochaines heures
    let pluieDans = null;
    let intensite = 'aucune';
    
    for (let i = 0; i < forecasts.length; i++) {
      const forecast = forecasts[i];
      const weatherId = forecast.weather[0]?.id || 800;
      const rain = forecast.rain?.['3h'] || 0;
      const minutesFromNow = i * 60; // Chaque forecast = 1h
      
      // Détecter pluie
      if ((weatherId >= 300 && weatherId < 600) || rain > 0) {
        if (!pluieDans) {
          pluieDans = minutesFromNow;
          intensite = rain > 5 ? 'forte' : rain > 1 ? 'modérée' : 'légère';
        }
      }
    }
    
    return {
      pluieDans: pluieDans, // minutes avant la pluie (null = pas de pluie prévue)
      intensite: intensite,
      message: pluieDans !== null 
        ? pluieDans === 0 
          ? `Pluie ${intensite} en cours`
          : `Pluie ${intensite} dans ~${pluieDans} min`
        : 'Pas de pluie prévue (3h)',
      impactLivraison: pluieDans !== null && pluieDans <= 60 ? '+15%' : null
    };
  } catch (e) {
    console.warn('⚠️ [WEATHER] Erreur prévision pluie:', e.message);
    return null;
  }
}

// Évaluer le confort terrasse
function evaluateTerrasseConfort(temp, feelsLike, windKmh, weatherId) {
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
  
  // Pluie/Mauvais temps
  if (weatherId >= 200 && weatherId < 700) {
    score -= 50;
    raisons.push('intempéries');
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
        : `Terrasse vide → livraisons ↑`
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
