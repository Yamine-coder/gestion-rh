/**
 * 📤 Upload affluence data to GitHub Gist
 * Appelé après le scraping pour stocker les données
 */

const fs = require('fs');
const https = require('https');

const GIST_TOKEN = process.env.GIST_TOKEN;
const GIST_ID = process.env.GIST_ID;

async function updateGist() {
  // Lire les données scrapées
  const dataPath = './affluence-data.json';
  
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Fichier affluence-data.json non trouvé');
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log('📖 Données lues:', data.message || 'OK');
  
  // Enrichir avec métadonnées
  const enrichedData = {
    ...data,
    source: 'github-actions',
    version: '1.0',
    restaurant: {
      name: 'Chez Antoine Vincennes',
      placeId: data.placeId
    },
    updatedAt: new Date().toISOString(),
    // Historique des 24 dernières heures (on garde les anciennes données)
    history: []
  };
  
  // Préparer le contenu du Gist
  const gistContent = {
    description: 'Affluence Chez Antoine Vincennes - Auto-updated',
    files: {
      'affluence.json': {
        content: JSON.stringify(enrichedData, null, 2)
      }
    }
  };
  
  // Mettre à jour le Gist via API GitHub
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/gists/${GIST_ID}`,
      method: 'PATCH',
      headers: {
        'Authorization': `token ${GIST_TOKEN}`,
        'User-Agent': 'affluence-scraper',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Gist mis à jour avec succès');
          const gistData = JSON.parse(body);
          console.log(`🔗 URL: https://gist.github.com/${GIST_ID}`);
          console.log(`📥 Raw: ${gistData.files['affluence.json'].raw_url}`);
          resolve(gistData);
        } else {
          console.error(`❌ Erreur Gist: ${res.statusCode}`);
          console.error(body);
          reject(new Error(`Gist update failed: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(JSON.stringify(gistContent));
    req.end();
  });
}

// Exécuter si appelé directement
if (require.main === module) {
  if (!GIST_TOKEN || !GIST_ID) {
    console.error('❌ Variables GIST_TOKEN et GIST_ID requises');
    process.exit(1);
  }
  
  updateGist()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Erreur:', err.message);
      process.exit(1);
    });
}

module.exports = { updateGist };
