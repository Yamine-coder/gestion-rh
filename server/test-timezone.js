// Test simple pour identifier le problème de timezone
const today = new Date();
console.log(`❌ ANCIEN today (modifié): ${today} -> ISO: ${today.toISOString()}`);
today.setHours(0, 0, 0, 0);
console.log(`❌ ANCIEN today après setHours(0,0,0,0): ${today} -> ISO: ${today.toISOString()}`);

console.log('\n--- CORRECTION ---');
const todayCorrect = new Date();
console.log(`✅ NOUVEAU today (maintenant): ${todayCorrect} -> ISO: ${todayCorrect.toISOString()}`);

const startOfToday = new Date(todayCorrect);
startOfToday.setHours(0, 0, 0, 0);
console.log(`✅ NOUVEAU startOfToday: ${startOfToday} -> ISO: ${startOfToday.toISOString()}`);

console.log('\n--- COMPARAISON ---');
console.log(`Date attendue pour aujourd'hui (17/08/2025): 2025-08-17`);
console.log(`Date dans startOfToday: ${startOfToday.toISOString().split('T')[0]}`);
console.log(`Sont-elles identiques? ${startOfToday.toISOString().split('T')[0] === '2025-08-17'}`);

// Test de la plage de recherche
const now = new Date();
console.log(`\nPlage de recherche pour les pointages:`);
console.log(`Du: ${startOfToday.toISOString()}`);
console.log(`Au: ${now.toISOString()}`);

console.log(`\n🔍 Vérification: Est-ce que notre plage couvre bien le 17/08/2025?`);
console.log(`StartOfToday est le 17 août? ${startOfToday.getDate() === 17 && startOfToday.getMonth() === 7}`);
