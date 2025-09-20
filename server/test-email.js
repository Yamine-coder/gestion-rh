// test-email.js
require('dotenv').config();
const { envoyerIdentifiants } = require('./utils/emailService');

const testEmail = async () => {
  console.log('Configuration email:');
  console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '[MASQUÉ]' : 'Non défini');
  
  try {
    console.log('Test d\'envoi d\'email...');
    const result = await envoyerIdentifiants(
      'test@example.com', // Remplacez par une adresse valide pour test
      'Doe',
      'John',
      'MotDePasse123'
    );
    
    console.log('Résultat:', result);
  } catch (error) {
    console.error('Erreur lors du test d\'envoi d\'email:', error);
  }
};

testEmail();
