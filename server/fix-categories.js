const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function fixCategories() {
  console.log('🔧 Correction des catégories...\n');

  // Mapping des anciennes catégories vers les nouvelles
  const mappingEmploye = {
    'Polyvalent': 'Caisse/Service',      // Polyvalent → Caisse/Service
    'Non défini': 'Caisse/Service',      // Non défini → Caisse/Service par défaut
    'Pizzaiolo': 'Pizzaiolo',
    'Pastaiolo': 'Pastaiolo',
    'Caisse/Service': 'Caisse/Service',
    'Entretien': 'Entretien',
    'Securite': 'Securite',
  };

  const mappingAdmin = {
    'gerante': 'Direction',
    'assistante_rh': 'RH',
    'dev_manager': 'Informatique',
    'Cadre': 'Direction',
  };

  // Corriger les employés
  const employes = await p.user.findMany({
    where: { role: 'employee' }
  });

  let correctedEmployes = 0;
  for (const emp of employes) {
    const oldCat = emp.categorie;
    const newCat = mappingEmploye[oldCat] || 'Caisse/Service';
    
    if (oldCat !== newCat) {
      await p.user.update({
        where: { id: emp.id },
        data: { categorie: newCat }
      });
      console.log(`  ✅ ${emp.prenom} ${emp.nom}: "${oldCat}" → "${newCat}"`);
      correctedEmployes++;
    }
  }

  // Corriger les admins/managers/rh
  const admins = await p.user.findMany({
    where: { role: { in: ['admin', 'manager', 'rh'] } }
  });

  let correctedAdmins = 0;
  for (const admin of admins) {
    const oldCat = admin.categorie;
    const newCat = mappingAdmin[oldCat] || 'Direction';
    
    if (oldCat !== newCat) {
      await p.user.update({
        where: { id: admin.id },
        data: { categorie: newCat }
      });
      console.log(`  ✅ ${admin.prenom} ${admin.nom} (${admin.role}): "${oldCat}" → "${newCat}"`);
      correctedAdmins++;
    }
  }

  console.log(`\n════════════════════════════════════════════`);
  console.log(`  📊 RÉSUMÉ`);
  console.log(`════════════════════════════════════════════`);
  console.log(`  Employés corrigés: ${correctedEmployes}`);
  console.log(`  Admins corrigés:   ${correctedAdmins}`);

  // Afficher les catégories finales
  const final = await p.user.findMany({ select: { categorie: true, role: true } });
  const cats = {};
  final.forEach(u => {
    const c = u.categorie || 'NULL';
    cats[c] = (cats[c] || 0) + 1;
  });

  console.log(`\n📊 CATÉGORIES FINALES:`);
  Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(20)}: ${v}`));

  await p.$disconnect();
}

fixCategories();
