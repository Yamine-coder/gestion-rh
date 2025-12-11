const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function simulerPauseExcessive() {
  try {
    console.log('🧪 SIMULATION PAUSE EXCESSIVE\n');
    
    // 1. Se connecter en tant que Jordan
    console.log('1️⃣ Connexion Jordan...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'yjordan496@gmail.com',
      password: 'password123'
    });
    const token = loginRes.data.token;
    const userId = loginRes.data.user.id;
    console.log(`   ✅ Connecté: ${loginRes.data.user.prenom} ${loginRes.data.user.nom} (ID: ${userId})`);
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // 2. Supprimer les données existantes pour aujourd'hui
    console.log('\n2️⃣ Nettoyage données du 6 décembre...');
    const { PrismaClient } = require('./server/node_modules/@prisma/client');
    const prisma = new PrismaClient();
    
    const today = '2025-12-06';
    
    // Supprimer anomalies
    await prisma.anomalie.deleteMany({
      where: {
        employeId: userId,
        date: {
          gte: new Date(`${today}T00:00:00Z`),
          lt: new Date(`${today}T23:59:59Z`)
        }
      }
    });
    
    // Supprimer pointages
    await prisma.pointage.deleteMany({
      where: {
        userId: userId,
        horodatage: {
          gte: new Date(`${today}T00:00:00Z`),
          lt: new Date(`${today}T23:59:59Z`)
        }
      }
    });
    
    // Supprimer shifts
    await prisma.shift.deleteMany({
      where: {
        employeId: userId,
        date: {
          gte: new Date(`${today}T00:00:00Z`),
          lt: new Date(`${today}T23:59:59Z`)
        }
      }
    });
    console.log('   ✅ Données nettoyées');
    
    // 3. Créer un shift avec pause
    console.log('\n3️⃣ Création shift avec pause 12:00-13:00...');
    const shift = await prisma.shift.create({
      data: {
        employeId: userId,
        date: new Date(`${today}T00:00:00Z`),
        heureDebut: '09:00',
        heureFin: '17:00',
        statut: 'confirme',
        segments: [
          { type: 'travail', start: '09:00', end: '12:00' },
          { type: 'pause', start: '12:00', end: '13:00' },
          { type: 'travail', start: '13:00', end: '17:00' }
        ]
      }
    });
    console.log(`   ✅ Shift créé: 09:00-17:00 avec pause 12:00-13:00`);
    
    // 4. Créer les pointages manuellement (arrivée + départ pause)
    console.log('\n4️⃣ Création pointages initiaux...');
    
    // Arrivée à 09:00
    await prisma.pointage.create({
      data: {
        userId: userId,
        type: 'arrivee',
        horodatage: new Date(`${today}T08:00:00Z`), // 09:00 Paris
        source: 'qr_code'
      }
    });
    console.log('   ✅ Arrivée 09:00');
    
    // Départ pause à 12:00
    await prisma.pointage.create({
      data: {
        userId: userId,
        type: 'depart',
        horodatage: new Date(`${today}T11:00:00Z`), // 12:00 Paris
        source: 'qr_code'
      }
    });
    console.log('   ✅ Départ pause 12:00');
    
    await prisma.$disconnect();
    
    // 5. Simuler le retour de pause via l'API (13:30 = 30min de retard)
    console.log('\n5️⃣ 🔥 SIMULATION RETOUR PAUSE EXCESSIVE (13:30 au lieu de 13:00)...');
    console.log('   → L\'employé scanne son QR code pour revenir de pause');
    console.log('   → Pause prévue: 1h (12:00-13:00)');
    console.log('   → Pause réelle: 1h30 (12:00-13:30)');
    console.log('   → Dépassement: 30 minutes\n');
    
    try {
      const pointageRes = await axios.post(`${API_URL}/pointage/auto`, {}, { headers });
      
      console.log('📋 RÉSULTAT DU POINTAGE:');
      console.log(`   Message: ${pointageRes.data.message}`);
      console.log(`   Type: ${pointageRes.data.pointage?.type}`);
      
      if (pointageRes.data.anomalies && pointageRes.data.anomalies.length > 0) {
        console.log('\n🚨 ANOMALIES DÉTECTÉES EN TEMPS RÉEL:');
        pointageRes.data.anomalies.forEach(a => {
          console.log(`   ${a.icon} ${a.type}: ${a.message}`);
          if (a.detail) console.log(`      Détail: ${a.detail}`);
          console.log(`      Gravité: ${a.gravite}`);
        });
      } else {
        console.log('\n✅ Aucune anomalie détectée (normal si dans les 5min de tolérance)');
      }
      
    } catch (err) {
      console.log('❌ Erreur pointage:', err.response?.data?.message || err.message);
    }
    
    // 6. Vérifier les anomalies en BDD
    console.log('\n6️⃣ Vérification anomalies en BDD...');
    const prisma2 = new PrismaClient();
    const anomalies = await prisma2.anomalie.findMany({
      where: {
        employeId: userId,
        date: {
          gte: new Date(`${today}T00:00:00Z`),
          lt: new Date(`${today}T23:59:59Z`)
        }
      }
    });
    
    if (anomalies.length > 0) {
      console.log('📋 Anomalies créées:');
      anomalies.forEach(a => {
        console.log(`   - ${a.type}: ${a.description}`);
      });
    } else {
      console.log('   Aucune anomalie en BDD');
    }
    
    await prisma2.$disconnect();
    
    console.log('\n✅ Simulation terminée ! Rafraîchis la page Pointage pour voir le résultat.');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

simulerPauseExcessive();
