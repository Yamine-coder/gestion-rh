/**
 * 📊 Scraper Google Popular Times - Version STEALTH
 * Techniques anti-détection pour contourner le blocage Google
 */

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');

// Configuration
const PLACE_ID = process.env.PLACE_ID || 'ChIJnYLnmZly5kcRgpLV4MN4Rus';
const PLACE_NAME = 'Chez Antoine Vincennes';

// URLs à tester
const URLS = [
  // URL mobile (souvent moins bloquée)
  `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`,
  // Recherche directe
  `https://www.google.com/maps/search/Chez+Antoine+Vincennes`,
  // URL avec coordonnées
  `https://www.google.com/maps/search/?api=1&query=Chez+Antoine+Vincennes&query_place_id=${PLACE_ID}`
];

// User agents mobiles réalistes (2024)
const MOBILE_USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
];

// User agents desktop réalistes
const DESKTOP_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

// Délai aléatoire entre min et max (ms)
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Sélection aléatoire dans un tableau
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function scrapeAffluence() {
  console.log('🕵️ Démarrage scraping STEALTH...');
  console.log(`📍 Restaurant: ${PLACE_NAME}`);
  console.log(`🆔 Place ID: ${PLACE_ID}`);
  console.log('');

  let browser;
  let data = {
    timestamp: new Date().toISOString(),
    placeId: PLACE_ID,
    placeName: null,
    liveStatus: null,
    livePercentage: null,
    usualPercentage: null,
    popularTimes: null,
    trend: null,
    raw: {},
    debug: {}
  };
  
  try {
    // ═══════════════════════════════════════════════════════════
    // 🚀 LANCEMENT NAVIGATEUR STEALTH
    // ═══════════════════════════════════════════════════════════
    console.log('🚀 Lancement navigateur stealth...');
    
    // Arguments Chrome anti-détection
    const stealthArgs = [
      ...chromium.args,
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--no-zygote',
      '--deterministic-fetch',
      '--disable-features=site-per-process',
      '--disable-dev-shm-usage',
      '--lang=fr-FR,fr',
      '--accept-lang=fr-FR,fr;q=0.9,en;q=0.8'
    ];

    browser = await puppeteer.launch({
      args: stealthArgs,
      defaultViewport: null,
      executablePath: await chromium.executablePath(),
      headless: 'new',
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();

    // ═══════════════════════════════════════════════════════════
    // 🎭 CONFIGURATION STEALTH
    // ═══════════════════════════════════════════════════════════
    
    // Choisir mode mobile ou desktop aléatoirement
    const isMobile = Math.random() > 0.5;
    const userAgent = isMobile ? randomChoice(MOBILE_USER_AGENTS) : randomChoice(DESKTOP_USER_AGENTS);
    
    console.log(`📱 Mode: ${isMobile ? 'Mobile' : 'Desktop'}`);
    console.log(`🎭 User-Agent: ${userAgent.substring(0, 50)}...`);
    
    await page.setUserAgent(userAgent);
    
    // Viewport réaliste
    if (isMobile) {
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    } else {
      await page.setViewport({ width: 1920, height: 1080, isMobile: false });
    }
    
    // Headers HTTP réalistes
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': isMobile ? '?1' : '?0',
      'sec-ch-ua-platform': isMobile ? '"Android"' : '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    });

    // ═══════════════════════════════════════════════════════════
    // 🎭 INJECTION ANTI-DÉTECTION
    // ═══════════════════════════════════════════════════════════
    await page.evaluateOnNewDocument(() => {
      // Masquer webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Masquer automation
      delete navigator.__proto__.webdriver;
      
      // Fake plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ]
      });
      
      // Fake languages
      Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] });
      
      // Fake platform
      Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
      
      // Chrome runtime
      window.chrome = { runtime: {} };
      
      // Permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);
    });

    // ═══════════════════════════════════════════════════════════
    // 📄 CHARGEMENT PAGE
    // ═══════════════════════════════════════════════════════════
    const url = URLS[0];
    console.log(`🌐 Chargement: ${url}`);
    
    // Délai initial aléatoire (simule comportement humain)
    await new Promise(r => setTimeout(r, randomDelay(500, 1500)));
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // Attendre un peu
    await new Promise(r => setTimeout(r, randomDelay(2000, 4000)));

    // ═══════════════════════════════════════════════════════════
    // 🍪 ACCEPTER COOKIES
    // ═══════════════════════════════════════════════════════════
    try {
      // Sélecteurs possibles pour le bouton accepter
      const cookieSelectors = [
        'button[aria-label*="Accepter"]',
        'button[aria-label*="Accept"]',
        'button:has-text("Tout accepter")',
        'button:has-text("Accept all")',
        '[data-ved] button:first-child',
        '.VfPpkd-LgbsSe'
      ];
      
      for (const selector of cookieSelectors) {
        try {
          const btn = await page.$(selector);
          if (btn) {
            console.log('🍪 Cookie popup trouvé, click...');
            await btn.click();
            await new Promise(r => setTimeout(r, randomDelay(1000, 2000)));
            break;
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log('🍪 Pas de popup cookies');
    }

    // ═══════════════════════════════════════════════════════════
    // 📜 SCROLL POUR CHARGER LE CONTENU
    // ═══════════════════════════════════════════════════════════
    console.log('📜 Scroll pour charger le contenu...');
    
    // Simuler un scroll humain
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= 1000) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    
    await new Promise(r => setTimeout(r, randomDelay(2000, 3000)));

    // ═══════════════════════════════════════════════════════════
    // 📸 SCREENSHOT DEBUG
    // ═══════════════════════════════════════════════════════════
    console.log('📸 Capture screenshot debug...');
    await page.screenshot({ 
      path: './debug-screenshot.png',
      fullPage: false
    });

    // ═══════════════════════════════════════════════════════════
    // 🔍 EXTRACTION DONNÉES
    // ═══════════════════════════════════════════════════════════
    console.log('🔎 Recherche données affluence...');

    const extractedData = await page.evaluate(() => {
      const result = {
        placeName: null,
        liveStatus: null,
        livePercentage: null,
        usualPercentage: null,
        popularTimes: {},
        trend: null,
        pageTitle: document.title,
        bodyTextSample: document.body.innerText.substring(0, 2000),
        foundElements: []
      };

      // Nom du lieu
      const nameEl = document.querySelector('h1');
      if (nameEl) result.placeName = nameEl.textContent.trim();

      // Récupérer tout le texte de la page
      const allText = document.body.innerText.toLowerCase();
      
      // ═══════════════════════════════════════════════════════════
      // 🔍 PATTERNS FRANÇAIS GOOGLE MAPS
      // ═══════════════════════════════════════════════════════════
      
      // Status en temps réel
      const patterns = [
        { regex: /très fréquenté/i, status: 'very_busy', percent: 85 },
        { regex: /assez fréquenté/i, status: 'fairly_busy', percent: 65 },
        { regex: /plutôt fréquenté/i, status: 'fairly_busy', percent: 60 },
        { regex: /pas très fréquenté/i, status: 'not_busy', percent: 35 },
        { regex: /peu fréquenté/i, status: 'not_busy', percent: 30 },
        { regex: /calme/i, status: 'not_busy', percent: 25 },
        // Anglais fallback
        { regex: /very busy/i, status: 'very_busy', percent: 85 },
        { regex: /fairly busy/i, status: 'fairly_busy', percent: 60 },
        { regex: /not.{0,5}busy/i, status: 'not_busy', percent: 30 },
        { regex: /as busy as it gets/i, status: 'very_busy', percent: 95 }
      ];

      for (const { regex, status, percent } of patterns) {
        if (regex.test(allText)) {
          result.liveStatus = status;
          result.livePercentage = percent;
          result.foundElements.push(`Pattern: ${regex.toString()}`);
          break;
        }
      }

      // Comparaison vs habituel
      if (/plus.{0,10}fréquenté.{0,10}que.{0,10}d'habitude|busier than usual/i.test(allText)) {
        result.trend = 'busier';
      } else if (/moins.{0,10}fréquenté.{0,10}que.{0,10}d'habitude|less busy than usual/i.test(allText)) {
        result.trend = 'less_busy';
      }

      // ═══════════════════════════════════════════════════════════
      // 📊 EXTRACTION BARRES DU GRAPHIQUE
      // ═══════════════════════════════════════════════════════════
      
      // Chercher aria-label avec pourcentages
      document.querySelectorAll('[aria-label]').forEach(el => {
        const label = el.getAttribute('aria-label') || '';
        
        // Pattern FR: "12 h. 45 % d'affluence"
        const frMatch = label.match(/(\d{1,2})\s*h\.?\s*(\d{1,3})\s*%/i);
        if (frMatch) {
          result.popularTimes[parseInt(frMatch[1])] = parseInt(frMatch[2]);
          result.foundElements.push(`aria-label FR: ${label.substring(0, 50)}`);
        }
        
        // Pattern EN: "12:00 PM 45% busy"
        const enMatch = label.match(/(\d{1,2})(?::\d{2})?\s*(?:AM|PM)\s*(\d{1,3})%/i);
        if (enMatch) {
          result.popularTimes[parseInt(enMatch[1])] = parseInt(enMatch[2]);
          result.foundElements.push(`aria-label EN: ${label.substring(0, 50)}`);
        }

        // Pattern pourcentage actuel
        const currentMatch = label.match(/(?:actuellement|currently|en ce moment)[^\d]*(\d{1,3})\s*%/i);
        if (currentMatch) {
          result.livePercentage = parseInt(currentMatch[1]);
          result.foundElements.push(`Live %: ${label.substring(0, 50)}`);
        }
      });

      // Chercher les barres du graphique par leur style height
      document.querySelectorAll('[style*="height"]').forEach(el => {
        const style = el.getAttribute('style');
        const heightMatch = style.match(/height:\s*(\d+)/);
        if (heightMatch && parseInt(heightMatch[1]) > 5 && parseInt(heightMatch[1]) <= 100) {
          result.foundElements.push(`Bar height: ${heightMatch[1]}`);
        }
      });

      // ═══════════════════════════════════════════════════════════
      // 🔍 RECHERCHE TEXTE "INFORMATIONS EN TEMPS RÉEL"
      // ═══════════════════════════════════════════════════════════
      if (allText.includes('informations en temps réel') || allText.includes('live')) {
        result.foundElements.push('Found: LIVE indicator');
      }
      
      if (allText.includes('horaires d\'affluence') || allText.includes('popular times')) {
        result.foundElements.push('Found: Popular Times section');
      }

      return result;
    });

    // Merger les données
    data.placeName = extractedData.placeName;
    data.liveStatus = extractedData.liveStatus;
    data.livePercentage = extractedData.livePercentage;
    data.usualPercentage = extractedData.usualPercentage;
    data.trend = extractedData.trend;
    data.popularTimes = Object.keys(extractedData.popularTimes).length > 0 ? extractedData.popularTimes : null;
    data.debug = {
      pageTitle: extractedData.pageTitle,
      bodyTextSample: extractedData.bodyTextSample.substring(0, 500),
      foundElements: extractedData.foundElements,
      mode: isMobile ? 'mobile' : 'desktop',
      userAgent: userAgent.substring(0, 50)
    };

    // ═══════════════════════════════════════════════════════════
    // 📊 CALCUL SCORE FINAL
    // ═══════════════════════════════════════════════════════════
    data.scrapedAt = new Date().toISOString();
    
    const statusScores = {
      'very_busy': 85,
      'fairly_busy': 65,
      'not_busy': 35
    };
    
    if (data.liveStatus && statusScores[data.liveStatus]) {
      data.score = data.livePercentage || statusScores[data.liveStatus];
      const messages = {
        'very_busy': '🔴 Très fréquenté',
        'fairly_busy': '🟠 Assez fréquenté', 
        'not_busy': '🟢 Peu fréquenté'
      };
      data.message = messages[data.liveStatus];
      
      if (data.trend === 'busier') {
        data.message += ' (plus que d\'habitude)';
      } else if (data.trend === 'less_busy') {
        data.message += ' (moins que d\'habitude)';
      }
    } else {
      data.score = null;
      data.message = '⚪ Données non disponibles';
    }

    // ═══════════════════════════════════════════════════════════
    // 📝 RÉSULTATS
    // ═══════════════════════════════════════════════════════════
    console.log('');
    console.log('📊 Résultats:');
    console.log(`   Place: ${data.placeName || 'inconnu'}`);
    console.log(`   Status: ${data.liveStatus || 'inconnu'}`);
    console.log(`   Score: ${data.score || 'N/A'}%`);
    console.log(`   Live %: ${data.livePercentage || 'N/A'}`);
    console.log(`   Trend: ${data.trend || 'inconnu'}`);
    console.log(`   Message: ${data.message}`);
    console.log(`   Popular Times: ${data.popularTimes ? Object.keys(data.popularTimes).length + ' heures' : 'N/A'}`);
    console.log(`   Debug elements: ${data.debug.foundElements?.length || 0} trouvés`);
    console.log('');

    if (data.debug.foundElements?.length > 0) {
      console.log('🔍 Éléments trouvés:');
      data.debug.foundElements.forEach(el => console.log(`   - ${el}`));
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    data.error = error.message;
    data.score = null;
    data.message = '⚪ Erreur de scraping';
  } finally {
    if (browser) {
      console.log('🔒 Fermeture navigateur...');
      await browser.close();
    }
  }

  // Sauvegarder
  fs.writeFileSync('./affluence-data.json', JSON.stringify(data, null, 2));
  console.log('💾 Données sauvegardées: ./affluence-data.json');
  console.log('✅ Scraping terminé');

  return data;
}

// Exécution
scrapeAffluence().catch(console.error);
