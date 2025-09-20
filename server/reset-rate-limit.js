// 🔧 Script pour réinitialiser le rate limiting
// Usage: node reset-rate-limit.js

const express = require('express');
const app = express();

// Simuler le reset en redémarrant le serveur
console.log('🔧 RÉINITIALISATION DU RATE LIMITING');
console.log('='.repeat(50));

console.log('📋 Actions à effectuer :');
console.log('1. ✅ Arrêter le serveur backend actuel');
console.log('2. ✅ Redémarrer le serveur');
console.log('3. ✅ Le rate limiting sera réinitialisé');

console.log('\n💡 Le rate limiting est stocké en mémoire.');
console.log('💡 Un redémarrage du serveur efface toutes les tentatives.');

console.log('\n🎯 Alternative : Attendre 15 minutes pour que les compteurs expirent');
console.log('⏰ Ou utiliser une IP différente (VPN, mobile, etc.)');

console.log('\n🚀 Redémarrez le serveur avec: node index.js');
