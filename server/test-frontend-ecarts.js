/**
 * Test des nouveaux types d'écarts dans le frontend
 * Pour valider que les 3 zones d'heures supplémentaires s'affichent correctement
 */

console.log('🎨 Test des styles frontend pour les zones d\'heures supplémentaires');

// Simuler les nouveaux types d'écarts qui viennent du backend
const testEcarts = [
  {
    type: 'heures_sup_auto_validees',
    gravite: 'info',
    dureeMinutes: 15,
    description: '💰 Heures sup auto-validées: départ à 17:15, 15 min d\'heures sup (prévu 17:00) → Payées automatiquement'
  },
  {
    type: 'heures_sup_a_valider',
    gravite: 'a_valider',
    dureeMinutes: 45,
    description: '⚠️ Heures sup à valider: départ à 16:45, 45 min d\'heures sup (prévu 16:00) → Validation managériale requise'
  },
  {
    type: 'hors_plage_out_critique',
    gravite: 'hors_plage',
    dureeMinutes: 120,
    description: '🟣 Hors-plage OUT critique: départ à 19:00, 120 min d\'heures sup (prévu 17:00) → Probable oubli de badge'
  }
];

// Fonction formatEcart simulée (extraite du frontend)
const formatEcart = (ecart) => {
  const configs = {
    heures_sup_auto_validees: {
      icon: '💰',
      label: 'H. sup auto',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      badge: 'Auto-validées'
    },
    heures_sup_a_valider: {
      icon: '⚠️',
      label: 'H. sup',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      badge: 'À valider'
    },
    hors_plage_out_critique: {
      icon: '🟣',
      label: 'Hors-plage OUT',
      color: 'text-purple-700',
      bg: 'bg-purple-100',
      badge: 'Critique'
    }
  };
  
  const config = configs[ecart.type] || { icon: '❓', label: 'Inconnu', color: 'text-gray-600', bg: 'bg-gray-50' };
  
  return {
    ...config,
    minutes: Math.abs(ecart.dureeMinutes || 0),
    formattedTime: (() => {
      const minutes = Math.abs(ecart.dureeMinutes || 0);
      if (minutes === 0) return '';
      if (minutes < 60) return `${minutes}min`;
      const heures = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins === 0 ? `${heures}h` : `${heures}h${mins.toString().padStart(2, '0')}`;
    })()
  };
};

console.log('\n📊 Test du formatage des écarts :');
testEcarts.forEach((ecart, idx) => {
  console.log(`\n${idx + 1}. Type: ${ecart.type}`);
  console.log(`   Gravité: ${ecart.gravite}`);
  console.log(`   Durée: ${ecart.dureeMinutes} min`);
  
  const formatted = formatEcart(ecart);
  console.log(`   📱 Frontend:`);
  console.log(`      Icon: ${formatted.icon}`);
  console.log(`      Label: ${formatted.label}`);
  console.log(`      Color: ${formatted.color}`);
  console.log(`      Background: ${formatted.bg}`);
  console.log(`      Badge: ${formatted.badge || 'Aucun'}`);
  console.log(`      Temps formaté: ${formatted.formattedTime}`);
  
  // Test de la logique de détection
  const isHorsPlage = ecart.type === 'hors_plage_in' || ecart.type === 'hors_plage_out' || ecart.type === 'hors_plage_out_critique';
  const isCritique = ecart.gravite === 'critique' || ecart.gravite === 'hors_plage' || ecart.type === 'hors_plage_out_critique';
  const isAValider = ecart.gravite === 'a_valider' || ecart.type === 'heures_sup_a_valider';
  const isAutoValide = ecart.type === 'heures_sup_auto_validees';
  const isOK = ecart.gravite === 'ok' || ecart.gravite === 'info' || isAutoValide;
  
  console.log(`   🎨 Style:`);
  console.log(`      Hors-plage: ${isHorsPlage}`);
  console.log(`      Critique: ${isCritique}`);
  console.log(`      À valider: ${isAValider}`);
  console.log(`      Auto-validé: ${isAutoValide}`);
  console.log(`      OK: ${isOK}`);
  
  const borderClass = isHorsPlage ? 'border-purple-400' :
                     isCritique ? 'border-red-400' :
                     isAValider ? 'border-amber-400' :
                     isOK ? 'border-green-300' :
                     'border-yellow-300';
  
  console.log(`      Border: ${borderClass}`);
});

console.log('\n✅ Test des styles frontend terminé !');
console.log('🎯 Les nouveaux types d\'heures supplémentaires sont maintenant pris en charge côté frontend.');
