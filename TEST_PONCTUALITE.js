console.log("=== TEST CALCUL PONCTUALITÉ ===");

// Simulation du calcul de ponctualité
function calculerPonctualite(heuresParJour) {
  if (!heuresParJour.length) return 100;
  
  // Compter les jours où l'employé était présent (heures travaillées > 0)
  const joursPresents = heuresParJour.filter(r => (r.travaillees || 0) > 0);
  if (joursPresents.length === 0) return 100;
  
  // Compter les jours présents SANS retard
  const joursSansRetard = joursPresents.filter(r => !r.retardMinutes || r.retardMinutes === 0);
  
  // Taux = (jours sans retard / jours présents) * 100
  return Math.round((joursSansRetard.length / joursPresents.length) * 100);
}

// Tests avec différents scénarios
const tests = [
  {
    nom: "Employé sans retard",
    heuresParJour: [
      { jour: "Lundi", travaillees: 8, retardMinutes: 0 },
      { jour: "Mardi", travaillees: 8, retardMinutes: 0 },
      { jour: "Mercredi", travaillees: 8, retardMinutes: 0 },
    ]
  },
  {
    nom: "Employé avec 1 retard sur 3 jours présents",
    heuresParJour: [
      { jour: "Lundi", travaillees: 8, retardMinutes: 30 },
      { jour: "Mardi", travaillees: 8, retardMinutes: 0 },
      { jour: "Mercredi", travaillees: 8, retardMinutes: 0 },
    ]
  },
  {
    nom: "Employé absent un jour (ne compte pas)",
    heuresParJour: [
      { jour: "Lundi", travaillees: 8, retardMinutes: 30 },
      { jour: "Mardi", travaillees: 0, retardMinutes: 0 }, // Absent
      { jour: "Mercredi", travaillees: 8, retardMinutes: 0 },
    ]
  },
  {
    nom: "Employé en retard tous les jours présents",
    heuresParJour: [
      { jour: "Lundi", travaillees: 8, retardMinutes: 15 },
      { jour: "Mardi", travaillees: 7.5, retardMinutes: 30 },
      { jour: "Mercredi", travaillees: 8, retardMinutes: 5 },
    ]
  },
  {
    nom: "Employé jamais présent",
    heuresParJour: [
      { jour: "Lundi", travaillees: 0, retardMinutes: 0 },
      { jour: "Mardi", travaillees: 0, retardMinutes: 0 },
      { jour: "Mercredi", travaillees: 0, retardMinutes: 0 },
    ]
  }
];

tests.forEach((test, index) => {
  console.log(`\n--- TEST ${index + 1}: ${test.nom} ---`);
  
  const joursPresents = test.heuresParJour.filter(r => r.travaillees > 0);
  const joursSansRetard = joursPresents.filter(r => !r.retardMinutes || r.retardMinutes === 0);
  
  console.log(`Jours présents: ${joursPresents.length}`);
  console.log(`Jours sans retard: ${joursSansRetard.length}`);
  
  const taux = calculerPonctualite(test.heuresParJour);
  console.log(`Taux de ponctualité: ${taux}%`);
  
  // Détail des jours
  test.heuresParJour.forEach(jour => {
    const statut = jour.travaillees === 0 ? "Absent" : 
                   (jour.retardMinutes > 0 ? `Retard ${jour.retardMinutes}min` : "À l'heure");
    console.log(`  - ${jour.jour}: ${jour.travaillees}h, ${statut}`);
  });
});

console.log("\n=== RÈGLE DE CALCUL ===");
console.log("Taux ponctualité = (Jours présents sans retard / Jours présents) × 100");
console.log("- Les jours d'absence ne comptent ni positivement ni négativement");
console.log("- Seuls les jours avec heures travaillées > 0 sont considérés comme présents");
console.log("- Un retard > 0 minute = jour non ponctuel");
