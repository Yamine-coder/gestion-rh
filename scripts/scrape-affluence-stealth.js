/**
 * 📊 Scraper Google Popular Times - Version STEALTH v2
 * Techniques anti-détection pour contourner le blocage Google
 * FIX: Recherche par nom + adresse au lieu de Place ID
 */

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');

// Configuration - COORDONNÉES EXACTES DE CHEZ ANTOINE VINCENNES
const RESTAURANT_NAME = process.env.RESTAURANT_NAME || 'Chez Antoine Vincennes';
const RESTAURANT_ADDRESS = process.env.RESTAURANT_ADDRESS || '2 Avenue de la République 94300 Vincennes';
const LATITUDE = '48.8463257';
const LONGITUDE = '2.4290377';

// Place ID correct (de https://search.google.com/local/writereview?placeid=...)
const PLACE_ID = process.env.PLACE_ID || 'ChIJnYLnmZly5kcRgpLV4MN4Rus';

// URLs à tester
const URLS = [
  // Format direct avec Place ID (LE PLUS FIABLE)
  `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`,
  // Recherche simple par nom (fallback)
  `https://www.google.com/maps/search/Chez+Antoine+Vincennes+France`,
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
  console.log('🕵️ Démarrage scraping STEALTH v2...');
  console.log(`📍 Restaurant: ${RESTAURANT_NAME}`);
  console.log(`📫 Adresse: ${RESTAURANT_ADDRESS}`);
  console.log(`🌍 Coordonnées: ${LATITUDE}, ${LONGITUDE}`);
  console.log(`🔑 Place ID: ${PLACE_ID}`);
  console.log('');

  let browser;
  let data = {
    timestamp: new Date().toISOString(),
    restaurantName: RESTAURANT_NAME,
    placeId: PLACE_ID,
    coordinates: { lat: LATITUDE, lng: LONGITUDE },
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
    
    // FORCER MODE MOBILE - plus fiable pour le scraping des Popular Times
    const isMobile = true;
    const userAgent = randomChoice(MOBILE_USER_AGENTS);
    
    console.log(`📱 Mode: Mobile (forcé)`);
    console.log(`🎭 User-Agent: ${userAgent.substring(0, 50)}...`);
    
    await page.setUserAgent(userAgent);
    
    // Viewport mobile
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    
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
    // � CLIQUER SUR LE PREMIER RÉSULTAT DE RECHERCHE
    // ═══════════════════════════════════════════════════════════
    console.log('🔍 Recherche du premier résultat...');
    
    try {
      // Attendre que les résultats apparaissent
      await page.waitForSelector('a[href*="/maps/place/"]', { timeout: 10000 });
      
      // Cliquer sur le premier résultat qui contient "Antoine"
      const clicked = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/maps/place/"]');
        for (const link of links) {
          const text = link.textContent.toLowerCase();
          if (text.includes('antoine') || text.includes('chez')) {
            link.click();
            return { clicked: true, text: link.textContent.substring(0, 50) };
          }
        }
        // Sinon cliquer sur le premier résultat
        if (links.length > 0) {
          links[0].click();
          return { clicked: true, text: links[0].textContent.substring(0, 50) };
        }
        return { clicked: false };
      });
      
      if (clicked.clicked) {
        console.log(`✅ Cliqué sur: "${clicked.text}"`);
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.log('⚠️ Aucun résultat trouvé, la page est peut-être déjà sur le lieu');
      }
    } catch (e) {
      console.log('📍 Page de lieu directe (pas de résultats de recherche)');
    }

    // ═══════════════════════════════════════════════════════════
    // �📱 FERMER POPUP "OUVRIR L'APPLICATION"
    // ═══════════════════════════════════════════════════════════
    console.log('📱 Recherche popup "Ouvrir l\'application"...');
    
    // Attendre que la page soit bien chargée
    await new Promise(r => setTimeout(r, 2000));
    
    // Screenshot AVANT tentative de fermeture
    await page.screenshot({ path: './debug-before-popup.png', fullPage: false });
    
    try {
      // MÉTHODE DIRECTE: Attendre et cliquer sur le bouton "Rester sur le Web"
      console.log('🔍 Recherche du bouton "Rester sur le Web"...');
      
      // Attendre que le popup apparaisse (max 5 secondes)
      await new Promise(r => setTimeout(r, 2000));
      
      // Essayer plusieurs méthodes en séquence
      let popupClosed = false;
      
      // Méthode 1: Clic direct via evaluate avec recherche de texte
      popupClosed = await page.evaluate(() => {
        // Chercher TOUS les éléments contenant "Rester" ou "Revenir"
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent.trim().toLowerCase();
          // "Rester sur le Web" OU "Revenir à la version Web"
          if ((text.includes('rester') && text.includes('web')) ||
              (text.includes('revenir') && text.includes('version')) ||
              (text.includes('revenir') && text.includes('web'))) {
            // Trouver l'élément parent cliquable
            let parent = node.parentElement;
            while (parent) {
              if (parent.tagName === 'BUTTON' || parent.tagName === 'A' || 
                  parent.getAttribute('role') === 'button' ||
                  parent.onclick || parent.style.cursor === 'pointer') {
                parent.click();
                return true;
              }
              parent = parent.parentElement;
            }
            // Si pas de parent cliquable, cliquer sur le parent direct
            if (node.parentElement) {
              node.parentElement.click();
              return true;
            }
          }
        }
        return false;
      });
      
      if (popupClosed) {
        console.log('✅ Popup fermé via méthode 1 (TreeWalker)');
        await new Promise(r => setTimeout(r, 2000));
      } else {
        console.log('⚠️ Méthode 1 échouée, essai méthode 2...');
        
        // Méthode 2: Chercher le premier bouton qui n'est pas bleu
        popupClosed = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            const text = btn.textContent.toLowerCase();
            // Le bouton "Rester sur le Web" ne contient PAS "continuer"
            if (!text.includes('continuer') && !text.includes('ouvrir') && text.length > 3) {
              btn.click();
              return true;
            }
          }
          return false;
        });
        
        if (popupClosed) {
          console.log('✅ Popup fermé via méthode 2 (bouton non-bleu)');
          await new Promise(r => setTimeout(r, 2000));
        } else {
          console.log('⚠️ Méthode 2 échouée, essai méthode 3 (coordonnées)...');
          
          // Méthode 3: Cliquer sur les coordonnées approximatives du bouton gauche
          // Le bouton "Rester sur le Web" est à gauche dans le popup
          // Viewport 390x844, popup centré, bouton gauche environ à x=120
          await page.mouse.click(115, 530);
          await new Promise(r => setTimeout(r, 1000));
          
          // Méthode 4: Touche Escape pour fermer le popup
          await page.keyboard.press('Escape');
          await new Promise(r => setTimeout(r, 1000));
          
          // Méthode 5: Cliquer en dehors du popup
          await page.mouse.click(195, 650); // En dessous du popup
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      // Vérifier si le popup est toujours là
      const stillHasPopup = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('ouvrir l\'application google maps');
      });
      
      if (stillHasPopup) {
        console.log('⚠️ Popup toujours présent, tentative finale...');
        // Dernier essai: recharger sans popup
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 1000));
      } else {
        console.log('✅ Popup fermé avec succès!');
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
    // 📜 OUVRIR LA FICHE LIEU ET SCROLLER (MODE MOBILE)
    // ═══════════════════════════════════════════════════════════
    console.log('📜 Ouverture de la fiche lieu...');
    
    // En mode mobile, la fiche lieu est un "bottom sheet" qu'on doit faire glisser vers le haut
    // D'abord, attendre que la page soit chargée
    await new Promise(r => setTimeout(r, 2000));
    
    // Cliquer sur la fiche pour l'ouvrir/l'agrandir
    // La fiche est en bas de l'écran (viewport 390x844)
    await page.mouse.click(195, 650); // Clic sur la fiche en bas
    await new Promise(r => setTimeout(r, 1000));
    
    // Faire glisser la fiche vers le haut (swipe up) pour l'agrandir
    console.log('📱 Swipe up pour agrandir la fiche...');
    await page.mouse.move(195, 700);
    await page.mouse.down();
    await page.mouse.move(195, 200, { steps: 10 }); // Glisser vers le haut
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 2000));
    
    // Screenshot après swipe
    await page.screenshot({ path: './debug-after-swipe.png', fullPage: false });
    
    // Maintenant scroller dans la fiche pour trouver "Horaires d'affluence"
    console.log('📜 Scroll pour trouver "Horaires d\'affluence"...');
    
    let scrolled = 0;
    let found = false;
    
    for (let i = 0; i < 25; i++) { // Plus de scrolls
      // Swipe vers le haut dans la fiche (simuler touch scroll)
      await page.mouse.move(195, 600);
      await page.mouse.down();
      await page.mouse.move(195, 400, { steps: 5 });
      await page.mouse.up();
      
      scrolled += 200;
      await new Promise(r => setTimeout(r, 400));
      
      // Vérifier si on a trouvé les données
      const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
      if (pageText.includes('horaires d\'affluence') || 
          pageText.includes('temps réel') ||
          pageText.includes('assez animé') ||
          pageText.includes('très animé') ||
          pageText.includes('peu animé') ||
          pageText.includes('très fréquenté') ||
          pageText.includes('assez fréquenté')) {
        found = true;
        console.log(`✅ Section affluence trouvée après ${scrolled}px de scroll!`);
        // Scroll un peu plus pour charger tout le graphique
        await page.mouse.move(195, 500);
        await page.mouse.down();
        await page.mouse.move(195, 350, { steps: 3 });
        await page.mouse.up();
        await new Promise(r => setTimeout(r, 500));
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
    // 🔍 EXTRACTION DONNÉES - VERSION 2025
    // ═══════════════════════════════════════════════════════════
    console.log('🔎 Recherche données affluence...');

    const extractedData = await page.evaluate(() => {
      const result = {
        placeName: null,
        liveStatus: null,
        livePercentage: null,
        usualPercentage: null,
        popularTimes: {},
        currentHour: new Date().getHours(),
        trend: null,
        pageTitle: document.title,
        bodyTextSample: '',
        foundElements: [],
        debugTexts: [],
        htmlStructure: []
      };

      // Nom du lieu - chercher le bon h1 (pas "Connexion" ou autres boutons)
      const allH1 = document.querySelectorAll('h1');
      for (const h1 of allH1) {
        const text = h1.textContent.trim();
        // Ignorer les h1 qui sont des boutons ou du UI
        if (text && 
            !text.toLowerCase().includes('connexion') && 
            !text.toLowerCase().includes('login') &&
            !text.toLowerCase().includes('google') &&
            text.length > 3 && text.length < 100) {
          result.placeName = text;
          result.debugTexts.push(`📍 Lieu détecté: ${result.placeName}`);
          break;
        }
      }
      
      // Fallback: chercher dans le titre de la page
      if (!result.placeName && document.title) {
        const titleMatch = document.title.match(/^([^-–]+)/);
        if (titleMatch) {
          result.placeName = titleMatch[1].trim();
          result.debugTexts.push(`📍 Lieu (titre): ${result.placeName}`);
        }
      }

      // Récupérer tout le texte de la page
      const allText = document.body.innerText;
      const allTextLower = allText.toLowerCase();
      
      // ═══════════════════════════════════════════════════════════
      // 🎯 MÉTHODE 1: Chercher les sections "Horaires d'affluence" / "Popular times"
      // ═══════════════════════════════════════════════════════════
      
      // Chercher le texte exact de la section
      const popularTimesPatterns = [
        'horaires d\'affluence',
        'popular times',
        'heures de pointe',
        'affluence'
      ];
      
      for (const pattern of popularTimesPatterns) {
        if (allTextLower.includes(pattern)) {
          result.debugTexts.push(`✅ Section trouvée: "${pattern}"`);
          const idx = allTextLower.indexOf(pattern);
          result.bodyTextSample = allText.substring(idx, idx + 300);
        }
      }
      
      // ═══════════════════════════════════════════════════════════
      // 🎯 MÉTHODE 2: Chercher le status en temps réel via aria-label
      // ═══════════════════════════════════════════════════════════
      
      // Google Maps utilise des aria-labels descriptifs
      document.querySelectorAll('[aria-label]').forEach(el => {
        const label = el.getAttribute('aria-label') || '';
        const labelLower = label.toLowerCase();
        
        // Détecter le status actuel
        if (labelLower.includes('actuellement') || labelLower.includes('currently') || 
            labelLower.includes('en ce moment') || labelLower.includes('live')) {
          result.debugTexts.push(`🔴 Live label: ${label.substring(0, 80)}`);
          
          // Extraire le pourcentage si présent
          const percentMatch = label.match(/(\d{1,3})\s*%/);
          if (percentMatch) {
            result.livePercentage = parseInt(percentMatch[1]);
          }
          
          // Détecter le status
          if (labelLower.includes('très fréquenté') || labelLower.includes('very busy')) {
            result.liveStatus = 'very_busy';
          } else if (labelLower.includes('assez fréquenté') || labelLower.includes('fairly busy') || labelLower.includes('plutôt fréquenté')) {
            result.liveStatus = 'fairly_busy';
          } else if (labelLower.includes('peu fréquenté') || labelLower.includes('not busy') || labelLower.includes('calme')) {
            result.liveStatus = 'not_busy';
          }
        }
        
        // Chercher les données horaires (ex: "12 h. 45 % d'affluence")
        const hourPercentMatch = label.match(/(\d{1,2})\s*[h:]\s*(?:00)?\s*[\.\s]*(\d{1,3})\s*%/i);
        if (hourPercentMatch) {
          const hour = parseInt(hourPercentMatch[1]);
          const percent = parseInt(hourPercentMatch[2]);
          if (hour >= 0 && hour <= 23 && percent >= 0 && percent <= 100) {
            result.popularTimes[hour] = percent;
            result.foundElements.push(`Hour ${hour}: ${percent}%`);
          }
        }
      });
      
      // ═══════════════════════════════════════════════════════════
      // 🎯 MÉTHODE 3: Analyser les barres du graphique via CSS/style
      // ═══════════════════════════════════════════════════════════
      
      // Google utilise des divs avec des hauteurs en % pour les barres
      // Chercher dans les conteneurs potentiels
      const barSelectors = [
        '[data-value]',                    // Attribut data-value
        '[role="img"] > div',              // Divs dans un role="img"
        '[class*="bar"]',                  // Classes contenant "bar"
        '[class*="progress"]',             // Classes contenant "progress"
        'g rect',                          // SVG rectangles
        '[style*="height:"][style*="%"]',  // Hauteur en pourcentage
      ];
      
      for (const selector of barSelectors) {
        try {
          document.querySelectorAll(selector).forEach(el => {
            // Vérifier si c'est une barre du graphique
            const style = el.getAttribute('style') || '';
            const dataValue = el.getAttribute('data-value');
            
            if (dataValue) {
              const val = parseInt(dataValue);
              if (val >= 0 && val <= 100) {
                result.foundElements.push(`data-value: ${val}`);
              }
            }
            
            // Extraire la hauteur du style
            const heightMatch = style.match(/height:\s*(\d+(?:\.\d+)?)\s*(%|px)/i);
            if (heightMatch) {
              const height = parseFloat(heightMatch[1]);
              const unit = heightMatch[2];
              // Ignorer les hauteurs de 100% ou très petites (UI elements)
              if (unit === '%' && height > 5 && height < 100) {
                result.foundElements.push(`Bar %: ${height}`);
              }
            }
          });
        } catch (e) {}
      }
      
      // ═══════════════════════════════════════════════════════════
      // 🎯 MÉTHODE 4: Regex sur le texte brut pour extraire le contexte
      // ═══════════════════════════════════════════════════════════
      const affluenceMatch = allText.match(/(?:horaires d'affluence|popular times)[^]*?(?=avis|reviews|ferme|closes|\n\n)/i);
      if (affluenceMatch) {
        const context = affluenceMatch[0];
        result.foundElements.push(`Context: ${context.substring(0, 100)}`);
      }
      
      // Debug: chercher "INFORMATIONS EN TEMPS RÉEL"
      if (allTextLower.includes('informations en temps') || allTextLower.includes('temps réel')) {
        result.debugTexts.push('✅ Found "Temps réel"');
      }
      
      // ═══════════════════════════════════════════════════════════
      // 🔍 PATTERNS FRANÇAIS GOOGLE MAPS 2025 (améliorés)
      // ═══════════════════════════════════════════════════════════
      
      // Status en temps réel - NOUVEAUX patterns du screenshot
      const patterns = [
        // Patterns 2025 (screenshot téléphone)
        { regex: /assez\s+anim[ée]/i, status: 'fairly_busy', percent: 65 },
        { regex: /tr[eè]s\s+anim[ée]/i, status: 'very_busy', percent: 85 },
        { regex: /peu\s+anim[ée]/i, status: 'not_busy', percent: 30 },
        { regex: /calme/i, status: 'not_busy', percent: 25 },
        // Anciens patterns
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
