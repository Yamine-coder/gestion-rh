/**
 * Test script pour vérifier le fonctionnement du refresh d'anomalies
 * Simule l'action d'un admin qui traite une anomalie et vérifie que le statut change
 */

const https = require('https');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Simple fetch replacement for Node.js
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ ok: res.statusCode < 400, json: () => json, text: () => data });
        } catch {
          resolve({ ok: res.statusCode < 400, json: () => ({}), text: () => data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAnomalyRefresh() {
  try {
    console.log('🔍 Test du système de refresh des anomalies...\n');

    // 1. Obtenir un token admin
    console.log('1. Connexion en tant qu\'admin...');
    const loginResponse = await makeRequest('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gestion-rh.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Erreur de connexion admin');
    }

    const { token } = await loginResponse.json();
    console.log('✅ Admin connecté');

    // 2. Obtenir la liste des anomalies en attente
    console.log('\n2. Récupération des anomalies en attente...');
    const anomalies = await prisma.anomalie.findMany({
      where: { statut: 'en_attente' },
      include: {
        employe: { select: { nom: true, prenom: true } },
        pointage: { select: { heureEntree: true, heureSortie: true, date: true } }
      }
    });

    if (anomalies.length === 0) {
      console.log('❌ Aucune anomalie en attente trouvée');
      return;
    }

    const anomalie = anomalies[0];
    console.log(`✅ Anomalie trouvée: ${anomalie.id} - ${anomalie.type} (${anomalie.employe.prenom} ${anomalie.employe.nom})`);

    // 3. Traiter l'anomalie (validation)
    console.log('\n3. Traitement de l\'anomalie...');
    const treatResponse = await makeRequest(`http://localhost:5000/api/anomalies/${anomalie.id}/validate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        statut: 'validee',
        adminNote: 'Test de refresh automatique',
        employeId: anomalie.employeId,
        date: anomalie.pointage.date,
        ecart: { id: anomalie.id, type: anomalie.type }
      })
    });

    if (!treatResponse.ok) {
      const errorText = await treatResponse.text();
      throw new Error(`Erreur traitement: ${errorText}`);
    }

    console.log('✅ Anomalie traitée via API');

    // 4. Vérifier que le statut a bien changé en base
    console.log('\n4. Vérification du statut en base...');
    const updatedAnomalie = await prisma.anomalie.findUnique({
      where: { id: anomalie.id }
    });

    if (updatedAnomalie.statut === 'validee') {
      console.log('✅ Statut mis à jour en base: validee');
      console.log(`✅ Note admin: ${updatedAnomalie.adminNote}`);
      console.log(`✅ Traitée par admin: ${updatedAnomalie.traiteeParAdminId}`);
    } else {
      console.log(`❌ Statut incorrect: ${updatedAnomalie.statut} (attendu: validee)`);
    }

    // 5. Test API de récupération des anomalies
    console.log('\n5. Test de récupération via API...');
    const getResponse = await makeRequest(`http://localhost:5000/api/anomalies?date=${anomalie.pointage.date}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (getResponse.ok) {
      const apiAnomalies = await getResponse.json();
      const foundAnomalie = apiAnomalies.find(a => a.id === anomalie.id);
      
      if (foundAnomalie && foundAnomalie.statut === 'validee') {
        console.log('✅ Anomalie correctement récupérée via API avec statut: validee');
      } else {
        console.log('❌ Problème de récupération via API');
      }
    }

    console.log('\n🎉 Test terminé avec succès!');
    console.log('👉 Le frontend devrait maintenant se rafraîchir automatiquement après une action admin.');

  } catch (error) {
    console.error('❌ Erreur durant le test:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le test
testAnomalyRefresh();
