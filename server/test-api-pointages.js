const express = require('express');
const app = express();

// Test direct de l'API pointages
async function testPointagesAPI() {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:5000/api/pointages/daily/2025-08-21');
    const data = await response.json();
    
    console.log('Réponse API pointages:');
    console.log('Status:', response.status);
    
    if (data && data.length > 0) {
      console.log('Premier utilisateur:');
      console.log('Email:', data[0].email);
      console.log('Nom:', data[0].nom);
      console.log('Prénom:', data[0].prenom);
      console.log('Structure complète:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('Aucune donnée trouvée:', data);
    }
    
  } catch (error) {
    console.error('Erreur API:', error.message);
  }
}

testPointagesAPI();
