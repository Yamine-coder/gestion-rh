/**
 * 📊 Scraper Affluence via SerpAPI (Google Maps)
 * 
 * Utilise SerpAPI qui scrape Google Maps de manière fiable
 * Tier gratuit: 100 recherches/mois
 * 
 * Pour obtenir une clé API gratuite: https://serpapi.com/users/sign_up
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SERPAPI_KEY = process.env.SERPAPI_KEY || '';
const PLACE_ID = process.env.PLACE_ID || 'ChIJnYLnmZly5kcRgpLV4MN4Rus';
const RESTAURANT_NAME = process.env.RESTAURANT_NAME || 'Chez Antoine';

async function getAffluenceViaSerpAPI() {
  console.log('='.repeat(50));
  console.log('📊 SCRAPER AFFLUENCE VIA SERPAPI');
  console.log('📍 Restaurant:', RESTAURANT_NAME);
  console.log('🕐 Heure:', new Date().toLocaleString('fr-FR'));
  console.log('='.repeat(50));

  // Résultat par défaut
  const result = {
    timestamp: new Date().toISOString(),
    restaurant: RESTAURANT_NAME,
    placeId: PLACE_ID,
    status: null,
    score: null,
    message: '⚪ Données non disponibles',
    source: 'none',
    popularTimes: null,
    currentPopularity: null
  };

  if (!SERPAPI_KEY) {
    console.log('❌ SERPAPI_KEY non configurée!');
    console.log('');
    console.log('Pour obtenir une clé gratuite (100 req/mois):');
    console.log('1. Créer un compte sur https://serpapi.com/users/sign_up');
    console.log('2. Ajouter SERPAPI_KEY dans les secrets GitHub');
    console.log('');
    
    // Fallback sur estimation
    return getSmartEstimate(result);
  }

  try {
    console.log('🔄 Requête SerpAPI...');
    
    // Construire l'URL SerpAPI pour Google Maps Place
    const params = new URLSearchParams({
      engine: 'google_maps',
      place_id: PLACE_ID,
      hl: 'fr',
      api_key: SERPAPI_KEY
    });

    const url = `https://serpapi.com/search.json?${params}`;
    console.log('📍 Place ID:', PLACE_ID);

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Debug: sauvegarder la réponse complète
    fs.writeFileSync(
      path.join(process.cwd(), 'serpapi-response.json'),
      JSON.stringify(data, null, 2)
    );
    console.log('💾 Réponse SerpAPI sauvegardée: serpapi-response.json');

    // Vérifier si on a les données du lieu
    if (data.place_results) {
      const place = data.place_results;
      console.log('✅ Lieu trouvé:', place.title);
      
      result.placeName = place.title;
      result.address = place.address;
      result.rating = place.rating;
      result.reviews = place.reviews;
      
      // Popular Times (historique par jour/heure)
      if (place.popular_times) {
        result.popularTimes = place.popular_times;
        console.log('📊 Popular Times disponibles');
        
        // Extraire l'affluence actuelle basée sur le jour/heure
        const now = new Date();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDay = dayNames[now.getDay()];
        const currentHour = now.getHours();
        
        const todayData = place.popular_times.find(d => d.day.toLowerCase() === currentDay);
        if (todayData && todayData.popular_times) {
          const hourData = todayData.popular_times.find(h => h.time && h.time.includes(`${currentHour}`));
          if (hourData) {
            result.currentPopularity = hourData.busyness_percentage || hourData.percentage;
            console.log(`📊 Affluence typique à ${currentHour}h:`, result.currentPopularity + '%');
          }
        }
      }
      
      // Live Busyness (temps réel) - C'est ce qu'on veut!
      if (place.popular_times_live_text) {
        console.log('🔴 LIVE:', place.popular_times_live_text);
        result.liveText = place.popular_times_live_text;
        result.source = 'serpapi_live';
        
        // Parser le texte live
        const liveText = place.popular_times_live_text.toLowerCase();
        
        if (liveText.includes('très') || liveText.includes('very busy')) {
          result.status = 'very_busy';
          result.score = 85;
          result.message = '🔴 Très fréquenté';
        } else if (liveText.includes('assez') || liveText.includes('fairly') || liveText.includes('somewhat')) {
          result.status = 'fairly_busy';
          result.score = 60;
          result.message = '🟠 Assez fréquenté';
        } else if (liveText.includes('peu') || liveText.includes('not busy') || liveText.includes('not too')) {
          result.status = 'not_busy';
          result.score = 30;
          result.message = '🟢 Peu fréquenté';
        } else {
          result.status = 'unknown';
          result.score = 50;
          result.message = '⚪ ' + place.popular_times_live_text;
        }
      } 
      // Si pas de live mais on a le pourcentage live
      else if (place.popular_times_live_percent !== undefined) {
        const percent = place.popular_times_live_percent;
        result.currentPopularity = percent;
        result.score = percent;
        result.source = 'serpapi_live_percent';
        
        if (percent >= 70) {
          result.status = 'very_busy';
          result.message = `🔴 Très fréquenté (${percent}%)`;
        } else if (percent >= 40) {
          result.status = 'fairly_busy';
          result.message = `🟠 Assez fréquenté (${percent}%)`;
        } else {
          result.status = 'not_busy';
          result.message = `🟢 Peu fréquenté (${percent}%)`;
        }
        console.log('🔴 Live %:', percent);
      }
      // Sinon utiliser les données historiques pour estimer
      else if (result.currentPopularity) {
        result.source = 'serpapi_historical';
        result.score = result.currentPopularity;
        
        if (result.currentPopularity >= 70) {
          result.status = 'very_busy';
          result.message = `🔴 Habituellement très fréquenté (${result.currentPopularity}%)`;
        } else if (result.currentPopularity >= 40) {
          result.status = 'fairly_busy';
          result.message = `🟠 Habituellement assez fréquenté (${result.currentPopularity}%)`;
        } else {
          result.status = 'not_busy';
          result.message = `🟢 Habituellement peu fréquenté (${result.currentPopularity}%)`;
        }
      }
      
    } else if (data.error) {
      console.log('❌ Erreur SerpAPI:', data.error);
      return getSmartEstimate(result);
    }

  } catch (error) {
    console.log('❌ Erreur:', error.message);
    return getSmartEstimate(result);
  }

  // Si toujours pas de données, fallback
  if (!result.status) {
    return getSmartEstimate(result);
  }

  // Sauvegarder et retourner
  saveResult(result);
  return result;
}

// ========== ESTIMATION INTELLIGENTE (FALLBACK) ==========
function getSmartEstimate(result) {
  console.log('📊 Fallback: estimation intelligente...');
  
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const day = now.getDay(); // 0 = dimanche
  
  result.source = 'estimation';
  result.isEstimation = true;
  
  // Horaires Chez Antoine: 11h - 23h30, 7j/7
  
  // Fermé (avant 11h ou après 23h30)
  if (hour < 11 || (hour === 23 && minutes > 30) || hour >= 24) {
    result.status = 'closed';
    result.score = 0;
    result.message = '⚫ Fermé';
    saveResult(result);
    return result;
  }
  
  // Rush du midi (12h30 - 14h)
  if ((hour === 12 && minutes >= 30) || hour === 13 || (hour === 14 && minutes === 0)) {
    const isWeekend = day === 0 || day === 6;
    result.score = (isWeekend ? 80 : 70) + Math.floor(Math.random() * 15);
    result.status = 'very_busy';
    result.message = '🔴 Très fréquenté (estimation)';
    saveResult(result);
    return result;
  }
  
  // Rush du soir (19h30 - 21h30)
  if ((hour === 19 && minutes >= 30) || hour === 20 || (hour === 21 && minutes < 30)) {
    const isWeekend = day === 5 || day === 6;
    result.score = (isWeekend ? 85 : 75) + Math.floor(Math.random() * 12);
    result.status = 'very_busy';
    result.message = '🔴 Très fréquenté (estimation)';
    saveResult(result);
    return result;
  }
  
  // Périodes moyennes (18h-19h30, 21h30-22h30)
  if ((hour >= 18 && hour < 19) || (hour === 19 && minutes < 30) || 
      (hour === 21 && minutes >= 30) || hour === 22) {
    result.score = 40 + Math.floor(Math.random() * 25);
    result.status = 'fairly_busy';
    result.message = '🟠 Assez fréquenté (estimation)';
    saveResult(result);
    return result;
  }
  
  // Heures creuses
  result.score = 20 + Math.floor(Math.random() * 20);
  result.status = 'not_busy';
  result.message = '🟢 Peu fréquenté (estimation)';
  saveResult(result);
  return result;
}

function saveResult(result) {
  const outputPath = path.join(process.cwd(), 'affluence-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  console.log('');
  console.log('='.repeat(50));
  console.log('📊 RÉSULTAT FINAL');
  console.log('='.repeat(50));
  console.log('Status:', result.status);
  console.log('Score:', result.score);
  console.log('Message:', result.message);
  console.log('Source:', result.source);
  if (result.isEstimation) {
    console.log('⚠️  Note: Données estimées (pas de données live)');
  }
  console.log('💾 Sauvegardé:', outputPath);
}

// Main
getAffluenceViaSerpAPI().catch(console.error);
