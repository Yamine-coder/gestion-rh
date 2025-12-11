const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifierEmployesActifs() {
  console.log('\n🔍 VÉRIFICATION DES EMPLOYÉS ACTIFS\n');
  console.log('=' .repeat(60));

  try {
    const now = new Date();

    // 1. Tous les employés
    const tousEmployes = await prisma.user.findMany({
      where: { role: 'employee' },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        statut: true,
        dateSortie: true,
        motifDepart: true
      },
      orderBy: { nom: 'asc' }
    });

    // 2. Employés actifs selon la logique du code
    const employesActifs = await prisma.user.findMany({
      where: {
        role: 'employee',
        statut: 'actif',
        OR: [
          { dateSortie: null },
          { dateSortie: { gt: now } }
        ]
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        statut: true,
        dateSortie: true
      },
      orderBy: { nom: 'asc' }
    });

    // 3. Employés inactifs
    const employesInactifs = tousEmployes.filter(emp => {
      return emp.statut !== 'actif' || (emp.dateSortie && emp.dateSortie <= now);
    });

    console.log('\n📊 STATISTIQUES:');
    console.log(`   Total employés dans la DB: ${tousEmployes.length}`);
    console.log(`   Employés ACTIFS (en service): ${employesActifs.length}`);
    console.log(`   Employés INACTIFS: ${employesInactifs.length}`);

    console.log('\n✅ EMPLOYÉS ACTIFS (qui doivent apparaître dans le rapport):');
    console.log('─'.repeat(60));
    employesActifs.forEach((emp, i) => {
      console.log(`${(i+1).toString().padStart(2)}. ${emp.nom} ${emp.prenom} - ${emp.email}`);
    });

    if (employesInactifs.length > 0) {
      console.log('\n❌ EMPLOYÉS INACTIFS (qui NE doivent PAS apparaître):');
      console.log('─'.repeat(60));
      employesInactifs.forEach((emp, i) => {
        const raison = emp.motifDepart || 'Non spécifié';
        const dateSortie = emp.dateSortie ? emp.dateSortie.toLocaleDateString('fr-FR') : 'N/A';
        console.log(`${(i+1).toString().padStart(2)}. ${emp.nom} ${emp.prenom} - ${emp.email}`);
        console.log(`    Statut: ${emp.statut} | Date sortie: ${dateSortie} | Motif: ${raison}`);
      });
    }

    console.log('\n🎯 VALIDATION:');
    console.log(`   Le rapport Excel doit contenir exactement ${employesActifs.length} lignes (hors en-tête)`);
    console.log(`   Vérifier que les ${employesInactifs.length} employé(s) inactif(s) n'apparaît/apparaissent pas`);

    console.log('\n💡 PROCHAINES ÉTAPES:');
    console.log('   1. Télécharger le rapport Excel (Rapports > Export novembre 2025)');
    console.log('   2. Compter le nombre de lignes (sans l\'en-tête)');
    console.log(`   3. Vérifier que le compte est ${employesActifs.length} (pas ${tousEmployes.length})`);
    console.log('   4. Vérifier que les colonnes CP/RTT/Maladie sont présentes');
    console.log('   5. Vérifier que les dates d\'absences sont formatées correctement');

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifierEmployesActifs();
