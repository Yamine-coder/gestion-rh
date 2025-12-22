/**
 * 📊 Scraper Google Popular Times
 * Tourne sur GitHub Actions (pas sur Render)
 * Récupère l'affluence en temps réel de Google Maps
 */

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');

// Configuration
const PLACE_ID = process.env.PLACE_ID || 'ChIJnYLnmZly5kcRgpLV4MN4Rus';
const PLACE_NAME = 'Chez Antoine Vincennes';

// URL Google Maps avec Place ID
const MAPS_URL = `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`;

async function scrapeAffluence() {
  console.log('🔍 Démarrage scraping affluence...');
  console.log(`📍 Restaurant: ${PLACE_NAME}`);
  console.log(`🆔 Place ID: ${PLACE_ID}`);
  console.log(`🌐 URL: ${MAPS_URL}`);
  console.log('');

  let browser;
  
  try {
    // Lancer Chrome headless
    console.log('🚀 Lancement navigateur...');
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // User agent réaliste
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Bloquer les images et CSS pour aller plus vite
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log('📄 Chargement page Google Maps...');
    await page.goto(MAPS_URL, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Accepter les cookies si demandé
    try {
      const acceptButton = await page.$('button[aria-label*="Accepter"]');
      if (acceptButton) {
        await acceptButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // Pas de popup cookies, on continue
    }

    // Attendre que la page se charge
    await page.waitForTimeout(3000);

    console.log('🔎 Recherche données affluence...');

    // Extraire les données
    const data = await page.evaluate(() => {
      const result = {
        timestamp: new Date().toISOString(),
        placeId: null,
        placeName: null,
        liveStatus: null,
        livePercentage: null,
        usualPercentage: null,
        waitTime: null,
        popularTimes: null,
        raw: {}
      };

      // Nom du lieu
      const nameEl = document.querySelector('h1');
      if (nameEl) result.placeName = nameEl.textContent.trim();

      // Chercher le texte "busy" / "fréquenté"
      const allText = document.body.innerText;
      
      // "Plus fréquenté que d'habitude" / "Less busy than usual"
      if (allText.includes('Plus fréquenté que d\'habitude') || allText.includes('busier than usual')) {
        result.liveStatus = 'busier';
      } else if (allText.includes('Moins fréquenté que d\'habitude') || allText.includes('less busy than usual')) {
        result.liveStatus = 'less_busy';
      } else if (allText.includes('Aussi fréquenté que d\'habitude') || allText.includes('as busy as usual')) {
        result.liveStatus = 'normal';
      }

      // Chercher pourcentage dans les aria-label
      const busyBars = document.querySelectorAll('[aria-label*="%"]');
      busyBars.forEach(bar => {
        const label = bar.getAttribute('aria-label') || '';
        const match = label.match(/(\d+)\s*%/);
        if (match) {
          const pct = parseInt(match[1]);
          // "Currently 65% busy" ou "À 65% de l'affluence"
          if (label.toLowerCase().includes('current') || label.toLowerCase().includes('actuel')) {
            result.livePercentage = pct;
          }
        }
      });

      // Chercher les Popular Times (graphique)
      const hourBars = document.querySelectorAll('[data-hour]');
      if (hourBars.length > 0) {
        result.popularTimes = {};
        hourBars.forEach(bar => {
          const hour = bar.getAttribute('data-hour');
          const heightStyle = bar.style.height;
          if (hour && heightStyle) {
            result.popularTimes[hour] = parseInt(heightStyle);
          }
        });
      }

      // Stocker le texte brut pour debug
      const relevantDivs = document.querySelectorAll('[class*="busy"], [class*="popular"], [aria-label*="busy"], [aria-label*="fréquent"]');
      relevantDivs.forEach((div, i) => {
        result.raw[`div_${i}`] = div.innerText.substring(0, 200);
      });

      return result;
    });

    // Enrichir les données
    data.placeId = PLACE_ID;
    data.scrapedAt = new Date().toISOString();
    
    // Calculer un score simplifié
    if (data.liveStatus === 'busier') {
      data.score = data.livePercentage || 80;
      data.trend = 'up';
      data.message = '🔴 Plus chargé que d\'habitude';
    } else if (data.liveStatus === 'less_busy') {
      data.score = data.livePercentage || 30;
      data.trend = 'down';
      data.message = '🟢 Moins chargé que d\'habitude';
    } else if (data.liveStatus === 'normal') {
      data.score = data.livePercentage || 50;
      data.trend = 'stable';
      data.message = '🟡 Affluence normale';
    } else {
      data.score = null;
      data.trend = 'unknown';
      data.message = '⚪ Données non disponibles';
    }

    console.log('');
    console.log('📊 Résultats:');
    console.log(`   Status: ${data.liveStatus || 'inconnu'}`);
    console.log(`   Score: ${data.score || 'N/A'}%`);
    console.log(`   Message: ${data.message}`);
    console.log('');

    // Sauvegarder en JSON
    const outputPath = './affluence-data.json';
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`💾 Données sauvegardées: ${outputPath}`);

    return data;

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    // Sauvegarder un JSON d'erreur
    const errorData = {
      timestamp: new Date().toISOString(),
      placeId: PLACE_ID,
      error: true,
      errorMessage: error.message,
      score: null,
      trend: 'error',
      message: '⚠️ Erreur de récupération'
    };
    
    fs.writeFileSync('./affluence-data.json', JSON.stringify(errorData, null, 2));
    throw error;
    
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Navigateur fermé');
    }
  }
}

// Exécuter
scrapeAffluence()
  .then(() => {
    console.log('✅ Scraping terminé avec succès');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Scraping échoué:', err.message);
    process.exit(1);
  });
