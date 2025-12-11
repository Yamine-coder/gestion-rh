/**
 * TEST COMPLET - Détection automatique pause_excessive via API
 * 
 * Ce script simule un employé qui:
 * 1. Arrive au travail à 08:00
 * 2. Part en pause à 12:00
 * 3. Revient de pause à 12:45 (15 min de retard) → DÉTECTION AUTOMATIQUE
 * 
 * Utilise le MODE TEST de l'API pour simuler les heures.
 */

const axios = require('axios');
const prisma = require('./prisma/client');

const API_BASE = 'http://localhost:5000';

async function cleanupJordan(workDay) {
  // Supprimer les pointages de Jordan pour ce jour
  const dayStart = new Date(workDay + 'T00:00:00');
  const dayEnd = new Date(workDay + 'T23:59:59');
  
  await prisma.pointage.deleteMany({
    where: {
      userId: 110,
      horodatage: { gte: dayStart, lte: dayEnd }
    }
  });
  
  // Supprimer aussi les pointages de la veille (pour les shifts de nuit)
  const prevDay = new Date(dayStart);
  prevDay.setDate(prevDay.getDate() - 1);
  await prisma.pointage.deleteMany({
    where: {
      userId: 110,
      horodatage: { gte: prevDay, lt: dayStart }
    }
  });
  
  // Supprimer les anomalies
  await prisma.anomalie.deleteMany({
    where: {
      employeId: 110,
      date: { gte: dayStart }
    }
  });
  
  console.log('🧹 Données Jordan nettoyées\n');
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🧪 TEST DÉTECTION AUTOMATIQUE pause_excessive via API');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Date de travail = aujourd'hui
    const workDay = new Date().toISOString().split('T')[0];
    console.log(`📅 Date de travail: ${workDay}\n`);

    // 0. Nettoyage
    await cleanupJordan(workDay);
    
    // 1. Connexion Jordan
    console.log('🔐 Connexion Jordan...');
    const login = await axios.post(`${API_BASE}/auth/login`, {
      email: 'yjordan496@gmail.com',
      password: 'password123'
    });
    const token = login.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ Connecté\n');

    // 2. Créer un shift pour aujourd'hui avec pause de 30 min
    await prisma.shift.deleteMany({
      where: { employeId: 110, date: new Date(workDay) }
    });
    
    await prisma.shift.create({
      data: {
        employeId: 110,
        date: new Date(workDay),
        type: 'journee',
        segments: [
          { type: 'travail', start: '08:00', end: '12:00' },
          { type: 'pause', start: '12:00', end: '12:30' },  // 30 min prévues
          { type: 'travail', start: '12:30', end: '17:00' }
        ]
      }
    });
    console.log('📋 Shift créé: 08:00-12:00 | Pause 12:00-12:30 (30min) | 12:30-17:00\n');

    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 1: Arrivée à 08:00
    // ═══════════════════════════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 ÉTAPE 1: Jordan arrive au travail à 08:00');
    
    let res = await axios.post(`${API_BASE}/pointage/auto`, 
      { testTime: `${workDay}T08:00:00` },
      { headers }
    );
    console.log(`   ✅ ${res.data.message}`);
    console.log(`   📍 Pointage: ${res.data.pointage.type} à ${new Date(res.data.pointage.horodatage).toLocaleTimeString('fr-FR')}`);
    if (res.data.anomalies?.length > 0) {
      console.log(`   🚨 Anomalies: ${res.data.anomalies.map(a => a.type).join(', ')}`);
    }
    console.log('');

    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 2: Départ en pause à 12:00
    // ═══════════════════════════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('☕ ÉTAPE 2: Jordan part en pause à 12:00');
    
    res = await axios.post(`${API_BASE}/pointage/auto`, 
      { testTime: `${workDay}T12:00:00` },
      { headers }
    );
    console.log(`   ✅ ${res.data.message}`);
    console.log(`   📍 Pointage: ${res.data.pointage.type} à ${new Date(res.data.pointage.horodatage).toLocaleTimeString('fr-FR')}`);
    if (res.data.anomalies?.length > 0) {
      console.log(`   🚨 Anomalies: ${res.data.anomalies.map(a => a.type).join(', ')}`);
    }
    console.log('');

    // ═══════════════════════════════════════════════════════════════════════
    // ÉTAPE 3: Retour de pause à 12:45 (15 min de retard!)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚨 ÉTAPE 3: Jordan revient de pause à 12:45 (+15 min!)');
    console.log('   ⏱️  Pause réelle: 45 min au lieu de 30 min prévues');
    console.log('   📊 Dépassement: 15 min (> 5 min de tolérance)');
    console.log('');
    
    res = await axios.post(`${API_BASE}/pointage/auto`, 
      { testTime: `${workDay}T12:45:00` },
      { headers }
    );
    console.log(`   ✅ ${res.data.message}`);
    console.log(`   📍 Pointage: ${res.data.pointage.type} à ${new Date(res.data.pointage.horodatage).toLocaleTimeString('fr-FR')}`);
    
    if (res.data.anomalies?.length > 0) {
      console.log('');
      console.log('   ╔════════════════════════════════════════════════════════╗');
      console.log('   ║  🎉 ANOMALIE DÉTECTÉE AUTOMATIQUEMENT !                ║');
      console.log('   ╚════════════════════════════════════════════════════════╝');
      res.data.anomalies.forEach((a, i) => {
        console.log(`   ${i+1}. Type: ${a.type}`);
        console.log(`      Message: ${a.message}`);
        console.log(`      Détail: ${a.detail || 'N/A'}`);
        console.log(`      Gravité: ${a.gravite}`);
      });
    } else {
      console.log('   ⚠️  Aucune anomalie retournée par l\'API');
    }
    console.log('');

    // ═══════════════════════════════════════════════════════════════════════
    // VÉRIFICATION EN BASE DE DONNÉES
    // ═══════════════════════════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 VÉRIFICATION EN BASE DE DONNÉES:\n');
    
    const anomaliesDB = await prisma.anomalie.findMany({
      where: { employeId: 110, date: { gte: new Date(workDay) } },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Anomalies en base: ${anomaliesDB.length}`);
    if (anomaliesDB.length > 0) {
      anomaliesDB.forEach((a, i) => {
        console.log(`   ${i+1}. [${a.gravite.toUpperCase()}] ${a.type}`);
        console.log(`      ${a.description}`);
      });
    }
    console.log('');

    const pointagesDB = await prisma.pointage.findMany({
      where: { userId: 110, horodatage: { gte: new Date(workDay) } },
      orderBy: { horodatage: 'asc' }
    });

    console.log(`📋 Pointages en base: ${pointagesDB.length}`);
    pointagesDB.forEach(p => {
      const h = p.horodatage.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      console.log(`   ${p.type.padEnd(8)} → ${h}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    if (anomaliesDB.some(a => a.type === 'pause_excessive')) {
      console.log('✅ TEST RÉUSSI: La détection automatique fonctionne !');
    } else {
      console.log('❌ TEST ÉCHOUÉ: Aucune anomalie pause_excessive détectée');
    }
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Erreur:', err.response?.data || err.message);
    if (err.response?.status) {
      console.error('   Status:', err.response.status);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
