const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testerRequeteExport() {
  console.log('\n🧪 TEST DE LA REQUÊTE CORRIGÉE\n');
  console.log('=' .repeat(60));

  try {
    const dateFin = new Date('2025-11-30T23:59:59');

    // Test de la requête CORRIGÉE (role: 'employee')
    const employes = await prisma.user.findMany({
      where: {
        role: 'employee', // ← CORRECTION ICI
        statut: 'actif',
        OR: [
          { dateSortie: null },
          { dateSortie: { gt: dateFin } }
        ]
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        role: true,
        statut: true
      }
    });

    console.log(`📊 RÉSULTAT: ${employes.length} employés\n`);
    
    employes.forEach((e, i) => {
      console.log(`   ${(i+1).toString().padStart(2)}. ${e.nom} ${e.prenom}`);
    });

    console.log('\n🎯 VALIDATION:');
    if (employes.length === 20) {
      console.log('   ✅ CORRECT: 20 employés actifs');
      console.log('   ✅ Les managers et autres rôles sont exclus');
    } else {
      console.log(`   ❌ ERREUR: ${employes.length} employés au lieu de 20`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testerRequeteExport();
