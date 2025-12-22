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
      waitUntil: 'networkidle0',
      timeout: 45000 
    });

    // Attendre un peu
    await new Promise(r => setTimeout(r, randomDelay(2000, 3000)));

    // ═══════════════════════════════════════════════════════════
    // 📱 FERMER POPUP "OUVRIR L'APPLICATION"
    // ═══════════════════════════════════════════════════════════
    console.log('📱 Recherche popup "Ouvrir l\'application"...');
    
    // Attendre que la page soit bien chargée
    await new Promise(r => setTimeout(r, 2000));
    
    // Screenshot AVANT tentative de fermeture
    await page.screenshot({ path: './debug-before-popup.png', fullPage: false });
    
    try {
      // Méthode 1: XPath pour trouver le texte exact
      const stayOnWebClicked = await page.evaluate(() => {
        // Chercher dans tous les éléments cliquables
        const allClickable = document.querySelectorAll('button, a, div[role="button"], span[role="button"]');
        
        for (const el of allClickable) {
          const text = el.textContent.trim().toLowerCase();
          console.log('Found clickable:', text.substring(0, 50));
          
          // Textes français et anglais
          if (text === 'rester sur le web' || 
              text.includes('rester sur le') ||
              text === 'stay on web' ||
              text === 'use web version' ||
              text === 'continuer sur le web') {
            el.click();
            return { clicked: true, text: text };
          }
        }
        
        // Chercher aussi dans les div avec du texte
        const allDivs = document.querySelectorAll('div');
        for (const div of allDivs) {
          if (div.children.length === 0) { // Div sans enfants = texte direct
            const text = div.textContent.trim().toLowerCase();
            if (text === 'rester sur le web' || text.includes('rester sur le')) {
              div.click();
              return { clicked: true, text: text };
            }
          }
        }
        
        return { clicked: false };
      });
      
      if (stayOnWebClicked.clicked) {
        console.log(`✅ Popup fermé! Cliqué sur: "${stayOnWebClicked.text}"`);
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.log('⚠️ Bouton "Rester sur le Web" non trouvé, essai méthode 2...');
        
        // Méthode 2: Cliquer sur le premier bouton qui n'est PAS "Continuer" (bleu)
        const clickedAlt = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            const text = btn.textContent.trim().toLowerCase();
            // Éviter le bouton "Continuer" qui ouvre l'app
            if (!text.includes('continuer') && !text.includes('continue') && !text.includes('ouvrir')) {
              if (text.length > 0 && text.length < 30) {
                btn.click();
                return { clicked: true, text: text };
              }
            }
          }
          return { clicked: false };
        });
        
        if (clickedAlt.clicked) {
          console.log(`✅ Méthode 2: Cliqué sur "${clickedAlt.text}"`);
          await new Promise(r => setTimeout(r, 3000));
        } else {
          console.log('⚠️ Méthode 2 échouée, essai méthode 3 (dismiss)...');
          
          // Méthode 3: Cliquer en dehors du popup pour le fermer
          await page.mouse.click(10, 10);
          await new Promise(r => setTimeout(r, 1000));
          
          // Méthode 4: Touche Escape
          await page.keyboard.press('Escape');
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    } catch (e) {
      console.log('📱 Erreur popup:', e.message);
    }
    
    // Screenshot APRÈS tentative
    await page.screenshot({ path: './debug-after-popup.png', fullPage: false });
    console.log('📸 Screenshots popup sauvegardés');

    // ═══════════════════════════════════════════════════════════
    // 🍪 GESTION CONSENTEMENT GOOGLE (GDPR)
    // ═══════════════════════════════════════════════════════════
    console.log('🍪 Recherche popup consentement...');
    
    // Vérifier si on est sur une page de consentement
    const currentUrl = page.url();
    console.log(`📍 URL actuelle: ${currentUrl}`);
    
    if (currentUrl.includes('consent.google') || currentUrl.includes('consent')) {
      console.log('🍪 Page de consentement détectée!');
    }

    // Essayer plusieurs méthodes pour accepter
    const consentMethods = [
      // Méthode 1: Boutons avec texte français
      async () => {
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await btn.evaluate(el => el.textContent.toLowerCase());
          if (text.includes('tout accepter') || text.includes('accept all') || text.includes('accepter')) {
            console.log('🍪 Bouton "Accepter" trouvé (texte)');
            await btn.click();
            return true;
          }
        }
        return false;
      },
      // Méthode 2: aria-label
      async () => {
        const selectors = [
          'button[aria-label*="Accepter"]',
          'button[aria-label*="Accept"]',
          'button[aria-label*="accepter"]',
          '[aria-label*="Tout accepter"]'
        ];
        for (const sel of selectors) {
          const btn = await page.$(sel);
          if (btn) {
            console.log(`🍪 Bouton trouvé: ${sel}`);
            await btn.click();
            return true;
          }
        }
        return false;
      },
      // Méthode 3: Premier bouton principal
      async () => {
        // Google consent a souvent le bouton accepter comme premier bouton bleu
        const btn = await page.$('button.VfPpkd-LgbsSe-OWXEXe-k8QpJ');
        if (btn) {
          console.log('🍪 Bouton principal Google trouvé');
          await btn.click();
          return true;
        }
        return false;
      },
      // Méthode 4: Form submit
      async () => {
        const form = await page.$('form[action*="consent"]');
        if (form) {
          const submitBtn = await form.$('button[type="submit"], button');
          if (submitBtn) {
            console.log('🍪 Form consent trouvé');
            await submitBtn.click();
            return true;
          }
        }
        return false;
      },
      // Méthode 5: JavaScript direct
      async () => {
        const clicked = await page.evaluate(() => {
          // Chercher tous les boutons
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const btn of buttons) {
            const text = btn.textContent.toLowerCase();
            const label = (btn.getAttribute('aria-label') || '').toLowerCase();
            if (text.includes('accept') || text.includes('accepter') || 
                label.includes('accept') || label.includes('accepter')) {
              btn.click();
              return true;
            }
          }
          return false;
        });
        if (clicked) console.log('🍪 Click via JS');
        return clicked;
      }
    ];

    // Essayer chaque méthode
    for (const method of consentMethods) {
      try {
        const success = await method();
        if (success) {
          console.log('✅ Consentement accepté!');
          await new Promise(r => setTimeout(r, 3000));
          
          // Vérifier qu'on est bien sur Maps maintenant
          const newUrl = page.url();
          console.log(`📍 Nouvelle URL: ${newUrl}`);
          
          if (!newUrl.includes('maps')) {
            // Recharger la page Maps
            console.log('🔄 Rechargement page Maps...');
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
            await new Promise(r => setTimeout(r, 3000));
          }
          break;
        }
      } catch (e) {
        // Continuer avec la méthode suivante
      }
    }

    // Screenshot après consentement
    console.log('📸 Screenshot après consentement...');
    await page.screenshot({ path: './debug-after-consent.png', fullPage: false });

    // ═══════════════════════════════════════════════════════════
    // 📜 SCROLL DANS LE PANNEAU LATÉRAL GOOGLE MAPS
    // ═══════════════════════════════════════════════════════════
    console.log('📜 Scroll dans le panneau latéral pour trouver Popular Times...');
    
    // Méthode 1: Cliquer sur le panneau puis utiliser mouse wheel
    // Le panneau Google Maps est généralement à gauche (x < 400)
    await page.mouse.click(200, 400); // Cliquer au milieu du panneau
    await new Promise(r => setTimeout(r, 500));
    
    // Scroll avec la molette de souris
    let scrolled = 0;
    let found = false;
    
    for (let i = 0; i < 15; i++) { // 15 scrolls
      await page.mouse.wheel({ deltaY: 500 }); // Scroll de 500px
      scrolled += 500;
      await new Promise(r => setTimeout(r, 400));
      
      // Vérifier si on a trouvé les données
      const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
      if (pageText.includes('horaires d\'affluence') || 
          pageText.includes('très fréquenté') ||
          pageText.includes('assez fréquenté') ||
          pageText.includes('informations en temps réel')) {
        found = true;
        console.log(`✅ Section affluence trouvée après ${scrolled}px de scroll!`);
        break;
      }
    }
    
    if (!found) {
      console.log(`⚠️ Section affluence non trouvée après ${scrolled}px de scroll`);
      
      // Méthode 2: Essayer de cliquer sur l'onglet "À propos" puis revenir
      console.log('📜 Tentative: clic sur onglet À propos...');
      try {
        const aboutClicked = await page.evaluate(() => {
          const tabs = document.querySelectorAll('button[role="tab"], [role="tab"]');
          for (const tab of tabs) {
            if (tab.textContent.toLowerCase().includes('propos') || 
                tab.textContent.toLowerCase().includes('about')) {
              tab.click();
              return true;
            }
          }
          return false;
        });
        
        if (aboutClicked) {
          await new Promise(r => setTimeout(r, 1500));
          // Revenir à Présentation
          await page.evaluate(() => {
            const tabs = document.querySelectorAll('button[role="tab"], [role="tab"]');
            for (const tab of tabs) {
              if (tab.textContent.toLowerCase().includes('présentation') || 
                  tab.textContent.toLowerCase().includes('overview')) {
                tab.click();
                return true;
              }
            }
          });
          await new Promise(r => setTimeout(r, 1500));
          
          // Re-scroll
          await page.mouse.click(200, 400);
          for (let i = 0; i < 10; i++) {
            await page.mouse.wheel({ deltaY: 500 });
            await new Promise(r => setTimeout(r, 300));
          }
        }
      } catch (e) {
        console.log('⚠️ Erreur onglet:', e.message);
      }
    }
    
    const scrollResult = { found, scrolled };
    console.log(`📜 Scroll result: ${JSON.stringify(scrollResult)}`);
    
    // Attendre que le contenu se charge
    await new Promise(r => setTimeout(r, 2000));
    
    // Screenshot après scroll
    await page.screenshot({ path: './debug-after-scroll.png', fullPage: false });

    // ═══════════════════════════════════════════════════════════
    // 📸 SCREENSHOT DEBUG FINAL
    // ═══════════════════════════════════════════════════════════
    console.log('📸 Capture screenshot debug final...');
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
        bodyTextSample: '',
        foundElements: [],
        debugTexts: []
      };

      // Nom du lieu
      const nameEl = document.querySelector('h1');
      if (nameEl) result.placeName = nameEl.textContent.trim();

      // Récupérer tout le texte de la page
      const allText = document.body.innerText;
      const allTextLower = allText.toLowerCase();
      
      // Debug: chercher la section "Horaires d'affluence"
      const affluenceIndex = allTextLower.indexOf('horaires d');
      if (affluenceIndex > -1) {
        result.debugTexts.push('✅ Found "Horaires d\'affluence"');
        // Extraire le contexte autour
        const context = allText.substring(affluenceIndex, affluenceIndex + 200);
        result.bodyTextSample = context;
        result.foundElements.push(`Context: ${context.substring(0, 100)}`);
      }
      
      // Debug: chercher "INFORMATIONS EN TEMPS RÉEL"
      if (allTextLower.includes('informations en temps') || allTextLower.includes('temps réel')) {
        result.debugTexts.push('✅ Found "INFORMATIONS EN TEMPS RÉEL"');
      }
      
      // ═══════════════════════════════════════════════════════════
      // 🔍 PATTERNS FRANÇAIS GOOGLE MAPS (améliorés)
      // ═══════════════════════════════════════════════════════════
      
      // Status en temps réel - patterns plus flexibles
      const patterns = [
        { regex: /tr[eè]s\s+fr[ée]quent[ée]/i, status: 'very_busy', percent: 85 },
        { regex: /assez\s+fr[ée]quent[ée]/i, status: 'fairly_busy', percent: 65 },
        { regex: /plut[oô]t\s+fr[ée]quent[ée]/i, status: 'fairly_busy', percent: 60 },
        { regex: /pas\s+tr[eè]s\s+fr[ée]quent[ée]/i, status: 'not_busy', percent: 35 },
        { regex: /peu\s+fr[ée]quent[ée]/i, status: 'not_busy', percent: 30 },
        { regex: /habituellement\s+calme/i, status: 'not_busy', percent: 25 },
        // NE PAS matcher "Ferme à" (horaires) - seulement "Actuellement fermé"
        { regex: /actuellement\s+ferm[ée]/i, status: 'closed', percent: 0 },
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
          result.debugTexts.push(`✅ Matched: ${regex.toString()} -> ${status}`);
          break;
        }
      }
      
      // Si pas trouvé avec regex, chercher le texte brut
      if (!result.liveStatus) {
        if (allText.includes('Très fréquenté')) {
          result.liveStatus = 'very_busy';
          result.livePercentage = 85;
          result.debugTexts.push('✅ Found exact "Très fréquenté"');
        } else if (allText.includes('Assez fréquenté')) {
          result.liveStatus = 'fairly_busy';
          result.livePercentage = 65;
          result.debugTexts.push('✅ Found exact "Assez fréquenté"');
        } else if (allText.includes('Peu fréquenté')) {
          result.liveStatus = 'not_busy';
          result.livePercentage = 35;
          result.debugTexts.push('✅ Found exact "Peu fréquenté"');
        }
      }

      // Comparaison vs habituel
      if (/plus.{0,10}fr[ée]quent[ée].{0,10}que.{0,10}d'habitude|busier than usual/i.test(allText)) {
        result.trend = 'busier';
      } else if (/moins.{0,10}fr[ée]quent[ée].{0,10}que.{0,10}d'habitude|less busy than usual/i.test(allText)) {
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
      debugTexts: extractedData.debugTexts,
      mode: isMobile ? 'mobile' : 'desktop',
      userAgent: userAgent.substring(0, 50)
    };

    // Afficher les debug texts
    if (extractedData.debugTexts && extractedData.debugTexts.length > 0) {
      console.log('');
      console.log('🔍 Debug détection:');
      extractedData.debugTexts.forEach(t => console.log(`   ${t}`));
    }
    
    if (extractedData.bodyTextSample) {
      console.log('');
      console.log('📝 Contexte trouvé:');
      console.log(`   "${extractedData.bodyTextSample.substring(0, 150)}..."`);
    }

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
