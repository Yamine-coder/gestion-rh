const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrerCongesApprouves() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRATION : Créer shifts pour congés approuvés existants ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Récupérer tous les congés approuvés
    const congesApprouves = await prisma.conge.findMany({
      where: {
        statut: 'approuvé'
      },
      include: {
        user: {
          select: {
            nom: true,
            prenom: true
          }
        }
      },
      orderBy: {
        dateDebut: 'asc'
      }
    });

    console.log(`📋 ${congesApprouves.length} congés approuvés trouvés\n`);

    if (congesApprouves.length === 0) {
      console.log('✅ Aucune migration nécessaire\n');
      return;
    }

    let totalShiftsCreated = 0;
    let totalShiftsSkipped = 0;

    for (const conge of congesApprouves) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👤 ${conge.user.nom} ${conge.user.prenom}`);
      console.log(`   Congé #${conge.id}: ${conge.type}`);
      console.log(`   Du ${new Date(conge.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(conge.dateFin).toLocaleDateString('fr-FR')}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const dateDebut = new Date(conge.dateDebut);
      const dateFin = new Date(conge.dateFin);
      let shiftsCreatedPourCeConge = 0;
      let shiftsSkippedPourCeConge = 0;

      let currentDate = new Date(dateDebut);
      currentDate.setHours(12, 0, 0, 0);

      while (currentDate <= dateFin) {
        const dateStr = currentDate.toLocaleDateString('fr-FR');

        // Vérifier si un shift existe déjà pour ce jour
        const shiftExistant = await prisma.shift.findFirst({
          where: {
            employeId: conge.userId,
            date: {
              gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0),
              lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1, 0, 0, 0)
            }
          }
        });

        if (!shiftExistant) {
          // Créer le shift absence
          await prisma.shift.create({
            data: {
              employeId: conge.userId,
              date: new Date(currentDate),
              type: 'absence',
              motif: conge.type,
              segments: []
            }
          });
          
          console.log(`   ✅ ${dateStr}: Shift "absence" créé`);
          shiftsCreatedPourCeConge++;
          totalShiftsCreated++;
        } else {
          console.log(`   ⏭️  ${dateStr}: Shift existant (type: ${shiftExistant.type})`);
          shiftsSkippedPourCeConge++;
          totalShiftsSkipped++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`\n   📊 Résumé: ${shiftsCreatedPourCeConge} créés, ${shiftsSkippedPourCeConge} ignorés`);
    }

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  RÉSUMÉ DE LA MIGRATION                                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Total shifts créés: ${totalShiftsCreated}`);
    console.log(`⏭️  Total shifts ignorés (déjà existants): ${totalShiftsSkipped}`);
    console.log(`📋 Congés traités: ${congesApprouves.length}`);
    console.log('\n✅ Migration terminée avec succès !\n');

  } catch (error) {
    console.error('\n❌ Erreur durant la migration:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
migrerCongesApprouves();
