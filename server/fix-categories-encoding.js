const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../client/src/components/PlanningRH.jsx');

// Lire le fichier
let content = fs.readFileSync(filePath, 'utf8');

// Trouver et remplacer la fonction getCategorieEmploye
const functionStart = content.indexOf('// Fonction pour obtenir la catégorie');
const functionEnd = content.indexOf('// Filtrage des employés selon le terme de recherche ET la catégorie', functionStart);

if (functionStart > 0 && functionEnd > functionStart) {
  const before = content.substring(0, functionStart);
  const after = content.substring(functionEnd);
  
  const newFunction = `// Fonction pour obtenir la catégorie d'un employé (utilise la fonction centralisée)
  const getCategorieEmploye = getCategorieEmployeUtil;
  
  `;
  
  content = before + newFunction + after;
  
  // Écrire le fichier
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fonction getCategorieEmploye remplacée avec succès!');
} else {
  console.log('❌ Impossible de trouver la fonction à remplacer');
  console.log('functionStart:', functionStart);
  console.log('functionEnd:', functionEnd);
}
