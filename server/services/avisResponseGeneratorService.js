/**
 * 🤖 Service de génération de réponses aux avis via IA (GOOGLE GEMINI - GRATUIT)
 * 
 * Utilise Google Gemini 1.5 Flash pour générer des réponses personnalisées
 * aux avis Google, adaptées au contexte exact du commentaire.
 * 
 * GRATUIT : 15 req/min, 1500 req/jour
 * Créer une clé : https://aistudio.google.com/apikey
 * 
 * Le contexte du restaurant est chargé depuis config/restaurantContext.json
 * Tu peux le modifier à tout moment sans toucher au code !
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Charge le contexte du restaurant depuis le fichier JSON
 */
function loadRestaurantContext() {
  try {
    const configPath = path.join(__dirname, '../config/restaurantContext.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config;
  } catch (error) {
    console.error('Erreur chargement contexte restaurant:', error.message);
    return null;
  }
}

/**
 * Génère le prompt système à partir du fichier de config
 */
function buildSystemPrompt() {
  const ctx = loadRestaurantContext();
  if (!ctx) return getDefaultPrompt();
  
  const phone = ctx.contact?.telephonePrincipal || '01 41 74 10 71';
  
  // Construction du prompt à partir du JSON
  let prompt = `Tu es le Community Manager de "${ctx.nom}", ${ctx.slogan}, pizzeria familiale depuis ${ctx.depuis}.

📞 TÉLÉPHONE : ${phone}

🏠 RESTAURANTS :
${ctx.restaurants.map(r => `- ${r.nom}${r.halal === '100%' ? ' (100% Halal)' : ''}`).join('\n')}

🚗 LIVRAISON :
- Plateformes : ${ctx.livraison?.plateformes?.join(', ') || 'Uber Eats, Deliveroo, Just Eat'}
- Délai moyen : ${ctx.livraison?.delaiMoyen || '30-45 min'}
- Conseil : ${ctx.livraison?.conseilLivraison || 'Réchauffer légèrement si refroidi'}

🍕 NOS PIZZAS :
- Taille normale : 33cm (1 personne)
- Grande taille : 40cm (+2€) pour 2 personnes ou gros appétit
- Pâte faite MAISON chaque jour
- Prix : ${ctx.carte.pizzas.baseTomate[0].prix}€ à ${ctx.carte.pizzas.baseCreme[0].prix}€
- Pizzas populaires : Margherita, Reine, 4 Fromages, Savoyarde, Raclette

🍝 NOS PÂTES :
- Préparées À LA MINUTE (jamais précuites)
- Vrai PARMESAN REGIANO râpé
- Prix : ${ctx.carte.pates.plats[0].prix}€ à ${ctx.carte.pates.plats[ctx.carte.pates.plats.length-1].prix}€
- Pâtes populaires : Carbonara, Bolognaise, Saumon, Truffe

🧀 AUTRES :
- Burratas : ${ctx.carte.burratas.plats[0].prix}€ à ${ctx.carte.burratas.plats[1].prix}€
- Empanadas : ${ctx.carte.empanadas.plats[0].prix}€
- Desserts maison : Tiramisu ${ctx.carte.desserts.plats[2].prix}€, Mi-cuit chocolat ${ctx.carte.desserts.plats[0].prix}€

☪️ HALAL : Viandes halal (bœuf, poulet, merguez). NON halal : jambon, Parme, lardons.

💪 NOS FORCES :
- Pizzeria familiale depuis 1970
- Tout fait MAISON et préparé À LA MINUTE
- Portions GÉNÉREUSES
- Prix accessibles (pizzas dès 8,90€)

📋 RÉPONSES AUX PROBLÈMES :
• ATTENTE/LENTEUR : Tout est frais, préparé à la commande. Pour éviter l'attente, commander par téléphone au ${phone}.
• PIZZA FROIDE (livraison) : Le transport peut refroidir, préchauffer 2min au four. Nos emballages gardent la chaleur au maximum.
• PORTIONS PETITES : Nos portions sont généreuses ! Pour gros appétits : format 40cm (+2€) ou ajouter empanadas.
• PRIX : Pizzas dès 8,90€ avec pâte maison et ingrédients frais. Prix justes pour du fait maison.

📝 TON DE RÉPONSE :
- Chaleureux et personnel, JAMAIS servile
- Maximum 70 mots
- Signature : ${ctx.tonReponse.signature}
`;

  return prompt;
}

/**
 * Analyse le contenu de l'avis pour extraire des indices contextuels
 */
function analyzeReviewContext(text, author, rating) {
  const lowerText = (text || '').toLowerCase();
  
  // Indices de fidélité
  const isFidelite = /habitué|régulier|toujours|comme d'habitude|depuis (des )?années|chaque (fois|semaine|mois)|notre pizzeria préférée|on revient|fidèle|comme toujours/i.test(lowerText);
  const mentionsReturn = /je reviendrai|on reviendra|à refaire|nous reviendrons|j'y retourne/i.test(lowerText);
  const firstTimeExplicit = /première (fois|visite|commande)|découvert|essayé pour la première|jamais (été|venu|goûté)/i.test(lowerText);
  
  // Contexte de la visite
  const isDelivery = /livraison|livré|livreur|uber|deliveroo|just eat|commande en ligne/i.test(lowerText);
  const isTakeaway = /emporter|à emporter|take away|récupéré/i.test(lowerText);
  const isOnSite = /sur place|en salle|terrasse|ambiance|accueil|serveur|serveuse|service à table/i.test(lowerText);
  
  // Problèmes mentionnés
  const mentionsWait = /attente|attendu|long(temps)?|lent|tardé|retard/i.test(lowerText);
  const mentionsCold = /froid|tiède|pas chaud|refroidi/i.test(lowerText);
  const mentionsPortions = /petit|portion|quantité|maigre|léger|pas assez/i.test(lowerText);
  const mentionsPrice = /cher|prix|coût|tarif/i.test(lowerText);
  const mentionsQuality = /qualité|goût|saveur|délicieux|excellent|fade|mauvais|déçu/i.test(lowerText);
  
  // Points positifs
  const mentionsStaff = /équipe|personnel|serveur|serveuse|accueil|sympathique|gentil|souriant|aimable/i.test(lowerText);
  const mentionsFresh = /frais|fraîch|fait maison|minute|préparé/i.test(lowerText);
  const mentionsGenerous = /généreux|copieux|bonne portion|bien servi/i.test(lowerText);
  
  // Plats mentionnés
  const mentionsPizza = /pizza|calzone|margherita|4 fromages|regina|napolitaine/i.test(lowerText);
  const mentionsPasta = /pâte|pasta|spaghetti|tagliatelle|carbonara|bolognaise|arrabiata/i.test(lowerText);
  const mentionsBurrata = /burrata/i.test(lowerText);
  const mentionsSalmon = /saumon/i.test(lowerText);
  const mentionsDessert = /dessert|tiramisu|panna cotta|nutella/i.test(lowerText);
  
  return {
    // Fidélité - NE JAMAIS supposer que c'est une première visite sauf si c'est explicite
    isFidelite,
    mentionsReturn,
    firstTimeExplicit,
    unknownFidelity: !isFidelite && !firstTimeExplicit,
    
    // Type de visite
    visitType: isDelivery ? 'livraison' : isTakeaway ? 'emporter' : isOnSite ? 'sur place' : 'inconnu',
    
    // Problèmes
    issues: {
      wait: mentionsWait,
      cold: mentionsCold,
      portions: mentionsPortions,
      price: mentionsPrice,
      quality: mentionsQuality && rating <= 3
    },
    
    // Points positifs
    positives: {
      staff: mentionsStaff,
      fresh: mentionsFresh,
      generous: mentionsGenerous
    },
    
    // Plats
    dishes: {
      pizza: mentionsPizza,
      pasta: mentionsPasta,
      burrata: mentionsBurrata,
      salmon: mentionsSalmon,
      dessert: mentionsDessert
    },
    
    // Note
    isNegative: rating <= 2,
    isMixed: rating === 3,
    isPositive: rating >= 4
  };
}

/**
 * Prompt par défaut si le fichier de config n'existe pas
 */
function getDefaultPrompt() {
  return `Tu es le Community Manager de "Chez Antoine", pizzeria familiale depuis 1970.
Réponds de manière professionnelle et chaleureuse aux avis Google.
Maximum 80 mots. Signature : — L'équipe Chez Antoine 🍕`;
}

/**
 * Génère une réponse personnalisée à un avis Google via Groq (gratuit)
 * 
 * @param {Object} review - L'avis Google
 * @param {string} review.author - Nom de l'auteur
 * @param {number} review.rating - Note (1-5)
 * @param {string} review.text - Texte de l'avis
 * @returns {Promise<string>} - Réponse générée
 */
async function generateAIResponse(review) {
  const { author, rating, text } = review;
  const firstName = (author || 'Client').split(' ')[0];
  const ctx = loadRestaurantContext();
  const phone = ctx?.contact?.telephonePrincipal || ctx?.telephone || '01 41 74 10 71';
  const signature = ctx?.tonReponse?.signature || '— L\'équipe Chez Antoine 🍕';
  
  // Si pas de texte, réponse générique
  if (!text || text.trim().length < 10) {
    if (rating <= 2) {
      return `"Bonjour ${firstName}, nous sommes désolés que votre expérience n'ait pas été à la hauteur. N'hésitez pas à nous contacter au ${phone} pour nous en dire plus. ${signature}"`;
    }
    return `"Bonjour ${firstName}, merci pour votre confiance ! Au plaisir de vous revoir 🍕 ${signature}"`;
  }

  try {
    const systemPrompt = buildSystemPrompt();
    
    // Analyse contextuelle de l'avis
    const context = analyzeReviewContext(text, author, rating);
    
    // Construire les instructions contextuelles
    let contextInstructions = `\n\nCONTEXTE DE CET AVIS :\n`;
    
    // Type de visite - IMPORTANT pour adapter la réponse
    if (context.visitType === 'livraison') {
      contextInstructions += `🚗 COMMANDE EN LIVRAISON (Uber Eats/Deliveroo/Just Eat)\n`;
      contextInstructions += `   → Si problème de température : expliquer que le transport peut refroidir, conseiller de préchauffer\n`;
      contextInstructions += `   → Si problème d'attente : c'est souvent lié aux plateformes, pas à nous\n`;
    } else if (context.visitType === 'emporter') {
      contextInstructions += `📦 COMMANDE À EMPORTER\n`;
    } else if (context.visitType === 'sur place') {
      contextInstructions += `🍽️ VISITE SUR PLACE AU RESTAURANT\n`;
    }
    
    // Fidélité
    if (context.firstTimeExplicit) {
      contextInstructions += `✅ PREMIÈRE VISITE : Le client le dit explicitement - tu peux souhaiter la bienvenue.\n`;
    } else if (context.isFidelite) {
      contextInstructions += `✅ CLIENT FIDÈLE : Remercie pour sa fidélité.\n`;
    } else {
      contextInstructions += `⛔ FIDÉLITÉ INCONNUE : NE DIS PAS "première visite/découverte/bienvenue parmi nous".\n`;
    }
    
    // Problèmes spécifiques à adresser
    if (context.issues.cold) {
      if (context.visitType === 'livraison') {
        contextInstructions += `🥶 PIZZA FROIDE (livraison) : Expliquer que le transport peut refroidir malgré nos emballages, conseiller de préchauffer 2min au four.\n`;
      } else {
        contextInstructions += `🥶 PLAT FROID : S'excuser, tout est normalement servi chaud sorti du four.\n`;
      }
    }
    if (context.issues.wait) {
      contextInstructions += `⏱️ ATTENTE : Tout est préparé à la minute (pas de précuit). Pour éviter : commander au 01 41 74 10 71.\n`;
    }
    if (context.issues.portions) {
      contextInstructions += `📏 PORTIONS : Nos portions sont généreuses ! Format 40cm (+2€) pour gros appétits.\n`;
    }
    if (context.issues.price) {
      contextInstructions += `💰 PRIX : Pizzas dès 8,90€, pâtes dès 8,90€ avec vrai parmesan. Prix justes pour du fait maison.\n`;
    }
    
    // Plats mentionnés
    const dishes = Object.entries(context.dishes).filter(([_, v]) => v);
    if (dishes.length > 0) {
      contextInstructions += `🍽️ PLATS CITÉS : ${dishes.map(([k]) => k).join(', ')}\n`;
    }
    
    // Ton selon la note
    if (context.isNegative) {
      contextInstructions += `😔 NOTE ${rating}/5 : Sois empathique, excuse-toi, propose de rattraper. Donne le tél.\n`;
    } else if (context.isMixed) {
      contextInstructions += `😐 NOTE ${rating}/5 : Remercie et adresse les points négatifs.\n`;
    } else {
      contextInstructions += `😊 NOTE ${rating}/5 : Remercie chaleureusement.\n`;
    }

    // Construire le prompt utilisateur - SIMPLIFIÉ
    let userPrompt = `AVIS GOOGLE À TRAITER :

Client : ${firstName}
Note : ${'⭐'.repeat(rating)}${'☆'.repeat(5-rating)} (${rating}/5)
${context.visitType !== 'inconnu' ? `Via : ${context.visitType}` : ''}
Commentaire : "${text}"

CONSIGNES :
1. Commence par "Bonjour ${firstName}"
2. ${context.unknownFidelity ? 'NE DIS PAS "première visite/découverte"' : context.firstTimeExplicit ? 'Tu peux mentionner sa première visite' : 'Remercie sa fidélité'}
3. ${context.issues.cold && context.visitType === 'livraison' ? 'Explique que la livraison peut refroidir, conseille de préchauffer' : context.issues.cold ? 'Excuse-toi pour le plat froid' : 'Réponds aux points soulevés'}
4. Maximum 70 mots
5. Termine par la signature

Génère la réponse entre guillemets :`;

    // Modèles gratuits vérifiés le 04/02/2026 - par ordre de qualité
    const FREE_MODELS = [
      'deepseek/deepseek-r1-0528:free',                                // DeepSeek R1 - Excellent raisonnement
      'qwen/qwen3-next-80b-a3b-instruct:free',                         // Qwen3 80B - Très performant
      'openai/gpt-oss-120b:free',                                      // GPT OSS 120B - Gros modèle
      'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', // Dolphin 24B - Bon
      'tngtech/deepseek-r1t2-chimera:free',                            // DeepSeek Chimera
      'upstage/solar-pro-3:free',                                      // Solar Pro 3
      'nvidia/nemotron-3-nano-30b-a3b:free',                           // Nemotron 30B
    ];
    
    let lastError = null;
    
    // Essayer chaque modèle jusqu'à ce qu'un fonctionne
    for (const model of FREE_MODELS) {
      try {
        console.log(`🤖 Tentative avec modèle: ${model}`);
        
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: model,
            messages: [
              {
                role: "system",
                content: systemPrompt + contextInstructions
              },
              {
                role: "user",
                content: userPrompt
              }
            ],
            max_tokens: 300,
            temperature: 0.7
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://gestion-rh.app',
              'X-Title': 'Gestion RH - Avis Google'
            },
            timeout: 30000 // 30 secondes timeout
          }
        );

        let aiResponse = response.data.choices[0].message.content.trim();
        
        console.log(`✅ Réponse brute de ${model}:`, aiResponse.substring(0, 200) + '...');
        
        // NETTOYAGE : Supprimer les tokens parasites des modèles
        aiResponse = aiResponse
          .replace(/<\/?s>/gi, '')           // Tokens <s> et </s>
          .replace(/<\|.*?\|>/gi, '')        // Tokens <|...|>
          .replace(/<think>[\s\S]*?<\/think>/gi, '') // Supprimer les blocs de réflexion
          .replace(/```[\s\S]*?```/gi, '')   // Supprimer les blocs de code
          .replace(/```/g, '')               // Supprimer les backticks restants
          .trim();
        
        // Extraire le texte entre guillemets si présent
        const quoteMatch = aiResponse.match(/"([^"]+)"/);
        if (quoteMatch && quoteMatch[1] && quoteMatch[1].length > 20) {
          aiResponse = quoteMatch[1];
        } else {
          // Sinon nettoyer les guillemets mal placés
          aiResponse = aiResponse
            .replace(/^["'""]+\s*/, '')
            .replace(/\s*["'""]+$/, '')
            .trim();
        }
        
        // Si la réponse est trop courte ou vide, ignorer ce modèle
        if (!aiResponse || aiResponse.length < 30) {
          console.log(`⚠️ Réponse trop courte de ${model}, essai suivant...`);
          continue;
        }
        
        // POST-TRAITEMENT : Si fidélité inconnue, supprimer les expressions interdites
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
            .replace(/\s+/g, ' ')            // Nettoyer espaces multiples
            .trim();
        }
        
        // S'assurer que la réponse est entre guillemets propres
        aiResponse = aiResponse.replace(/^["'""]+/, '').replace(/["'""]+$/, '');
        
        // Vérification finale
        if (aiResponse && aiResponse.length > 30) {
          return `"${aiResponse}"`;
        }
        
        console.log(`⚠️ Réponse invalide après nettoyage, essai suivant...`);
        continue;
        
      } catch (error) {
        const status = error.response?.status;
        const errorMsg = error.response?.data?.error?.message || error.message;
        
        console.log(`⚠️ Modèle ${model} - Erreur ${status}: ${errorMsg}`);
        lastError = error;
        
        // Si c'est une erreur 429 (rate limit) ou 404 (modèle indisponible), essayer le suivant
        if (status === 429 || status === 404) {
          continue;
        }
        
        // Pour les autres erreurs, arrêter
        break;
      }
    }
    
    console.error('❌ Tous les modèles ont échoué:', lastError?.response?.data || lastError?.message);
    return null;
    
  } catch (error) {
    console.error('Erreur OpenRouter:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Vérifie si l'API est configurée
 */
function isAIConfigured() {
  return !!process.env.OPENROUTER_API_KEY;
}

/**
 * Récupère le contexte actuel (pour debug/affichage)
 */
function getRestaurantContext() {
  return loadRestaurantContext();
}

module.exports = {
  generateAIResponse,
  isAIConfigured,
  getRestaurantContext,
  buildSystemPrompt
};
