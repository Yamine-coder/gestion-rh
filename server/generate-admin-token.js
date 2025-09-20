const jwt = require('jsonwebtoken');

// Token pour l'admin réel ID 73
const adminPayload = {
  userId: 73,
  email: 'test@admin.com',
  role: 'admin'
};

const token = jwt.sign(adminPayload, 'super-secret-jwt-phrase-ultra-longue', {
  expiresIn: '1d'
});

console.log('🔑 Token admin ID 73:');
console.log(token);

// Script pour l'injecter dans localStorage via le navigateur
console.log('\n📝 Script à exécuter dans la console du navigateur:');
console.log(`localStorage.setItem('token', '${token}');`);
console.log(`console.log('Token sauvegardé:', localStorage.getItem('token'));`);
