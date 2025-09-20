// Test d'authentification pour obtenir un token valide
const jwt = require('jsonwebtoken');

// Utiliser la même clé secrète que le serveur
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Créer un token pour un admin (ID 1)
const payload = {
  userId: 1,
  role: 'admin',
  email: 'admin@test.com'
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

console.log('Token admin généré:');
console.log(token);

console.log('\nPour tester dans le navigateur:');
console.log(`localStorage.setItem("token", "${token}");`);
