// Test des routes d'authentification et employés
const jwt = require('jsonwebtoken');

// Générer un token de test pour admin
const testAdminPayload = {
  userId: 1, // ID d'un admin
  email: 'admin@test.com',
  role: 'admin'
};

const testToken = jwt.sign(testAdminPayload, 'super-secret-jwt-phrase-ultra-longue', {
  expiresIn: '1d'
});

console.log('🔑 Token de test admin généré:');
console.log(testToken);

// Test avec curl
const curlCommands = [
  `curl -X GET "http://localhost:5000/admin/employes/12" -H "Authorization: Bearer ${testToken}" -v`,
  `curl -X GET "http://localhost:5000/api/stats/employe/12/rapport?periode=mois&mois=2025-08" -H "Authorization: Bearer ${testToken}" -v`
];

console.log('\n📝 Commandes de test:');
curlCommands.forEach((cmd, i) => {
  console.log(`${i + 1}. ${cmd}`);
});

// Vérifier les variables d'environnement
console.log('\n🔍 Variables d\'environnement:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Défini' : 'NON DÉFINI');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NON DÉFINI');
