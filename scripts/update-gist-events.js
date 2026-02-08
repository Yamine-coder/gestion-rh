/**
 * 📤 Upload Événements Vincennes vers GitHub Gist
 * 
 * Similaire à update-gist.js mais pour evenements-vincennes.json
 */

const https = require('https');
const fs = require('fs');

const GIST_TOKEN = process.env.GIST_TOKEN;
const GIST_ID = process.env.GIST_ID_EVENTS || process.env.GIST_ID; // Peut utiliser un Gist séparé ou le même

async function updateGist() {
  if (!GIST_TOKEN) {
    console.log('⚠️ GIST_TOKEN non défini - skip upload');
    return;
  }
  
  if (!GIST_ID) {
    console.log('⚠️ GIST_ID non défini - skip upload');
    return;
  }
  
  // Lire le fichier JSON
  const jsonPath = 'evenements-vincennes.json';
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ Fichier evenements-vincennes.json non trouvé');
    process.exit(1);
  }
  
  const content = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(content);
  
  console.log(`📤 Upload vers Gist: ${data.eventsCount} événements...`);
  
  // Préparer la requête
  const gistData = JSON.stringify({
    files: {
      'evenements-vincennes.json': {
        content: content
      }
    }
  });
  
  const options = {
    hostname: 'api.github.com',
    path: `/gists/${GIST_ID}`,
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${GIST_TOKEN}`,
      'User-Agent': 'GestionRH-EventsUploader',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(gistData)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Événements uploadés vers Gist avec succès!');
          console.log(`   → https://gist.github.com/${GIST_ID}`);
          resolve();
        } else {
          console.error(`❌ Erreur Gist: ${res.statusCode}`);
          console.error(data);
          reject(new Error(`Gist error: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('❌ Erreur réseau:', e.message);
      reject(e);
    });
    
    req.write(gistData);
    req.end();
  });
}

updateGist().catch(console.error);
