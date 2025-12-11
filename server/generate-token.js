const jwt = require('jsonwebtoken');

// Générer un token admin valide (24h)
const token = jwt.sign(
  { userId: 1, role: 'admin' },
  process.env.JWT_SECRET || 'secretjwt',
  { expiresIn: '24h' }
);

console.log('🔑 Token admin généré:\n');
console.log(token);
console.log('\n✅ Valide pour 24h');
