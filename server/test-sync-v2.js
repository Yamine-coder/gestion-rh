const http = require('http');

const API_BASE = 'http://localhost:5000';

// Admins disponibles
const ADMIN_CREDENTIALS = [
  { email: 'moussa@restaurant.com', password: 'Moussa2025!' },
  { email: 'moussa@restaurant.com', password: 'Admin2025!' },
  { email: 'admin@gestionrh.com', password: 'Admin2025!' },
  { email: 'admin@gestionrh.com', password: 'admin123' },
];

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('=== TEST SYNC ANOMALIES ===\n');
  
  // 1. Login admin
  console.log('1. Tentative de login admin...');
  let token = null;
  
  for (const creds of ADMIN_CREDENTIALS) {
    try {
      const res = await request('POST', '/auth/login', creds);
      if (res.status === 200 && res.data.token) {
        console.log(`   ✅ Connecté avec ${creds.email}`);
        token = res.data.token;
        break;
      } else {
        console.log(`   ❌ ${creds.email} : ${res.data.message || 'échec'}`);
      }
    } catch (err) {
      console.log(`   ❌ ${creds.email} : erreur réseau`);
    }
  }
  
  if (!token) {
    console.log('\n❌ Impossible de se connecter en admin');
    console.log('   Vérifiez les mots de passe des admins');
    return;
  }
  
  // 2. Sync anomalies pour le 5 décembre
  console.log('\n2. Sync anomalies pour 2025-12-05...');
  const syncRes = await request('POST', '/api/anomalies/sync-from-comparison', {
    dateDebut: '2025-12-05',
    dateFin: '2025-12-05'
  }, token);
  
  console.log(`   Status: ${syncRes.status}`);
  console.log(`   Réponse:`, JSON.stringify(syncRes.data, null, 2));
  
  // 3. Vérifier les anomalies créées
  console.log('\n3. Vérification des anomalies...');
  const anomRes = await request('GET', '/api/anomalies?dateDebut=2025-12-05&dateFin=2025-12-05', null, token);
  
  if (anomRes.data.anomalies) {
    console.log(`   ${anomRes.data.anomalies.length} anomalie(s) trouvée(s) pour le 5 déc:`);
    anomRes.data.anomalies.forEach(a => {
      console.log(`   - ${a.employe?.prenom || 'N/A'} ${a.employe?.nom || ''}: ${a.type} (${a.statut})`);
    });
  } else {
    console.log('   Réponse:', anomRes.data);
  }
}

main().catch(console.error);
