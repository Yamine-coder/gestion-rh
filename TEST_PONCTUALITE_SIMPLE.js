console.log("=== TEST CALCUL PONCTUALITÉ SIMPLIFIÉ ===");

// Simulation du nouveau calcul de ponctualité
function calculerPonctualiteSimple(heuresParJour, retards) {
  if (!heuresParJour.length) return 100;
  
  // Compter les jours travaillés
  const joursPresents = heuresParJour.filter(r => (r.travaillees || 0) > 0);
  if (joursPresents.length === 0) return 100;
  
  // Compter les retards par date unique
  const retardsUniques = new Set();
  if (retards) {
    retards.forEach(retard => {
      if (retard.date && parseInt(retard.duree) > 0) {
        retardsUniques.add(retard.date);
      }
    });
  }
  
  const joursAvecRetard = retardsUniques.size;
  const joursSansRetard = Math.max(0, joursPresents.length - joursAvecRetard);
  
  return Math.round((joursSansRetard / joursPresents.length) * 100);
}

// Tests avec différents scénarios
const tests = [
  {
    nom: "1 jour travaillé avec 1 retard de 30min",
    heuresParJour: [
      { jour: "2024-01-15", travaillees: 8 }
    ],
    retards: [
      { date: "2024-01-15", duree: "30" }
    ]
  },
  {
    nom: "3 jours travaillés, 1 avec retard",
    heuresParJour: [
      { jour: "2024-01-15", travaillees: 8 },
      { jour: "2024-01-16", travaillees: 7.5 },
      { jour: "2024-01-17", travaillees: 8 }
    ],
    retards: [
      { date: "2024-01-15", duree: "30" }
    ]
  },
  {
    nom: "2 jours travaillés, 2 retards le même jour",
    heuresParJour: [
      { jour: "2024-01-15", travaillees: 8 },
      { jour: "2024-01-16", travaillees: 8 }
    ],
    retards: [
      { date: "2024-01-15", duree: "15" },
      { date: "2024-01-15", duree: "10" } // 2 retards le même jour = 1 jour avec retard
    ]
  },
  {
    nom: "Aucun retard",
    heuresParJour: [
      { jour: "2024-01-15", travaillees: 8 },
      { jour: "2024-01-16", travaillees: 8 }
    ],
    retards: []
  }
];

tests.forEach((test, index) => {
  console.log(`\n--- TEST ${index + 1}: ${test.nom} ---`);
  
  const joursPresents = test.heuresParJour.filter(r => r.travaillees > 0).length;
  const retardsUniques = new Set();
  test.retards.forEach(r => {
    if (r.date && parseInt(r.duree) > 0) {
      retardsUniques.add(r.date);
    }
  });
  
  console.log(`Jours présents: ${joursPresents}`);
  console.log(`Jours avec retard: ${retardsUniques.size}`);
  console.log(`Jours sans retard: ${joursPresents - retardsUniques.size}`);
  
  const taux = calculerPonctualiteSimple(test.heuresParJour, test.retards);
  console.log(`Taux de ponctualité: ${taux}%`);
  
  // Vérification logique
  const attendu = Math.round(((joursPresents - retardsUniques.size) / joursPresents) * 100);
  console.log(`Vérification: ${attendu}% ${taux === attendu ? '✓' : '✗'}`);
});

console.log("\n=== LOGIQUE APPLIQUÉE ===");
console.log("1. Compter les jours avec heures travaillées > 0");
console.log("2. Compter les dates uniques avec retards > 0");
console.log("3. Ponctualité = (jours présents - jours avec retard) / jours présents × 100");
console.log("4. Plusieurs retards le même jour = 1 seul jour avec retard");
