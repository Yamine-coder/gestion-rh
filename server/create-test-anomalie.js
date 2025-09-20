// server/create-test-anomalie.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestAnomalie() {
  try {
    // Récupérer un employé existant pour le test
    const employe = await prisma.user.findFirst({
      where: { role: 'employee' }
    });

    if (!employe) {
      console.log('❌ Aucun employé trouvé pour créer l\'anomalie de test');
      return;
    }

    console.log(`👤 Employé trouvé: ${employe.email} (ID: ${employe.id})`);

    // Créer une anomalie de test
    const anomalie = await prisma.anomalie.create({
      data: {
        employeId: employe.id,
        date: new Date('2025-08-25T00:00:00.000Z'),
        type: 'retard',
        gravite: 'critique',
        description: 'Retard de 15 minutes à l\'arrivée (Test)',
        details: {
          ecartMinutes: 15,
          heurePrevu: '09:00',
          heureReelle: '09:15'
        },
        statut: 'en_attente'
      },
      include: {
        employe: {
          select: { nom: true, prenom: true, email: true }
        }
      }
    });

    console.log('✅ Anomalie de test créée:', anomalie);
    return anomalie;

  } catch (error) {
    console.error('❌ Erreur création anomalie de test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAnomalie();
