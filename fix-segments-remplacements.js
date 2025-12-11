/**
 * Script de correction des segments de shifts vidés lors des remplacements
 * Les segments originaux ont été vidés à tort, ce script les restaure
 * depuis les shifts des remplaçants
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSegments() {
  console.log('🔧 Correction des segments de shifts vidés...\n');

  try {
    // Trouver tous les shifts de type "repos" avec un motif de remplacement
    // et dont les segments sont vides
    const shiftsAReparer = await prisma.shift.findMany({
      where: {
        type: 'repos',
        motif: { contains: 'Remplacé par' },
        OR: [
          { segments: { equals: [] } },
          { segments: { equals: '[]' } }
        ]
      },
      include: {
        employe: { select: { id: true, prenom: true, nom: true } }
      }
    });

    console.log(`📋 ${shiftsAReparer.length} shifts à réparer trouvés\n`);

    let repares = 0;
    let erreurs = 0;

    for (const shift of shiftsAReparer) {
      // Extraire le nom du remplaçant depuis le motif
      // Format: "Remplacé par Prénom Nom - Motif: ..."
      const match = shift.motif?.match(/Remplacé par ([^-]+)/);
      if (!match) {
        console.log(`⚠️ Shift #${shift.id} - Impossible d'extraire le nom du remplaçant`);
        erreurs++;
        continue;
      }

      const nomRemplacant = match[1].trim();
      const [prenom, ...nomParts] = nomRemplacant.split(' ');
      const nom = nomParts.join(' ');

      // Trouver le shift du remplaçant à la même date
      const shiftRemplacant = await prisma.shift.findFirst({
        where: {
          date: shift.date,
          employe: {
            prenom: { contains: prenom },
            ...(nom && { nom: { contains: nom } })
          },
          motif: { contains: 'Remplacement de' }
        }
      });

      if (shiftRemplacant?.segments) {
        // Restaurer les segments
        await prisma.shift.update({
          where: { id: shift.id },
          data: { segments: shiftRemplacant.segments }
        });

        console.log(`✅ Shift #${shift.id} (${shift.employe?.prenom} ${shift.employe?.nom}) - Segments restaurés depuis shift #${shiftRemplacant.id}`);
        repares++;
      } else {
        console.log(`⚠️ Shift #${shift.id} - Shift du remplaçant non trouvé pour "${nomRemplacant}"`);
        erreurs++;
      }
    }

    console.log(`\n📊 Résumé:`);
    console.log(`   ✅ ${repares} shifts réparés`);
    console.log(`   ⚠️ ${erreurs} erreurs`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSegments();
