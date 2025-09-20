// Script pour créer des données de test avec des anomalies
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function createTestAnomalies() {
  console.log('🔄 Création de données de test avec anomalies...');

  try {
    // 1. Créer un employé de test
    const employeResponse = await fetch(`${BASE_URL}/api/employes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: 'Durand',
        prenom: 'Marie',
        email: 'marie.durand@test.fr',
        poste: 'Serveuse',
        telephone: '0123456789'
      })
    });

    const employe = await employeResponse.json();
    console.log('✅ Employé créé:', employe.prenom, employe.nom);

    // 2. Créer un congé pour aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const congeResponse = await fetch(`${BASE_URL}/api/conges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeId: employe.id,
        dateDebut: today,
        dateFin: today,
        type: 'CP',
        motif: 'Congé planifié',
        statut: 'validé'
      })
    });

    const conge = await congeResponse.json();
    console.log('✅ Congé créé pour le', today);

    // 3. Créer des pointages qui créent des anomalies
    
    // Anomalie 1: Pointage d'entrée sur un jour de congé
    const pointageResponse1 = await fetch(`${BASE_URL}/api/pointages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeId: employe.id,
        date: today,
        heureArrivee: '14:30'
      })
    });

    if (pointageResponse1.ok) {
      console.log('✅ Pointage d\'entrée créé à 14:30 (sur jour de congé)');
    }

    // Anomalie 2: Pointage d'entrée et de sortie sur un jour de congé
    const pointageResponse2 = await fetch(`${BASE_URL}/api/pointages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeId: employe.id,
        date: today,
        heureDepart: '18:00'
      })
    });

    if (pointageResponse2.ok) {
      console.log('✅ Pointage de sortie créé à 18:00 (sur jour de congé)');
    }

    // 4. Créer un second employé pour des anomalies différentes
    const employe2Response = await fetch(`${BASE_URL}/api/employes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: 'Martin',
        prenom: 'Pierre',
        email: 'pierre.martin@test.fr',
        poste: 'Cuisinier',
        telephone: '0987654321'
      })
    });

    const employe2 = await employe2Response.json();
    console.log('✅ Second employé créé:', employe2.prenom, employe2.nom);

    // Anomalie 3: Pointage d'entrée sans sortie (pointage incomplet)
    const pointageResponse3 = await fetch(`${BASE_URL}/api/pointages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeId: employe2.id,
        date: today,
        heureArrivee: '09:00'
      })
    });

    if (pointageResponse3.ok) {
      console.log('✅ Pointage d\'entrée seul créé à 09:00 (sans sortie)');
    }

    console.log('\n🎉 Données de test avec anomalies créées !');
    console.log('\n📋 Anomalies générées :');
    console.log('1. Marie Durand - Pointage sur jour de congé (14:30-18:00)');
    console.log('2. Pierre Martin - Pointage d\'entrée sans sortie (09:00)');
    console.log('\n🔍 Rendez-vous sur le frontend pour voir les anomalies détectées !');
    console.log('💡 Testez les boutons "Extra" et "Erreur" selon le contexte.');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

createTestAnomalies();
