/**
 * 📊 Scraper Affluence ROBUSTE - Multi-stratégies
 * 
 * Stratégies dans l'ordre de priorité:
 * 1. API BestTime (si clé disponible)
 * 2. Scraping direct Google avec retry et fallback
 * 3. Estimation intelligente basée sur l'heure
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PLACE_ID = process.env.PLACE_ID || 'ChIJnYLnmZly5kcRgpLV4MN4Rus';
const RESTAURANT_NAME = process.env.RESTAURANT_NAME || 'Chez Antoine';
const BESTTIME_API_KEY = process.env.BESTTIME_API_KEY || '';

// ========== STRATÉGIE 1: API BESTTIME ==========
async function tryBestTimeAPI() {
  if (!BESTTIME_API_KEY) {
    console.log('⚠️ Pas de clé BestTime API');
    return null;
  }

  try {
    console.log('🔄 Tentative API BestTime...');
    
    // BestTime utilise le nom + adresse, pas le Place ID
    const response = await fetch('https://besttime.app/api/v1/forecasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key_private: BESTTIME_API_KEY,
        venue_name: 'Chez Antoine',
        venue_address: '2 Avenue de la République, 94300 Vincennes, France'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ BestTime API success');
      return formatBestTimeData(data);
    }
  } catch (error) {
    console.log('❌ BestTime API erreur:', error.message);
  }
  return null;
}

// ========== STRATÉGIE 2: SCRAPING GOOGLE (SIMPLIFIÉ) ==========
async function tryGoogleScraping() {
  let browser = null;
  
  try {
    console.log('🔄 Tentative scraping Google Maps...');
    
    // Détecter l'environnement
    const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
    let puppeteer, launchOptions;

    if (isGitHubActions) {
      puppeteer = require('puppeteer-core');
      const chromium = require('@sparticuz/chromium');
      launchOptions = {
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        args: chromium.args
      };
    } else {
      puppeteer = require('puppeteer');
      launchOptions = { headless: 'new' };
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    // User agent mobile (plus simple à parser)
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36');
    await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });

    // URL directe avec place_id
    const url = `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`;
    console.log('📍 URL:', url);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);
    
    // Fermer popup si présent
    await closePopupIfPresent(page);
    await delay(2000);
    
    // Prendre screenshot debug
    const screenshotPath = path.join(process.cwd(), 'debug-affluence.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('📸 Screenshot:', screenshotPath);
    
    // Chercher le texte d'affluence avec plusieurs méthodes
    const affluenceData = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      
      // Patterns d'affluence en français
      const patterns = [
        /temps?\s*réel[^:]*:\s*(très\s*animé|assez\s*animé|peu\s*animé|pas\s*très\s*fréquenté)/i,
        /(très\s*animé|assez\s*animé|peu\s*animé|pas\s*très\s*fréquenté)\s*en\s*ce\s*moment/i,
        /affluence[^:]*:\s*(élevée|moyenne|faible)/i,
        /fréquentation[^:]*:\s*(élevée|moyenne|faible)/i,
        /currently[^:]*:\s*(very\s*busy|fairly\s*busy|not\s*busy|usually\s*busy)/i
      ];
      
      for (const pattern of patterns) {
        const match = bodyText.match(pattern);
        if (match) {
          return {
            found: true,
            raw: match[0],
            status: match[1]
          };
        }
      }
      
      // Vérifier si on est sur la bonne page
      const hasRestaurantName = bodyText.toLowerCase().includes('chez antoine');
      const hasAffluenceSection = bodyText.toLowerCase().includes('affluence') || 
                                   bodyText.toLowerCase().includes('horaires');
      
      return {
        found: false,
        hasRestaurantName,
        hasAffluenceSection,
        textSample: bodyText.substring(0, 500)
      };
    });
    
    await browser.close();
    
    if (affluenceData.found) {
      console.log('✅ Affluence trouvée:', affluenceData.status);
      return formatGoogleData(affluenceData);
    } else {
      console.log('⚠️ Page atteinte mais affluence non trouvée');
      console.log('   Restaurant trouvé:', affluenceData.hasRestaurantName);
      console.log('   Section horaires:', affluenceData.hasAffluenceSection);
      return null;
    }
    
  } catch (error) {
    console.log('❌ Scraping erreur:', error.message);
    if (browser) await browser.close();
    return null;
  }
}

async function closePopupIfPresent(page) {
  try {
    // Chercher boutons de popup courants
    const popupButtons = [
      'button[aria-label*="Rester"]',
      'button[aria-label*="Stay"]',
      'button[aria-label*="Revenir"]',
      '[data-value="Rester sur le Web"]',
      '[data-value="Stay on Web"]'
    ];
    
    for (const selector of popupButtons) {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        console.log('🔘 Popup fermé');
        await delay(1000);
        return;
      }
    }
    
    // Méthode fallback: chercher texte dans les boutons
    const clicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent.toLowerCase();
        if (text.includes('rester') || text.includes('stay') || text.includes('revenir')) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    
    if (clicked) console.log('🔘 Popup fermé (via texte)');
    
  } catch (error) {
    // Ignorer les erreurs de popup
  }
}

// ========== STRATÉGIE 3: ESTIMATION INTELLIGENTE ==========
function getSmartEstimate() {
  console.log('📊 Utilisation de l\'estimation intelligente...');
  
  const now = new Date();
  const day = now.getDay(); // 0 = dimanche
  const hour = now.getHours();
  const minutes = now.getMinutes();
  
  // Horaires Chez Antoine: 11h - 23h30, 7j/7
  
  // Fermé (avant 11h ou après 23h30)
  if (hour < 11 || (hour === 23 && minutes > 30) || hour >= 24) {
    return {
      status: 'closed',
      score: 0,
      message: '⚫ Fermé',
      estimation: true
    };
  }
  
  // Rush du midi (12h30 - 14h)
  if ((hour === 12 && minutes >= 30) || hour === 13 || (hour === 14 && minutes === 0)) {
    const isWeekend = day === 0 || day === 6; // Dimanche ou samedi
    const baseScore = isWeekend ? 80 : 70;
    return {
      status: 'very_busy',
      score: baseScore + Math.floor(Math.random() * 15),
      message: '🔴 Très fréquenté (estimation)',
      estimation: true
    };
  }
  
  // Début service midi (11h - 12h30)
  if (hour === 11 || (hour === 12 && minutes < 30)) {
    return {
      status: 'not_busy',
      score: 25 + Math.floor(Math.random() * 20),
      message: '🟢 Peu fréquenté (estimation)',
      estimation: true
    };
  }
  
  // Après-midi creux (14h - 18h)
  if (hour >= 14 && hour < 18) {
    return {
      status: 'not_busy',
      score: 20 + Math.floor(Math.random() * 20),
      message: '🟢 Peu fréquenté (estimation)',
      estimation: true
    };
  }
  
  // Début de soirée (18h - 19h30)
  if (hour === 18 || (hour === 19 && minutes < 30)) {
    return {
      status: 'fairly_busy',
      score: 40 + Math.floor(Math.random() * 20),
      message: '🟠 Assez fréquenté (estimation)',
      estimation: true
    };
  }
  
  // Rush du soir (19h30 - 21h30)
  if ((hour === 19 && minutes >= 30) || hour === 20 || (hour === 21 && minutes < 30)) {
    const isWeekend = day === 5 || day === 6; // Vendredi ou samedi
    const baseScore = isWeekend ? 85 : 75;
    return {
      status: 'very_busy',
      score: baseScore + Math.floor(Math.random() * 12),
      message: '🔴 Très fréquenté (estimation)',
      estimation: true
    };
  }
  
  // Fin de soirée (21h30 - 23h30)
  if ((hour === 21 && minutes >= 30) || hour === 22 || hour === 23) {
    return {
      status: 'fairly_busy',
      score: 35 + Math.floor(Math.random() * 20),
      message: '🟠 Assez fréquenté (estimation)',
      estimation: true
    };
  }
  
  // Fallback
  return {
    status: 'fairly_busy',
    score: 40 + Math.floor(Math.random() * 20),
    message: '🟠 Assez fréquenté (estimation)',
    estimation: true
  };
}

// ========== FORMATTERS ==========
function formatBestTimeData(data) {
  // Adapter selon le format de réponse BestTime
  return {
    status: data.analysis?.live?.status || 'unknown',
    score: data.analysis?.live?.intensity || 0,
    message: data.analysis?.live?.description || 'Données BestTime',
    source: 'besttime_api'
  };
}

function formatGoogleData(data) {
  const statusMap = {
    'très animé': { status: 'very_busy', message: '🔴 Très fréquenté', score: 85 },
    'assez animé': { status: 'fairly_busy', message: '🟠 Assez fréquenté', score: 60 },
    'peu animé': { status: 'not_busy', message: '🟢 Peu fréquenté', score: 30 },
    'pas très fréquenté': { status: 'not_busy', message: '🟢 Peu fréquenté', score: 25 },
    'very busy': { status: 'very_busy', message: '🔴 Très fréquenté', score: 85 },
    'fairly busy': { status: 'fairly_busy', message: '🟠 Assez fréquenté', score: 60 },
    'not busy': { status: 'not_busy', message: '🟢 Peu fréquenté', score: 30 }
  };
  
  const statusKey = data.status.toLowerCase();
  for (const [key, value] of Object.entries(statusMap)) {
    if (statusKey.includes(key)) {
      return { ...value, source: 'google_scraping', raw: data.raw };
    }
  }
  
  return {
    status: 'unknown',
    score: 50,
    message: '⚪ ' + data.status,
    source: 'google_scraping'
  };
}

// ========== MAIN ==========
async function main() {
  console.log('='.repeat(50));
  console.log('📊 SCRAPER AFFLUENCE ROBUSTE');
  console.log('📍 Restaurant:', RESTAURANT_NAME);
  console.log('🕐 Heure:', new Date().toLocaleString('fr-FR'));
  console.log('='.repeat(50));
  
  let result = null;
  
  // Stratégie 1: API BestTime
  result = await tryBestTimeAPI();
  
  // Stratégie 2: Scraping Google
  if (!result) {
    result = await tryGoogleScraping();
  }
  
  // Stratégie 3: Estimation intelligente
  if (!result) {
    result = getSmartEstimate();
    console.log('📊 Estimation basée sur l\'heure actuelle');
  }
  
  // Construire les données finales
  const finalData = {
    timestamp: new Date().toISOString(),
    restaurant: RESTAURANT_NAME,
    placeId: PLACE_ID,
    status: result.status,
    score: result.score,
    message: result.message,
    source: result.source || 'estimation',
    isEstimation: result.estimation || false
  };
  
  // Sauvegarder
  const outputPath = path.join(process.cwd(), 'affluence-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));
  
  console.log('');
  console.log('='.repeat(50));
  console.log('📊 RÉSULTAT FINAL');
  console.log('='.repeat(50));
  console.log('Status:', finalData.status);
  console.log('Score:', finalData.score);
  console.log('Message:', finalData.message);
  console.log('Source:', finalData.source);
  console.log('💾 Sauvegardé:', outputPath);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
