// Script de test pour ajouter un justificatif Navigo à un employé
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNavigo() {
  try {
    // 1. Trouver un employé actif
    const employe = await prisma.user.findFirst({
      where: {
        role: 'employee',
        statut: 'actif'
      }
    });

    if (!employe) {
      console.log('❌ Aucun employé trouvé');
      return;
    }

    console.log(`📋 Employé trouvé: ${employe.nom} ${employe.prenom} (ID: ${employe.id})`);

    // 2. Mettre à jour avec un justificatif fictif
    const updated = await prisma.user.update({
      where: { id: employe.id },
      data: {
        eligibleNavigo: true,
        justificatifNavigo: '/uploads/justificatifs-navigo/navigo_test.jpg'
      }
    });

    console.log('✅ Justificatif Navigo ajouté:');
    console.log(`   - Éligible: ${updated.eligibleNavigo}`);
    console.log(`   - Fichier: ${updated.justificatifNavigo}`);

    // 3. Vérifier la mise à jour
    const verification = await prisma.user.findUnique({
      where: { id: employe.id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        eligibleNavigo: true,
        justificatifNavigo: true
      }
    });

    console.log('\n🔍 Vérification:');
    console.log(verification);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNavigo();
