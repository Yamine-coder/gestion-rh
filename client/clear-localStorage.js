// Script à exécuter dans la console du navigateur pour nettoyer le localStorage

console.log('🧹 Nettoyage du localStorage...');

// Lister ce qu'il y a actuellement
console.log('📋 Contenu actuel:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`  ${key}: ${localStorage.getItem(key)}`);
}

// Nettoyer les clés liées aux pointages
const keysToRemove = [
  'arrival_history',
  'quality_history', 
  'daily_target_hours',
  'expected_start_time',
  'punctuality_period_days',
  'offline_pointages_queue',
  'home_compact'
];

console.log('\n🗑️ Suppression des données de pointage...');
keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`  ✅ ${key} supprimé`);
  }
});

console.log('\n✅ Nettoyage terminé - rechargez la page (F5)');
