/**
 * 🤖 Service PREMIUM de génération de réponses aux avis Google
 * 
 * Architecture :
 * 1. Cache serveur mémoire (7j, 500 entrées) — jamais 2 générations pour le même avis
 * 2. Analyse contextuelle profonde — extraction plats exacts, ton émotionnel, occasion
 * 3. TOUS les avis avec texte → IA (qualité premium, sur-mesure)
 * 4. Fallback local riche — 50+ variantes naturelles, uniquement si IA indisponible
 * 5. Timeout 15s → fallback local si dépassé
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// =====================================================
// CACHE SERVEUR EN MÉMOIRE
// =====================================================
const responseCache = new Map();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 jours

function getCacheKey(review) {
  const raw = `${(review.author || '').trim()}|${(review.text || '').trim()}|${review.rating}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return `avis_${hash}`;
}

function getCachedResponse(review) {
  const key = getCacheKey(review);
  const cached = responseCache.get(key);
  if (cached && (Date.now() - cached.createdAt) < CACHE_TTL) {
    return cached;
  }
  if (cached) responseCache.delete(key);
  return null;
}

function setCachedResponse(review, response, model) {
  const key = getCacheKey(review);
  responseCache.set(key, { response, model, createdAt: Date.now() });
  if (responseCache.size > 500) {
    const first = responseCache.keys().next().value;
    responseCache.delete(first);
  }
}

// =====================================================
// CHARGEMENT CONTEXTE RESTAURANT
// =====================================================
let _cachedRestaurantContext = null;

function loadRestaurantContext() {
  if (_cachedRestaurantContext) return _cachedRestaurantContext;
  try {
    const configPath = path.join(__dirname, '../config/restaurantContext.json');
    _cachedRestaurantContext = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return _cachedRestaurantContext;
  } catch (error) {
    console.error('Erreur chargement contexte restaurant:', error.message);
    return null;
  }
}

// =====================================================
// PROMPT SYSTÈME PREMIUM — L'ÂME D'ANTOINE
// =====================================================

function buildSystemPrompt() {
  const ctx = loadRestaurantContext();
  if (!ctx) return getDefaultPrompt();

  const phone = ctx.contact?.telephonePrincipal || '01 41 74 10 71';

  return `Tu es Antoine — le VRAI patron du Fournil A Pizzas, pas une IA, pas un community manager.
Tu es UN HOMME. Utilise TOUJOURS le masculin : "ravi", "content", "fier", "touché" — JAMAIS "ravie", "contente", "fière", "touchée".
Ta famille tient cette pizzeria depuis 1970. Tu connais chaque recette par cœur. Tu as de la gouaille, du cœur, et tu défends ton travail.

═══════════════════════════════════════
QUI TU ES
═══════════════════════════════════════
"${ctx.nom}" — ${ctx.slogan}
Depuis ${ctx.depuis}. 4 restaurants : Vincennes, L'Haÿ-les-Roses, Paris 12, Bondy (100% Halal).
Tél : ${phone}

═══════════════════════════════════════
TA VOIX — TON ADN
═══════════════════════════════════════
• Tu parles comme un restaurateur qui a les mains dans la farine, pas comme un SAV.
• Tu VARIES ton style — jamais deux réponses identiques. Parfois tu commences par le plat, parfois par le compliment, parfois par une anecdote.
• Tu es chaleureux mais JAMAIS servile. Tu ne supplies personne.
• Tu glisses des détails concrets sur TES recettes (""notre pâte pétrie chaque matin"", ""notre vrai Parmesan Regiano"") — ça prouve que tu es le vrai patron.
• Tu as une touche d'humour quand c'est approprié — jamais forcé, jamais de blague quand le client est mécontent.
• Sur les critiques, tu défends ton travail avec classe. Tu expliques, tu ne t'excuses pas platement.
• Tu proposes une solution CONCRÈTE quand il y a un souci (téléphone, conseil, suggestion).

EXEMPLES DE VOIX (pour calibrer, ne copie JAMAIS ces réponses) :
→ Client fan de pizza : "Bonjour Sarah, la Savoyarde c'est un peu notre bébé — raclette, pommes de terre, un vrai plat de montagne en pizza. Content que ça vous ait plu ! — L'équipe Chez Antoine 🍕"
→ Client famille : "Bonjour Thomas, rien de tel qu'une tablée de pizzas en famille ! Les enfants ont choisi quoi ? La prochaine fois, testez nos empanadas en entrée, ils en raffolent. — L'équipe Chez Antoine 🍕"
→ Livraison mitigée : "Bonjour Julie, le trajet peut parfois jouer des tours — 2 minutes au four et c'est comme à la sortie. Astuce : un coup de fil au ${phone} 20 min avant et tout sera prêt pile à l'heure. — L'équipe Chez Antoine 🍕"
→ Client mécontent : "Bonjour Alex, ça ne nous ressemble pas. Nos pâtes sont préparées à la minute avec du vrai Parmesan — c'est notre ADN depuis 1970. Appelez-nous au ${phone}, on veut comprendre ce qui s'est passé. — L'équipe Chez Antoine 🍕"
→ Client habitué : "Bonjour Karim, un fidèle ! Ça fait toujours plaisir de te voir. Notre Carbonara ne change pas — guanciale, jaune d'œuf, pecorino, point. À très vite. — L'équipe Chez Antoine 🍕"
→ Grosse commande : "Bonjour Léa, un anniversaire chez nous c'est toujours la fête ! Prochain coup, n'hésitez pas à réserver au ${phone} pour qu'on vous chouchoute. — L'équipe Chez Antoine 🍕"

═══════════════════════════════════════
TA CARTE (utilise ces infos quand pertinent)
═══════════════════════════════════════
🍕 PIZZAS : Pâte MAISON pétrie chaque jour. 33cm (${ctx.carte.pizzas.baseTomate[0].prix}€-${ctx.carte.pizzas.baseCreme[ctx.carte.pizzas.baseCreme.length-1].prix}€) ou 40cm (+2€).
   Stars : Margherita, Reine, 4 Fromages, Savoyarde, Raclette, Pizza d'Hanna (curry-poulet), Truffe.
🍝 PÂTES : Cuites À LA MINUTE. Vrai PARMESAN REGIANO râpé. ${ctx.carte.pates.plats[0].prix}€-${ctx.carte.pates.plats[ctx.carte.pates.plats.length-1].prix}€.
   Stars : Carbonara (guanciale + pecorino, la vraie), Saumon fumé, Truffe, Bolognaise.
🧀 BURRATAS : Crémeuses, italiennes. La Véritable (${ctx.carte.burratas.plats[0].prix}€), Di Parma/Salmone (${ctx.carte.burratas.plats[1].prix}€).
🥟 EMPANADAS : 3€ pièce — parfaits en entrée.
🍫 DESSERTS MAISON : Mi-cuit chocolat (${ctx.carte.desserts.plats[0].prix}€), Tiramisu Nutella-Café (${ctx.carte.desserts.plats[2].prix}€).
☪️ Viandes HALAL (bœuf, poulet, merguez). Bondy = 100% Halal.

═══════════════════════════════════════
GESTION DES PROBLÈMES
═══════════════════════════════════════
ATTENTE → "Tout sort du four à la commande — pas de précuit. Un coup de fil au ${phone} et on vous prépare tout en avance."
FROID → "Le trajet refroidit — 2 min au four et c'est reparti. Astuce : appelez-nous au ${phone} pour caler le timing."
PORTIONS → "Nos portions n'ont pas changé depuis 1970 ! Gros appétit → 40cm (+2€) ou empanadas en entrée."
PRIX → "Pizzas maison dès ${ctx.carte.pizzas.baseTomate[0].prix}€, pâtes minute dès ${ctx.carte.pates.plats[0].prix}€ — c'est du fait maison, pas de l'industriel."
SERVICE → "On va en parler en équipe. On fait tout pour que chaque client soit bien accueilli."

═══════════════════════════════════════
RÈGLES NON NÉGOCIABLES
═══════════════════════════════════════
1. Commence par "Bonjour [Prénom]" — TOUJOURS
2. **60-90 mots max** — concis, percutant, chaque phrase apporte quelque chose
3. Termine par : ${ctx.tonReponse.signature}
4. N'invente AUCUN plat ni prix
5. Ne mentionne JAMAIS "première visite/découverte" sauf si le client le dit explicitement
6. Si PROBLÈME GRAVE → donne le tél ${phone}
7. INTERDIT : "Cher(e)", "sincères excuses", "navrés", "mille pardons", "nous vous prions", "n'hésitez pas à revenir"
8. NE COMMENCE JAMAIS par des guillemets
9. Nomme les plats par leur VRAI NOM si le client les cite
10. VARIE ta structure — ne commence pas toujours par remercier, surprends
11. Ajoute un DÉTAIL CONCRET sur la recette ou la préparation quand possible — ça fait authentique
12. Adapte ton énergie au client : enthousiaste avec un fan, posé avec un mécontent, complice avec un habitué`;
}

// =====================================================
// ANALYSE CONTEXTUELLE PROFONDE
// =====================================================

/**
 * Base de données des plats pour extraction précise
 */
const DISH_PATTERNS = [
  // Pizzas spécifiques (du plus spécifique au plus générique)
  { pattern: /pizza\s*d['']?hanna|hanna/i, name: 'Pizza d\'Hanna', category: 'pizza' },
  { pattern: /4\s*fromages|quatre\s*fromages/i, name: '4 Fromages', category: 'pizza' },
  { pattern: /4\s*saisons|quatre\s*saisons/i, name: '4 Saisons', category: 'pizza' },
  { pattern: /margherita|margarita|margareta/i, name: 'Margherita', category: 'pizza' },
  { pattern: /napolitaine/i, name: 'Napolitaine', category: 'pizza' },
  { pattern: /ch[eè]vre\s*miel/i, name: 'Chèvre Miel', category: 'pizza' },
  { pattern: /reine(?!\s*des)/i, name: 'Reine', category: 'pizza' },
  { pattern: /fermi[eè]re/i, name: 'Fermière', category: 'pizza' },
  { pattern: /paysanne/i, name: 'Paysanne', category: 'pizza' },
  { pattern: /orientale/i, name: 'Orientale', category: 'pizza' },
  { pattern: /mexicaine/i, name: 'Mexicaine', category: 'pizza' },
  { pattern: /v[ée]g[ée]tarienne/i, name: 'Végétarienne', category: 'pizza' },
  { pattern: /normande/i, name: 'Normande', category: 'pizza' },
  { pattern: /raclette/i, name: 'Raclette', category: 'pizza' },
  { pattern: /savoyarde/i, name: 'Savoyarde', category: 'pizza' },
  { pattern: /truffe/i, name: 'Truffe', category: 'pizza-pasta' },
  { pattern: /norv[ée]gienne/i, name: 'Norvégienne', category: 'pizza' },
  { pattern: /calzone/i, name: 'Calzone', category: 'pizza' },
  // Pâtes spécifiques
  { pattern: /carbonara/i, name: 'Carbonara', category: 'pasta' },
  { pattern: /bolognaise|bolo\b/i, name: 'Bolognaise', category: 'pasta' },
  { pattern: /arrabiata|arrabbiata/i, name: 'Arrabiata', category: 'pasta' },
  { pattern: /sicilienne/i, name: 'Sicilienne', category: 'pasta' },
  { pattern: /3\s*fromages|trois\s*fromages/i, name: '3 Fromages', category: 'pasta' },
  // Autres plats
  { pattern: /burrata\s*(di\s*)?parma|di\s*parma/i, name: 'Burrata Di Parma', category: 'burrata' },
  { pattern: /burrata\s*(di\s*)?salmone|di\s*salmone/i, name: 'Burrata Di Salmone', category: 'burrata' },
  { pattern: /burrata\s*v[ée]ritable|la\s*v[ée]ritable/i, name: 'La Véritable', category: 'burrata' },
  { pattern: /burrata/i, name: 'burrata', category: 'burrata' },
  { pattern: /empanada/i, name: 'empanadas', category: 'empanada' },
  { pattern: /tiramisu\s*nutella|tiramisu\s*caf[ée]/i, name: 'Tiramisu Nutella-Café', category: 'dessert' },
  { pattern: /tiramisu\s*speculoos|tiramisu\s*sp[ée]culoos/i, name: 'Tiramisu Speculoos', category: 'dessert' },
  { pattern: /tiramisu/i, name: 'tiramisu', category: 'dessert' },
  { pattern: /mi[- ]?cuit|moelleux\s*chocolat|fondant\s*chocolat/i, name: 'mi-cuit chocolat', category: 'dessert' },
  { pattern: /panini\s*nutella/i, name: 'Panini Nutella', category: 'dessert' },
  { pattern: /salade\s*c[ée]sar/i, name: 'Salade César', category: 'salade' },
  { pattern: /salade\s*ch[eè]vre/i, name: 'Salade Chèvre', category: 'salade' },
  { pattern: /pain\s*(à\s*l[''])?ail/i, name: 'pain à l\'ail', category: 'pain' },
  { pattern: /pain\s*fromage/i, name: 'pain fromage', category: 'pain' }
];

function analyzeReviewContext(text, author, rating) {
  const lowerText = (text || '').toLowerCase();
  const originalText = text || '';

  // ── Extraction des plats EXACTS mentionnés ──
  const dishesFound = [];
  const categoriesFound = new Set();
  for (const dish of DISH_PATTERNS) {
    if (dish.pattern.test(originalText)) {
      // Éviter les doublons de catégorie ambiguë (truffe = pizza OU pasta)
      if (!dishesFound.find(d => d.name === dish.name)) {
        dishesFound.push({ name: dish.name, category: dish.category });
        categoriesFound.add(dish.category.split('-')[0]); // pizza-pasta → pizza
      }
    }
  }
  // Détection générique si aucun plat spécifique trouvé
  if (!categoriesFound.has('pizza') && /pizza/i.test(lowerText)) {
    categoriesFound.add('pizza');
  }
  if (!categoriesFound.has('pasta') && /p[aâ]te|pasta|spaghetti|tagliatelle|penne/i.test(lowerText)) {
    categoriesFound.add('pasta');
  }
  if (!categoriesFound.has('dessert') && /dessert/i.test(lowerText)) {
    categoriesFound.add('dessert');
  }
  if (/saumon/i.test(lowerText) && !dishesFound.find(d => d.name.includes('almone') || d.name.includes('aumon'))) {
    dishesFound.push({ name: 'saumon', category: 'saumon' });
    categoriesFound.add('saumon');
  }

  // ── Fidélité ──
  const isFidelite = /habitué|régulier|toujours|comme d'habitude|depuis (des )?années|chaque (fois|semaine|mois)|notre pizzeria préférée|on revient|fidèle|comme toujours|la (x|X|\d+)[eè]me fois|ça fait \d+/i.test(lowerText);
  const mentionsReturn = /je reviendrai|on reviendra|à refaire|nous reviendrons|j'y retourne|on y retourne|hâte d'y retourner|vivement la prochaine/i.test(lowerText);
  const firstTimeExplicit = /première (fois|visite|commande)|découvert|essayé pour la première|jamais (été|venu|goûté)|on a testé|on a voulu (tester|essayer)/i.test(lowerText);

  // ── Visite ──
  const isDelivery = /livraison|livré|livreur|uber\s*eat|deliveroo|just\s*eat|commande en ligne|commandé sur/i.test(lowerText);
  const isTakeaway = /emporter|à emporter|take\s*away|récupéré|click.*collect/i.test(lowerText);
  const isOnSite = /sur place|en salle|terrasse|ambiance|accueil|serveur|serveuse|service à table|on s'est installé|assis/i.test(lowerText);

  // ── Problèmes (enrichis) ──
  const issues = {
    wait: /attente|attendu|long(temps)?|lent|tardé|retard|1\s*h|une heure|45\s*min/i.test(lowerText),
    cold: /froid|tiède|pas chaud|refroidi/i.test(lowerText),
    portions: /petit(e)?s?\s*(portion|quantit)|pas assez|maigre|léger|chiche|radin/i.test(lowerText),
    price: /cher|prix élevé|trop cher|hors de prix|rapport qualit/i.test(lowerText),
    quality: /fade|sans goût|insipide|mauvais|déçu|décevant|dégueulasse|immangeable|pas bon|pas terrible/i.test(lowerText),
    hygiene: /sale|propre|hygiène|cafard|cheveu|mouche|pas net|dégoût|suspect/i.test(lowerText),
    service: /impoli|désagréable|aucun sourire|mal reçu|irrespectueux|malpoli|sec|froid\s*(accueil)/i.test(lowerText),
    missing: /manqu|oublié|pas (reçu|eu|dans)|erreur\s*(de\s*)?commande/i.test(lowerText)
  };

  // ── Points positifs (enrichis) ──
  const positives = {
    staff: /équipe|personnel|serveur|serveuse|accueil|sympathique|gentil|souriant|aimable|adorable|super\s*accueil|chaleureux/i.test(lowerText),
    fresh: /frais|fraîch|fait maison|minute|préparé|artisan/i.test(lowerText),
    generous: /généreux|copieux|bonne portion|bien servi|grande|énorme|rassasié|callé|calé/i.test(lowerText),
    taste: /délicieux|excellent|un\s*régal|savoureux|succulent|top|meilleur|incroyable|divin|tuerie|bombe|ouf|dingue|fou|un\s*délice|trop\s*bon/i.test(lowerText),
    value: /bon rapport|pas cher|prix (correct|raisonnable|doux)|abordable|good value/i.test(lowerText),
    ambiance: /ambiance|cadre|déco|convivial|familial|sympa|chouette/i.test(lowerText),
    speed: /rapide|vite|efficace|pas attendu/i.test(lowerText)
  };

  // ── Ton émotionnel du client ──
  const emotionalTone = detectEmotionalTone(lowerText, rating);

  // ── Contexte social ──
  const isFamily = /enfant|famille|familial|fils|fille|bébé|poussette|kid/i.test(lowerText);
  const isCouple = /couple|amoureux|romantique|en tête.?à.?tête|saint.?valentin/i.test(lowerText);
  const isGroup = /ami|copain|groupe|bande|entre nous|soirée|anniversaire|fête/i.test(lowerText);
  const isSolo = /seul|solo|tout seul|juste moi/i.test(lowerText);

  // ── Restaurant spécifique mentionné ──
  let specificRestaurant = null;
  if (/bondy/i.test(lowerText)) specificRestaurant = 'Bondy';
  else if (/vincennes/i.test(lowerText)) specificRestaurant = 'Vincennes';
  else if (/ha[yÿ].?les.?roses|l'ha[yÿ]/i.test(lowerText)) specificRestaurant = "L'Haÿ-les-Roses";
  else if (/paris\s*12|paris\s*12[eè]me/i.test(lowerText)) specificRestaurant = 'Paris 12';

  // ── Recommandation explicite ──
  const recommends = /je recommande|je conseille|à tester|foncez|allez.?y|n'hésitez pas/i.test(lowerText);

  return {
    isFidelite,
    mentionsReturn,
    firstTimeExplicit,
    unknownFidelity: !isFidelite && !firstTimeExplicit,
    visitType: isDelivery ? 'livraison' : isTakeaway ? 'emporter' : isOnSite ? 'sur place' : 'inconnu',
    issues,
    positives,
    dishesFound,        // [{name: 'Savoyarde', category: 'pizza'}, ...]
    categoriesFound: [...categoriesFound],  // ['pizza', 'dessert']
    emotionalTone,      // 'enthousiaste' | 'satisfait' | 'neutre' | 'decu' | 'en_colere'
    social: { isFamily, isCouple, isGroup, isSolo },
    specificRestaurant,
    recommends,
    isNegative: rating <= 2,
    isMixed: rating === 3,
    isPositive: rating >= 4
  };
}

/**
 * Détecte le ton émotionnel du client pour calibrer la réponse
 */
function detectEmotionalTone(text, rating) {
  if (/!!!|trop bon|incroyable|meilleur|dingue|ouf|tuerie|bombe|waouh|wow|miam|parfait|exceptionnel|magnifique|extraordinaire/i.test(text)) return 'enthousiaste';
  if (/jamais|plus jamais|horrible|scandaleux|honte|arnaque|vol|escro|inadmissible/i.test(text)) return 'en_colere';
  if (/déçu|dommage|bof|moyen|pas terrible|sans plus|mitigé|passable/i.test(text)) return 'decu';
  if (rating >= 4) return 'satisfait';
  if (rating <= 2) return 'mecontent';
  return 'neutre';
}

// =====================================================
// PROMPT PAR DÉFAUT (fallback si pas de config)
// =====================================================

function getDefaultPrompt() {
  return `Tu es Antoine, patron de "Chez Antoine", pizzeria familiale depuis 1970.
Réponds aux avis Google avec chaleur et authenticité, comme un vrai restaurateur.
Maximum 80 mots. Jamais servile. Toujours fier de ton travail.
Signature : — L'équipe Chez Antoine 🍕`;
}

// =====================================================
// GÉNÉRATION PRINCIPALE
// =====================================================

async function generateAIResponse(review, options = {}) {
  const { author, rating, text } = review;
  const { forceRegenerate = false } = options;
  const firstName = (author || 'Client').split(' ')[0];
  const ctx = loadRestaurantContext();
  const phone = ctx?.contact?.telephonePrincipal || '01 41 74 10 71';
  const signature = ctx?.tonReponse?.signature || '— L\'équipe Chez Antoine 🍕';

  // ── 1. Cache (bypassé si régénération forcée) ──
  if (!forceRegenerate) {
    const cached = getCachedResponse(review);
    if (cached) {
      return { response: cached.response, model: cached.model, fromCache: true };
    }
  }

  // ── 2. Avis sans texte → réponse courte mais humaine ──
  if (!text || text.trim().length < 10) {
    const response = generateNoTextResponse(firstName, rating, phone, signature);
    setCachedResponse(review, response, 'template');
    return { response, model: 'template', fromCache: false };
  }

  // ── 3. Avis positifs TRÈS simples (4-5★, <15 mots, aucun détail concret) → local premium INSTANTANÉ ──
  const wordCount = text.trim().split(/\s+/).length;
  const hasIssues = /mais |sauf |dommage|bémol|mieux|problème|attente|froid|cher/i.test(text);
  const hasSpecificContent = /pizza|burrata|savoyard|calzone|carbonara|4 fromage|quatre fromage|margherita|reine|orientale|royale|napolitaine|végétarienne|burrito|tiramisu|panna cotta|livraison|terrasse|enfant|famille|anniversaire|commande|menu|dessert|entrée/i.test(text);
  if (rating >= 4 && wordCount < 15 && !hasIssues && !hasSpecificContent) {
    const response = generateLocalPremiumResponse(review, firstName, signature, phone);
    setCachedResponse(review, response, 'local-premium');
    return { response, model: 'local-premium', fromCache: false };
  }

  // ── 4. Avis complexes (négatifs, mitigés, longs, avec nuances) → IA ──
  if (isAIConfigured()) {
    try {
      const result = await callAI(review, firstName, phone, signature);
      if (result) {
        setCachedResponse(review, result.response, result.model);
        return { response: result.response, model: result.model, fromCache: false };
      }
    } catch (error) {
      const status = error.response?.status;
      console.warn(`[IA] Erreur ${status || 'réseau'}: ${error.message} — fallback local premium`);
    }
  }

  // ── 4. Fallback local premium (IA indisponible) ──
  const fallback = generateLocalPremiumResponse(review, firstName, signature, phone);
  setCachedResponse(review, fallback, 'local-premium');
  return { response: fallback, model: 'local-premium', fromCache: false };
}

/**
 * Réponse pour avis sans texte — courte mais avec personnalité
 */
function generateNoTextResponse(firstName, rating, phone, signature) {
  if (rating >= 4) {
    const openers = [
      `Bonjour ${firstName}, merci pour ces ${rating} étoiles ! Au plaisir de vous régaler à nouveau 🍕`,
      `Bonjour ${firstName}, ${rating} étoiles, ça fait chaud au cœur ! On vous attend pour la prochaine.`,
      `Bonjour ${firstName}, merci pour votre confiance ! On a hâte de vous revoir autour d'une bonne pizza.`
    ];
    return `"${pick(openers)} ${signature}"`;
  }
  if (rating === 3) {
    return `"Bonjour ${firstName}, merci pour votre retour. On aimerait faire mieux la prochaine fois — un appel au ${phone} et on en discute ? ${signature}"`;
  }
  // 1-2 étoiles
  const negatives = [
    `Bonjour ${firstName}, ce retour nous interpelle. Appelez-nous au ${phone}, on aimerait comprendre et se rattraper.`,
    `Bonjour ${firstName}, on ne va pas se satisfaire de cette note. Contactez-nous au ${phone} — on prend ça très au sérieux.`
  ];
  return `"${pick(negatives)} ${signature}"`;
}

// =====================================================
// APPEL IA — PROMPT ENGINEERING PREMIUM
// =====================================================

/**
 * Appel Groq — GRATUIT, ultra-rapide (<1s), 6000 tokens/min
 * https://console.groq.com — clé gratuite
 */
async function callGroq(systemPrompt, userPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const models = [
    'moonshotai/kimi-k2-instruct',  // Meilleur qualité, très naturel en français
    'llama-3.3-70b-versatile',       // Backup solide, ultra-rapide
  ];

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 400,
            temperature: 0.8
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 12000
          }
        );

        const content = result.data?.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          console.log(`[IA] ✅ Groq (${model}) — ${content.trim().length} chars`);
          return { content: content.trim(), model: `groq/${model}` };
        }
        console.warn(`[IA] Groq (${model}) — réponse vide`);
        break;
      } catch (error) {
        const status = error.response?.status;
        const errMsg = error.response?.data?.error?.message || error.message;
        if (status === 429 && attempt === 0) {
          console.log(`[IA] Groq (${model}) — rate limit, retry dans 5s...`);
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        console.warn(`[IA] Groq (${model}) — erreur ${status || 'réseau'}: ${errMsg}`);
        break;
      }
    }
  }
  return null;
}

/**
 * Appel Gemini (Google AI Studio) — gratuit si quota > 0
 */
async function callGemini(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const models = [
    process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    'gemini-2.0-flash-lite'  // 30 RPM, double du Flash standard
  ];

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await axios.post(
          'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 350,
            temperature: 0.75
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );

        const content = result.data?.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          console.log(`[IA] ✅ Gemini (${model}) — ${content.trim().length} chars`);
          return { content: content.trim(), model: `gemini/${model}` };
        }
        console.warn(`[IA] Gemini (${model}) — réponse vide`);
        break; // modèle suivant
      } catch (error) {
        const status = error.response?.status;
        const errMsg = error.response?.data?.error?.message || error.message;

        if (status === 429 && attempt < 2) {
          const wait = (attempt + 1) * 4000; // 4s, 8s
          console.log(`[IA] Gemini (${model}) — rate limit, retry dans ${wait / 1000}s...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        console.warn(`[IA] Gemini (${model}) — erreur ${status || 'réseau'}: ${errMsg}`);
        break; // modèle suivant
      }
    }
  }
  return null;
}

/**
 * Appel OpenRouter — backup si Gemini non configuré ou en erreur
 */
async function callOpenRouter(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const primaryModel = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1-0528:free';
  const models = [
    primaryModel,
    'openrouter/free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'google/gemma-3-27b-it:free',
  ].filter((m, i, a) => a.indexOf(m) === i);

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://gestion-rh.app',
    'X-Title': 'Chez Antoine - Avis Google'
  };
  const body = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 350,
    temperature: 0.75
  };

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const aiResult = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          { ...body, model },
          { headers, timeout: 15000 }
        );

        if (aiResult.data?.error) {
          const errCode = aiResult.data.error.code;
          console.warn(`[IA] ${model} — erreur provider: ${aiResult.data.error.message || 'inconnu'}`);
          if (errCode === 429 && attempt === 0) {
            await new Promise(r => setTimeout(r, 3000));
            continue;
          }
          break;
        }

        const content = aiResult.data?.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          console.log(`[IA] ✅ ${model} — ${content.trim().length} chars`);
          return { content: content.trim(), model };
        }
        console.warn(`[IA] ${model} — réponse vide`);
        break;
      } catch (error) {
        const status = error.response?.status;
        const errMsg = error.response?.data?.error?.message || error.message;
        console.warn(`[IA] ${model} — erreur ${status || 'réseau'}: ${errMsg}`);
        if (status === 429 && attempt === 0) {
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        break;
      }
    }
  }
  return null;
}

async function callAI(review, firstName, phone, signature) {
  const { text, rating } = review;
  const context = analyzeReviewContext(text, review.author, rating);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(firstName, rating, text, context, phone, signature);

  // 1️⃣ Groq (gratuit, ultra-rapide <1s, très fiable)
  let result = await callGroq(systemPrompt, userPrompt);

  // 2️⃣ Gemini (gratuit Google, backup)
  if (!result) {
    result = await callGemini(systemPrompt, userPrompt);
  }

  // 3️⃣ OpenRouter (backup — modèles gratuits variés)
  if (!result) {
    result = await callOpenRouter(systemPrompt, userPrompt);
  }

  // Nettoyage et validation
  if (result) {
    let aiResponse = cleanAIResponse(result.content, context);
    if (aiResponse && aiResponse.length > 30) {
      return { response: `"${aiResponse}"`, model: result.model };
    }
    console.warn(`[IA] réponse trop courte après nettoyage (${aiResponse?.length || 0} chars)`);
  }

  return null; // tous les providers ont échoué → fallback local
}

/**
 * Construit le prompt utilisateur — la pièce maîtresse du sur-mesure
 */
function buildUserPrompt(firstName, rating, text, context, phone, signature) {
  const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);

  // Construire les instructions contextuelles directement dans le prompt user
  let contextBlock = '';

  // Plats mentionnés — les nommer précisément
  if (context.dishesFound.length > 0) {
    const dishNames = context.dishesFound.map(d => d.name).join(', ');
    contextBlock += `Le client mentionne : ${dishNames}. UTILISE ces noms dans ta réponse.\n`;
  }

  // Fidélité
  if (context.firstTimeExplicit) {
    contextBlock += `✅ Le client dit explicitement que c'est sa première visite. Tu peux le souligner.\n`;
  } else if (context.isFidelite) {
    contextBlock += `✅ Client fidèle. Remercie sa fidélité naturellement.\n`;
  } else {
    contextBlock += `⛔ FIDÉLITÉ INCONNUE — NE DIS PAS "première visite", "bienvenue", "découverte".\n`;
  }

  // Type de visite
  if (context.visitType !== 'inconnu') {
    contextBlock += `Mode : ${context.visitType}.\n`;
  }

  // Problèmes spécifiques
  const activeIssues = Object.entries(context.issues).filter(([_, v]) => v);
  if (activeIssues.length > 0) {
    contextBlock += `Problèmes soulevés : ${activeIssues.map(([k]) => k).join(', ')}.\n`;
    if (context.issues.hygiene || context.issues.service) {
      contextBlock += `⚠️ Problème sensible → reste digne, empathique, donne le tél ${phone}.\n`;
    }
  }

  // Points positifs — les reconnaître
  const activePositives = Object.entries(context.positives).filter(([_, v]) => v);
  if (activePositives.length > 0) {
    contextBlock += `Points positifs du client : ${activePositives.map(([k]) => k).join(', ')}.\n`;
  }

  // Ton émotionnel
  const toneGuide = {
    enthousiaste: 'Le client est ENTHOUSIASTE — matche son énergie, sois joyeux et fier.',
    satisfait: 'Client satisfait — remercie chaleureusement, rebondis sur un détail de son avis.',
    neutre: 'Ton neutre — sois naturel et chaleureux.',
    decu: 'Client déçu mais pas agressif — empathie sincère, proposition concrète.',
    mecontent: 'Client mécontent — empathie, pas d\'excuses plates, une solution concrète.',
    en_colere: 'Client en colère — CALME, digne. Ne te justifie pas trop. Propose le téléphone.'
  };
  contextBlock += `Ton du client : ${toneGuide[context.emotionalTone] || toneGuide.neutre}\n`;

  // Social
  if (context.social.isFamily) contextBlock += `Visite en famille. Tu peux y faire référence.\n`;
  if (context.social.isGroup) contextBlock += `Visite entre amis/groupe.\n`;
  if (context.recommends) contextBlock += `Le client recommande ! Remercie pour cette confiance.\n`;
  if (context.specificRestaurant) contextBlock += `Restaurant : ${context.specificRestaurant}.\n`;

  // Construire le prompt final
  return `AVIS GOOGLE :
Client : ${firstName}
Note : ${stars} (${rating}/5)
Commentaire : « ${text} »

${contextBlock}
CONSIGNES :
1. Commence par "Bonjour ${firstName}"
2. Rebondis sur un détail PRÉCIS de l'avis (un plat, une expression, un compliment)
3. Maximum 80 mots — chaque mot doit compter
4. Termine par : ${signature}
5. Pas de guillemets autour de ta réponse
6. Écris ta réponse directement, PAS de commentaire avant/après

Ta réponse :`;
}

// =====================================================
// NETTOYAGE RÉPONSE IA
// =====================================================

function cleanAIResponse(aiResponse, context) {
  // Supprimer tokens parasites (DeepSeek/LLaMA artifacts)
  aiResponse = aiResponse
    .replace(/<\/?s>/gi, '')
    .replace(/<\|.*?\|>/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```[\s\S]*?```/gi, '')
    .replace(/```/g, '')
    .trim();

  // Extraire le texte entre guillemets si le modèle en a mis
  const quoteMatch = aiResponse.match(/^["«"](.+)["»"]$/s);
  if (quoteMatch && quoteMatch[1] && quoteMatch[1].length > 20) {
    aiResponse = quoteMatch[1].trim();
  } else {
    aiResponse = aiResponse.replace(/^["'«""]+\s*/, '').replace(/\s*["'»""]+$/, '').trim();
  }

  // Supprimer les préambules type "Voici la réponse :"
  aiResponse = aiResponse
    .replace(/^(voici|here is|réponse|response)\s*[:：]\s*/i, '')
    .replace(/^(bien sûr|of course|certainly)\s*[,!]\s*/i, '')
    .trim();

  // Si fidélité inconnue → supprimer les expressions interdites
  if (context.unknownFidelity) {
    aiResponse = aiResponse
      .replace(/pour (cette|votre) première (visite|fois|commande|découverte)/gi, 'pour votre visite')
      .replace(/première (visite|fois|commande|découverte)/gi, 'visite')
      .replace(/(cette|votre) découverte/gi, 'votre visite')
      .replace(/bienvenue (parmi nous|dans notre famille|chez nous|chez Antoine)/gi, 'Au plaisir de vous revoir')
      .replace(/bienvenue chez nous/gi, 'Au plaisir de vous revoir')
      .replace(/et bienvenue[^!.]*[!.]/gi, '.')
      .replace(/heureux de vous avoir accueilli pour la première fois/gi, 'heureux de vous avoir accueilli')
      .replace(/ravi de cette première/gi, 'ravi de cette')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Supprimer mots interdits (ton servile)
  aiResponse = aiResponse
    .replace(/\bch[eè]r(e)?\s+/gi, '')
    .replace(/sinc[eè]res? excuses?/gi, 'excuses')
    .replace(/mille (excuses|pardons)/gi, 'nos excuses')
    .replace(/nous vous prions de/gi, '')
    .replace(/\bnavr[ée]s?\b/gi, 'désolés')
    .replace(/\s+/g, ' ')
    .trim();

  return aiResponse.replace(/^["'«""]+/, '').replace(/["'»""]+$/, '');
}

// =====================================================
// FALLBACK LOCAL PREMIUM — 50+ VARIATIONS NATURELLES
// =====================================================

/**
 * Sélection aléatoire dans un tableau
 */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Générateur local premium — dernière ligne de défense
 * Écrit comme Antoine, pas comme un robot
 */
function generateLocalPremiumResponse(review, firstName, signature, phone) {
  const { rating, text } = review;
  const context = analyzeReviewContext(text, review.author, rating);

  // ── Fragments réutilisables ──
  const dishRef = context.dishesFound.length > 0
    ? context.dishesFound[0].name
    : null;

  // ════════════════════════════════════
  // AVIS POSITIFS (4-5★)
  // ════════════════════════════════════
  if (rating >= 4) {
    return buildPositiveResponse(firstName, rating, context, dishRef, signature);
  }

  // ════════════════════════════════════
  // AVIS MITIGÉS (3★)
  // ════════════════════════════════════
  if (rating === 3) {
    return buildMixedResponse(firstName, context, dishRef, phone, signature);
  }

  // ════════════════════════════════════
  // AVIS NÉGATIFS (1-2★)
  // ════════════════════════════════════
  return buildNegativeResponse(firstName, context, dishRef, phone, signature);
}

function buildPositiveResponse(firstName, rating, context, dishRef, signature) {
  const isFive = rating === 5;

  // ── Ouverture (variée) ──
  let openers;
  if (context.emotionalTone === 'enthousiaste') {
    openers = [
      `Bonjour ${firstName}, ça fait vraiment plaisir de lire autant d'enthousiasme !`,
      `Bonjour ${firstName}, waouh, merci pour ce retour qui met la patate à toute l'équipe !`,
      `Bonjour ${firstName}, des mots comme ça, c'est le meilleur carburant pour nous !`
    ];
  } else {
    openers = [
      `Bonjour ${firstName}, merci pour ce retour qui nous fait chaud au cœur !`,
      `Bonjour ${firstName}, un grand merci pour ces ${isFive ? '5 étoiles' : 'belles étoiles'} !`,
      `Bonjour ${firstName}, trop content de lire ça !`,
      `Bonjour ${firstName}, merci, ça nous touche sincèrement !`
    ];
  }

  // ── Corps (sur-mesure) ──
  let body = '';

  // Référence au plat
  if (dishRef) {
    const dishBodies = {
      pizza: [
        `Notre ${dishRef}, c'est de la pâte pétrie chaque matin et du savoir-faire depuis 1970.`,
        `La ${dishRef} fait partie de nos fiertés — ravi qu'elle vous ait conquis(e) !`,
        `Ah la ${dishRef}... un classique qu'on prépare toujours avec le même amour.`
      ],
      pasta: [
        `Nos ${dishRef} sont préparées à la minute avec du vrai Parmesan Regiano — rien que ça.`,
        `La ${dishRef}, c'est notre recette, des pâtes cuites à la minute et du parmesan Regiano. Content que ça se sente !`
      ],
      burrata: [
        `Notre ${dishRef}, c'est un petit moment de bonheur italien qu'on est fiers de servir.`,
        `La ${dishRef}, crémeuse à souhait — ravi que vous l'ayez appréciée !`
      ],
      dessert: [
        `Notre ${dishRef} fait maison, c'est la touche finale qui fait la différence !`,
        `Ah le ${dishRef}... notre petit péché mignon maison. Content qu'il vous ait plu !`
      ]
    };
    const cat = context.dishesFound[0]?.category?.split('-')[0] || 'pizza';
    const templates = dishBodies[cat] || dishBodies.pizza;
    body = pick(templates);
  } else if (context.positives.taste) {
    body = pick([
      'Tout est préparé à la minute avec des vrais produits — ça se goûte.',
      'Le secret ? Pâte maison, ingrédients frais, zéro compromis depuis 1970.',
      'Chez nous, tout est fait maison et préparé à la commande. Content que ça se sente !'
    ]);
  } else if (context.positives.generous) {
    body = pick([
      'La générosité, c\'est dans notre ADN depuis 1970 !',
      'Ici, on ne fait pas dans le chiche — c\'est la marque Chez Antoine depuis toujours.'
    ]);
  } else if (context.positives.staff) {
    body = pick([
      'On transmet direct à l\'équipe — ça va leur faire la journée !',
      'L\'équipe sera ravie de lire ça, merci pour eux !',
      'Notre équipe met du cœur à l\'ouvrage, ça fait plaisir que ça se voie.'
    ]);
  } else if (context.positives.value) {
    body = pick([
      'Du fait maison à prix juste, c\'est ce qu\'on défend depuis 1970.',
      'Bon et accessible — c\'est exactement notre philosophie depuis toujours.'
    ]);
  } else if (context.positives.speed) {
    body = pick([
      'On fait au plus vite sans sacrifier la qualité — c\'est tout l\'art !',
      'Rapide ET fait maison, c\'est le défi qu\'on se lance chaque jour.'
    ]);
  } else {
    body = pick([
      'On met tout notre cœur dans chaque pizza et chaque assiette depuis 1970.',
      'C\'est pour des retours comme le vôtre qu\'on se lève chaque matin.',
      'Merci de nous faire confiance — c\'est ce qui nous motive.'
    ]);
  }

  // ── Référence livraison ──
  if (context.visitType === 'livraison') {
    body += pick([
      ' Merci de nous faire confiance en livraison !',
      ''
    ]);
  }

  // ── Fidélité ──
  if (context.isFidelite) {
    body += pick([
      ' Votre fidélité nous touche.',
      ' Merci pour votre fidélité, ça compte énormément.',
      ''
    ]);
  }

  // ── Recommandation ──
  if (context.recommends) {
    body += pick([
      ' Et merci pour la recommandation !',
      ''
    ]);
  }

  // ── Fermeture ──
  const closers = [
    `Au plaisir de vous revoir 🍕`,
    `On vous attend pour la prochaine !`,
    `À très vite chez nous 🍕`,
    `La porte est toujours ouverte pour vous !`
  ];

  return `"${pick(openers)} ${body.trim()} ${pick(closers)} ${signature}"`;
}

function buildMixedResponse(firstName, context, dishRef, phone, signature) {
  const opener = pick([
    `Bonjour ${firstName}, merci d'avoir pris le temps de nous écrire.`,
    `Bonjour ${firstName}, merci pour ce retour honnête.`,
    `Bonjour ${firstName}, on apprécie votre franchise.`
  ]);

  let body = '';

  // Adresser le problème principal
  if (context.issues.wait) {
    body = pick([
      'L\'attente, on comprend que c\'est frustrant. Chez nous, tout sort du four à la commande — zéro précuit. Un coup de fil au ' + phone + ' et on vous prépare tout en avance.',
      'On sait que l\'attente peut gâcher le plaisir. Tout est préparé à la minute, c\'est le prix de la fraîcheur. Astuce : commandez au ' + phone + ' pour gagner du temps.'
    ]);
  } else if (context.issues.cold) {
    body = context.visitType === 'livraison'
      ? 'Le trajet peut malheureusement refroidir les plats — 2 min au four et c\'est reparti. On travaille constamment nos emballages.'
      : 'Un plat pas assez chaud, c\'est pas normal chez nous. N\'hésitez pas à le signaler sur place, on repart direct au four.';
  } else if (context.issues.portions) {
    body = 'Nos portions sont généreuses depuis 1970 ! Pour les gros appétits, pensez au format 40cm (+2€) ou ajoutez des empanadas à 3€.';
  } else if (context.issues.quality) {
    body = dishRef
      ? `On est exigeants sur notre ${dishRef} comme sur tout le reste. Ce n'est pas notre standard habituel — appelez-nous au ${phone}, on veut comprendre.`
      : `Ce n'est pas notre standard habituel. On aimerait comprendre — un appel au ${phone} et on en discute ?`;
  } else if (context.issues.service) {
    body = `Le service, c'est aussi important que l'assiette. On prend ça au sérieux — merci de nous le signaler.`;
  } else {
    body = dishRef
      ? `On prend note de vos remarques sur notre ${dishRef}. On cherche toujours à s'améliorer.`
      : `On prend note de vos remarques — c'est comme ça qu'on progresse.`;
  }

  // Reconnaître les positifs s'il y en a
  const activePositives = Object.entries(context.positives).filter(([_, v]) => v);
  if (activePositives.length > 0) {
    if (context.positives.taste) body += ' Content que le goût ait été au rendez-vous malgré tout.';
    else if (context.positives.staff) body += ' Ravi que l\'équipe ait été à la hauteur.';
  }

  const closer = pick([
    'On espère vous revoir pour se rattraper !',
    `On fera mieux la prochaine fois !`,
    'À bientôt chez nous 🍕'
  ]);

  return `"${opener} ${body.trim()} ${closer} ${signature}"`;
}

function buildNegativeResponse(firstName, context, dishRef, phone, signature) {
  // ── Ton calibré selon l'émotion ──
  let opener, body;

  if (context.emotionalTone === 'en_colere') {
    opener = pick([
      `Bonjour ${firstName}, votre retour nous touche et on le prend très au sérieux.`,
      `Bonjour ${firstName}, on ne prend pas ce genre de retour à la légère.`
    ]);
  } else {
    opener = pick([
      `Bonjour ${firstName}, merci d'avoir pris le temps de nous écrire malgré la déception.`,
      `Bonjour ${firstName}, on est désolés de lire ça.`,
      `Bonjour ${firstName}, ce n'est clairement pas ce qu'on veut offrir.`
    ]);
  }

  // Corps spécifique au problème
  if (context.issues.hygiene) {
    body = `L'hygiène est notre priorité absolue. Ce que vous décrivez n'est pas acceptable et on veut tirer ça au clair. Appelez-nous au ${phone} — c'est important.`;
  } else if (context.issues.cold && context.visitType === 'livraison') {
    body = `La livraison peut malheureusement impacter la température. C'est frustrant, on le sait. Un petit passage au four 2 min et c'est retrouvé. On travaille à améliorer nos emballages.`;
  } else if (context.issues.wait) {
    body = `L'attente quand on a faim, c'est le pire. Chez nous tout est préparé à la commande, pas de précuit. Pour éviter ça : un appel au ${phone} et tout est prêt à votre arrivée.`;
  } else if (context.issues.service) {
    body = `Le respect et la bienveillance, c'est la base chez nous. Ce que vous décrivez n'est pas notre standard. On va en parler en interne, comptez sur nous.`;
  } else if (context.issues.missing) {
    body = `Une erreur de commande, c'est inadmissible. On vous présente nos excuses. Appelez-nous au ${phone}, on rectifie le tir immédiatement.`;
  } else if (context.issues.quality) {
    body = dishRef
      ? `Notre ${dishRef} ne vous a pas convaincu et ça nous embête. Ce n'est pas notre standard — tout est fait maison à la minute depuis 1970. Contactez-nous au ${phone}, on veut comprendre.`
      : `Ce n'est pas le standard Chez Antoine. Depuis 1970, on met un point d'honneur au fait maison et à la qualité. Appelez-nous au ${phone}, on aimerait comprendre.`;
  } else if (context.issues.portions) {
    body = `La générosité, c'est notre marque de fabrique depuis 1970. Si ça n'a pas été au rendez-vous, on veut savoir pourquoi. N'hésitez pas : ${phone}.`;
  } else if (context.issues.price) {
    body = `Pizzas maison dès 8,90€, pâtes minute avec du vrai Parmesan Regiano dès 8,90€. C'est du 100% fait maison avec des vrais produits — on assume nos prix.`;
  } else {
    body = `Ce n'est pas l'expérience qu'on veut offrir. On met du cœur dans chaque assiette depuis 1970, et quand ça rate, ça nous embête vraiment. Contactez-nous au ${phone}, on aimerait se rattraper.`;
  }

  return `"${opener} ${body.trim()} ${signature}"`;
}

// =====================================================
// UTILITAIRES PUBLICS
// =====================================================

function isAIConfigured() {
  return !!process.env.OPENROUTER_API_KEY;
}

function getRestaurantContext() {
  return loadRestaurantContext();
}

module.exports = {
  generateAIResponse,
  isAIConfigured,
  getRestaurantContext,
  buildSystemPrompt
};
