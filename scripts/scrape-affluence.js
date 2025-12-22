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

      // ═══════════════════════════════════════════════════════════
      // 🔍 RECHERCHE DU STATUS EN TEMPS RÉEL (FR + EN)
      // ═══════════════════════════════════════════════════════════
      const allText = document.body.innerText.toLowerCase();
      
      // Textes français Google Maps 2024-2025
      if (allText.includes('très fréquenté')) {
        result.liveStatus = 'very_busy';
        result.livePercentage = 85;
      } else if (allText.includes('assez fréquenté') || allText.includes('plutôt fréquenté')) {
        result.liveStatus = 'fairly_busy';
        result.livePercentage = 65;
      } else if (allText.includes('pas très fréquenté') || allText.includes('peu fréquenté')) {
        result.liveStatus = 'not_busy';
        result.livePercentage = 35;
      } else if (allText.includes('habituellement pas très fréquenté') || allText.includes('généralement calme')) {
        result.liveStatus = 'usually_not_busy';
        result.livePercentage = 25;
      }
      
      // Textes anglais (fallback)
      if (!result.liveStatus) {
        if (allText.includes('as busy as it gets') || allText.includes('very busy')) {
          result.liveStatus = 'very_busy';
          result.livePercentage = 90;
        } else if (allText.includes('a little busy') || allText.includes('fairly busy')) {
          result.liveStatus = 'fairly_busy';
          result.livePercentage = 60;
        } else if (allText.includes('not too busy') || allText.includes('not busy')) {
          result.liveStatus = 'not_busy';
          result.livePercentage = 30;
        }
      }

      // Comparaison vs habituel
      if (allText.includes('plus fréquenté que d\'habitude') || allText.includes('busier than usual')) {
        result.trend = 'busier';
      } else if (allText.includes('moins fréquenté que d\'habitude') || allText.includes('less busy than usual')) {
        result.trend = 'less_busy';
      } else if (allText.includes('aussi fréquenté que d\'habitude') || allText.includes('as busy as usual')) {
        result.trend = 'normal';
      }

      // ═══════════════════════════════════════════════════════════
      // 📊 EXTRACTION DES BARRES DU GRAPHIQUE
      // ═══════════════════════════════════════════════════════════
      // Chercher les éléments avec aria-label contenant les pourcentages
      const allElements = document.querySelectorAll('[aria-label]');
      const hourlyData = {};
      
      allElements.forEach(el => {
        const label = el.getAttribute('aria-label') || '';
        // Patterns: "12 h. 45 % d'affluence" ou "12:00 PM 45% busy"
        const frMatch = label.match(/(\d{1,2})\s*h\.?\s*(\d{1,3})\s*%/i);
        const enMatch = label.match(/(\d{1,2})(?::\d{2})?\s*(?:AM|PM)?\s*(\d{1,3})\s*%/i);
        
        if (frMatch) {
          hourlyData[parseInt(frMatch[1])] = parseInt(frMatch[2]);
        } else if (enMatch) {
          hourlyData[parseInt(enMatch[1])] = parseInt(enMatch[2]);
        }
      });
      
      if (Object.keys(hourlyData).length > 0) {
        result.popularTimes = hourlyData;
        
        // Trouver l'heure actuelle dans les données
        const currentHour = new Date().getHours();
        if (hourlyData[currentHour]) {
          result.usualPercentage = hourlyData[currentHour];
        }
      }

      // ═══════════════════════════════════════════════════════════
      // 🔍 RECHERCHE ARIA-LABEL AVEC % D'AFFLUENCE ACTUEL
      // ═══════════════════════════════════════════════════════════
      allElements.forEach(el => {
        const label = el.getAttribute('aria-label') || '';
        // "Actuellement à 75 % de fréquentation" ou "Currently 75% busy"
        const currentMatch = label.match(/(?:actuellement|currently|en ce moment)[^\d]*(\d{1,3})\s*%/i);
        if (currentMatch) {
          result.livePercentage = parseInt(currentMatch[1]);
        }
      });

      // Stocker texte pour debug
      const busySection = document.body.innerText.match(/horaires d'affluence[\s\S]{0,500}/i);
      if (busySection) {
        result.raw.busySection = busySection[0].substring(0, 300);
      }

      return result;
    });

    // Enrichir les données
    data.placeId = PLACE_ID;
    data.scrapedAt = new Date().toISOString();
    
    // ═══════════════════════════════════════════════════════════
    // 📊 CALCUL DU SCORE FINAL
    // ═══════════════════════════════════════════════════════════
    
    // Mapping des status vers scores
    const statusScores = {
      'very_busy': 85,
      'fairly_busy': 65,
      'not_busy': 35,
      'usually_not_busy': 25
    };
    
    if (data.liveStatus && statusScores[data.liveStatus]) {
      data.score = data.livePercentage || statusScores[data.liveStatus];
      
      // Messages en français
      const messages = {
        'very_busy': '🔴 Très fréquenté',
        'fairly_busy': '🟠 Assez fréquenté', 
        'not_busy': '🟢 Peu fréquenté',
        'usually_not_busy': '🟢 Calme'
      };
      data.message = messages[data.liveStatus] || '📊 Affluence détectée';
      
      // Trend basé sur comparaison
      if (data.trend === 'busier') {
        data.message += ' (plus que d\'habitude)';
      } else if (data.trend === 'less_busy') {
        data.message += ' (moins que d\'habitude)';
      }
      
    } else if (data.livePercentage) {
      // On a un pourcentage mais pas de status textuel
      data.score = data.livePercentage;
      if (data.livePercentage >= 80) data.message = '🔴 Très fréquenté';
      else if (data.livePercentage >= 60) data.message = '🟠 Assez fréquenté';
      else if (data.livePercentage >= 40) data.message = '🟡 Modérément fréquenté';
      else data.message = '🟢 Peu fréquenté';
      
    } else {
      data.score = null;
      data.message = '⚪ Données non disponibles';
    }

    console.log('');
    console.log('📊 Résultats:');
    console.log(`   Status: ${data.liveStatus || 'inconnu'}`);
    console.log(`   Score: ${data.score || 'N/A'}%`);
    console.log(`   Live %: ${data.livePercentage || 'N/A'}`);
    console.log(`   Trend: ${data.trend || 'inconnu'}`);
    console.log(`   Message: ${data.message}`);
    if (data.popularTimes) {
      console.log(`   Popular Times: ${Object.keys(data.popularTimes).length} heures détectées`);
    }
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
